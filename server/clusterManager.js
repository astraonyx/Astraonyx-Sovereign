// server/clusterManager.js — Pengelola Multi-Akun Bot WhatsApp dalam SATU PORT (Single-Port Multi-Bot)
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode');
const config = require('../config');

const DB_PATH = path.resolve(__dirname, '../database/cluster_instances.json');
const { kvQueries } = require('./db');

function getMaxTotalBots() {
  try {
    if (kvQueries && kvQueries.get) {
      const saved = kvQueries.get('cluster_max_total_bots');
      if (saved && typeof saved === 'number' && saved > 0) return saved;
      if (saved && typeof saved === 'string' && parseInt(saved, 10) > 0) return parseInt(saved, 10);
    }
  } catch (_) {}
  return (config.cluster && config.cluster.maxTotalBots) || 30;
}

function setMaxTotalBots(newMax) {
  const num = parseInt(newMax, 10);
  if (isNaN(num) || num < 1) throw new Error('Nilai maksimal bot server harus berupa angka minimal 1.');
  if (config.cluster) config.cluster.maxTotalBots = num;
  try {
    if (kvQueries && kvQueries.set) {
      kvQueries.set('cluster_max_total_bots', num);
    }
  } catch (_) {}
  return num;
}

const activeProcesses = new Map();
const instanceLogs = new Map();
const peerStatusCache = new Map();
const storyResolvers = new Map();
const deleteStoryResolvers = new Map();
const clusterListeners = new Set();

function addClusterListener(fn) {
  clusterListeners.add(fn);
  return () => clusterListeners.delete(fn);
}

function broadcastCluster(event, payload) {
  for (const listener of clusterListeners) {
    try {
      listener(event, payload);
    } catch (_) {}
  }
}

function ensureInstanceDatabaseFiles(id) {
  const instDir = path.resolve(__dirname, '../instances/' + id);
  const dbDir = path.join(instDir, 'database');
  const tmpDir = path.join(instDir, 'tmp');
  const tmpMediaDir = path.join(tmpDir, 'media');
  const tmpDlDir = path.join(tmpDir, 'downloader');
  const outputDir = path.join(instDir, 'output');

  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  if (!fs.existsSync(tmpMediaDir)) fs.mkdirSync(tmpMediaDir, { recursive: true });
  if (!fs.existsSync(tmpDlDir)) fs.mkdirSync(tmpDlDir, { recursive: true });
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // Subfolder media WA & downloader terisolasi per bot
  ['sticker', 'toimg', 'vault', 'antidelete'].forEach(sub => {
    const subPath = path.join(tmpMediaDir, sub);
    if (!fs.existsSync(subPath)) fs.mkdirSync(subPath, { recursive: true });
  });
  ['audio', 'mediafire'].forEach(sub => {
    const subPath = path.join(tmpDlDir, sub);
    if (!fs.existsSync(subPath)) fs.mkdirSync(subPath, { recursive: true });
  });

  const copyOrInit = (filename, sourceRelative, initialContent) => {
    const dest = path.join(dbDir, filename);
    if (!fs.existsSync(dest)) {
      const src = path.resolve(__dirname, '..', sourceRelative);
      if (fs.existsSync(src)) {
        try {
          fs.copyFileSync(src, dest);
        } catch (_) {
          fs.writeFileSync(dest, initialContent, 'utf-8');
        }
      } else {
        fs.writeFileSync(dest, initialContent, 'utf-8');
      }
    }
    return dest;
  };

  const commandOverridesFile = copyOrInit('command_overrides.json', './database/command_overrides.json', '{}');
  const customFeaturesFile = copyOrInit('custom_features.json', './database/custom_features.json', '{}');
  const whitelistFile = copyOrInit('whitelist.json', './database/whitelist.json', JSON.stringify({ allowed: [], owners: [] }, null, 2));
  const groupSettingsFile = copyOrInit('groupSettings.json', './database/groupSettings.json', JSON.stringify({ allowedGroups: {} }, null, 2));
  const privateSettingsFile = copyOrInit('privateChatSettings.json', './database/privateChatSettings.json', JSON.stringify({ chats: {} }, null, 2));
  const contactsFile = copyOrInit('contacts.json', './database/contacts.json', '{}');
  const storyTemplatesFile = copyOrInit('story_audience_templates.json', './database/story_audience_templates.json', '[]');
  const botProfileFile = path.join(dbDir, 'bot_profile.json');

  return {
    commandOverridesFile,
    customFeaturesFile,
    whitelistFile,
    groupSettingsFile,
    privateSettingsFile,
    contactsFile,
    storyTemplatesFile,
    botProfileFile,
    tmpDir: './instances/' + id + '/tmp',
    outputDir: './instances/' + id + '/output',
  };
}

function readClusterDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const initial = {
        primary: {
          id: 'primary',
          name: (config.botName || 'Polaris') + ' (Utama)',
          authDir: './auth_info',
          prefix: config.prefix || '/',
          ownerNumber: config.ownerNumber || '',
          isPrimary: true,
          createdAt: new Date().toISOString()
        }
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8') || '{}');
    if (!data.primary) {
      data.primary = {
        id: 'primary',
        name: (config.botName || 'Polaris') + ' (Utama)',
        authDir: './auth_info',
        prefix: config.prefix || '/',
        ownerNumber: config.ownerNumber || '',
        isPrimary: true,
        createdAt: new Date().toISOString()
      };
    }

    // Normalisasi semua instance non-primary agar memiliki path database terisolasi
    let dirty = false;
    for (const [id, inst] of Object.entries(data)) {
      if (inst.isPrimary) continue;
      ensureInstanceDatabaseFiles(id);
      if (!inst.commandOverridesFile || !inst.commandOverridesFile.includes(id)) {
        inst.commandOverridesFile = `./instances/${id}/database/command_overrides.json`;
        inst.customFeaturesFile = `./instances/${id}/database/custom_features.json`;
        inst.whitelistFile = `./instances/${id}/database/whitelist.json`;
        inst.groupSettingsFile = `./instances/${id}/database/groupSettings.json`;
        inst.privateSettingsFile = `./instances/${id}/database/privateChatSettings.json`;
        dirty = true;
      }
    }
    if (dirty) {
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    }

    return data;
  } catch (err) {
    console.error('[clusterManager] Error readClusterDb:', err.message);
    return {};
  }
}

function saveClusterDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[clusterManager] Error saveClusterDb:', err.message);
  }
}

function checkInstanceAccess(inst, user, actionName = 'mengontrol') {
  if (!inst) throw new Error('Instance bot tidak ditemukan.');
  if (!user) return true; // Internal calls

  // Bot Instance Non-Primary: HANYA pemilik akun yang dapat mengontrol bot tersebut
  if (inst.ownerUserId && inst.ownerUserId !== user.id) {
    throw new Error(`Akses ditolak: Anda tidak memiliki izin untuk ${actionName} bot milik akun lain.`);
  }

  // Bot Utama (Primary): Hanya dapat dimodifikasi oleh Admin Senior / Cosmos untuk internal server host
  if (inst.isPrimary) {
    const isCosmos = (user.role || '').toLowerCase() === 'cosmos';
    if (!isCosmos && (user.tierLevel || 1) < 8) {
      throw new Error('Akses ditolak: Bot Utama sistem (Primary) hanya untuk internal server host.');
    }
  }

  return true;
}

class ClusterManager {
  readClusterDb() {
    return readClusterDb();
  }

  ensureUserInstance(user) {
    if (!user || !user.id) return null;
    const { getRoleLevel } = require('./auth');
    const tierLevel = user.tierLevel || (user.role ? getRoleLevel(user.role) : 1);
    // Hanya pengguna tingkat Overlord (Tingkat 9) atau Cosmos (Tingkat 10) yang berhak memiliki bot
    if (tierLevel < 9) return null;

    const db = readClusterDb();

    // Check if user already has their private Polaris instance
    let existing = Object.values(db).find((inst) => !inst.isPrimary && inst.ownerUserId === user.id);
    if (existing) return existing;

    // Auto-provision personal Polaris bot instance for this user
    const id = 'polaris_' + user.id;
    const instDir = path.resolve(__dirname, '../instances/' + id);
    const authDir = path.join(instDir, 'auth_info');
    const dbDir = path.join(instDir, 'database');

    fs.mkdirSync(authDir, { recursive: true });
    fs.mkdirSync(dbDir, { recursive: true });

    ensureInstanceDatabaseFiles(id);

    const cleanPhone = (user.phoneNumber || '').replace(/[^0-9]/g, '');
    const displayName = user.displayName || user.username || 'Member';

    db[id] = {
      id,
      name: `Polaris (${displayName})`,
      role: 'personal',
      prefix: '/',
      ownerNumber: cleanPhone,
      ownerUserId: user.id,
      ownerUsername: user.username,
      authDir: './instances/' + id + '/auth_info',
      commandOverridesFile: './instances/' + id + '/database/command_overrides.json',
      customFeaturesFile: './instances/' + id + '/database/custom_features.json',
      whitelistFile: './instances/' + id + '/database/whitelist.json',
      groupSettingsFile: './instances/' + id + '/database/groupSettings.json',
      privateSettingsFile: './instances/' + id + '/database/privateChatSettings.json',
      isPrimary: false,
      createdAt: new Date().toISOString()
    };

    saveClusterDb(db);
    return db[id];
  }

