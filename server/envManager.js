// server/envManager.js — Pengelola Lingkungan (.env) & API Keys Multi-Provider
const fs = require('fs');
const path = require('path');

const ENV_FILE = path.resolve(__dirname, '../.env');

// Parse file .env menjadi objek
function parseEnvFile() {
  const result = {};
  if (!fs.existsSync(ENV_FILE)) return result;

  try {
    const raw = fs.readFileSync(ENV_FILE, 'utf8');
    const lines = raw.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const equalIndex = trimmed.indexOf('=');
      if (equalIndex === -1) continue;

      const key = trimmed.slice(0, equalIndex).trim();
      let value = trimmed.slice(equalIndex + 1).trim();

      // Hapus kutip jika ada
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      result[key] = value;
    }
  } catch (err) {
    console.error('[envManager] Gagal membaca .env:', err.message);
  }

  return result;
}

// Simpan objek ke file .env
function writeEnvFile(envObj) {
  try {
    const lines = [];
    for (const [key, val] of Object.entries(envObj)) {
      if (typeof val === 'string' && (val.includes(' ') || val.includes('\n') || val.includes('='))) {
        lines.push(`${key}="${val}"`);
      } else {
        lines.push(`${key}=${val !== undefined && val !== null ? val : ''}`);
      }
    }
    fs.writeFileSync(ENV_FILE, lines.join('\n') + '\n', 'utf8');

    // Update process.env secara live
    for (const [key, val] of Object.entries(envObj)) {
      process.env[key] = val;
    }

    return true;
  } catch (err) {
    console.error('[envManager] Gagal menulis .env:', err.message);
    throw err;
  }
}

// Masking string API Key agar aman ditampilkan di dashboard
function maskApiKey(str) {
  if (!str || typeof str !== 'string') return '';
  if (str.length <= 8) return '••••••••';
  return str.slice(0, 7) + '••••••••' + str.slice(-4);
}

// Dapatkan daftar API Keys terdaftar untuk dashboard
function getApiKeysConfig() {
  const env = parseEnvFile();

  const standardProviders = [
    {
      id: 'openrouter',
      envKey: 'OPENROUTER_API_KEY',
      name: 'OpenRouter AI',
      desc: 'Gateway multi-model untuk Hermes 3, Llama 3.1, dsb.',
      hasKey: Boolean(env.OPENROUTER_API_KEY || env.HERMES_API_KEY),
      maskedValue: maskApiKey(env.OPENROUTER_API_KEY || env.HERMES_API_KEY),
      website: 'https://openrouter.ai/keys',
    },
    {
      id: 'gemini',
      envKey: 'GEMINI_API_KEY',
      name: 'Google Gemini API',
      desc: 'Model Gemini 2.0 Flash, Gemini 1.5 Pro & Gemma 4.',
      hasKey: Boolean(env.GEMINI_API_KEY),
      maskedValue: maskApiKey(env.GEMINI_API_KEY),
      website: 'https://aistudio.google.com/app/apikey',
    },
    {
      id: 'grok',
      envKey: 'GROK_API_KEY',
      name: 'Grok / xAI API',
      desc: 'Model Grok 2 / Grok 3 via xAI API console.',
      hasKey: Boolean(env.GROK_API_KEY || env.XAI_API_KEY),
      maskedValue: maskApiKey(env.GROK_API_KEY || env.XAI_API_KEY),
      website: 'https://console.x.ai',
    },
    {
      id: 'groq',
      envKey: 'GROQ_API_KEY',
      name: 'Groq Cloud (LPU)',
      desc: 'Inference ultra cepat untuk Llama 3 & Mixtral.',
      hasKey: Boolean(env.GROQ_API_KEY),
      maskedValue: maskApiKey(env.GROQ_API_KEY),
      website: 'https://console.groq.com/keys',
    },
    {
      id: 'deepseek',
      envKey: 'DEEPSEEK_API_KEY',
      name: 'DeepSeek API',
      desc: 'DeepSeek V3 dan DeepSeek R1 reasoning models.',
      hasKey: Boolean(env.DEEPSEEK_API_KEY),
      maskedValue: maskApiKey(env.DEEPSEEK_API_KEY),
      website: 'https://platform.deepseek.com/api_keys',
    },
  ];

  // Custom variables
  const standardKeys = [
    'OPENROUTER_API_KEY', 'HERMES_API_KEY', 'GEMINI_API_KEY', 'GROK_API_KEY',
    'XAI_API_KEY', 'GROQ_API_KEY', 'DEEPSEEK_API_KEY', 'TERABOX_COOKIE',
    'DOTENV_CONFIG_QUIET', 'OWNER_NUMBER', 'AI_PERSONA', 'HERMES_ENABLED',
    'HERMES_MODEL', 'HERMES_BASE_URL', 'HERMES_TEMPERATURE', 'HERMES_MAX_TOKENS'
  ];

  const customVars = [];
  for (const [k, v] of Object.entries(env)) {
    if (!standardKeys.includes(k)) {
      customVars.push({ key: k, value: v, isSecret: k.toLowerCase().includes('key') || k.toLowerCase().includes('secret') || k.toLowerCase().includes('token') });
    }
  }

  return {
    providers: standardProviders,
    customVars,
    rawCount: Object.keys(env).length,
  };
}

