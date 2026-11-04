// commands/media.js — AI Media Studio (/sticker, /s, /toimg, /tourl, /nobg, /hd, /upscale)
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { Jimp } = require('jimp');
const { createSticker } = require('../lib/stickerGenerator');
const { removeBg } = require('../lib/removeBgScraper');
const { success, warning, error, usage, info } = require('../lib/messageStyle');
const config = require('../config');

const execAsync = promisify(exec);
const CATBOX_API = 'https://catbox.moe/user/api.php';
const MAX_TOURL_SIZE_MB = 45;

function getMediaMessage(msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const direct = msg.message;

  const check = (m) => {
    if (!m) return null;
    if (m.imageMessage) return { type: 'image', node: m.imageMessage };
    if (m.videoMessage) return { type: 'video', node: m.videoMessage };
    if (m.stickerMessage) return { type: 'sticker', node: m.stickerMessage };
    if (m.documentMessage) return { type: 'document', node: m.documentMessage };
    return null;
  };

  return check(direct) || check(quoted);
}

async function downloadMedia(sock, msg, mediaInfo, fromQuoted) {
  const { downloadMediaMessage } = require('baileys');
  if (fromQuoted) {
    const quotedKey = msg.message.extendedTextMessage.contextInfo;
    const fakeMsg = {
      key: { remoteJid: msg.key.remoteJid, id: quotedKey.stanzaId, participant: quotedKey.participant },
      message: quotedKey.quotedMessage,
    };
    return downloadMediaMessage(fakeMsg, 'buffer', {});
  }
  return downloadMediaMessage(msg, 'buffer', {});
}

/**
 * AI Image Enhancer & Upscaler (Multi-Pass Local & Free AI Provider)
 */
async function enhanceImageHd(buffer) {
  try {
    const image = await Jimp.read(buffer);
    const origW = image.bitmap.width;
    const origH = image.bitmap.height;

    // Tentukan skala: jika gambar kecil (< 600px), skala 3x, jika sedang skala 2x
    let scale = 2;
    if (origW < 500 || origH < 500) scale = 3;
    if (origW > 1800 || origH > 1800) scale = 1.5;

    const newW = Math.round(origW * scale);
    const newH = Math.round(origH * scale);

    // 1. Resize bicubic
    image.resize({ w: newW, h: newH });

    // 2. Adaptive contrast & brightness tuning
    image.contrast(0.08);

    // 3. Sharpening filter via 3x3 convolution
    const sharpenKernel = [
      [0, -0.2, 0],
      [-0.2, 1.8, -0.2],
      [0, -0.2, 0]
    ];
    image.convolute(sharpenKernel);

    const outBuffer = await image.getBuffer('image/jpeg');
    return {
      success: true,
      buffer: outBuffer,
      origW,
      origH,
      newW,
      newH,
      scale: `${scale}x`,
    };
  } catch (err) {
    console.error('[enhanceImageHd] Error:', err.message);
    throw err;
  }
}