  listInstances(primaryBotManager, user = null) {
    const db = readClusterDb();
    const list = [];
    const isCosmos = user && (user.role || '').toLowerCase() === 'cosmos';
    const userId = user ? user.id : null;
    const maxBots = (config.cluster && config.cluster.maxBotsPerUser) || 5;
    const maxTotalBots = getMaxTotalBots();

    const { getRoleLevel } = require('./auth');
    const userTier = user ? (user.tierLevel || getRoleLevel(user.role || 'member')) : 1;
    const isAllowedTier = userTier >= 9;

    // Auto-provision jika user belum punya instance pribadi dan memiliki tingkatan Overlord/Cosmos
    if (user && user.id && isAllowedTier) {
      this.ensureUserInstance(user);
    }

    const currentDb = readClusterDb();
    const allServerBots = Object.values(currentDb).filter(i => !i.isPrimary);
    const totalServerBots = allServerBots.length;

    let userBotsCount = 0;
    for (const inst of allServerBots) {
      if (inst.ownerUserId && inst.ownerUserId === userId) {
        userBotsCount++;
      }
    }

    for (const [id, inst] of Object.entries(currentDb)) {
      // Isolasi Multi-Tenant Independen:
      // Setiap akun HANYA melihat bot Polaris miliknya sendiri dan tidak melihat / mengatur bot akun lain
      if (user && user.id) {
        if (!isCosmos) {
          if (inst.isPrimary || inst.ownerUserId !== userId) {
            continue;
          }
        }
      }

      const isOwner = Boolean(userId) && inst.ownerUserId === userId;

      if (inst.isPrimary) {
        const primaryStatus = primaryBotManager ? primaryBotManager.getStatus() : { status: 'OFFLINE' };
        const isPrimaryConnected = primaryStatus.status === 'CONNECTED' || primaryStatus.status === 'ONLINE';
        const isWaitingQr = primaryStatus.status === 'QR_READY' || Boolean(primaryStatus.lastQrDataUrl);
        const isPairing = Boolean(primaryStatus.pairingCode);
        let botStatus = 'OFFLINE';
        if (isPrimaryConnected) botStatus = 'CONNECTED';
        else if (isPairing) botStatus = 'CONNECTING';
        else if (isWaitingQr) botStatus = 'QR_READY';
        else if (primaryStatus.isRunning) botStatus = 'STARTING';

        list.push({
          ...inst,
          status: primaryStatus.isRunning ? 'RUNNING' : 'STOPPED',
          botStatus,
          pairingCode: primaryStatus.pairingCode || null,
          lastQrDataUrl: primaryStatus.lastQrDataUrl || null,
          profilePicUrl: primaryStatus.profilePicUrl || null,
          pid: process.pid,
          isCurrentNode: true,
          isOwner,
          canControl: isOwner || isCosmos,
          ownerUsername: 'System Primary',
        });
      } else {
        const proc = activeProcesses.get(id);
        const cached = peerStatusCache.get(id) || {};
        const isRunning = Boolean(proc && !proc.killed);
        const isChildConnected = cached.botStatus === 'CONNECTED' || cached.botStatus === 'ONLINE';
        list.push({
          ...inst,
          status: isRunning ? 'RUNNING' : 'STOPPED',
          botStatus: isRunning ? (isChildConnected ? 'CONNECTED' : (cached.botStatus || (cached.lastQrDataUrl ? 'WAITING_QR' : 'STARTING'))) : 'STOPPED',
          pairingCode: cached.pairingCode || null,
          lastQrDataUrl: cached.lastQrDataUrl || null,
          profilePicUrl: cached.profilePicUrl || null,
          pid: isRunning ? proc.pid : null,
          isCurrentNode: true,
          isOwner,
          canControl: isOwner || isCosmos,
          ownerUsername: inst.ownerUsername || 'User',
        });
      }
    }

    const activeServerBots = allServerBots.filter(i => activeProcesses.has(i.id)).length;
    const inactiveServerBots = Math.max(0, totalServerBots - activeServerBots);

    // Lampirkan informasi kuota per-akun & server-wide
    list.quota = {
      current: userBotsCount,
      max: maxBots, // 5
      serverTotal: totalServerBots,
      serverActive: activeServerBots,
      serverInactive: inactiveServerBots,
      serverMax: maxTotalBots,
      userTierLevel: userTier,
      isAllowedTier,
      canCreate: userBotsCount < maxBots && totalServerBots < maxTotalBots && isAllowedTier,
      isCosmos,
    };

    return list;
  }

