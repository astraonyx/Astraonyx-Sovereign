// server/commandManager.js — Manajemen Command, Override Output & Fitur Kustom
const path = require('path');
const fs = require('fs');
const { COMMANDS } = require('../lib/commandRegistry');
const deniaPluginLoader = require('../lib/deniaPluginLoader');
deniaPluginLoader.loadPlugins().catch(() => {});
const { readJsonFile, writeJsonFile } = require('./dataBridge');
const config = require('../config');

// Helper untuk mendapatkan path database spesifik instance bot
function getPathsForInstance(instanceId) {
  if (!instanceId || instanceId === 'primary') {
    return {
      overridesFile: config.paths.commandOverrides || './database/command_overrides.json',
      customFeaturesFile: config.paths.customFeatures || './database/custom_features.json',
    };
  }

  const dbDir = path.resolve(__dirname, `../instances/${instanceId}/database`);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const overridesFile = path.join(dbDir, 'command_overrides.json');
  const customFeaturesFile = path.join(dbDir, 'custom_features.json');

  if (!fs.existsSync(overridesFile)) {
    const defaultOverrides = path.resolve(__dirname, '../database/command_overrides.json');
    if (fs.existsSync(defaultOverrides)) {
      try { fs.copyFileSync(defaultOverrides, overridesFile); } catch (_) { fs.writeFileSync(overridesFile, '{}'); }
    } else {
      fs.writeFileSync(overridesFile, '{}');
    }
  }

  if (!fs.existsSync(customFeaturesFile)) {
    const defaultCustom = path.resolve(__dirname, '../database/custom_features.json');
    if (fs.existsSync(defaultCustom)) {
      try { fs.copyFileSync(defaultCustom, customFeaturesFile); } catch (_) { fs.writeFileSync(customFeaturesFile, '{}'); }
    } else {
      fs.writeFileSync(customFeaturesFile, '{}');
    }
  }

  return { overridesFile, customFeaturesFile };
}

function getCommandOverrides(instanceId = null) {
  const { overridesFile } = getPathsForInstance(instanceId);
  return readJsonFile(overridesFile, {});
}

function saveCommandOverrides(overrides, instanceId = null) {
  const { overridesFile } = getPathsForInstance(instanceId);
  return writeJsonFile(overridesFile, overrides);
}

function getCustomFeatures(instanceId = null) {
  const { customFeaturesFile } = getPathsForInstance(instanceId);
  return readJsonFile(customFeaturesFile, {});
}

function saveCustomFeatures(features, instanceId = null) {
  const { customFeaturesFile } = getPathsForInstance(instanceId);
  return writeJsonFile(customFeaturesFile, features);
}

// Ambil seluruh command (bawaan + override + kustom) spesifik untuk instance tertentu
async function getAllCommands(instanceId = null) {
  try {
    if (typeof deniaPluginLoader.loadPlugins === 'function') {
      await deniaPluginLoader.loadPlugins();
    }
  } catch (_) {}

  const overrides = getCommandOverrides(instanceId);
  const customFeatures = getCustomFeatures(instanceId);

  const builtIn = COMMANDS.map((cmd) => {
    let cat = cmd.category || 'Tools';
    if (cat.toLowerCase() === 'download' || cat.toLowerCase() === 'downloader') {
      cat = 'Downloader';
    }
    const override = overrides[cmd.name] || {};
    return {
      name: cmd.name,
      category: cat,
      desc: cmd.desc,
      ownerOnly: !!cmd.ownerOnly,
      permission: override.permission || (cmd.ownerOnly ? 'owner' : 'all'),
      enabled: override.enabled !== undefined ? override.enabled : true,
      customResponse: override.customResponse || null,
      outputRouting: override.outputRouting || { mode: 'inplace' },
      isCustom: false,
    };
  });

  const customList = Object.keys(customFeatures).map((key) => {
    const c = customFeatures[key];
    return {
      name: c.name,
      category: c.category || 'Kustom Web',
      desc: c.desc || 'Fitur buatan dari web dashboard',
      ownerOnly: c.permission === 'owner' || !!c.ownerOnly,
      permission: c.permission || (c.ownerOnly ? 'owner' : 'all'),
      enabled: c.enabled !== undefined ? c.enabled : true,
      customResponse: c.response || '',
      outputRouting: c.outputRouting || { mode: 'inplace' },
      isCustom: true,
      createdAt: c.createdAt,
    };
  });

  return [...builtIn, ...customList];
}

