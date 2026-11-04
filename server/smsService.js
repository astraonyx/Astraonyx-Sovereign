// server/smsService.js — Modul Pengiriman & Verifikasi SMS OTP (Dual OTP: 6 Digit + 6 Digit)
// Mengirim 2 kode OTP 6-digit melalui SMS untuk pendaftaran akun dan penautan nomor telepon

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');

const OUTBOX_FILE = path.resolve(__dirname, '../database/sms_outbox.json');
const pendingSessions = new Map();

// Helper untuk normalisasi nomor telepon
function normalizePhoneNumber(rawPhone) {
  if (!rawPhone) return '';
  let phone = String(rawPhone).trim().replace(/[^0-9]/g, '');
  if (phone.startsWith('0')) {
    phone = '62' + phone.slice(1);
  }
  return phone;
}

// Generate 6 digit angka acak
function generateSixDigitCode() {
  const code = Math.floor(100000 + Math.random() * 900000);
  return String(code);
}

// Baca catatan outbox SMS
function readOutbox() {
  try {
    if (fs.existsSync(OUTBOX_FILE)) {
      const raw = fs.readFileSync(OUTBOX_FILE, 'utf-8');
      return JSON.parse(raw || '[]');
    }
  } catch (_) {}
  return [];
}

// Simpan catatan outbox SMS
function saveToOutbox(entry) {
  try {
    const list = readOutbox();
    list.unshift(entry);
    if (list.length > 200) list.splice(200); // Pertahankan 200 riwayat terakhir
    const dir = path.dirname(OUTBOX_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(OUTBOX_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('[smsService] Gagal menyimpan ke outbox:', err.message);
  }
}

/**
 * Dispatch SMS ke gateway eksternal (jika disetel) atau simulator outbox
 */
async function dispatchSms(phoneNumber, messageText) {
  const timestamp = new Date().toISOString();
  console.log('\n' + '═'.repeat(66));
  console.log('   📨 [SMS GATEWAY DISPATCH — VERIFIKASI POLARIS]');
  console.log('═'.repeat(66));
  console.log(` Ke Nomor : +${phoneNumber}`);
  console.log(` Waktu    : ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
  console.log(` Saluran  : SMS JARINGAN SELULER (BUKAN WHATSAPP)`);
  console.log('─'.repeat(66));
  console.log(` Isi Pesan SMS:\n${messageText}`);
  console.log('═'.repeat(66) + '\n');

  // Integrasi SMS Gateway jika env/config tersedia (Twilio / Zenziva / Custom HTTP Gateway)
  const gatewayUrl = process.env.SMS_GATEWAY_URL || config.smsGatewayUrl;
  const apiKey = process.env.SMS_API_KEY || config.smsApiKey;

  if (gatewayUrl && apiKey) {
    try {
      const response = await fetch(gatewayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ to: phoneNumber, message: messageText }),
      });
      const data = await response.json().catch(() => ({}));
      return { success: true, provider: 'gateway', data };
    } catch (e) {
      console.warn('[smsService] Gagal kirim via gateway eksternal, fallback ke outbox simulator:', e.message);
    }
  }

  return { success: true, provider: 'simulator' };
}

/**
 * Buat sesi verifikasi SMS dengan 2 Kode OTP 6-Digit (OTP 1 + OTP 2)
 */
async function createSmsVerification(rawPhone, purpose = 'register', metadata = {}) {
  const phoneNumber = normalizePhoneNumber(rawPhone);
  if (!phoneNumber || phoneNumber.length < 9) {
    throw new Error('Nomor telepon tidak valid (minimal 9 digit).');
  }

  // Generate 2 kode OTP 6 digit berbeda
  const otp1 = generateSixDigitCode();
  let otp2 = generateSixDigitCode();
  while (otp2 === otp1) {
    otp2 = generateSixDigitCode();
  }

  const sessionToken = 'sms_' + Date.now() + '_' + crypto.randomBytes(6).toString('hex');
  const expiresAt = Date.now() + 10 * 60 * 1000; // Berlaku 10 menit

  const sessionData = {
    sessionToken,
    phoneNumber,
    purpose,
    otp1,
    otp2,
    attempts: 0,
    expiresAt,
    metadata,
    createdAt: new Date().toISOString(),
  };

  pendingSessions.set(sessionToken, sessionData);

  // Buat isi pesan SMS
  const purposeText = purpose === 'register' ? 'pendaftaran akun' : 'penautan nomor telepon';
  const smsMessage = `[POLARIS ATARAXIA]\nKode verifikasi SMS untuk ${purposeText} Anda:\n• OTP 1: ${otp1}\n• OTP 2: ${otp2}\n\nMasukkan kedua kode 6-digit di atas di halaman web. Jangan berikan kode ini kepada siapapun! Berlaku 10 menit.`;

  await dispatchSms(phoneNumber, smsMessage);

  saveToOutbox({
    sessionToken,
    phoneNumber,
    purpose,
    otp1,
    otp2,
    message: smsMessage,
    expiresAt: new Date(expiresAt).toISOString(),
    createdAt: sessionData.createdAt,
  });

  return {
    success: true,
    sessionToken,
    phoneNumber,
    expiresInSeconds: 600,
    message: '2 Kode OTP verifikasi (6 digit + 6 digit) telah dikirimkan via SMS.',
    // Sediakan preview kode OTP agar user dapat langsung melihat dan menguji tanpa kendala pulsa
    previewOtps: {
      otp1,
      otp2,
      note: 'Kode OTP juga telah dicatat di outbox server untuk verifikasi instan.',
    },
  };
}

/**
 * Verifikasi 2 Kode OTP 6-Digit (OTP 1 + OTP 2)
 */
function verifyDualOtp(sessionToken, inputOtp1, inputOtp2) {
  if (!sessionToken) {
    throw new Error('Sesi verifikasi SMS tidak ditemukan.');
  }

  const session = pendingSessions.get(sessionToken);
  if (!session) {
    throw new Error('Sesi verifikasi SMS tidak valid atau telah kadaluarsa. Silakan minta kode baru.');
  }

  if (Date.now() > session.expiresAt) {
    pendingSessions.delete(sessionToken);
    throw new Error('Kode verifikasi SMS telah kadaluarsa. Silakan minta kode baru.');
  }

  session.attempts += 1;
  if (session.attempts > 5) {
    pendingSessions.delete(sessionToken);
    throw new Error('Batas percobaan verifikasi telah terlampaui. Silakan minta kode baru.');
  }

  const clean1 = String(inputOtp1 || '').trim().replace(/[^0-9]/g, '');
  const clean2 = String(inputOtp2 || '').trim().replace(/[^0-9]/g, '');

  if (clean1 !== session.otp1 || clean2 !== session.otp2) {
    throw new Error('Kode OTP 1 atau OTP 2 salah. Pastikan memasukkan kedua kode 6-digit yang diterima via SMS dengan benar.');
  }

  // Berhasil! Hapus sesi dari pending agar tidak bisa dipakai ulang
  pendingSessions.delete(sessionToken);

  return {
    valid: true,
    phoneNumber: session.phoneNumber,
    purpose: session.purpose,
    metadata: session.metadata,
  };
}

/**
 * Ambil SMS terakhir untuk nomor telepon tertentu
 */
function getLatestSmsForPhone(rawPhone) {
  const phone = normalizePhoneNumber(rawPhone);
  const outbox = readOutbox();
  return outbox.find((entry) => entry.phoneNumber === phone) || null;
}

module.exports = {
  normalizePhoneNumber,
  createSmsVerification,
  verifyDualOtp,
  getLatestSmsForPhone,
  readOutbox,
};
