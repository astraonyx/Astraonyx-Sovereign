// commands/deeptalk.js — Command Handler: /deeptalk (Midnight Deep Talk Cards)
const deepTalkEngine = require('../lib/deepTalkEngine');
const groupLevelEngine = require('../lib/groupLevelEngine');
const { warning } = require('../lib/messageStyle');

async function handleDeepTalkCommand({ sock, chatJid, msg, command, args, reply, senderNumber, isGroup }) {
  if (isGroup && !groupLevelEngine.isPlayRankEnabled(chatJid)) {
    await reply(warning(
      'Fitur Belum Aktif',
      'Fitur Deep Talk Cards membutuhkan sistem rank aktif di grup ini.\n\nMinta Admin Grup untuk mengaktifkannya dengan mengetik:\n👉 */playrank on*'
    ));
    return;
  }

  const levelArg = args[0] || 'random';
  const card = deepTalkEngine.drawCard(levelArg);

  await sock.sendMessage(chatJid, {
    text: card.text,
  }, { quoted: msg });
}

module.exports = { handleDeepTalkCommand };