// Ambil list custom commands saja
function getAllCustomCommands(instanceId = null) {
  const customFeatures = getCustomFeatures(instanceId);
  return Object.values(customFeatures || {});
}

// Simpan override untuk command bawaan
function setCommandOverride(name, { enabled, customResponse, outputRouting, permission }, instanceId = null) {
  if (!name) throw new Error('Nama command wajib diisi.');
  const cleanName = name.toLowerCase().trim();
  const overrides = getCommandOverrides(instanceId);
  const existing = overrides[cleanName] || {};

  overrides[cleanName] = {
    ...existing,
    enabled: enabled !== undefined ? !!enabled : (existing.enabled !== undefined ? existing.enabled : true),
    customResponse: customResponse !== undefined ? (customResponse ? customResponse.trim() : null) : (existing.customResponse || null),
    outputRouting: outputRouting !== undefined ? outputRouting : (existing.outputRouting || { mode: 'inplace' }),
    permission: permission !== undefined ? permission : (existing.permission || null),
    updatedAt: new Date().toISOString(),
  };

  saveCommandOverrides(overrides, instanceId);
  return { success: true, command: cleanName, override: overrides[cleanName], instanceId: instanceId || 'primary' };
}

// Buat command / fitur baru kustom dari web
function createCustomCommand({ name, response, desc, category, permission, outputRouting }, instanceId = null) {
  if (!name || typeof name !== 'string') throw new Error('Nama command wajib diisi.');
  if (!response || typeof response !== 'string') throw new Error('Balasan teks wajib diisi.');

  const cleanName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '').trim();
  if (cleanName.length < 2) throw new Error('Nama command minimal 2 karakter alfanumerik.');

  // Cek apakah tabrakan dengan command bawaan
  const builtInNames = new Set(COMMANDS.map((c) => c.name));
  if (builtInNames.has(cleanName)) {
    throw new Error(`Command '/${cleanName}' sudah ada sebagai command bawaan bot.`);
  }

  const cleanCategory = (category || 'Kustom Web').trim();
  const cleanPermission = ['public', 'admin', 'owner'].includes(permission) ? permission : 'public';

  const customFeatures = getCustomFeatures(instanceId);
  customFeatures[cleanName] = {
    name: cleanName,
    response: response.trim(),
    desc: (desc || `Command custom /${cleanName}`).trim(),
    category: cleanCategory,
    permission: cleanPermission,
    ownerOnly: cleanPermission === 'owner',
    adminOnly: cleanPermission === 'admin',
    outputRouting: outputRouting || { mode: 'inplace' },
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveCustomFeatures(customFeatures, instanceId);
  return { success: true, command: customFeatures[cleanName], instanceId: instanceId || 'primary' };
}

