const { downloadMediaMessage, jidNormalizedUser } = require('@whiskeysockets/baileys');
const pino = require('pino');

const silentLogger = pino({ level: 'silent' });

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
}

function getTimestamp() {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'medium'
  }).format(new Date());
}

function deepUnwrapViewOnce(msgObject) {
  if (!msgObject) return null;
  let current = msgObject;
  let depth = 0;
  const maxDepth = 12;

  while (current && depth < maxDepth) {
    if (current.viewOnceMessage) current = current.viewOnceMessage.message;
    else if (current.viewOnceMessageV2) current = current.viewOnceMessageV2.message;
    else if (current.viewOnceMessageV2Extension) current = current.viewOnceMessageV2Extension.message;
    else if (current.ephemeralMessage) current = current.ephemeralMessage.message;
    else if (current.documentWithCaptionMessage) current = current.documentWithCaptionMessage.message;
    else break;
    depth++;
  }
  return current;
}

async function executeOpenCoc(sock, message, fullText) {
  const chatAsal = message.key.remoteJid;
  const botJid = sock.user?.id ? jidNormalizedUser(sock.user.id) : null;
  const timestamp = getTimestamp();

  if (!botJid) {
    console.error('[opencoc] botJid tidak ditemukan pada sock.user');
    return;
  }

  try {
    const contextInfo =
      message.message?.extendedTextMessage?.contextInfo ||
      message.message?.imageMessage?.contextInfo ||
      message.message?.videoMessage?.contextInfo ||
      message.message?.audioMessage?.contextInfo;

    const rawQuoted = contextInfo?.quotedMessage;

    if (!rawQuoted) {
      await sock.sendMessage(botJid, {
        text: `┌─ [ *SYSTEM NOTICE* ]\n│\n├ *Status:* Target Null\n├ *Time:* ${timestamp}\n│\n└─ Balas (*reply*) media ViewOnce yang hendak diproses.`
      });
      return;
    }

    const realMsg = deepUnwrapViewOnce(rawQuoted);
    const mediaKeys = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'];

    let mediaType = null;
    let mediaPayload = null;

    for (const key of mediaKeys) {
      if (realMsg && realMsg[key]) {
        mediaType = key.replace('Message', '');
        mediaPayload = realMsg[key];
        break;
      }
    }

    if (!mediaPayload) {
      await sock.sendMessage(botJid, {
        text: `┌─ [ *SYSTEM NOTICE* ]\n│\n├ *Status:* Invalid Payload\n├ *Time:* ${timestamp}\n│\n└─ Pesan target bukan berkas ViewOnce yang valid.`
      });
      return;
    }

    let mediaBuffer;
    try {
      const fakeMsg = {
        key: {
          remoteJid: chatAsal,
          id: contextInfo.stanzaId,
          participant: contextInfo.participant
        },
        message: { [`${mediaType}Message`]: mediaPayload }
      };

      mediaBuffer = await downloadMediaMessage(
        fakeMsg,
        'buffer',
        {},
        { logger: silentLogger }
      );
    } catch (err) {
      await sock.sendMessage(botJid, {
        text: `┌─ [ *SYSTEM NOTICE* ]\n│\n├ *Status:* Extraction Failed\n├ *Time:* ${timestamp}\n│\n└─ Gagal mendekripsi media. Berkas mungkin sudah dibuka atau kedaluwarsa.`
      });
      return;
    }

    const fileSize = formatBytes(mediaPayload.fileLength || mediaBuffer.length);
    const mimeType = mediaPayload.mimetype || 'Unknown';
    const caption = mediaPayload.caption || '';

    const payload = {};
    if (mediaType === 'image') {
      payload.image = mediaBuffer;
      payload.caption = caption;
    } else if (mediaType === 'video') {
      payload.video = mediaBuffer;
      payload.caption = caption;
    } else if (mediaType === 'audio') {
      payload.audio = mediaBuffer;
      payload.mimetype = mimeType !== 'Unknown' ? mimeType : 'audio/mpeg';
      payload.ptt = false;
    } else if (mediaType === 'document') {
      payload.document = mediaBuffer;
      payload.mimetype = mimeType;
      payload.fileName = mediaPayload.fileName || 'file';
      payload.caption = caption;
    }

    await sock.sendMessage(botJid, payload);

    const logText = [
      `┌─ [ *ASTRAONYX* ]`,
      `│`,
      `├ *Type:* ${mediaType.toUpperCase()}`,
      `├ *Size:* ${fileSize}`,
      `├ *MIME:* ${mimeType}`,
      `├ *Time:* ${timestamp}`,
      `│`,
      `├ *Powered by https://hinatasoft.com*`,
      `│`,
      `└─ *Status:* Successfully Decrypted & Voulted`
    ].join('\n');

    await sock.sendMessage(botJid, { text: logText });
  } catch (err) {
    console.error('[opencoc] Error:', err.message);
  }
}

module.exports = {
  name: 'opencoc',
  execute: executeOpenCoc,
  handleOpenCoc: executeOpenCoc
};