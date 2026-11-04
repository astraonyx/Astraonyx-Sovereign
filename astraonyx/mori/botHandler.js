// astraonyx/mori/botHandler.js — Consolidated WhatsApp Downloader Command Engine
// Unifies WA Bot commands, Mori v4.3.3 Multi-Server Failover, and Mori Toolset.
// Architecture: streaming to tmp/downloader/ (low RAM footprint, safe up to 500MB).
// Reactions: ⏳ upon receipt, ✅/❌ upon completion.

const fs = require('fs');
const path = require('path');
const config = require('../../config');
const { streamDownloadToTmp, deleteTmpFile } = require('../../lib/tmpManager');
const { success, warning, error, usage, info } = require('../../lib/messageStyle');

// Scrapers & Toolboxes
const { isMediaFireUrl, isFolderUrl, scanMediaFireFolder, resolveDirectLink, formatBytes, createZipBuffer } = require('../../lib/mediafireScraper');
const { isTikTokUrl, scrapeTikTok } = require('../../lib/tiktokScraper');
const { isYouTubeUrl, scrapeYouTube } = require('../../lib/youtubeScraper');
const { isInstagramUrl, isFacebookUrl, scrapeInstagram, scrapeFacebook, scrapeViaSnapSave } = require('../../lib/instagramFacebookScraper');
const { isSpotifyUrl, scrapeSpotify } = require('../../lib/spotifyScraper');
const { isPinterestUrl, scrapePinterest } = require('../../lib/pinterestScraper');
const { isTeraboxUrl, scrapeTerabox } = require('../../lib/teraboxScraper');
const { isGoogleDriveUrl, scrapeGDrive } = require('../../lib/gdriveScraper');
const { isTwitterUrl, scrapeTwitter } = require('../../lib/twitterScraper');
const { removeBg } = require('../../lib/removeBgScraper');

// Unified Engine & Toolbox
const engine = require('./engine');
const toolbox = require('./toolbox');
const threeTierDownloader = engine;

function recordBotDownload(item) {
  try {
    const { downloaderHistoryQueries } = require('../../server/db');
    if (downloaderHistoryQueries && typeof downloaderHistoryQueries.add === 'function') {
      downloaderHistoryQueries.add({
        url: item.url,
        title: item.title || 'Media Download',
        platform: item.platform || 'universal',
        author: item.author || '',
        thumbnail: item.thumbnail || '',
        mediaType: item.mediaType || 'video',
        usedServer: item.usedServer || 'Bot Scraper',
        source: 'bot_cmd',
        chatJid: item.chatJid || '',
        senderNumber: item.senderNumber || '',
        downloads: item.downloads || [],
        slides: item.slides || [],
      });
    }
  } catch (_) {}
}

const MAX_FILE_SIZE_BYTES = (config.maxFileSizeMB || 500) * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 90 * 60 * 1000; // 90 menit buffer streaming

// In-memory cache hasil scan folder MediaFire per chat
const folderScanCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, val] of folderScanCache.entries()) {
    if (val.expiresAt < now) folderScanCache.delete(key);
  }
}

function parsePickList(text) {
  if (!text) return null;
  const cleaned = text.trim().toLowerCase();
  if (cleaned === 'all') return 'all';

  const parts = cleaned.replace(/,/g, ' ').split(/\s+/).filter(Boolean);
  const nums = [];
  for (const p of parts) {
    if (p === 'all') return 'all';
    if (p.includes('-')) {
      const [start, end] = p.split('-').map((n) => parseInt(n, 10));
      if (!Number.isNaN(start) && !Number.isNaN(end) && start <= end && start >= 1) {
        for (let i = start; i <= end; i++) nums.push(i);
        continue;
      }
    }
    const n = parseInt(p, 10);
    if (!Number.isNaN(n) && n >= 1) nums.push(n);
  }

  if (nums.length === 0) return null;
  return [...new Set(nums)].sort((a, b) => a - b);
}

