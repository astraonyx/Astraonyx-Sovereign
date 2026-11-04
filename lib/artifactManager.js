// lib/artifactManager.js — Hermes Artifact Generation & Storage Manager
// Mendukung pembuatan file nyata: HTML, CSS, JS, DOCX, PDF, PPTX, XLSX, TXT, PNG, JPG, JSON, PY, SVG, CSV
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');
const PptxGenJS = require('pptxgenjs');
const { Jimp } = require('jimp');

const ARTIFACTS_DIR = path.resolve(__dirname, '../public/artifacts');
const DB_FILE = path.resolve(__dirname, '../database/hermes_artifacts.json');

// Pastikan direktori tersedia
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}
if (!fs.existsSync(path.dirname(DB_FILE))) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
}

function readArtifactsDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, '[]', 'utf8');
      return [];
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error('[artifactManager] Gagal membaca database artefak:', err.message);
    return [];
  }
}

function saveArtifactsDb(list) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    console.error('[artifactManager] Gagal menyimpan database artefak:', err.message);
  }
}

function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Buat Artefak File Berdasarkan Tipe
 */
async function createArtifact({ filename, filetype, title = '', content = '', data = null, userId = null, ownerUsername = null }) {
  let type = (filetype || '').toLowerCase().replace(/^\./, '');
  const trimmedContent = String(content || '').trim();

  // 1. Intelligent Content-Based Format Detection
  if (!type || type === 'txt') {
    if (filename && path.extname(filename)) {
      type = path.extname(filename).toLowerCase().replace('.', '');
    } else if (/<!doctype\s+html/i.test(trimmedContent) || /<html[\s>]/i.test(trimmedContent) || /<\/html>/i.test(trimmedContent) || /<body[\s>]/i.test(trimmedContent)) {
      type = 'html';
    } else if (/<svg[\s>]/i.test(trimmedContent)) {
      type = 'svg';
    } else if (/^\s*(\{|\[)[\s\S]*(\}|\])\s*$/.test(trimmedContent)) {
      try { JSON.parse(trimmedContent); type = 'json'; } catch (_) {}
    } else if (/\b(def|class)\s+\w+\s*:|\bimport\s+[\w.]+|\bfrom\s+[\w.]+\s+import/m.test(trimmedContent)) {
      type = 'py';
    } else if (/\b(function|const|let|var)\s+\w+\s*\(|\bimport\s+.*\s+from\s+['"]|\bexport\s+(default|const|function)/m.test(trimmedContent)) {
      type = 'js';
    } else if (/^\s*#\s+[^\n]+|\b##\s+[^\n]+/m.test(trimmedContent)) {
      type = 'md';
    }
  }

  if (!type) type = 'txt';

  // 2. Intelligent Filename Generation (Avoid ugly artifact_1234567.txt)
  if (!filename || filename.startsWith('artifact_') || filename === 'default' || filename === 'undefined') {
    let baseName = '';
    // Try to extract title from HTML <title> tag
    if (type === 'html') {
      const titleMatch = trimmedContent.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1].trim()) {
        baseName = titleMatch[1].trim()
          .replace(/[^\w\s-]/g, '')
          .trim()
          .replace(/\s+/g, '_')
          .toLowerCase();
      }
      if (!baseName) baseName = 'index';
    } else if (title && typeof title === 'string') {
      baseName = title.trim().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').toLowerCase();
    }

    if (!baseName) {
      baseName = type === 'html' ? 'index' : (type === 'py' ? 'script' : (type === 'json' ? 'data' : (type === 'md' ? 'dokumen' : 'file')));
    }

    if (baseName.length > 40) baseName = baseName.slice(0, 40);
    filename = `${baseName}.${type}`;
  }

  // Sanitasi nama file
  let safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
  const extMatch = path.extname(safeName).toLowerCase().replace('.', '');
  if (!extMatch || extMatch !== type) {
    safeName = safeName.replace(/\.[^.]+$/, '') + '.' + type;
  }

  const id = 'art_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const targetPath = path.join(ARTIFACTS_DIR, id + '_' + safeName);

  let finalBuffer = null;

  switch (type) {
    // ==================== 1. DOKUMEN PDF ====================
    case 'pdf': {
      finalBuffer = await new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Header / Judul
        doc.rect(0, 0, doc.page.width, 60).fill('#0f172a');
        doc.fillColor('#38bdf8').fontSize(18).font('Helvetica-Bold').text(title || safeName, 50, 22, { width: doc.page.width - 100 });

        doc.fillColor('#334155').fontSize(10).font('Helvetica').text('Dibuat oleh Hermes Autonomous AI Agent • ' + new Date().toLocaleString('id-ID'), 50, 75);
        doc.moveTo(50, 92).lineTo(doc.page.width - 50, 92).strokeColor('#e2e8f0').stroke();

        doc.moveDown(2);
        doc.fillColor('#1e293b').fontSize(11).font('Helvetica').text(content || 'Tidak ada teks isi.', 50, 110, {
          width: doc.page.width - 100,
          lineGap: 4,
          align: 'left',
        });

        doc.end();
      });
      fs.writeFileSync(targetPath, finalBuffer);
      break;
    }

    // ==================== 2. MICROSOFT WORD (.DOCX) ====================
    case 'docx':
    case 'doc': {
      const paragraphs = [];

      // Judul
      paragraphs.push(
        new Paragraph({
          text: title || safeName.replace(/\.[^/.]+$/, ''),
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.LEFT,
          spacing: { after: 200 },
        })
      );

      // Metadata pembuat
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Dibuat oleh Hermes Autonomous AI Agent • ' + new Date().toLocaleString('id-ID'),
              italics: true,
              color: '64748B',
              size: 20, // 10pt
            }),
          ],
          spacing: { after: 400 },
        })
      );

      // Konten teks
      const textLines = (content || '').split('\n');
      textLines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('# ')) {
          paragraphs.push(new Paragraph({ text: trimmed.slice(2), heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
        } else if (trimmed.startsWith('## ')) {
          paragraphs.push(new Paragraph({ text: trimmed.slice(3), heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 100 } }));
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          paragraphs.push(new Paragraph({ text: trimmed.slice(2), bullet: { level: 0 }, spacing: { after: 80 } }));
        } else {
          paragraphs.push(new Paragraph({ text: line, spacing: { after: 120 } }));
        }
      });

      const wordDoc = new Document({
        sections: [{ properties: {}, children: paragraphs }],
      });

      finalBuffer = await Packer.toBuffer(wordDoc);
      fs.writeFileSync(targetPath, finalBuffer);
      break;
    }

    // ==================== 3. MICROSOFT EXCEL (.XLSX) ====================
    case 'xlsx':
    case 'xls': {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Hermes Autonomous AI Agent';
      workbook.created = new Date();
      const sheet = workbook.addWorksheet('Sheet1', {
        properties: { defaultRowHeight: 20 },
      });

      // Parse baris tabel dari JSON atau CSV/Text
      let rows = [];
      if (Array.isArray(data)) {
        rows = data;
      } else if (typeof content === 'string') {
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) rows = parsed;
        } catch (_) {
          // Parse dari baris CSV atau teks terpisah koma / pipe
          rows = content.split('\n').filter((l) => l.trim()).map((l) => {
            if (l.includes('\t')) return l.split('\t').map((c) => c.trim());
            if (l.includes(',')) return l.split(',').map((c) => c.trim());
            if (l.includes('|')) return l.split('|').map((c) => c.trim()).filter((c) => c.length > 0);
            return [l.trim()];
          });
        }
      }

      if (rows.length > 0) {
        // Jika array of objects
        if (typeof rows[0] === 'object' && !Array.isArray(rows[0])) {
          const headers = Object.keys(rows[0]);
          sheet.columns = headers.map((h) => ({ header: h, key: h, width: Math.max(h.length + 5, 14) }));
          rows.forEach((r) => sheet.addRow(r));
        } else {
          // Array of arrays
          rows.forEach((r, idx) => {
            const addedRow = sheet.addRow(r);
            if (idx === 0) {
              addedRow.font = { bold: true };
            }
          });
        }
      } else {
        sheet.addRow(['Judul', title || 'Dokumen']);
        sheet.addRow(['Waktu Pembuatan', new Date().toLocaleString('id-ID')]);
        sheet.addRow(['Konten', content]);
      }

      finalBuffer = await workbook.xlsx.writeBuffer();
      fs.writeFileSync(targetPath, finalBuffer);
      break;
    }

    // ==================== 4. MICROSOFT POWERPOINT (.PPTX) ====================
    case 'pptx':
    case 'ppt': {
      const pres = new PptxGenJS();
      pres.layout = 'LAYOUT_16x9';
      pres.title = title || safeName;

      // Slide 1: Judul
      const slide1 = pres.addSlide();
      slide1.background = { color: '0F172A' };
      slide1.addText(title || safeName.replace(/\.[^/.]+$/, ''), {
        x: 1,
        y: 2,
        w: '80%',
        h: 1.5,
        fontSize: 36,
        bold: true,
        color: '38BDF8',
        align: 'center',
      });
      slide1.addText('Dibuat oleh Hermes Autonomous AI Agent', {
        x: 1,
        y: 3.8,
        w: '80%',
        h: 0.8,
        fontSize: 16,
        color: '94A3B8',
        align: 'center',
      });

      // Slide 2: Konten
      const slide2 = pres.addSlide();
      slide2.background = { color: 'F8FAFC' };
      slide2.addText(title ? 'Ringkasan: ' + title : 'Detail Materi', {
        x: 0.8,
        y: 0.6,
        w: '85%',
        h: 0.8,
        fontSize: 24,
        bold: true,
        color: '0F172A',
      });

      const bullets = (content || '').split('\n').filter((l) => l.trim()).slice(0, 8);
      const bulletItems = bullets.length > 0 ? bullets.map((b) => ({ text: b.replace(/^[-*#0-9.]+\s*/, ''), options: { bullet: true } })) : [{ text: content || 'Konten slide presentasi.', options: {} }];

      slide2.addText(bulletItems, {
        x: 0.8,
        y: 1.6,
        w: '85%',
        h: 4.5,
        fontSize: 16,
        color: '334155',
        lineSpacing: 28,
      });

      finalBuffer = await pres.write({ outputType: 'nodebuffer' });
      fs.writeFileSync(targetPath, finalBuffer);
      break;
    }

    // ==================== 5. GAMBAR PNG & JPG ====================
    case 'png':
    case 'jpg':
    case 'jpeg': {
      try {
        const width = 800;
        const height = 450;
        const image = new Jimp({ width, height, color: 0x0f172aff });

        // Simpan gambar default / placeholder bergaya luxury
        finalBuffer = await image.getBuffer(type === 'png' ? 'image/png' : 'image/jpeg');
        fs.writeFileSync(targetPath, finalBuffer);
      } catch (err) {
        // Fallback file teks jika image buffer gagal
        fs.writeFileSync(targetPath, content || 'Image placeholder');
      }
      break;
    }

    // ==================== 6. HTML WEB ARTIFACT ====================
    case 'html':
    case 'htm': {
      let htmlContent = content || '';
      if (!htmlContent.includes('<html') && !htmlContent.includes('<!DOCTYPE')) {
        htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || safeName}</title>
  <style>
    :root { --bg: #0f172a; --card: #1e293b; --text: #f8fafc; --accent: #38bdf8; }
    body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); padding: 32px 16px; margin: 0; display: flex; justify-content: center; }
    .container { max-width: 800px; width: 100%; background: var(--card); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    h1 { color: var(--accent); margin-top: 0; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px; }
    .meta { font-size: 0.85rem; color: #94a3b8; margin-bottom: 24px; }
    .content { line-height: 1.7; font-size: 1rem; color: #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title || safeName}</h1>
    <div class="meta">Dibuat oleh Hermes Autonomous AI Agent • ${new Date().toLocaleString('id-ID')}</div>
    <div class="content">
      ${content}
    </div>
  </div>
</body>
</html>`;
      }
      fs.writeFileSync(targetPath, htmlContent, 'utf8');
      break;
    }

    // ==================== 7. TEKS, KODE, JSON, PY, CSS, JS, SVG, CSV ====================
    case 'json': {
      let jsonFormatted = content;
      try {
        const parsed = typeof content === 'object' ? content : JSON.parse(content);
        jsonFormatted = JSON.stringify(parsed, null, 2);
      } catch (_) {}
      fs.writeFileSync(targetPath, jsonFormatted, 'utf8');
      break;
    }

    case 'js':
    case 'javascript':
    case 'ts':
    case 'py':
    case 'python':
    case 'css':
    case 'svg':
    case 'csv':
    case 'md':
    case 'txt':
    default: {
      fs.writeFileSync(targetPath, content || '', 'utf8');
      break;
    }
  }

  const stat = fs.statSync(targetPath);
  const sizeFormatted = formatBytes(stat.size);

  const artifactRecord = {
    id,
    filename: safeName,
    filetype: type,
    title: title || safeName,
    size: sizeFormatted,
    sizeBytes: stat.size,
    storedFilename: path.basename(targetPath),
    filePath: targetPath,
    previewUrl: ['html', 'htm', 'svg', 'txt', 'json', 'py', 'js', 'css', 'md', 'csv', 'png', 'jpg'].includes(type)
      ? `/api/hermes/artifacts/preview/${id}`
      : null,
    downloadUrl: `/api/hermes/artifacts/download/${id}`,
    userId: userId || null,
    ownerUsername: ownerUsername || null,
    createdAt: new Date().toISOString(),
  };

  const db = readArtifactsDb();
  db.unshift(artifactRecord);
  // Simpan maksimal 100 artefak terakhir
  if (db.length > 100) db.length = 100;
  saveArtifactsDb(db);

  return {
    success: true,
    ...artifactRecord,
    message: `Artefak ${safeName} (${sizeFormatted}) berhasil dibuat.`,
  };
}

function getArtifactById(id, userId = null) {
  const db = readArtifactsDb();
  const item = db.find((a) => a.id === id);
  if (!item) return null;
  if (userId && item.userId && item.userId !== userId) {
    return null; // Terisolasi per user
  }
  return item;
}

function getAllArtifacts(limit = 50, userId = null) {
  const db = readArtifactsDb();
  if (userId) {
    return db.filter((a) => !a.userId || a.userId === userId).slice(0, limit);
  }
  return db.slice(0, limit);
}

function deleteArtifact(id, userId = null) {
  const db = readArtifactsDb();
  const idx = db.findIndex((a) => a.id === id);
  if (idx === -1) return false;

  const item = db[idx];
  if (userId && item.userId && item.userId !== userId) {
    return false; // Terisolasi per user
  }
  try {
    if (item.filePath && fs.existsSync(item.filePath)) {
      fs.unlinkSync(item.filePath);
    }
  } catch (_) {}

  db.splice(idx, 1);
  saveArtifactsDb(db);
  return true;
}

/**
 * Edit atau Perbarui Artefak File yang Sudah Ada
 */
async function editArtifact({ filename, id, content = '', description = '' }) {
  const db = readArtifactsDb();
  let existing = null;

  if (id) {
    existing = db.find((a) => a.id === id);
  }
  if (!existing && filename) {
    const cleanName = path.basename(filename).toLowerCase();
    existing = db.find((a) => (a.filename || '').toLowerCase() === cleanName);
  }
  // Fallback: jika filename tidak diberikan atau tidak cocok spesifik, gunakan artefak paling baru
  if (!existing && db.length > 0) {
    existing = db[0];
  }

  // Jika file belum ada sama sekali di database, buat baru via createArtifact
  if (!existing || !existing.filePath) {
    return await createArtifact({
      filename: filename || 'file_edited.txt',
      content,
      title: description || 'File dibuat/diperbarui',
    });
  }

  // Perbarui file fisik
  fs.writeFileSync(existing.filePath, content || '', 'utf8');
  const stat = fs.statSync(existing.filePath);
  const sizeFormatted = formatBytes(stat.size);

  existing.size = sizeFormatted;
  existing.sizeBytes = stat.size;
  existing.updatedAt = new Date().toISOString();
  if (description) {
    existing.description = description;
  }

  saveArtifactsDb(db);

  return {
    success: true,
    ...existing,
    message: `Artefak ${existing.filename} (${sizeFormatted}) berhasil diperbarui.${description ? ' ' + description : ''}`,
  };
}

function readArtifactContent(identifier) {
  const db = readArtifactsDb();
  if (!identifier && db.length > 0) return readArtifactContent(db[0].id);
  const clean = String(identifier || '').toLowerCase().trim();
  const art = db.find((a) => (a.filename || '').toLowerCase() === clean || (a.id || '').toLowerCase() === clean) || (db.length > 0 ? db[0] : null);
  if (!art || !art.filePath || !fs.existsSync(art.filePath)) {
    return { error: `File artefak "${identifier}" tidak ditemukan.` };
  }
  try {
    const content = fs.readFileSync(art.filePath, 'utf8');
    return {
      success: true,
      id: art.id,
      filename: art.filename,
      filetype: art.filetype,
      size: art.size,
      content,
    };
  } catch (e) {
    return { error: `Gagal membaca file: ${e.message}` };
  }
}

module.exports = {
  ARTIFACTS_DIR,
  createArtifact,
  editArtifact,
  getArtifactById,
  getAllArtifacts,
  deleteArtifact,
  formatBytes,
  readArtifactsDb,
  readArtifactContent,
};
