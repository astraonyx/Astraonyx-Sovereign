// server/routes/ext/_kit.js — Alat bersama untuk modul rute tambahan (berkas lain di folder ini).
//
// Berkas berawalan "_" tidak dimuat sebagai rute. Setiap modul fitur menulis:
//
//   const kit = require('./_kit');
//   const { E, v, ok, created, page, newId, nowIso, db, limit, idempotency, emitTo, userBriefs } = kit;
//
//   kit.migrate('atomic_001_habits', (db) => db.exec(`CREATE TABLE IF NOT EXISTS atomic_habits (...)`));
//
//   const r = kit.makeRouter();                    // wajib login, batas laju bawaan R1 (baca) / R2 (tulis)
//   r.get('/habits', async (req) => {              // handler TERAKHIR dibungkus: boleh async, melempar E.* untuk galat,
//     const { limit: n, cursor } = page.params(req.query);   //   dan nilai yang dikembalikan menjadi { ok, data, requestId }
//     ...
//     return page.slice(rows, n, mapRow);
//   });
//   r.post('/habits', limit('R2'), idempotency(), async (req, res) => {
//     const body = v.object(req.body, { title: v.string({ min: 1, max: 80 }), color: v.color({ optional: true }) });
//     ...
//     res.status(201); return habit;
//   });
//   module.exports = { mount: '/api/v1/atomic', router: r };   // satu awalan unik per berkas
//
// Konvensi (PRD R-02, R-26): awalan /api/v1/<domain>; JSON camelCase; waktu ISO-8601 UTC; ID UUIDv7 (newId); daftar memakai cursor;
// jawaban sukses { ok:true, data, requestId }, gagal { ok:false, code, reason?, message, requestId, details?, retryAfterSec? }.
// Klien (dashboard/app/core/api.js) otomatis membuka `data` untuk /api/v1/* dan mengubah galat menjadi ApiError.
//
// Aturan keras bagi modul ext:
//   - Otorisasi dihitung di server dari req.user (peran dari database), tidak pernah dari body (PRD R-04, R-24.3 no. 13–16).
//   - Sumber daya milik orang lain dijawab 404, bukan 403 (cegah IDOR dan pembocoran keberadaan): pakai owned().
//   - Hanya kolom yang ada di skema validasi v.object() yang diterima (cegah mass assignment).
//   - Peristiwa realtime privat WAJIB lewat emitTo([...penerima]); emitAll() hanya untuk peristiwa yang memang publik.
//   - Jangan memuat atau mengembalikan kolom kata sandi, PIN, nomor telepon, kunci API, atau alamat IP. Pakai userBrief().
//   - Pekerjaan berat (unggah besar, render, AI panjang) tidak berjalan di dalam permintaan HTTP (PRD R-09.6).
const crypto = require('crypto');
const express = require('express');
const { db, userQueries } = require('../../db');
const auth = require('../../auth');
const rate = require('../../rateLimit');
const registry = require('../../services/registry');
const { notify } = require('../../services/notify');
const audit = require('../../services/audit');
const settings = require('../../services/settings');

/* ------------------------------------------------------------------ waktu dan ID */

const nowIso = () => new Date().toISOString();

