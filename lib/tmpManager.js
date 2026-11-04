// lib/tmpManager.js — Kelola folder sementara: tmp/media/ (dari WA, tanpa
// limit jumlah) dan tmp/downloader/ (dari luar/internet, limit jumlah file).
//
// Kenapa dipisah: sticker/toimg/tourl mengolah media yang user KIRIM lewat
// WA sendiri (biasanya kecil, auto-hapus langsung setelah selesai proses,
// jarang numpuk). Downloader mengambil file dari luar (bisa besar sampai
// ratusan MB, dan user bisa saja memanggil banyak sekaligus) — makanya
// downloader punya limit jumlah file yang wajib dibersihkan berkala.

const fs = require('fs');
const path = require('path');
const config = require('../config');

const CATEGORY_PATHS = {
  media: config.paths.tmpMedia,
  downloader: config.paths.tmpDownloader,
  antidelete: path.join(config.paths.tmpMedia, 'antidelete'),
  mediafire: path.join(config.paths.tmpDownloader, 'mediafire'),
  sticker: path.join(config.paths.tmpMedia, 'sticker'),
  toimg: path.join(config.paths.tmpMedia, 'toimg'),
  vault: path.join(config.paths.tmpMedia, 'vault'),
  audio: path.join(config.paths.tmpDownloader, 'audio'),
};

const ALLOWED_MEDIA_EXTS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg',
  'mp4', 'mkv', 'mov', 'avi', 'webm', 'flv', '3gp',
  'mp3', 'm4a', 'ogg', 'opus', 'wav', 'aac', 'flac', 'wma',
  'pdf', 'zip', 'rar', '7z', 'apk', 'tar', 'gz'
]);

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

function getMediaType(ext) {
  const e = String(ext || '').toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(e)) return 'image';
  if (['mp4', 'mkv', 'mov', 'avi', 'webm', 'flv', '3gp'].includes(e)) return 'video';
  if (['mp3', 'm4a', 'ogg', 'opus', 'wav', 'aac', 'flac', 'wma'].includes(e)) return 'audio';
  return 'document';
}

function ensureDir(category) {
  const dir = CATEGORY_PATHS[category] || path.join(config.paths.tmp, category);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Rekursif: cari file di folder tertentu
function listTmpFilesRecursive(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let results = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(listTmpFilesRecursive(fullPath));
    } else if (entry.isFile()) {
      try {
        const stat = fs.statSync(fullPath);
        results.push({ path: fullPath, size: stat.size, mtimeMs: stat.mtimeMs });
      } catch { /* file mungkin sudah terhapus proses lain */ }
    }
  }
  return results;
}

function listTmpFiles(category) {
  const dir = ensureDir(category);
  return listTmpFilesRecursive(dir);
}

function getTmpFileCount(category) {
  return listTmpFiles(category).length;
}

function getTmpTotalSize(category) {
  return listTmpFiles(category).reduce((sum, f) => sum + f.size, 0);
}

function detectCategoryFromPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  if (normalized.includes('/antidelete/') || normalized.endsWith('/antidelete')) return 'antidelete';
  if (normalized.includes('/mediafire/') || normalized.endsWith('/mediafire')) return 'mediafire';
  if (normalized.includes('/sticker/') || normalized.endsWith('/sticker')) return 'sticker';
  if (normalized.includes('/toimg/') || normalized.endsWith('/toimg')) return 'toimg';
  if (normalized.includes('/vault/') || normalized.endsWith('/vault')) return 'vault';
  if (normalized.includes('/audio/') || normalized.endsWith('/audio')) return 'audio';
  if (normalized.includes('/downloader/')) return 'downloader';
  if (normalized.includes('/media/')) return 'media';
  return 'downloader';
}

