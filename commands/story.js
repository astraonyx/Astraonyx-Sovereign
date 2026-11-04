// commands/story.js — Command /upsw & /delsw untuk pasang dan hapus status WhatsApp langsung dari chat
const { downloadMediaMessage } = require('baileys');
const config = require('../config');
const { isOwner } = require('../lib/accessControl');
const { success, warning, error, usage, box } = require('../lib/messageStyle');
const storyManager = require('../lib/storyManager');
const { optimizeVideoForWhatsApp, optimizeImageForWhatsApp } = require('../lib/mediaOptimizer');
const contactsManager = require('../lib/contactsManager');

// Helper unwrap view once / media
function unwrapMessage(msg) {
  let m = msg?.message;
  if (!m) return null;
  if (m.viewOnceMessage) m = m.viewOnceMessage.message;
  if (m.viewOnceMessageV2) m = m.viewOnceMessageV2.message;
  if (m.ephemeralMessage) m = m.ephemeralMessage.message;
  return m;
}

/**
 * Command: /upsw [teks] ATAU reply media foto/video dengan /upsw [caption]
 * Memasang status WhatsApp dan WAJIB mengirimkan copy ke nomor sendiri agar bisa dilihat & dihapus.
 */
async function handleUpSwCommand({ sock, chatJid, msg, args, reply, senderNumber, isOwnerFlag }) {
  if (!isOwnerFlag && !isOwner(senderNumber)) {
    await reply(warning('Akses Ditolak', 'Hanya Owner bot yang diizinkan mengunggah status WhatsApp via command.'));
    return;
  }

  const rawText = args.join(' ').trim();
  const quotedContext = msg.message?.extendedTextMessage?.contextInfo;
  const quotedMsg = quotedContext?.quotedMessage ? unwrapMessage({ message: quotedContext.quotedMessage }) : null;

  const isQuotedImage = Boolean(quotedMsg?.imageMessage);
  const isQuotedVideo = Boolean(quotedMsg?.videoMessage);
  const isDirectImage = Boolean(msg.message?.imageMessage);
  const isDirectVideo = Boolean(msg.message?.videoMessage);

  const hasMedia = isQuotedImage || isQuotedVideo || isDirectImage || isDirectVideo;

  if (!rawText && !hasMedia) {
    await reply(usage(
      '/upsw <teks status>',
      'Atau balas (*reply*) foto / video dengan `/upsw [caption]` untuk memasang Status WhatsApp.'
    ));
    return;
  }

  const instanceId = process.env.INSTANCE_ID || 'primary';
  const allKnownJids = contactsManager.getAllContactJids();
  const botJid = sock.user?.id ? require('baileys').jidNormalizedUser(sock.user.id) : '';
  const botNum = botJid ? botJid.replace(/[^0-9]/g, '') : '';

  // Filter statusJidList: Baileys status broadcast
  let statusJidList = (allKnownJids || []).filter((jid) => {
    const clean = String(jid || '').replace(/[^0-9]/g, '');
    const isLid = clean.length > 14 || clean.startsWith('2777');
    return clean && clean.length >= 9 && !isLid && clean !== botNum;
  });

  if (config.ownerNumber) {
    const ownerClean = String(config.ownerNumber).replace(/[^0-9]/g, '');
    if (ownerClean.length >= 9 && ownerClean !== botNum && ownerClean.length <= 14) {
      const ownerJid = `${ownerClean}@s.whatsapp.net`;
      if (!statusJidList.includes(ownerJid)) statusJidList.push(ownerJid);
    }
  }

  if (statusJidList.length === 0) {
    statusJidList = config.ownerNumber ? [`${config.ownerNumber.replace(/[^0-9]/g, '')}@s.whatsapp.net`] : [];
  }

  const selfJids = storyManager.getSelfAndOwnerJids(sock, config);

  try {
    let statusMsg = null;
    let storyType = 'text';
    let previewText = rawText;
    const sentSelfKeys = [];

    if (hasMedia) {
      storyType = 'media';
      const isVideo = isQuotedVideo || isDirectVideo;
      const targetMediaMsg = isQuotedVideo ? { message: { videoMessage: quotedMsg.videoMessage } }
        : isQuotedImage ? { message: { imageMessage: quotedMsg.imageMessage } }
        : isDirectVideo ? { message: { videoMessage: msg.message.videoMessage } }
        : { message: { imageMessage: msg.message.imageMessage } };

      const mediaNode = quotedMsg?.videoMessage || quotedMsg?.imageMessage || msg.message?.videoMessage || msg.message?.imageMessage;
      const mediaBuffer = await downloadMediaMessage(targetMediaMsg, 'buffer', {});
      const caption = rawText || mediaNode?.caption || '';
      previewText = caption;

      if (isVideo) {
        // Simpan sementara buffer video untuk optimasi
        const fs = require('fs');
        const path = require('path');
        const tmpDir = path.resolve(__dirname, '../tmp/media');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        const tmpVideo = path.join(tmpDir, `upsw_${Date.now()}.mp4`);
        fs.writeFileSync(tmpVideo, mediaBuffer);

        const opt = await optimizeVideoForWhatsApp(tmpVideo, { maxDuration: 30 });

        statusMsg = await sock.sendMessage('status@broadcast', {
          video: opt.videoBuffer,
          caption: caption || '',
          mimetype: 'video/mp4',
          jpegThumbnail: opt.jpegThumbnail || undefined,
          seconds: opt.seconds || 15,
          fileLength: opt.size,
          ptv: false,
        }, {
          statusJidList,
          broadcast: true,
        });

        // Kirim WAJIB ke nomor sendiri & owner
        for (const targetJid of selfJids) {
          try {
            const selfCaption = caption
              ? `${caption}\n\n📢 *[STATUS WHATSAPP TERPASANG]*\n🗑️ *Hapus Status:* Reply video ini dengan \`/delsw\` (atau ketik \`/delsw\`)`
              : `📢 *[STATUS WHATSAPP TERPASANG]*\n🎬 Video Status WhatsApp telah berhasil dipasang.\n\n🗑️ *Hapus Status:* Reply video ini dengan \`/delsw\` (atau ketik \`/delsw\`)`;

            const selfRes = await sock.sendMessage(targetJid, {
              video: opt.videoBuffer,
              caption: selfCaption,
              mimetype: 'video/mp4',
              jpegThumbnail: opt.jpegThumbnail || undefined,
              seconds: opt.seconds || 15,
            });
            if (selfRes?.key) sentSelfKeys.push({ jid: targetJid, key: selfRes.key });
          } catch (eSend) {
            console.error(`[upsw] Gagal kirim copy video ke ${targetJid}:`, eSend.message);
          }
        }

        try { fs.unlinkSync(tmpVideo); } catch (_) {}
        if (opt.outputPath && opt.outputPath !== tmpVideo) {
          try { fs.unlinkSync(opt.outputPath); } catch (_) {}
        }
      } else {
        // Image
        const optImg = await optimizeImageForWhatsApp(mediaBuffer).catch(() => ({
          imageBuffer: mediaBuffer,
          jpegThumbnail: null,
        }));

        statusMsg = await sock.sendMessage('status@broadcast', {
          image: optImg.imageBuffer,
          caption: caption || '',
          mimetype: 'image/jpeg',
          jpegThumbnail: optImg.jpegThumbnail || undefined,
        }, {
          statusJidList,
          broadcast: true,
        });

        // Kirim WAJIB ke nomor sendiri & owner
        for (const targetJid of selfJids) {
          try {
            const selfCaption = caption
              ? `${caption}\n\n📢 *[STATUS WHATSAPP TERPASANG]*\n🗑️ *Hapus Status:* Reply foto ini dengan \`/delsw\` (atau ketik \`/delsw\`)`
              : `📢 *[STATUS WHATSAPP TERPASANG]*\n📸 Foto Status WhatsApp telah berhasil dipasang.\n\n🗑️ *Hapus Status:* Reply foto ini dengan \`/delsw\` (atau ketik \`/delsw\`)`;

            const selfRes = await sock.sendMessage(targetJid, {
              image: optImg.imageBuffer,
              caption: selfCaption,
              mimetype: 'image/jpeg',
              jpegThumbnail: optImg.jpegThumbnail || undefined,
            });
            if (selfRes?.key) sentSelfKeys.push({ jid: targetJid, key: selfRes.key });
          } catch (eSend) {
            console.error(`[upsw] Gagal kirim copy foto ke ${targetJid}:`, eSend.message);
          }
        }
      }
    } else {
      // Text status
      const safeBgColor = '#005c4b';
      const safeFont = 1;

      statusMsg = await sock.sendMessage('status@broadcast', {
        text: rawText,
        backgroundColor: safeBgColor,
        font: safeFont,
      }, {
        backgroundColor: safeBgColor,
        font: safeFont,
        statusJidList,
        broadcast: true,
      });

      // Kirim WAJIB ke nomor sendiri & owner
      for (const targetJid of selfJids) {
        try {
          const selfRes = await sock.sendMessage(targetJid, {
            text: `📢 *[STATUS WHATSAPP TERPASANG]*\n\n"${rawText}"\n\n───────────────────\n🆔 *Status ID:* \`${statusMsg?.key?.id || '-'}\`\n⏱️ *Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n🗑️ *Hapus Status:*\nBalas (*reply*) pesan ini dengan \`/delsw\` untuk menghapus status ini dari WhatsApp.`,
          });
          if (selfRes?.key) sentSelfKeys.push({ jid: targetJid, key: selfRes.key });
        } catch (eSend) {
          console.error(`[upsw] Gagal kirim copy teks ke ${targetJid}:`, eSend.message);
        }
      }
    }

    // Catat ke storyManager
    storyManager.recordStory({
      statusKey: statusMsg?.key,
      selfMessageKeys: sentSelfKeys,
      storyType,
      preview: previewText,
      audienceCount: statusJidList.length,
      instanceId,
    });

    await reply(success(
      'Status WA Berhasil Dipasang',
      `✅ Status WhatsApp berhasil dipublikasikan ke *status@broadcast*!\n\n` +
      `• Tipe: *${storyType.toUpperCase()}*\n` +
      `• Audience: *${statusJidList.length} kontak*\n` +
      `• Copy Dikirim Ke: *${sentSelfKeys.length} nomor pribadi/owner*\n` +
      `• Status ID: \`${statusMsg?.key?.id || '-'}\`\n\n` +
      `💡 *Tips:* Copy status sudah dikirimkan ke chat nomor kamu. Kamu bisa membalas (*reply*) pesan tersebut dengan \`/delsw\` kapan saja untuk menghapusnya.`
    ));
  } catch (err) {
    console.error('[upsw] Error:', err.message);
    await reply(error('Gagal Memasang Status', err.message));
  }
}