let lastMs = 0;
let seq = 0;
/** UUIDv7 (PRD R-26.1): urut menurut waktu, monoton di dalam satu proses. */
function newId() {
  let ms = Date.now();
  if (ms <= lastMs) {
    ms = lastMs;
    seq += 1;
    if (seq > 0xfff) { ms += 1; seq = 0; }
  } else {
    seq = crypto.randomInt(0, 0x3ff);
  }
  lastMs = ms;
  const b = crypto.randomBytes(16);
  b.writeUInt32BE(Math.floor(ms / 0x10000), 0);
  b.writeUInt16BE(ms % 0x10000, 4);
  b[6] = 0x70 | ((seq >> 8) & 0x0f);
  b[7] = seq & 0xff;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = b.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Salin hanya kunci yang diizinkan (allowlist). */
function pick(source, keys) {
  const out = {};
  for (const key of keys) if (source && source[key] !== undefined) out[key] = source[key];
  return out;
}

/* ------------------------------------------------------------------ galat dan bentuk jawaban */

class HttpError extends Error {
  constructor(status, code, message, { reason, details, retryAfterSec, extra } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.reason = reason;
    this.details = details;
    this.retryAfterSec = retryAfterSec;
    this.extra = extra;
  }
}

/** Pembuat galat baku (kode hasil PRD R-02.2). Pesan bawaan aman dan berbahasa Indonesia. */
const E = {
  /** 400: format atau sintaks salah. details: [{ field, rule, message }] */
  invalid: (details = [], message = 'Isian belum sesuai. Periksa kolom yang ditandai.') => new HttpError(400, 'VALIDATION_ERROR', message, { details: Array.isArray(details) ? details : [] }),
  /** 422: aturan bisnis dilanggar. reason berupa KODE_HURUF_BESAR. */
  rule: (reason, message, details) => new HttpError(422, 'VALIDATION_ERROR', message || 'Permintaan tidak dapat diproses.', { reason, details }),
  unauthorized: (message = 'Sesi berakhir. Silakan masuk kembali.') => new HttpError(401, 'UNAUTHORIZED', message, { reason: 'SESSION_EXPIRED' }),
  forbidden: (message = 'Anda tidak memiliki izin untuk tindakan ini.', reason = 'FORBIDDEN') => new HttpError(403, 'FORBIDDEN', message, { reason }),
  roleRequired: (message = 'Peran Anda belum cukup untuk tindakan ini.') => new HttpError(403, 'FORBIDDEN', message, { reason: 'ROLE_REQUIRED' }),
  disabled: (message = 'Fitur ini sedang dinonaktifkan.') => new HttpError(403, 'FORBIDDEN', message, { reason: 'FEATURE_DISABLED' }),
  notFound: (message = 'Data tidak ditemukan.') => new HttpError(404, 'NOT_FOUND', message),
  conflict: (reason = 'STATE_INVALID', message = 'Data berubah oleh pihak lain. Muat ulang lalu coba lagi.') => new HttpError(409, 'CONFLICT', message, { reason }),
  exists: (message = 'Data dengan nama itu sudah ada.') => new HttpError(409, 'CONFLICT', message, { reason: 'ALREADY_EXISTS' }),
  quota: (message = 'Penyimpanan penuh. Hapus berkas untuk melanjutkan.') => new HttpError(409, 'CONFLICT', message, { reason: 'QUOTA_EXCEEDED' }),
  tooLarge: (message = 'Berkas terlalu besar.') => new HttpError(413, 'VALIDATION_ERROR', message, { reason: 'PAYLOAD_TOO_LARGE' }),
  rateLimited: (retryAfterSec = 30) => new HttpError(429, 'RATE_LIMITED', `Terlalu banyak permintaan. Coba lagi dalam ${retryAfterSec} detik.`, { retryAfterSec }),
  unavailable: (message = 'Layanan sedang tidak tersedia. Silakan coba lagi nanti.', retryAfterSec) => new HttpError(503, 'SERVICE_UNAVAILABLE', message, { retryAfterSec }),
  timeout: (message = 'Permintaan terlalu lama. Silakan coba lagi.') => new HttpError(504, 'TIMEOUT', message),
  internal: () => new HttpError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan di server. Coba lagi nanti.'),
};

function ok(res, data = null, status = 200) {
  return res.status(status).json({ ok: true, data, requestId: res.req && res.req.id });
}
const created = (res, data) => ok(res, data, 201);
const noContent = (res) => res.status(204).end();

function fail(res, status, code, reason, message, extra = {}) {
  const body = { ok: false, code, message, requestId: res.req && res.req.id };
  if (reason) body.reason = reason;
  if (extra.details && extra.details.length) body.details = extra.details;
  if (extra.retryAfterSec) {
    body.retryAfterSec = extra.retryAfterSec;
    body.retryAfter = extra.retryAfterSec; // nama lama yang masih dibaca sebagian klien
    res.set('Retry-After', String(extra.retryAfterSec));
  }
  // Pesan galat lama (success:false/error) tetap disertakan agar klien yang belum mengenal amplop baru tetap menampilkan teks yang benar.
  body.success = false;
  body.error = message;
  return res.status(status).json(body);
}

function sendError(res, err) {
  if (res.headersSent) return undefined;
  if (err instanceof HttpError) {
    return fail(res, err.status, err.code, err.reason, err.message, { details: err.details, retryAfterSec: err.retryAfterSec });
  }
  if (err && (err.code === 'SQLITE_BUSY' || err.code === 'SQLITE_LOCKED')) {
    return fail(res, 503, 'SERVICE_UNAVAILABLE', undefined, 'Layanan sedang sibuk. Silakan coba lagi.', { retryAfterSec: 2 });
  }
  // Galat tak terduga: catat di server (tanpa data pengguna), jawab seragam tanpa detail (PRD R-02.4).
  console.error(`[ext] ${res.req ? `${res.req.method} ${res.req.originalUrl.split('?')[0]} #${res.req.id}` : ''}`, err && err.stack ? err.stack : err);
  return fail(res, 500, 'INTERNAL_ERROR', undefined, 'Terjadi kesalahan di server. Coba lagi nanti.');
}

/**
 * Bungkus handler: galat (sinkron maupun async) menjadi jawaban galat baku; nilai yang dikembalikan dikirim sebagai ok().
 * Handler yang mengirim jawaban sendiri (res.json, sendFile, aliran) cukup tidak mengembalikan apa pun.
 * Status selain 200 diatur dengan res.status(201) sebelum return. DELETE yang tidak mengembalikan apa pun dijawab 204.
 */
function route(handler) {
  return async (req, res, next) => {
    try {
      const result = await handler(req, res, next);
      if (res.headersSent || res.writableEnded) return;
      if (result !== undefined) { ok(res, result, res.statusCode >= 200 && res.statusCode < 300 && res.statusCode !== 200 ? res.statusCode : 200); return; }
      if (req.method === 'DELETE') noContent(res);
    } catch (err) {
      sendError(res, err);
    }
  };
}

/* ------------------------------------------------------------------ validasi masukan (PRD R-15, R-24.3 no. 2) */

class RuleError extends Error {
  constructor(rule, message) {
    super(message);
    this.rule = rule;
  }
}
const bad = (rule, message) => { throw new RuleError(rule, message); };

function defineRule(fn, opts = {}) {
  fn.optional = Boolean(opts.optional);
  fn.hasDefault = Object.prototype.hasOwnProperty.call(opts, 'default');
  fn.default = opts.default;
  return fn;
}

const CONTROL_SINGLE = /[\u0000-\u001F\u007F]/g;
const CONTROL_MULTI = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const v = {
  /** v.string({ min, max, multiline, trim, lower, pattern, allowEmpty, optional, default }) */
  string: (opts = {}) => defineRule((value) => {
    const { min = 0, max = 500, multiline = false, trim = true, lower = false, pattern, allowEmpty = false } = opts;
    if (typeof value !== 'string') bad('TYPE', 'Isian harus berupa teks.');
    let s = value.normalize('NFC').replace(multiline ? CONTROL_MULTI : CONTROL_SINGLE, multiline ? '' : ' ');
    if (trim) s = s.trim();
    if (lower) s = s.toLowerCase();
    if (!s.length) {
      if (allowEmpty) return s;
      if (opts.optional) return undefined;
      bad('REQUIRED', 'Wajib diisi.');
    }
    const length = Array.from(s).length;
    if (length < min) bad('MIN_LENGTH', `Minimal ${min} karakter.`);
    if (length > max) bad('MAX_LENGTH', `Maksimal ${max} karakter.`);
    if (pattern && !pattern.test(s)) bad('FORMAT', 'Format belum sesuai.');
    return s;
  }, opts),

  /** v.int({ min, max }) — menerima angka atau teks angka. */
  int: (opts = {}) => defineRule((value) => {
    const n = typeof value === 'number' ? value : (typeof value === 'string' && /^-?\d{1,15}$/.test(value.trim()) ? Number(value) : NaN);
    if (!Number.isSafeInteger(n)) bad('TYPE', 'Isian harus berupa bilangan bulat.');
    if (opts.min !== undefined && n < opts.min) bad('MIN', `Minimal ${opts.min}.`);
    if (opts.max !== undefined && n > opts.max) bad('MAX', `Maksimal ${opts.max}.`);
    return n;
  }, opts),

  number: (opts = {}) => defineRule((value) => {
    const n = typeof value === 'number' ? value : (typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN);
    if (!Number.isFinite(n)) bad('TYPE', 'Isian harus berupa angka.');
    if (opts.min !== undefined && n < opts.min) bad('MIN', `Minimal ${opts.min}.`);
    if (opts.max !== undefined && n > opts.max) bad('MAX', `Maksimal ${opts.max}.`);
    return n;
  }, opts),

  bool: (opts = {}) => defineRule((value) => {
    if (value === true || value === 'true' || value === 1 || value === '1') return true;
    if (value === false || value === 'false' || value === 0 || value === '0') return false;
    return bad('TYPE', 'Pilihan harus aktif atau mati.');
  }, opts),

  oneOf: (list, opts = {}) => defineRule((value) => {
    if (!list.includes(value)) bad('ENUM', 'Pilih salah satu pilihan yang tersedia.');
    return value;
  }, opts),

  /** v.array(aturanItem, { min, max, unique }) */
  array: (itemRule, opts = {}) => defineRule((value) => {
    if (!Array.isArray(value)) bad('TYPE', 'Isian harus berupa daftar.');
    if (opts.min !== undefined && value.length < opts.min) bad('MIN_ITEMS', `Minimal ${opts.min} item.`);
    if (opts.max !== undefined && value.length > opts.max) bad('MAX_ITEMS', `Maksimal ${opts.max} item.`);
    const out = value.map((item, index) => {
      try { return itemRule(item); } catch (err) {
        if (err instanceof RuleError) bad(err.rule, `Item ke-${index + 1}: ${err.message}`);
        throw err;
      }
    });
    if (opts.unique && new Set(out).size !== out.length) bad('UNIQUE', 'Item tidak boleh sama.');
    return out;
  }, opts),

  /** ID teks aman (bukan harus UUID): huruf, angka, garis bawah, strip; maksimal 64. */
  id: (opts = {}) => defineRule((value) => {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(value)) bad('FORMAT', 'ID tidak valid.');
    return value;
  }, opts),

  /** Tanggal-waktu → string ISO-8601 UTC. */
  iso: (opts = {}) => defineRule((value) => {
    const ms = typeof value === 'string' || typeof value === 'number' ? new Date(value).getTime() : NaN;
    if (!Number.isFinite(ms)) bad('FORMAT', 'Tanggal dan jam tidak valid.');
    return new Date(ms).toISOString();
  }, opts),

  /** Tanggal kalender YYYY-MM-DD (hari mengikuti zona waktu akun; server tidak mengubahnya). */
  date: (opts = {}) => defineRule((value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) bad('FORMAT', 'Tanggal harus berbentuk TTTT-BB-HH.');
    const d = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) bad('FORMAT', 'Tanggal tidak ada di kalender.');
    return value;
  }, opts),

  /** URL http(s) tanpa kredensial. Hanya memeriksa bentuk; permintaan keluar tetap wajib melewati perlindungan SSRF (R-17). */
  url: (opts = {}) => defineRule((value) => {
    if (typeof value !== 'string' || value.length > (opts.max || 500)) bad('FORMAT', 'Tautan tidak valid.');
    let parsed;
    try { parsed = new URL(value.trim()); } catch (_) { return bad('FORMAT', 'Tautan tidak valid.'); }
    const protocols = opts.protocols || ['https:', 'http:'];
    if (!protocols.includes(parsed.protocol) || parsed.username || parsed.password) bad('FORMAT', 'Tautan tidak valid.');
    return parsed.href;
  }, opts),

  color: (opts = {}) => defineRule((value) => {
    if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) bad('FORMAT', 'Warna harus berbentuk #RRGGBB.');
    return value.toLowerCase();
  }, opts),

  /**
   * v.object(input, skema) → objek bersih berisi HANYA kunci skema. Semua galat dikumpulkan dan dilempar sekaligus sebagai
   * E.invalid([{ field, rule, message }]) agar formulir menandai semua kolom dalam satu putaran.
   */
  object(input, schema) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw E.invalid([{ field: '', rule: 'TYPE', message: 'Isi permintaan tidak valid.' }]);
    }
    const out = {};
    const errors = [];
    for (const [key, rule] of Object.entries(schema)) {
      const raw = input[key];
      if (raw === undefined || raw === null) {
        if (rule.hasDefault) out[key] = rule.default;
        else if (!rule.optional) errors.push({ field: key, rule: 'REQUIRED', message: 'Wajib diisi.' });
        continue;
      }
      try {
        const clean = rule(raw);
        if (clean === undefined) { if (rule.hasDefault) out[key] = rule.default; } else out[key] = clean;
      } catch (err) {
        if (err instanceof RuleError) errors.push({ field: key, rule: err.rule, message: err.message });
        else throw err;
      }
    }
    if (errors.length) throw E.invalid(errors);
    return out;
  },
};