  createInstance({ name, role = 'general', prefix = '/', ownerNumber = '', ownerUserId = null, ownerUsername = null, userTierLevel = 1, userRole = null }) {
    if (!name || !name.trim()) {
      throw new Error('Nama akun bot wajib diisi.');
    }

    const { getRoleLevel } = require('./auth');
    const tierLvl = userTierLevel || (userRole ? getRoleLevel(userRole) : 1);
    if (tierLvl < 9) {
      throw new Error('Akses ditolak: Pembuatan bot WhatsApp eksklusif untuk tingkat Overlord (Tingkat 9) dan Cosmos (Tingkat 10). Hubungi Supreme Owner Cosmos untuk peningkatan hak akses.');
    }

    const maxBots = (config.cluster && config.cluster.maxBotsPerUser) || 5;
    const maxTotalBots = getMaxTotalBots();

    const db = readClusterDb();

    // Validasi total bot di satu server maksimal 30 (cepet-cepetan)
    const allInstances = Object.values(db).filter(i => !i.isPrimary);
    if (allInstances.length >= maxTotalBots) {
      throw new Error(`Batas kapasitas server tercapai: Server ini sudah memiliki ${allInstances.length} bot dari batas maksimal ${maxTotalBots} bot (kuota server penuh, sistem cepat-cepatan).`);
    }

    // Validasi batas maksimal bot per akun (maksimal 5 bot)
    if (ownerUserId) {
      const userBots = allInstances.filter((i) => i.ownerUserId === ownerUserId);
      if (userBots.length >= maxBots) {
        throw new Error(`Batas kuota akun tercapai: Setiap akun maksimal memiliki ${maxBots} bot WhatsApp. Akun Anda sudah memiliki ${userBots.length} bot.`);
      }
    }

    const id = 'bot_' + Date.now();
    const instDir = path.resolve(__dirname, '../instances/' + id);
    const authDir = path.join(instDir, 'auth_info');
    const dbDir = path.join(instDir, 'database');

    fs.mkdirSync(authDir, { recursive: true });
    fs.mkdirSync(dbDir, { recursive: true });

    // Inisialisasi database terisolasi untuk bot instance ini
    ensureInstanceDatabaseFiles(id);

    db[id] = {
      id,
      name: name.trim(),
      role: role || 'general',
      prefix: prefix.trim() || '/',
      ownerNumber: (ownerNumber || config.ownerNumber || '').replace(/[^0-9]/g, ''),
      ownerUserId: ownerUserId || null,
      ownerUsername: ownerUsername || 'Anonymous',
      authDir: './instances/' + id + '/auth_info',
      commandOverridesFile: './instances/' + id + '/database/command_overrides.json',
      customFeaturesFile: './instances/' + id + '/database/custom_features.json',
      whitelistFile: './instances/' + id + '/database/whitelist.json',
      groupSettingsFile: './instances/' + id + '/database/groupSettings.json',
      privateSettingsFile: './instances/' + id + '/database/privateChatSettings.json',
      isPrimary: false,
      createdAt: new Date().toISOString()
    };

    saveClusterDb(db);
    return db[id];
  }

  updateInstanceSettings(id, { name, role, prefix, ownerNumber }, user = null) {
    const db = readClusterDb();
    const inst = db[id];
    if (!inst) throw new Error('Instance bot tidak ditemukan.');
    checkInstanceAccess(inst, user, 'mengubah pengaturan');

    if (name && name.trim()) inst.name = name.trim();
    if (role && role.trim()) inst.role = role.trim();
    if (prefix && prefix.trim()) inst.prefix = prefix.trim();
    if (ownerNumber !== undefined) inst.ownerNumber = String(ownerNumber).replace(/[^0-9]/g, '');

    saveClusterDb(db);
    return { success: true, message: `Pengaturan bot '${inst.name}' berhasil disimpan.`, instance: inst };
  }

