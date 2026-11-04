// server/rateLimit.js — Pembatas laju di memori, mengikuti kelas R1–R9 pada PRD R-10.1 dan throttle login PRM-AUTH-05.
//
// Kunci pembatas adalah akun (req.user.id) atau nama pengguna, BUKAN alamat IP (PRD R-10.2). Penghitung hanya di
// memori: hilang saat server dimulai ulang. Jawaban 429 membawa header Retry-After dan { code: 'RATE_LIMITED', retryAfter }.
//
//   const { limit, authThrottle } = require('../rateLimit');
//   router.post('/post', authenticateToken, limit('R3'), handler);
//
//   const t = authThrottle.check(`login:${username}`);   // { allowed, retryAfter }
//   authThrottle.fail(key) / authThrottle.succeed(key)
const CLASSES = {
  R1: { limit: 240, windowMs: 60 * 1000 },        // baca ringan
  R2: { limit: 60, windowMs: 60 * 1000 },         // tulis biasa
  R3: { limit: 30, windowMs: 60 * 1000 },         // tulis sosial
  R4: { limit: 20, windowMs: 60 * 60 * 1000 },    // unggah
  R5: { limit: 20, windowMs: 60 * 1000 },         // panggilan AI
  R6: { limit: 60, windowMs: 60 * 1000 },         // aksi admin
  R7: { limit: 60, windowMs: 60 * 1000 },         // pencarian
  R9: { limit: 5, windowMs: 10 * 60 * 1000 },     // klaim Role Token
};

const buckets = new Map(); // `${kelas}:${kunci}` → { count, resetAt }

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}, 60 * 1000).unref();

function tooMany(res, retryAfter) {
  res.set('Retry-After', String(retryAfter));
  const message = `Terlalu banyak permintaan. Coba lagi dalam ${retryAfter} detik.`;
  // Memuat bentuk lama (success/error/retryAfter) dan amplop baru PRD R-02.3 (ok/message/retryAfterSec/requestId).
  return res.status(429).json({
    ok: false,
    success: false,
    error: message,
    message,
    code: 'RATE_LIMITED',
    retryAfter,
    retryAfterSec: retryAfter,
    requestId: res.req && res.req.id,
  });
}

/**
 * limit('R3') → middleware Express. Pasang setelah authenticateToken supaya kuncinya akun.
 * Opsi: { keyFn(req) → string } untuk kunci lain; { limit, windowMs } menimpa nilai kelas.
 */
function limit(className, opts = {}) {
  const base = CLASSES[className];
  if (!base) throw new Error(`Kelas rate limit tidak dikenal: ${className}`);
  const max = opts.limit || base.limit;
  const windowMs = opts.windowMs || base.windowMs;
  const keyFn = opts.keyFn || ((req) => (req.user && req.user.id) || req.ip || 'anon');
  return (req, res, next) => {
    const key = `${className}:${keyFn(req)}`;
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) return tooMany(res, Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)));
    next();
  };
}

// ---- Throttle login (PRM-AUTH-05): 5 kegagalan dalam 15 menit → kunci 1, 2, 4, 8, … menit (maks 30), reset saat sukses ----
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const FAIL_THRESHOLD = 5;
const MAX_LOCK_MS = 30 * 60 * 1000;
const failures = new Map(); // kunci → { count, firstAt, lockedUntil, level }

setInterval(() => {
  const now = Date.now();
  for (const [key, f] of failures) {
    if (f.lockedUntil <= now && now - f.firstAt > FAIL_WINDOW_MS && f.level === 0) failures.delete(key);
    else if (f.lockedUntil <= now && now - f.lockedUntil > MAX_LOCK_MS * 2) failures.delete(key);
  }
}, 5 * 60 * 1000).unref();

const authThrottle = {
  check(key) {
    const f = failures.get(key);
    const now = Date.now();
    if (f && f.lockedUntil > now) return { allowed: false, retryAfter: Math.ceil((f.lockedUntil - now) / 1000) };
    return { allowed: true, retryAfter: 0 };
  },
  fail(key) {
    const now = Date.now();
    let f = failures.get(key);
    if (!f || (f.lockedUntil <= now && now - f.firstAt > FAIL_WINDOW_MS)) {
      f = { count: 0, firstAt: now, lockedUntil: 0, level: f ? f.level : 0 };
      failures.set(key, f);
    }
    f.count += 1;
    if (f.count >= FAIL_THRESHOLD) {
      const lockMs = Math.min(60 * 1000 * 2 ** f.level, MAX_LOCK_MS);
      f.lockedUntil = now + lockMs;
      f.level += 1;
      f.count = 0;
      f.firstAt = now;
    }
  },
  succeed(key) {
    failures.delete(key);
  },
  /** Hanya untuk pengujian: kosongkan semua penghitung. */
  reset() {
    failures.clear();
    buckets.clear();
  },
};

module.exports = { limit, authThrottle, tooMany, CLASSES };