// Update command custom yang sudah ada
function updateCustomCommand(name, { response, desc, category, permission, enabled, outputRouting }, instanceId = null) {
  if (!name) throw new Error('Nama command wajib diisi.');
  const cleanName = name.toLowerCase().trim();
  const customFeatures = getCustomFeatures(instanceId);

  if (!customFeatures[cleanName]) {
    throw new Error(`Command custom '/${cleanName}' tidak ditemukan.`);
  }

  const existing = customFeatures[cleanName];
  if (response !== undefined) existing.response = String(response).trim();
  if (desc !== undefined) existing.desc = String(desc).trim();
  if (category !== undefined) existing.category = String(category).trim();
  if (permission !== undefined) {
    existing.permission = ['public', 'admin', 'owner'].includes(permission) ? permission : 'public';
    existing.ownerOnly = existing.permission === 'owner';
    existing.adminOnly = existing.permission === 'admin';
  }
  if (enabled !== undefined) existing.enabled = !!enabled;
  if (outputRouting !== undefined) existing.outputRouting = outputRouting;
  existing.updatedAt = new Date().toISOString();

  saveCustomFeatures(customFeatures, instanceId);
  return { success: true, command: existing, instanceId: instanceId || 'primary' };
}

// Hapus command custom
function deleteCustomCommand(name, instanceId = null) {
  const cleanName = name.toLowerCase().trim();
  const customFeatures = getCustomFeatures(instanceId);
  if (customFeatures[cleanName]) {
    delete customFeatures[cleanName];
    saveCustomFeatures(customFeatures, instanceId);
    return { success: true, instanceId: instanceId || 'primary' };
  }
  throw new Error(`Command kustom '${name}' tidak ditemukan.`);
}