/* ------------------------------------------------------------------ paginasi cursor (PRM-PAG-01, R-09.9) */

const page = {
  /** { limit, cursor } dari query; limit bawaan 20, maksimum 100. cursor rusak → E.invalid. */
  params(query = {}, { defaultLimit = 20, maxLimit = 100 } = {}) {
    let limit = defaultLimit;
    if (query.limit !== undefined && query.limit !== '') {
      limit = Number(query.limit);
      if (!Number.isInteger(limit) || limit < 1) throw E.invalid([{ field: 'limit', rule: 'MIN', message: 'Batas harus bilangan bulat positif.' }]);
      limit = Math.min(limit, maxLimit);
    }
    return { limit, cursor: page.decode(query.cursor) };
  },
  encode(row, tKey = 'created_at', idKey = 'id') {
    return Buffer.from(JSON.stringify([row[tKey], row[idKey]])).toString('base64url');
  },
  decode(cursor) {
    if (!cursor) return null;
    try {
      const [t, id] = JSON.parse(Buffer.from(String(cursor), 'base64url').toString('utf8'));
      if (typeof t !== 'string' && typeof t !== 'number') throw new Error('t');
      if (typeof id !== 'string' && typeof id !== 'number') throw new Error('id');
      return { t, id };
    } catch (_) {
      throw E.invalid([{ field: 'cursor', rule: 'FORMAT', message: 'Penanda halaman tidak valid.' }]);
    }
  },
  /**
   * Potongan SQL untuk "setelah cursor" pada urutan (tKey, idKey) menurun (bawaan) atau menaik:
   *   const after = page.after(cursor);   // { sql, args }
   *   db.prepare(`SELECT * FROM t WHERE account_id = ? AND ${after.sql} ORDER BY created_at DESC, id DESC LIMIT ?`)
   *     .all(accountId, ...after.args, limit + 1)
   * Kolom tidak berasal dari masukan pengguna; hanya nilai cursor yang dijadikan parameter.
   */
  after(cursor, { t = 'created_at', id = 'id', dir = 'DESC' } = {}) {
    if (!cursor) return { sql: '1 = 1', args: [] };
    const cmp = dir === 'ASC' ? '>' : '<';
    return { sql: `(${t} ${cmp} ? OR (${t} = ? AND ${id} ${cmp} ?))`, args: [cursor.t, cursor.t, cursor.id] };
  },
  /** rows diambil dengan LIMIT limit + 1 → { items, nextCursor, hasNext }. */
  slice(rows, limit, map = (row) => row, { t = 'created_at', id = 'id' } = {}) {
    const hasNext = rows.length > limit;
    const window = hasNext ? rows.slice(0, limit) : rows;
    return {
      items: window.map(map),
      nextCursor: hasNext ? page.encode(window[window.length - 1], t, id) : null,
      hasNext,
    };
  },
};