// Simpan atau update API Keys
function updateApiKeys(updates = {}) {
  const env = parseEnvFile();

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === null) continue;
    const cleanVal = String(value).trim();
    if (cleanVal === '••••••••' || cleanVal.includes('••••')) {
      // Nilai masked tidak boleh menimpa nilai asli
      continue;
    }
    if (cleanVal === '') {
      delete env[key];
    } else {
      env[key] = cleanVal;
    }
  }

  // Jika update OPENROUTER_API_KEY, sinkronkan juga ke HERMES_API_KEY jika kosong
  if (updates.OPENROUTER_API_KEY && !updates.HERMES_API_KEY) {
    env.HERMES_API_KEY = updates.OPENROUTER_API_KEY;
  }

  writeEnvFile(env);
  return { success: true, message: 'File .env dan API Keys berhasil diperbarui.' };
}

// Hapus variabel tertentu dari .env
function deleteEnvVar(key) {
  const env = parseEnvFile();
  if (key in env) {
    delete env[key];
    delete process.env[key];
    writeEnvFile(env);
    return { success: true, message: `Variabel ${key} berhasil dihapus.` };
  }
  return { success: false, message: `Variabel ${key} tidak ditemukan.` };
}

// Dapatkan daftar API Keys khusus per-user workspace
function getUserApiKeysConfig(userId, user = null) {
  if (!userId) return getApiKeysConfig();
  const hermesManager = require('./hermesManager');
  const userCfg = hermesManager.getUserConfig(userId, user);
  const keys = userCfg.apiKeys || {};

  const standardProviders = [
    {
      id: 'openrouter',
      envKey: 'OPENROUTER_API_KEY',
      name: 'OpenRouter AI',
      desc: 'Gateway multi-model untuk Hermes 3, Llama 3.1, dsb.',
      hasKey: Boolean(keys.openrouter || (!keys.gemini && userCfg.apiKey)),
      maskedValue: maskApiKey(keys.openrouter || (!keys.gemini ? userCfg.apiKey : '')),
      website: 'https://openrouter.ai/keys',
    },
    {
      id: 'gemini',
      envKey: 'GEMINI_API_KEY',
      name: 'Google Gemini API',
      desc: 'Model Gemini 2.0 Flash, Gemini 1.5 Pro & Gemma 4.',
      hasKey: Boolean(keys.gemini || (userCfg.apiKey && userCfg.apiKey.startsWith('AIza'))),
      maskedValue: maskApiKey(keys.gemini || (userCfg.apiKey && userCfg.apiKey.startsWith('AIza') ? userCfg.apiKey : '')),
      website: 'https://aistudio.google.com/app/apikey',
    },
    {
      id: 'grok',
      envKey: 'GROK_API_KEY',
      name: 'Grok / xAI API',
      desc: 'Model Grok 2 / Grok 3 via xAI API console.',
      hasKey: Boolean(keys.grok),
      maskedValue: maskApiKey(keys.grok),
      website: 'https://console.x.ai',
    },
    {
      id: 'groq',
      envKey: 'GROQ_API_KEY',
      name: 'Groq Cloud (LPU)',
      desc: 'Inference ultra cepat untuk Llama 3 & Mixtral.',
      hasKey: Boolean(keys.groq),
      maskedValue: maskApiKey(keys.groq),
      website: 'https://console.groq.com/keys',
    },
    {
      id: 'deepseek',
      envKey: 'DEEPSEEK_API_KEY',
      name: 'DeepSeek API',
      desc: 'DeepSeek V3 dan DeepSeek R1 reasoning models.',
      hasKey: Boolean(keys.deepseek),
      maskedValue: maskApiKey(keys.deepseek),
      website: 'https://platform.deepseek.com/api_keys',
    },
  ];

  return {
    providers: standardProviders,
    customVars: [],
    isUserWorkspace: true,
    username: user ? user.username : 'User',
    activeModel: userCfg.model,
    hasActiveKey: Boolean(userCfg.apiKey && userCfg.apiKey.length > 5),
  };
}

