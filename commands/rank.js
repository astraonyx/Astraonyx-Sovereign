// commands/rank.js — Command /playrank, /rank, /topchat (Gamifikasi & Komunitas)
const groupLevelEngine = require('../lib/groupLevelEngine');
const { isOwner, canUseAdminCommands } = require('../lib/accessControl');
const { getCachedGroupMetadata, toJid, jidToNumber, normalizeNumber } = require('../lib/helpers');
const { success, warning, error, denied, usage, info } = require('../lib/messageStyle');

async function isCallerAdminOrOwner(sock, chatJid, senderNumber, msg) {
  if (isOwner(senderNumber) || canUseAdminCommands(senderNumber)) return true;
  try {
    const meta = await getCachedGroupMetadata(sock, chatJid);
    const senderJid = msg.key.participant || `${senderNumber}@s.whatsapp.net`;
    const p = meta.participants.find(
      (item) => item.id === senderJid || item.id === toJid(senderNumber) || item.phoneNumber === senderNumber
    );
    return p?.admin === 'admin' || p?.admin === 'superadmin';
  } catch (_) {
    return false;
  }
}

function getTargetParticipant(msg) {
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  if (mentioned && mentioned.length > 0) return mentioned[0];
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quotedParticipant) return quotedParticipant;
  return null;
}