/* ------------------------------------------------------------------ otorisasi dan kepemilikan */

const needLogin = auth.authenticateToken;

/** Middleware: peran minimal (nama peran backend: member, cosmic_scout, ..., cosmos). Dihitung dari peran di database. */
function needRole(minRole) {
  const level = auth.getRoleLevel(minRole);
  return (req, res, next) => {
    if (!req.user || auth.getRoleLevel(req.user.role) < level) return sendError(res, E.roleRequired());
    return next();
  };
}
const needCosmos = (req, res, next) => {
  if (!req.user || auth.normalizeRole(req.user.role) !== 'cosmos') return sendError(res, E.roleRequired());
  return next();
};

/** true bila akun Cosmos. */
const isCosmos = (user) => Boolean(user) && auth.normalizeRole(user.role) === 'cosmos';

/** Baris harus ada dan milik akun; selain itu 404 (bukan 403) agar keberadaannya tidak bocor. */
function owned(row, accountId, column = 'account_id') {
  if (!row || row[column] !== accountId) throw E.notFound();
  return row;
}

/** Ringkasan publik akun: tanpa kata sandi, PIN, telepon, kunci API, atau sesi. */
function userBrief(id) {
  if (!id) return null;
  const row = userQueries.getById.get(id);
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name || row.username,
    avatarUrl: row.avatar_url || '',
    role: auth.normalizeRole(row.role),
    banned: Boolean(row.is_banned),
  };
}

