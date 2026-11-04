// server/services/settings.js — Pengaturan sistem yang bisa diubah Cosmos saat berjalan (PRD F-SYS, R-26.10).
//
// Fitur TIDAK menulis tabel pengaturan sendiri dan tidak membaca .env untuk nilai yang boleh diubah pemilik. Fitur mendaftarkan kuncinya
// lewat defineSetting() saat modulnya dimuat; Sanctum membaca daftar itu untuk membuat layar Pengaturan Sistem dan menulis perubahan
// lewat setSetting() (rute Sanctum wajib memeriksa Cosmos dan mencatat audit).
//
//   const { defineSetting, getSetting } = require('../../services/settings');
//   defineSetting({ key: 'sirium.enabled', type: 'boolean', default: false, group: 'sirium', label: 'Sirium aktif',
//                   hint: 'Bila mati, katalog dan toko tidak bisa dibuka.', owner: 'F-SKT' });
//   if (!getSetting('sirium.enabled')) throw E.disabled('Sirium belum diaktifkan.');
//
// Tipe: boolean | number | string | enum (options: [...]) | list (daftar string, mis. istilah terlarang).
// Nilai dibaca dari database dengan cache 5 detik (R-26.10); setSetting() membersihkan cache seketika.
// Kunci bertanda fixed: true tidak dapat diubah lewat pengaturan (PRD Lampiran D, "[tetap]").
const { db } = require('../db');

db.exec(`
  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_by TEXT,
    updated_at TEXT NOT NULL
  );
`);

const CACHE_MS = 5000;
const definitions = new Map();
const listeners = new Map(); // key atau '*' → Set<fn>
let cache = null;
let cacheAt = 0;

const q = {
  all: db.prepare('SELECT key, value, version, updated_by, updated_at FROM system_settings'),
  get: db.prepare('SELECT key, value, version FROM system_settings WHERE key = ?'),
  put: db.prepare(`INSERT INTO system_settings (key, value, version, updated_by, updated_at) VALUES (?, ?, 1, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, version = system_settings.version + 1, updated_by = excluded.updated_by, updated_at = excluded.updated_at`),
  del: db.prepare('DELETE FROM system_settings WHERE key = ?'),
};

const TYPES = new Set(['boolean', 'number', 'string', 'enum', 'list']);

function defineSetting(def) {
  if (!def || !/^[a-z0-9_]+(\.[a-z0-9_]+)+$/.test(def.key || '')) throw new Error("settings: key berbentuk 'domain.nama'");
  if (!TYPES.has(def.type)) throw new Error(`settings: tipe tidak dikenal untuk ${def.key}`);
  if (def.type === 'enum' && (!Array.isArray(def.options) || !def.options.length)) throw new Error(`settings: ${def.key} butuh options`);
  definitions.set(def.key, { group: def.key.split('.')[0], label: def.key, hint: '', owner: '', fixed: false, ...def });
  return def.key;
}

/**
 * onChange(key | '*', fn({ key, value, previous, actorId, reset })) → fungsi pembatal.
 * Dipanggil seketika setelah setSetting/resetSetting berhasil (di proses ini). Pendengar yang melempar galat diabaikan.
 * Dipakai mis. untuk menyiarkan 'registration.status.changed' ke klien ketika pengaturan 'registration.open' berubah.
 */
function onChange(key, fn) {
  if (typeof fn !== 'function') throw new Error('settings: onChange butuh fungsi');
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(fn);
  return () => listeners.get(key)?.delete(fn);
}

function fire(payload) {
  for (const k of [payload.key, '*']) {
    for (const fn of listeners.get(k) || []) {
      try { fn(payload); } catch (_) { /* pendengar tidak boleh menggagalkan penyimpanan */ }
    }
  }
}

