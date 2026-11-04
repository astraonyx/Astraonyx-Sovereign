// server/gdriveStorage.js — Google Drive Cloud Storage & Local Fallback Bridge
// Enables free media hosting for Medsos & E2EE Chats without needing a paid VPS!
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Convert any Google Drive sharing link to a direct streamable CDN URL
function resolveGoogleDriveUrl(url) {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();

  // Match: drive.google.com/file/d/FILE_ID/view... or ?id=FILE_ID
  const matchId = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                  trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                  trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);

  if (matchId && matchId[1]) {
    const fileId = matchId[1];
    // Google User Content CDN link provides fast, CORS-friendly direct media display
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  return trimmed;
}

// Save uploaded buffer to local storage (instant fallback for localhost without VPS)
function saveLocalMedia(buffer, originalFilename = 'file.bin', mimeType = '') {
  const ext = path.extname(originalFilename) || (mimeType.includes('image') ? '.jpg' : mimeType.includes('video') ? '.mp4' : '.bin');
  const safeFilename = `media_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext.toLowerCase()}`;
  const filePath = path.join(UPLOADS_DIR, safeFilename);

  fs.writeFileSync(filePath, buffer);
  const localUrl = `/uploads/${safeFilename}`;

  return {
    filename: safeFilename,
    filePath,
    localUrl,
    size: buffer.length,
    mimeType,
  };
}

// Upload buffer directly to Google Drive via REST API if user configured credentials
async function uploadToGoogleDrive(buffer, filename, mimeType, gdriveConfig = {}) {
  const folderId = gdriveConfig.folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;
  const accessToken = gdriveConfig.accessToken || process.env.GOOGLE_DRIVE_ACCESS_TOKEN;

  if (!folderId || !accessToken) {
    return {
      success: false,
      isGdrive: false,
      reason: 'Google Drive belum dikonfigurasi. Menggunakan penyimpanan lokal bawaan.',
    };
  }

  try {
    const metadata = {
      name: filename,
      parents: [folderId],
    };

    const boundary = `-------314159265358979323846_${Date.now()}`;
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody = Buffer.concat([
      Buffer.from(
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`
      ),
      buffer,
      Buffer.from(closeDelimiter),
    ]);

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': multipartRequestBody.length.toString(),
      },
      body: multipartRequestBody,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return { success: false, isGdrive: false, error: `Google Drive API error: ${errText}` };
    }

    const fileData = await uploadRes.json();
    const fileId = fileData.id;

    // Set permission to public readable
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone',
        }),
      });
    } catch (_) {}

    const directCdnUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
    const directViewUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

    return {
      success: true,
      isGdrive: true,
      fileId,
      gdriveUrl: directCdnUrl,
      directViewUrl,
    };
  } catch (err) {
    return { success: false, isGdrive: false, error: err.message };
  }
}

// Get Google Drive storage status & config info
function getStorageStatus() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '';
  const hasAccessToken = Boolean(process.env.GOOGLE_DRIVE_ACCESS_TOKEN);
  const isConfigured = Boolean(folderId && hasAccessToken);

  let localFileCount = 0;
  let totalLocalBytes = 0;
  try {
    const files = fs.readdirSync(UPLOADS_DIR);
    localFileCount = files.length;
    for (const f of files) {
      const st = fs.statSync(path.join(UPLOADS_DIR, f));
      totalLocalBytes += st.size;
    }
  } catch (_) {}

  return {
    isConfigured,
    mode: isConfigured ? 'google_drive' : 'local_storage',
    folderId: folderId ? `${folderId.slice(0, 6)}...${folderId.slice(-4)}` : '',
    localFileCount,
    totalLocalSizeMb: (totalLocalBytes / (1024 * 1024)).toFixed(2),
    uploadsDir: UPLOADS_DIR,
    info: isConfigured
      ? 'Google Drive Cloud Storage aktif (15GB Gratis). Media disimpan otomatis di Google Drive.'
      : 'Mode Localhost Aktif (Gratis Tanpa VPS). Media disimpan di disk lokal dan langsung disajikan via /uploads.',
  };
}

module.exports = {
  resolveGoogleDriveUrl,
  saveLocalMedia,
  uploadToGoogleDrive,
  getStorageStatus,
  UPLOADS_DIR,
};
