// server.js — Astraonyx Ataraxia Core Operations Server (Modular Clean Architecture)
require('dotenv').config();

// Global resilience handler: cegah proses crash jika third-party stream atau request timeout
process.on('uncaughtException', (err) => {
  if (err && (err.name === 'TimeoutError' || err.message?.includes('aborted') || err.message?.includes('timeout'))) {
    console.warn('[Server Warning] Caught network timeout exception:', err.message);
    return;
  }
  console.error('[SERVER UNCAUGHT EXCEPTION]', err);
});

process.on('unhandledRejection', (reason) => {
  const msg = reason?.message || String(reason || '');
  if (msg.includes('aborted') || msg.includes('timeout') || reason?.name === 'TimeoutError') {
    console.warn('[Server Warning] Unhandled rejection timeout notice:', msg);
    return;
  }
  console.error('[SERVER UNHANDLED REJECTION]', reason);
});

const http = require('http');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const config = require('./config');
const botManager = require('./server/botManager');
const { setupWebSocket } = require('./server/wsServer');
const { UPLOADS_DIR } = require('./server/gdriveStorage');
const { registerModularRoutes } = require('./server/routes');
const { startCleanupScheduler } = require('./lib/cleanupScheduler');

const app = express();

// ==================== GLOBAL MIDDLEWARES ====================
// Kode bantuan per permintaan (PRD R-02): klien menampilkannya di layar galat supaya pengguna bisa melapor
// tanpa membuka detail teknis. Header keamanan dasar menyusul.
app.use((req, res, next) => {
  const incoming = req.headers['x-request-id'];
  req.id = typeof incoming === 'string' && /^[\w.-]{8,64}$/.test(incoming) ? incoming : crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ limit: '60mb', extended: true }));

// Sajikan folder uploads statis untuk media medsos & foto profil
app.use('/uploads', express.static(UPLOADS_DIR, {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }
}));

// Sajikan file statis frontend web dashboard.
//   js, css, html, json : selalu divalidasi ke server (ETag); tidak berubah → 304 tanpa unduh ulang.
//   font woff2          : cache setahun (nama berkas memuat bobot dan versi).
//   gambar, ikon        : cache sehari.
//   vendor/             : pustaka pihak ketiga, cache seminggu.
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.gif', '.avif']);
const staticDashboardOptions = {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.woff2') res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    else if (IMAGE_EXT.has(ext)) res.setHeader('Cache-Control', 'public, max-age=86400');
    else if (filePath.includes(`${path.sep}vendor${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=604800');
    else res.setHeader('Cache-Control', 'no-cache');
  }
};
app.use(express.static(path.join(__dirname, 'dashboard'), staticDashboardOptions));
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard'), staticDashboardOptions));

// Sajikan folder public/artifacts
app.use('/artifacts', express.static(path.join(__dirname, 'public/artifacts')));


// ==================== MODULAR ROUTES DISPATCHER ====================
// Seluruh rute API terdekomposisi rapi di server/routes/
registerModularRoutes(app);

// ==================== EXPLICIT STATIC PAGES ====================
app.get(['/welcome', '/welcome.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard', 'welcome.html'));
});

app.get(['/login', '/login.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard', 'login.html'));
});

app.get(['/404', '/404.html'], (req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'dashboard', '404.html'));
});

// ==================== 404 COSMIC FALLBACK HANDLER ====================
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: 'Endpoint API tidak ditemukan (404)', code: 'NOT_FOUND', requestId: req.id });
  }
  res.status(404).sendFile(path.join(__dirname, 'dashboard', '404.html'));
});

// ==================== ERROR HANDLER ====================
// Galat tak tertangani menjadi respons JSON yang aman (tanpa jejak tumpukan) lengkap dengan requestId.
app.use((err, req, res, next) => {
  console.error(`[server] ${req.method} ${req.originalUrl} (${req.id}):`, err && err.stack ? err.stack : err);
  if (res.headersSent) return next(err);
  let status = err && (err.status || err.statusCode) ? Number(err.status || err.statusCode) : 500;
  if (!(status >= 400 && status < 600)) status = 500;
  let message = 'Terjadi kesalahan pada server. Coba lagi sebentar lagi.';
  let code = 'INTERNAL_ERROR';
  if (err && err.type === 'entity.parse.failed') { status = 400; message = 'Isi permintaan bukan JSON yang valid.'; code = 'BAD_REQUEST'; }
  else if (err && err.type === 'entity.too.large') { status = 413; message = 'Ukuran permintaan terlalu besar.'; code = 'TOO_LARGE'; }
  else if (status < 500 && err && err.message) { message = err.message; code = 'BAD_REQUEST'; }
  if (req.path.startsWith('/api/')) return res.status(status).json({ success: false, error: message, code, requestId: req.id });
  res.status(status).type('text/plain').send(message);
});

// ==================== HTTP SERVER & WEBSOCKET ====================
const port = config.dashboardPort || 3000;
const server = http.createServer(app);
setupWebSocket(server);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ [PORT CONFLICT] Port ${port} sedang digunakan oleh proses lain!`);
    console.error(`💡 Solusi cepat:`);
    console.error(`   1. Hentikan proses Node yang sedang berjalan di port ${port}:`);
    console.error(`      - PowerShell: Stop-Process -Id (Get-NetTCPConnection -LocalPort ${port}).OwningProcess -Force`);
    console.error(`      - CMD:        taskkill /F /IM node.exe`);
    console.error(`   2. Atau ganti PORT di file .env (contoh: PORT=3005)\n`);
    process.exit(1);
  } else {
    console.error('[SERVER ERROR]', err);
  }
});

if (require.main === module) {
  server.listen(port, () => {
    console.log(`\n========================================================`);
    console.log(`🌟 [Polaris Project] Dashboard aktif di: http://localhost:${port}`);
    console.log(`⚡ [Architecture] Backend modular aktif (Straight Thread Clean Architecture)`);
    console.log(`========================================================\n`);

    // Auto-start Baileys WhatsApp bot socket
    botManager.startBot().catch((err) => {
      console.error('[botManager] Auto-start bot notice:', err.message);
    });

    // Jalankan scheduler pembersihan tmp otomatis
    startCleanupScheduler();
  });
}

module.exports = { app, server };
