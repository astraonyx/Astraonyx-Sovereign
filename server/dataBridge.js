// server/dataBridge.js — Jembatan Data Aman & Auto-Backup untuk Polaris Project
const fs = require('fs');
const path = require('path');
const config = require('../config');

const BACKUP_DIR = path.resolve(__dirname, '../database/backups');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Buat salinan cadangan sebelum mengubah file
function backupFile(targetFilePath) {
  try {
    if (!fs.existsSync(targetFilePath)) return;
    ensureDir(BACKUP_DIR);
    const basename = path.basename(targetFilePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `${basename}.${timestamp}.bak`);
    fs.copyFileSync(targetFilePath, backupPath);

    // Bersihkan backup lama jika lebih dari 30 file
    const backups = fs.readdirSync(BACKUP_DIR);
    if (backups.length > 30) {
      backups.sort().slice(0, backups.length - 30).forEach((oldFile) => {
        try { fs.unlinkSync(path.join(BACKUP_DIR, oldFile)); } catch (_) {}
      });
    }
  } catch (err) {
    console.error('[dataBridge] Gagal membuat backup file:', err.message);
  }
}

function readJsonFile(filePath, defaultValue = {}) {
  try {
    const fullPath = path.resolve(__dirname, '..', filePath);
    if (!fs.existsSync(fullPath)) {
      ensureDir(path.dirname(fullPath));
      fs.writeFileSync(fullPath, JSON.stringify(defaultValue, null, 2), 'utf-8');
      return defaultValue;
    }
    const content = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(content || '{}');
  } catch (err) {
    console.error(`[dataBridge] Gagal membaca JSON ${filePath}:`, err.message);
    return defaultValue;
  }
}

function writeJsonFile(filePath, data) {
  const fullPath = path.resolve(__dirname, '..', filePath);
  backupFile(fullPath);
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf-8');
  return { success: true };
}

// 1. Whitelist Management
function getWhitelist(instanceId = null) {
  let file = config.paths.whitelist;
  if (instanceId && instanceId !== 'primary') {
    file = `./instances/${instanceId}/database/whitelist.json`;
    const fullPath = path.resolve(__dirname, '..', file);
    if (!fs.existsSync(fullPath)) {
      const defaultData = readJsonFile(config.paths.whitelist, { allowed: [], owners: [] });
      writeJsonFile(file, defaultData);
      return defaultData;
    }
  }
  return readJsonFile(file, { allowed: [], owners: [] });
}

function saveWhitelist(data, instanceId = null) {
  if (!data || typeof data !== 'object') throw new Error('Data whitelist tidak valid.');
  if (!Array.isArray(data.allowed)) data.allowed = [];
  if (!Array.isArray(data.owners)) data.owners = [];
  let file = config.paths.whitelist;
  if (instanceId && instanceId !== 'primary') {
    file = `./instances/${instanceId}/database/whitelist.json`;
  }
  const res = writeJsonFile(file, data);
  try {
    const { invalidateWhitelistCache } = require('../lib/accessControl');
    invalidateWhitelistCache();
  } catch (_) {}
  return res;
}

// 2. Group Settings Management
const ECOSYSTEM_GROUPS_SPEC = {
  '120363433129894996@g.us': { subject: 'Polaris • Global Hot News' },
  '120363413809073711@g.us': { subject: 'Polaris • System & Error Logs' },
  '120363428762313719@g.us': { subject: 'Polaris • Output & Artifact Vault' },
  '120363428738481661@g.us': { subject: 'Polaris • AI Agent Sandbox' },
};

function ensureEcosystemGroupsAllowed(data) {
  if (!data || typeof data !== 'object') return data;
  if (!data.allowedGroups) data.allowedGroups = {};

  const ecoJids = { ...ECOSYSTEM_GROUPS_SPEC };
  try {
    const ecoFile = path.resolve(__dirname, '../database/bot_ecosystem_groups.json');
    if (fs.existsSync(ecoFile)) {
      const saved = JSON.parse(fs.readFileSync(ecoFile, 'utf-8'));
      if (saved && saved.groups) {
        Object.values(saved.groups).forEach((g) => {
          if (g && g.jid) {
            ecoJids[g.jid] = { subject: g.subject || 'Polaris Ecosystem Group' };
          }
        });
      }
    }
  } catch (_) {}

  for (const [jid, info] of Object.entries(ecoJids)) {
    if (!data.allowedGroups[jid]) {
      data.allowedGroups[jid] = {
        allowed: true,
        isEcosystem: true,
        name: info.subject,
        subject: info.subject,
        antilink: { enabled: false, whitelistDomains: [] },
        antibad: { enabled: false, wordlist: [] },
        antivirtex: { enabled: true },
        antidelete: true,
        welcome: { enabled: true, text: `Selamat datang @user di ${info.subject}!` },
      };
    } else {
      data.allowedGroups[jid].allowed = true;
      data.allowedGroups[jid].isEcosystem = true;
      if (!data.allowedGroups[jid].name && info.subject) {
        data.allowedGroups[jid].name = info.subject;
      }
    }
  }
  return data;
}

