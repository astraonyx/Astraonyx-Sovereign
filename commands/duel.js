// commands/duel.js — Command Handler: /duel, /terima, /tolak, /suit
const duelEngine = require('../lib/duelEngine');
const groupLevelEngine = require('../lib/groupLevelEngine');
const { jidToNumber, toJid } = require('../lib/helpers');
const { warning, info, usage } = require('../lib/messageStyle');

function getTargetParticipant(msg) {
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  if (mentioned && mentioned.length > 0) return mentioned[0];
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quotedParticipant) return quotedParticipant;
  return null;
}

async function handleDuelCommand({ sock, chatJid, msg, command, args, reply, senderNumber, isGroup }) {
  const senderJid = msg.key.participant || msg.key.remoteJidAlt || `${senderNumber}@s.whatsapp.net`;
  const senderName = msg.pushName || `@${senderNumber}`;

  switch (command) {
    case 'duel': {
      if (!isGroup) {
        await reply(warning('Khusus Grup', 'Tantangan Battle XP Duel hanya dapat dilakukan di dalam grup WhatsApp!'));
        return;
      }

      if (!groupLevelEngine.isPlayRankEnabled(chatJid)) {
        await reply(warning(
          'Fitur Rank Belum Aktif',
          'Sistem Duel XP membutuhkan sistem rank aktif di grup ini.\n\nMinta Admin Grup untuk mengaktifkannya dengan mengetik:\n👉 */playrank on*'
        ));
        return;
      }

      const targetJid = getTargetParticipant(msg);
      if (!targetJid) {
        await reply(usage(
          '/duel @user [taruhan_xp]',
          'Tantang member grup beradu Suit (Batu-Gunting-Kertas) dengan taruhan XP!\n\n' +
          '📌 *Contoh Penggunaan:*\n' +
          '• `/duel @user 25` (taruhan 25 XP)\n' +
          '• Tag atau reply pesan member yang ingin ditantang.\n\n' +
          '⚠️ *Syarat & Ketentuan:*\n' +
          '• Kedua petarung minimal Level 2 (100 XP)\n' +
          '• Maksimal 3x duel per hari antar 2 akun yang sama\n' +
          '• Minimal taruhan 10 XP, maksimal 150 XP (dan maks 50% modal terendah)\n' +
          '• Pajak arena 5% burn fee untuk pemenang'
        ));
        return;
      }

      const betArg = args.find((a) => /^\d+$/.test(a)) || '25';
      const targetNumber = jidToNumber(targetJid);
      const targetName = `@${targetNumber}`;

      const res = await duelEngine.createChallenge(
        sock,
        chatJid,
        senderJid,
        senderName,
        targetJid,
        targetName,
        betArg,
        msg
      );

      if (res.success) {
        await sock.sendMessage(chatJid, {
          text: res.message,
          mentions: res.mentions,
        }, { quoted: msg });
      } else {
        await reply(res.message);
      }
      return;
    }

    case 'terima': {
      if (!isGroup) return;
      const res = await duelEngine.acceptChallenge(sock, chatJid, senderJid, msg);
      if (res.success) {
        await sock.sendMessage(chatJid, {
          text: res.message,
          mentions: res.mentions,
        }, { quoted: msg });
      } else {
        await reply(res.message);
      }
      return;
    }

    case 'tolak': {
      if (!isGroup) return;
      const res = await duelEngine.rejectChallenge(sock, chatJid, senderJid, msg);
      if (res.success) {
        await sock.sendMessage(chatJid, {
          text: res.message,
          mentions: res.mentions,
        }, { quoted: msg });
      } else {
        await reply(res.message);
      }
      return;
    }

    case 'suit': {
      const choiceArg = args[0] || '';
      if (!choiceArg) {
        await reply(usage(
          '/suit [batu|gunting|kertas]',
          'Pilih jurus rahasia kamu untuk memenangkan pertarungan duel!\n\n' +
          'Contoh: `/suit batu`\n' +
          '*(Di grup pesanmu akan langsung auto-delete, atau bisa kirim via PM bot)*'
        ));
        return;
      }

      const res = await duelEngine.submitChoice(sock, chatJid, senderJid, choiceArg, msg, isGroup);
      if (!res.success && res.message) {
        await reply(res.message);
      }
      return;
    }

    default:
      return;
  }
}

module.exports = { handleDuelCommand };