async function handleMediaCommand({ sock, chatJid, msg, command, args, reply }) {
  const cmd = (command || '').toLowerCase();

  switch (cmd) {
    case 's':
    case 'stiker':
    case 'stc':
    case 'sticker': {
      try {
        const mediaInfo = getMediaMessage(msg);
        if (!mediaInfo || (mediaInfo.type !== 'image' && mediaInfo.type !== 'video')) {
          await reply(usage('/sticker', 'Kirim atau reply gambar/video dengan caption `/sticker` atau `/s`.\nOpsi: `/s full`, `/s circle`, `/s rounded`. Video maksimal 10 detik.'));
          return;
        }

        const hasQuoted = Boolean(msg.message?.extendedTextMessage?.contextInfo?.quotedMessage);
        const buffer = await downloadMedia(sock, msg, mediaInfo, hasQuoted);

        const type = args[0] && ['default', 'full', 'circle', 'rounded'].includes(args[0]) ? args[0] : 'default';
        const stickerBuffer = await createSticker(buffer, type);

        await sock.sendMessage(chatJid, { sticker: stickerBuffer }, { quoted: msg });
      } catch (err) {
        console.error('[sticker] Gagal:', err.message);
        const detail = err.message.includes('detik') ? err.message : 'Coba lagi atau pastikan format media didukung.';
        await reply(error('Gagal Membuat Stiker', detail));
      }
      return;
    }

    case 'nobg':
    case 'removebg': {
      try {
        const mediaInfo = getMediaMessage(msg);
        if (!mediaInfo || mediaInfo.type !== 'image') {
          await reply(usage('/nobg', 'Kirim atau reply foto yang ingin dihapus background-nya dengan caption `/nobg`.\nOpsi: `/nobg sticker` untuk langsung dijadikan stiker transparan.'));
          return;
        }

        await reply(info('Memproses Hapus Background...', 'Kecerdasan AI sedang memisahkan objek utama dari background. Mohon tunggu sejenak.'));

        const hasQuoted = Boolean(msg.message?.extendedTextMessage?.contextInfo?.quotedMessage);
        const buffer = await downloadMedia(sock, msg, mediaInfo, hasQuoted);

        const res = await removeBg(buffer);
        if (!res.success || !res.imageBuffer) {
          throw new Error(res.error || 'Gagal menghapus background dari gambar.');
        }

        const wantSticker = args[0] === 's' || args[0] === 'stiker' || args[0] === 'sticker';
        if (wantSticker) {
          const stikerBuf = await createSticker(res.imageBuffer, 'full');
          await sock.sendMessage(chatJid, { sticker: stikerBuf }, { quoted: msg });
        } else {
          await sock.sendMessage(chatJid, {
            image: res.imageBuffer,
            caption: success('Background Berhasil Dihapus', 'Objek berhasil dipisahkan dengan latar belakang transparan.\nKetik `/nobg s` jika ingin hasil stiker langsung.'),
          }, { quoted: msg });
        }
      } catch (err) {
        console.error('[nobg] Gagal:', err.message);
        await reply(error('Gagal Hapus Background', err.message || 'Layanan sedang sibuk. Silakan coba beberapa saat lagi.'));
      }
      return;
    }

    case 'hd':
    case 'upscale':
    case 'remini':
    case 'enhance': {
      try {
        const mediaInfo = getMediaMessage(msg);
        if (!mediaInfo || mediaInfo.type !== 'image') {
          await reply(usage('/hd', 'Kirim atau reply foto yang buram/pecah dengan caption `/hd` atau `/upscale` untuk memperjelas dan menaikkan resolusinya.'));
          return;
        }

        await reply(info('Meningkatkan Kualitas Foto...', 'AI Image Enhancer sedang memperjelas detail, menajamkan tepian, dan menaikkan resolusi foto...'));

        const hasQuoted = Boolean(msg.message?.extendedTextMessage?.contextInfo?.quotedMessage);
        const buffer = await downloadMedia(sock, msg, mediaInfo, hasQuoted);

        const result = await enhanceImageHd(buffer);

        const caption = [
          `✨ *[POLARIS AI IMAGE ENHANCER]*`,
          `──────────────────────────────`,
          `🔍 *Resolusi Asli:* ${result.origW} x ${result.origH} px`,
          `🚀 *Resolusi HD:* ${result.newW} x ${result.newH} px (${result.scale})`,
          `🎨 *Filter:* Adaptive Contrast & Edge Sharpening`,
          `⚡ *Status:* Sukses diperjelas dan jernih`,
          `──────────────────────────────`,
          `_Kirim foto buram lainnya kapan saja dengan /hd_`,
        ].join('\n');

        await sock.sendMessage(chatJid, {
          image: result.buffer,
          caption,
        }, { quoted: msg });
      } catch (err) {
        console.error('[hd] Gagal:', err.message);
        await reply(error('Gagal Memperjelas Foto', 'Terjadi kendala saat memproses gambar. Pastikan format gambar JPG/PNG valid.'));
      }
      return;
    }

    case 'toimg': {
      const tempDir = path.join(config.paths.tmpMedia, 'toimg');
      const tempInput = path.join(tempDir, `input_${Date.now()}.webp`);
      let tempOutput = null;

      try {
        const mediaInfo = getMediaMessage(msg);
        if (!mediaInfo || mediaInfo.type !== 'sticker') {
          await reply(usage('/toimg', 'Reply stiker yang ingin diubah menjadi gambar/video.'));
          return;
        }

        const hasQuoted = Boolean(msg.message?.extendedTextMessage?.contextInfo?.quotedMessage);
        const buffer = await downloadMedia(sock, msg, mediaInfo, hasQuoted);
        const isAnimated = mediaInfo.node.isAnimated || false;

        fs.mkdirSync(tempDir, { recursive: true });
        fs.writeFileSync(tempInput, buffer);
        tempOutput = path.join(tempDir, `output_${Date.now()}.${isAnimated ? 'mp4' : 'png'}`);

        if (isAnimated) {
          await execAsync(`ffmpeg -i "${tempInput}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${tempOutput}"`);
          const videoBuffer = fs.readFileSync(tempOutput);
          await sock.sendMessage(chatJid, { video: videoBuffer, caption: success('Stiker Dikonversi', 'Stiker berhasil diubah jadi video.'), gifPlayback: true }, { quoted: msg });
        } else {
          await execAsync(`ffmpeg -i "${tempInput}" "${tempOutput}"`);
          const imageBuffer = fs.readFileSync(tempOutput);
          await sock.sendMessage(chatJid, { image: imageBuffer, caption: success('Stiker Dikonversi', 'Stiker berhasil diubah jadi gambar.') }, { quoted: msg });
        }
      } catch (err) {
        console.error('[toimg] Gagal:', err.message);
        await reply(error('Gagal Konversi', 'Pastikan ffmpeg terpasang dengan benar.'));
      } finally {
        if (fs.existsSync(tempInput)) fs.unlink(tempInput, () => {});
        if (tempOutput && fs.existsSync(tempOutput)) fs.unlink(tempOutput, () => {});
      }
      return;
    }

    case 'tourl': {
      try {
        const mediaInfo = getMediaMessage(msg);
        if (!mediaInfo) {
          await reply(usage('/tourl', 'Reply gambar/video/stiker/dokumen untuk dijadikan link URL publik.'));
          return;
        }

        const hasQuoted = Boolean(msg.message?.extendedTextMessage?.contextInfo?.quotedMessage);
        const buffer = await downloadMedia(sock, msg, mediaInfo, hasQuoted);

        const sizeMB = buffer.length / (1024 * 1024);
        if (sizeMB > MAX_TOURL_SIZE_MB) {
          await reply(warning('File Terlalu Besar', `${sizeMB.toFixed(1)}MB, maksimal ${MAX_TOURL_SIZE_MB}MB.`));
          return;
        }

        const extMap = { image: 'jpg', video: 'mp4', sticker: 'webp', document: mediaInfo.node.fileName?.split('.').pop() || 'bin' };
        const ext = extMap[mediaInfo.type] || 'bin';
        const filename = `upload_${Date.now()}.${ext}`;

        const formData = new FormData();
        formData.append('reqtype', 'fileupload');
        formData.append('fileToUpload', new Blob([buffer]), filename);

        const res = await fetch(CATBOX_API, { method: 'POST', body: formData });
        const text = await res.text();

        if (!res.ok || !text.startsWith('http')) {
          throw new Error(`Response tidak valid: ${text.slice(0, 100)}`);
        }

        await reply(success('Upload Berhasil', `🔗 Tautan publik: ${text.trim()}`));
      } catch (err) {
        console.error('[tourl] Gagal:', err.message);
        await reply(error('Gagal Upload', 'Coba lagi nanti (layanan hosting sedang bermasalah).'));
      }
      return;
    }

    default:
      return;
  }
}

module.exports = { handleMediaCommand };
