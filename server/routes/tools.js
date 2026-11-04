// server/routes/tools.js — Web-to-APK Builder, Smart Tasks, Media Storage & System Control
const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('../../config');
const { authenticateToken, requireWriteAccess } = require('../auth');
const { buildWebToApk, BUILDS_DIR } = require('../../lib/webToApkBuilder');
const { taskQueries } = require('../db');
const tmpManager = require('../../lib/tmpManager');
const botManager = require('../botManager');

const toolsRouter = express.Router();
const tasksRouter = express.Router();
const mediaRouter = express.Router();
const systemRouter = express.Router();

// ==================== WEB-TO-APK BUILDER (/api/tools/web-to-apk) ====================

toolsRouter.post('/web-to-apk/build', authenticateToken, async (req, res) => {
  try {
    const result = await buildWebToApk(req.body);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, logs: [err.message] });
  }
});

toolsRouter.get('/web-to-apk/download/:buildId', (req, res) => {
  try {
    const { buildId } = req.params;
    const safeBuildId = buildId.replace(/[^a-zA-Z0-9_-]/g, '');
    const targetFile = path.join(BUILDS_DIR, `${safeBuildId}_package.zip`);
    if (!fs.existsSync(targetFile)) {
      return res.status(404).send('Berkas paket APK tidak ditemukan atau telah kedaluwarsa.');
    }
    res.download(targetFile, `PolarisApp_${safeBuildId}_AndroidProject.zip`);
  } catch (err) {
    res.status(500).send(`Gagal mengunduh berkas: ${err.message}`);
  }
});

// ==================== SMART TASKS (/api/tasks) ====================

tasksRouter.get('/', (req, res) => {
  try {
    const chatJid = req.query.chatJid;
    const tasks = taskQueries.getActiveTasks(chatJid);
    const targets = taskQueries.getAllActiveTargets();
    const stats = {
      totalActive: tasks.filter((t) => t.status === 'active').length,
      totalOverdue: tasks.filter((t) => t.status === 'overdue' || (t.status === 'active' && t.deadline_at < Date.now())).length,
      totalTargets: targets.length,
    };
    res.json({ success: true, stats, tasks, targets });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== MEDIA & TMP STORAGE (/api/media) ====================

mediaRouter.get('/stats', authenticateToken, (req, res) => {
  try {
    const stats = tmpManager.getStorageStats();
    res.json({ success: true, ...stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

mediaRouter.get('/files', authenticateToken, (req, res) => {
  try {
    const category = req.query.category || 'all';
    const search = (req.query.search || '').toLowerCase().trim();
    let files = tmpManager.listAllMediaFiles(category);
    if (search) {
      files = files.filter((f) => f.filename.toLowerCase().includes(search) || f.category.toLowerCase().includes(search));
    }
    res.json({ success: true, count: files.length, files });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

mediaRouter.get('/preview', authenticateToken, (req, res) => {
  try {
    const target = req.query.path || req.query.id;
    if (!target) return res.status(400).json({ success: false, error: 'Path atau ID file wajib diisi' });

    let resolvedPath = target;
    if (!target.includes('/') && !target.includes('\\') && target.length > 20) {
      try {
        const decoded = Buffer.from(target, 'base64').toString('utf8');
        if (decoded.startsWith('tmp/')) {
          resolvedPath = path.resolve(__dirname, '../../', decoded);
        }
      } catch (_) {}
    }

    const absolute = path.isAbsolute(resolvedPath) ? resolvedPath : path.resolve(__dirname, '../../', resolvedPath);
    const tmpMediaDir = path.resolve(config.paths.tmpMedia);
    const tmpDlDir = path.resolve(config.paths.tmpDownloader);

    const normAbs = absolute.toLowerCase().replace(/\\/g, '/');
    const normMedia = tmpMediaDir.toLowerCase().replace(/\\/g, '/');
    const normDl = tmpDlDir.toLowerCase().replace(/\\/g, '/');

    if (!normAbs.startsWith(normMedia) && !normAbs.startsWith(normDl)) {
      return res.status(403).json({ success: false, error: 'Akses ditolak: di luar direktori media.' });
    }

    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      return res.status(404).json({ success: false, error: 'File media tidak ditemukan.' });
    }

    const stat = fs.statSync(absolute);
    const fileSize = stat.size;
    const range = req.headers.range;

    const ext = path.extname(absolute).replace(/^\./, '').toLowerCase();
    const mimeTypes = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
      mp4: 'video/mp4', webm: 'video/webm', mkv: 'video/x-matroska', mov: 'video/quicktime',
      mp3: 'audio/mpeg', ogg: 'audio/ogg', opus: 'audio/ogg', wav: 'audio/wav', m4a: 'audio/mp4',
      pdf: 'application/pdf', zip: 'application/zip', apk: 'application/vnd.android.package-archive',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');

    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(absolute)}"`);
    } else {
      res.setHeader('Content-Disposition', 'inline');
    }

    if (range && (ext === 'mp4' || ext === 'webm' || ext === 'mkv' || ext === 'mov' || ext === 'mp3' || ext === 'ogg' || ext === 'wav' || ext === 'm4a')) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize || start > end) {
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        return res.status(416).end();
      }

      const chunksize = (end - start) + 1;
      const fileStream = fs.createReadStream(absolute, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      });
      fileStream.pipe(res);
    } else {
      res.setHeader('Content-Length', fileSize);
      fs.createReadStream(absolute).pipe(res);
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

mediaRouter.delete('/file', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const target = req.body.path || req.body.id;
    if (!target) return res.status(400).json({ success: false, error: 'Target file diperlukan.' });
    const success = tmpManager.deleteSingleMediaFile(target);
    if (!success) {
      return res.status(404).json({ success: false, error: 'File tidak ditemukan atau sudah terhapus.' });
    }
    res.json({ success: true, message: 'File media berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

mediaRouter.post('/clear-category', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const category = req.body.category;
    if (!category) return res.status(400).json({ success: false, error: 'Kategori diperlukan.' });
    const result = tmpManager.clearCategoryMedia(category);
    res.json({ success: true, message: `Kategori ${category} berhasil dibersihkan (${result.deletedCount} file, ${result.formattedFreed} terbebas).`, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

mediaRouter.post('/clear-all', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const result = tmpManager.clearAllMediaFiles();
    res.json({ success: true, message: `Semua media tmp berhasil dihapus (${result.deletedCount} file, ${result.formattedFreed} terbebas).`, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== SYSTEM CONTROLLER (/api/system & /api/health) ====================

systemRouter.get('/ping', (req, res) => {
  res.json({
    success: true,
    instanceId: process.env.INSTANCE_ID || 'primary',
    port: config.dashboardPort,
    status: 'RUNNING',
    botStatus: botManager.getStatus(),
    pid: process.pid,
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

systemRouter.post('/shutdown', authenticateToken, requireWriteAccess, (req, res) => {
  res.json({ success: true, message: 'Server shutdown sequence initiated.' });
  setTimeout(() => process.exit(0), 400);
});

module.exports = {
  toolsRouter,
  tasksRouter,
  mediaRouter,
  systemRouter,
};
