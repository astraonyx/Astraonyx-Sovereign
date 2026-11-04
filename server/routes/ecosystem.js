// server/routes/ecosystem.js — Astraonyx Ataraxia Ecosystem & Channel Control
const express = require('express');
const astraonyx = require('../../astraonyx');
const { authenticateToken, requireWriteAccess } = require('../auth');
const botEcosystemGroups = require('../../lib/botEcosystemGroups');
const channelFollower = require('../../lib/channelFollower');
const ecosystemNewsScheduler = require('../../lib/ecosystemNewsScheduler');
const botManager = require('../botManager');
const { db } = require('../db');

const astraonyxRouter = express.Router();
const ecosystemRouter = express.Router();

// ==================== ASTRAONYX ROUTER (/api/astraonyx) ====================

astraonyxRouter.get('/ecosystem', (req, res) => {
  res.json({
    success: true,
    ecosystem: astraonyx.ecosystem,
    pillars: [
      { id: 'polaris', name: 'Polaris', desc: 'WhatsApp Bot Platform & Hermes Autonomous AI Core' },
      { id: 'polarium', name: 'Polarium', desc: 'Social Media Platform (Feed, Stories 24h, E2EE DMs, Friends)' },
      { id: 'luminary', name: 'Luminary', desc: 'Studyspace & Productivity (Akademi, Tugas, PDF, Kapsul Waktu, Reminder)' },
      { id: 'starlium', name: 'Starlium', desc: 'Gaming & Gamifikasi Komunitas (Chess AI, Mabar, RPG Level, Boss Raid)' },
      { id: 'sanctum', name: 'Sanctum', desc: 'Pilar Eksklusif Khusus Owner (Terminal, ViewOnce Vault, Cluster Hub)' },
    ],
    totalCommands: astraonyx.shared.registry.COMMANDS.length,
  });
});

astraonyxRouter.get('/pillars/:pillarId', (req, res) => {
  const { pillarId } = req.params;
  const pillarCommands = astraonyx.shared.registry.getCommandsByPillar(pillarId);
  res.json({
    success: true,
    pillar: pillarId,
    commands: pillarCommands,
  });
});

// ==================== ECOSYSTEM ROUTER (/api/ecosystem) ====================

// Status Ekosistem & Saluran
ecosystemRouter.get('/status', authenticateToken, async (req, res) => {
  try {
    const ecoData = botEcosystemGroups.getSavedData();
    const chData = channelFollower.getSavedStatus();
    const newsCount = db.prepare('SELECT COUNT(*) as count FROM ecosystem_news').get()?.count || 0;

    let diagnostics = null;
    const activeSock = global.__activeWASocket;
    if (activeSock && typeof botEcosystemGroups.getEcosystemDiagnostics === 'function') {
      try {
        diagnostics = await botEcosystemGroups.getEcosystemDiagnostics(activeSock);
      } catch (_) {}
    }

    res.json({
      success: true,
      ecosystem: ecoData,
      channel: chData,
      newsStats: { totalNewsDispatched: newsCount },
      diagnostics,
      specs: botEcosystemGroups.ECOSYSTEM_SPECS,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bind grup ekosistem secara manual
ecosystemRouter.post('/bind', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const activeSock = global.__activeWASocket;
    if (!activeSock) {
      return res.status(400).json({ success: false, error: 'Bot belum tersambung ke WhatsApp. Tunggu status ONLINE.' });
    }

    const { key, groupJid } = req.body || {};
    if (!key || !groupJid) {
      return res.status(400).json({ success: false, error: 'Key kategori (key) dan JID grup (groupJid) wajib diisi.' });
    }

    const result = await botEcosystemGroups.bindGroupToEcosystem(activeSock, key, groupJid);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Siarkan rangkuman berita ekosistem
ecosystemRouter.post('/broadcast-news', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const activeSock = global.__activeWASocket;
    if (!activeSock) {
      return res.status(400).json({ success: false, error: 'Bot belum tersambung ke WhatsApp. Tunggu status ONLINE.' });
    }
    const result = await ecosystemNewsScheduler.broadcastNewsDigest(activeSock, true);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Pastikan bot mengikuti saluran resmi
ecosystemRouter.post('/follow-channel', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const activeSock = global.__activeWASocket;
    if (!activeSock) {
      return res.status(400).json({ success: false, error: 'Bot belum tersambung ke WhatsApp. Tunggu status ONLINE.' });
    }
    const result = await channelFollower.ensureChannelFollowed(activeSock);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Posting pesan ke Saluran Resmi
ecosystemRouter.post('/post-channel', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const activeSock = global.__activeWASocket;
    if (!activeSock) {
      return res.status(400).json({ success: false, error: 'Bot belum tersambung ke WhatsApp. Tunggu status ONLINE.' });
    }

    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Pesan postingan tidak boleh kosong.' });
    }

    const result = await channelFollower.postToChannel(activeSock, text.trim());
    if (!result.success && result.reason === 'INSUFFICIENT_PERMISSIONS') {
      return res.status(403).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Relink ekosistem
ecosystemRouter.post('/relink', authenticateToken, async (req, res) => {
  try {
    const result = await botManager.relinkEcosystem();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = {
  astraonyxRouter,
  ecosystemRouter,
};
