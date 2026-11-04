// server/routes/security.js — Security & Anti-Virtex 2.0 Shield Router
const express = require('express');
const { authenticateToken, requireWriteAccess } = require('../auth');
const virtexShield = require('../../lib/virtexShield');

const router = express.Router();

// Statistik pertahanan Virtex & pesan berbahaya
router.get('/virtex-stats', authenticateToken, (req, res) => {
  try {
    const stats = virtexShield.getDefenseStats();
    res.json({ success: true, ...stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Toggle aktifkan/nonaktifkan tameng Polaris Sentinel
router.post('/toggle-shield', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const { active } = req.body || {};
    const state = virtexShield.setShieldActive(active);
    res.json({
      success: true,
      shieldActive: state,
      message: state ? 'Polaris Sentinel Shield aktif.' : 'Polaris Sentinel Shield dinonaktifkan sementara.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Uji coba scan simulasi payload virtex
router.post('/test-payload', authenticateToken, (req, res) => {
  try {
    const { payload, jsonPayload } = req.body || {};
    const input = jsonPayload || payload || '';
    const result = virtexShield.simulateScan(input);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
