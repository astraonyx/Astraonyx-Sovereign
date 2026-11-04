// server/userAiKeyService.js — Multi-Tenant AI API Key Isolation Service
// Menjamin setiap akun pengguna (member, vip, moderator, cosmos) menggunakan API key masing-masing
// Mencegah cross-tenant key leakage pada Hermes AI, Luminary AI, dan modul workspace mendatang.

const fs = require('fs');
const path = require('path');
const db = require('./db');

const USER_CONFIGS_DIR = path.resolve(__dirname, '../database/hermes_user_configs');

function ensureUserConfigsDir() {
  if (!fs.existsSync(USER_CONFIGS_DIR)) {
    fs.mkdirSync(USER_CONFIGS_DIR, { recursive: true });
  }
}

function getUserConfigPath(userId) {
  ensureUserConfigsDir();
  return path.join(USER_CONFIGS_DIR, `${userId}.json`);
}

/**
 * Masking API Key untuk tampilan dashboard yang aman
 */
function maskApiKey(str) {
  if (!str || typeof str !== 'string') return '';
  const trimmed = str.trim();
  if (trimmed.length <= 8) return '••••••••';
  return trimmed.slice(0, 6) + '••••••••' + trimmed.slice(-4);
}

/**
 * Dapatkan semua API keys khusus milik akun userId
 * @param {string} userId - ID Pengguna yang terautentikasi
 * @returns {object} { apiKey, apiKeys, hasKey, isIsolated: true }
 */
function getUserAiKeys(userId) {
  if (!userId) {
    return {
      apiKey: '',
      apiKeys: { gemini: '', openrouter: '', groq: '', deepseek: '', grok: '' },
      hasKey: false,
      isIsolated: true,
    };
  }

  let fileKey = '';
  let fileApiKeys = {};
  const cfgPath = getUserConfigPath(userId);

  try {
    if (fs.existsSync(cfgPath)) {
      const raw = fs.readFileSync(cfgPath, 'utf8');
      const parsed = JSON.parse(raw);
      fileKey = (parsed.apiKey || '').trim();
      fileApiKeys = parsed.apiKeys || {};
    }
  } catch (_) {}

  // Baca juga dari SQLite users table
  let dbKey = '';
  try {
    const userRow = db.users.getById.get(userId);
    if (userRow && userRow.custom_ai_api_key) {
      dbKey = userRow.custom_ai_api_key.trim();
    }
  } catch (_) {}

  const primaryKey = dbKey || fileKey || fileApiKeys.gemini || fileApiKeys.openrouter || fileApiKeys.groq || fileApiKeys.deepseek || fileApiKeys.grok || '';
  const isGemini = primaryKey.startsWith('AIza');

  const resolvedApiKeys = {
    gemini: fileApiKeys.gemini || (isGemini ? primaryKey : ''),
    openrouter: fileApiKeys.openrouter || (!isGemini && primaryKey ? primaryKey : ''),
    groq: fileApiKeys.groq || '',
    deepseek: fileApiKeys.deepseek || '',
    grok: fileApiKeys.grok || '',
  };

  return {
    apiKey: primaryKey,
    apiKeys: resolvedApiKeys,
    hasKey: Boolean(primaryKey && primaryKey.length >= 8),
    isIsolated: true,
  };
}

/**
 * Validasi dan ambil API key untuk provider tertentu
 * @param {string} userId - ID pengguna
 * @param {string} [preferredProvider] - Provider yang diminta (gemini, openrouter, groq, dll)
 * @returns {string} API key milik akun tersebut, atau string kosong jika belum disetel
 */
function getEffectiveKeyForProvider(userId, preferredProvider = 'openrouter') {
  if (!userId) return '';
  const { apiKey, apiKeys } = getUserAiKeys(userId);

  const prov = (preferredProvider || '').toLowerCase();
  if (prov.includes('gemini') && apiKeys.gemini) return apiKeys.gemini;
  if (prov.includes('openrouter') && apiKeys.openrouter) return apiKeys.openrouter;
  if (prov.includes('groq') && apiKeys.groq) return apiKeys.groq;
  if (prov.includes('deepseek') && apiKeys.deepseek) return apiKeys.deepseek;
  if (prov.includes('grok') && apiKeys.grok) return apiKeys.grok;

  return apiKey;
}

/**
 * Simpan atau perbarui API Key spesifik untuk akun pengguna
 * @param {string} userId - ID pengguna
 * @param {object} updates - Objek berisi pasangan key-value (e.g. { GEMINI_API_KEY: 'AIza...' })
 */
function saveUserAiKeys(userId, updates = {}) {
  if (!userId) {
    throw new Error('User ID diperlukan untuk menyimpan API Key.');
  }

  ensureUserConfigsDir();
  const cfgPath = getUserConfigPath(userId);

  let currentCfg = {};
  try {
    if (fs.existsSync(cfgPath)) {
      currentCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    }
  } catch (_) {}

  if (!currentCfg.apiKeys) currentCfg.apiKeys = {};

  for (const [rawKey, rawValue] of Object.entries(updates)) {
    if (rawValue === undefined || rawValue === null) continue;
    const cleanVal = String(rawValue).trim();
    if (cleanVal.includes('••••')) continue; // Lewati masked string

    const key = rawKey.toUpperCase();
    if (key === 'GEMINI_API_KEY' || key === 'GEMINI') {
      currentCfg.apiKeys.gemini = cleanVal;
      if (cleanVal) currentCfg.apiKey = cleanVal;
    } else if (key === 'OPENROUTER_API_KEY' || key === 'HERMES_API_KEY' || key === 'OPENROUTER') {
      currentCfg.apiKeys.openrouter = cleanVal;
      if (cleanVal) currentCfg.apiKey = cleanVal;
    } else if (key === 'GROQ_API_KEY' || key === 'GROQ') {
      currentCfg.apiKeys.groq = cleanVal;
      if (cleanVal && !currentCfg.apiKey) currentCfg.apiKey = cleanVal;
    } else if (key === 'DEEPSEEK_API_KEY' || key === 'DEEPSEEK') {
      currentCfg.apiKeys.deepseek = cleanVal;
      if (cleanVal && !currentCfg.apiKey) currentCfg.apiKey = cleanVal;
    } else if (key === 'GROK_API_KEY' || key === 'XAI_API_KEY' || key === 'GROK') {
      currentCfg.apiKeys.grok = cleanVal;
      if (cleanVal && !currentCfg.apiKey) currentCfg.apiKey = cleanVal;
    } else if (cleanVal) {
      currentCfg.apiKey = cleanVal;
    }
  }

  if (!currentCfg.apiKey) {
    currentCfg.apiKey = currentCfg.apiKeys.gemini || currentCfg.apiKeys.openrouter || currentCfg.apiKeys.groq || currentCfg.apiKeys.deepseek || currentCfg.apiKeys.grok || '';
  }

  currentCfg.updatedAt = new Date().toISOString();

  // Tulis ke JSON config user
  fs.writeFileSync(cfgPath, JSON.stringify(currentCfg, null, 2), 'utf8');

  // Sinkronkan ke database SQLite users
  try {
    db.users.updateCustomAiKey.run(currentCfg.apiKey || '', userId);
  } catch (_) {}

  return {
    success: true,
    apiKey: currentCfg.apiKey,
    maskedValue: maskApiKey(currentCfg.apiKey),
    message: 'API Key pribadi Anda berhasil disimpan secara aman dan terisolasi.',
  };
}

module.exports = {
  getUserAiKeys,
  getEffectiveKeyForProvider,
  saveUserAiKeys,
  maskApiKey,
};
