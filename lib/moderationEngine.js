// lib/moderationEngine.js — Cek tiap pesan masuk terhadap aturan moderasi aktif
// (antilink, antibad, antispam, antivirtex), lalu eksekusi hapus + warn kalau kena.
// Dipanggil dari index.js untuk SEMUA pesan grup, bukan cuma yang berprefix "."

const { getGroup } = require('./groupSettings');
const { addWarn } = require('./warnSystem');
const { normalizeNumber, jidToNumber, toJid, looksLikeVirtex } = require('./helpers');
const antidelete = require('./antidelete');

const LINK_REGEX = /(https?:\/\/|www\.)[^\s]+/gi;
const DOMAIN_EXTRACT_REGEX = /(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+\.[a-z]{2,})/i;

// Spam tracker in-memory: Map<`${chatJid}:${userNumber}`, number[]> (timestamps ms)
const spamTracker = new Map();
const SPAM_WINDOW_MS = 7000; // 7 detik
const SPAM_THRESHOLD = 5; // 5 pesan dalam window itu dianggap spam

function checkSpam(chatJid, userNumber) {
  const key = `${chatJid}:${userNumber}`;
  const now = Date.now();
  const timestamps = (spamTracker.get(key) || []).filter((t) => now - t < SPAM_WINDOW_MS);
  timestamps.push(now);
  spamTracker.set(key, timestamps);
  return timestamps.length >= SPAM_THRESHOLD;
}

// Hasil: null (tidak ada pelanggaran) atau { rule, reason }
function checkViolation(group, text) {
  if (!text) return null;

  if (group.antilink?.enabled && LINK_REGEX.test(text)) {
    const match = text.match(DOMAIN_EXTRACT_REGEX);
    const domain = match ? match[1].toLowerCase() : null;
    const whitelisted = domain && group.antilink.whitelistDomains?.some((d) => domain.includes(d));
    if (!whitelisted) {
      return { rule: 'antilink', reason: 'Pesan mengandung link yang tidak diizinkan.' };
    }
  }

  if (group.antiwame && /(https?:\/\/)?(www\.)?(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\/[^\s]+/i.test(text)) {
    return { rule: 'antiwame', reason: 'Pesan mengandung tautan wa.me atau WhatsApp yang dilarang.' };
  }

  if (group.antibad?.enabled && group.antibad.wordlist?.length > 0) {
    const lower = text.toLowerCase();
    const hit = group.antibad.wordlist.find((w) => lower.includes(w));
    if (hit) {
      return { rule: 'antibad', reason: 'Pesan mengandung kata yang dilarang.' };
    }
  }

  if (group.antivirtex?.enabled && looksLikeVirtex(text)) {
    return { rule: 'antivirtex', reason: 'Pesan terdeteksi virtex/spam text.' };
  }

  return null;
}

// { sock, chatJid, msg, text, senderJid, senderNumber, isBotAdminFn }
// isBotAdminFn: async () => boolean, dipassing biar engine ini tidak perlu import isBotAdmin langsung
// (menghindari circular require, dan supaya hasil cek admin bisa di-cache 1x per pesan oleh caller)
async function processMessage({ sock, chatJid, msg, text, senderNumber, isBotAdminFn }) {
  const group = getGroup(chatJid);
  if (!group || !group.allowed) return;

  // Jangan pernah tindak pesan dari bot sendiri
  if (msg.key.fromMe) return;

  let violation = checkViolation(group, text);

  // Antispam dicek terpisah karena butuh tracking lintas pesan, bukan isi 1 pesan
  if (!violation && group.antispam?.enabled && senderNumber) {
    if (checkSpam(chatJid, senderNumber)) {
      violation = { rule: 'antispam', reason: 'Terdeteksi mengirim pesan terlalu cepat berturut-turut.' };
    }
  }

  if (!violation) return;
  if (violation.rule === 'antivirtex' && msg?.key?.id) {
    antidelete.markAsVirtext(msg.key.id);
  }
  if (!senderNumber) return; // tidak bisa warn kalau tidak tau nomornya

  // Hapus pesan pelanggar butuh bot admin grup
  let botAdmin = false;
  try {
    botAdmin = await isBotAdminFn();
  } catch (err) {
    console.error('[moderationEngine] Gagal cek status admin bot:', err.message);
  }

  if (botAdmin) {
    try {
      await sock.sendMessage(chatJid, {
        delete: {
          remoteJid: chatJid,
          fromMe: false,
          id: msg.key.id,
          participant: msg.key.participant,
        },
      });
    } catch (err) {
      console.error(`[moderationEngine] Gagal hapus pesan (${violation.rule}):`, err.message);
    }
  }

  const { count, limit, shouldKick } = addWarn(chatJid, senderNumber);
  const mentionJid = msg.key.participant || msg.key.participantAlt;
  // Untuk mentions[] di teks pesan, WhatsApp butuh JID nomor asli supaya
  // bisa di-link ke kontak -- BEDA dari mentionJid di atas yang dipakai
  // untuk aksi delete/kick (situ boleh @lid, karena itu murni identifier
  // peserta buat WhatsApp API, bukan untuk ditampilkan/di-link ke nama).
  const mentionForDisplay = senderNumber ? toJid(senderNumber) : null;

  try {
    await sock.sendMessage(chatJid, {
      text: `⚠️ @${senderNumber} ${violation.reason}\nWarning ${count}/${limit}.${!botAdmin ? '\n(Bot bukan admin, pesan tidak bisa dihapus otomatis.)' : ''}`,
      mentions: mentionForDisplay ? [mentionForDisplay] : [],
    });

    if (shouldKick && botAdmin && mentionJid) {
      await sock.groupParticipantsUpdate(chatJid, [mentionJid], 'remove');
      await sock.sendMessage(chatJid, { text: `👢 @${senderNumber} dikeluarkan otomatis (melebihi limit warning ${limit}x).`, mentions: mentionForDisplay ? [mentionForDisplay] : [] });
    } else if (shouldKick && !botAdmin) {
      await sock.sendMessage(chatJid, { text: `⚠️ @${senderNumber} sudah melebihi limit warning, tapi bot bukan admin jadi tidak bisa auto-kick.`, mentions: mentionForDisplay ? [mentionForDisplay] : [] });
    }
  } catch (err) {
    console.error('[moderationEngine] Gagal kirim warning/kick:', err.message);
  }
}

module.exports = { processMessage, checkViolation, looksLikeVirtex };
