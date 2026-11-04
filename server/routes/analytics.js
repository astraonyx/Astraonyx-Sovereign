// server/routes/analytics.js — Analytics, Login Stats & Activity Graphs
const express = require('express');
const os = require('os');
const { authenticateToken } = require('../auth');
const { analyticsQueries, loginHistoryQueries } = require('../db');
const botManager = require('../botManager');

const router = express.Router();

// Ringkasan analitik sistem & bot
router.get('/summary', authenticateToken, (req, res) => {
  try {
    const summary = analyticsQueries.getSummary();
    const botStatus = botManager.getStatus();

    res.json({
      success: true,
      data: {
        ...summary,
        system: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          totalMem: os.totalmem(),
          freeMem: os.freemem(),
          platform: process.platform,
          nodeVersion: process.version,
          botOnline: botStatus.isOnline,
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Statistik login & riwayat sesi
router.get('/login-stats', authenticateToken, (req, res) => {
  try {
    const { range = 'day', from, to } = req.query;
    const stats = loginHistoryQueries.getLoginStats({ range, from, to });
    res.json({ success: true, ...stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
