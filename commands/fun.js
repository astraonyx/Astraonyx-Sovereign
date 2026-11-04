// commands/fun.js — Command Handler: /truth, /dare, /tebakkata, /caklontong, /tebaktebakan, /nyerah, /spin, /roll
const groupFunEngine = require('../lib/groupFunEngine');
const groupLevelEngine = require('../lib/groupLevelEngine');
const { box, warning, success, info } = require('../lib/messageStyle');
const { jidToNumber } = require('../lib/helpers');

async function handleFunCommand({ sock, chatJid, msg, command, args, reply, senderNumber, isGroup }) {
  if (!isGroup) {
    await reply(warning('Khusus Grup', 'Game & Fitur Have Fun ini hanya bisa dimainkan di dalam grup WhatsApp!'));
    return;
  }

  // Enforce: Semua fitur game & fun hanya aktif jika playrank ON di grup ini
  if (!groupLevelEngine.isPlayRankEnabled(chatJid)) {
    await reply(warning(
      'Fitur Game Belum Aktif',
      'Fitur Game & Have Fun membutuhkan sistem rank aktif di grup ini.\n\nMinta Admin Grup untuk mengaktifkannya dengan mengetik:\n👉 */playrank on*'
    ));
    return;
  }

  const userJid = msg.key.participant || msg.key.remoteJidAlt || `${senderNumber}@s.whatsapp.net`;
  const pushName = msg.pushName || 'Sahabat';

  switch (command) {
    case 'truth': {
      const q = groupFunEngine.getRandomTruth();
      const card = box({
        prefix: 'POLARIS FUN',
        statusTag: 'TRUTH',
        title: 'PERTANYAAN JUJUR',
        body: `❓ *Pertanyaan untukmu:*\n"${q}"`,
        footer: 'Jawab dengan jujur dan jangan berbohong ya!',
      });
      await sock.sendMessage(chatJid, { text: card }, { quoted: msg });
      return;
    }

    case 'dare': {
      const d = groupFunEngine.getRandomDare();
      const card = box({
        prefix: 'POLARIS FUN',
        statusTag: 'DARE',
        title: 'TANTANGAN BERANI',
        body: `🔥 *Tantangan untukmu:*\n"${d}"`,
        footer: 'Lakukan tantangan ini dan buktikan kamu berani!',
      });
      await sock.sendMessage(chatJid, { text: card }, { quoted: msg });
      return;
    }

    case 'tebakkata':
    case 'caklontong':
    case 'tebaktebakan':
    case 'susunkata': {
      // Cek apakah playrank diaktifkan di grup ini
      const isRankOn = groupLevelEngine.isPlayRankEnabled(chatJid);
      if (!isRankOn) {
        await reply(warning(
          'Fitur Rank Belum Aktif',
          'Sistem game tebak-tebakan berhadiah XP membutuhkan sistem rank aktif.\n\nMinta Admin Grup untuk mengaktifkannya dengan mengetik:\n👉 */playrank on*'
        ));
        return;
      }

      const result = await groupFunEngine.startQuiz(sock, chatJid, command);
      if (result.started) {
        await sock.sendMessage(chatJid, { text: result.text }, { quoted: msg });
      } else {
        await reply(result.message);
      }
      return;
    }

    case 'nyerah': {
      const giveUpMsg = await groupFunEngine.giveUp(chatJid);
      await reply(giveUpMsg);
      return;
    }

    case 'spin':
    case 'roll': {
      // Cek apakah playrank diaktifkan di grup ini
      const isRankOn = groupLevelEngine.isPlayRankEnabled(chatJid);
      if (!isRankOn) {
        await reply(warning(
          'Fitur Rank Belum Aktif',
          'Wheel of Fortune membutuhkan sistem rank aktif untuk menyimpan dan mempertaruhkan XP.\n\nMinta Admin Grup untuk mengaktifkannya dengan mengetik:\n👉 */playrank on*'
        ));
        return;
      }

      const spinResult = await groupFunEngine.playWheelOfFortune(
        chatJid,
        userJid,
        senderNumber,
        pushName,
        sock,
        msg
      );

      await sock.sendMessage(chatJid, {
        text: spinResult.text,
        mentions: spinResult.mentions || [userJid],
      }, { quoted: msg });
      return;
    }

    default:
      return;
  }
}

module.exports = { handleFunCommand };
