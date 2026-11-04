// server/routes/lumina.js — Lumina HD AI Image & Video Studio Routes
const express = require('express');
const fs = require('fs');
const path = require('path');
const luminaService = require('../luminaService');
const videoHdService = require('../videoHdService');
const { upload, uploadVideo, UPLOADS_DIR } = require('../uploadMiddleware');

const router = express.Router();

// Status kesehatan server Lumina AI
router.get('/health', async (req, res) => {
  try {
    const health = await luminaService.getHealth();
    res.json({ success: true, health });
  } catch (err) {
    res.json({
      success: false,
      status: 'offline',
      error: err.message,
      message: 'Server Lumina AI sedang dalam inisialisasi atau offline.'
    });
  }
});

// Unggah foto ke Lumina Image Studio
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'File gambar wajib diunggah.' });
    }
    const fileBuf = req.file.buffer || fs.readFileSync(req.file.path);
    const data = await luminaService.uploadImage(
      fileBuf,
      req.file.originalname,
      req.file.mimetype
    );
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Stream enhance foto
router.post('/enhance/stream', async (req, res) => {
  try {
    await luminaService.proxyEnhanceStream(req.body, res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

// Enhance foto sync
router.post('/enhance', async (req, res) => {
  try {
    const result = await luminaService.enhanceSync(req.body);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sajikan file media Lumina
router.get('/media/:folder/:filename', (req, res) => {
  try {
    const { folder, filename } = req.params;
    const filePath = luminaService.resolveMediaFile(folder, filename);
    if (!filePath) {
      return res.status(404).send('Berkas media Lumina tidak ditemukan.');
    }
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Unggah file video HD
router.post('/video/upload', uploadVideo.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'File video wajib diunggah.' });
    }
    res.json({
      success: true,
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: `/uploads/${req.file.filename}`
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Jalankan enhance video HD
router.post('/video/enhance', async (req, res) => {
  try {
    const { videoPath, filename, engine, resolution, fps, sharpness } = req.body;
    
    let resolvedPath = videoPath;
    if (!resolvedPath && filename) {
      resolvedPath = path.join(UPLOADS_DIR, path.basename(filename));
    }
    
    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      return res.status(400).json({ success: false, error: 'File video tidak ditemukan di server.' });
    }

    const task = await videoHdService.enhanceVideo(resolvedPath, {
      engine: engine || 'auto',
      resolution: resolution || '1080p',
      fps: Number(fps) || 60,
      sharpness: Number(sharpness) || 35
    });

    res.json({ success: true, ...task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cek status proses enhance video
router.get('/video/status/:taskId', (req, res) => {
  try {
    const status = videoHdService.getTaskStatus(req.params.taskId);
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
