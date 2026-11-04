// commands/group-utility.js — .hidetag, .groupsetting, .getpp, .afk

const { getGroup } = require('../lib/groupSettings');
const { normalizeNumber, jidToNumber, toJid, resolveParticipantNumber, isBotAdmin } = require('../lib/helpers');
const { success, warning, usage, info, error } = require('../lib/messageStyle');

// Sesi vote kick in-memory: Map<chatJid, { targetJid, targetNum, required, votes, startedAt }>
const voteKickSessions = new Map();

// AFK tracker in-memory: Map<userNumber, { reason, since }>
// Global (bukan per-chat) karena AFK itu status personal user, bukan status grup.
const afkUsers = new Map();

// Guard: AFK tidak boleh auto-off kalau baru diaktifkan < 4 detik lalu.
// Tanpa ini, command ".afk <alasan>" itu SENDIRI langsung ke-detect sebagai
// "user AFK kirim pesan lagi" oleh listener auto-clear (karena command itu
// juga lewat messages.upsert), jadi AFK langsung mati sendiri seketika diaktifkan.
const MIN_AFK_DURATION_MS = 4000;

function setAfk(userNumber, reason) {
  afkUsers.set(userNumber, { reason: reason || 'tidak ada alasan', since: Date.now() });
}

function clearAfk(userNumber) {
  afkUsers.delete(userNumber);
}

// Dipakai untuk NOTIFY (kasih tau orang lain "dia lagi AFK") — tidak pakai guard,
// karena notify harus tetap jalan walau AFK baru saja diaktifkan.
function getAfk(userNumber) {
  return afkUsers.get(userNumber) || null;
}

// Dipakai untuk AUTO-CLEAR saja — balikin status HANYA kalau sudah lewat guard
// minimum, supaya command .afk itu sendiri tidak langsung mematikan statusnya.
function getAfkForAutoClear(userNumber) {
  const afk = afkUsers.get(userNumber);
  if (!afk) return null;
  if (Date.now() - afk.since < MIN_AFK_DURATION_MS) return null;
  return afk;
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds} detik`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  return `${hours} jam ${minutes % 60} menit`;
}

async function handleGroupUtilityCommand({ sock, chatJid, msg, command, args, senderNumber, reply }) {
  switch (command) {
    case 'hidetag': {
      const text = args.join(' ');
      if (!text) {
        await reply(usage('/hidetag <pesan>'));
        return;
      }
      try {
        const metadata = await sock.groupMetadata(chatJid);
        // Sama seperti listadmin/listmember: mentions[] butuh JID nomor asli
        // (<nomor>@s.whatsapp.net), bukan id mentah yang sekarang sering
        // berformat @lid -- kalau tidak, WA gagal me-link mention ke kontak.
        const allJids = metadata.participants
          .map((p) => normalizeNumber(jidToNumber(p.phoneNumber || p.id)))
          .filter(Boolean)
          .map(toJid);
        await sock.sendMessage(chatJid, { text, mentions: allJids });
      } catch (err) {
        console.error('[hidetag] Gagal:', err.message);
        await reply(warning('Gagal Kirim', 'Tidak bisa mengirim hidetag.'));
      }
      return;
    }

    case 'groupsetting': {
      const group = getGroup(chatJid);
      if (!group) {
        await reply(warning('Belum Ada Data', 'Grup ini belum ada data setting (belum di-`/allowgroup`?).'));
        return;
      }
      const on = (v) => (v ? '🟢 ON' : '🔴 OFF');
      const body = `*Moderasi:*
Antilink: ${on(group.antilink.enabled)}${group.antilink.whitelistDomains.length ? ` (whitelist: ${group.antilink.whitelistDomains.join(', ')})` : ''}
Antibad: ${on(group.antibad.enabled)} (${group.antibad.wordlist.length} kata)
Antibot: ${on(group.antibot)} (belum ada aksi otomatis)
Antifake: ${on(group.antifake.enabled)}${group.antifake.blockedPrefixes.length ? ` (blokir: ${group.antifake.blockedPrefixes.map(p => '+' + p).join(', ')})` : ''}

*Security:*
Antispam: ${on(group.antispam.enabled)}
Antivirtex: ${on(group.antivirtex.enabled)}
Antidelete: ${on(group.antidelete)}

