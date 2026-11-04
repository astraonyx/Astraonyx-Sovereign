// lib/groupsManager.js — Pengelola Metadata & Nama Grup WhatsApp untuk Polaris
const fs = require('fs');
const path = require('path');
const config = require('../config');

const GROUPS_CACHE_FILE = path.resolve(__dirname, '../database/groups_cache.json');
const GROUP_SETTINGS_FILE = path.resolve(__dirname, '..', config.paths?.groupSettings || './database/groupSettings.json');

function ensureFile() {
  const dir = path.dirname(GROUPS_CACHE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(GROUPS_CACHE_FILE)) {
    fs.writeFileSync(GROUPS_CACHE_FILE, JSON.stringify({}, null, 2), 'utf-8');
  }
}

function getGroupsFilePath(instanceId = null) {
  const targetId = instanceId || process.env.INSTANCE_ID || null;
  if (!targetId || targetId === 'primary') {
    return GROUPS_CACHE_FILE;
  }
  const instDir = path.resolve(__dirname, `../instances/${targetId}/database`);
  if (!fs.existsSync(instDir)) fs.mkdirSync(instDir, { recursive: true });
  return path.join(instDir, 'groups_cache.json');
}

function loadGroupsCache(instanceId = null) {
  const filePath = getGroupsFilePath(instanceId);
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw || '{}');
    }
  } catch (err) {
    console.error('[groupsManager] Gagal membaca groups_cache.json:', err.message);
  }

  // Fallback baca primary groups_cache.json
  try {
    ensureFile();
    const primaryRaw = fs.readFileSync(GROUPS_CACHE_FILE, 'utf-8');
    return JSON.parse(primaryRaw || '{}');
  } catch (_) {}
  return {};
}

function saveGroupsCache(cache, instanceId = null) {
  const filePath = getGroupsFilePath(instanceId);
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (err) {
    console.error('[groupsManager] Gagal menulis groups_cache.json:', err.message);
  }
}

// Rekam / perbarui informasi nama grup
function recordGroup(jid, subject, meta = {}) {
  if (!jid || !jid.endsWith('@g.us')) return;
  const cleanSubject = String(subject || '').trim();
  const cache = loadGroupsCache();

  const existing = cache[jid] || {};
  cache[jid] = {
    jid,
    name: cleanSubject || existing.name || jid,
    subject: cleanSubject || existing.subject || jid,
    participantsCount: meta.participants ? meta.participants.length : (existing.participantsCount || 0),
    desc: meta.desc || existing.desc || '',
    owner: meta.owner || existing.owner || '',
    creation: meta.creation || existing.creation || null,
    updatedAt: new Date().toISOString(),
  };

  saveGroupsCache(cache);

  // Sinkronkan juga ke database/groupSettings.json jika grup tersebut terdaftar
  try {
    if (fs.existsSync(GROUP_SETTINGS_FILE)) {
      const settingsRaw = fs.readFileSync(GROUP_SETTINGS_FILE, 'utf-8');
      const settings = JSON.parse(settingsRaw || '{}');
      if (settings.allowedGroups && settings.allowedGroups[jid]) {
        settings.allowedGroups[jid].name = cache[jid].name;
        settings.allowedGroups[jid].subject = cache[jid].name;
        if (cache[jid].participantsCount) {
          settings.allowedGroups[jid].participantsCount = cache[jid].participantsCount;
        }
        fs.writeFileSync(GROUP_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
      }
    }
  } catch (err) {
    console.error('[groupsManager] Gagal sinkronkan nama ke groupSettings.json:', err.message);
  }

  return cache[jid];
}

// Sinkronkan kumpulan grup sekaligus dari sock.groupFetchAllParticipating()
function syncGroupsFromBaileys(groupsMap) {
  if (!groupsMap || typeof groupsMap !== 'object') return 0;
  const cache = loadGroupsCache();
  let count = 0;

  for (const jid of Object.keys(groupsMap)) {
    const meta = groupsMap[jid];
    if (!meta) continue;
    const cleanSubject = String(meta.subject || '').trim();
    const existing = cache[jid] || {};

    cache[jid] = {
      jid,
      name: cleanSubject || existing.name || jid,
      subject: cleanSubject || existing.subject || jid,
      participantsCount: Array.isArray(meta.participants) ? meta.participants.length : (existing.participantsCount || 0),
      desc: typeof meta.desc === 'string' ? meta.desc : (existing.desc || ''),
      owner: meta.owner || existing.owner || '',
      creation: meta.creation || existing.creation || null,
      updatedAt: new Date().toISOString(),
    };
    count++;
  }

  saveGroupsCache(cache);

  // Perbarui semua nama di database/groupSettings.json
  try {
    if (fs.existsSync(GROUP_SETTINGS_FILE)) {
      const settingsRaw = fs.readFileSync(GROUP_SETTINGS_FILE, 'utf-8');
      const settings = JSON.parse(settingsRaw || '{}');
      if (settings.allowedGroups) {
        let changed = false;
        for (const jid of Object.keys(settings.allowedGroups)) {
          if (cache[jid]) {
            settings.allowedGroups[jid].name = cache[jid].name;
            settings.allowedGroups[jid].subject = cache[jid].name;
            settings.allowedGroups[jid].participantsCount = cache[jid].participantsCount;
            changed = true;
          }
        }
        if (changed) {
          fs.writeFileSync(GROUP_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
        }
      }
    }
  } catch (err) {
    console.error('[groupsManager] Gagal update batch groupSettings.json:', err.message);
  }

  return count;
}

function getGroupName(jid, instanceId = null) {
  if (!jid) return '';
  const cache = loadGroupsCache(instanceId);
  return cache[jid]?.name || cache[jid]?.subject || jid;
}

function getAllGroups(instanceId = null) {
  return loadGroupsCache(instanceId);
}

module.exports = {
  recordGroup,
  syncGroupsFromBaileys,
  getGroupName,
  getAllGroups,
};
