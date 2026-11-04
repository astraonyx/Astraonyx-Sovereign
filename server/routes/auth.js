// server/routes/auth.js — Authentication, SMS OTP & WUNA Tier Router
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const config = require('../../config');
const {
  registerUser,
  loginUser,
  verifyOtp,
  setupPin,
  updateAccount,
  authenticateToken,
  normalizeRole,
  getRoleLevel,
  getRoleInfo,
  getPublicUserProfile,
  WUNA_TIERS,
  ALLOWED_WUNA_ROLES,
  readUsers,
  saveUsers,
  isPhoneNumberRegistered,
  bindPhoneNumberToUser,
} = require('../auth');
const smsService = require('../smsService');
const sessionBus = require('../sessionBus');
const { authThrottle, tooMany } = require('../rateLimit');
const botManager = require('../botManager');
const { userQueries, db } = require('../db');
const { upload } = require('../uploadMiddleware');
const { saveLocalMedia, uploadToGoogleDrive } = require('../gdriveStorage');

const router = express.Router();

// Step 1: Kirim SMS Verifikasi Dual OTP (6 Digit + 6 Digit) untuk Pendaftaran Baru
router.post('/register-send-sms', async (req, res) => {
  try {
    const { username, password, phoneNumber, phone, pin } = req.body || {};
    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      throw new Error('Username minimal 3 karakter.');
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      throw new Error('Password minimal 6 karakter.');
    }

    const cleanPhone = smsService.normalizePhoneNumber(phoneNumber || phone);
    if (!cleanPhone || cleanPhone.length < 9) {
      throw new Error('Nomor telepon wajib diisi (minimal 9 digit, contoh: 0812xxx atau 628xxx).');
    }

    // 1 NOMOR UNTUK 1 AKUN (Strict Enforcement)
    if (isPhoneNumberRegistered(cleanPhone)) {
      throw new Error('Nomor telepon ini sudah terdaftar pada akun lain. 1 nomor telepon hanya untuk 1 akun!');
    }

    // Cek ketersediaan username
    const cleanUsername = username.trim().toLowerCase();
    const users = readUsers();
    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      throw new Error('Username sudah terdaftar. Silakan pilih username lain.');
    }

    // Buat & kirim 2 kode OTP 6-digit via SMS
    const smsRes = await smsService.createSmsVerification(cleanPhone, 'register', {
      username: cleanUsername,
      password,
      pin,
    });

    res.json({
      success: true,
      sessionToken: smsRes.sessionToken,
      phoneNumber: smsRes.phoneNumber,
      expiresInSeconds: smsRes.expiresInSeconds,
      previewOtps: smsRes.previewOtps,
      message: '2 Kode OTP verifikasi (6 digit + 6 digit) telah dikirimkan via SMS ke nomor Anda.',
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Step 2: Verifikasi 2 Kode OTP SMS (6 Digit + 6 Digit) & Finalisasi Pendaftaran
router.post('/register-verify-sms', async (req, res) => {
  try {
    const { sessionToken, otp1, otp2, username, password, pin } = req.body || {};
    if (!sessionToken) {
      throw new Error('Sesi verifikasi SMS tidak ditemukan.');
    }
    if (!otp1 || !otp2) {
      throw new Error('Harap masukkan kedua kode OTP (Kode 1: 6 digit, Kode 2: 6 digit) yang diterima via SMS.');
    }

    // Verifikasi dual OTP dari SMS
    const verified = smsService.verifyDualOtp(sessionToken, otp1, otp2);

    const targetUser = username || verified.metadata?.username;
    const targetPass = password || verified.metadata?.password;
    const targetPin = pin || verified.metadata?.pin;
    const targetPhone = verified.phoneNumber;

    // Registrasi akun dengan nomor telepon yang telah terverifikasi via SMS
    const regResult = await registerUser(targetUser, targetPass, targetPhone, targetPin);

    // Ambil user dan berikan session token langsung agar user tidak perlu login ulang
    const users = readUsers();
    const newUser = users.find((u) => u.username.toLowerCase() === targetUser.toLowerCase());
    let token = null;
    if (newUser) {
      const newSessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
      newUser.currentSessionToken = newSessionId;
      users.forEach((u) => { if (u.id === newUser.id) u.currentSessionToken = newSessionId; });
      userQueries.updateSession.run(newSessionId, new Date().toISOString(), newUser.id);

      token = jwt.sign(
        { id: newUser.id, username: newUser.username, role: normalizeRole(newUser.role), sessionId: newSessionId },
        config.jwtSecret,
        { expiresIn: `${config.sessionTimeoutHours || 24}h` }
      );
    }

    res.json({
      success: true,
      message: 'Pendaftaran sukses! Nomor telepon berhasil diverifikasi via SMS.',
      user: newUser ? {
        id: newUser.id,
        username: newUser.username,
        phoneNumber: newUser.phoneNumber,
        role: normalizeRole(newUser.role),
        tierLevel: getRoleLevel(newUser.role),
        roleInfo: getRoleInfo(newUser.role),
      } : regResult.user,
      token,
      require2FA: false,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Step A: Kirim SMS Verifikasi Dual OTP untuk Menautkan Nomor ke Akun yang Ada
router.post('/bind-phone/send-sms', async (req, res) => {
  try {
    const { bindToken, phoneNumber, phone } = req.body || {};
    if (!bindToken) {
      throw new Error('Token penautan tidak ditemukan. Silakan login terlebih dahulu.');
    }

    let decoded;
    try {
      decoded = jwt.verify(bindToken, config.jwtSecret);
    } catch (_) {
      throw new Error('Sesi penautan telah kadaluarsa. Silakan login kembali.');
    }

    if (!decoded || !decoded.canBindPhone) {
      throw new Error('Token tidak valid untuk penautan nomor telepon.');
    }

    const cleanPhone = smsService.normalizePhoneNumber(phoneNumber || phone);
    if (!cleanPhone || cleanPhone.length < 9) {
      throw new Error('Nomor telepon tidak valid (minimal 9 digit, contoh: 0812xxx atau 628xxx).');
    }

    // 1 NOMOR UNTUK 1 AKUN (Strict Enforcement)
    if (isPhoneNumberRegistered(cleanPhone, decoded.id)) {
      throw new Error('Nomor telepon ini sudah digunakan oleh akun lain. 1 nomor telepon hanya untuk 1 akun!');
    }

    // Buat & kirim 2 kode OTP 6-digit via SMS
    const smsRes = await smsService.createSmsVerification(cleanPhone, 'bind_phone', {
      userId: decoded.id,
      username: decoded.username,
    });

    res.json({
      success: true,
      sessionToken: smsRes.sessionToken,
      phoneNumber: smsRes.phoneNumber,
      expiresInSeconds: smsRes.expiresInSeconds,
      previewOtps: smsRes.previewOtps,
      message: `2 Kode OTP verifikasi (6 digit + 6 digit) telah dikirim via SMS ke +${cleanPhone}.`,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Step B: Verifikasi Dual OTP SMS & Tautkan Nomor ke Akun yang Sedang Login
router.post('/bind-phone/verify-sms', async (req, res) => {
  try {
    const { sessionToken, otp1, otp2 } = req.body || {};
    if (!sessionToken) {
      throw new Error('Sesi verifikasi SMS tidak ditemukan.');
    }
    if (!otp1 || !otp2) {
      throw new Error('Harap masukkan kedua kode OTP (Kode 1: 6 digit, Kode 2: 6 digit) yang diterima via SMS.');
    }

    // Verifikasi dual OTP dari SMS
    const verified = smsService.verifyDualOtp(sessionToken, otp1, otp2);
    const userId = verified.metadata?.userId;
    if (!userId) {
      throw new Error('Data penautan pengguna tidak ditemukan.');
    }

    // Tautkan nomor ke akun pengguna
    const bound = bindPhoneNumberToUser(userId, verified.phoneNumber);

    res.json({
      success: true,
      ...bound,
      message: bound.message || `Nomor telepon (+${verified.phoneNumber}) berhasil ditautkan ke akun '${bound.user.username}' via SMS! Silakan masukkan Master PIN akun Anda.`,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Direct WhatsApp Number Binding untuk Akun yang Belum Dikaitkan
router.post('/bind-phone/direct', async (req, res) => {
  try {
    const { bindToken, phoneNumber, phone } = req.body || {};
    if (!bindToken) {
      throw new Error('Token penautan tidak ditemukan. Silakan login terlebih dahulu.');
    }

    let decoded;
    try {
      decoded = jwt.verify(bindToken, config.jwtSecret);
    } catch (jwtErr) {
      throw new Error(`Sesi penautan telah kadaluarsa atau tidak valid (${jwtErr.message}). Silakan login kembali.`);
    }

    if (!decoded || !decoded.canBindPhone) {
      throw new Error('Token tidak valid untuk penautan nomor WhatsApp.');
    }

    const inputPhone = phoneNumber || phone;
    if (!inputPhone) {
      throw new Error('Nomor WhatsApp wajib diisi.');
    }

    // Deteksi validitas dan keberadaan nomor di WhatsApp
    const waCheck = await botManager.checkOnWhatsApp(inputPhone);
    if (!waCheck.valid) {
      throw new Error(waCheck.error || 'Nomor tidak terdeteksi sebagai pengguna WhatsApp aktif.');
    }

    const cleanPhone = waCheck.phone;

    // 1 NOMOR UNTUK 1 AKUN (Strict Enforcement)
    if (isPhoneNumberRegistered(cleanPhone, decoded.id)) {
      throw new Error('Nomor WhatsApp ini sudah digunakan oleh akun lain. 1 nomor hanya untuk 1 akun!');
    }

    // Tautkan nomor ke akun pengguna
    const bound = bindPhoneNumberToUser(decoded.id, cleanPhone);

    res.json({
      success: true,
      ...bound,
      message: bound.message || `Nomor WhatsApp (+${cleanPhone}) berhasil diverifikasi dan dikaitkan ke akun '${bound.user.username}'! Silakan masukkan Master PIN akun Anda.`,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Preview SMS Terakhir (Developer & Test Helper)
router.get('/sms-preview/:phone', (req, res) => {
  const latest = smsService.getLatestSmsForPhone(req.params.phone);
  res.json({ success: true, latestSms: latest });
});

// Registrasi Standar
router.post('/register', async (req, res) => {
  try {
    const { username, password, phoneNumber, phone, pin } = req.body || {};
    const inputPhone = phoneNumber || phone;
    if (!inputPhone) {
      throw new Error('Nomor WhatsApp wajib diisi saat pendaftaran.');
    }

    const waCheck = await botManager.checkOnWhatsApp(inputPhone);
    if (!waCheck.valid) {
      throw new Error(waCheck.error || 'Nomor tidak terdeteksi sebagai pengguna WhatsApp aktif.');
    }

    const result = await registerUser(username, password, waCheck.phone, pin);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  // Throttle per nama pengguna (PRM-AUTH-05), berlaku juga untuk nama yang tidak ada supaya perilakunya seragam.
  const { username, identifier, phone, password } = req.body || {};
  const throttleKey = `login:${String(identifier || username || phone || '').trim().toLowerCase()}`;
  const gate = authThrottle.check(throttleKey);
  if (!gate.allowed) return tooMany(res, gate.retryAfter);
  try {
    const clientMeta = {
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
    };
    const result = await loginUser(identifier || username || phone, password, clientMeta);
    authThrottle.succeed(throttleKey);
    res.json({ success: true, ...result });
  } catch (err) {
    authThrottle.fail(throttleKey);
    const status = err.message.includes('di-ban') ? 403 : 401;
    res.status(status).json({ success: false, error: err.message });
  }
});

// Verifikasi OTP Login
router.post('/verify-otp', async (req, res) => {
  // PIN hanya 6 digit, jadi wajib dibatasi per akun (PRM-AUTH-03, PRM-AUTH-05).
  const { tempToken, otp } = req.body || {};
  const claimedId = (typeof tempToken === 'string' && jwt.decode(tempToken)) || {};
  const throttleKey = `pin:${claimedId.id || 'anon'}`;
  const gate = authThrottle.check(throttleKey);
  if (!gate.allowed) return tooMany(res, gate.retryAfter);
  try {
    const clientMeta = {
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
    };
    const result = await verifyOtp(tempToken, otp, clientMeta);
    authThrottle.succeed(throttleKey);
    res.json({ success: true, ...result });
  } catch (err) {
    authThrottle.fail(throttleKey);
    res.status(400).json({ success: false, error: err.message });
  }
});

// Keluar: cabut sesi di server agar token yang sama tidak bisa dipakai lagi, lalu tutup soket realtime sesi itu.
router.post('/logout', authenticateToken, (req, res) => {
  try {
    const revokedId = `revoked_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    userQueries.updateSession.run(revokedId, new Date().toISOString(), req.user.id);
    sessionBus.emit('user-revoked', { userId: req.user.id, reason: 'logout', sessionId: req.user.sessionId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Gagal mengakhiri sesi di server.' });
  }
});

// Setup PIN Master Akun
router.post('/setup-pin', authenticateToken, async (req, res) => {
  try {
    const { pin, require2FA } = req.body;
    const result = await setupPin(req.user.id, pin, require2FA);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update Profil Akun
router.post('/update-account', authenticateToken, async (req, res) => {
  try {
    const { newUsername, displayName, bio, avatarUrl, customAiApiKey, hermesModel, hermesProvider, toolsPreferences, currentPassword, newPassword, linkedOwnerNumber } = req.body;
    const result = await updateAccount(req.user.id, {
      newUsername,
      displayName,
      bio,
      avatarUrl,
      customAiApiKey,
      hermesModel,
      hermesProvider,
      toolsPreferences,
      currentPassword,
      newPassword,
      linkedOwnerNumber,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Informasi Akun Pribadi
router.get('/me', authenticateToken, (req, res) => {
  const users = readUsers();
  const current = users.find((u) => u.id === req.user.id);
  // Klaim internal JWT (sessionId, iat, exp) tidak perlu sampai ke klien.
  const { sessionId, iat, exp, ...publicClaims } = req.user;
  res.set('Cache-Control', 'no-store');
  res.json({
    success: true,
    user: {
      ...publicClaims,
      displayName: current ? (current.displayName || current.username) : req.user.username,
      avatarUrl: current ? (current.avatarUrl || '') : '',
      bio: current ? (current.bio || '') : '',
      hasCustomAiKey: current ? Boolean(current.customAiApiKey && current.customAiApiKey.length > 5) : false,
      hermesModel: current ? (current.hermesModel || '') : '',
      hermesProvider: current ? (current.hermesProvider || '') : '',
      toolsPreferences: current ? (current.toolsPreferences || {}) : {},
      role: current ? normalizeRole(current.role) : 'member',
      tierLevel: current ? getRoleLevel(current.role) : 2,
      roleInfo: current ? getRoleInfo(current.role) : getRoleInfo('member'),
      require2FA: current ? !!current.require2FA : false,
      hasPin: current ? !!current.pinHash : false,
      linkedOwnerNumber: current ? current.linkedOwnerNumber || '' : '',
    },
  });
});

// Cek Apakah Sistem Sudah Memiliki Akun
router.get('/status', (req, res) => {
  const users = readUsers();
  res.json({ hasUsers: users.length > 0 });
});

// Profil Publik
router.get('/public-profile/:username', (req, res) => {
  try {
    const profile = getPublicUserProfile(req.params.username);
    res.json({ success: true, profile });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// WUNA Tiers
router.get('/wuna-tiers', authenticateToken, (req, res) => {
  res.json({
    success: true,
    tiers: WUNA_TIERS,
    allowedRoles: ALLOWED_WUNA_ROLES,
    currentUser: {
      role: req.user.role,
      tierLevel: getRoleLevel(req.user.role),
      roleInfo: getRoleInfo(req.user.role),
    },
  });
});

// Upload Avatar Pengguna
router.post('/upload-avatar', authenticateToken, upload.single('avatarFile'), async (req, res) => {
  try {
    let fileBuffer = null;
    let originalName = 'avatar.jpg';
    let mimeType = 'image/jpeg';

    if (req.file) {
      fileBuffer = fs.readFileSync(req.file.path);
      originalName = req.file.originalname || req.file.filename;
      mimeType = req.file.mimetype || 'image/jpeg';
    } else if (req.body && req.body.base64) {
      const base64Data = req.body.base64.replace(/^data:image\/[a-z]+;base64,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');
      originalName = req.body.filename || `avatar_${Date.now()}.png`;
      mimeType = req.body.mimeType || 'image/png';
    } else {
      return res.status(400).json({ success: false, error: 'Tidak ada file avatar yang dipilih.' });
    }

    const local = saveLocalMedia(fileBuffer, originalName, mimeType);
    let avatarUrl = local.localUrl;

    const gdrive = await uploadToGoogleDrive(fileBuffer, originalName, mimeType);
    if (gdrive && gdrive.success) {
      avatarUrl = gdrive.gdriveUrl;
    }

    const users = readUsers();
    const user = users.find(u => u.id === req.user.id);
    if (user) {
      user.avatarUrl = avatarUrl;
      saveUsers(users);
    }

    try {
      db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatarUrl, req.user.id);
    } catch (_) {}

    res.json({
      success: true,
      avatarUrl,
      isGdrive: Boolean(gdrive && gdrive.success),
      message: 'Foto profil berhasil diperbarui!'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