/** Peta id → ringkasan untuk banyak akun sekaligus. Akun yang sudah tidak ada dikembalikan sebagai { id, username: '', deleted: true }. */
function userBriefs(ids) {
  const map = {};
  for (const id of new Set((ids || []).filter(Boolean))) map[id] = userBrief(id) || { id, username: '', displayName: 'Akun dihapus', avatarUrl: '', role: 'member', banned: false, deleted: true };
  return map;
}

/* ------------------------------------------------------------------ realtime */

const lazyWs = () => require('../../wsServer');

/** Kirim peristiwa PRIVAT hanya ke akun tertentu (id atau username). alsoCosmos menambahkan semua akun Cosmos. */
function emitTo(recipients, type, data, { alsoCosmos = false } = {}) {
  const to = [...new Set((recipients || []).filter(Boolean))];
  if (!to.length && !alsoCosmos) return;
  try { lazyWs().broadcastWs(type, data, { to, alsoCosmos }); } catch (_) { /* realtime opsional */ }
}
/** Kirim peristiwa PUBLIK ke semua pengguna yang sedang tersambung. Jangan pakai untuk data pribadi. */
function emitAll(type, data) {
  try { lazyWs().broadcastWs(type, data); } catch (_) { /* realtime opsional */ }
}
const onlineUserIds = () => { try { return lazyWs().onlineUserIds(); } catch (_) { return []; } };

