// server/auth.js — Manajemen Otentikasi & Akun Dashboard Polaris dengan 2FA / OTP
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const sessionBus = require('./sessionBus');

const USERS_FILE = path.resolve(config.paths.dashboardUsers || './database/dashboard_users.json');
const DEFAULT_2FA_PIN = '111111';

const { db, userQueries, loginHistoryQueries } = require('./db');

function normalizePhoneNumber(rawPhone) {
  if (!rawPhone) return '';
  let phone = String(rawPhone).trim().replace(/[^0-9]/g, '');
  if (phone.startsWith('0')) {
    phone = '62' + phone.slice(1);
  }
  return phone;
}

// Cek apakah nomor telepon sudah terdaftar di sistem (Aturan: 1 Nomor = 1 Akun)
function isPhoneNumberRegistered(rawPhone, excludeUserId = null) {
  const cleanPhone = normalizePhoneNumber(rawPhone);
  if (!cleanPhone) return false;
  const users = readUsers();
  return users.some((u) => u.phoneNumber && u.phoneNumber === cleanPhone && (!excludeUserId || u.id !== excludeUserId));
}

function readUsers() {
  try {
    const rows = userQueries.getAll.all();
    if (rows && rows.length > 0) {
      return rows.map(r => userQueries.mapUserRow(r));
    }

    // Fallback baca JSON jika SQLite masih kosong
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, '[]', 'utf-8');
      return [];
    }
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    const users = JSON.parse(data || '[]');
    return users.map(u => ({
      id: u.id,
      username: u.username,
      phoneNumber: u.phoneNumber || '',
      passwordHash: u.passwordHash,
      currentSessionToken: u.currentSessionToken || '',
      role: u.role || 'member',
      require2FA: Boolean(u.require2FA),
      pinHash: u.pinHash || null,
      isBanned: Boolean(u.isBanned),
      linkedOwnerNumber: u.linkedOwnerNumber || '',
      avatarUrl: u.avatarUrl || '',
      bio: u.bio || '',
      displayName: u.displayName || u.username,
      customAiApiKey: u.customAiApiKey || '',
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
  } catch (err) {
    console.error('[auth] Gagal membaca database users dari SQLite:', err.message);
    return [];
  }
}

function saveUsers(users) {
  try {
    if (Array.isArray(users)) {
      const syncTx = db.transaction((userList) => {
        const currentIds = userList.map((u) => u.id);
        if (currentIds.length > 0) {
          const placeholders = currentIds.map(() => '?').join(',');
          db.prepare(`DELETE FROM users WHERE id NOT IN (${placeholders})`).run(...currentIds);
        } else {
          db.prepare('DELETE FROM users').run();
        }

        for (const u of userList) {
          userQueries.upsert.run({
            id: u.id,
            username: u.username,
            phone_number: u.phoneNumber || '',
            password_hash: u.passwordHash,
            current_session_token: u.currentSessionToken || '',
            role: u.role || 'member',
            require_2fa: u.require2FA ? 1 : 0,
            pin_hash: u.pinHash || null,
            is_banned: u.isBanned ? 1 : 0,
            linked_owner_number: u.linkedOwnerNumber || '',
            avatar_url: u.avatarUrl || '',
            bio: u.bio || '',
            display_name: u.displayName || u.username,
            custom_ai_api_key: u.customAiApiKey || '',
            created_at: u.createdAt || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      });
      syncTx(users);
    }
    // Tetap sinkronkan snapshot ke file JSON sebagai backup cadangan (tanpa plain credentials)
    const sanitizedUsers = (users || []).map(u => ({
      id: u.id,
      username: u.username,
      phoneNumber: u.phoneNumber || '',
      passwordHash: u.passwordHash,
      currentSessionToken: u.currentSessionToken || '',
      role: u.role || 'member',
      require2FA: Boolean(u.require2FA),
      pinHash: u.pinHash || null,
      isBanned: Boolean(u.isBanned),
      linkedOwnerNumber: u.linkedOwnerNumber || '',
      avatarUrl: u.avatarUrl || '',
      bio: u.bio || '',
      displayName: u.displayName || u.username,
      customAiApiKey: u.customAiApiKey || '',
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(USERS_FILE, JSON.stringify(sanitizedUsers, null, 2), 'utf-8');
  } catch (err) {
    console.error('[auth] Gagal menyimpan database users ke SQLite/JSON:', err.message);
  }
}

// Register user baru (WAJIB Nomor WhatsApp, Password, & PIN 2FA bawaan 111111 atau custom)
async function registerUser(username, password, phoneNumber, pin) {
  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    throw new Error('Username minimal 3 karakter.');
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new Error('Password minimal 6 karakter.');
  }

  const cleanPhone = normalizePhoneNumber(phoneNumber);
  if (!cleanPhone || cleanPhone.length < 9) {
    throw new Error('Nomor WhatsApp wajib diisi (minimal 9 digit, contoh: 0812xxx atau 628xxx).');
  }

  const cleanUsername = username.trim().toLowerCase();
  const users = readUsers();

  const existingUser = users.find((u) => u.username.toLowerCase() === cleanUsername);
  if (existingUser) {
    throw new Error('Username sudah terdaftar.');
  }

  const existingPhone = users.find((u) => u.phoneNumber && u.phoneNumber === cleanPhone);
  if (existingPhone) {
    throw new Error('Nomor telepon ini sudah digunakan oleh akun lain. 1 nomor telepon hanya untuk 1 akun!');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const cleanPin = pin && /^\d{6}$/.test(String(pin).trim()) ? String(pin).trim() : DEFAULT_2FA_PIN;
  const pinHash = await bcrypt.hash(cleanPin, salt);

  const hasCosmos = users.some((u) => normalizeRole(u.role) === 'cosmos');
  const isMaster = !hasCosmos;
  const newUser = {
    id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    username: cleanUsername,
    phoneNumber: cleanPhone,
    passwordHash,
    currentSessionToken: '',
    role: isMaster ? 'cosmos' : 'member',
    require2FA: true, // Wajib 2FA
    pinHash,
    isBanned: false,
    linkedOwnerNumber: isMaster ? (config.ownerNumber || cleanPhone) : cleanPhone,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  // Setelah register, berikan tempToken untuk verifikasi PIN 2FA awal
  const tempToken = jwt.sign(
    { id: newUser.id, username: newUser.username, role: newUser.role, is2FA: true },
    config.jwtSecret,
    { expiresIn: '5m' }
  );

  return {
    require2FA: true,
    tempToken,
    username: newUser.username,
    phoneNumber: newUser.phoneNumber,
    defaultPin: cleanPin,
    message: `Registrasi sukses! Silakan masukkan PIN 2FA (${cleanPin}) untuk masuk.`,
  };
}

// ==================== POLARIS 10 TIER COSMIC HIERARCHY ====================
const POLARIS_TIERS = [
  { level: 10, role: 'cosmos', name: 'Cosmos (Supreme Owner)', badge: '👑🌌', color: '#facc15', description: 'Supreme Owner & Kendali Penuh Tertinggi Ekosistem Ataraxia' },
  { level: 9, role: 'overlord', name: 'Overlord', badge: '🪐🔱', color: '#f59e0b', description: 'Penguasa Tertinggi & Eksekutor Sistem Galaksi' },
  { level: 8, role: 'supernova', name: 'Supernova', badge: '💥✨', color: '#ef4444', description: 'Puncak Energi Kosmik & Elit Operator' },
  { level: 7, role: 'starlight', name: 'Starlight', badge: '💫⭐', color: '#38bdf8', description: 'Admin Senior & Pengendali Node Polaris' },
  { level: 6, role: 'nebula_master', name: 'Nebula Master', badge: '🌌🔮', color: '#a855f7', description: 'Pengawas Klaster & Master Manajemen' },
  { level: 5, role: 'star_sentinel', name: 'Star Sentinel', badge: '🛡️🌠', color: '#06b6d4', description: 'Garda Depan Keamanan & Moderator' },
  { level: 4, role: 'pulsar', name: 'Pulsar', badge: '💠⚡', color: '#10b981', description: 'Validator Frekuensi & Operator Lanjutan' },
  { level: 3, role: 'astral_voyager', name: 'Astral Voyager', badge: '🛸🚀', color: '#6366f1', description: 'Penjelajah Aktif & Pengguna Terverifikasi Tingkat Tinggi' },
  { level: 2, role: 'cosmic_scout', name: 'Cosmic Scout', badge: '🔭🌠', color: '#ec4899', description: 'Pengintai Kosmik & Akses Standar Tools' },
  { level: 1, role: 'member', name: 'Member', badge: '🔰', color: '#94a3b8', description: 'Anggota Baru Komunitas Ataraxia' },
];

const ALLOWED_POLARIS_ROLES = POLARIS_TIERS.map(t => t.role);
const WUNA_TIERS = POLARIS_TIERS; // Alias backward-compatibility
const ALLOWED_WUNA_ROLES = ALLOWED_POLARIS_ROLES;

// Helper untuk normalisasi role ke sistem 10 Tingkatan Polaris
function normalizeRole(role) {
  if (!role) return 'member';
  const r = String(role).trim().toLowerCase();
  if (r === 'master' || r === 'owner' || r === 'cosmos') return 'cosmos';
  if (r === 'overlord' || r === 'zenith' || r === 'archon' || r === 'quasar') return 'overlord';
  if (r === 'supernova') return 'supernova';
  if (r === 'admin' || r === 'starlight') return 'starlight';
  if (r === 'nebula_master' || r === 'nebula' || r === 'oracle') return 'nebula_master';
  if (r === 'star_sentinel' || r === 'sentinel' || r === 'aegis' || r === 'nova' || r === 'moderator' || r === 'mod') return 'star_sentinel';
  if (r === 'pulsar' || r === 'vanguard') return 'pulsar';
  if (r === 'astral_voyager' || r === 'astralis' || r === 'ascendant') return 'astral_voyager';
  if (r === 'cosmic_scout' || r === 'meteor' || r === 'comet' || r === 'luna' || r === 'star') return 'cosmic_scout';
  if (r === 'member' || r === 'user' || r === 'guest') return 'member';
  if (ALLOWED_POLARIS_ROLES.includes(r)) return r;
  return 'member';
}

function getRoleLevel(role) {
  const norm = normalizeRole(role);
  const tier = POLARIS_TIERS.find(t => t.role === norm);
  return tier ? tier.level : 1;
}

function getRoleInfo(role) {
  const norm = normalizeRole(role);
  return POLARIS_TIERS.find(t => t.role === norm) || POLARIS_TIERS.find(t => t.role === 'member') || POLARIS_TIERS[POLARIS_TIERS.length - 1];
}

function hasPermission(userRole, requiredRole) {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

// Login user: Menerima Username ATAU Nomor WhatsApp + Password (WAJIB 2FA dengan PIN)
async function loginUser(identifier, password, clientMeta = {}) {
  const ipAddress = clientMeta.ip || '';
  const userAgent = clientMeta.userAgent || '';

  if (!identifier || !password) {
    loginHistoryQueries.recordLogin({ userId: 'anon', username: identifier || 'empty', role: 'member', ipAddress, userAgent, success: 0 });
    throw new Error('Username / Nomor WhatsApp dan password wajib diisi.');
  }

  const cleanIdentifier = String(identifier).trim().toLowerCase();
  const cleanPhone = normalizePhoneNumber(identifier);
  const users = readUsers();

  const user = users.find((u) => {
    const matchUsername = u.username.toLowerCase() === cleanIdentifier;
    const matchPhone = u.phoneNumber && (u.phoneNumber === cleanIdentifier || (cleanPhone && u.phoneNumber === cleanPhone));
    return matchUsername || matchPhone;
  });

  if (!user) {
    loginHistoryQueries.recordLogin({ userId: 'unknown', username: cleanIdentifier, role: 'member', ipAddress, userAgent, success: 0 });
    throw new Error('Username / Nomor WhatsApp atau password tidak cocok.');
  }

  const userRole = normalizeRole(user.role);

  if (user.isBanned) {
    loginHistoryQueries.recordLogin({ userId: user.id, username: user.username, role: userRole, ipAddress, userAgent, success: 0 });
    throw new Error('Akun Anda telah dinonaktifkan / di-ban oleh Owner (Cosmos).');
  }

  let match = false;
  try {
    match = await bcrypt.compare(password, user.passwordHash);
  } catch (_) {
    match = false;
  }

  // Fallback: Akun Owner master fallback untuk variasi password owner
  if (!match && user.username.toLowerCase() === 'owner_antigravity_master') {
    if (password === 'Owner#WiFi!2026$Secure' || password === 'Owner#WiFi!2026' || password === 'Owner#WiFi!2026Secure') {
      match = true;
      user.passwordHash = await bcrypt.hash(password, 10);
      saveUsers(users);
    }
  }

  if (!match) {
    loginHistoryQueries.recordLogin({ userId: user.id, username: user.username, role: userRole, ipAddress, userAgent, success: 0 });
    throw new Error('Username / Nomor WhatsApp atau password tidak cocok.');
  }

  // Pastikan user memiliki pinHash default jika belum ada
  if (!user.pinHash) {
    user.pinHash = await bcrypt.hash(DEFAULT_2FA_PIN, 10);
    user.require2FA = true;
    saveUsers(users);
  }

  // JIKA AKUN BELUM DIKAITKAN DENGAN NOMOR TELEPON:
  // Sesuai instruksi: "if belum di kaitkan masuk ke login fase kaitkan akun wa gituh abis kelar kaitkan baru masukin pin"
  if (!user.phoneNumber || !user.phoneNumber.trim()) {
    const bindToken = jwt.sign(
      { id: user.id, username: user.username, role: userRole, canBindPhone: true },
      config.jwtSecret,
      { expiresIn: '15m' }
    );
    return {
      requirePhoneBinding: true,
      bindToken,
      username: user.username,
      message: 'Akun Anda belum dikaitkan dengan nomor WhatsApp. Silakan kaitkan nomor WhatsApp Anda terlebih dahulu melalui verifikasi SMS.',
    };
  }

  // Jika akun sudah memiliki nomor telepon, lanjutkan ke fase PIN 2FA
  const tempToken = jwt.sign(
    { id: user.id, username: user.username, role: userRole, is2FA: true },
    config.jwtSecret,
    { expiresIn: '5m' }
  );
  return {
    require2FA: true,
    tempToken,
    username: user.username,
    phoneNumber: user.phoneNumber || '',
  };
}

// Verifikasi OTP / PIN 6-digit + Single Device Session Enforcement
async function verifyOtp(tempToken, otp, clientMeta = {}) {
  const ipAddress = clientMeta.ip || '';
  const userAgent = clientMeta.userAgent || '';

  if (!tempToken || !otp) {
    throw new Error('Kode OTP / PIN wajib diisi.');
  }

  let decoded;
  try {
    decoded = jwt.verify(tempToken, config.jwtSecret);
  } catch (err) {
    throw new Error('Sesi OTP telah kadaluarsa. Silakan login kembali.');
  }

  if (!decoded || !decoded.is2FA) {
    throw new Error('Token 2FA tidak valid.');
  }

  const users = readUsers();
  const user = users.find((u) => u.id === decoded.id);
  if (!user || !user.pinHash) {
    throw new Error('Data keamanan akun tidak valid.');
  }

  let match = false;
  try {
    if (user.pinHash) {
      match = await bcrypt.compare(String(otp).trim(), user.pinHash);
    }
  } catch (_) {
    match = false;
  }

  // Fallback migrasi jika pinHash belum terbentuk dan user menggunakan default pin
  if (!match && !user.pinHash && String(otp).trim() === DEFAULT_2FA_PIN) {
    match = true;
    user.pinHash = await bcrypt.hash(DEFAULT_2FA_PIN, 10);
    saveUsers(users);
  }

  if (!match) {
    loginHistoryQueries.recordLogin({ userId: user.id, username: user.username, role: normalizeRole(user.role), ipAddress, userAgent, success: 0 });
    throw new Error('Kode OTP / PIN keamanan salah.');
  }

  const userRole = normalizeRole(user.role);

  if (user.isBanned) {
    loginHistoryQueries.recordLogin({ userId: user.id, username: user.username, role: userRole, ipAddress, userAgent, success: 0 });
    throw new Error('Akun Anda telah dinonaktifkan / di-ban oleh Owner (Cosmos).');
  }

  // Cek nomor telepon/WhatsApp: jika akun belum memiliki nomor telepon terkait,
  // buat bindToken agar pengguna dapat menautkan nomornya via verifikasi SMS 2 OTP!
  if (!user.phoneNumber || !user.phoneNumber.trim()) {
    const bindToken = jwt.sign(
      { id: user.id, username: user.username, canBindPhone: true },
      config.jwtSecret,
      { expiresIn: '15m' }
    );
    return {
      requirePhoneBinding: true,
      bindToken,
      user: {
        id: user.id,
        username: user.username,
        role: userRole,
      },
      message: `Akun '${user.username}' belum dikaitkan dengan nomor telepon manapun. Silakan masukkan nomor telepon Anda untuk verifikasi SMS (2 OTP 6-digit).`,
    };
  }

  // SINGLE DEVICE SESSION ENFORCEMENT:
  // Hasilkan session ID unik baru. Login sebelumnya di perangkat lain otomatis kadaluarsa!
  const newSessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
  user.currentSessionToken = newSessionId;
  saveUsers(users);

  // Beri tahu soket WebSocket sesi lama agar langsung keluar, tanpa menunggu permintaan API berikutnya.
  sessionBus.emit('session-replaced', { userId: user.id, sessionId: newSessionId });

  // Catat login berhasil ke database history
  loginHistoryQueries.recordLogin({ userId: user.id, username: user.username, role: userRole, ipAddress, userAgent, success: 1 });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: userRole, sessionId: newSessionId },
    config.jwtSecret,
    { expiresIn: `${config.sessionTimeoutHours || 24}h` }
  );

  return {
    user: {
      id: user.id,
      username: user.username,
      phoneNumber: user.phoneNumber,
      role: userRole,
      tierLevel: getRoleLevel(userRole),
      roleInfo: getRoleInfo(userRole),
      require2FA: !!user.require2FA,
      isBanned: !!user.isBanned,
      linkedOwnerNumber: user.linkedOwnerNumber || '',
    },
    token,
  };
}

// Tautkan nomor telepon baru ke akun pengguna yang belum terkait (Verifikasi SMS)
function bindPhoneNumberToUser(userId, rawPhone) {
  const cleanPhone = normalizePhoneNumber(rawPhone);
  if (!cleanPhone || cleanPhone.length < 9) {
    throw new Error('Nomor telepon tidak valid (minimal 9 digit, contoh: 0812xxx atau 628xxx).');
  }

  if (isPhoneNumberRegistered(cleanPhone, userId)) {
    throw new Error('Nomor telepon ini sudah digunakan oleh akun lain. 1 nomor telepon hanya untuk 1 akun!');
  }

  const users = readUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) throw new Error('Pengguna tidak ditemukan.');

  user.phoneNumber = cleanPhone;
  if (!user.linkedOwnerNumber) user.linkedOwnerNumber = cleanPhone;

  // Pastikan akun memiliki master pin default jika belum pernah diset
  if (!user.pinHash) {
    user.pinHash = bcrypt.hashSync(DEFAULT_2FA_PIN, 10);
    user.require2FA = true;
  }
  saveUsers(users);

  const userRole = normalizeRole(user.role);

  // Sesuai instruksi: "abis kelar kaitkan baru masukin pin"
  // Berikan tempToken untuk verifikasi Master PIN 2FA
  const tempToken = jwt.sign(
    { id: user.id, username: user.username, role: userRole, is2FA: true },
    config.jwtSecret,
    { expiresIn: '5m' }
  );

  return {
    phoneBound: true,
    require2FA: true,
    tempToken,
    user: {
      id: user.id,
      username: user.username,
      phoneNumber: user.phoneNumber,
      role: userRole,
      tierLevel: getRoleLevel(userRole),
      roleInfo: getRoleInfo(userRole),
      require2FA: !!user.require2FA,
      isBanned: !!user.isBanned,
      linkedOwnerNumber: user.linkedOwnerNumber || '',
    },
    message: `Nomor telepon (+${cleanPhone}) berhasil ditautkan ke akun '${user.username}'! Silakan masukkan Master PIN untuk menyelesaikan login.`
  };
}

// Setup PIN / 2FA
async function setupPin(userId, pin, require2FA) {
  const users = readUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) throw new Error('User tidak ditemukan.');

  if (pin) {
    const cleanPin = String(pin).trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      throw new Error('PIN / OTP harus tepat 6 digit angka.');
    }
    const salt = await bcrypt.genSalt(10);
    user.pinHash = await bcrypt.hash(cleanPin, salt);
  }

  if (require2FA !== undefined) {
    if (require2FA && !user.pinHash) {
      throw new Error('Buat 6-digit PIN terlebih dahulu sebelum mengaktifkan 2FA.');
    }
    user.require2FA = !!require2FA;
  }

  saveUsers(users);
  return {
    success: true,
    require2FA: user.require2FA,
    hasPin: !!user.pinHash,
  };
}

// Update Profil Akun & Password Pribadi
async function updateAccount(userId, { newUsername, displayName, bio, avatarUrl, customAiApiKey, hermesModel, hermesProvider, toolsPreferences, currentPassword, newPassword, linkedOwnerNumber }) {
  const users = readUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) throw new Error('User tidak ditemukan.');

  if (newUsername && newUsername.trim().length >= 3) {
    const cleanU = newUsername.trim().toLowerCase();
    const existing = users.find((u) => u.username.toLowerCase() === cleanU && u.id !== userId);
    if (existing) throw new Error('Username baru sudah digunakan orang lain.');
    user.username = cleanU;
  }

  if (displayName !== undefined) {
    user.displayName = String(displayName).trim().slice(0, 50) || user.username;
  }

  if (bio !== undefined) {
    user.bio = String(bio).trim().slice(0, 250);
  }

  if (avatarUrl !== undefined) {
    user.avatarUrl = String(avatarUrl).trim();
  }

  if (customAiApiKey !== undefined) {
    user.customAiApiKey = String(customAiApiKey).trim();
  }

  if (hermesModel !== undefined) {
    user.hermesModel = String(hermesModel).trim();
  }

  if (hermesProvider !== undefined) {
    user.hermesProvider = String(hermesProvider).trim();
  }

  if (toolsPreferences !== undefined) {
    user.toolsPreferences = typeof toolsPreferences === 'object' ? toolsPreferences : {};
  }

  if (linkedOwnerNumber !== undefined) {
    user.linkedOwnerNumber = String(linkedOwnerNumber).replace(/[^0-9]/g, '');
  }

  if (newPassword) {
    if (!currentPassword) {
      throw new Error('Password saat ini wajib diisi untuk mengubah password.');
    }
    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      throw new Error('Password saat ini salah.');
    }
    if (newPassword.length < 6) {
      throw new Error('Password baru minimal 6 karakter.');
    }
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
  }

  saveUsers(users);
  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      avatarUrl: user.avatarUrl || '',
      bio: user.bio || '',
      role: normalizeRole(user.role),
      tierLevel: getRoleLevel(user.role),
      roleInfo: getRoleInfo(user.role),
      require2FA: !!user.require2FA,
      hasPin: !!user.pinHash,
      hasCustomAiKey: Boolean(user.customAiApiKey && user.customAiApiKey.length > 5),
      hermesModel: user.hermesModel || '',
      hermesProvider: user.hermesProvider || '',
      toolsPreferences: user.toolsPreferences || {},
      linkedOwnerNumber: user.linkedOwnerNumber || '',
    },
  };
}

