// server/routes/spotify.js — Spotify Cloud Streamer & Lyrics Studio Routes
const express = require('express');
const spotifyStreamService = require('../spotifyStreamService');

const router = express.Router();

// Resolve Spotify entity (track, playlist, album)
router.post('/resolve', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL Spotify (playlist, album, atau track) wajib disertakan.' });
    }
    const data = await spotifyStreamService.getSpotifyEntityData(url);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Ambil lirik sinkron / plain text
router.get('/lyrics', async (req, res) => {
  try {
    const { title, artist, duration } = req.query;
    if (!title) {
      return res.json({ success: true, hasLyrics: false, syncedLyrics: [], plainLyrics: '', message: 'Lirik kosong.' });
    }
    const durationSec = duration ? parseInt(duration, 10) : 180;
    const lyrics = await spotifyStreamService.getLyrics(title, artist || '', durationSec);
    res.json({ success: true, ...lyrics });
  } catch (err) {
    res.json({ success: true, hasLyrics: false, syncedLyrics: [], plainLyrics: '', error: err.message });
  }
});

// Temukan stream audio YouTube / Mori untuk lagu Spotify
router.get('/resolve-track', async (req, res) => {
  try {
    const { title, artist } = req.query;
    if (!title) {
      return res.status(400).json({ success: false, error: 'Parameter judul lagu (title) wajib diisi.' });
    }
    const moriStream = await spotifyStreamService.resolveMoriStream(title, artist || '');
    res.json({ success: true, ...moriStream });
  } catch (err) {
    console.warn('[Spotify resolve-track Error]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Terjemahkan baris lirik
router.post('/translate-lyrics', async (req, res) => {
  try {
    const { lines, text, targetLang } = req.body;
    const translation = await spotifyStreamService.translateLyrics(lines || text, targetLang || 'id');
    res.json({ success: true, ...translation });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Audio stream proxy
router.get('/stream-proxy', async (req, res) => {
  try {
    const audioUrl = req.query.url;
    if (!audioUrl) return res.status(400).send('URL audio streaming wajib diisi.');

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', 'inline; filename="spotify_stream.mp3"');

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': '*/*'
    };
    if (req.headers.range) {
      headers.Range = req.headers.range;
    }

    const upstream = await fetch(audioUrl, { headers });
    if (!upstream.ok) {
      return res.status(upstream.status).send(`Upstream audio error: ${upstream.statusText}`);
    }

    if (upstream.headers.get('content-range')) {
      res.status(206);
      res.setHeader('Content-Range', upstream.headers.get('content-range'));
    }
    if (upstream.headers.get('content-length')) {
      res.setHeader('Content-Length', upstream.headers.get('content-length'));
    }
    if (upstream.headers.get('accept-ranges')) {
      res.setHeader('Accept-Ranges', upstream.headers.get('accept-ranges'));
    } else {
      res.setHeader('Accept-Ranges', 'bytes');
    }

    const stream = upstream.body;
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).send(err.message);
    }
  }
});

module.exports = router;