const PLATFORM_HEADERS = {
  tiktok: {
    Referer: 'https://www.tiktok.com/',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
  },
  instagram: {
    Referer: 'https://www.instagram.com/',
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
  facebook: {
    Referer: 'https://www.facebook.com/',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
  },
  youtube: {
    Referer: 'https://ytmp3.mobi/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  },
  pinterest: {
    Referer: 'https://www.pinterest.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  },
  default: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  },
};

function getSameOriginHeaders(mediaUrl, platform) {
  const base = PLATFORM_HEADERS[platform] || PLATFORM_HEADERS.default;
  try {
    const origin = new URL(mediaUrl).origin;
    return { ...base, Referer: origin + '/' };
  } catch {
    return base;
  }
}

async function downloadToTmp(url, ext, platform, extraHeaders = {}, customCategory = null) {
  const category = customCategory || (platform === 'mediafire' ? 'mediafire' : 'downloader');

  const attempts = [
    { ...getSameOriginHeaders(url, platform), ...extraHeaders },
    { ...(PLATFORM_HEADERS[platform] || PLATFORM_HEADERS.default), ...extraHeaders },
    { 'User-Agent': PLATFORM_HEADERS.default['User-Agent'] },
  ];

  let lastErr;
  for (const headers of attempts) {
    try {
      return await streamDownloadToTmp(url, category, ext, {
        fetchOptions: { headers },
        timeoutMs: DOWNLOAD_TIMEOUT_MS,
      });
    } catch (err) {
      lastErr = err;
      const msg = (err.message || '').toLowerCase();
      if (!msg.includes('403') && !msg.includes('401') && !msg.includes('forbidden')) {
        throw err;
      }
    }
  }
  throw lastErr;
}

async function sendTmpFileAndCleanup(sock, chatJid, msg, tmpPath, options) {
  const { kind, filename, caption } = options;
  try {
    const stat = fs.statSync(tmpPath);
    if (stat.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File terlalu besar untuk dikirim lewat WhatsApp (${formatBytes(stat.size)}, maksimal ${config.maxFileSizeMB || 500}MB).`);
    }

    const buffer = fs.readFileSync(tmpPath);
    const content =
      kind === 'video' ? { video: buffer, fileName: filename, mimetype: 'video/mp4', caption } :
      kind === 'audio' ? { audio: buffer, mimetype: 'audio/mpeg', fileName: filename, ptt: false } :
      kind === 'image' ? { image: buffer, caption } :
      { document: buffer, fileName: filename || 'file', mimetype: 'application/octet-stream', caption };

    await sock.sendMessage(chatJid, content, { quoted: msg });
  } finally {
    deleteTmpFile(tmpPath);
  }
}

async function sendViaDirectUrl(sock, chatJid, msg, url, options) {
  const { kind, filename, caption } = options;
  const content =
    kind === 'video' ? { video: { url }, fileName: filename, mimetype: 'video/mp4', caption } :
    kind === 'audio' ? { audio: { url }, mimetype: 'audio/mpeg', fileName: filename, ptt: false } :
    kind === 'image' ? { image: { url }, caption } :
    { document: { url }, fileName: filename || 'file', mimetype: 'application/octet-stream', caption };

  await sock.sendMessage(chatJid, content, { quoted: msg });
}

function buildCaption({ title, author, sizeBytes, filename }) {
  if (title) {
    let cap = title;
    if (author) cap += `\n👤 ${author}`;
    return cap;
  }
  const parts = [];
  if (filename) parts.push(`📄 ${filename}`);
  if (sizeBytes) parts.push(`💾 ${formatBytes(sizeBytes)}`);
  return parts.join('\n') || null;
}

// ============================== MEDIAFIRE ==============================

function detectMediaKind(filename) {
  const ext = (path.extname(filename || '') || '').replace(/^\./, '').toLowerCase();
  if (['mp3', 'm4a', 'ogg', 'opus', 'wav', 'aac', 'flac', 'wma'].includes(ext)) return 'audio';
  if (['mp4', 'mkv', 'mov', 'avi', 'webm', 'flv', '3gp'].includes(ext)) return 'video';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext)) return 'image';
  return 'document';
}

async function downloadSingleMdfFile(sock, chatJid, msg, directUrl, filename, sizeBytes = null) {
  const kind = detectMediaKind(filename);
  const caption = buildCaption({ filename, sizeBytes });
  await sendViaDirectUrl(sock, chatJid, msg, directUrl, { kind, filename, caption });
}

async function downloadPicks(sock, chatJid, msg, cached, picks, reply) {
  const validPicks = picks.filter((n) => n >= 1 && n <= cached.files.length);
  if (validPicks.length === 0) {
    await reply(warning('Nomor Tidak Valid', `Folder ini memiliki ${cached.files.length} file.`));
    return;
  }

  if (validPicks.length === 1) {
    const file = cached.files[validPicks[0] - 1];
    if (file.status === 'restricted') {
      await reply(warning('File Dilindungi', `${file.name} memerlukan login/akun premium di MediaFire.`));
      return;
    }
    const resolved = await resolveDirectLink(file.quickKey);
    if (!resolved.success) {
      throw new Error(resolved.error || 'Gagal mengambil tautan unduhan MediaFire.');
    }
    const finalFilename = resolved.filename || file.name;
    await downloadSingleMdfFile(sock, chatJid, msg, resolved.directUrl, finalFilename, file.sizeBytes);
    return;
  }

  const zipEntries = [];
  const failed = [];
  let totalSize = 0;
  const tempPaths = [];

  try {
    for (const num of validPicks) {
      const file = cached.files[num - 1];
      try {
        if (file.status === 'restricted') {
          failed.push(`${file.name} (butuh login/premium)`);
          continue;
        }
        const resolved = await resolveDirectLink(file.quickKey);
        if (!resolved.success) {
          failed.push(`${file.name} (${resolved.error})`);
          continue;
        }
        const { path: tmpPath, size } = await downloadToTmp(resolved.directUrl, 'bin', 'mediafire');
        tempPaths.push(tmpPath);
        totalSize += size;
        if (totalSize > MAX_FILE_SIZE_BYTES) {
          failed.push(`${file.name} (total ZIP akan melebihi ${config.maxFileSizeMB || 500}MB, dihentikan)`);
          break;
        }
        zipEntries.push({ name: resolved.filename || file.name, data: fs.readFileSync(tmpPath) });
      } catch (err) {
        failed.push(`${file.name} (${err.message})`);
      }
    }

    if (zipEntries.length === 0) {
      throw new Error(`Semua file gagal diunduh:\n${failed.join('\n')}`);
    }

    const zipBuffer = createZipBuffer(zipEntries);
    const zipName = `mediafire-${Date.now()}.zip`;
    const caption = `📦 *MediaFire Batch ZIP*\n📁 Berisi ${zipEntries.length} file (${formatBytes(totalSize)})`;
    await sock.sendMessage(chatJid, { document: zipBuffer, fileName: zipName, mimetype: 'application/zip', caption }, { quoted: msg });

    if (failed.length > 0) {
      await reply(warning('Sebagian Gagal', `${zipEntries.length} file berhasil di-zip & dikirim.\n${failed.length} file gagal:\n${failed.join('\n')}`));
    }
  } finally {
    tempPaths.forEach(deleteTmpFile);
  }
}

async function handleMdf({ sock, chatJid, msg, args, reply, reactWith }) {
  const link = args[0];
  const remainingArgs = args.slice(1).join(' ').trim();

  if (!link || !isMediaFireUrl(link)) {
    await reply(usage(
      '/mdf <link file/folder> [all / nomor]',
      '• Unduh file langsung: `/mdf <link file>`\n• Pindai isi folder: `/mdf <link folder>`\n• Unduh SEMUA file folder jadi ZIP: `/mdf <link folder> all`\n• Unduh nomor tertentu: `/mdf <link folder> 1` atau `/mdf <link folder> 1,2,3`.'
    ));
    return;
  }

  cleanExpiredCache();

  if (isFolderUrl(link)) {
    const isAll = remainingArgs.toLowerCase() === 'all' || args[1]?.toLowerCase() === 'all';
    let picks = isAll ? 'all' : parsePickList(remainingArgs);

    if (picks) {
      await reactWith('⏳');
      try {
        let cached = folderScanCache.get(chatJid);
        if (!cached || cached.folderUrl !== link) {
          const scan = await scanMediaFireFolder(link);
          if (!scan.success) throw new Error(scan.error || 'Gagal memindai folder MediaFire.');
          cached = { files: scan.files, folderUrl: link, expiresAt: Date.now() + CACHE_TTL_MS };
          folderScanCache.set(chatJid, cached);
        }

        if (picks === 'all') {
          picks = cached.files.map((_, i) => i + 1);
        }

        await downloadPicks(sock, chatJid, msg, cached, picks, reply);
        await reactWith('✅');
      } catch (err) {
        console.error('[mdf] Gagal:', err.message);
        await reply(error('Gagal Unduh MediaFire', err.message));
        await reactWith('❌');
      }
      return;
    }

    const scan = await scanMediaFireFolder(link);
    if (!scan.success) {
      await reply(error('Gagal Scan Folder', scan.error));
      return;
    }

    folderScanCache.set(chatJid, { files: scan.files, folderUrl: link, expiresAt: Date.now() + CACHE_TTL_MS });

    let body = '';
    scan.files.forEach((f, i) => {
      const flag = f.status === 'restricted' ? ' 🔒' : '';
      body += `${i + 1}. ${f.name} (${formatBytes(f.sizeBytes)})${flag}\n`;
    });
    if (scan.subfolderCount > 0) {
      body += `\n(folder ini juga berisi ${scan.subfolderCount} subfolder)\n`;
    }
    const footer = `• Download 1 file: \`/mdf ${link} <nomor>\`\n• Download banyak jadi ZIP: \`/mdf ${link} 1,3,5\`\n• Download SEMUA: \`/mdf ${link} all\``;
    await reply(info(`Folder MediaFire (${scan.files.length} file)`, body.trim(), footer));
    return;
  }

  await reactWith('⏳');
  try {
    const resolved = await resolveDirectLink(link);
    if (!resolved.success) throw new Error(resolved.error);
    await downloadSingleMdfFile(sock, chatJid, msg, resolved.directUrl, resolved.filename);
    await reactWith('✅');
  } catch (err) {
    console.error('[mdf] Gagal:', err.message);
    await reply(error('Gagal Unduh MediaFire', err.message));
    await reactWith('❌');
  }
}

// ============================== TIKTOK ==============================

async function handleTiktok({ sock, chatJid, msg, args, reply, reactWith }) {
  const link = args[0];
  if (!link || !isTikTokUrl(link)) {
    await reply(usage('/tiktok <link>', 'Video atau slide foto TikTok.'));
    return;
  }

  await reactWith('⏳');
  try {
    let result = null;
    try {
      const native = await scrapeTikTok(link);
      if (native && native.success) result = native;
    } catch (_) {}

    // Fallover ke engine Mori jika native scraper gagal
    if (!result) {
      const analyzed = await engine.analyzeUrl(link, 'auto');
      result = {
        success: true,
        title: analyzed.title,
        author: analyzed.author,
        downloads: analyzed.downloads.map(d => ({
          type: d.type === 'image' ? 'PHOTO' : (d.quality.includes('1080') ? 'MP4_HD' : 'MP4_SD'),
          url: d.url,
        })),
      };
    }

    const videos = result.downloads.filter((d) => d.type.includes('MP4') || d.type === 'VIDEO');
    const photos = result.downloads.filter((d) => d.type === 'PHOTO');
    const caption = buildCaption({ title: result.title, author: result.author });

    if (photos.length > 0) {
      const tempPaths = [];
      try {
        for (const p of photos) {
          const { path: tmpPath } = await downloadToTmp(p.url, 'jpg', 'tiktok');
          tempPaths.push(tmpPath);
        }
        for (let i = 0; i < tempPaths.length; i++) {
          const buffer = fs.readFileSync(tempPaths[i]);
          await sock.sendMessage(chatJid, { image: buffer, caption: i === 0 ? caption : undefined }, { quoted: msg });
        }
      } finally {
        tempPaths.forEach(deleteTmpFile);
      }
    } else if (videos.length > 0) {
      const best = videos.find((v) => v.type.includes('HD')) || videos[0];
      const { path: tmpPath } = await downloadToTmp(best.url, 'mp4', 'tiktok');
      await sendTmpFileAndCleanup(sock, chatJid, msg, tmpPath, { kind: 'video', filename: 'tiktok.mp4', caption });
    } else {
      throw new Error('Tidak ada video/foto yang bisa diunduh dari link ini.');
    }

    recordBotDownload({
      url: link,
      title: result.title || 'TikTok Media',
      platform: 'tiktok',
      author: result.author || '',
      mediaType: photos.length > 0 ? 'gallery' : 'video',
      downloads: result.downloads || [],
      chatJid,
      senderNumber: (msg.key.participant || msg.key.remoteJid || '').replace(/[^0-9]/g, ''),
    });
    await reactWith('✅');
  } catch (err) {
    console.error('[tiktok] Gagal:', err.message);
    await reply(error('Gagal Download', err.message));
    await reactWith('❌');
  }
}

// ============================== YOUTUBE ==============================

async function handleYoutube({ sock, chatJid, msg, args, reply, mode, reactWith }) {
  const link = args[0];
  if (!link || !isYouTubeUrl(link)) {
    await reply(usage(`/${mode} <link YouTube>`));
    return;
  }

  await reactWith('⏳');
  try {
    let picked = null;
    let title = 'YouTube Media';

    try {
      const result = await scrapeYouTube(link);
      if (result && result.success) {
        title = result.title;
        const wantType = mode === 'ytmp3' ? 'MP3' : 'MP4';
        picked = result.downloads.find((d) => d.type.includes(wantType)) || result.downloads[0];
      }
    } catch (_) {}

    // Fallover ke engine Mori jika native gagal
    if (!picked) {
      const analyzed = await engine.analyzeUrl(link, 'auto');
      title = analyzed.title;
      const wantType = mode === 'ytmp3' ? 'audio' : 'video';
      const found = analyzed.downloads.find(d => d.type === wantType) || analyzed.downloads[0];
      if (found) picked = { url: found.url, type: found.type === 'audio' ? 'MP3' : 'MP4' };
    }

    if (!picked) throw new Error('Tidak ada link download yang cocok.');

    const isAudio = mode === 'ytmp3' || picked.type.includes('MP3');
    const kind = isAudio ? 'audio' : 'video';
    const ext = isAudio ? 'mp3' : 'mp4';
    const fileName = `${(title || 'youtube').slice(0, 60).replace(/[\\/:*?"<>|]/g, '_')}.${ext}`;
    const caption = kind === 'video' ? buildCaption({ title }) : undefined;

    const { path: tmpPath } = await downloadToTmp(picked.url, ext, 'youtube');
    await sendTmpFileAndCleanup(sock, chatJid, msg, tmpPath, { kind, filename: fileName, caption });

    recordBotDownload({
      url: link,
      title: title || 'YouTube Media',
      platform: 'youtube',
      mediaType: isAudio ? 'audio' : 'video',
      downloads: [picked],
      chatJid,
      senderNumber: (msg.key.participant || msg.key.remoteJid || '').replace(/[^0-9]/g, ''),
    });
    await reactWith('✅');
  } catch (err) {
    console.error(`[${mode}] Gagal:`, err.message);
    await reply(error('Gagal Download', err.message));
    await reactWith('❌');
  }
}

// ============================== INSTAGRAM / FACEBOOK ==============================

async function handleInstagramOrFacebook({ sock, chatJid, msg, args, reply, platform, reactWith }) {
  const link = args[0];
  const urlCheck = platform === 'instagram' ? isInstagramUrl : isFacebookUrl;
  const label = platform === 'instagram' ? 'Instagram' : 'Facebook';

  if (!link || !urlCheck(link)) {
    await reply(usage(`/${platform === 'instagram' ? 'ig' : 'facebook'} <link ${label}>`));
    return;
  }

  await reactWith('⏳');
  try {
    const scrapeFn = platform === 'instagram' ? scrapeInstagram : scrapeFacebook;
    let result = null;
    try {
      const res = await scrapeFn(link);
      if (res && res.success) result = res;
    } catch (_) {}

    // Fallover ke Mori engine jika scraper default gagal
    if (!result || !result.downloads || result.downloads.length === 0) {
      const analyzed = await engine.analyzeUrl(link, 'auto');
      result = {
        success: true,
        title: analyzed.title,
        downloads: analyzed.downloads.map(d => ({
          type: d.type === 'image' ? 'IMAGE' : 'VIDEO',
          url: d.url,
        })),
        sessionCookies: null,
      };
    }

    const caption = buildCaption({ title: result.title });
    const toSend = result.downloads.slice(0, 10);

    async function tryDownloadAndSend(items, sessionCookies) {
      let anySent = false;
      const extraHeaders = sessionCookies ? { Cookie: sessionCookies } : {};
      for (let i = 0; i < items.length; i++) {
        const d = items[i];
        const kind = d.type === 'IMAGE' ? 'image' : 'video';
        try {
          const res = await downloadToTmp(d.url, kind === 'image' ? 'jpg' : 'mp4', platform, extraHeaders);
          await sendTmpFileAndCleanup(sock, chatJid, msg, res.path, {
            kind, filename: `${platform}.${kind === 'image' ? 'jpg' : 'mp4'}`,
            caption: (!anySent) ? caption : undefined,
          });
          anySent = true;
        } catch (err) {
          console.error(`[${platform}] Gagal kirim salah satu media:`, err.message);
        }
      }
      return anySent;
    }

    let sentAny = await tryDownloadAndSend(toSend, result.sessionCookies);

    if (!sentAny && platform === 'instagram') {
      try {
        const fallback = await scrapeViaSnapSave(link.split('?')[0], 20000);
        if (fallback.success && fallback.downloads?.length) {
          sentAny = await tryDownloadAndSend(fallback.downloads.slice(0, 10), fallback.sessionCookies);
        }
      } catch (err) {
        console.error('[instagram] Fallback snapsave.app juga gagal:', err.message);
      }
    }

    if (!sentAny) throw new Error('Semua media gagal diunduh.');

    recordBotDownload({
      url: link,
      title: result.title || `${label} Media`,
      platform,
      mediaType: 'video',
      downloads: result.downloads || [],
      chatJid,
      senderNumber: (msg.key.participant || msg.key.remoteJid || '').replace(/[^0-9]/g, ''),
    });
    await reactWith('✅');
  } catch (err) {
    console.error(`[${platform}] Gagal:`, err.message);
    await reply(error(`Gagal Download ${label}`, err.message));
    await reactWith('❌');
  }
}

// ============================== SPOTIFY ==============================

async function handleSpotify({ sock, chatJid, msg, args, reply, reactWith }) {
  const link = args[0];
  if (!link || !isSpotifyUrl(link)) {
    await reply(usage('/spotify <link lagu Spotify>'));
    return;
  }

  await reactWith('⏳');
  try {
    let result = null;
    try {
      const res = await scrapeSpotify(link);
      if (res && res.success) result = res;
    } catch (_) {}

    if (!result) {
      const analyzed = await engine.analyzeUrl(link, 'auto');
      const dl = analyzed.downloads.find(d => d.type === 'audio') || analyzed.downloads[0];
      if (dl) {
        result = {
          success: true,
          title: analyzed.title,
          artist: analyzed.author,
          audioUrl: dl.url,
        };
      }
    }

    if (!result || !result.audioUrl) throw new Error('Gagal mengambil audio Spotify.');

    const fileName = `${(result.title || 'spotify').slice(0, 60).replace(/[\\/:*?"<>|]/g, '_')}.mp3`;
    await sendViaDirectUrl(sock, chatJid, msg, result.audioUrl, { kind: 'audio', filename: fileName });
    recordBotDownload({
      url: link,
      title: `${result.title || 'Spotify Track'} - ${result.artist || ''}`,
      platform: 'spotify',
      author: result.artist || '',
      mediaType: 'audio',
      downloads: [{ url: result.audioUrl, format: 'mp3', quality: '320kbps' }],
      chatJid,
      senderNumber: (msg.key.participant || msg.key.remoteJid || '').replace(/[^0-9]/g, ''),
    });
    await reactWith('✅');
  } catch (err) {
    console.error('[spotify] Gagal:', err.message);
    await reply(error('Gagal Download', err.message));
    await reactWith('❌');
  }
}

// ============================== PINTEREST ==============================

async function handlePinterest({ sock, chatJid, msg, args, reply, reactWith }) {
  const link = args[0];
  if (!link || !isPinterestUrl(link)) {
    await reply(usage('/pinterest <link pin>'));
    return;
  }

  await reactWith('⏳');
  try {
    let result = null;
    try {
      const res = await scrapePinterest(link);
      if (res && res.success) result = res;
    } catch (_) {}

    if (!result || !result.downloads || result.downloads.length === 0) {
      const analyzed = await engine.analyzeUrl(link, 'auto');
      result = {
        success: true,
        downloads: analyzed.downloads.map(d => ({
          type: d.type === 'video' ? 'VIDEO' : 'IMAGE',
          url: d.url,
        })),
      };
    }

    const toSend = result.downloads.slice(0, 5);
    let sentAny = false;

    for (const d of toSend) {
      const kind = d.type === 'VIDEO' ? 'video' : 'image';
      try {
        const { path: tmpPath, size } = await downloadToTmp(d.url, kind === 'image' ? 'jpg' : 'mp4', 'pinterest');
        const caption = buildCaption({ filename: `pinterest.${kind === 'image' ? 'jpg' : 'mp4'}`, sizeBytes: size });
        await sendTmpFileAndCleanup(sock, chatJid, msg, tmpPath, { kind, filename: `pinterest.${kind === 'image' ? 'jpg' : 'mp4'}`, caption });
        sentAny = true;
      } catch (err) {
        console.error('[pinterest] Gagal kirim salah satu media:', err.message);
      }
    }

    if (!sentAny) throw new Error('Semua media gagal diunduh.');
    await reactWith('✅');
  } catch (err) {
    console.error('[pinterest] Gagal:', err.message);
    await reply(error('Gagal Download', err.message));
    await reactWith('❌');
  }
}

// ============================== TWITTER/X ==============================

async function handleTwitter({ sock, chatJid, msg, args, reply, reactWith }) {
  const link = args[0];
  if (!link || !isTwitterUrl(link)) {
    await reply(usage('/twitter <link tweet>'));
    return;
  }

  await reactWith('⏳');
  try {
    let result = null;
    try {
      const res = await scrapeTwitter(link);
      if (res && res.success) result = res;
    } catch (_) {}

    if (!result || !result.downloads || result.downloads.length === 0) {
      const analyzed = await engine.analyzeUrl(link, 'auto');
      result = {
        success: true,
        title: analyzed.title,
        downloads: analyzed.downloads.map(d => ({
          type: d.type === 'image' ? 'IMAGE' : 'VIDEO',
          url: d.url,
        })),
      };
    }

    const caption = buildCaption({ title: result.title });
    const toSend = result.downloads.slice(0, 5);
    let sentAny = false;

    for (let i = 0; i < toSend.length; i++) {
      const d = toSend[i];
      const kind = d.type === 'IMAGE' ? 'image' : 'video';
      try {
        const { path: tmpPath } = await downloadToTmp(d.url, kind === 'image' ? 'jpg' : 'mp4', 'default');
        await sendTmpFileAndCleanup(sock, chatJid, msg, tmpPath, {
          kind, filename: `twitter.${kind === 'image' ? 'jpg' : 'mp4'}`,
          caption: i === 0 ? caption : undefined,
        });
        sentAny = true;
      } catch (err) {
        console.error('[twitter] Gagal kirim salah satu media:', err.message);
      }
    }

    if (!sentAny) throw new Error('Semua media gagal diunduh.');
    recordBotDownload({
      url: link,
      title: result.title || 'Twitter/X Media',
      platform: 'twitter',
      mediaType: 'video',
      downloads: result.downloads || [],
      chatJid,
      senderNumber: (msg.key.participant || msg.key.remoteJid || '').replace(/[^0-9]/g, ''),
    });
    await reactWith('✅');
  } catch (err) {
    console.error('[twitter] Gagal:', err.message);
    await reply(error('Gagal Download', err.message));
    await reactWith('❌');
  }
}

// ============================== TERABOX ==============================

async function handleTerabox({ sock, chatJid, msg, args, reply, reactWith }) {
  const link = args[0];
  if (!link || !isTeraboxUrl(link)) {
    await reply(usage('/terabox <link>'));
    return;
  }

  await reactWith('⏳');
  try {
    const result = await scrapeTerabox(link);
    if (!result.success) throw new Error(result.error);

    const caption = buildCaption({ filename: result.filename });
    await sendViaDirectUrl(sock, chatJid, msg, result.downloadUrl, { kind: 'document', filename: result.filename, caption });
    await reactWith('✅');
  } catch (err) {
    console.error('[terabox] Gagal:', err.message);
    await reply(error('Gagal Download', err.message));
    await reactWith('❌');
  }
}

// ============================== GOOGLE DRIVE ==============================

async function handleGdrive({ sock, chatJid, msg, args, reply, reactWith }) {
  const link = args[0];
  if (!link || !isGoogleDriveUrl(link)) {
    await reply(usage('/gdrive <link>', 'File harus dibagikan publik: "Anyone with the link".'));
    return;
  }

  await reactWith('⏳');
  try {
    const result = await scrapeGDrive(link);
    if (!result.success) throw new Error(result.error);

    const caption = buildCaption({ filename: result.filename, sizeBytes: result.sizeBytes });
    await sendViaDirectUrl(sock, chatJid, msg, result.downloadUrl, { kind: 'document', filename: result.filename, caption });
    await reactWith('✅');
  } catch (err) {
    console.error('[gdrive] Gagal:', err.message);
    await reply(error('Gagal Download', err.message));
    await reactWith('❌');
  }
}

// ============================== REMOVEBG ==============================

async function handleRemoveBg({ sock, chatJid, msg, reply, reactWith }) {
  const mediaMsg = msg.message?.imageMessage || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
  if (!mediaMsg) {
    await reply(usage('/removebg', 'Reply gambar.'));
    return;
  }

  await reactWith('⏳');
  try {
    const { downloadMediaMessage } = require('baileys');
    const hasQuoted = Boolean(msg.message?.extendedTextMessage?.contextInfo?.quotedMessage);
    let buffer;
    if (hasQuoted) {
      const quotedKey = msg.message.extendedTextMessage.contextInfo;
      const fakeMsg = { key: { remoteJid: msg.key.remoteJid, id: quotedKey.stanzaId, participant: quotedKey.participant }, message: quotedKey.quotedMessage };
      buffer = await downloadMediaMessage(fakeMsg, 'buffer', {});
    } else {
      buffer = await downloadMediaMessage(msg, 'buffer', {});
    }

    const result = await removeBg(buffer);
    if (!result.success) throw new Error(result.error);

    await sock.sendMessage(chatJid, { image: result.imageBuffer, caption: success('Background Dihapus', '✅ Berhasil.') }, { quoted: msg });
    await reactWith('✅');
  } catch (err) {
    console.error('[removebg] Gagal:', err.message);
    await reply(error('Gagal Download', err.message));
    await reactWith('❌');
  }
}

// ============================== OMNIGET & COURSE ==============================

async function handleMoriOrCourse({ sock, chatJid, msg, args, reply, reactWith }) {
  const link = args.join(' ').trim();
  if (!link) {
    await reply(usage('/course <link-udemy/hotmart/coursera/playlist>', 'Contoh: /course https://www.udemy.com/course/sample/'));
    return;
  }
  await reactWith('⏳');
  try {
    const data = await toolbox.parseCourseUrl(link);
    let text = `⚡ *Mori Course Studio*\n\n`;
    text += `📚 *Judul:* ${data.title}\n`;
    text += `👤 *Instruktur:* ${data.instructor}\n`;
    text += `⏱️ *Durasi:* ${data.totalDuration} (${data.totalLectures} Materi, ${data.totalModules} Modul)\n\n`;
    text += `📑 *Silabus / Modul:*\n`;
    (data.curriculum || []).slice(0, 3).forEach((sec) => {
      text += `• *${sec.section}* (${sec.lecturesCount} materi)\n`;
      (sec.items || []).slice(0, 3).forEach((it) => {
        text += `   - ${it.title} (${it.duration || it.type})\n`;
      });
    });
    text += `\n💡 Akses penuh & unduhan batch tersedia di Dashboard Polaris Downloader Hub!`;
    await reply(text);
    await reactWith('✅');
  } catch (err) {
    await reply(error('Gagal Ekstrak Kursus', err.message));
    await reactWith('❌');
  }
}

async function handleMagnetTorrent({ sock, chatJid, msg, args, reply, reactWith }) {
  const uri = args.join(' ').trim();
  if (!uri || !uri.startsWith('magnet:?')) {
    await reply(usage('/torrent <magnet-link>', 'Contoh: /torrent magnet:?xt=urn:btih:...'));
    return;
  }
  await reactWith('⏳');
  try {
    const mag = toolbox.parseMagnetUri(uri);
    let text = `🧲 *Mori BitTorrent Inspector*\n\n`;
    text += `📦 *Nama Berkas:* ${mag.name}\n`;
    text += `🔑 *InfoHash:* \`${mag.infoHash}\`\n`;
    text += `📂 *Kategori:* ${mag.category.toUpperCase()}\n`;
    text += `📊 *Ukuran Estimasi:* ${mag.formattedSize}\n`;
    text += `🌐 *Kesehatan Swarm:* ${mag.health} (${mag.trackersCount} Active Trackers)\n\n`;
    text += `💡 Tautan magnet terverifikasi siap diunduh lewat Debrid/Web Torrent di Dashboard!`;
    await reply(text);
    await reactWith('✅');
  } catch (err) {
    await reply(error('Magnet Tidak Valid', err.message));
    await reactWith('❌');
  }
}

// ============================== UNIFIED DOWNLOADER (/download, /dl, /down, /d) ==============================

function extractFirstUrl(text) {
  if (!text) return null;
  const match = text.match(/(https?:\/\/[^\s]+|magnet:\?[^\s]+)/i);
  return match ? match[0] : null;
}

async function handleUnifiedDownload({ sock, chatJid, msg, args, reply, reactWith }) {
  // 1. Ambil URL dari args atau dari teks pesan yang di-reply/dikutip
  let link = args[0] ? args[0].trim() : '';
  if (!link || (!link.startsWith('http') && !link.startsWith('magnet:?'))) {
    const fromArgs = extractFirstUrl(args.join(' '));
    if (fromArgs) {
      link = fromArgs;
    } else {
      const contextInfo = msg?.message?.extendedTextMessage?.contextInfo;
      const quotedText = contextInfo?.quotedMessage?.conversation ||
                         contextInfo?.quotedMessage?.extendedTextMessage?.text || '';
      const fromQuoted = extractFirstUrl(quotedText);
      if (fromQuoted) {
        link = fromQuoted;
      }
    }
  }

  if (!link) {
    await reply(usage(
      '/download <link> atau /dl <link>',
      '⚡ *Unified Mori Media Downloader v5.0*\n\n' +
      'Sistem otomatis mendeteksi platform dan format terbaik:\n' +
      '• *Sosmed:* TikTok (No-WM & Slide), Instagram (Reels & Post), Facebook, Twitter/X, Pinterest, Threads\n' +
      '• *Video/Streaming:* YouTube (MP4 & MP3), Douyin, RedNote (XHS), Bilibili, CapCut\n' +
      '• *Audio:* Spotify (Lagu/Album), SoundCloud, Apple Music\n' +
      '• *Cloud/File:* MediaFire (File & Folder ZIP), Google Drive, Terabox\n' +
      '• *Khusus:* Mori Courses & Magnet/Torrent Swarm\n\n' +
      '💡 _Contoh:_ `/download https://vt.tiktok.com/ZS...` atau `/dl https://youtu.be/...`'
    ));
    return;
  }

  // 2. Deteksi Platform
  const platform = engine.detectPlatform(link);

  // Jika MediaFire folder, delegasikan ke handleMdf untuk scan & download
  if (platform === 'mediafire' && isFolderUrl(link)) {
    return await handleMdf({ sock, chatJid, msg, args: [link, ...args.slice(1)], reply, reactWith });
  }

  // Jika Magnet/Torrent URI
  if (platform === 'magnet' || link.startsWith('magnet:?')) {
    return await handleMagnetTorrent({ sock, chatJid, msg, args: [link], reply, reactWith });
  }

  await reactWith('⏳');

  try {
    // 3. Eksekusi 3-Layer Cascading Fallback (Layer 1 Utama -> Layer 2 Mori Backup -> Layer 3 Mori & Cloud)
    let analyzed = null;
    let analyzeErr = null;

    try {
      analyzed = await threeTierDownloader.analyzeThreeTier(link, 'auto');
    } catch (err) {
      analyzeErr = err;
    }

    // 4. Jika sukses mendapatkan media
    if (analyzed && analyzed.success && ((analyzed.downloads && analyzed.downloads.length > 0) || (analyzed.slides && analyzed.slides.length > 0))) {
      const layerBadge = analyzed.layerName || `Layer ${analyzed.layerUsed || 1}`;

      // Cek apakah berupa slide / galeri foto
      if (analyzed.mediaType === 'gallery' || (analyzed.slides && analyzed.slides.length > 0 && (!analyzed.downloads || analyzed.downloads.every(d => d.type === 'image')))) {
        const slides = analyzed.slides || [];
        const caption =
          `⚡ *Status:* Berhasil via ${layerBadge}\n` +
          `📌 *Judul:* ${analyzed.title || 'Slide Album'}\n` +
          (analyzed.author ? `👤 *Author:* ${analyzed.author}\n` : '') +
          `🖼️ *Total Slide:* ${slides.length} foto\n\n` +
          `✨ _Ekosistem Polaris Ataraxia • 3-Layer Engine_`;
        const maxSlides = Math.min(slides.length, 10);

        for (let i = 0; i < maxSlides; i++) {
          const item = slides[i];
          const slideCap = i === 0 ? caption : null;
          try {
            const tmp = await downloadToTmp(item.url, 'jpg', platform);
            await sendTmpFileAndCleanup(sock, chatJid, msg, tmp, {
              kind: 'image',
              caption: slideCap,
            });
          } catch (e) {
            console.error(`[unified:slide:${i}] Gagal download slide:`, e.message);
          }
        }

        recordBotDownload({
          url: link,
          title: analyzed.title,
          platform: analyzed.platform || platform,
          author: analyzed.author,
          mediaType: 'gallery',
          usedServer: layerBadge,
          chatJid,
          senderNumber: msg?.key?.participant || msg?.key?.remoteJid || '',
        });

        await reactWith('✅');
        return;
      }

      // Prioritas download: Video HD -> Video -> Audio MP3 -> Document
      const dls = analyzed.downloads || [];
      const bestVideo = dls.find(d => d.type === 'video' && (d.quality?.includes('1080') || d.label?.includes('HD') || d.label?.includes('Tanpa Watermark'))) ||
                        dls.find(d => d.type === 'video');
      const bestAudio = dls.find(d => d.type === 'audio');
      const bestDoc = dls.find(d => d.type === 'document' || d.type === 'archive') || dls[0];

      const chosen = bestVideo || bestAudio || bestDoc;

      if (!chosen || !chosen.url) {
        throw new Error('Tidak ada tautan unduhan valid yang ditemukan.');
      }

      const mediaKind = chosen.type === 'audio' ? 'audio' :
                        chosen.type === 'image' ? 'image' :
                        chosen.type === 'video' ? 'video' : 'document';
      const ext = chosen.ext || chosen.format || (mediaKind === 'video' ? 'mp4' : mediaKind === 'audio' ? 'mp3' : 'bin');
      const caption =
        `⚡ *Status:* Berhasil via ${layerBadge}\n` +
        `📌 *Judul:* ${analyzed.title || 'Media Download'}\n` +
        (analyzed.author ? `👤 *Author:* ${analyzed.author}\n` : '') +
        (analyzed.platform ? `🌐 *Platform:* ${analyzed.platform.toUpperCase()}\n` : '') +
        (analyzed.size ? `📦 *Ukuran:* ${analyzed.size}\n` : '') +
        `\n✨ _Ekosistem Polaris Ataraxia • 3-Layer Engine_`;

      const tmpPath = await downloadToTmp(chosen.url, ext, platform);
      await sendTmpFileAndCleanup(sock, chatJid, msg, tmpPath, {
        kind: mediaKind,
        filename: chosen.filename || `${platform}_media.${ext}`,
        caption,
      });

      recordBotDownload({
        url: link,
        title: analyzed.title,
        platform: analyzed.platform || platform,
        author: analyzed.author,
        mediaType: mediaKind,
        usedServer: layerBadge,
        chatJid,
        senderNumber: msg?.key?.participant || msg?.key?.remoteJid || '',
      });

      await reactWith('✅');
      return;
    }

    if (analyzed && !analyzed.success && analyzed.errorReport) {
      await reactWith('❌');
      await reply(analyzed.errorReport);
      return;
    }

    // 5. Fallback ke Scraper Spesifik Lama jika Mori generic tidak mengembalikan download
    if (isTikTokUrl(link)) {
      return await handleTiktok({ sock, chatJid, msg, args: [link], reply, reactWith });
    }
    if (isInstagramUrl(link) || isFacebookUrl(link)) {
      return await handleInstagramOrFacebook({ sock, chatJid, msg, args: [link], reply, platform: isInstagramUrl(link) ? 'instagram' : 'facebook', reactWith });
    }
    if (isYouTubeUrl(link)) {
      return await handleYoutube({ sock, chatJid, msg, args: [link], reply, mode: 'ytmp4', reactWith });
    }
    if (isSpotifyUrl(link)) {
      return await handleSpotify({ sock, chatJid, msg, args: [link], reply, reactWith });
    }
    if (isPinterestUrl(link)) {
      return await handlePinterest({ sock, chatJid, msg, args: [link], reply, reactWith });
    }
    if (isTwitterUrl(link)) {
      return await handleTwitter({ sock, chatJid, msg, args: [link], reply, reactWith });
    }
    if (isMediaFireUrl(link)) {
      return await handleMdf({ sock, chatJid, msg, args: [link], reply, reactWith });
    }
    if (isGoogleDriveUrl(link)) {
      return await handleGdrive({ sock, chatJid, msg, args: [link], reply, reactWith });
    }
    if (isTeraboxUrl(link)) {
      return await handleTerabox({ sock, chatJid, msg, args: [link], reply, reactWith });
    }

    throw new Error(analyzeErr?.message || 'Format tautan atau platform belum didukung.');
  } catch (err) {
    console.error('[unifiedDownload] Gagal:', err.message);
    await reply(error('Gagal Mengunduh Media', `${err.message}\n\nPastikan link bersifat publik, tidak diprivat, dan akun tidak dikunci.`));
    await reactWith('❌');
  }
}

// ============================== ROUTER ==============================

async function handleDownloaderCommand({ sock, chatJid, msg, command, args, reply, reactWith: reactWithSock }) {
  const reactWith = (emoji) => reactWithSock(sock, chatJid, msg, emoji);

  try {
    switch (command) {
      case 'download':
      case 'dwnld':
      case 'dl':
      case 'down':
      case 'd':
      case 'downloader':
        return await handleUnifiedDownload({ sock, chatJid, msg, args, reply, reactWith });
      case 'mdf':
        return await handleMdf({ sock, chatJid, msg, args, reply, reactWith });
      case 'tiktok':
      case 'tiktokslide':
        return await handleTiktok({ sock, chatJid, msg, args, reply, reactWith });
      case 'ytmp3':
      case 'ytmp4':
        return await handleYoutube({ sock, chatJid, msg, args, reply, mode: command, reactWith });
      case 'ig':
      case 'instagram':
        return await handleInstagramOrFacebook({ sock, chatJid, msg, args, reply, platform: 'instagram', reactWith });
      case 'facebook':
      case 'fb':
        return await handleInstagramOrFacebook({ sock, chatJid, msg, args, reply, platform: 'facebook', reactWith });
      case 'spotify':
        return await handleSpotify({ sock, chatJid, msg, args, reply, reactWith });
      case 'pinterest':
        return await handlePinterest({ sock, chatJid, msg, args, reply, reactWith });
      case 'twitter':
      case 'twittervid':
        return await handleTwitter({ sock, chatJid, msg, args, reply, reactWith });
      case 'terabox':
        return await handleTerabox({ sock, chatJid, msg, args, reply, reactWith });
      case 'gdrive':
        return await handleGdrive({ sock, chatJid, msg, args, reply, reactWith });
      case 'removebg':
        return await handleRemoveBg({ sock, chatJid, msg, reply, reactWith });
      case 'course':
      case 'mori':
        return await handleMoriOrCourse({ sock, chatJid, msg, args, reply, reactWith });
      case 'torrent':
      case 'magnet':
        return await handleMagnetTorrent({ sock, chatJid, msg, args, reply, reactWith });
      default:
        return;
    }
  } catch (err) {
    console.error(`[downloader:${command}] Error tak terduga:`, err.message);
    await reply(error('Terjadi Kesalahan', 'Gagal memproses. Coba lagi nanti.'));
  }
}

module.exports = {
  handleDownloaderCommand,
  handleUnifiedDownload,
  handleMdf,
  handleTiktok,
  handleYoutube,
  handleInstagramOrFacebook,
  handleSpotify,
  handlePinterest,
  handleTwitter,
  handleTerabox,
  handleGdrive,
  handleRemoveBg,
  handleMoriOrCourse,
  handleMagnetTorrent,
};