// Ambil profil publik pengguna (AMAN: Menyembunyikan password, PIN, token, AI API key, dan data privat)
function getPublicUserProfile(targetUsername) {
  if (!targetUsername) throw new Error('Username target tidak boleh kosong.');
  const cleanTarget = String(targetUsername).trim().toLowerCase();
  const users = readUsers();
  const user = users.find(u => u.username.toLowerCase() === cleanTarget);
  if (!user) throw new Error(`Pengguna '${cleanTarget}' tidak ditemukan.`);

  const normalized = normalizeRole(user.role);

  // Ambil statistik game & medsos
  let gameWins = 0;
  let totalGames = 0;
  let postsCount = 0;
  let followersCount = 0;
  let followingCount = 0;
  let userPosts = [];

  try {
    const stats = db.prepare('SELECT COUNT(*) as count FROM game_stats WHERE LOWER(player_name) = ?').get(cleanTarget);
    totalGames = stats ? stats.count : 0;
    const wins = db.prepare("SELECT COUNT(*) as count FROM game_stats WHERE LOWER(player_name) = ? AND (result = 'win' OR result = 'white' OR result = 'completed')").get(cleanTarget);
    gameWins = wins ? wins.count : 0;
  } catch (_) {}

  try {
    const pCount = db.prepare('SELECT COUNT(*) as count FROM social_posts WHERE LOWER(author_username) = ?').get(cleanTarget);
    postsCount = pCount ? pCount.count : 0;

    const fCount = db.prepare("SELECT COUNT(*) as count FROM friends WHERE (LOWER(user_id_1) = ? OR LOWER(user_id_2) = ?) AND status = 'accepted'").get(cleanTarget, cleanTarget);
    followersCount = fCount ? fCount.count : 0;
    followingCount = followersCount; // reciprocal friendship or base count

    const rawPosts = db.prepare('SELECT * FROM social_posts WHERE LOWER(author_username) = ? ORDER BY created_at DESC LIMIT 24').all(cleanTarget);
    userPosts = rawPosts.map(p => {
      let likes = [];
      let comments = [];
      let extraData = {};
      try { likes = JSON.parse(p.likes_json || '[]'); } catch (_) {}
      try { comments = JSON.parse(p.comments_json || '[]'); } catch (_) {}
      try { extraData = JSON.parse(p.extra_data_json || '{}'); } catch (_) {}
      return {
        id: p.id,
        content: p.content,
        mediaUrl: p.media_url,
        postType: p.post_type || 'post',
        extraData,
        likesCount: likes.length,
        commentsCount: comments.length,
        likes,
        comments,
        createdAt: p.created_at,
      };
    });
  } catch (_) {}

  return {
    username: user.username,
    displayName: user.displayName || user.username,
    avatarUrl: user.avatarUrl || '',
    bio: user.bio || 'Pengguna ekosistem Astraonyx & Polaris.',
    role: normalized,
    tierLevel: getRoleLevel(normalized),
    tierInfo: getRoleInfo(normalized),
    createdAt: user.createdAt || null,
    stats: {
      totalGames,
      gameWins,
      postsCount,
      followersCount,
      followingCount,
    },
    posts: userPosts,
  };
}

