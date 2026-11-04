// server/services/audit.js — Catatan aksi admin dan aksi kritis (PRD R-21, F-ALG).
//
// Setiap aksi kritis (ubah role, ban/unban, hapus akun, ubah kredensial pengguna lain, moderasi, ubah pengaturan sistem) memanggil
// record() DI DALAM transaksi yang sama dengan efeknya, sehingga bila pencatatan gagal aksinya ikut dibatalkan (PRD R-21.8):
//
//   const audit = require('../../services/audit');
//   db.transaction(() => {
//     db.prepare('UPDATE ...').run(...);
//     audit.record({ actorId: req.user.id, action: 'user.ban', targetType: 'account', targetId: target.id,
//                    meta: { reasonCode: 'SPAM' }, requestId: req.id });
//   })();
//
// record() MELEMPAR galat bila gagal (sengaja; jangan ditelan). Isi `meta` hanya boleh ID, kode alasan, dan angka kecil: tidak boleh
// kata sandi, PIN, token, kunci API, alamat IP, atau isi pesan (PRD R-06.5, R-18.7). scrub() membuang kunci yang mencurigakan sebagai
// pagar terakhir, bukan sebagai izin untuk mengirim data sensitif.
//
// Pemilik berkas ini: pengembang Sanctum. Layar F-ALG membaca lewat list(); hanya Cosmos yang boleh (CAP-ADMINLOG-VIEW).
const crypto = require('crypto');
const { db, userQueries } = require('../db');

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_audit_log (
    id TEXT PRIMARY KEY,
    actor_id TEXT NOT NULL,
    actor_name TEXT,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    outcome TEXT NOT NULL DEFAULT 'DONE',
    meta TEXT NOT NULL DEFAULT '{}',
    request_id TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_audit_time ON admin_audit_log(created_at DESC, id DESC);
  CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_log(action, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_audit_target ON admin_audit_log(target_type, target_id);
`);

// Kunci dipecah menjadi kata (camelCase, snake_case, kebab-case); yang dibuang bila kata terakhirnya (atau dua kata terakhir) terlarang.
// Dengan begitu "membership" tidak ikut terbuang hanya karena berakhiran "ip", tetapi "clientIp" dan "plain_pin" terbuang.
const FORBIDDEN_WORDS = new Set(['pass', 'password', 'pin', 'token', 'secret', 'authorization', 'cookie', 'ip', 'phone', 'message', 'content', 'body']);
const FORBIDDEN_PAIRS = new Set(['api_key', 'ip_address', 'phone_number', 'access_key']);
const MAX_META_BYTES = 4096;

function isForbiddenKey(key) {
  const words = String(key).replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase().split(/[_\-\s]+/).filter(Boolean);
  if (!words.length) return false;
  return FORBIDDEN_WORDS.has(words[words.length - 1]) || FORBIDDEN_PAIRS.has(words.slice(-2).join('_'));
}

function scrub(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.length > 200 ? `${value.slice(0, 200)}…` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (depth >= 3) return undefined;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => scrub(item, depth + 1));
  if (typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (isForbiddenKey(key)) continue;
      const clean = scrub(item, depth + 1);
      if (clean !== undefined) out[key] = clean;
    }
    return out;
  }
  return undefined;
}

const q = {
  insert: db.prepare(`INSERT INTO admin_audit_log (id, actor_id, actor_name, action, target_type, target_id, outcome, meta, request_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
};

/** @returns {string} id baris audit */
function record({ actorId, action, targetType = null, targetId = null, outcome = 'DONE', meta = {}, requestId = null } = {}) {
  if (!actorId || !action) throw new Error('audit: actorId dan action wajib diisi');
  const actor = userQueries.getById.get(actorId);
  let body = JSON.stringify(scrub(meta) || {});
  if (Buffer.byteLength(body) > MAX_META_BYTES) body = JSON.stringify({ truncated: true });
  const id = crypto.randomUUID();
  q.insert.run(id, actorId, actor ? actor.username : null, String(action), targetType, targetId === null ? null : String(targetId), outcome, body, requestId, new Date().toISOString());
  return id;
}

/** Daftar terbaru lebih dulu. Paginasi cursor: lewatkan { t, id } dari baris terakhir halaman sebelumnya. */
function list({ limit = 20, after = null, action = null, actorId = null, targetType = null, targetId = null } = {}) {
  const where = [];
  const args = [];
  if (action) { where.push('action = ?'); args.push(action); }
  if (actorId) { where.push('actor_id = ?'); args.push(actorId); }
  if (targetType) { where.push('target_type = ?'); args.push(targetType); }
  if (targetId) { where.push('target_id = ?'); args.push(String(targetId)); }
  if (after) { where.push('(created_at < ? OR (created_at = ? AND id < ?))'); args.push(after.t, after.t, after.id); }
  const sql = `SELECT id, actor_id, actor_name, action, target_type, target_id, outcome, meta, request_id, created_at
    FROM admin_audit_log ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC, id DESC LIMIT ?`;
  return db.prepare(sql).all(...args, Math.min(Math.max(1, limit), 100) + 1).map((row) => ({ ...row, meta: safeParse(row.meta) }));
}

function safeParse(text) {
  try { return JSON.parse(text); } catch (_) { return {}; }
}

module.exports = { record, list, scrub };
