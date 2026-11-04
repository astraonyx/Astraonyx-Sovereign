// server/routes/cluster.js — Bot Cluster Multi-Account Instances Router
const express = require('express');
const { authenticateToken, requireWriteAccess } = require('../auth');
const clusterManager = require('../clusterManager');
const botManager = require('../botManager');
const contactsManager = require('../../lib/contactsManager');

const router = express.Router();

// Daftar seluruh bot instances cluster
router.get('/instances', authenticateToken, (req, res) => {
  try {
    const instances = clusterManager.listInstances(botManager, req.user);
    res.json({ success: true, instances, quota: instances.quota });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Ringkasan statistik server bot (Total, Aktif, Non-aktif, Kapasitas) untuk Admin Panel Cosmos
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const stats = clusterManager.getServerClusterStats(botManager);
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Ubah batas kapasitas maksimal bot server (Khusus Cosmos)
router.post('/capacity', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const isCosmos = (req.user.role || '').toLowerCase() === 'cosmos';
    if (!isCosmos) {
      return res.status(403).json({ success: false, error: 'Akses ditolak: Hanya Cosmos Master yang dapat mengubah batas kapasitas bot server.' });
    }
    const { maxTotalBots } = req.body || {};
    const newLimit = clusterManager.setMaxTotalBots(maxTotalBots);
    res.json({ success: true, maxTotalBots: newLimit, message: `Batas kapasitas bot server berhasil diubah menjadi ${newLimit} bot.` });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Tambah bot instance baru (Hanya Overlord Tingkat 9 dan Cosmos Tingkat 10)
router.post('/instances', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const { getRoleLevel } = require('../auth');
    const userRole = req.user.role || 'member';
    const tierLevel = req.user.tierLevel || getRoleLevel(userRole);
    if (tierLevel < 9) {
      return res.status(403).json({
        success: false,
        error: 'Akses ditolak: Pembuatan bot WhatsApp eksklusif untuk tingkat Overlord (Tingkat 9) dan Cosmos (Tingkat 10). Hubungi Supreme Owner Cosmos untuk peningkatan hak akses.'
      });
    }

    const { name, role, prefix, ownerNumber } = req.body;
    const created = clusterManager.createInstance({
      name,
      role,
      prefix,
      ownerNumber,
      ownerUserId: req.user.id,
      ownerUsername: req.user.username,
      userTierLevel: tierLevel,
      userRole,
    });
    res.json({ success: true, instance: created });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update konfigurasi instance
router.put('/instances/:id/settings', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const { name, role, prefix, ownerNumber } = req.body || {};
    const updated = clusterManager.updateInstanceSettings(req.params.id, { name, role, prefix, ownerNumber }, req.user);
    res.json({ success: true, instance: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Jalankan instance bot
router.post('/instances/:id/start', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const result = await clusterManager.startInstance(req.params.id, {}, req.user);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Hentikan instance bot
router.post('/instances/:id/stop', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const result = await clusterManager.stopInstance(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Minta pairing code instance bot
router.post('/instances/:id/pair', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const { phoneNumber } = req.body || {};
    if (!phoneNumber) return res.status(400).json({ success: false, error: 'Nomor telepon WhatsApp wajib diisi.' });
    const result = await clusterManager.pairInstance(req.params.id, phoneNumber, req.headers.authorization, req.user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Restart instance bot
router.post('/instances/:id/restart', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const result = await clusterManager.restartBotInstance(req.params.id, req.headers.authorization, req.user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reset session instance bot
router.post('/instances/:id/reset-session', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const result = await clusterManager.resetSession(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Hapus instance bot
router.delete('/instances/:id', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const result = await clusterManager.deleteInstance(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Logs instance bot
router.get('/instances/:id/logs', authenticateToken, (req, res) => {
  try {
    const logs = clusterManager.getLogs(req.params.id, req.user);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Kontak instance bot
router.get('/instances/:id/contacts', authenticateToken, async (req, res) => {
  try {
    const instances = clusterManager.listInstances(botManager);
    const targetInst = instances.find((inst) => inst.id === req.params.id);
    if (!targetInst) return res.status(404).json({ success: false, error: 'Instance tidak ditemukan' });
    const contacts = contactsManager.getAllContacts(targetInst.isPrimary ? null : targetInst.id);
    res.json({ success: true, data: contacts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Profil instance bot
router.get('/instances/:id/profile', authenticateToken, async (req, res) => {
  try {
    const instances = clusterManager.listInstances(botManager);
    const targetInst = instances.find((inst) => inst.id === req.params.id);
    if (!targetInst) return res.status(404).json({ success: false, error: 'Instance tidak ditemukan' });
    const profile = contactsManager.getBotProfile(targetInst.isPrimary ? null : targetInst.id);
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