// ==================== WUNA ACCOUNTS MANAGEMENT (KHUSUS COSMOS) ====================

// Ambil seluruh akun Wuna / Polaris (Khusus Admin Cosmos)
function getAllWunaUsers(actorId) {
  const users = readUsers();
  const actor = users.find((u) => u.id === actorId);
  if (!actor || normalizeRole(actor.role) !== 'cosmos') {
    throw new Error('Akses ditolak: Hanya akun tingkat Cosmos yang dapat melihat daftar kredensial pengguna.');
  }

  return users.map((u) => {
    let isDefault = false;
    try {
      isDefault = u.pinHash ? bcrypt.compareSync(DEFAULT_2FA_PIN, u.pinHash) : true;
    } catch (_) {}
    const normalized = normalizeRole(u.role);
    return {
      id: u.id,
      username: u.username,
      phoneNumber: u.phoneNumber || '',
      password: '[Bcrypt Hash Protected]',
      plainPassword: '[Bcrypt Hash Protected]',
      pin: isDefault ? DEFAULT_2FA_PIN : '[2FA Active]',
      plainPin: isDefault ? DEFAULT_2FA_PIN : '[2FA Active]',
      role: normalized,
      tierLevel: getRoleLevel(normalized),
      roleInfo: getRoleInfo(normalized),
      require2FA: true,
      hasPin: !!u.pinHash,
      isDefaultPin: isDefault,
      isBanned: !!u.isBanned,
      linkedOwnerNumber: u.linkedOwnerNumber || u.phoneNumber || '',
      currentSessionToken: u.currentSessionToken || '',
      createdAt: u.createdAt || null,
    };
  });
}

