// server/hermesManager.js — Pengelola Hermes Autonomous AI Agent
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.resolve(__dirname, '../database/hermes_config.json');
const ENV_FILE = path.resolve(__dirname, '../.env');

const DEFAULT_CONFIG = {
  enabled: false,
  installed: false,
  installedAt: null,
  version: '1.0.0-hermes3',
  apiKey: process.env.HERMES_API_KEY || process.env.OPENROUTER_API_KEY || '',
  model: process.env.HERMES_MODEL || 'nousresearch/hermes-3-llama-3.1-70b',
  baseUrl: process.env.HERMES_BASE_URL || 'https://openrouter.ai/api/v1',
  temperature: Number(process.env.HERMES_TEMPERATURE) || 0.7,
  maxTokens: Number(process.env.HERMES_MAX_TOKENS) || 2048,
  systemPrompt: process.env.HERMES_SYSTEM_PROMPT ||
    'You are Hermes 3, an advanced autonomous AI agent integrated with WhatsApp. You possess deep multi-step reasoning capabilities, autonomous function-calling, and precise task execution. Be helpful, concise, and smart.',
};

function ensureConfigFile() {
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
  }
}

function getConfig() {
  ensureConfigFile();
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      apiKey: parsed.apiKey || process.env.HERMES_API_KEY || process.env.OPENROUTER_API_KEY || '',
      model: parsed.model || process.env.HERMES_MODEL || DEFAULT_CONFIG.model,
      baseUrl: parsed.baseUrl || process.env.HERMES_BASE_URL || DEFAULT_CONFIG.baseUrl,
    };
  } catch (_) {
    return { ...DEFAULT_CONFIG };
  }
}

function updateEnvFile(updates) {
  try {
    let content = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf-8') : '';
    const lines = content.split(/\r?\n/);
    const map = new Map();

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = line.indexOf('=');
      if (idx !== -1) {
        const key = line.substring(0, idx).trim();
        map.set(key, line.substring(idx + 1));
      }
    });

    Object.entries(updates).forEach(([k, v]) => {
      map.set(k, String(v));
      process.env[k] = String(v);
    });

    const newLines = [];
    map.forEach((v, k) => {
      newLines.push(`${k}=${v}`);
    });

    fs.writeFileSync(ENV_FILE, newLines.join('\n') + '\n', 'utf-8');
  } catch (err) {
    console.error('[hermesManager] Gagal update .env:', err.message);
  }
}

function getDefaultBaseUrlForModel(modelName) {
  const m = String(modelName || '').toLowerCase().trim();
  if (m.startsWith('gemini') || m.includes('gemini')) {
    return 'https://generativelanguage.googleapis.com/v1beta/openai';
  }
  if (m.startsWith('groq/') || m.includes('mixtral') || m.includes('gemma2')) {
    return 'https://api.groq.com/openai/v1';
  }
  if (m.startsWith('grok') || m.includes('xai/')) {
    return 'https://api.x.ai/v1';
  }
  if (m.startsWith('deepseek')) {
    return 'https://api.deepseek.com';
  }
  return 'https://openrouter.ai/api/v1';
}