  async startInstance(id, options = {}, user = null) {
    const db = readClusterDb();
    const inst = db[id];
    if (!inst) throw new Error('Instance tidak ditemukan.');
    checkInstanceAccess(inst, user, 'menjalankan');

    if (inst.isPrimary) {
      const primaryBotManager = require('./botManager');
      return await primaryBotManager.startBot(options);
    }

    if (activeProcesses.has(id)) {
      const existing = activeProcesses.get(id);
      if (existing && !existing.killed) {
        return { success: true, message: `Bot '${inst.name}' sudah berjalan.`, pid: existing.pid };
      }
    }

    const { pairingNumber } = options;
    const instPaths = ensureInstanceDatabaseFiles(id);
    const scriptPath = path.resolve(__dirname, '../index.js');

    const env = {
      ...process.env,
      INSTANCE_ID: id,
      BOT_NAME: inst.name,
      BOT_PREFIX: inst.prefix || '/',
      OWNER_NUMBER: inst.ownerNumber || config.ownerNumber || '',
      AUTH_DIR: inst.authDir,
      COMMAND_OVERRIDES_FILE: path.resolve(__dirname, '..', instPaths.commandOverridesFile),
      CUSTOM_FEATURES_FILE: path.resolve(__dirname, '..', instPaths.customFeaturesFile),
      WHITELIST_FILE: path.resolve(__dirname, '..', instPaths.whitelistFile),
      GROUP_SETTINGS_FILE: path.resolve(__dirname, '..', instPaths.groupSettingsFile),
      PRIVATE_SETTINGS_FILE: path.resolve(__dirname, '..', instPaths.privateSettingsFile),
      CONTACTS_FILE: path.resolve(__dirname, '..', instPaths.contactsFile),
      BOT_PROFILE_FILE: path.resolve(__dirname, '..', instPaths.botProfileFile),
      STORY_TEMPLATES_FILE: path.resolve(__dirname, '..', instPaths.storyTemplatesFile),
      TMP_DIR: path.resolve(__dirname, '../instances/' + id + '/tmp'),
      OUTPUT_DIR: path.resolve(__dirname, '../instances/' + id + '/output'),
      DOWNLOADER_DIR: path.resolve(__dirname, '../instances/' + id + '/tmp/downloader'),
      BOT_OWNER_USER_ID: inst.ownerUserId || '',
      BOT_OWNER_USERNAME: inst.ownerUsername || '',
    };

    if (pairingNumber) {
      env.PAIRING_NUMBER = pairingNumber.replace(/[^0-9]/g, '');
    } else {
      delete env.PAIRING_NUMBER;
    }

    const proc = spawn('node', [scriptPath], {
      cwd: path.resolve(__dirname, '..'),
      env,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });

    if (!instanceLogs.has(id)) instanceLogs.set(id, []);
    const logs = instanceLogs.get(id);
    const pushLog = (text) => {
      const timestamp = new Date().toLocaleTimeString('id-ID', { hour12: false });
      const line = `[${timestamp}] ${text}`;
      logs.push(line);
      if (logs.length > 300) logs.shift();
      broadcastCluster('CLUSTER_LOG', { instanceId: id, line });
    };

    pushLog(`🚀 [Cluster Manager] Memulai proses bot '${inst.name}' (PID: ${proc.pid})...`);
    peerStatusCache.set(id, { isRunning: true, pid: proc.pid, botStatus: 'STARTING' });

    proc.on('message', (msg) => {
      if (msg?.type === 'STORY_RESULT') {
        const resolver = storyResolvers.get(id);
        if (resolver) {
          resolver(msg);
          storyResolvers.delete(id);
        }
      }
      if (msg?.type === 'DELETE_STORY_RESULT') {
        const resolver = deleteStoryResolvers.get(id);
        if (resolver) {
          resolver(msg);
          deleteStoryResolvers.delete(id);
        }
      }
      if (msg?.type === 'BOT_PROFILE') {
        const cached = peerStatusCache.get(id) || {};
        cached.profilePicUrl = msg.profilePicUrl;
        peerStatusCache.set(id, cached);
        broadcastCluster('CLUSTER_STATUS', { instanceId: id, ...cached });
      }
    });

    proc.stdout.on('data', async (chunk) => {
      const text = chunk.toString();
      const lines = text.split('\n').filter(Boolean);

      for (const rawLine of lines) {
        const cleanLine = rawLine.trim();

        // 1. Deteksi QR Code Mentah
        if (cleanLine.includes('QR_RAW:')) {
          const qrIndex = cleanLine.indexOf('QR_RAW:');
          const qrRaw = cleanLine.substring(qrIndex + 7).trim();
          try {
            const dataUrl = await qrcode.toDataURL(qrRaw, { margin: 2, width: 320 });
            const cached = peerStatusCache.get(id) || {};
            cached.lastQrDataUrl = dataUrl;
            cached.botStatus = 'QR_READY';
            peerStatusCache.set(id, cached);
            pushLog(`📷 [${inst.name}] QR Code baru siap dipindai di dashboard.`);
            broadcastCluster('CLUSTER_QR', { instanceId: id, qrDataUrl: dataUrl });
          } catch (_) {}
          continue;
        }

        // 2. Deteksi Pairing Code
        if (cleanLine.includes('PAIRING_CODE:')) {
          const pIndex = cleanLine.indexOf('PAIRING_CODE:');
          const code = cleanLine.substring(pIndex + 13).trim();
          const cached = peerStatusCache.get(id) || {};
          cached.pairingCode = code;
          cached.botStatus = 'CONNECTING';
          peerStatusCache.set(id, cached);
          pushLog(`🔑 [${inst.name}] Pairing Code siap: ${code}`);
          broadcastCluster('CLUSTER_PAIRING_CODE', { instanceId: id, code });
          continue;
        }

        // 3. Deteksi Status Terhubung
        if (
          cleanLine.includes('Bot tersambung ke WhatsApp!') ||
          cleanLine.includes('Terhubung ke WhatsApp') ||
          cleanLine.includes('Connected to WhatsApp') ||
          cleanLine.includes('opened connection') ||
          cleanLine.includes('connection open')
        ) {
          const cached = peerStatusCache.get(id) || {};
          cached.botStatus = 'CONNECTED';
          cached.lastQrDataUrl = null;
          cached.pairingCode = null;
          peerStatusCache.set(id, cached);
          pushLog(`✅ [${inst.name}] Berhasil terhubung ke WhatsApp!`);
          broadcastCluster('CLUSTER_STATUS', { instanceId: id, botStatus: 'CONNECTED' });
        }

        // 4. Deteksi Logged Out / Disconnect
        if (cleanLine.includes('Logged out.') || cleanLine.includes('Connection closed')) {
          const cached = peerStatusCache.get(id) || {};
          cached.botStatus = 'OFFLINE';
          peerStatusCache.set(id, cached);
          broadcastCluster('CLUSTER_STATUS', { instanceId: id, botStatus: 'OFFLINE' });
        }

        pushLog(cleanLine);
      }
    });

    proc.stderr.on('data', (chunk) => {
      const line = chunk.toString().trim();
      pushLog('⚠️ [STDERR] ' + line);
    });

    proc.on('close', (code) => {
      activeProcesses.delete(id);
      peerStatusCache.set(id, { isRunning: false, botStatus: 'STOPPED' });
      pushLog(`🛑 [${inst.name}] Proses bot berhenti (kode keluar: ${code}).`);
      broadcastCluster('CLUSTER_STATUS', { instanceId: id, botStatus: 'STOPPED' });
    });

    activeProcesses.set(id, proc);
    return { success: true, message: `Bot '${inst.name}' berhasil dijalankan!`, pid: proc.pid };
  }