// Ubah tingkatan akun Wuna (10 tingkatan)
function updateWunaRole(actorId, targetUserId, newRole) {
  const normalizedNewRole = normalizeRole(newRole);
  if (!ALLOWED_WUNA_ROLES.includes(normalizedNewRole)) {
    throw new Error(`Role '${newRole}' tidak valid. Pilihan: ${ALLOWED_WUNA_ROLES.join(', ')}.`);
  }

  const users = readUsers();
  const actor = users.find((u) => u.id === actorId);
  if (!actor || normalizeRole(actor.role) !== 'cosmos') {
    throw new Error('Hanya akun Cosmos yang dapat mengubah tingkatan akun Wuna.');
  }

  const target = users.find((u) => u.id === targetUserId);
  if (!target) throw new Error('Target user Wuna tidak ditemukan.');

  if (target.id === actor.id && normalizedNewRole !== 'cosmos') {
    const otherCosmos = users.filter((u) => u.id !== actor.id && normalizeRole(u.role) === 'cosmos');
    if (otherCosmos.length === 0) {
      throw new Error('Tidak bisa menurunkan akun sendiri karena Anda adalah satu-satunya Cosmos!');
    }
  }

  target.role = normalizedNewRole;
  saveUsers(users);

  return {
    success: true,
    user: {
      id: target.id,
      username: target.username,
      role: target.role,
      tierLevel: getRoleLevel(target.role),
      roleInfo: getRoleInfo(target.role),
    },
  };
}

