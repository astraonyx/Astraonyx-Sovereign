// commands/owner.js — Command khusus owner: /opencvc, /openvc, /buka (Implementasi Lama)
const { downloadMediaMessage } = require('baileys');
const { success, warning, error, usage } = require('../lib/messageStyle');

// Ekstrak pesan media asli dari dalam viewOnceMessage/viewOnceMessageV2/ephemeralMessage.
function unwrapViewOnce(quotedMessage) {
  if (!quotedMessage) return null;
  let realMsg = quotedMessage;
  if (realMsg.viewOnceMessage) realMsg = realMsg.viewOnceMessage.message;
  if (realMsg.viewOnceMessageV2) realMsg = realMsg.viewOnceMessageV2.message;
  if (realMsg.viewOnceMessageV2Extension) realMsg = realMsg.viewOnceMessageV2Extension.message;
  if (realMsg.ephemeralMessage) realMsg = realMsg.ephemeralMessage.message;
  return realMsg;
}

function findMediaInMessage(message) {
  if (!message) return null;
  const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage'];
  for (const type of mediaTypes) {
    if (message[type]) {
      return { mediaType: type.replace('Message', ''), mediaNode: message[type] };
    }
  }
  return null;
}

async function handleOpenCvc({ sock, chatJid, msg, reply }) {
  try {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) {
      await reply(usage('/opencvc', 'Reply ke pesan viewOnce (foto/video/audio) yang mau dibuka.'));
      return;
    }

    const realMsg = unwrapViewOnce(quoted);
    const found = findMediaInMessage(realMsg);

    if (!found) {
      await reply(warning('Bukan ViewOnce', 'Pesan yang di-reply bukan media viewOnce yang valid (foto/video/audio).'));
      return;
    }

    const { mediaType, mediaNode } = found;

    let mediaBuffer;
    try {
      // Bungkus ulang jadi bentuk yang downloadMediaMessage bisa baca.
      const fakeMsg = { message: { viewOnceMessage: { message: realMsg } } };
      mediaBuffer = await downloadMediaMessage(fakeMsg, 'buffer', {});
    } catch (err) {
      console.error('[opencvc] Gagal download media:', err.message);
      await reply(error('Gagal Unduh', 'Tidak bisa mengunduh media. Mungkin file sudah tidak tersedia lagi.'));
      return;
    }

    const caption = mediaNode.caption || '';
    let messageContent = {};

    if (mediaType === 'image') {
      messageContent = { image: mediaBuffer, caption };
    } else if (mediaType === 'video') {
      messageContent = { video: mediaBuffer, caption, gifPlayback: false };
    } else if (mediaType === 'audio') {
      messageContent = { audio: mediaBuffer, mimetype: mediaNode.mimetype || 'audio/mpeg', ptt: false };
    }

    await sock.sendMessage(chatJid, messageContent);
    await reply(success('ViewOnce Dibuka', `Media ${mediaType} berhasil dibuka dan dikirim ulang.`));
  } catch (err) {
    console.error('[opencvc] Error umum:', err.message);
    await reply(error('Gagal Memproses', 'Terjadi kesalahan saat memproses viewOnce.'));
  }
}

/**
 * Mempublikasikan pesan / media siaran langsung ke Saluran WhatsApp Resmi Astraonyx
 * Perintah: /chpost <pesan> atau reply media dengan /chpost [caption]
 */
async function handleChPost({ sock, chatJid, msg, args, reply }) {
  const channelFollower = require('../lib/channelFollower');
  try {
    const textArg = args.join(' ').trim();
    const quotedContext = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = quotedContext?.quotedMessage;

    if (!textArg && !quoted) {
      await reply(usage(
        '/chpost <teks pengumuman>',
        'Atau balas (*reply*) foto, video, audio, atau dokumen dengan `/chpost [caption]` untuk menyiarkannya langsung ke Saluran Resmi Astraonyx.'
      ));
      return;
    }

    const role = channelFollower.getChannelRole();
    if (!channelFollower.isChannelAdminOrOwner()) {
      await reply(warning(
        'Izin Saluran Diperlukan',
        `Akun bot saat ini berstatus *${role}* di Saluran Resmi Astraonyx.\n\n` +
        `WhatsApp hanya mengizinkan akun berstatus *ADMIN* atau *OWNER* untuk memposting ke saluran.\n\n` +
        `💡 *Cara Mengaktifkan:*\n` +
        `1. Buka aplikasi WhatsApp di HP kamu.\n` +
        `2. Masuk ke Saluran Astraonyx.\n` +
        `3. Buka Info Saluran > Pengurus (Admins) > Tambah Pengurus.\n` +
        `4. Pilih nomor bot ini untuk dijadikan Admin Saluran.`
      ));
      return;
    }

    let messageContent = {};

    // Jika me-reply pesan ber-media
    if (quoted) {
      const realMsg = unwrapViewOnce(quoted);
      const mediaTypes = ['imageMessage', 'videoMessage', 'documentMessage', 'audioMessage'];
      let foundType = null;
      let mediaNode = null;

      for (const t of mediaTypes) {
        if (realMsg[t]) {
          foundType = t.replace('Message', '');
          mediaNode = realMsg[t];
          break;
        }
      }

      if (foundType) {
        try {
          const mediaBuffer = await downloadMediaMessage({ message: realMsg }, 'buffer', {});
          const caption = textArg || mediaNode.caption || '';

          if (foundType === 'image') {
            messageContent = { image: mediaBuffer, caption };
          } else if (foundType === 'video') {
            messageContent = { video: mediaBuffer, caption };
          } else if (foundType === 'document') {
            messageContent = {
              document: mediaBuffer,
              mimetype: mediaNode.mimetype || 'application/octet-stream',
              fileName: mediaNode.fileName || 'dokumen.pdf',
              caption,
            };
          } else if (foundType === 'audio') {
            messageContent = {
              audio: mediaBuffer,
              mimetype: mediaNode.mimetype || 'audio/mpeg',
              ptt: false,
            };
          }
        } catch (dErr) {
          console.error('[chpost] Gagal unduh media quoted:', dErr.message);
        }
      }
    }

    // Jika tidak ada media yang berhasil di-load, gunakan teks
    if (Object.keys(messageContent).length === 0) {
      if (!textArg) {
        await reply(warning('Konten Kosong', 'Gagal memproses media yang di-reply dan tidak ada teks pesan.'));
        return;
      }
      messageContent = { text: textArg };
    }

    const postResult = await channelFollower.postToChannel(sock, messageContent);
    if (postResult.success) {
      const roleBadge = postResult.role === 'OWNER' ? '👑 OWNER' : '🛡️ ADMIN';
      await reply(success(
        'Siaran Saluran Terkirim',
        `Postingan berhasil dipublikasikan ke Saluran Resmi Astraonyx!\n\n` +
        `• Saluran: ${postResult.channelName}\n` +
        `• Status Akun Bot: *${roleBadge}*\n` +
        `• Message ID: \`${postResult.messageId || '-'}\``
      ));
    } else {
      await reply(error('Gagal Memposting ke Saluran', postResult.message || postResult.error || 'Terjadi kesalahan.'));
    }
  } catch (err) {
    console.error('[handleChPost] Error:', err.message);
    await reply(error('Gagal Memproses Postingan', err.message));
  }
}

module.exports = { handleOpenCvc, handleChPost };

