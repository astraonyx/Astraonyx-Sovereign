// server/routes/admin.js — WUNA User Management, Upgrade Tokens & Database Security
const express = require('express');
const {
  getAllWunaUsers,
  adminCreateWunaUser,
  updateWunaRole,
  toggleBanWunaUser,
  adminSetWunaPassword,
  adminSetUserPin,
  adminResetUserPin,
  deleteWunaUser,
  authenticateToken,
  requireRole,
} = require('../auth');
const upgradeTokenService = require('../upgradeTokenService');
const { broadcastWs } = require('../wsServer');
const { dbSecurity } = require('../db');

const wunaRouter = express.Router();
const tokensRouter = express.Router();
const databaseRouter = express.Router();

// ==================== WUNA USER MANAGEMENT (/api/wuna) ====================

// Ambil seluruh akun WUNA (Cosmos Only)
wunaRouter.get('/users', authenticateToken, requireRole(['cosmos']), (req, res) => {
  try {
    const list = getAllWunaUsers(req.user.id);
    res.json({ success: true, users: list });
  } catch (err) {
    res.status(403).json({ success: false, error: err.message });
  }
});

// Buat akun WUNA baru secara manual oleh Cosmos
wunaRouter.post('/create', authenticateToken, requireRole(['cosmos']), async (req, res) => {
  try {
    const { username, password, role, linkedOwnerNumber, pin, phoneNumber, phone } = req.body || {};
    const result = await adminCreateWunaUser(req.user.id, {
      username,
      password,
      role,
      linkedOwnerNumber,
      pin,
      phoneNumber: phoneNumber || phone || linkedOwnerNumber,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update role / tier akun
wunaRouter.post('/role', authenticateToken, requireRole(['cosmos']), (req, res) => {
  try {
    const { targetUserId, role } = req.body || {};
    const result = updateWunaRole(req.user.id, targetUserId, role);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Toggle ban / unban akun
wunaRouter.post('/ban', authenticateToken, requireRole(['cosmos']), (req, res) => {
  try {
    const { targetUserId, isBanned } = req.body || {};
    const result = toggleBanWunaUser(req.user.id, targetUserId, isBanned);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Ganti password akun oleh Cosmos
wunaRouter.post('/password', authenticateToken, requireRole(['cosmos']), async (req, res) => {
  try {
    const { targetUserId, newPassword } = req.body || {};
    const result = await adminSetWunaPassword(req.user.id, targetUserId, newPassword);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Ganti PIN 2FA akun oleh Cosmos
wunaRouter.post('/pin', authenticateToken, requireRole(['cosmos']), async (req, res) => {
  try {
    const { targetUserId, newPin } = req.body || {};
    const result = await adminSetUserPin(req.user.id, targetUserId, newPin);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Reset PIN 2FA akun ke default (111111) oleh Cosmos
wunaRouter.post('/reset-pin', authenticateToken, requireRole(['cosmos']), async (req, res) => {
  try {
    const { targetUserId } = req.body || {};
    const result = await adminResetUserPin(req.user.id, targetUserId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Hapus akun WUNA
wunaRouter.delete('/user/:id', authenticateToken, requireRole(['cosmos']), (req, res) => {
  try {
    const result = deleteWunaUser(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==================== TIER UPGRADE TOKENS (/api/upgrade-tokens) ====================

// Buat token upgrade tingkat (Cosmos Only)
tokensRouter.post('/create', authenticateToken, requireRole(['cosmos']), (req, res) => {
  try {
    const { targetRole, maxUses, customCode, notes, expiresInDays } = req.body || {};
    const token = upgradeTokenService.createToken(req.user.id, {
      targetRole,
      maxUses,
      customCode,
      notes,
      expiresInDays,
    });
    res.json({ success: true, token });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Daftar seluruh token aktif (Cosmos Only)
tokensRouter.get('/list', authenticateToken, requireRole(['cosmos']), (req, res) => {
  try {
    const tokens = upgradeTokenService.getAllTokens(req.user.id);
    res.json({ success: true, tokens });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Hapus token (Cosmos Only)
tokensRouter.delete('/:id', authenticateToken, requireRole(['cosmos']), (req, res) => {
  try {
    const result = upgradeTokenService.deleteToken(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Riwayat penukaran token (Cosmos Only)
tokensRouter.get('/redemptions', authenticateToken, requireRole(['cosmos']), (req, res) => {
  try {
    const redemptions = upgradeTokenService.getRedemptions(req.user.id);
    res.json({ success: true, redemptions });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Redeem Token (Bisa digunakan oleh semua akun terdaftar)
tokensRouter.post('/redeem', authenticateToken, (req, res) => {
  try {
    const { tokenCode } = req.body || {};
    const result = upgradeTokenService.redeemToken(req.user.id, tokenCode, 'web');

    broadcastWs('USER_TIER_UPGRADED', {
      userId: req.user.id,
      username: req.user.username,
      newRole: result.user.newRole,
      roleInfo: result.targetRoleInfo,
    }, { to: [req.user.id], alsoCosmos: true });

    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==================== DATABASE SECURITY & BACKUPS (/api/database) ====================

// Buat snapshot backup database
databaseRouter.post('/backup', authenticateToken, requireRole(['cosmos']), async (req, res) => {
  try {
    const result = await dbSecurity.createBackup();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Daftar file backup
databaseRouter.get('/backups', authenticateToken, requireRole(['cosmos']), (req, res) => {
  try {
    const backups = dbSecurity.listBackups();
    res.json({ success: true, backups });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Uji integritas SQLite database
databaseRouter.get('/integrity', authenticateToken, requireRole(['cosmos']), (req, res) => {
  try {
    const status = dbSecurity.runIntegrityCheck();
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = {
  wunaRouter,
  tokensRouter,
  databaseRouter,
};
