// server/routes/index.js — Modular Routes Orchestrator for Polaris / Astraonyx Core
const fs = require('fs');
const path = require('path');
const authRouter = require('./auth');
const { socialRouter, friendsRouter } = require('./social');
const { wunaRouter, tokensRouter, databaseRouter } = require('./admin');
const { astraonyxRouter, ecosystemRouter } = require('./ecosystem');
const botRouter = require('./bot');
const downloaderRouter = require('./downloader');
const luminaRouter = require('./lumina');
const spotifyRouter = require('./spotify');
const analyticsRouter = require('./analytics');
const { gamesRouter, raidRouter } = require('./games');
const autorespondersRouter = require('./autoresponders');
const { dataRouter, contactsRouter, groupsRouter } = require('./data');
const storyRouter = require('./story');
const commandsRouter = require('./commands');
const clusterRouter = require('./cluster');
const { toolsRouter, tasksRouter, mediaRouter, systemRouter } = require('./tools');
const securityRouter = require('./security');
const hermesRouter = require('./hermes');
const waygroundRouter = require('./wayground');
const atomicRouter = require('./atomic');
const siriumRouter = require('./sirium');

/**
 * Muat rute tambahan dari server/routes/ext/*.js (urut alfabet; berkas berawalan "_" dilewati).
 * Setiap berkas mengekspor salah satu:
 *   { mount: '/api/nama', router }      router Express yang dipasang di mount
 *   (app) => void                       fungsi yang memasang rutenya sendiri
 * Tabel baru dibuat oleh modul itu sendiri saat dimuat (CREATE TABLE IF NOT EXISTS lewat db dari ../../db).
 * Modul yang gagal dimuat dicatat dan dilewati; modul lain dan rute inti tetap hidup.
 */
function loadExtensionRoutes(app) {
  const dir = path.join(__dirname, 'ext');
  if (!fs.existsSync(dir)) return [];
  const loaded = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js') && !f.startsWith('_')).sort()) {
    try {
      const mod = require(path.join(dir, file));
      if (typeof mod === 'function') {
        mod(app);
        loaded.push(file);
      } else if (mod && mod.mount && mod.router) {
        app.use(mod.mount, mod.router);
        loaded.push(file);
      } else {
        console.warn(`[routes] ext/${file} dilewati: ekspor harus { mount, router } atau fungsi (app).`);
      }
    } catch (err) {
      console.error(`[routes] ext/${file} gagal dimuat:`, err && err.stack ? err.stack : err);
    }
  }
  if (loaded.length) console.log(`[routes] rute tambahan dimuat: ${loaded.join(', ')}`);
  return loaded;
}

/**
 * Register all modular API routes onto Express application
 * @param {import('express').Application} app
 */
function registerModularRoutes(app) {
  // 1. Authentication & WUNA Tiers
  app.use('/api/auth', authRouter);

  // 2. Social Media & Friend Network
  app.use('/api/social', socialRouter);
  app.use('/api/friends', friendsRouter);

  // 3. Admin: WUNA User Management, Upgrade Tokens & Database Security
  app.use('/api/wuna', wunaRouter);
  app.use('/api/upgrade-tokens', tokensRouter);
  app.use('/api/database', databaseRouter);

  // 4. Ecosystem & Channel Control
  app.use('/api/astraonyx', astraonyxRouter);
  app.use('/api/ecosystem', ecosystemRouter);

  // 5. WhatsApp Bot Controller
  app.use('/api/bot', botRouter);

  // 6. Media Downloader Hub (Mori & OmniGet)
  app.use('/api/downloader', downloaderRouter);

  // 7. Lumina HD AI Image & Video Studio
  app.use('/api/lumina', luminaRouter);

  // 8. Spotify Streamer & Lyrics Studio
  app.use('/api/spotify', spotifyRouter);

  // 9. Analytics & Session Statistics
  app.use('/api/analytics', analyticsRouter);

  // 10. Games Arena, Mabar & Boss Raid
  app.use('/api/games', gamesRouter);
  app.use('/api/raid', raidRouter);

  // 11. Visual Autoresponder Engine
  app.use('/api/autoresponders', autorespondersRouter);

  // 12. Core Data, Whitelist, Groups & Contacts
  app.use('/api/data', dataRouter);
  app.use('/api/contacts', contactsRouter);
  app.use('/api/groups', groupsRouter);

  // 13. WhatsApp Story Studio & Templates
  app.use('/api/story', storyRouter);

  // 14. Command Manager & Custom Triggers
  app.use('/api/commands', commandsRouter);

  // 15. Multi-Bot Cluster Instances
  app.use('/api/cluster', clusterRouter);

  // 16. Web-to-APK Tools, Smart Tasks & Media Storage
  app.use('/api/tools', toolsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/media', mediaRouter);
  app.use('/api/system', systemRouter);

  // 17. Security & VirtexShield 2.0
  app.use('/api/security', securityRouter);

  // 18. Hermes Autonomous AI Agent Core
  app.use('/api/hermes', hermesRouter);

  // 19. Luminary Wayground (Quizizz) Learning Suite & Assessment Hub
  app.use('/api/wayground', waygroundRouter);

  // 20. Atomic Personal Productivity Suite (PRD F-HAB, F-TDO, F-SAV, F-EXE, F-MOO, F-JRN)
  app.use('/api/atomic', atomicRouter);

  // 21. Sirium Digital Asset Marketplace (PRD F-SKT, F-STR, F-SLS, F-SCO, F-SMD, F-SRW)
  app.use('/api/sirium', siriumRouter);

  // 22. Rute tambahan per fitur (server/routes/ext/*.js)
  loadExtensionRoutes(app);

  // 23. System Health Check for Docker / Watchdog
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      architecture: 'modular-polaris-v6',
    });
  });
}

module.exports = {
  authRouter,
  socialRouter,
  friendsRouter,
  wunaRouter,
  tokensRouter,
  databaseRouter,
  astraonyxRouter,
  ecosystemRouter,
  botRouter,
  downloaderRouter,
  luminaRouter,
  spotifyRouter,
  analyticsRouter,
  gamesRouter,
  raidRouter,
  autorespondersRouter,
  dataRouter,
  contactsRouter,
  groupsRouter,
  storyRouter,
  commandsRouter,
  clusterRouter,
  toolsRouter,
  tasksRouter,
  mediaRouter,
  systemRouter,
  securityRouter,
  hermesRouter,
  waygroundRouter,
  atomicRouter,
  siriumRouter,
  loadExtensionRoutes,
  registerModularRoutes,
};
