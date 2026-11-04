// lib/groupSettings.js — Pusat baca/tulis setting per-grup (moderasi, welcome, warn, dll).
// Menggantikan akses fs.readFileSync/writeFileSync manual yang sebelumnya
// tersebar di index.js, supaya semua fitur moderasi Fase 5 punya satu sumber.

const fs = require('fs');
const config = require('../config');

// Default setting untuk grup yang baru pertama kali punya entry.
// Field ini dipakai sebagai base merge, supaya grup lama (migrasi) otomatis
// dapat semua field baru tanpa kehilangan data yang sudah ada.
function defaultSettings() {
  return {
    allowed: true,
    antilink: { enabled: false, whitelistDomains: [] },
    antibad: { enabled: false, wordlist: [] },
    antibot: false, // placeholder, belum ada aksi nyata (lihat lib/welcomeHandler.js)
    antifake: { enabled: false, blockedPrefixes: [] }, // custom blocklist kode negara
    antispam: { enabled: false },
    antivirtex: { enabled: false },
    antidelete: false,
    welcome: { enabled: false, text: null },
    notify: false,
    warnLimit: config.warnLimit || 10,
    warnCounts: {}, // { "628xxx": 2 }
    bannedUsers: [], // ["628xxx", ...] -> user diblokir pakai command bot di grup ini
    reminder: { enabled: false, hour: null, minute: null, message: null }, // auto-reminder harian per grup
    mutegc: false, // mute bot di grup
    antiwame: false, // filter link wa.me
    autostickergc: false, // auto convert image ke stiker
    autosimi: false, // auto simsimi AI chat di grup
  };
}

let _groupSettingsCache = null;
let _groupSettingsDebounceTimer = null;
let _groupSettingsDirty = false;

function flushGroupSettings() {
  if (_groupSettingsDebounceTimer) {
    clearTimeout(_groupSettingsDebounceTimer);
    _groupSettingsDebounceTimer = null;
  }
  if (_groupSettingsDirty && _groupSettingsCache) {
    try {
      fs.writeFileSync(config.paths.groupSettings, JSON.stringify(_groupSettingsCache, null, 2));
      _groupSettingsDirty = false;
    } catch (err) {
      console.error('[groupSettings] Gagal flush groupSettings ke disk:', err.message);
    }
  }
}

function invalidateGroupSettingsCache() {
  flushGroupSettings();
  _groupSettingsCache = null;
}

// Pastikan data tersimpan jika proses terminate
process.on('beforeExit', flushGroupSettings);
process.on('SIGINT', () => { flushGroupSettings(); });
process.on('SIGTERM', () => { flushGroupSettings(); });

