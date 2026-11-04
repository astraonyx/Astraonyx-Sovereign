// lib/accessControl.js — Cek akses whitelist nomor + grup (silent reject)
const fs = require('fs');
const config = require('../config');
const { jidToNumber, isGroupJid } = require('./helpers');
const { isGroupAllowed } = require('./groupSettings');

let _whitelistCache = null;
let _whitelistDebounceTimer = null;
let _whitelistDirty = false;

function flushWhitelist() {
  if (_whitelistDebounceTimer) {
    clearTimeout(_whitelistDebounceTimer);
    _whitelistDebounceTimer = null;
  }
  if (_whitelistDirty && _whitelistCache) {
    try {
      fs.writeFileSync(config.paths.whitelist, JSON.stringify(_whitelistCache, null, 2));
      _whitelistDirty = false;
    } catch (err) {
      console.error('[accessControl] Gagal flush whitelist ke disk:', err.message);
    }
  }
}

function invalidateWhitelistCache() {
  flushWhitelist();
  _whitelistCache = null;
}

process.on('beforeExit', flushWhitelist);
process.on('SIGINT', () => { flushWhitelist(); });
process.on('SIGTERM', () => { flushWhitelist(); });

function loadWhitelist(forceReload = false) {
  if (_whitelistCache && !forceReload) {
    return _whitelistCache;
  }

  try {
    const raw = fs.readFileSync(config.paths.whitelist, 'utf-8');
    const wl = JSON.parse(raw);
    let migrated = false;

    // Migrasi otomatis #1: format lama allowed = ["628xxx", ...] (array of string)
    // -> format baru allowed = [{ number: "628xxx", level: "level1" }, ...]
    if (Array.isArray(wl.allowed) && wl.allowed.length > 0 && typeof wl.allowed[0] === 'string') {
      wl.allowed = wl.allowed.map((number) => ({ number, level: 'level1' }));
      migrated = true;
    }

    // Migrasi otomatis #2: format lama owner = "628xxx" (single string)
    // -> format baru owners = ["628xxx", ...] (array, mendukung multi-owner).
    // Owner lama otomatis jadi owners[0] = PRIMARY owner (tidak bisa di-unset).
    if (typeof wl.owner === 'string' && wl.owner) {
      wl.owners = [wl.owner];
      delete wl.owner;
      migrated = true;
    }
    if (!Array.isArray(wl.owners)) {
      wl.owners = [];
    }

    _whitelistCache = wl;

    if (migrated) {
      saveWhitelist(wl, true);
      console.log('[accessControl] whitelist.json dimigrasi (level system + multi-owner).');
    }
    return _whitelistCache;
  } catch (err) {
    console.error('[accessControl] Gagal baca whitelist.json:', err.message);
    _whitelistCache = { owners: [], allowed: [] };
    return _whitelistCache;
  }
}

function loadGroupSettingsLegacy() {
  return isGroupAllowed;
}

const MAX_WHITELIST = 20;
const MAX_OWNERS = 5; // batas wajar, mencegah .setowner dipakai spam tanpa sengaja

function isOwner(number) {
  const wl = loadWhitelist();
  return wl.owners.includes(number);
}

// Primary owner = owners[0], SATU-SATUNYA yang boleh .setowner/.unsetowner.
// Ini owner pertama yang pernah diset (biasanya dari .env awal), tidak bisa dihapus.
function isPrimaryOwner(number) {
  const wl = loadWhitelist();
  return wl.owners[0] === number;
}

function isWhitelisted(number) {
  const wl = loadWhitelist();
  return wl.owners.includes(number) || wl.allowed.some((entry) => entry.number === number);
}

// Balikin 'owner' | 'level1' | 'level2' | null (null = tidak ada akses sama sekali)
function getLevel(number) {
  const wl = loadWhitelist();
  if (wl.owners.includes(number)) return 'owner';
  const entry = wl.allowed.find((e) => e.number === number);
  return entry ? entry.level : null;
}

// Level1 ke atas (owner, level1) boleh command admin grup. Level2 tidak.
function canUseAdminCommands(number) {
  const level = getLevel(number);
  return level === 'owner' || level === 'level1';
}

