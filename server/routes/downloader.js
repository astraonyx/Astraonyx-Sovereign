// server/routes/downloader.js — Modular Downloader & Media Studio Routes
const express = require('express');
const path = require('path');
const { authenticateToken } = require('../auth');
const downloaderService = require('../downloaderService');
const { downloaderHistoryQueries } = require('../db');
const mori = require('../../lib/moriToolbox');

const router = express.Router();

// 1. Server Registry
router.get('/servers', authenticateToken, (req, res) => {
  try {
    const servers = downloaderService.getServersRegistry();
    res.json({
      success: true,
      moriVersion: downloaderService.MORI_VERSION || '4.3.3',
      scraperCore: downloaderService.MORI_SCRAPER_CORE || 'v2',
      servers,
      latencies: {
        server1: 65,
        server2: 120,
        server3: 195,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Single Media Analyze
router.post('/analyze', authenticateToken, async (req, res) => {
  try {
    const { url, server } = req.body || {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'URL tautan media wajib diisi.' });
    }
    const data = await downloaderService.analyzeUrl(url, server || 'auto');
    try {
      downloaderHistoryQueries.add({
        ...data,
        source: 'web',
        url,
        userId: req.user?.id || '',
      });
    } catch (_) {}
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Gagal menganalisis media.' });
  }
});

// 3. Batch Analyze
router.post('/batch-analyze', authenticateToken, async (req, res) => {
  try {
    const { urls, server } = req.body || {};
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ success: false, error: 'Daftar URL wajib berupa array dan tidak boleh kosong.' });
    }
    const limitedUrls = urls.slice(0, 25);
    const results = await Promise.all(
      limitedUrls.map(async (u) => {
        try {
          const data = await downloaderService.analyzeUrl(u, server || 'auto');
          try {
            downloaderHistoryQueries.add({
              ...data,
              source: 'web',
              url: u,
              userId: req.user?.id || '',
            });
          } catch (_) {}
          return { url: u, success: true, data };
        } catch (err) {
          return { url: u, success: false, error: err.message };
        }
      })
    );
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Downloader History (Multi-Tenant Terisolasi Per-Akun)
router.get('/history', authenticateToken, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const isCosmos = (req.user.role || '').toLowerCase() === 'cosmos';
    const history = downloaderHistoryQueries.getRecent(limit, req.user.id, isCosmos);
    const stats = downloaderHistoryQueries.getStats(req.user.id, isCosmos);
    res.json({ success: true, history, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/history', authenticateToken, (req, res) => {
  try {
    const id = downloaderHistoryQueries.add({ ...req.body, userId: req.user.id });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/history/:id', authenticateToken, (req, res) => {
  try {
    const isCosmos = (req.user.role || '').toLowerCase() === 'cosmos';
    downloaderHistoryQueries.delete(req.params.id, req.user.id, isCosmos);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/history', authenticateToken, (req, res) => {
  try {
    const isCosmos = (req.user.role || '').toLowerCase() === 'cosmos';
    downloaderHistoryQueries.clear(req.user.id, isCosmos);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Mori Universal Studio & Tools (route path '/omniget/...' dipertahankan untuk kompatibilitas dashboard)
router.post('/omniget/course', authenticateToken, async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'URL kursus/playlist wajib diisi.' });
    }
    const data = await mori.parseCourseUrl(url);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/omniget/magnet', authenticateToken, (req, res) => {
  try {
    const { magnetUri } = req.body || {};
    if (!magnetUri || typeof magnetUri !== 'string') {
      return res.status(400).json({ success: false, error: 'Magnet URI wajib diisi.' });
    }
    const data = mori.parseMagnetUri(magnetUri);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/omniget/tools/video-to-gif', authenticateToken, async (req, res) => {
  try {
    const { videoPath, startTime, duration, fps, scaleWidth } = req.body || {};
    const targetPath = videoPath || path.resolve('./tmp/media/sample.mp4');
    const result = await mori.convertVideoToGif(targetPath, { startTime, duration, fps, scaleWidth });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/omniget/tools/compress-video', authenticateToken, async (req, res) => {
  try {
    const { videoPath, targetSizeMB, crf, maxResolution } = req.body || {};
    const targetPath = videoPath || path.resolve('./tmp/media/sample.mp4');
    const result = await mori.compressVideo(targetPath, { targetSizeMB, crf, maxResolution });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/omniget/tools/compress-image', authenticateToken, async (req, res) => {
  try {
    const { imageBase64, imagePath, quality, maxWidth, format } = req.body || {};
    let input = imagePath;
    if (imageBase64) {
      input = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    }
    if (!input) {
      return res.status(400).json({ success: false, error: 'Gambar tidak diberikan (wajib imageBase64 atau imagePath).' });
    }
    const result = await mori.compressImage(input, { quality, maxWidth, format });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/omniget/tools/audio-normalize', authenticateToken, async (req, res) => {
  try {
    const { audioPath, targetLufs, audioBitrate, format } = req.body || {};
    const targetPath = audioPath || path.resolve('./tmp/downloader/audio/sample.mp3');
    const result = await mori.normalizeAudio(targetPath, { targetLufs, audioBitrate, format });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/omniget/tools/pdf-to-markdown', authenticateToken, async (req, res) => {
  try {
    const { pdfBase64, pdfPath } = req.body || {};
    let input = pdfPath;
    if (pdfBase64) {
      input = Buffer.from(pdfBase64.replace(/^data:application\/pdf;base64,/, ''), 'base64');
    }
    if (!input) {
      return res.status(400).json({ success: false, error: 'Dokumen PDF tidak diberikan.' });
    }
    const result = await mori.extractPdfToMarkdown(input);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Streaming Media Proxy
router.get('/proxy', async (req, res) => {
  try {
    const targetUrl = req.query.url;
    const filename = req.query.filename || 'media_download.mp4';
    const isInline = req.query.inline === '1' || req.query.inline === 'true';
    if (!targetUrl) return res.status(400).send('URL target parameter is required.');

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    if (isInline) {
      res.setHeader('Content-Disposition', 'inline');
    } else {
      const safeAscii = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      res.setHeader('Content-Disposition', `attachment; filename="${safeAscii}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    }

    let smartReferer = 'https://google.com/';
    const uLow = targetUrl.toLowerCase();
    if (uLow.includes('tiktok') || uLow.includes('byteoversea') || uLow.includes('ibytedtos')) {
      smartReferer = 'https://www.tiktok.com/';
    } else if (uLow.includes('instagram') || uLow.includes('cdninstagram')) {
      smartReferer = 'https://www.instagram.com/';
    } else if (uLow.includes('facebook') || uLow.includes('fbcdn')) {
      smartReferer = 'https://www.facebook.com/';
    } else if (uLow.includes('twitter') || uLow.includes('twimg') || uLow.includes('x.com')) {
      smartReferer = 'https://twitter.com/';
    } else if (uLow.includes('snaptik') || uLow.includes('rapidcdn')) {
      smartReferer = 'https://snaptik.app/';
    } else if (uLow.includes('youtube') || uLow.includes('googlevideo')) {
      smartReferer = 'https://www.youtube.com/';
    }

    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      'Referer': smartReferer,
      'Accept': '*/*',
    };

    if (req.headers.range) {
      fetchHeaders['Range'] = req.headers.range;
    }

    const upstreamRes = await fetch(targetUrl, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: fetchHeaders,
      redirect: 'follow',
      signal: AbortSignal.timeout(35000),
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return res.status(upstreamRes.status).json({
        success: false,
        error: `Upstream media server mengembalikan kode status ${upstreamRes.status} (${upstreamRes.statusText || 'Error'}). Tautan mungkin kedaluwarsa atau terkena batasan akses.`,
      });
    }

    res.status(upstreamRes.status);

    const passHeaders = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'last-modified',
      'etag',
    ];
    for (const h of passHeaders) {
      const val = upstreamRes.headers.get(h);
      if (val) res.setHeader(h, val);
    }

    if (req.method === 'HEAD') {
      return res.end();
    }

    const { Readable } = require('stream');
    Readable.fromWeb(upstreamRes.body).pipe(res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

module.exports = router;