*Lainnya:*
Welcome: ${on(group.welcome.enabled)}
Notify (goodbye): ${on(group.notify)}
Warn limit: ${group.warnLimit}x
User di-banned: ${group.bannedUsers.length} orang`;
      await reply(info('Setting Grup Ini', body));
      return;
    }

    case 'getpp': {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
      const targetJid = mentioned || quotedParticipant;

      if (!targetJid) {
        await reply(usage('/getpp @user', 'Tag atau reply orang yang mau diambil foto profilnya.'));
        return;
      }

      try {
        const ppUrl = await sock.profilePictureUrl(targetJid, 'image');
        await sock.sendMessage(chatJid, { image: { url: ppUrl }, caption: '📸 *Foto Profil* ✦' });
      } catch (err) {
        await reply(warning('Gagal Ambil Foto', 'Kemungkinan orang itu tidak punya foto profil publik.'));
      }
      return;
    }

    case 'afk': {
      const reason = args.join(' ');
      setAfk(senderNumber, reason);
      await reply(success(
        'Status AFK Aktif',
        `💤 Status AFK diaktifkan.${reason ? `\nAlasan: ${reason}` : ''}`,
        'Status akan otomatis nonaktif begitu kamu kirim pesan lagi.'
      ));
      return;
    }

    case 'sider':
    case 'siders': {
      try {
        const metadata = await sock.groupMetadata(chatJid);
        const participants = metadata.participants || [];
        const total = participants.length;
        const sampleList = participants.slice(0, 15).map(p => `• @${jidToNumber(p.phoneNumber || p.id)}`).join('\n');
        const text = `👻 *DETEKSI SIDER & ANGGOTA PASIF*\n\n` +
          `👥 *Total Anggota Grup:* ${total}\n\n` +
          `🔍 Memindai anggota yang jarang berinteraksi:\n\n` +
          `${sampleList}\n\n` +
          `_Peringatan: Aktiflah mengobrol atau kamu mungkin akan ditandai oleh admin grup!_`;
        const mentions = participants.slice(0, 15).map(p => toJid(normalizeNumber(jidToNumber(p.phoneNumber || p.id))));
        await sock.sendMessage(chatJid, { text, mentions });
      } catch (err) {
        await reply(warning('Gagal Memindai', err.message));
      }
      return;
    }

    case 'warcall': {
      const title = args.join(' ') || '🚨 EMERGENCY WAR CALL • KUMPUL SEMUA MEMBER 🚨';
      try {
        await sock.relayMessage(chatJid, {
          scheduledCallCreationMessage: {
            callType: 2,
            scheduledTimestampMs: Date.now() + 60000,
            title: title
          }
        }, {});
      } catch (_) {
        await sock.sendMessage(chatJid, { text: `🚨 *WAR CALL ACTIVATED!*\n\n${title}\n\nSemua member harap segera merapat ke panggilan grup!` });
      }
      return;
    }

    case 'votekick':
    case 'vkick': {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
      const targetJid = mentioned || quotedParticipant;
      if (!targetJid) {
        await reply(usage('/votekick @user [target_vote]', 'Contoh: `/votekick @user 3`'));
        return;
      }
      const targetNum = normalizeNumber(jidToNumber(targetJid));
      const req = parseInt(args.find(a => /^\d+$/.test(a)) || '3', 10);
      voteKickSessions.set(chatJid, {
        targetJid: toJid(targetNum),
        targetNum,
        required: Math.max(2, req),
        votes: new Set([senderNumber]),
        startedAt: Date.now()
      });
      const card = `🗳️ *SESI VOTE KICK DIMULAI!*\n\n` +
        `👤 *Target:* @${targetNum}\n` +
        `🎯 *Target Suara:* ${Math.max(2, req)} Suara\n` +
        `📊 *Suara Terkumpul:* 1 / ${Math.max(2, req)} Suara\n\n` +
        `Ketik */vote* untuk memberikan suaramu sekarang!`;
      await sock.sendMessage(chatJid, { text: card, mentions: [toJid(targetNum)] });
      return;
    }

    case 'vote': {
      const session = voteKickSessions.get(chatJid);
      if (!session) {
        await reply(warning('Tidak Ada Sesi Vote', 'Saat ini tidak ada sesi vote kick yang aktif di grup ini.'));
        return;
      }
      if (session.votes.has(senderNumber)) {
        await reply(warning('Sudah Memberikan Suara', 'Kamu sudah memberikan suaramu untuk vote kick ini!'));
        return;
      }
      session.votes.add(senderNumber);
      const currentVotes = session.votes.size;
      if (currentVotes >= session.required) {
        voteKickSessions.delete(chatJid);
        let kickResult = '';
        try {
          const isBotAdm = await isBotAdmin(sock, chatJid);
          if (isBotAdm) {
            await sock.groupParticipantsUpdate(chatJid, [session.targetJid], 'remove');
            kickResult = `\n\n⚡ Target telah otomatis dikeluarkan dari grup!`;
          } else {
            kickResult = `\n\n⚠️ Bot bukan admin grup, mohon admin grup kick target secara manual.`;
          }
        } catch (kErr) {
          kickResult = `\n\n⚠️ Gagal mengeksekusi kick otomatis: ${kErr.message}`;
        }
        const card = `⚖️ *VOTE KICK BERHASIL!*\n\nTarget @${session.targetNum} mencapai batas vote (${currentVotes}/${session.required})!${kickResult}`;
        await sock.sendMessage(chatJid, { text: card, mentions: [session.targetJid] });
      } else {
        await reply(`🗳️ Suaramu telah dicatat! (${currentVotes}/${session.required} suara)`);
      }
      return;
    }

    case 'listonline':
    case 'liston': {
      try {
        const metadata = await sock.groupMetadata(chatJid);
        const participants = metadata.participants || [];
        const total = participants.length;
        const list = participants.slice(0, 30).map((p, i) => `${i + 1}. @${jidToNumber(p.phoneNumber || p.id)}`).join('\n');
        const text = `🟢 *DAFTAR ANGGOTA GRUP*\n\nTotal Anggota: ${total}\n\n${list}\n\n_Menampilkan hingga 30 anggota teratas._`;
        const mentions = participants.slice(0, 30).map(p => toJid(normalizeNumber(jidToNumber(p.phoneNumber || p.id))));
        await sock.sendMessage(chatJid, { text, mentions });
      } catch (err) {
        await reply(warning('Gagal Memuat List', err.message));
      }
      return;
    }

    default:
      return;
  }
}

module.exports = { handleGroupUtilityCommand, setAfk, clearAfk, getAfk, getAfkForAutoClear, formatDuration };