/* ------------------------------------------------------------------ migrasi (maju-saja, PRD R-26.9) */

db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL);`);
const migrationApplied = db.prepare('SELECT 1 FROM schema_migrations WHERE name = ?');
const migrationMark = db.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)');

/**
 * Jalankan fn(db) tepat sekali per nama (dalam satu transaksi). Nama berbentuk '<domain>_<nomor>_<apa>'.
 * Untuk tabel baru, CREATE TABLE IF NOT EXISTS sudah cukup; pakai migrate() untuk ALTER, backfill, dan indeks.
 * Jangan ubah isi migrasi yang sudah berjalan; tambahkan migrasi baru.
 */
function migrate(name, fn) {
  if (!/^[a-z0-9_]{6,80}$/.test(name)) throw new Error(`migrate: nama '${name}' tidak valid`);
  if (migrationApplied.get(name)) return false;
  db.transaction(() => {
    fn(db);
    migrationMark.run(name, nowIso());
  })();
  return true;
}

/** Tambahkan kolom bila belum ada (SQLite tidak punya ADD COLUMN IF NOT EXISTS). */
function ensureColumn(table, column, ddl) {
  if (!/^[a-z_][a-z0-9_]*$/.test(table) || !/^[a-z_][a-z0-9_]*$/.test(column)) throw new Error('ensureColumn: nama tidak valid');
  const exists = db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
  if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
}

/* ------------------------------------------------------------------ idempotensi (PRD R-09.1) */

db.exec(`
  CREATE TABLE IF NOT EXISTS idempotency_keys (
    account_id TEXT NOT NULL,
    route TEXT NOT NULL,
    key TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    state TEXT NOT NULL,
    status INTEGER,
    response_snapshot TEXT,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    PRIMARY KEY (account_id, route, key)
  );