/** Ubah nilai mentah → nilai bertipe sesuai definisi; melempar Error berpesan Indonesia bila tidak sah. */
function coerce(def, input) {
  switch (def.type) {
    case 'boolean':
      if (input === true || input === 'true' || input === 1 || input === '1') return true;
      if (input === false || input === 'false' || input === 0 || input === '0') return false;
      throw new Error('Nilai harus aktif atau mati.');
    case 'number': {
      const n = typeof input === 'number' ? input : Number(input);
      if (!Number.isFinite(n)) throw new Error('Nilai harus berupa angka.');
      if (def.min !== undefined && n < def.min) throw new Error(`Minimal ${def.min}.`);
      if (def.max !== undefined && n > def.max) throw new Error(`Maksimal ${def.max}.`);
      return def.integer === false ? n : Math.trunc(n);
    }
    case 'enum':
      if (!def.options.includes(input)) throw new Error('Pilih salah satu pilihan yang tersedia.');
      return input;
    case 'list': {
      const list = Array.isArray(input) ? input : String(input ?? '').split('\n');
      const clean = [...new Set(list.map((s) => String(s).normalize('NFC').trim()).filter(Boolean))];
      if (clean.length > (def.maxItems || 200)) throw new Error(`Maksimal ${def.maxItems || 200} baris.`);
      if (clean.some((s) => s.length > (def.maxLength || 120))) throw new Error(`Tiap baris maksimal ${def.maxLength || 120} karakter.`);
      return clean;
    }
    default: {
      const s = String(input ?? '').normalize('NFC').trim();
      if (s.length > (def.maxLength || 500)) throw new Error(`Maksimal ${def.maxLength || 500} karakter.`);
      return s;
    }
  }
}

function load() {
  const now = Date.now();
  if (cache && now - cacheAt < CACHE_MS) return cache;
  const map = new Map();
  for (const row of q.all.all()) map.set(row.key, row);
  cache = map;
  cacheAt = now;
  return map;
}

function getSetting(key) {
  const def = definitions.get(key);
  if (!def) throw new Error(`settings: ${key} belum didaftarkan lewat defineSetting()`);
  const row = load().get(key);
  if (!row) return def.default;
  try {
    return coerce(def, JSON.parse(row.value));
  } catch (_) {
    return def.default; // nilai rusak di database: pakai bawaan, jangan jatuh
  }
}

/** { ok: true, value, version } atau { ok: false, message }. Pemanggil bertanggung jawab atas izin dan audit. */
function setSetting(key, input, { actorId = null } = {}) {
  const def = definitions.get(key);
  if (!def) return { ok: false, message: 'Pengaturan tidak dikenal.' };
  if (def.fixed) return { ok: false, message: 'Pengaturan ini tetap dan tidak dapat diubah.' };
  let value;
  try {
    value = coerce(def, input);
  } catch (err) {
    return { ok: false, message: err.message };
  }
  const previous = getSetting(key);
  q.put.run(key, JSON.stringify(value), actorId, new Date().toISOString());
  cache = null;
  fire({ key, value, previous, actorId, reset: false });
  return { ok: true, value, version: q.get.get(key).version };
}

/** Kembalikan ke nilai bawaan (hapus baris). */
function resetSetting(key) {
  const def = definitions.get(key);
  const previous = def ? getSetting(key) : undefined;
  q.del.run(key);
  cache = null;
  if (def) fire({ key, value: def.default, previous, actorId: null, reset: true });
}

/** Untuk layar Pengaturan Sistem: semua definisi beserta nilai sekarang. */
function listSettings() {
  const rows = load();
  return [...definitions.values()].map((def) => {
    const row = rows.get(def.key);
    return {
      key: def.key,
      group: def.group,
      label: def.label,
      hint: def.hint,
      owner: def.owner,
      type: def.type,
      options: def.options || null,
      min: def.min ?? null,
      max: def.max ?? null,
      fixed: Boolean(def.fixed),
      default: def.default,
      value: getSetting(def.key),
      changed: Boolean(row),
      version: row ? row.version : 0,
      updatedAt: row ? row.updated_at : null,
    };
  });
}

module.exports = { defineSetting, getSetting, setSetting, resetSetting, listSettings, onChange };