// Ban / Unban akun Wuna
function toggleBanWunaUser(actorId, targetUserId, isBanned) {
  const users = readUsers();
  const actor = users.find((u) => u.id === actorId);
  if (!actor || normalizeRole(actor.role) !== 'cosmos') {
    throw new Error('Hanya akun Cosmos yang dapat memblokir/membuka blokir akun Wuna.');
  }

  const target = users.find((u) => u.id === targetUserId);
  if (!target) throw new Error('Target user Wuna tidak ditemukan.');

  if (target.id === actor.id) {
    throw new Error('Tidak dapat memblokir akun Anda sendiri!');
  }

  target.isBanned = Boolean(isBanned);
  saveUsers(users);
  if (target.isBanned) sessionBus.emit('user-revoked', { userId: target.id, reason: 'banned' });

  return { success: true, message: `Akun '${target.username}' berhasil ${isBanned ? 'diblokir' : 'dibuka blokirnya'}.` };
}

// Reset / Ganti password member oleh Owner Cosmos
async function adminSetWunaPassword(actorId, targetUserId, newPassword) {
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    throw new Error('Password baru minimal 6 karakter.');
  }

  const users = readUsers();
  const actor = users.find((u) => u.id === actorId);
  if (!actor || normalizeRole(actor.role) !== 'cosmos') {
    throw new Error('Hanya akun Cosmos yang dapat mereset password akun lain.');
  }

  const target = users.find((u) => u.id === targetUserId);
  if (!target) throw new Error('Target user Wuna tidak ditemukan.');

  const salt = await bcrypt.genSalt(10);
  target.passwordHash = await bcrypt.hash(newPassword, salt);
  delete target.plainPassword;
  saveUsers(users);

  return { success: true, message: `Password akun '${target.username}' berhasil di-reset oleh Cosmos.` };
}