async function handleRankCommand({ sock, chatJid, msg, command, args, reply, senderNumber, isGroup }) {
  if (!isGroup) {
    await reply(warning('Khusus Grup', 'Sistem Rank & Level hanya dapat digunakan di dalam grup WhatsApp.'));
    return;
  }

  const senderJid = msg.key.participant || msg.key.remoteJidAlt || `${senderNumber}@s.whatsapp.net`;

  switch (command) {
    case 'playrank': {
      const sub = (args[0] || '').toLowerCase().trim();

      if (sub === 'on' || sub === 'enable' || sub === 'aktif') {
        const isAdmin = await isCallerAdminOrOwner(sock, chatJid, senderNumber, msg);
        if (!isAdmin) {
          await reply(denied('Akses Ditolak', 'Hanya Admin Grup atau Owner yang dapat mengaktifkan sistem rank.'));
          return;
        }

        groupLevelEngine.setPlayRankSetting(chatJid, true, 1);
        const welcomeText =
          `🏆 *SISTEM RANK & LEVEL AKTIF!* 🚀\n` +
          `──────────────────────────────\n` +
          `Mulai sekarang, seluruh anggota grup yang aktif mengobrol akan mendapatkan XP dan naik level dengan sistem skala seimbang!\n\n` +
          `📌 *Sistem Perolehan EXP Berskala Tier:*\n` +
          `• Perolehan EXP meningkat seiring Rank Tier kamu (*15-25 XP* di Novice s/d *180-250 XP* di Cosmos Legend).\n` +
          `• *Bonus Usaha Pesan:* Pesan berbobot & diskusi panjang memberi bonus hingga *+35 XP*.\n` +
          `• *Bonus Media:* Kirim foto/video/audio/stiker memberi bonus hingga *+45 XP*.\n` +
          `• Cooldown anti-spam 20 detik untuk obrolan tertib & sportif.\n\n` +
          `💡 Ketik */rank* untuk cek profilmu, */topchat* untuk leaderboard, atau */rank tier* untuk melihat tabel jenjang tier!`;

        await reply(success('Sistem Rank Diaktifkan', welcomeText));
        return;
      }

      if (sub === 'off' || sub === 'disable' || sub === 'nonaktif') {
        const isAdmin = await isCallerAdminOrOwner(sock, chatJid, senderNumber, msg);
        if (!isAdmin) {
          await reply(denied('Akses Ditolak', 'Hanya Admin Grup atau Owner yang dapat mematikan sistem rank.'));
          return;
        }

        groupLevelEngine.setPlayRankSetting(chatJid, false, 0);
        await reply(warning('Sistem Rank Dimatikan', 'Perolehan XP dan sistem rank dinonaktifkan di grup ini. Ketik `/playrank on` untuk mengaktifkannya kembali.'));
        return;
      }

      if (sub === 'reset') {
        const isAdmin = await isCallerAdminOrOwner(sock, chatJid, senderNumber, msg);
        if (!isAdmin) {
          await reply(denied('Akses Ditolak', 'Hanya Admin Grup atau Owner yang dapat mereset data rank grup.'));
          return;
        }

        groupLevelEngine.resetGroupRank(chatJid);
        await reply(success('Rank Direset', 'Seluruh data XP dan level anggota grup ini telah direset untuk musim/season baru!'));
        return;
      }

      // Default: cek status
      const setting = groupLevelEngine.getGroupRankSetting(chatJid);
      const isEnabled = setting.is_enabled === 1;
      const statusText =
        `📊 *Status Rank Grup:*\n` +
        `• Status: *${isEnabled ? '✅ AKTIF (ON)' : '❌ NONAKTIF (OFF)'}*\n` +
        `• Notifikasi Level Up: *${setting.level_up_notice !== 0 ? 'Aktif' : 'Nonaktif'}*\n\n` +
        `Gunakan:\n` +
        `• \`/playrank on\` untuk mengaktifkan\n` +
        `• \`/playrank off\` untuk mematikan\n` +
        `• \`/playrank reset\` untuk reset data rank grup\n` +
        `• \`/rank tier\` untuk melihat struktur tangga tier`;

      await reply(info('Pengaturan Playrank', statusText));
      return;
    }

    case 'tier':
    case 'tierlist':
    case 'levelinfo': {
      const ladder = groupLevelEngine.getTierLadderCard();
      await sock.sendMessage(chatJid, { text: ladder.text }, { quoted: msg });
      return;
    }

    case 'rank':
    case 'level':
    case 'xp': {
      if (!groupLevelEngine.isPlayRankEnabled(chatJid)) {
        await reply(warning(
          'Fitur Rank Belum Aktif',
          'Sistem rank & perolehan XP belum diaktifkan di grup ini.\n\nMinta Admin Grup untuk mengaktifkannya dengan mengetik:\n👉 */playrank on*'
        ));
        return;
      }

      const subArg = (args[0] || '').toLowerCase().trim();
      if (subArg === 'tier' || subArg === 'ladder' || subArg === 'info') {
        const ladder = groupLevelEngine.getTierLadderCard();
        await sock.sendMessage(chatJid, { text: ladder.text }, { quoted: msg });
        return;
      }

      // Cek apakah mengecek rank diri sendiri atau orang lain (via mention/reply)
      const targetJid = getTargetParticipant(msg) || senderJid;
      const targetNumber = jidToNumber(targetJid);
      const isSelf = targetJid === senderJid;
      const displayName = isSelf ? (msg.pushName || null) : null;

      const card = groupLevelEngine.getRankCard(chatJid, targetJid, displayName, targetNumber);
      await sock.sendMessage(chatJid, {
        text: card.text,
        mentions: card.mentions,
      }, { quoted: msg });
      return;
    }

    case 'topchat':
    case 'toprank':
    case 'leaderboard': {
      if (!groupLevelEngine.isPlayRankEnabled(chatJid)) {
        await reply(warning(
          'Fitur Rank Belum Aktif',
          'Sistem rank & perolehan XP belum diaktifkan di grup ini.\n\nMinta Admin Grup untuk mengaktifkannya dengan mengetik:\n👉 */playrank on*'
        ));
        return;
      }

      const board = groupLevelEngine.getLeaderboardCard(chatJid, senderJid, senderNumber);
      await sock.sendMessage(chatJid, {
        text: board.text,
        mentions: board.mentions,
      }, { quoted: msg });
      return;
    }

    default:
      return;
  }
}

module.exports = { handleRankCommand };
