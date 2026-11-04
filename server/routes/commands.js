// server/routes/commands.js — Bot Commands Registry, Custom Triggers & Overrides
const express = require('express');
const { authenticateToken, requireWriteAccess } = require('../auth');
const {
  getAllCommands,
  getAllCustomCommands,
  setCommandOverride,
  createCustomCommand,
  updateCustomCommand,
  deleteCustomCommand,
  importCustomCommands,
  exportCustomCommands,
  bulkToggleAllCommands,
} = require('../commandManager');

const router = express.Router();

// Daftar seluruh command bot bawaan + kustom
router.get('/', authenticateToken, async (req, res) => {
  try {
    const instanceId = req.query.instanceId || req.query.botId || 'primary';
    const commands = await getAllCommands(instanceId);
    res.json({ success: true, data: commands, instanceId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Daftar command kustom
router.get('/custom', authenticateToken, (req, res) => {
  try {
    const instanceId = req.query.instanceId || req.query.botId || 'primary';
    const commands = getAllCustomCommands(instanceId);
    res.json({ success: true, commands, count: commands.length, instanceId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Atur override command bawaan
router.post('/override', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const { name, enabled, customResponse, outputRouting, permission } = req.body;
    const instanceId = req.body.instanceId || req.query.instanceId || 'primary';
    const result = setCommandOverride(name, { enabled, customResponse, outputRouting, permission }, instanceId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Toggle seluruh command secara massal
router.post('/bulk-toggle', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const { enabled } = req.body;
    const instanceId = req.body.instanceId || req.query.instanceId || 'primary';
    const result = bulkToggleAllCommands(!!enabled, instanceId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Buat command kustom baru
router.post('/custom', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const { name, response, desc, category, permission, outputRouting } = req.body;
    const instanceId = req.body.instanceId || req.query.instanceId || 'primary';
    const result = createCustomCommand({ name, response, desc, category, permission, outputRouting }, instanceId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update command kustom
router.put('/custom/:name', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const instanceId = req.body.instanceId || req.query.instanceId || 'primary';
    const result = updateCustomCommand(req.params.name, req.body, instanceId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Hapus command kustom
router.delete('/custom/:name', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const instanceId = req.body.instanceId || req.query.instanceId || 'primary';
    const result = deleteCustomCommand(req.params.name, instanceId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Impor command kustom
router.post('/import', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const rawCommands = req.body.commands || req.body.items || (Array.isArray(req.body) ? req.body : null);
    const overwrite = req.body.overwrite !== undefined ? req.body.overwrite : true;
    const instanceId = req.body.instanceId || req.query.instanceId || 'primary';
    const result = importCustomCommands(rawCommands, overwrite, instanceId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Ekspor command kustom
router.get('/export', authenticateToken, (req, res) => {
  try {
    const instanceId = req.query.instanceId || req.query.botId || 'primary';
    const data = exportCustomCommands(instanceId);
    res.setHeader('Content-Disposition', `attachment; filename="polaris-custom-commands-${instanceId}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