  async stopInstance(id, user = null) {
    const db = readClusterDb();
    const inst = db[id];
    if (!inst) throw new Error('Instance tidak ditemukan.');
    checkInstanceAccess(inst, user, 'menghentikan');

    if (inst.isPrimary) {
      const primaryBotManager = require('./botManager');
      return primaryBotManager.stopBot();
    }

    const proc = activeProcesses.get(id);
    if (proc && !proc.killed) {
      try {
        proc.kill('SIGTERM');
      } catch (_) {
        try { proc.kill('SIGKILL'); } catch (__) {}
      }
      activeProcesses.delete(id);
      peerStatusCache.set(id, { isRunning: false, botStatus: 'STOPPED' });
      return { success: true, message: `Instance '${inst.name}' berhasil dihentikan.` };
    }

    peerStatusCache.set(id, { isRunning: false, botStatus: 'STOPPED' });
    return { success: true, message: `Instance '${inst.name}' sudah tidak aktif.` };
  }

  async deleteInstance(id, user = null) {
    const db = readClusterDb();
    const inst = db[id];
    if (!inst) throw new Error('Instance tidak ditemukan.');
    if (inst.isPrimary) throw new Error('Instance utama tidak dapat dihapus.');
    checkInstanceAccess(inst, user, 'menghapus');

    await this.stopInstance(id, user);
    await new Promise((r) => setTimeout(r, 1000));

    const instDir = path.resolve(__dirname, `../instances/${id}`);
    if (fs.existsSync(instDir)) {
      for (let i = 0; i < 10; i++) {
        try {
          fs.rmSync(instDir, { recursive: true, force: true });
          if (!fs.existsSync(instDir)) break;
        } catch (_) {
          await new Promise((r) => setTimeout(r, 250));
        }
      }
      if (fs.existsSync(instDir)) {
        try {
          require('child_process').execSync(`cmd /c rd /s /q "${instDir}"`, { stdio: 'ignore' });
        } catch (_) {}
      }
    }

    delete db[id];
    saveClusterDb(db);
    peerStatusCache.delete(id);
    return { success: true, message: `Instance '${inst.name}' beserta seluruh filenya berhasil dihapus.` };
  }

