// lib/mediafireScraper.js — Resolver MediaFire: single-file & folder.
//
// Referensi/amati-tiru-modifikasi dari aplikasi "mfd-app" (web app lokal
// MediaFire Folder Downloader) yang diupload user. Prinsip yang dipertahankan
// dari sumber aslinya:
//   - Folder di-scan lewat API RESMI MediaFire (folder/get_content.php),
//     bukan scraping HTML — karena daftar file folder modern dirender lewat
//     JS di browser, HTML mentah tidak akan berisi daftar file itu.
//   - Direct download link file diambil dari halaman publik file
//     (mediafire.com/file/<quickkey>/.../file), baca tombol #downloadButton.
//     Ini BUKAN bypass apa pun — halaman itu memang publik & dirender
//     lengkap di HTML awal (beda dari halaman folder).
//   - TIDAK mencoba login atau bypass status Premium/restricted. Kalau file
//     butuh itu, dikembalikan status jelas ke pemanggil, bukan dipaksa.

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { 'User-Agent': CHROME_UA, ...(options.headers || {}) },
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

function isMediaFireUrl(url) {
  try {
    const parsed = new URL(url);
    return /(^|\.)mediafire\.com$/i.test(parsed.hostname);
  } catch {
    return false;
  }
}

function isFolderUrl(url) {
  try {
    const parsed = new URL(url);
    return /\/folder\//i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function detectFileType(filename) {
  if (!filename) return 'unknown';
  const ext = filename.split('.').pop().toLowerCase();
  const map = {
    pdf: 'document', doc: 'document', docx: 'document', txt: 'document',
    xls: 'spreadsheet', xlsx: 'spreadsheet', csv: 'spreadsheet',
    ppt: 'presentation', pptx: 'presentation',
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image',
    mp3: 'audio', wav: 'audio', flac: 'audio', m4a: 'audio',
    mp4: 'video', mkv: 'video', avi: 'video', mov: 'video', webm: 'video',
    zip: 'archive', rar: 'archive', '7z': 'archive',
    apk: 'app', exe: 'app',
  };
  return map[ext] || 'unknown';
}

function formatBytes(bytes) {
  if (!bytes) return '?';
  const units = ['B', 'KB', 'MB', 'GB'];
  let val = bytes, i = 0;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return `${val.toFixed(1)} ${units[i]}`;
}

function extractFolderKey(url) {
  const match = url.match(/\/folder\/([a-z0-9]+)/i);
  return match ? match[1] : null;
}

async function fetchFolderApiContent(folderKey, contentType, timeoutMs) {
  const apiUrl =
    `https://www.mediafire.com/api/1.5/folder/get_content.php` +
    `?folder_key=${encodeURIComponent(folderKey)}` +
    `&content_type=${contentType}` +
    `&order_by=name&order_direction=asc&chunk=1&response_format=json`;

  const response = await fetchWithTimeout(apiUrl, {}, timeoutMs);
  if (!response.ok) throw new Error(`MediaFire API merespons status ${response.status}.`);

  const json = await response.json();
  const result = json?.response;
  if (!result) throw new Error('Respons API MediaFire tidak dikenali.');
  if (result.result === 'Error') {
    throw new Error(result.message || 'MediaFire menolak permintaan ini.');
  }
  return result.folder_content;
}

// Scan folder MediaFire, kembalikan daftar file (tanpa resolve direct link
// dulu — itu baru dilakukan saat user pilih nomor file spesifik).
async function scanMediaFireFolder(folderUrl, timeoutMs = 20000) {
  const folderKey = extractFolderKey(folderUrl);
  if (!folderKey) {
    return { success: false, error: 'Tidak bisa menemukan folder key dari link ini.' };
  }

  let filesContent, subfoldersContent;
  try {
    [filesContent, subfoldersContent] = await Promise.all([
      fetchFolderApiContent(folderKey, 'files', timeoutMs),
      fetchFolderApiContent(folderKey, 'folders', timeoutMs),
    ]);
  } catch (err) {
    return { success: false, error: `Gagal mengambil isi folder: ${err.message}` };
  }

  const rawFiles = filesContent?.files || [];
  const rawSubfolders = subfoldersContent?.folders || [];

  if (rawFiles.length === 0 && rawSubfolders.length === 0) {
    return { success: false, error: 'Folder ini kosong atau tidak publik.' };
  }

  const files = rawFiles.map((f) => {
    let status = 'available';
    if (f.password_protected === 'yes') status = 'restricted';
    else if (f.privacy && f.privacy !== 'public') status = 'restricted';
    return {
      name: f.filename,
      sizeBytes: f.size ? parseInt(f.size, 10) : null,
      type: detectFileType(f.filename),
      quickKey: f.quickkey,
      status,
    };
  });

  if (files.length === 0) {
    const note = rawSubfolders.length > 0 ? ` (folder ini berisi ${rawSubfolders.length} subfolder, belum didukung)` : '';
    return { success: false, error: `Tidak ada file langsung di folder ini.${note}` };
  }

  return { success: true, files, subfolderCount: rawSubfolders.length };
}

// Resolve direct download link dari halaman publik file MediaFire.
// Bisa dipanggil dengan URL file langsung, ATAU quickKey (hasil scan folder).
async function resolveDirectLink(urlOrQuickKey, timeoutMs = 20000) {
  const filePageUrl = urlOrQuickKey.startsWith('http')
    ? urlOrQuickKey
    : `https://www.mediafire.com/file/${encodeURIComponent(urlOrQuickKey)}/file`;

  let response;
  try {
    response = await fetchWithTimeout(filePageUrl, {}, timeoutMs);
  } catch (err) {
    return { success: false, error: `Gagal menghubungi halaman file: ${err.message}` };
  }
  if (!response.ok) {
    return { success: false, error: `Server merespons status ${response.status}.` };
  }

  const html = await response.text();
  const bodyLower = html.toLowerCase();

  if (bodyLower.includes('upgrade to premium') || bodyLower.includes('premium account')) {
    return { success: false, restricted: true, error: 'File ini memerlukan akun Premium MediaFire.' };
  }
  if (bodyLower.includes('you must be logged in') || bodyLower.includes('please log in')) {
    return { success: false, restricted: true, error: 'File ini memerlukan login MediaFire.' };
  }
  if (bodyLower.includes('invalid or deleted') || bodyLower.includes('page not found')) {
    return { success: false, restricted: true, error: 'File tidak ditemukan atau sudah dihapus.' };
  }

  const btnMatch =
    html.match(/id="downloadButton"[^>]*href="([^"]+)"/i) ||
    html.match(/href="([^"]+)"[^>]*id="downloadButton"/i) ||
    html.match(/aria-label="Download file"[^>]*href="([^"]+)"/i) ||
    html.match(/href="([^"]+)"[^>]*aria-label="Download file"/i);

  if (!btnMatch) {
    return { success: false, error: 'Tombol download tidak ditemukan (struktur halaman berubah, atau file tidak publik).' };
  }

  // Nama file & ukuran, kalau tersedia di halaman (buat single-link mode)
  const titleMatch = html.match(/<div class="dl-btn-label"[^>]*>([^<]+)<\/div>/i) || html.match(/<title>([^<]+)<\/title>/i);
  const sizeMatch = html.match(/\(([\d.,]+\s*[KMGT]?B)\)/i);

  return {
    success: true,
    directUrl: btnMatch[1].replace(/&amp;/g, '&'),
    filename: titleMatch ? titleMatch[1].trim() : null,
    sizeText: sizeMatch ? sizeMatch[1] : null,
  };
}