function getGroupSettings(instanceId = null) {
  let data;
  if (!instanceId || instanceId === 'primary') {
    data = readJsonFile(config.paths.groupSettings, { allowedGroups: {} });
  } else {
    const instRel = `./instances/${instanceId}/database/groupSettings.json`;
    const fullPath = path.resolve(__dirname, '..', instRel);
    if (!fs.existsSync(fullPath)) {
      const defaultData = readJsonFile(config.paths.groupSettings, { allowedGroups: {} });
      writeJsonFile(instRel, defaultData);
      data = defaultData;
    } else {
      data = readJsonFile(instRel, { allowedGroups: {} });
    }
  }
  return ensureEcosystemGroupsAllowed(data);
}

function saveGroupSettings(data, instanceId = null) {
  if (!data || typeof data !== 'object') throw new Error('Data group settings tidak valid.');
  if (!data.allowedGroups) data.allowedGroups = {};
  ensureEcosystemGroupsAllowed(data);
  let res;
  if (!instanceId || instanceId === 'primary') {
    res = writeJsonFile(config.paths.groupSettings, data);
    try {
      const { invalidateGroupSettingsCache } = require('../lib/groupSettings');
      invalidateGroupSettingsCache();
    } catch (_) {}
    return res;
  }
  const instRel = `./instances/${instanceId}/database/groupSettings.json`;
  return writeJsonFile(instRel, data);
}

// 3. Private Chat Settings
function getPrivateChatSettings(instanceId = null) {
  let file = config.paths.privateChatSettings;
  if (instanceId && instanceId !== 'primary') {
    file = `./instances/${instanceId}/database/privateChatSettings.json`;
    const fullPath = path.resolve(__dirname, '..', file);
    if (!fs.existsSync(fullPath)) {
      const defaultData = readJsonFile(config.paths.privateChatSettings, { chats: {} });
      writeJsonFile(file, defaultData);
      return defaultData;
    }
  }
  return readJsonFile(file, { chats: {} });
}

function savePrivateChatSettings(data, instanceId = null) {
  let file = config.paths.privateChatSettings;
  if (instanceId && instanceId !== 'primary') {
    file = `./instances/${instanceId}/database/privateChatSettings.json`;
  }
  return writeJsonFile(file, data);
}

// 4. Raw File Editor (Hanya file yang aman diatur: .env, config.js, whitelist.json, groupSettings.json, privateChatSettings.json)
const ALLOWED_RAW_FILES = {
  env: '.env',
  config: 'config.js',
  whitelist: config.paths.whitelist,
  groupSettings: config.paths.groupSettings,
  privateChatSettings: config.paths.privateChatSettings,
  commandOverrides: config.paths.commandOverrides || './database/command_overrides.json',
  customFeatures: config.paths.customFeatures || './database/custom_features.json',
};

function getRawFile(fileKey) {
  const relPath = ALLOWED_RAW_FILES[fileKey];
  if (!relPath) throw new Error('Akses file tidak diizinkan.');
  const fullPath = path.resolve(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) return '';
  return fs.readFileSync(fullPath, 'utf-8');
}

function saveRawFile(fileKey, content) {
  const relPath = ALLOWED_RAW_FILES[fileKey];
  if (!relPath) throw new Error('Akses file tidak diizinkan.');
  const fullPath = path.resolve(__dirname, '..', relPath);

  // Jika file adalah JSON, validasi format terlebih dahulu
  if (relPath.endsWith('.json')) {
    try {
      JSON.parse(content);
    } catch (err) {
      throw new Error(`Sintaks JSON tidak valid: ${err.message}`);
    }
  }

  backupFile(fullPath);
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, content, 'utf-8');
  return { success: true };
}

module.exports = {
  getWhitelist,
  saveWhitelist,
  getGroupSettings,
  saveGroupSettings,
  getPrivateChatSettings,
  savePrivateChatSettings,
  getRawFile,
  saveRawFile,
  readJsonFile,
  writeJsonFile,
  ALLOWED_RAW_FILES,
};