// Universal parser for raw content or files (JSON, JS, Python, Text)
function parseMultiFormatCommands(rawContent, filename = '') {
  if (!rawContent || typeof rawContent !== 'string') return [];
  let trimmed = rawContent.trim();
  if (!trimmed) return [];

  // 0. Bersihkan markdown code fences seperti ```javascript ... ``` atau ```json ... ```
  trimmed = trimmed
    .replace(/^\s*```(?:javascript|js|json|python|py|text)?\s*[\r\n]+/i, '')
    .replace(/[\r\n]+\s*```\s*$/i, '')
    .trim();

  // Abaikan package.json atau file metadata npm
  if (filename && /package(?:-lock)?\.json$/i.test(filename)) {
    return [];
  }

  // 1. Direct JSON attempt
  try {
    const parsed = JSON.parse(trimmed);
    // Abaikan jika ternyata file package.json
    if (parsed && (parsed.dependencies || parsed.devDependencies) && parsed.version) {
      return [];
    }
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.commands)) return parsed.commands;
    if (parsed && typeof parsed === 'object') {
      if (parsed.name || parsed.command) return [parsed];
      return Object.keys(parsed).map((k) => ({ name: k, ...parsed[k] }));
    }
  } catch (_) {}

  // 2. JavaScript format attempt (.js or code containing COMMANDS / module.exports)
  try {
    const fn = new Function(
      'const module = { exports: {} }; const exports = module.exports;\n' +
      'const require = (mod) => ({ delay: (ms) => new Promise(r => setTimeout(r, ms)) });\n' +
      'const process = { env: {} };\n' +
      trimmed +
      '\n; return (typeof COMMANDS !== "undefined" ? COMMANDS : (typeof commands !== "undefined" ? commands : (typeof COMMAND_LIST !== "undefined" ? COMMAND_LIST : (module.exports.COMMANDS || module.exports.commands || module.exports.default || module.exports))));'
    );
    let result = fn();
    if (result && typeof result === 'object') {
      if (!Array.isArray(result)) {
        if (Array.isArray(result.COMMANDS)) result = result.COMMANDS;
        else if (Array.isArray(result.commands)) result = result.commands;
        else if (result.name || result.command) result = [result];
        else {
          const keys = Object.keys(result).filter((k) => !['default', '__esModule'].includes(k));
          if (keys.length > 0 && typeof result[keys[0]] === 'object') {
            result = keys.map((k) => ({ name: k, ...result[k] }));
          }
        }
      }
    }
    if (Array.isArray(result) && result.length > 0) {
      return result.map((item) => {
        const norm = { ...item };
        if (norm.command && !norm.name) norm.name = norm.command;
        if (typeof norm.handler === 'function') norm.handler = norm.handler.toString();
        if (typeof norm.code === 'function') norm.code = norm.code.toString();
        if (typeof norm.action === 'function') norm.handler = norm.action.toString();
        return norm;
      });
    }
  } catch (_) {}

  // 3. Regex AST extractor for JS / JSON-like object arrays
  try {
    const objRegex = /\{\s*name\s*:\s*['"`]([a-zA-Z0-9_-]+)['"`]([\s\S]*?)\}/g;
    let match;
    const extracted = [];
    while ((match = objRegex.exec(rawContent)) !== null) {
      const name = match[1];
      const body = match[2];

      const catMatch = body.match(/category\s*:\s*['"`]([^'"`]+)['"`]/i);
      const descMatch = body.match(/desc\s*:\s*['"`]([^'"`]+)['"`]/i);
      const respMatch = body.match(/(?:response|reply|text)\s*:\s*['"`]([^'"`]+)['"`]/i);
      const ownerMatch = body.match(/ownerOnly\s*:\s*(true|false)/i);
      const permMatch = body.match(/permission\s*:\s*['"`]([^'"`]+)['"`]/i);
      const typeMatch = body.match(/type\s*:\s*['"`]([^'"`]+)['"`]/i);
      const mediaMatch = body.match(/(?:mediaUrl|imageUrl|videoUrl|audioUrl|fileUrl|url)\s*:\s*['"`]([^'"`]+)['"`]/i);
      const captionMatch = body.match(/caption\s*:\s*['"`]([^'"`]+)['"`]/i);
      const fileMatch = body.match(/fileName\s*:\s*['"`]([^'"`]+)['"`]/i);
      const apiMatch = body.match(/apiUrl\s*:\s*['"`]([^'"`]+)['"`]/i);

      extracted.push({
        name,
        category: catMatch ? catMatch[1] : 'Imported',
        desc: descMatch ? descMatch[1] : `Fitur command /${name}`,
        response: respMatch ? respMatch[1] : (descMatch ? descMatch[1] : `Fitur /${name} aktif.`),
        ownerOnly: ownerMatch ? ownerMatch[1] === 'true' : false,
        permission: permMatch ? permMatch[1] : (ownerMatch && ownerMatch[1] === 'true' ? 'owner' : 'public'),
        type: typeMatch ? typeMatch[1] : (mediaMatch ? 'media' : 'text'),
        ...(mediaMatch ? { mediaUrl: mediaMatch[1] } : {}),
        ...(captionMatch ? { caption: captionMatch[1] } : {}),
        ...(fileMatch ? { fileName: fileMatch[1] } : {}),
        ...(apiMatch ? { apiUrl: apiMatch[1] } : {}),
      });
    }
    if (extracted.length > 0) return extracted;
  } catch (_) {}

  // 4. Python format attempt (.py)
  try {
    let pyClean = rawContent
      .replace(/#.*$/gm, '')
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false')
      .replace(/\bNone\b/g, 'null');

    const pyListMatch = pyClean.match(/(?:COMMANDS|commands|COMMAND_LIST)\s*=\s*(\[[\s\S]*?\])/);
    if (pyListMatch) {
      const jsonLike = pyListMatch[1].replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
      const pyParsed = JSON.parse(jsonLike);
      if (Array.isArray(pyParsed)) return pyParsed;
    }

    const pyDictMatch = pyClean.match(/(?:COMMANDS|commands|COMMAND_DICT)\s*=\s*(\{[\s\S]*?\})/);
    if (pyDictMatch) {
      const jsonLike = pyDictMatch[1].replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
      const pyParsed = JSON.parse(jsonLike);
      if (pyParsed && typeof pyParsed === 'object') {
        return Object.keys(pyParsed).map((k) => ({ name: k, ...pyParsed[k] }));
      }
    }

    const pyFuncRegex = /def\s+(?:handle_|cmd_|command_)?([a-zA-Z0-9_]+)\s*\([^)]*\)\s*:\s*(?:"""([\s\S]*?)"""|'''([\s\S]*?)''')?/g;
    let funcMatch;
    const pyFuncs = [];
    while ((funcMatch = pyFuncRegex.exec(rawContent)) !== null) {
      const name = funcMatch[1].toLowerCase().replace(/_/g, '');
      if (name.length >= 2 && !['init', 'main', 'helper', 'test'].includes(name)) {
        const doc = (funcMatch[2] || funcMatch[3] || '').trim();
        pyFuncs.push({
          name,
          category: 'Python Script',
          desc: doc || `Fitur Python /${name}`,
          response: doc ? `ℹ️ ${doc}` : `Fitur Python /${name} aktif.`,
          permission: 'public',
        });
      }
    }
    if (pyFuncs.length > 0) return pyFuncs;
  } catch (_) {}

  // 5. Line-by-line fallback for text files: e.g. "ping: Cek bot aktif" or "/menu - Deskripsi"
  try {
    const lines = trimmed.split(/\r?\n/);
    const lineCmds = [];
    for (const line of lines) {
      const l = line.trim();
      if (!l || l.startsWith('#') || l.startsWith('//')) continue;
      const m = l.match(/^[/!.]?([a-zA-Z0-9_-]{2,20})\s*[:=\-–—]\s*(.+)$/);
      if (m) {
        const name = m[1].toLowerCase();
        const descOrResp = m[2].trim();
        lineCmds.push({
          name,
          category: 'Text Import',
          desc: descOrResp,
          response: descOrResp,
          permission: 'public',
        });
      }
    }
    if (lineCmds.length > 0) return lineCmds;
  } catch (_) {}

  return [];
}

// Import batch command custom (dari file JSON, JS, PY, atau teks)
function importCustomCommands(rawItems, overwrite = true, instanceId = null) {
  let list = [];
  if (typeof rawItems === 'string') {
    list = parseMultiFormatCommands(rawItems);
  } else if (Array.isArray(rawItems)) {
    list = rawItems;
  } else if (typeof rawItems === 'object' && rawItems !== null) {
    if (Array.isArray(rawItems.commands)) {
      list = rawItems.commands;
    } else {
      list = Object.keys(rawItems).map((key) => ({
        name: key,
        ...rawItems[key],
      }));
    }
  } else {
    throw new Error('Format data import tidak valid. Gunakan format JSON, JS, Python, Array, atau Object.');
  }

  const builtInNames = new Set(COMMANDS.map((c) => c.name));
  const customFeatures = getCustomFeatures(instanceId);
  let importedCount = 0;
  let skippedCount = 0;
  const errors = [];

  for (const item of list) {
    try {
      const rawName = item.name || item.command || '';
      const cleanName = String(rawName).toLowerCase().replace(/[^a-z0-9_-]/g, '').trim();
      if (!cleanName || cleanName.length < 2) {
        skippedCount++;
        continue;
      }

      if (builtInNames.has(cleanName)) {
        errors.push(`'/${cleanName}' dilewati karena nama command bawaan bot.`);
        skippedCount++;
        continue;
      }

      if (customFeatures[cleanName] && !overwrite) {
        skippedCount++;
        continue;
      }

      const response = item.response || item.reply || item.customResponse || item.text || (item.desc || item.description ? `ℹ️ *${cleanName.toUpperCase()}*\n${item.desc || item.description}` : `Fitur /${cleanName} aktif.`);
      if (!response) {
        skippedCount++;
        continue;
      }

      const permission = ['public', 'admin', 'owner'].includes(item.permission)
        ? item.permission
        : item.ownerOnly
          ? 'owner'
          : 'public';

      const type = (item.type || item.mediaType || (item.mediaUrl || item.imageUrl || item.videoUrl || item.audioUrl || item.documentUrl || item.fileUrl ? 'media' : 'text')).toLowerCase();
      const mediaUrl = item.mediaUrl || item.imageUrl || item.videoUrl || item.audioUrl || item.fileUrl || item.url || null;
      const caption = item.caption !== undefined ? String(item.caption) : null;
      const fileName = item.fileName || item.filename || null;
      const mimetype = item.mimetype || item.mimeType || null;
      const ptt = item.ptt !== undefined ? Boolean(item.ptt) : false;
      const apiUrl = item.apiUrl || item.endpoint || null;
      const apiPath = item.apiPath || null;
      const handler = item.handler || item.code || item.action || item.script || null;

      customFeatures[cleanName] = {
        name: cleanName,
        response: String(response).trim(),
        desc: String(item.desc || item.description || `Command /${cleanName}`).trim(),
        category: String(item.category || 'Imported').trim(),
        permission,
        ownerOnly: permission === 'owner',
        adminOnly: permission === 'admin',
        type,
        ...(mediaUrl ? { mediaUrl: String(mediaUrl).trim() } : {}),
        ...(caption ? { caption: String(caption).trim() } : {}),
        ...(fileName ? { fileName: String(fileName).trim() } : {}),
        ...(mimetype ? { mimetype: String(mimetype).trim() } : {}),
        ...(ptt ? { ptt: true } : {}),
        ...(apiUrl ? { apiUrl: String(apiUrl).trim() } : {}),
        ...(apiPath ? { apiPath: String(apiPath).trim() } : {}),
        ...(handler ? { handler: String(handler) } : {}),
        enabled: item.enabled !== undefined ? !!item.enabled : true,
        createdAt: customFeatures[cleanName]?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      importedCount++;
    } catch (e) {
      errors.push(e.message);
      skippedCount++;
    }
  }

  saveCustomFeatures(customFeatures, instanceId);
  return {
    success: true,
    importedCount,
    skippedCount,
    totalCustom: Object.keys(customFeatures).length,
    errors,
    instanceId: instanceId || 'primary',
  };
}

// Export seluruh command custom
function exportCustomCommands(instanceId = null) {
  const customFeatures = getCustomFeatures(instanceId);
  const commands = Object.keys(customFeatures).map((key) => customFeatures[key]);
  return {
    app: 'Polaris Project',
    instanceId: instanceId || 'primary',
    exportedAt: new Date().toISOString(),
    totalCommands: commands.length,
    commands,
  };
}

// Bulk toggle semua command (aktifkan / nonaktifkan semua)
function bulkToggleAllCommands(enabled, instanceId = null) {
  const overrides = getCommandOverrides(instanceId);
  const customFeatures = getCustomFeatures(instanceId);
  let count = 0;

  COMMANDS.forEach((cmd) => {
    if (!overrides[cmd.name]) overrides[cmd.name] = {};
    overrides[cmd.name].enabled = !!enabled;
    overrides[cmd.name].updatedAt = new Date().toISOString();
    count++;
  });

  Object.keys(customFeatures).forEach((key) => {
    customFeatures[key].enabled = !!enabled;
    customFeatures[key].updatedAt = new Date().toISOString();
    count++;
  });

  saveCommandOverrides(overrides, instanceId);
  saveCustomFeatures(customFeatures, instanceId);

  return {
    success: true,
    enabled: !!enabled,
    count,
    instanceId: instanceId || 'primary',
    message: `Seluruh command (${count} command) berhasil ${enabled ? 'diaktifkan' : 'dinonaktifkan'}.`,
  };
}

module.exports = {
  getAllCommands,
  getAllCustomCommands,
  setCommandOverride,
  createCustomCommand,
  updateCustomCommand,
  deleteCustomCommand,
  importCustomCommands,
  exportCustomCommands,
  parseMultiFormatCommands,
  getCommandOverrides,
  getCustomFeatures,
  bulkToggleAllCommands,
};
