// commands/timecapsule.js — Command Handler: /timecapsule, /listcapsule, /delcapsule
const timeCapsuleEngine = require('../lib/timeCapsuleEngine');
const { jidToNumber, toJid } = require('../lib/helpers');
const { usage, warning, info } = require('../lib/messageStyle');

function getTargetParticipant(msg) {
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  if (mentioned && mentioned.length > 0) return mentioned[0];
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quotedParticipant) return quotedParticipant;
  return null;
}

function parseCapsuleArguments(args) {
  // Membersihkan args dari mention @628xxx jika ada di args text
  const cleanArgs = args.filter((a) => !a.startsWith('@') || a.length < 5);
  if (cleanArgs.length === 0) return { timeStr: null, messageContent: null };

  let timeStr = cleanArgs[0];
  let messageStartIdx = 1;

  // Cek format 2 kata: "besok 08:00", "lusa 19:30", atau "15-09-2026 19:30"
  if (
    cleanArgs[0]?.toLowerCase() === 'besok' ||
    cleanArgs[0]?.toLowerCase() === 'lusa' ||
    /^\d{4}-\d{2}-\d{2}$/.test(cleanArgs[0]) ||
    /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(cleanArgs[0])
  ) {
    if (cleanArgs[1] && /^(\d{1,2})[:.](\d{2})$/.test(cleanArgs[1])) {
      timeStr = `${cleanArgs[0]} ${cleanArgs[1]}`;
      messageStartIdx = 2;
    }
  }

  const messageContent = cleanArgs.slice(messageStartIdx).join(' ').trim();
  return { timeStr, messageContent };
}

async function handleTimeCapsuleCommand({ sock, chatJid, msg, command, args, reply, senderNumber, isGroup }) {
  const creatorJid = msg.key.participant || msg.key.remoteJidAlt || `${senderNumber}@s.whatsapp.net`;
  const creatorName = msg.pushName || `@${senderNumber}`;

  switch (command) {
    case 'timecapsule':
    case 'kapsulwaktu':
    case 'capsule': {
      let targetJid = getTargetParticipant(msg);

      // Jika di chat pribadi dan tidak ada mention, target otomatis lawan bicara
      if (!targetJid && !isGroup) {
        targetJid = chatJid;
      }

      if (!targetJid) {
        await reply(usage(
          '/timecapsule @user <waktu> <pesan>',
          'Kunci pesan atau kenangan rahasia ke dalam kapsul waktu digital!\n' +
          'Pesan ini akan otomatis dibuka dan di-tag ke orang yang dituju pada waktu yang ditentukan.\n\n' +
          '📌 *Contoh Penggunaan:*\n' +
          '• `/timecapsule @user 7d Selamat anniversary yang ke-1 tahun!`\n' +
          '• `/timecapsule @user 1h Jangan lupa minum obat ya say!`\n' +
          '• `/timecapsule @user besok 08:00 Semangat ujiannya hari ini!`\n' +
          '• `/timecapsule @user 2026-12-31 23:59 Resolusi tahun baru kita!`\n\n' +
          '📌 *Format Waktu yang Didukung:*\n' +
          '• Menit/Jam/Hari: `10m`, `2h`, `1d`, `7d`, `1bln`, `1th`\n' +
          '• Kalender: `besok 08:00`, `15-09-2026 20:00`'
        ));
        return;
      }

      const { timeStr, messageContent } = parseCapsuleArguments(args);

      if (!timeStr || !messageContent) {
        await reply(warning(
          'Argumen Kurang Lengkap',
          'Harap sertakan waktu dan isi pesan kapsul waktu.\n\nContoh: `/timecapsule @user 1d Semangat ya besok!`'
        ));
        return;
      }

      const targetNumber = jidToNumber(targetJid);
      const targetName = `@${targetNumber}`;

      const res = await timeCapsuleEngine.createCapsule(
        chatJid,
        creatorJid,
        creatorName,
        targetJid,
        targetName,
        messageContent,
        timeStr
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

    case 'listcapsule':
    case 'mycapsule': {
      const card = timeCapsuleEngine.listUserCapsules(chatJid, creatorJid);
      await reply(card);
      return;
    }

    case 'delcapsule': {
      const id = args[0] || '';
      const resultMsg = timeCapsuleEngine.deleteUserCapsule(chatJid, creatorJid, id);
      await reply(resultMsg);
      return;
    }

    default:
      return;
  }
}

module.exports = { handleTimeCapsuleCommand };