  async pairInstance(id, phoneNumber, authHeader = null, user = null) {
    const db = readClusterDb();
    const inst = db[id];
    if (!inst) throw new Error('Instance tidak ditemukan.');
    checkInstanceAccess(inst, user, 'meminta pairing code untuk');

    let cleanPhone = String(phoneNumber || '').replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
    else if (cleanPhone.startsWith('8')) cleanPhone = '62' + cleanPhone;

    if (inst.isPrimary) {
      const primaryBotManager = require('./botManager');
      return await primaryBotManager.restartBot({ pairingNumber: cleanPhone });
    }

    await this.stopInstance(id, user);
    try {
      const authDir = path.resolve(__dirname, '..', inst.authDir || `./instances/${id}/auth_info`);
      const credsFile = path.join(authDir, 'creds.json');
      if (fs.existsSync(credsFile)) {
        let credsData = {};
        try {
          credsData = JSON.parse(fs.readFileSync(credsFile, 'utf8') || '{}');
        } catch (_) {}
        const isRegistered = Boolean(credsData.registered === true && credsData.me && (credsData.me.id || credsData.me.jid));
        if (!isRegistered) {
          fs.rmSync(authDir, { recursive: true, force: true });
          fs.mkdirSync(authDir, { recursive: true });
        }
      }
    } catch (_) {}
    return await this.startInstance(id, { pairingNumber: cleanPhone }, user);
  }

  async restartBotInstance(id, authHeader = null, user = null) {
    const db = readClusterDb();
    const inst = db[id];
    if (!inst) throw new Error('Instance tidak ditemukan.');
    checkInstanceAccess(inst, user, 'merestart');

    if (inst.isPrimary) {
      const primaryBotManager = require('./botManager');
      return await primaryBotManager.restartBot();
    }

    await this.stopInstance(id, user);
    return await this.startInstance(id, {}, user);
  }

  async resetSession(id, user = null) {
    const db = readClusterDb();
    const inst = db[id];
    if (!inst) throw new Error('Instance tidak ditemukan.');
    checkInstanceAccess(inst, user, 'mereset sesi');

    if (inst.isPrimary) {
      const primaryBotManager = require('./botManager');
      return await primaryBotManager.deleteSession();
    }

    await this.stopInstance(id, user);
    await new Promise((r) => setTimeout(r, 1000));

    const authDir = inst.authDir ? path.resolve(__dirname, '..', inst.authDir) : path.resolve(__dirname, `../instances/${id}/auth_info`);
    if (fs.existsSync(authDir)) {
      for (let i = 0; i < 10; i++) {
        try {
          fs.rmSync(authDir, { recursive: true, force: true });
          if (!fs.existsSync(authDir)) break;
        } catch (_) {
          await new Promise((r) => setTimeout(r, 250));
        }
      }
      if (fs.existsSync(authDir)) {
        try {
          require('child_process').execSync(`cmd /c rd /s /q "${authDir}"`, { stdio: 'ignore' });
        } catch (_) {}
      }
      if (fs.existsSync(authDir)) {
        throw new Error('Gagal menghapus folder sesi Baileys (file masih terkunci oleh proses lain di Windows).');
      }
      fs.mkdirSync(authDir, { recursive: true });
    }

    peerStatusCache.set(id, { isRunning: false, botStatus: 'OFFLINE', pairingCode: null, lastQrDataUrl: null });
    return { success: true, message: `Sesi WhatsApp bot '${inst.name}' berhasil direset (logout & auth_info dibersihkan).` };
  }

