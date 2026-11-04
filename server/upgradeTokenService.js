// server/upgradeTokenService.js — Layanan Manajemen Token Naik Tingkat (Tier Upgrade Token)
// Token hanya dapat dibuat oleh Owner (Cosmos) dan dapat ditebus oleh siapapun untuk naik tingkat.

const crypto = require('crypto');
const { db } = require('./db');
const {
  readUsers,
  saveUsers,
  normalizeRole,
  getRoleLevel,
  getRoleInfo,
  WUNA_TIERS,
  ALLOWED_WUNA_ROLES,
} = require('./auth');

// Inisialisasi tabel SQLite untuk token & riwayat penukaran
function initTokenTables() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS upgrade_tokens (
        id TEXT PRIMARY KEY,
        token_code TEXT UNIQUE NOT NULL,
        target_role TEXT NOT NULL,
        max_uses INTEGER NOT NULL DEFAULT 1,
        used_count INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_by TEXT NOT NULL,
        notes TEXT DEFAULT '',
        expires_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_upgrade_tokens_code ON upgrade_tokens (token_code);

      CREATE TABLE IF NOT EXISTS token_redemptions (
        id TEXT PRIMARY KEY,
        token_id TEXT NOT NULL,
        token_code TEXT NOT NULL,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        previous_role TEXT NOT NULL,
        new_role TEXT NOT NULL,
        redeemed_via TEXT NOT NULL DEFAULT 'web', -- 'web' | 'bot_wa'
        phone_number TEXT DEFAULT '',
        redeemed_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_token_redemptions_user ON token_redemptions (user_id);
    `);
  } catch (err) {
    console.error('[upgradeTokenService] Error initTokenTables:', err.message);
  }
}

initTokenTables();

// Generate token code acak bergaya Polaris (contoh: POLARIS-STARLIGHT-9B1A)
function generateRandomCode(targetRole) {
  const normRole = normalizeRole(targetRole).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `POLARIS-${normRole}-${rand}`;
}

/**
 * Buat Token Naik Tingkat Baru (HANYA BISA OLEH OWNER / COSMOS)
 */
function createToken(actorId, { targetRole, maxUses = 1, customCode, notes = '', expiresInDays = null }) {
  const users = readUsers();
  const actor = users.find((u) => u.id === actorId);

  // Validasi hak akses Owner (Cosmos Level 10)
  if (!actor || normalizeRole(actor.role) !== 'cosmos') {
    throw new Error('Akses ditolak: Hanya akun tingkat Cosmos (Owner) yang dapat membuat token naik tingkat.');
  }

  const normalizedRole = normalizeRole(targetRole);
  if (!ALLOWED_WUNA_ROLES.includes(normalizedRole)) {
    throw new Error(`Target tier '${targetRole}' tidak valid. Pilihan: ${ALLOWED_WUNA_ROLES.join(', ')}.`);
  }

  let code = customCode ? String(customCode).trim().toUpperCase() : generateRandomCode(normalizedRole);
  code = code.replace(/[^A-Z0-9_-]/g, '');

  if (code.length < 4) {
    throw new Error('Kode token minimal 4 karakter.');
  }

  // Cek duplikasi kode token
  const existing = db.prepare('SELECT id FROM upgrade_tokens WHERE token_code = ?').get(code);
  if (existing) {
    throw new Error(`Kode token '${code}' sudah digunakan. Silakan gunakan kode lain.`);
  }

  const id = 'tok_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
  const now = new Date().toISOString();
  let expiresAt = null;

  if (expiresInDays && Number(expiresInDays) > 0) {
    const expDate = new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000);
    expiresAt = expDate.toISOString();
  }

  const cleanMaxUses = Math.max(1, parseInt(String(maxUses), 10) || 1);

  db.prepare(`
    INSERT INTO upgrade_tokens 
    (id, token_code, target_role, max_uses, used_count, is_active, created_by, notes, expires_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, 1, ?, ?, ?, ?, ?)
  `).run(id, code, normalizedRole, cleanMaxUses, actor.username, String(notes || '').slice(0, 200), expiresAt, now, now);

  const roleInfo = getRoleInfo(normalizedRole);

  return {
    id,
    tokenCode: code,
    targetRole: normalizedRole,
    targetRoleInfo: roleInfo,
    maxUses: cleanMaxUses,
    usedCount: 0,
    isActive: true,
    createdBy: actor.username,
    notes,
    expiresAt,
    createdAt: now,
  };
}

/**
 * Ambil Seluruh Daftar Token (HANYA BISA OLEH OWNER / COSMOS)
 */
function getAllTokens(actorId) {
  const users = readUsers();
  const actor = users.find((u) => u.id === actorId);

  if (!actor || normalizeRole(actor.role) !== 'cosmos') {
    throw new Error('Akses ditolak: Hanya akun tingkat Cosmos (Owner) yang dapat melihat daftar token.');
  }

  const rows = db.prepare('SELECT * FROM upgrade_tokens ORDER BY created_at DESC').all();

  return rows.map((r) => {
    const roleInfo = getRoleInfo(r.target_role);
    const isExpired = r.expires_at ? new Date(r.expires_at) < new Date() : false;
    return {
      id: r.id,
      tokenCode: r.token_code,
      targetRole: r.target_role,
      targetRoleInfo: roleInfo,
      maxUses: r.max_uses,
      usedCount: r.used_count,
      remainingUses: Math.max(0, r.max_uses - r.used_count),
      isActive: Boolean(r.is_active) && !isExpired && r.used_count < r.max_uses,
      isExpired,
      createdBy: r.created_by,
      notes: r.notes || '',
      expiresAt: r.expires_at,
      createdAt: r.created_at,
    };
  });
}

/**
 * Hapus / Nonaktifkan Token (HANYA BISA OLEH OWNER / COSMOS)
 */
function deleteToken(actorId, tokenId) {
  const users = readUsers();
  const actor = users.find((u) => u.id === actorId);

  if (!actor || normalizeRole(actor.role) !== 'cosmos') {
    throw new Error('Akses ditolak: Hanya akun tingkat Cosmos (Owner) yang dapat menghapus token.');
  }

  const token = db.prepare('SELECT * FROM upgrade_tokens WHERE id = ? OR token_code = ?').get(tokenId, tokenId);
  if (!token) throw new Error('Token tidak ditemukan.');

  db.prepare('DELETE FROM upgrade_tokens WHERE id = ?').run(token.id);

  return { success: true, message: `Token '${token.token_code}' berhasil dihapus.` };
}

/**
 * Tebus / Gunakan Token untuk Naik Tingkat (Bisa Digunakan Siapa Saja)
 */
function redeemToken(userIdentifier, rawTokenCode, redeemedVia = 'web') {
  if (!rawTokenCode || typeof rawTokenCode !== 'string') {
    throw new Error('Kode token wajib diisi.');
  }

  const cleanCode = String(rawTokenCode).trim().toUpperCase();
  const token = db.prepare('SELECT * FROM upgrade_tokens WHERE token_code = ?').get(cleanCode);

  if (!token) {
    throw new Error(`Token '${cleanCode}' tidak ditemukan atau tidak valid.`);
  }

  if (!token.is_active) {
    throw new Error(`Token '${cleanCode}' sudah tidak aktif.`);
  }

  if (token.expires_at && new Date(token.expires_at) < new Date()) {
    throw new Error(`Token '${cleanCode}' telah kadaluarsa pada ${new Date(token.expires_at).toLocaleString('id-ID')}.`);
  }

  if (token.used_count >= token.max_uses) {
    throw new Error(`Token '${cleanCode}' sudah mencapai batas maksimum pemakaian (${token.max_uses}/${token.max_uses}).`);
  }

  // Cari user target
  const users = readUsers();
  const cleanId = String(userIdentifier).trim().toLowerCase();
  const cleanPhone = String(userIdentifier).trim().replace(/[^0-9]/g, '');

  let user = users.find((u) => {
    return u.id === userIdentifier ||
      u.username.toLowerCase() === cleanId ||
      (cleanPhone && u.phoneNumber && u.phoneNumber.replace(/[^0-9]/g, '') === cleanPhone);
  });

  if (!user) {
    throw new Error(`Pengguna '${userIdentifier}' tidak ditemukan di database.`);
  }

  const previousRole = normalizeRole(user.role);
  const targetRole = normalizeRole(token.target_role);

  // Perbarui role user di database
  user.role = targetRole;
  saveUsers(users);

  // Update counter pemakaian token di SQLite
  const newUsedCount = token.used_count + 1;
  const newIsActive = newUsedCount < token.max_uses ? 1 : 0;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE upgrade_tokens 
    SET used_count = ?, is_active = ?, updated_at = ? 
    WHERE id = ?
  `).run(newUsedCount, newIsActive, now, token.id);

  // Catat riwayat penukaran token
  const redemptionId = 'red_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
  db.prepare(`
    INSERT INTO token_redemptions 
    (id, token_id, token_code, user_id, username, previous_role, new_role, redeemed_via, phone_number, redeemed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(redemptionId, token.id, token.token_code, user.id, user.username, previousRole, targetRole, redeemedVia, user.phoneNumber || '', now);

  const targetRoleInfo = getRoleInfo(targetRole);
  const previousRoleInfo = getRoleInfo(previousRole);

  return {
    success: true,
    tokenCode: token.token_code,
    user: {
      id: user.id,
      username: user.username,
      phoneNumber: user.phoneNumber || '',
      previousRole,
      newRole: targetRole,
      tierLevel: getRoleLevel(targetRole),
      roleInfo: targetRoleInfo,
    },
    previousRoleInfo,
    targetRoleInfo,
    message: `Selamat! Akun '${user.username}' berhasil dinaikkan dari [${previousRole.toUpperCase()}] ke [${targetRole.toUpperCase()}] (${targetRoleInfo.name})!`,
  };
}

/**
 * Riwayat Seluruh Penukaran Token (Khusus Owner)
 */
function getRedemptions(actorId) {
  const users = readUsers();
  const actor = users.find((u) => u.id === actorId);

  if (!actor || normalizeRole(actor.role) !== 'cosmos') {
    throw new Error('Akses ditolak: Hanya akun tingkat Cosmos (Owner) yang dapat melihat riwayat penukaran token.');
  }

  return db.prepare('SELECT * FROM token_redemptions ORDER BY redeemed_at DESC LIMIT 100').all();
}

module.exports = {
  createToken,
  getAllTokens,
  deleteToken,
  redeemToken,
  getRedemptions,
};