function saveWhitelist(wl, immediate = false) {
  _whitelistCache = wl;
  _whitelistDirty = true;

  if (immediate) {
    flushWhitelist();
    return;
  }

  if (_whitelistDebounceTimer) {
    clearTimeout(_whitelistDebounceTimer);
  }
  _whitelistDebounceTimer = setTimeout(() => {
    flushWhitelist();
  }, 2500);
}

// Hasil: { ok: boolean, reason?: string }
function addWhitelist(number, level = 'level1') {
  if (level !== 'level1' && level !== 'level2') {
    return { ok: false, reason: 'invalidlevel' };
  }
  const wl = loadWhitelist();
  if (wl.owners.includes(number) || wl.allowed.some((entry) => entry.number === number)) {
    return { ok: false, reason: 'duplicate' };
  }
  if (wl.allowed.length >= MAX_WHITELIST) {
    return { ok: false, reason: 'full' };
  }
  wl.allowed.push({ number, level });
  saveWhitelist(wl);
  return { ok: true };
}

function removeWhitelist(number) {
  const wl = loadWhitelist();
  if (!wl.allowed.some((entry) => entry.number === number)) {
    return { ok: false, reason: 'notfound' };
  }
  wl.allowed = wl.allowed.filter((entry) => entry.number !== number);
  saveWhitelist(wl);
  return { ok: true };
}

// Hasil: { ok: boolean, reason?: string }
function setLevel(number, level) {
  if (level !== 'level1' && level !== 'level2') {
    return { ok: false, reason: 'invalidlevel' };
  }
  const wl = loadWhitelist();
  const entry = wl.allowed.find((e) => e.number === number);
  if (!entry) {
    return { ok: false, reason: 'notfound' };
  }
  entry.level = level;
  saveWhitelist(wl);
  return { ok: true };
}

function isGroupAllowedLegacy(groupJid) {
  return isGroupAllowed(groupJid);
}

// Hasil: { ok: boolean, reason?: string }
// Hanya boleh dipanggil setelah caller sudah verifikasi isPrimaryOwner(senderNumber).
function addOwner(number) {
  const wl = loadWhitelist();
  if (wl.owners.includes(number)) {
    return { ok: false, reason: 'duplicate' };
  }
  if (wl.owners.length >= MAX_OWNERS) {
    return { ok: false, reason: 'full' };
  }
  // Kalau nomor ini kebetulan ada di whitelist biasa, keluarkan dulu dari situ
  // supaya tidak nyangkut ganda di 2 tempat (owners[] dan allowed[]).
  wl.allowed = wl.allowed.filter((entry) => entry.number !== number);
  wl.owners.push(number);
  saveWhitelist(wl);
  return { ok: true };
}

function removeOwner(number) {
  const wl = loadWhitelist();
  if (wl.owners[0] === number) {
    return { ok: false, reason: 'primary' }; // primary owner tidak bisa dihapus
  }
  if (!wl.owners.includes(number)) {
    return { ok: false, reason: 'notfound' };
  }
  wl.owners = wl.owners.filter((n) => n !== number);
  saveWhitelist(wl);
  return { ok: true };
}

function canProcess({ senderNumber, chatJid }) {
  if (!senderNumber) return false;

  const senderOk = isWhitelisted(senderNumber);
  if (!senderOk) return false;

  if (isGroupJid(chatJid)) {
    return isGroupAllowed(chatJid);
  }

  return true;
}

module.exports = {
  loadWhitelist,
  loadGroupSettings: loadGroupSettingsLegacy,
  isOwner,
  isPrimaryOwner,
  isWhitelisted,
  isGroupAllowed: isGroupAllowedLegacy,
  canProcess,
  addWhitelist,
  removeWhitelist,
  getLevel,
  canUseAdminCommands,
  setLevel,
  addOwner,
  removeOwner,
  MAX_WHITELIST,
  MAX_OWNERS,
  saveWhitelist,
  flushWhitelist,
  invalidateWhitelistCache,
};