// Memindai seluruh media files hasil unduhan/WA (mengecualikan file sistem/json/txt/tmp)
function listAllMediaFiles(filterCategory = 'all') {
  const baseDirs = [
    { cat: 'media', dir: config.paths.tmpMedia },
    { cat: 'downloader', dir: config.paths.tmpDownloader },
  ];

  const results = [];
  const seenPaths = new Set();

  for (const item of baseDirs) {
    if (!fs.existsSync(item.dir)) continue;
    const files = listTmpFilesRecursive(item.dir);
    for (const f of files) {
      if (seenPaths.has(f.path)) continue;
      seenPaths.add(f.path);

      const ext = path.extname(f.path).replace(/^\./, '').toLowerCase();
      // Filter ketat: HANYA ekstensi media nyata yang diakomodasi
      if (!ALLOWED_MEDIA_EXTS.has(ext)) continue;

      const cat = detectCategoryFromPath(f.path);
      if (filterCategory && filterCategory !== 'all' && cat !== filterCategory) {
        continue;
      }

      const filename = path.basename(f.path);
      const mediaType = getMediaType(ext);
      const relPath = path.relative(path.resolve(__dirname, '..'), f.path).replace(/\\/g, '/');

      results.push({
        id: Buffer.from(relPath).toString('base64'),
        filename,
        relativePath: relPath,
        fullPath: f.path,
        category: cat,
        ext,
        mediaType,
        size: f.size,
        formattedSize: formatBytes(f.size),
        modifiedAt: f.mtimeMs,
        modifiedAtStr: new Date(f.mtimeMs).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
      });
    }
  }

  // Urutkan dari yang paling baru
  results.sort((a, b) => b.modifiedAt - a.modifiedAt);
  return results;
}

// Mengambil statistik media terpisah per kategori
function getStorageStats() {
  const allMedia = listAllMediaFiles('all');
  const catMap = {
    antidelete: { name: 'Anti-Delete', count: 0, size: 0, icon: '🗑️' },
    downloader: { name: 'Downloader', count: 0, size: 0, icon: '📥' },
    mediafire: { name: 'MediaFire', count: 0, size: 0, icon: '🔥' },
    sticker: { name: 'Sticker', count: 0, size: 0, icon: '🎨' },
    toimg: { name: 'To-Image', count: 0, size: 0, icon: '🖼️' },
    vault: { name: 'Output Vault', count: 0, size: 0, icon: '🏛️' },
    audio: { name: 'Audio / Voice', count: 0, size: 0, icon: '🎵' },
  };

  let totalSize = 0;
  for (const m of allMedia) {
    totalSize += m.size;
    if (!catMap[m.category]) {
      catMap[m.category] = { name: m.category, count: 0, size: 0, icon: '📁' };
    }
    catMap[m.category].count++;
    catMap[m.category].size += m.size;
  }

  const categories = {};
  for (const [k, v] of Object.entries(catMap)) {
    categories[k] = {
      ...v,
      formattedSize: formatBytes(v.size),
    };
  }

  return {
    totalFiles: allMedia.length,
    totalBytes: totalSize,
    formattedTotalSize: formatBytes(totalSize),
    categories,
  };
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 10);
}

function makeTmpPath(category, ext) {
  const dir = ensureDir(category);
  const safeExt = (ext || 'bin').replace(/[^a-z0-9]/gi, '') || 'bin';
  const fileName = `${Date.now()}-${randomSuffix()}.${safeExt}`;
  return path.join(dir, fileName);
}

// Streaming download: fetch response di-pipe langsung ke file di disk
async function streamDownloadToTmp(url, category, ext, options = {}) {
  const { fetchOptions = {}, timeoutMs = 30 * 60 * 1000, onProgress = null } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
  };
  if (url.includes('cdninstagram.com') || url.includes('instagram.com') || url.includes('fbcdn.net')) {
    defaultHeaders['Referer'] = 'https://www.instagram.com/';
    defaultHeaders['Sec-Fetch-Dest'] = 'video';
    defaultHeaders['Sec-Fetch-Mode'] = 'no-cors';
    defaultHeaders['Sec-Fetch-Site'] = 'cross-site';
    defaultHeaders['Range'] = 'bytes=0-';
    defaultHeaders['Accept-Encoding'] = 'identity;q=1, *;q=0';
  }

  const mergedHeaders = { ...defaultHeaders, ...(fetchOptions.headers || {}) };

  try {
    const res = await fetch(url, { ...fetchOptions, headers: mergedHeaders, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`server merespons status ${res.status}`);
    }
    if (!res.body) {
      throw new Error('Response tidak punya body (kemungkinan diblokir server).');
    }

    const totalBytes = parseInt(res.headers.get('content-length') || '0', 10) || null;
    const tmpPath = makeTmpPath(category, ext);
    const writeStream = fs.createWriteStream(tmpPath);

    let downloaded = 0;
    const reader = res.body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        downloaded += value.length;
        await new Promise((resolve, reject) => {
          writeStream.write(Buffer.from(value), (err) => (err ? reject(err) : resolve()));
        });
        if (onProgress) {
          try { onProgress(downloaded, totalBytes); } catch { /* noop */ }
        }
      }
    } finally {
      await new Promise((resolve) => writeStream.end(resolve));
    }

    return { path: tmpPath, size: downloaded };
  } catch (err) {
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function deleteTmpFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.error('[tmpManager] Gagal hapus file tmp:', filePath, err.message);
  }
}