/**
 * Command: /delsw (atau reply pesan status dengan /delsw)
 * Menghapus status WhatsApp yang aktif dari status@broadcast dan menghapus pesan copy di chat.
 */
async function handleDelSwCommand({ sock, chatJid, msg, args, reply, senderNumber, isOwnerFlag }) {
  if (!isOwnerFlag && !isOwner(senderNumber)) {
    await reply(warning('Akses Ditolak', 'Hanya Owner bot yang diizinkan menghapus status WhatsApp.'));
    return;
  }

  const instanceId = process.env.INSTANCE_ID || 'primary';
  const quotedContext = msg.message?.extendedTextMessage?.contextInfo;
  const quotedStanzaId = quotedContext?.stanzaId;

  let targetStory = null;

  // 1. Jika me-reply pesan spesifik
  if (quotedStanzaId) {
    targetStory = storyManager.findStoryByMessageId(quotedStanzaId, instanceId);
  }

  // 2. Jika tidak me-reply atau ID tidak ditemukan, ambil status aktif terakhir
  if (!targetStory) {
    targetStory = storyManager.getLatestActiveStory(instanceId);
  }

  if (!targetStory) {
    await reply(warning(
      'Tidak Ada Status',
      'Tidak ditemukan status WhatsApp aktif yang tercatat untuk dihapus.\n\n' +
      '💡 Jika ingin menghapus status tertentu, balas (*reply*) pesan copy status di chat ini dengan `/delsw`.'
    ));
    return;
  }

  try {
    const delResult = await storyManager.deleteStoryOnWhatsApp(sock, targetStory, instanceId);

    // Hapus juga pesan reply pemanggil jika memungkinkan
    try {
      if (quotedStanzaId && quotedContext?.participant) {
        await sock.sendMessage(chatJid, {
          delete: {
            remoteJid: chatJid,
            id: quotedStanzaId,
            fromMe: quotedContext.participant.includes(sock.user?.id?.replace(/[^0-9]/g, '')),
          },
        });
      }
    } catch (_) {}

    await reply(success(
      'Status WA Berhasil Dihapus',
      `🗑️ Status WhatsApp (*${targetStory.statusKey?.id}*) telah ditarik dan dihapus dari status@broadcast!\n\n` +
      `• Tipe Status: *${(targetStory.storyType || 'text').toUpperCase()}*\n` +
      `• Pesan Copy Dihapus: *${delResult.selfDeletedCount} pesan*\n` +
      `• Status: 🟢 *TERHAPUS*`
    ));
  } catch (err) {
    console.error('[delsw] Error:', err.message);
    await reply(error('Gagal Menghapus Status', err.message));
  }
}

module.exports = {
  handleUpSwCommand,
  handleDelSwCommand,
};