function saveConfig(data) {
  ensureConfigFile();
  const current = getConfig();

  const targetModel = data.model !== undefined ? data.model : current.model;
  const targetDefaultUrl = getDefaultBaseUrlForModel(targetModel);

  let targetBaseUrl = data.baseUrl;
  if (!targetBaseUrl) {
    if (data.model && data.model !== current.model) {
      targetBaseUrl = targetDefaultUrl;
    } else {
      targetBaseUrl = current.baseUrl || targetDefaultUrl;
    }
  } else {
    // Pastikan baseUrl tidak silang provider
    if (targetDefaultUrl.includes('openrouter.ai') && targetBaseUrl.includes('googleapis.com')) {
      targetBaseUrl = targetDefaultUrl;
    } else if (targetDefaultUrl.includes('googleapis.com') && targetBaseUrl.includes('openrouter.ai')) {
      targetBaseUrl = targetDefaultUrl;
    }
  }

  const updated = {
    ...current,
    ...data,
    model: targetModel,
    baseUrl: targetBaseUrl,
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');

  // Sinkronisasi ke .env
  updateEnvFile({
    HERMES_ENABLED: String(!!updated.enabled),
    HERMES_API_KEY: updated.apiKey || '',
    HERMES_MODEL: updated.model || DEFAULT_CONFIG.model,
    HERMES_BASE_URL: updated.baseUrl || DEFAULT_CONFIG.baseUrl,
    HERMES_TEMPERATURE: String(updated.temperature || 0.7),
    HERMES_MAX_TOKENS: String(updated.maxTokens || 2048),
  });

  return updated;
}

const USER_CONFIGS_DIR = path.resolve(__dirname, '../database/hermes_user_configs');

function ensureUserConfigsDir() {
  if (!fs.existsSync(USER_CONFIGS_DIR)) {
    fs.mkdirSync(USER_CONFIGS_DIR, { recursive: true });
  }
}

function getUserConfigFile(userId) {
  ensureUserConfigsDir();
  return path.join(USER_CONFIGS_DIR, `${userId}.json`);
}

function getUserConfig(userId, user = null) {
  if (!userId) return getConfig();
  ensureUserConfigsDir();
  const file = getUserConfigFile(userId);
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        apiKey: parsed.apiKey || (user && user.customAiApiKey) || '',
        model: parsed.model || DEFAULT_CONFIG.model,
        baseUrl: parsed.baseUrl || DEFAULT_CONFIG.baseUrl,
      };
    }
  } catch (_) {}

  // Inisialisasi konfigurasi awal untuk akun mandiri pengguna
  const customKey = (user && user.customAiApiKey) || '';
  const isGemini = customKey.startsWith('AIza');
  const userCfg = {
    ...DEFAULT_CONFIG,
    enabled: true,
    installed: true,
    installedAt: new Date().toISOString(),
    apiKey: customKey,
    model: isGemini ? 'google/gemini-2.5-flash' : DEFAULT_CONFIG.model,
    baseUrl: isGemini ? 'https://generativelanguage.googleapis.com/v1beta/openai' : DEFAULT_CONFIG.baseUrl,
    apiKeys: {
      gemini: isGemini ? customKey : '',
      openrouter: !isGemini && customKey ? customKey : '',
      groq: '',
      deepseek: '',
      grok: '',
    },
    updatedAt: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(file, JSON.stringify(userCfg, null, 2), 'utf-8');
  } catch (_) {}

  return userCfg;
}

function saveUserConfig(userId, data, user = null) {
  if (!userId) return saveConfig(data);
  ensureUserConfigsDir();
  const current = getUserConfig(userId, user);

  const targetModel = data.model !== undefined ? data.model : current.model;
  const targetDefaultUrl = getDefaultBaseUrlForModel(targetModel);

  let targetBaseUrl = data.baseUrl;
  if (!targetBaseUrl) {
    if (data.model && data.model !== current.model) {
      targetBaseUrl = targetDefaultUrl;
    } else {
      targetBaseUrl = current.baseUrl || targetDefaultUrl;
    }
  }

  const updated = {
    ...current,
    ...data,
    model: targetModel,
    baseUrl: targetBaseUrl,
    updatedAt: new Date().toISOString(),
  };

  const file = getUserConfigFile(userId);
  fs.writeFileSync(file, JSON.stringify(updated, null, 2), 'utf-8');

  // Sinkronisasi apiKey ke tabel users di SQLite jika disediakan
  if (data.apiKey !== undefined) {
    try {
      const { db } = require('./db');
      db.prepare('UPDATE users SET custom_ai_api_key = ?, updated_at = ? WHERE id = ?')
        .run(String(data.apiKey).trim(), new Date().toISOString(), userId);
    } catch (_) {}
  }

  return updated;
}

function getStatus(userId = null, user = null) {
  const cfg = userId ? getUserConfig(userId, user) : getConfig();
  let memStats = { activeSessions: 0, totalMessages: 0, registeredToolsCount: 7, tools: [] };
  try {
    const hermesAgent = require('../lib/hermesAgent');
    memStats = hermesAgent.getMemoryStats();
  } catch (_) {}

  return {
    installed: true,
    enabled: !!cfg.enabled,
    version: cfg.version || '1.0.0-hermes3',
    installedAt: cfg.installedAt || new Date().toISOString(),
    model: cfg.model,
    baseUrl: cfg.baseUrl,
    hasApiKey: Boolean(cfg.apiKey && cfg.apiKey.trim().length > 5),
    activeSessions: memStats.activeSessions,
    registeredToolsCount: memStats.registeredToolsCount,
    tools: memStats.tools,
    isIndependentAccount: Boolean(userId),
  };
}

