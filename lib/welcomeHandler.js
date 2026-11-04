// lib/welcomeHandler.js — Handle event group-participants.update untuk
// welcome message (member join) dan notify (member keluar).
// Dipanggil dari index.js lewat sock.ev.on('group-participants.update', ...).

const { getGroup } = require('./groupSettings');
const { normalizeNumber, jidToNumber, toJid } = require('./helpers');

const DEFAULT_WELCOME_TEXT = 'Selamat datang @user di @group! 👋';

function renderTemplate(template, { userJid, groupName }) {
  return template
    .replace(/@user/g, `@${normalizeNumber(jidToNumber(userJid)) || 'member'}`)
    .replace(/@group/g, groupName || 'grup ini');
}

async function handleGroupParticipantsUpdate(sock, event) {
  const { id: chatJid, participants, action } = event;
  const group = getGroup(chatJid);
  if (!group || !group.allowed) return;

  try {
    if (action === 'add') {
      // Antifake: kick otomatis member baru yang nomornya diawali kode negara
      // yang ada di blocklist custom (diisi manual lewat .antifake <kode1,kode2>).
      // Contoh: blocklist ["1","44"] akan nge-kick nomor +1 (US/Kanada) dan +44 (UK).
      if (group.antifake?.enabled && group.antifake.blockedPrefixes?.length > 0) {
        for (const userJid of participants) {
          const number = jidToNumber(userJid) || '';
          const isFake = group.antifake.blockedPrefixes.some((prefix) => number.startsWith(prefix));
          if (isFake) {
            try {
              await sock.groupParticipantsUpdate(chatJid, [userJid], 'remove');
              await sock.sendMessage(chatJid, { text: `📵 Nomor asing (+${number.slice(0, 3)}...) otomatis dikeluarkan (antifake aktif).` });
            } catch (err) {
              console.error('[welcomeHandler] Gagal auto-kick antifake:', err.message);
            }
            continue; // skip welcome message untuk member yang baru saja dikick
          }
        }
      }

      // Antibot: TODO - belum ada mekanisme deteksi yang reliable dari sisi
      // Baileys/WhatsApp (tidak ada flag resmi untuk membedakan akun bot vs
      // manusia). Toggle ini tersimpan di setting tapi belum melakukan aksi
      // apapun. Dicatat di PROGRESS.md sebagai limitation, bukan bug.

      if (group.welcome?.enabled) {
        const metadata = await sock.groupMetadata(chatJid);
        const template = group.welcome.text || DEFAULT_WELCOME_TEXT;

        for (const userJid of participants) {
          const text = renderTemplate(template, { userJid, groupName: metadata.subject });
          const number = normalizeNumber(jidToNumber(userJid));
          await sock.sendMessage(chatJid, { text, mentions: number ? [toJid(number)] : [] });
        }
      }
    }

    if (action === 'remove' && group.notify) {
      for (const userJid of participants) {
        const number = normalizeNumber(jidToNumber(userJid));
        await sock.sendMessage(chatJid, { text: `👋 @${number || 'member'} telah keluar dari grup.`, mentions: number ? [toJid(number)] : [] });
      }
    }
  } catch (err) {
    console.error('[welcomeHandler] Gagal proses group-participants.update:', err.message);
  }
}

module.exports = { handleGroupParticipantsUpdate };