function loadGroupSettings(forceReload = false) {
  if (_groupSettingsCache && !forceReload) {
    return _groupSettingsCache;
  }

  try {
    const raw = fs.readFileSync(config.paths.groupSettings, 'utf-8');
    const data = JSON.parse(raw);
    let migrated = false;

    if (!data.allowedGroups) data.allowedGroups = {};

    // Migrasi format lama: allowedGroups[jid] = true (boolean)
    // -> format baru: allowedGroups[jid] = { allowed: true, antilink: {...}, ... }
    for (const jid of Object.keys(data.allowedGroups)) {
      const entry = data.allowedGroups[jid];
      if (typeof entry === 'boolean') {
        data.allowedGroups[jid] = { ...defaultSettings(), allowed: entry };
        migrated = true;
      } else if (typeof entry === 'object' && entry !== null) {
        // Merge shallow supaya field baru yang belum ada di entry lama ikut ditambahkan,
        // tanpa menimpa field yang sudah ada nilainya.
        const merged = { ...defaultSettings(), ...entry };
        // Merge 1 level lebih dalam untuk sub-object supaya tidak overwrite total
        merged.antilink = { ...defaultSettings().antilink, ...(entry.antilink || {}) };
        merged.antibad = { ...defaultSettings().antibad, ...(entry.antibad || {}) };
        merged.antispam = { ...defaultSettings().antispam, ...(entry.antispam || {}) };
        merged.antivirtex = { ...defaultSettings().antivirtex, ...(entry.antivirtex || {}) };
        merged.antifake = typeof entry.antifake === 'boolean'
          ? { ...defaultSettings().antifake, enabled: entry.antifake }
          : { ...defaultSettings().antifake, ...(entry.antifake || {}) };
        merged.welcome = { ...defaultSettings().welcome, ...(entry.welcome || {}) };
        merged.warnCounts = entry.warnCounts || {};
        merged.bannedUsers = entry.bannedUsers || [];
        if (JSON.stringify(merged) !== JSON.stringify(entry)) migrated = true;
        data.allowedGroups[jid] = merged;
      }
    }

    // Pastikan 4 grup ekosistem resmi selalu terdaftar & aktif izinnya
    const ECO_SPEC = {
      '120363433129894996@g.us': 'Polaris • Global Hot News',
      '120363413809073711@g.us': 'Polaris • System & Error Logs',
      '120363428762313719@g.us': 'Polaris • Output & Artifact Vault',
      '120363428738481661@g.us': 'Polaris • AI Agent Sandbox',
    };
    for (const [eJid, eName] of Object.entries(ECO_SPEC)) {
      if (!data.allowedGroups[eJid]) {
        data.allowedGroups[eJid] = { ...defaultSettings(), allowed: true, isEcosystem: true, name: eName, subject: eName };
        migrated = true;
      } else {
        if (!data.allowedGroups[eJid].allowed) {
          data.allowedGroups[eJid].allowed = true;
          migrated = true;
        }
        data.allowedGroups[eJid].isEcosystem = true;
      }
    }

    _groupSettingsCache = data;

    if (migrated) {
      saveGroupSettings(data, true);
      console.log('[groupSettings] groupSettings.json dimigrasi/di-merge ke format lengkap Fase 5.');
    }

    return _groupSettingsCache;
  } catch (err) {
    console.error('[groupSettings] Gagal baca groupSettings.json:', err.message);
    _groupSettingsCache = { allowedGroups: {} };
    return _groupSettingsCache;
  }
}

function saveGroupSettings(data, immediate = false) {
  _groupSettingsCache = data;
  _groupSettingsDirty = true;

  if (immediate) {
    flushGroupSettings();
    return;
  }

  if (_groupSettingsDebounceTimer) {
    clearTimeout(_groupSettingsDebounceTimer);
  }
  _groupSettingsDebounceTimer = setTimeout(() => {
    flushGroupSettings();
  }, 2500);
}

function getGroup(chatJid) {
  const data = loadGroupSettings();
  return data.allowedGroups[chatJid] || null;
}

function updateGroup(chatJid, updater, immediate = false) {
  const data = loadGroupSettings();
  if (!data.allowedGroups[chatJid]) {
    data.allowedGroups[chatJid] = defaultSettings();
  }
  updater(data.allowedGroups[chatJid]);
  saveGroupSettings(data, immediate);
  return data.allowedGroups[chatJid];
}

const ECO_KNOWN_JIDS = new Set([
  '120363433129894996@g.us', // Polaris • Global Hot News
  '120363413809073711@g.us', // Polaris • System & Error Logs
  '120363428762313719@g.us', // Polaris • Output & Artifact Vault
  '120363428738481661@g.us', // Polaris • AI Agent Sandbox
]);

function isGroupAllowed(chatJid) {
  if (!chatJid || typeof chatJid !== 'string') return false;

  // 1. Selalu izinkan JID grup ekosistem resmi Polaris
  if (ECO_KNOWN_JIDS.has(chatJid)) return true;

  try {
    const botEcosystemGroups = require('./botEcosystemGroups');
    const eco = botEcosystemGroups.getSavedData();
    if (eco && eco.groups) {
      for (const key of Object.keys(eco.groups)) {
        if (eco.groups[key]?.jid === chatJid) return true;
      }
    }
  } catch (_) {}

  // 2. Chat pribadi (@s.whatsapp.net) BUKAN grup, tidak boleh diizinkan
  if (!chatJid.endsWith('@g.us')) return false;

  // 3. Periksa status allowed di database grup
  const g = getGroup(chatJid);
  return Boolean(g && g.allowed);
}

module.exports = {
  defaultSettings,
  loadGroupSettings,
  saveGroupSettings,
  getGroup,
  updateGroup,
  isGroupAllowed,
  flushGroupSettings,
  invalidateGroupSettingsCache,
};