function updateUserApiKeys(userId, updates = {}, user = null) {
  if (!userId) return updateApiKeys(updates);
  const hermesManager = require('./hermesManager');
  const userCfg = hermesManager.getUserConfig(userId, user);
  if (!userCfg.apiKeys) userCfg.apiKeys = {};

  for (const [key, rawValue] of Object.entries(updates)) {
    if (rawValue === undefined || rawValue === null) continue;
    const cleanVal = String(rawValue).trim();
    if (cleanVal.includes('••••')) continue; // Skip masked string

    if (key === 'OPENROUTER_API_KEY' || key === 'HERMES_API_KEY') {
      userCfg.apiKeys.openrouter = cleanVal;
      if (cleanVal) userCfg.apiKey = cleanVal;
    } else if (key === 'GEMINI_API_KEY') {
      userCfg.apiKeys.gemini = cleanVal;
      if (cleanVal) userCfg.apiKey = cleanVal;
    } else if (key === 'GROQ_API_KEY') {
      userCfg.apiKeys.groq = cleanVal;
      if (cleanVal && !userCfg.apiKey) userCfg.apiKey = cleanVal;
    } else if (key === 'DEEPSEEK_API_KEY') {
      userCfg.apiKeys.deepseek = cleanVal;
      if (cleanVal && !userCfg.apiKey) userCfg.apiKey = cleanVal;
    } else if (key === 'GROK_API_KEY' || key === 'XAI_API_KEY') {
      userCfg.apiKeys.grok = cleanVal;
      if (cleanVal && !userCfg.apiKey) userCfg.apiKey = cleanVal;
    } else if (cleanVal) {
      userCfg.apiKey = cleanVal;
    }
  }

  if (!userCfg.apiKey) {
    userCfg.apiKey = userCfg.apiKeys.gemini || userCfg.apiKeys.openrouter || userCfg.apiKeys.groq || userCfg.apiKeys.deepseek || userCfg.apiKeys.grok || '';
  }

  hermesManager.saveUserConfig(userId, userCfg, user);
  return { success: true, message: 'API Key pribadi Anda berhasil disimpan secara aman di workspace Anda.' };
}

function deleteUserApiKey(userId, key, user = null) {
  if (!userId) return deleteEnvVar(key);
  const hermesManager = require('./hermesManager');
  const userCfg = hermesManager.getUserConfig(userId, user);
  if (!userCfg.apiKeys) userCfg.apiKeys = {};

  if (key === 'OPENROUTER_API_KEY' || key === 'openrouter') {
    delete userCfg.apiKeys.openrouter;
    if (userCfg.apiKey === userCfg.apiKeys.openrouter) userCfg.apiKey = '';
  } else if (key === 'GEMINI_API_KEY' || key === 'gemini') {
    delete userCfg.apiKeys.gemini;
    if (userCfg.apiKey === userCfg.apiKeys.gemini) userCfg.apiKey = '';
  } else if (key === 'GROQ_API_KEY' || key === 'groq') {
    delete userCfg.apiKeys.groq;
  } else if (key === 'DEEPSEEK_API_KEY' || key === 'deepseek') {
    delete userCfg.apiKeys.deepseek;
  } else if (key === 'GROK_API_KEY' || key === 'XAI_API_KEY' || key === 'grok') {
    delete userCfg.apiKeys.grok;
  }

  hermesManager.saveUserConfig(userId, userCfg, user);
  return { success: true, message: `API Key ${key} berhasil dihapus dari workspace Anda.` };
}

module.exports = {
  parseEnvFile,
  writeEnvFile,
  getApiKeysConfig,
  updateApiKeys,
  deleteEnvVar,
  maskApiKey,
  getUserApiKeysConfig,
  updateUserApiKeys,
  deleteUserApiKey,
};