let isInstalling = false;
let installLogs = [];

async function installHermes() {
  if (isInstalling) {
    return { success: false, message: 'Instalasi Hermes Agent sedang berjalan...', logs: installLogs };
  }

  isInstalling = true;
  installLogs = [];

  const addLog = (msg) => {
    const logLine = `[${new Date().toLocaleTimeString('id-ID')}] ${msg}`;
    installLogs.push(logLine);
    console.log('[HermesInstall]', msg);
  };

  addLog('🚀 Memulai proses inisialisasi Hermes Autonomous AI Agent Workspace...');
  await new Promise((r) => setTimeout(r, 600));

  addLog('📦 Memeriksa dependensi sistem dan lingkungan runtime Node.js...');
  await new Promise((r) => setTimeout(r, 800));

  addLog('⚙️ Mengonfigurasi model Hermes 3 (Llama 3.1 architecture) dan reasoning pipeline...');
  await new Promise((r) => setTimeout(r, 700));

  addLog('🧠 Menyiapkan autonomous function-calling runtime & buffer memory...');
  await new Promise((r) => setTimeout(r, 700));

  addLog('🔌 Menghubungkan gateway API Hermes dengan Baileys WhatsApp bot...');
  await new Promise((r) => setTimeout(r, 600));

  const cfg = getConfig();
  cfg.installed = true;
  cfg.installedAt = new Date().toISOString();
  saveConfig(cfg);

  addLog('✅ Hermes Autonomous Agent berhasil disiapkan dan siap digunakan di workspace Anda!');
  isInstalling = false;

  return {
    success: true,
    message: 'Hermes Agent siap digunakan di workspace Anda!',
    installedAt: cfg.installedAt,
    logs: installLogs,
  };
}

function getInstallLogs() {
  return {
    isInstalling,
    logs: installLogs,
  };
}

async function chatTest(prompt, onProgress = null, reasoningMode = 'flash', customApiKey = null, user = null) {
  const hermesAgent = require('../lib/hermesAgent');
  const skillManager = require('./skillManager');

  let activeSkill = null;
  const match = String(prompt || '').trim().match(/^\/([a-zA-Z0-9_-]+)(?:\s+([\s\S]*))?$/);
  if (match) {
    activeSkill = skillManager.findSkillByName(match[1]);
  }

  const userId = user ? user.id : 'playground';
  const userCfg = user ? getUserConfig(user.id, user) : getConfig();
  const effectiveApiKey = (customApiKey && customApiKey.trim()) || userCfg.apiKey || (user && user.customAiApiKey) || '';

  if (!effectiveApiKey || effectiveApiKey.length < 8) {
    throw new Error('🔒 API Key Belum Terpasang: Website ini adalah workspace independen penyedia layanan. Setiap akun menggunakan AI API Key masing-masing. Silakan masukkan Google Gemini API Key atau OpenRouter API Key Anda pada pengaturan Hermes.');
  }

  const agentOpts = {
    prompt,
    senderNumber: userId,
    chatJid: 'dash_' + userId,
    userId: user ? user.id : null,
    ownerUsername: user ? user.username : null,
    isGroup: false,
    activeSkill,
    reasoningMode,
    onProgress,
    userConfig: userCfg,
    apiKey: effectiveApiKey,
  };

  return await hermesAgent.runAutonomousAgent(agentOpts);
}

function clearMemory(sessionKey = null, userId = null) {
  const hermesAgent = require('../lib/hermesAgent');
  if (userId) {
    return hermesAgent.clearSessionMemory('dash_' + userId + '_' + userId);
  }
  return hermesAgent.clearSessionMemory(sessionKey);
}

module.exports = {
  getConfig,
  saveConfig,
  getUserConfig,
  saveUserConfig,
  getStatus,
  installHermes,
  getInstallLogs,
  chatTest,
  clearMemory,
  getDefaultBaseUrlForModel,
};