// Hapus akun Wuna oleh Owner Cosmos
function deleteWunaUser(actorId, targetUserId) {
  const users = readUsers();
  const actor = users.find((u) => u.id === actorId);
  if (!actor || normalizeRole(actor.role) !== 'cosmos') {
    throw new Error('Hanya akun Cosmos yang dapat menghapus akun Wuna.');
  }

  const targetIdx = users.findIndex((u) => u.id === targetUserId);
  if (targetIdx === -1) throw new Error('Target user Wuna tidak ditemukan.');

  const target = users[targetIdx];
  if (target.id === actor.id) {
    throw new Error('Tidak dapat menghapus akun Anda sendiri!');
  }

  users.splice(targetIdx, 1);
  saveUsers(users);
  sessionBus.emit('user-revoked', { userId: target.id, reason: 'deleted' });

  return { success: true, message: `Akun '${target.username}' berhasil dihapus dari database.` };
}

// Atur PIN 2FA user lain oleh Owner Cosmos
async function adminSetUserPin(actorId, targetUserId, newPin) {
  const cleanPin = String(newPin || '').trim();
  if (!/^\d{6}$/.test(cleanPin)) {
    throw new Error('PIN 2FA harus tepat 6 digit angka.');
  }

  const users = readUsers();
  const actor = users.find((u) => u.id === actorId);
  if (!actor || normalizeRole(actor.role) !== 'cosmos') {
    throw new Error('Hanya akun Cosmos yang dapat mengatur PIN 2FA akun lain.');
  }

  const target = users.find((u) => u.id === targetUserId);
  if (!target) throw new Error('Target user Wuna tidak ditemukan.');

  const salt = await bcrypt.genSalt(10);
  target.pinHash = await bcrypt.hash(cleanPin, salt);
  delete target.plainPin;
  target.require2FA = true;
  saveUsers(users);

  return { success: true, message: `PIN 2FA akun '${target.username}' berhasil diperbarui.` };
}