module.exports = {
  isMediaFireUrl,
  isFolderUrl,
  scanMediaFireFolder,
  resolveDirectLink,
  formatBytes,
  createZipBuffer,
};

// ---- ZIP builder manual (format "store", tanpa kompresi) ----
// Adaptasi dari mfd-app/server.js: aslinya baca dari file di disk,
// di sini diubah supaya kerja langsung dari Buffer in-memory (kita tidak
// menyimpan file sementara ke tmp/ satu-satu, langsung compose di RAM).
// Tidak butuh dependency zip eksternal — murni Buffer + CRC32 manual,
// aman dari resiko native-module gagal compile di Termux (kasus sharp/
// better-sqlite3 sebelumnya).

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toDosDateTime(date) {
  const dosTime =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((date.getSeconds() >> 1) & 0x1f);
  const dosDate =
    (((date.getFullYear() - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0xf) << 5) |
    (date.getDate() & 0x1f);
  return { dosTime, dosDate };
}

function sanitizeZipEntryName(name) {
  // Cegah path traversal / karakter aneh masuk sebagai nama entry ZIP
  return (name || 'file').replace(/[\\/]/g, '_').replace(/[\x00-\x1f]/g, '');
}

// entries: [{ name, data: Buffer }]
function createZipBuffer(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  const usedNames = new Set();

  for (const entry of entries) {
    let name = sanitizeZipEntryName(entry.name);
    let counter = 1;
    while (usedNames.has(name)) {
      const dot = name.lastIndexOf('.');
      const base = dot > 0 ? name.slice(0, dot) : name;
      const ext = dot > 0 ? name.slice(dot) : '';
      name = `${base} (${counter})${ext}`;
      counter++;
    }
    usedNames.add(name);

    const data = entry.data;
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const { dosTime, dosDate } = toDosDateTime(new Date());
    const size = data.length;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(size, 18);
    localHeader.writeUInt32LE(size, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(size, 20);
    centralHeader.writeUInt32LE(size, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);

    offset += localHeader.length + nameBuf.length + data.length;
  }

  const centralDirStart = offset;
  const centralDirBuffer = Buffer.concat(centralParts);
  const centralDirSize = centralDirBuffer.length;

  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDirSize, 12);
  endRecord.writeUInt32LE(centralDirStart, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirBuffer, endRecord]);
}