// Menghapus 1 file spesifik dengan verifikasi path traversal aman
function deleteSingleMediaFile(targetPath) {
  if (!targetPath || typeof targetPath !== 'string') return false;

  // Izinkan decoding base64 ID jika dikirim sebagai ID
  let resolvedPath = targetPath;
  if (!targetPath.includes('/') && !targetPath.includes('\\') && targetPath.length > 20) {
    try {
      const decoded = Buffer.from(targetPath, 'base64').toString('utf8');
      if (decoded.startsWith('tmp/')) {
        resolvedPath = path.resolve(__dirname, '..', decoded);
      }
    } catch (_) {}
  }

  const absolute = path.isAbsolute(resolvedPath) ? resolvedPath : path.resolve(__dirname, '..', resolvedPath);
  const rootDir = path.resolve(__dirname, '..');
  const tmpMediaDir = path.resolve(config.paths.tmpMedia);
  const tmpDlDir = path.resolve(config.paths.tmpDownloader);

  // Keamanan: pastikan file benar-benar berada di dalam folder tmp/media atau tmp/downloader
  const normAbs = absolute.toLowerCase().replace(/\\/g, '/');
  const normMedia = tmpMediaDir.toLowerCase().replace(/\\/g, '/');
  const normDl = tmpDlDir.toLowerCase().replace(/\\/g, '/');
  if (!normAbs.startsWith(normMedia) && !normAbs.startsWith(normDl)) {
    throw new Error('Akses ditolak: File berada di luar direktori media tmp.');
  }

  if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) {
    fs.unlinkSync(absolute);
    return true;
  }
  return false;
}

// Menghapus seluruh file media dalam kategori tertentu
function clearCategoryMedia(category) {
  const files = listAllMediaFiles(category);
  let deletedCount = 0;
  let freedBytes = 0;

  for (const f of files) {
    try {
      if (fs.existsSync(f.fullPath)) {
        fs.unlinkSync(f.fullPath);
        deletedCount++;
        freedBytes += f.size;
      }
    } catch (err) {
      console.error('[tmpManager] Gagal hapus file kategori:', f.fullPath, err.message);
    }
  }

  return { deletedCount, freedBytes, formattedFreed: formatBytes(freedBytes) };
}

// Menghapus seluruh file media yang terdeteksi di tmp/ (semua kategori)
function clearAllMediaFiles() {
  const files = listAllMediaFiles('all');
  let deletedCount = 0;
  let freedBytes = 0;

  for (const f of files) {
    try {
      if (fs.existsSync(f.fullPath)) {
        fs.unlinkSync(f.fullPath);
        deletedCount++;
        freedBytes += f.size;
      }
    } catch (err) {
      console.error('[tmpManager] Gagal hapus file:', f.fullPath, err.message);
    }
  }

  return { deletedCount, freedBytes, formattedFreed: formatBytes(freedBytes) };
}

// Dipakai command /cleartmp. Kembalikan { deletedCount, freedBytes }.
function clearTmpFolder(category) {
  const files = listTmpFiles(category);
  let freedBytes = 0;
  let deletedCount = 0;

  for (const f of files) {
    try {
      fs.unlinkSync(f.path);
      freedBytes += f.size;
      deletedCount++;
    } catch (err) {
      console.error('[tmpManager] Gagal hapus:', f.path, err.message);
    }
  }

  return { deletedCount, freedBytes };
}

module.exports = {
  CATEGORY_PATHS,
  ALLOWED_MEDIA_EXTS,
  ensureDir,
  getTmpFileCount,
  getTmpTotalSize,
  makeTmpPath,
  streamDownloadToTmp,
  deleteTmpFile,
  clearTmpFolder,
  formatBytes,
  getMediaType,
  listAllMediaFiles,
  getStorageStats,
  deleteSingleMediaFile,
  clearCategoryMedia,
  clearAllMediaFiles,
};
