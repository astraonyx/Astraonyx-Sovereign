// lib/outputVaultAutoDownloader.js — Auto-Detect Link & Auto-Download Khusus Grup Polaris Output
// HANYA aktif di grup "Polaris • Output & Artifact Vault".
// Di grup lain atau chat pribadi, pesan link diabaikan (harus menggunakan command manual /tiktok, /ig, dll).

const fs = require('fs');
const botEcosystemGroups = require('./botEcosystemGroups');
const downloaderService = require('../server/downloaderService');
const { downloaderHistoryQueries } = require('../server/db');
const { streamDownloadToTmp, deleteTmpFile } = require('./tmpManager');

/**
 * Memeriksa apakah obrolan adalah grup resmi Polaris Output & Artifact Vault
 */
function isOutputVaultGroup(chatJid, groupSubject = '') {
  if (!chatJid || !chatJid.includes('@g.us')) return false;

  const eco = botEcosystemGroups.getSavedData();
  const vaultJid = eco.groups?.vault?.jid;
  if (vaultJid && chatJid === vaultJid) return true;

  const sub = String(groupSubject || '').toLowerCase();
  if (sub.includes('output & artifact vault') || sub.includes('artifact vault') || sub.includes('polaris • output')) {
    return true;
  }
  return false;
}

/**
 * Mengekstrak tautan media yang didukung dari teks pesan
 */
function extractSupportedMediaUrls(text) {
  if (!text || typeof text !== 'string') return [];
  const urlRegex = /(https?:\/\/[^\s,]+)/gi;
  const matches = text.match(urlRegex) || [];
  const supported = [];

  for (const raw of matches) {
    const u = raw.trim().replace(/[.,;!]+$/, '');
    const p = downloaderService.detectPlatform(u);
    if (p && p !== 'general' && p !== 'unknown') {
      if (!supported.some((s) => s.url === u)) {
        supported.push({ url: u, platform: p });
      }
    }
  }
  return supported;
}

/**
 * Menangani deteksi tautan & auto-download jika berada di grup Polaris Output
 */
async function handleAutoDownload({ sock, msg, text, senderNumber, isGroup, chatJid, groupSubject }) {
  if (!isGroup || !isOutputVaultGroup(chatJid, groupSubject)) return false;
  if (!sock || !msg || !text || msg.key.fromMe) return false;

  const mediaItems = extractSupportedMediaUrls(text);
  if (mediaItems.length === 0) return false;

  // Batasi maksimal 3 URL per pesan agar tidak flooding
  const targets = mediaItems.slice(0, 3);

  // Pasang react ⏳ proses
  await sock.sendMessage(chatJid, { react: { text: '⏳', key: msg.key } }).catch(() => {});

  let successCount = 0;
  for (const item of targets) {
    try {
      const data = await downloaderService.analyzeUrl(item.url, 'auto');
      if (!data || !Array.isArray(data.downloads) || data.downloads.length === 0) continue;

      // Catat ke database SQLite riwayat terpadu
      try {
        downloaderHistoryQueries.add({
          ...data,
          source: 'bot_auto_detect',
          chatJid,
          senderNumber,
          url: item.url,
        });
      } catch (_) {}

      const serverName = data.usedServer?.name || data.usedServer?.id || 'Server 1 (Primary HD)';
      const caption = [
        `⚡ *[AUTO-DOWNLOAD • POLARIS OUTPUT]*`,
        `──────────────────────────────`,
        `🎬 *Judul*: ${data.title || 'Media'}`,
        data.author ? `👤 *Kreator*: ${data.author}` : null,
        `🌐 *Platform*: ${(data.platform || 'Media').toUpperCase()}`,
        `⚙️ *Server*: ${serverName}`,
        `👤 *Pengirim*: @${senderNumber}`,
        `──────────────────────────────`,
        `_File otomatis diekstrak & diarsipkan ke Polaris Output Vault._`,
      ].filter(Boolean).join('\n');

      const mentions = [`${senderNumber}@s.whatsapp.net`];
      const slides = Array.isArray(data.slides) ? data.slides : [];
      const imageSlides = slides.filter((s) => s.type === 'image');

      if (data.mediaType === 'gallery' || imageSlides.length > 1) {
        // Galeri Slide Foto
        const tempPaths = [];
        try {
          const toSend = imageSlides.slice(0, 10);
          for (let i = 0; i < toSend.length; i++) {
            const res = await streamDownloadToTmp(toSend[i].url, 'jpg', item.platform.id);
            tempPaths.push(res.path);
          }
          for (let i = 0; i < tempPaths.length; i++) {
            const buffer = fs.readFileSync(tempPaths[i]);
            await sock.sendMessage(chatJid, {
              image: buffer,
              caption: i === 0 ? caption : undefined,
              contextInfo: { mentionedJid: mentions },
            }, { quoted: msg });
          }
          successCount++;
        } finally {
          tempPaths.forEach(deleteTmpFile);
        }
      } else {
        // Video Tunggal / Audio
        const videoItem = data.downloads.find((d) => d.type === 'video') || data.downloads[0];
        const isVideo = videoItem.type === 'video' || videoItem.format === 'mp4';
        const isAudio = videoItem.type === 'audio' || videoItem.format === 'mp3';
        const ext = isVideo ? 'mp4' : isAudio ? 'mp3' : (videoItem.format || 'bin');

        const { path: tmpPath } = await streamDownloadToTmp(videoItem.url, ext, item.platform.id);
        try {
          const buffer = fs.readFileSync(tmpPath);
          if (isVideo) {
            await sock.sendMessage(chatJid, {
              video: buffer,
              caption,
              mimetype: 'video/mp4',
              contextInfo: { mentionedJid: mentions },
            }, { quoted: msg });
          } else if (isAudio) {
            await sock.sendMessage(chatJid, {
              audio: buffer,
              mimetype: 'audio/mp4',
              contextInfo: { mentionedJid: mentions },
            }, { quoted: msg });
            await sock.sendMessage(chatJid, { text: caption, contextInfo: { mentionedJid: mentions } });
          } else {
            await sock.sendMessage(chatJid, {
              document: buffer,
              fileName: `${videoItem.filename || 'media'}.${ext}`,
              caption,
              contextInfo: { mentionedJid: mentions },
            }, { quoted: msg });
          }
          successCount++;
        } finally {
          deleteTmpFile(tmpPath);
        }
      }
    } catch (err) {
      console.warn('[outputVaultAutoDownloader] Gagal memproses media:', item.url, err.message);
    }
  }

  if (successCount > 0) {
    await sock.sendMessage(chatJid, { react: { text: '✅', key: msg.key } }).catch(() => {});
    return true;
  } else {
    await sock.sendMessage(chatJid, { react: { text: '❌', key: msg.key } }).catch(() => {});
    return false;
  }
}

module.exports = {
  isOutputVaultGroup,
  extractSupportedMediaUrls,
  handleAutoDownload,
};