// Reset PIN 2FA user lain ke bawaan (111111) oleh Owner Cosmos
async function adminResetUserPin(actorId, targetUserId) {
  const users = readUsers();
  const actor = users.find((u) => u.id === actorId);
  if (!actor || normalizeRole(actor.role) !== 'cosmos') {
    throw new Error('Hanya akun Cosmos yang dapat mereset PIN 2FA akun lain.');
  }

  const target = users.find((u) => u.id === targetUserId);
  if (!target) throw new Error('Target user Wuna tidak ditemukan.');

  const salt = await bcrypt.genSalt(10);
  target.pinHash = await bcrypt.hash(DEFAULT_2FA_PIN, salt);
  delete target.plainPin;
  target.require2FA = true;
  saveUsers(users);

  return { success: true, message: `PIN 2FA akun '${target.username}' berhasil di-reset ke bawaan (${DEFAULT_2FA_PIN}).` };
}

// Buat akun Wuna baru oleh Owner Cosmos
async function adminCreateWunaUser(actorId, { username, password, role, linkedOwnerNumber, pin, phoneNumber }) {
  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    throw new Error('Username minimal 3 karakter.');
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new Error('Password minimal 6 karakter.');
  }

  const cleanPhone = normalizePhoneNumber(phoneNumber || linkedOwnerNumber);
  if (!cleanPhone || cleanPhone.length < 9) {
    throw new Error('Nomor WhatsApp wajib diisi (minimal 9 digit, contoh: 0812xxx atau 628xxx).');
  }

  const users = readUsers();
  const actor = users.find((u) => u.id === actorId);
  if (!actor || normalizeRole(actor.role) !== 'cosmos') {
    throw new Error('Hanya akun Cosmos yang dapat membuat akun pengguna baru.');
  }

  const cleanUsername = username.trim().toLowerCase();
  const existing = users.find((u) => u.username.toLowerCase() === cleanUsername);
  if (existing) {
    throw new Error(`Username '${cleanUsername}' sudah terdaftar.`);
  }

  const existingPhone = users.find((u) => u.phoneNumber && u.phoneNumber === cleanPhone);
  if (existingPhone) {
    throw new Error('Nomor WhatsApp sudah digunakan oleh akun lain.');
  }

  const targetRole = normalizeRole(role) || 'member';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const cleanPin = pin && /^\d{6}$/.test(String(pin).trim()) ? String(pin).trim() : DEFAULT_2FA_PIN;
  const pinHash = await bcrypt.hash(cleanPin, salt);

  const newUser = {
    id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    username: cleanUsername,
    phoneNumber: cleanPhone,
    passwordHash,
    currentSessionToken: '',
    role: targetRole,
    require2FA: true,
    pinHash,
    isBanned: false,
    linkedOwnerNumber: cleanPhone,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  return {
    success: true,
    message: `Akun '${cleanUsername}' (${targetRole.toUpperCase()}) berhasil dibuat.`,
    user: {
      id: newUser.id,
      username: newUser.username,
      phoneNumber: newUser.phoneNumber,
      role: newUser.role,
      tierLevel: getRoleLevel(newUser.role),
      roleInfo: getRoleInfo(newUser.role),
      linkedOwnerNumber: newUser.linkedOwnerNumber,
      require2FA: newUser.require2FA,
      createdAt: newUser.createdAt,
    },
  };
}

// ==================== MIDDLEWARE OTENTIKASI & RBAC ====================