  async postStory(instanceId, storyPayload, user = null) {
    if (!instanceId || instanceId === 'primary') {
      const primaryBotManager = require('./botManager');
      return await primaryBotManager.postStory(storyPayload);
    }

    const db = readClusterDb();
    const inst = db[instanceId];
    if (inst) checkInstanceAccess(inst, user, 'memposting status story dari');

    const proc = activeProcesses.get(instanceId);
    if (!proc || proc.killed) {
      throw new Error(`Instance bot '${instanceId}' belum berjalan atau offline. Silakan jalankan bot terlebih dahulu.`);
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        storyResolvers.delete(instanceId);
        reject(new Error('Timeout menunggu konfirmasi posting story dari instance WhatsApp.'));
      }, 45000);

      storyResolvers.set(instanceId, (result) => {
        clearTimeout(timer);
        resolve(result);
      });

      proc.send({ type: 'POST_STORY', payload: storyPayload });
    });
  }

  async deleteStory(instanceId, storyId = null, user = null) {
    if (!instanceId || instanceId === 'primary') {
      const primaryBotManager = require('./botManager');
      return await primaryBotManager.deleteStory(storyId);
    }

    const db = readClusterDb();
    const inst = db[instanceId];
    if (inst) checkInstanceAccess(inst, user, 'menghapus status story dari');

    const proc = activeProcesses.get(instanceId);
    if (!proc || proc.killed) {
      throw new Error(`Instance bot '${instanceId}' belum berjalan atau offline.`);
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        deleteStoryResolvers.delete(instanceId);
        reject(new Error('Timeout menunggu konfirmasi penghapusan story dari instance WhatsApp.'));
      }, 30000);

      deleteStoryResolvers.set(instanceId, (result) => {
        clearTimeout(timer);
        resolve(result);
      });

      proc.send({ type: 'DELETE_STORY', payload: { storyId } });
    });
  }

  getLogs(id, user = null) {
    if (!id || id === 'primary') {
      const primaryBotManager = require('./botManager');
      return primaryBotManager.getLogs();
    }
    const db = readClusterDb();
    const inst = db[id];
    if (inst) checkInstanceAccess(inst, user, 'melihat log');
    return instanceLogs.get(id) || [];
  }

  clearLogs(id, user = null) {
    if (!id || id === 'primary') {
      const primaryBotManager = require('./botManager');
      return primaryBotManager.clearLogs();
    }
    const db = readClusterDb();
    const inst = db[id];
    if (inst) checkInstanceAccess(inst, user, 'membersihkan log');
    if (instanceLogs.has(id)) {
      instanceLogs.set(id, []);
    }
    broadcastCluster('CLUSTER_LOGS_CLEARED', { instanceId: id });
    return true;
  }

  checkInstanceAccess(inst, user, actionName = 'mengakses') {
    return checkInstanceAccess(inst, user, actionName);
  }

  addListener(fn) {
    return addClusterListener(fn);
  }

  getMaxTotalBots() {
    return getMaxTotalBots();
  }

  setMaxTotalBots(newMax) {
    return setMaxTotalBots(newMax);
  }

  getServerClusterStats(primaryBotManager = null) {
    const db = readClusterDb();
    const maxTotalBots = getMaxTotalBots();
    const maxBotsPerUser = (config.cluster && config.cluster.maxBotsPerUser) || 5;

    const all = Object.values(db);
    let activeBots = 0;
    let inactiveBots = 0;

    const botList = all.map((inst) => {
      let isRun = false;
      if (inst.isPrimary) {
        try {
          const pm = primaryBotManager || require('./botManager');
          isRun = Boolean(pm && pm.getStatus && pm.getStatus().isRunning);
        } catch (_) {}
      } else {
        isRun = activeProcesses.has(inst.id);
      }

      if (isRun) activeBots++;
      else inactiveBots++;

      return {
        id: inst.id,
        name: inst.name,
        role: inst.role || 'general',
        prefix: inst.prefix || '/',
        ownerUsername: inst.ownerUsername || 'User',
        ownerUserId: inst.ownerUserId || null,
        ownerNumber: inst.ownerNumber || '',
        isPrimary: Boolean(inst.isPrimary),
        isRunning: isRun,
        status: isRun ? 'RUNNING' : 'STOPPED',
      };
    });

    return {
      totalBots: all.length,
      activeBots,
      inactiveBots,
      maxTotalBots,
      maxBotsPerUser,
      instances: botList,
    };
  }
}

module.exports = new ClusterManager();