`);
const idem = {
  insert: db.prepare('INSERT OR IGNORE INTO idempotency_keys (account_id, route, key, request_hash, state, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  get: db.prepare('SELECT request_hash, state, status, response_snapshot, expires_at FROM idempotency_keys WHERE account_id = ? AND route = ? AND key = ?'),
  done: db.prepare("UPDATE idempotency_keys SET state = 'DONE', status = ?, response_snapshot = ? WHERE account_id = ? AND route = ? AND key = ?"),
  del: db.prepare('DELETE FROM idempotency_keys WHERE account_id = ? AND route = ? AND key = ?'),
  purge: db.prepare('DELETE FROM idempotency_keys WHERE expires_at < ?'),
};
idem.purge.run(nowIso());
setInterval(() => { try { idem.purge.run(nowIso()); } catch (_) { /* abaikan */ } }, 60 * 60 * 1000).unref();

/**
 * Middleware idempotensi. Klien mengirim header Idempotency-Key (api.post(..., { idempotent: true })).
 *   idempotency({ required: true })  → tanpa kunci: 400 VALIDATION_ERROR/IDEMPOTENCY_KEY_REQUIRED (wajib untuk uang, role, hapus, build).
 * Kunci sama + isi sama → jawaban pertama diputar ulang (header Idempotent-Replay: true); isi beda → 409 IDEMPOTENCY_KEY_REUSED;
 * sedang diproses → 409 REQUEST_IN_PROGRESS. Hanya jawaban 2xx yang disimpan; kegagalan melepas kunci supaya bisa dicoba lagi.
 * Catatan jujur: efek bisnis dan salinan jawaban TIDAK satu transaksi; handler tetap harus aman bila dijalankan ulang setelah crash.
 */
function idempotency({ required = false } = {}) {
  return (req, res, next) => {
    const key = req.get('Idempotency-Key');
    if (!key) {
      if (required) return fail(res, 400, 'VALIDATION_ERROR', 'IDEMPOTENCY_KEY_REQUIRED', 'Permintaan ini membutuhkan Idempotency-Key.');
      return next();
    }
    if (!/^[\w.:-]{8,100}$/.test(key)) return fail(res, 400, 'VALIDATION_ERROR', 'IDEMPOTENCY_KEY_INVALID', 'Idempotency-Key tidak valid.');
    const accountId = (req.user && req.user.id) || 'anon';
    const routeName = `${req.method} ${req.baseUrl}${req.route ? req.route.path : req.path}`;
    const hash = crypto.createHash('sha256').update(JSON.stringify([req.method, req.originalUrl, req.body || null])).digest('hex');
    const started = Date.now();
    const expires = new Date(started + 24 * 60 * 60 * 1000).toISOString();

    const claim = () => idem.insert.run(accountId, routeName, key, hash, 'IN_PROGRESS', new Date(started).toISOString(), expires).changes === 1;
    let claimed = claim();
    if (!claimed) {
      const existing = idem.get.get(accountId, routeName, key);
      if (existing && existing.expires_at < nowIso()) {
        idem.del.run(accountId, routeName, key);
        claimed = claim();
      } else if (existing) {
        if (existing.request_hash !== hash) return fail(res, 409, 'CONFLICT', 'IDEMPOTENCY_KEY_REUSED', 'Kunci permintaan ini sudah dipakai untuk isi yang berbeda.');
        if (existing.state === 'DONE') {
          res.set('Idempotent-Replay', 'true');
          return res.status(existing.status || 200).json(JSON.parse(existing.response_snapshot || 'null'));
        }
        return fail(res, 409, 'CONFLICT', 'REQUEST_IN_PROGRESS', 'Permintaan yang sama sedang diproses. Tunggu sebentar.');
      }
    }
    if (claimed) {
      const send = res.json.bind(res);
      res.json = (body) => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) idem.done.run(res.statusCode, JSON.stringify(body === undefined ? null : body), accountId, routeName, key);
          else idem.del.run(accountId, routeName, key);
        } catch (_) { /* penyimpanan salinan gagal: jawaban tetap dikirim */ }
        return send(body);
      };
      res.on('close', () => { if (!res.writableEnded) { try { idem.del.run(accountId, routeName, key); } catch (_) { /* abaikan */ } } });
    }
    return next();
  };
}

/* ------------------------------------------------------------------ router */

const METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const readLimit = rate.limit('R1');
const writeLimit = rate.limit('R2');

/**
 * makeRouter({ public }) → express.Router yang:
 *   - memasang authenticateToken (kecuali public: true; jangan pakai public untuk apa pun yang membaca data akun),
 *   - memasang batas laju bawaan R1 untuk baca dan R2 untuk tulis per akun (tambahkan limit('R3'/'R4'/'R5'/'R7') yang lebih ketat per rute),
 *   - membungkus handler TERAKHIR setiap r.get/post/put/patch/delete dengan route().
 * Satu berkas ext = satu awalan mount unik; jangan memasang dua router bawaan-login di awalan yang sama.
 */
function makeRouter({ public: isPublic = false } = {}) {
  const r = express.Router();
  if (!isPublic) {
    r.use(auth.authenticateToken);
    r.use((req, res, next) => (req.method === 'GET' || req.method === 'HEAD' ? readLimit : writeLimit)(req, res, next));
  }
  for (const method of METHODS) {
    const original = r[method].bind(r);
    r[method] = (path, ...handlers) => {
      if (!handlers.length) return original(path);
      const last = handlers.pop();
      return original(path, ...handlers, route(last));
    };
  }
  return r;
}

/* ------------------------------------------------------------------ waktu lokal akun */

const DEFAULT_TZ = 'Asia/Jakarta';

/** Zona waktu IANA akun (PRD PRM-ATM-01). Bawaan Asia/Jakarta; penyedia didaftarkan akun-core lewat registry.registerTimeZone. */
function userTimeZone(accountId) {
  const tz = registry.timeZoneOf(accountId);
  try { new Intl.DateTimeFormat('en-CA', { timeZone: tz }); return tz; } catch (_) { return DEFAULT_TZ; }
}

/** Tanggal lokal akun 'YYYY-MM-DD' pada saat `at` (Date | ISO | ms). Jangan pernah memakai jam atau tanggal dari klien (PRD R-26.2). */
function localDate(accountId, at = new Date()) {
  const date = at instanceof Date ? at : new Date(at);
  return new Intl.DateTimeFormat('en-CA', { timeZone: userTimeZone(accountId), year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/* ------------------------------------------------------------------ pekerjaan berkala */

const jobs = new Map();

/**
 * every(nama, ms, fn, { initialDelayMs }) → fungsi pembatal. Pekerjaan ringan berkala di dalam proses ini (pemulihan, rekonsiliasi,
 * pembersihan). Satu proses dijalankan sekali pada satu waktu (putaran yang masih berjalan dilewati), galat dicatat dan tidak
 * mematikan server, timer tidak menahan proses tetap hidup. Nama harus unik. Dimatikan bila AX_NO_JOBS=1 (untuk pengujian).
 * Pekerjaan berat tetap bukan untuk di sini (PRD R-09.6).
 */
function every(name, ms, fn, { initialDelayMs = Math.min(ms, 5000) } = {}) {
  if (process.env.AX_NO_JOBS === '1') return () => {};
  if (jobs.has(name)) throw new Error(`kit.every: pekerjaan '${name}' sudah terdaftar`);
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await fn(); } catch (err) { console.error(`[job:${name}]`, err && err.message); } finally { running = false; }
  };
  const first = setTimeout(tick, initialDelayMs);
  const timer = setInterval(tick, ms);
  first.unref();
  timer.unref();
  jobs.set(name, { first, timer });
  return () => { clearTimeout(first); clearInterval(timer); jobs.delete(name); };
}

/* ------------------------------------------------------------------ progresi (EXP, streak, Soul Coins) */

/**
 * kit.progress: satu-satunya cara fitur memicu EXP, Soul Coins, dan streak (PRD §9.9). Implementasi ada di server/services/progress.js
 * (pemilik: agen "progress"). Selama layanan itu belum ada atau gagal, semua panggilan mengembalikan { ok:false, awarded:0, reason:'UNAVAILABLE' }
 * dan TIDAK PERNAH melempar galat: aksi pengguna di fitur Anda tidak boleh gagal karena progresi.
 *
 *   await kit.progress.reward({ service:'atomic', accountId, sourceKey:'ATM_HABIT_CHECKIN', refId, occurredAt?, scopeKey?, metadata?, activity?: 'LEARNING'|'PRODUCTIVITY' })
 *       → { ok, exp:{ awarded, reason, totalExp, level }, coins:{ awarded, reason, balance }, streak:{ counted, currentCount, dayColor } | null }
 *   kit.progress.awardExp(...) / awardCoins(...) / recordActivity(...) tersedia untuk kasus khusus.
 *   kit.progress.summary(accountId) → ringkasan milik sendiri { totalExp, level, expIntoLevel, expToNextLevel, todayEarned, dailyCap, streak:{...}, coins:{ balance, todayEarned, dailyCap } };
 *   kit.progress.publicSummary(accountId, { viewer }) → bagian yang boleh dilihat orang lain menurut privasi profil (untuk F-PRO), atau null.
 *
 * service = nama domain Anda ('luminary' | 'atomic' | 'polarium' | 'polaris' | 'nebula' | 'starlium' | 'sirium' | 'entry' | 'account').
 * Panggil SETELAH aksi pengguna tersimpan; accountId dari sesi, tidak pernah dari klien; jangan mengirim teks isi di metadata.
 */
const PROGRESS_METHODS = ['reward', 'awardExp', 'awardCoins', 'recordActivity', 'summary', 'publicSummary'];
let progressService = null;
let progressTriedAt = 0;
function loadProgress() {
  if (progressService) return progressService;
  if (Date.now() - progressTriedAt < 10000) return null; // jangan memuat ulang tiap panggilan bila belum ada
  progressTriedAt = Date.now();
  try {
    progressService = require('../../services/progress');
  } catch (err) {
    const missing = err && err.code === 'MODULE_NOT_FOUND' && /services[\\/]progress/.test(String(err.message));
    if (!missing) console.error('[kit.progress] layanan progresi gagal dimuat:', err && err.message);
    progressService = null;
  }
  return progressService;
}
const UNAVAILABLE = { ok: false, awarded: 0, reason: 'UNAVAILABLE' };
const progress = {};
for (const name of PROGRESS_METHODS) {
  progress[name] = async (args) => {
    const svc = loadProgress();
    if (!svc || typeof svc[name] !== 'function') return { ...UNAVAILABLE };
    try {
      return await svc[name](args);
    } catch (err) {
      console.error(`[kit.progress.${name}]`, err && err.message);
      return { ...UNAVAILABLE };
    }
  };
}

module.exports = {
  // bentuk jawaban dan galat
  E, HttpError, ok, created, noContent, fail, sendError, route,
  // masukan dan data
  v, page, pick, newId, nowIso, owned,
  // router dan middleware
  makeRouter, needLogin, needRole, needCosmos, isCosmos, limit: rate.limit, tooMany: rate.tooMany, idempotency,
  // akun
  userBrief, userBriefs,
  // realtime
  emitTo, emitAll, onlineUserIds,
  // data
  db, migrate, ensureColumn,
  // layanan bersama
  notify, registry, audit, settings, progress,
  // waktu lokal akun dan pekerjaan berkala
  userTimeZone, localDate, every,
  // otentikasi mentah bila perlu
  auth,
};