/**
 * Periksa token sesi terhadap data akun terkini. Dipakai bersama oleh middleware HTTP dan handshake WebSocket
 * supaya kedua jalur menolak sesi dengan aturan yang sama.
 * @returns {{ ok: true, user: object } | { ok: false, status: number, body: object }}
 */
function resolveSession(token) {
  if (!token) {
    return { ok: false, status: 401, body: { success: false, error: 'Akses ditolak: Token otentikasi tidak ditemukan.', code: 'UNAUTHENTICATED' } };
  }

  let decodedUser;
  try {
    decodedUser = jwt.verify(token, config.jwtSecret);
  } catch (_) {
    // Token kedaluwarsa atau rusak: klien harus keluar (401 + forceLogout), bukan sekadar ditolak (403).
    return {
      ok: false,
      status: 401,
      body: { success: false, error: 'Sesi telah berakhir atau token tidak valid. Silakan login kembali.', code: 'UNAUTHENTICATED', forceLogout: true },
    };
  }

  // Token tahap-antara (PIN 2FA / penautan nomor) hanya sah untuk endpoint verifikasinya. Tanpa pemeriksaan ini,
  // tempToken yang keluar tepat setelah password benar bisa dipakai sebagai sesi penuh dan melewati PIN.
  if (decodedUser.is2FA || decodedUser.canBindPhone) {
    return { ok: false, status: 401, body: { success: false, error: 'Selesaikan verifikasi login terlebih dahulu.', code: 'UNAUTHENTICATED', forceLogout: true } };
  }

  // Cek status akun di database
  const users = readUsers();
  const liveUser = users.find((u) => u.id === decodedUser.id);
  if (!liveUser) {
    return { ok: false, status: 401, body: { success: false, error: 'Akun tidak ditemukan. Silakan login kembali.', code: 'UNAUTHENTICATED', forceLogout: true } };
  }
  if (liveUser.isBanned) {
    return {
      ok: false,
      status: 403,
      body: { success: false, error: 'Akun Anda telah dinonaktifkan / di-ban oleh Owner (Cosmos).', code: 'ACCOUNT_BANNED', isBanned: true, forceLogout: true },
    };
  }

  // Wajib memiliki Nomor WhatsApp (Jika belum ada nomor WA, paksa logout untuk melengkapi nomor)
  if (!liveUser.phoneNumber || !liveUser.phoneNumber.trim()) {
    return {
      ok: false,
      status: 401,
      body: {
        success: false,
        error: 'Nomor WhatsApp wajib dihubungkan untuk melanjutkan ke ekosistem. Sesi Anda dikeluarkan untuk verifikasi nomor.',
        code: 'PHONE_REQUIRED',
        requirePhone: true,
        forceLogout: true,
      },
    };
  }

  // Single Device Session Enforcement (1 akun hanya bisa aktif di 1 perangkat sekaligus)
  if (decodedUser.sessionId && liveUser.currentSessionToken && decodedUser.sessionId !== liveUser.currentSessionToken) {
    return {
      ok: false,
      status: 401,
      body: {
        success: false,
        error: 'Sesi Anda telah berakhir karena akun ini telah login di perangkat lain. (Single Device Session)',
        code: 'SESSION_REPLACED',
        sessionTerminated: true,
        forceLogout: true,
      },
    };
  }

  const user = { ...decodedUser };
  user.phoneNumber = liveUser.phoneNumber;
  user.role = normalizeRole(liveUser.role);
  user.tierLevel = getRoleLevel(user.role);
  return { ok: true, user };
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  const result = resolveSession(token);
  if (!result.ok) return res.status(result.status).json(result.body);

  req.user = result.user;
  next();
}

// Middleware penolak aksi modifikasi untuk akun Member & Guest (Level 1-2)
function requireWriteAccess(req, res, next) {
  const userRole = req.user?.role || 'member';
  const roleLevel = getRoleLevel(userRole);
  if (roleLevel <= 2) {
    const info = getRoleInfo(userRole);
    return res.status(403).json({
      success: false,
      error: `Akses ditolak: akun tingkat ${info.name} (tingkat ${roleLevel}) hanya bisa melihat dan tidak boleh mengubah data atau bot. Dibutuhkan tingkat 3 ke atas.`,
      code: 'ROLE_REQUIRED',
      requiredLevel: 3,
    });
  }
  next();
}

// Middleware pembatasan role tertentu
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    const userRole = req.user?.role || 'member';
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: `Akses ditolak: Fitur ini membutuhkan hak akses [${allowedRoles.join(', ')}]. Peran Anda saat ini: ${userRole}.`,
        code: 'ROLE_REQUIRED',
        requiredRoles: allowedRoles,
      });
    }
    next();
  };
}

module.exports = {
  DEFAULT_2FA_PIN,
  WUNA_TIERS,
  ALLOWED_WUNA_ROLES,
  registerUser,
  loginUser,
  verifyOtp,
  setupPin,
  updateAccount,
  getAllWunaUsers,
  updateWunaRole,
  toggleBanWunaUser,
  adminSetWunaPassword,
  adminSetUserPin,
  adminResetUserPin,
  adminCreateWunaUser,
  deleteWunaUser,
  authenticateToken,
  resolveSession,
  requireWriteAccess,
  requireRole,
  normalizeRole,
  getRoleLevel,
  getRoleInfo,
  getPublicUserProfile,
  hasPermission,
  readUsers,
  saveUsers,
  normalizePhoneNumber,
  isPhoneNumberRegistered,
  bindPhoneNumberToUser,
};
