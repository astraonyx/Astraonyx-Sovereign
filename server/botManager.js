// server/botManager.js — Daemon Controller untuk WhatsApp Bot Polaris
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode');
const config = require('../config');

class BotManager {
  constructor() {
    this.botProcess = null;
    this.status = 'OFFLINE'; // OFFLINE, STARTING, QR_READY, CONNECTED
    this.lastQrDataUrl = null;
    this.pairingCode = null;
    this.startedAt = null;
    this.logs = [];
    this.maxLogs = 500;
    this.listeners = new Set();
    this.waCheckResolvers = new Map();
  }

  addListener(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  broadcast(event, payload) {
    for (const listener of this.listeners) {
      try {
        listener(event, payload);
      } catch (err) {
        console.error('[botManager] Error in event listener:', err.message);
      }
    }
  }

  pushLog(text) {
    const timestamp = new Date().toLocaleTimeString('id-ID', { hour12: false });
    const line = `[${timestamp}] ${text}`;
    this.logs.push(line);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    this.broadcast('LOG', line);
  }

  getStatus() {
    return {
      status: this.status,
      isRunning: this.botProcess !== null && !this.botProcess.killed,
      lastQrDataUrl: this.lastQrDataUrl,
      pairingCode: this.pairingCode,
      startedAt: this.startedAt,
      uptime: this.startedAt ? Math.floor((Date.now() - this.startedAt) / 1000) : 0,
      botName: config.botName,
      prefix: config.prefix,
    };
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
    this.broadcast('LOGS_CLEARED', {});
  }

  async startBot(options = {}) {
    if (this.botProcess && !this.botProcess.killed) {
      return { success: false, message: 'Bot sudah berjalan.' };
    }

    const { pairingNumber } = options;
    this.status = 'STARTING';
    this.lastQrDataUrl = null;
    this.pairingCode = null;
    this.startedAt = Date.now();
    this.broadcast('STATUS', this.getStatus());
    this.pushLog(`🚀 [Polaris Manager] Memulai proses bot...`);

    const env = { ...process.env };
    const authDir = path.resolve(__dirname, '..', config.paths.authInfo);
    try {
      if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
      }
      const credsFile = path.join(authDir, 'creds.json');
      if (fs.existsSync(credsFile)) {
        let credsData = {};
        try {
          credsData = JSON.parse(fs.readFileSync(credsFile, 'utf8') || '{}');
        } catch (_) {}
        const isRegistered = Boolean(credsData.registered === true && credsData.me && (credsData.me.id || credsData.me.jid));
        // Sesi dibersihkan jika:
        // 1. Meminta nomor pairing baru dan belum terverifikasi penuh
        // 2. Atau memulai mode QR baru tetapi ada sisa pairing code yang menggantung tanpa registrasi penuh
        if ((pairingNumber && !isRegistered) || (!pairingNumber && credsData.pairingCode && !isRegistered)) {
          fs.rmSync(authDir, { recursive: true, force: true });
          fs.mkdirSync(authDir, { recursive: true });
          this.pushLog(`🧹 [Polaris Manager] Sisa sesi yang belum terverifikasi dibersihkan untuk inisialisasi koneksi baru.`);
        }
      }
    } catch (authErr) {
      this.pushLog(`⚠️ [Polaris Manager] Catatan inisialisasi auth: ${authErr.message}`);
    }

    if (pairingNumber) {
      let cleanNum = String(pairingNumber).replace(/[^0-9]/g, '');
      if (cleanNum.startsWith('0')) cleanNum = '62' + cleanNum.slice(1);
      else if (cleanNum.startsWith('8')) cleanNum = '62' + cleanNum;
      env.PAIRING_NUMBER = cleanNum;
      this.pushLog(`📱 Mode pairing aktif untuk nomor: ${env.PAIRING_NUMBER}`);
    } else {
      delete env.PAIRING_NUMBER;
    }

    const scriptPath = path.resolve(__dirname, '../index.js');
    this.botProcess = spawn('node', [scriptPath], {
      cwd: path.resolve(__dirname, '..'),
      env,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });

    this.botProcess.on('message', (msg) => {
      if (msg?.type === 'BOT_CONNECTED') {
        this.status = 'CONNECTED';
        this.lastQrDataUrl = null;
        this.pairingCode = null;
        this.pushLog(`✅ [Polaris Terhubung] WhatsApp Bot aktif dan siap menerima pesan!`);
        this.broadcast('STATUS', this.getStatus());
      }
      if (msg?.type === 'BOT_DISCONNECTED') {
        this.status = 'OFFLINE';
        this.broadcast('STATUS', this.getStatus());
      }
      if (msg?.type === 'STORY_RESULT') {
        if (this.storyPromiseResolve) {
          this.storyPromiseResolve(msg);
          this.storyPromiseResolve = null;
        }
      }
      if (msg?.type === 'DELETE_STORY_RESULT') {
        if (this.deleteStoryPromiseResolve) {
          this.deleteStoryPromiseResolve(msg);
          this.deleteStoryPromiseResolve = null;
        }
      }
      if (msg?.type === 'BOT_PROFILE') {
        this.botProfilePicUrl = msg.profilePicUrl;
        this.broadcast('BOT_PROFILE', { profilePicUrl: msg.profilePicUrl });
      }
      if (msg?.type === 'FETCH_GROUPS_RESULT' || msg?.type === 'GROUPS_SYNCED') {
        if (this.groupsPromiseResolve) {
          this.groupsPromiseResolve(msg);
          this.groupsPromiseResolve = null;
        }
        this.broadcast('GROUPS_SYNCED', msg);
      }
      if (msg?.type === 'EDIT_MESSAGE_RESULT') {
        if (this.editMsgResolve) {
          this.editMsgResolve(msg);
          this.editMsgResolve = null;
        }
      }
      if (msg?.type === 'RELINK_ECOSYSTEM_RESULT') {
        if (this.relinkPromiseResolve) {
          this.relinkPromiseResolve(msg);
          this.relinkPromiseResolve = null;
        }
      }
      if (msg?.type === 'VIRTEX_ATTACK_BLOCKED') {
        this.broadcast('VIRTEX_ATTACK_BLOCKED', msg.data);
      }
      if (msg?.type === 'CHECK_ON_WHATSAPP_RESULT') {
        if (msg.requestId && this.waCheckResolvers?.has(msg.requestId)) {
          const resolver = this.waCheckResolvers.get(msg.requestId);
          this.waCheckResolvers.delete(msg.requestId);
          resolver(msg);
        }
      }
    });

    // Tangkap stdout
    this.botProcess.stdout.on('data', async (chunk) => {
      const text = chunk.toString();
      const lines = text.split('\n').filter(Boolean);

      for (const rawLine of lines) {
        const cleanLine = rawLine.trim();

        // 1. Deteksi QR Code Mentah
        if (cleanLine.includes('QR_RAW:')) {
          const qrIndex = cleanLine.indexOf('QR_RAW:');
          const qrRaw = cleanLine.substring(qrIndex + 7).trim();
          try {
            const dataUrl = await qrcode.toDataURL(qrRaw, {
              margin: 2,
              width: 320,
              color: {
                dark: '#030712',
                light: '#f8fafc',
              },
            });
            this.lastQrDataUrl = dataUrl;
            this.status = 'QR_READY';
            this.pushLog(`📷 [QR Code Dihasilkan] Silakan scan QR code di dashboard web.`);
            this.broadcast('QR', { qrDataUrl: dataUrl, instanceId: 'primary' });
            this.broadcast('CLUSTER_QR', { instanceId: 'primary', qrDataUrl: dataUrl });
            this.broadcast('STATUS', this.getStatus());
            this.broadcast('CLUSTER_STATUS', { instanceId: 'primary', botStatus: 'QR_READY', lastQrDataUrl: dataUrl });
          } catch (err) {
            this.pushLog(`❌ Gagal generate gambar QR: ${err.message}`);
          }
          continue;
        }

        // 2. Deteksi Pairing Code
        if (cleanLine.includes('PAIRING_CODE:')) {
          const pairIndex = cleanLine.indexOf('PAIRING_CODE:');
          const code = cleanLine.substring(pairIndex + 13).trim();
          this.pairingCode = code;
          this.pushLog(`🔑 [Kode Pairing Diterima]: ${code}`);
          this.broadcast('PAIRING_CODE', { code, instanceId: 'primary' });
          this.broadcast('CLUSTER_PAIRING_CODE', { instanceId: 'primary', code });
          this.broadcast('STATUS', this.getStatus());
          this.broadcast('CLUSTER_STATUS', { instanceId: 'primary', botStatus: 'CONNECTING', pairingCode: code });
          continue;
        }

        // 3. Deteksi Bot Tersambung
        if (cleanLine.includes('Bot tersambung ke WhatsApp!')) {
          this.status = 'CONNECTED';
          this.lastQrDataUrl = null;
          this.pairingCode = null;
          this.pushLog(`✅ [Polaris Terhubung] WhatsApp Bot aktif dan siap menerima pesan!`);
          this.broadcast('STATUS', this.getStatus());
          this.broadcast('CLUSTER_STATUS', { instanceId: 'primary', botStatus: 'CONNECTED', lastQrDataUrl: null, pairingCode: null });
        }

        // 4. Deteksi Logged Out
        if (cleanLine.includes('Logged out.')) {
          this.status = 'OFFLINE';
          this.lastQrDataUrl = null;
          this.pairingCode = null;
          this.pushLog(`⚠️ [Sesi Terputus] WhatsApp logged out. Sesi perlu di-reset atau scan ulang.`);
          this.broadcast('STATUS', this.getStatus());
          this.broadcast('CLUSTER_STATUS', { instanceId: 'primary', botStatus: 'OFFLINE', lastQrDataUrl: null, pairingCode: null });
        }

        this.pushLog(cleanLine);
      }
    });

    // Tangkap stderr
    this.botProcess.stderr.on('data', (chunk) => {
      const errText = chunk.toString().trim();
      if (errText) {
        this.pushLog(`⚠️ [STDERR] ${errText}`);
      }
    });

    // Tangkap Exit
    this.botProcess.on('exit', (code, signal) => {
      this.pushLog(`🛑 [Polaris Manager] Proses bot berhenti (code: ${code}, signal: ${signal || 'none'})`);
      this.botProcess = null;
      this.status = 'OFFLINE';
      this.lastQrDataUrl = null;
      this.pairingCode = null;
      this.startedAt = null;
      this.broadcast('STATUS', this.getStatus());
    });

    this.botProcess.on('error', (err) => {
      this.pushLog(`❌ [Process Error] ${err.message}`);
      this.status = 'OFFLINE';
      this.broadcast('STATUS', this.getStatus());
    });

    return { success: true, message: 'Bot berhasil diluncurkan.' };
  }

  async stopBot() {
    if (!this.botProcess) {
      this.status = 'OFFLINE';
      this.broadcast('STATUS', this.getStatus());
      return { success: true, message: 'Bot sudah dalam keadaan mati.' };
    }

    this.pushLog(`🛑 [Polaris Manager] Menghentikan bot...`);
    const proc = this.botProcess;
    this.botProcess = null;

    if (proc) {
      try {
        if (process.platform === 'win32' && proc.pid) {
          try {
            require('child_process').execSync(`taskkill /pid ${proc.pid} /f /t`, { stdio: 'ignore' });
          } catch (_) {
            proc.kill('SIGKILL');
          }
        } else {
          proc.kill('SIGTERM');
          setTimeout(() => {
            try {
              if (!proc.killed) proc.kill('SIGKILL');
            } catch (_) {}
          }, 1500);
        }
      } catch (err) {
        console.error('[botManager] Gagal kill bot process:', err.message);
      }
    }

    this.status = 'OFFLINE';
    this.lastQrDataUrl = null;
    this.pairingCode = null;
    this.startedAt = null;
    this.broadcast('STATUS', this.getStatus());

    return { success: true, message: 'Bot berhasil dihentikan.' };
  }

  async restartBot(options = {}) {
    this.pushLog(`🔄 [Polaris Manager] Merestart bot...`);
    await this.stopBot();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return this.startBot(options);
  }

  async deleteSession() {
    this.pushLog(`🗑️ [Polaris Manager] Mereset sesi WhatsApp...`);
    await this.stopBot();
    // Tunggu proses benar-benar melepaskan file descriptor di Windows
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const authDir = path.resolve(__dirname, '..', config.paths.authInfo);
    try {
      if (fs.existsSync(authDir)) {
        let deleted = false;
        // Coba hapus dengan retry loop (mengantisipasi EBUSY / EPERM Windows)
        for (let i = 0; i < 10; i++) {
          try {
            fs.rmSync(authDir, { recursive: true, force: true });
            if (!fs.existsSync(authDir)) {
              deleted = true;
              break;
            }
          } catch (_) {
            await new Promise((r) => setTimeout(r, 250));
          }
        }

        // Fallback Windows CMD jika masih belum terhapus
        if (fs.existsSync(authDir)) {
          try {
            require('child_process').execSync(`cmd /c rd /s /q "${authDir}"`, { stdio: 'ignore' });
            if (!fs.existsSync(authDir)) deleted = true;
          } catch (_) {}
        }

        if (fs.existsSync(authDir)) {
          throw new Error('File sesi masih terkunci oleh proses lain di Windows. Coba hentikan bot terlebih dahulu.');
        }

        fs.mkdirSync(authDir, { recursive: true });
        this.pushLog(`✅ Folder sesi auth_info berhasil dihapus dan dibersihkan.`);
      }
      this.lastQrDataUrl = null;
      this.pairingCode = null;
      this.status = 'OFFLINE';
      this.broadcast('STATUS', this.getStatus());
      this.broadcast('CLUSTER_STATUS', { instanceId: 'primary', botStatus: 'OFFLINE', lastQrDataUrl: null, pairingCode: null });
      return { success: true, message: 'Sesi WhatsApp berhasil direset.' };
    } catch (err) {
      this.pushLog(`❌ Gagal menghapus sesi auth_info: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async resetSession() {
    return this.deleteSession();
  }

  async postStory(storyPayload) {
    if (!this.botProcess || this.status !== 'CONNECTED') {
      throw new Error('Bot WhatsApp belum tersambung (OFFLINE). Silakan nyalakan bot di tab Overview atau scan QR/Pairing terlebih dahulu!');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.storyPromiseResolve = null;
        reject(new Error('Timeout: Bot tidak merespons pengiriman story dalam 90 detik.'));
      }, 90000);

      this.storyPromiseResolve = (res) => {
        clearTimeout(timeout);
        if (res.success) resolve(res);
        else reject(new Error(res.error || 'Gagal mengirim story WhatsApp.'));
      };

      try {
        this.botProcess.send({ type: 'POST_STORY', payload: storyPayload });
      } catch (err) {
        clearTimeout(timeout);
        this.storyPromiseResolve = null;
        reject(err);
      }
    });
  }

  async deleteStory(storyId = null) {
    if (!this.botProcess || this.status !== 'CONNECTED') {
      throw new Error('Bot WhatsApp belum tersambung (OFFLINE).');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.deleteStoryPromiseResolve = null;
        reject(new Error('Timeout: Bot tidak merespons penghapusan story dalam 30 detik.'));
      }, 30000);

      this.deleteStoryPromiseResolve = (res) => {
        clearTimeout(timeout);
        if (res.success) resolve(res);
        else reject(new Error(res.error || 'Gagal menghapus story WhatsApp.'));
      };

      try {
        this.botProcess.send({ type: 'DELETE_STORY', payload: { storyId } });
      } catch (err) {
        clearTimeout(timeout);
        this.deleteStoryPromiseResolve = null;
        reject(err);
      }
    });
  }

  async syncGroupsLive() {
    const groupsManager = require('../lib/groupsManager');
    if (!this.botProcess || this.status !== 'CONNECTED') {
      return { success: true, count: Object.keys(groupsManager.getAllGroups()).length, groups: groupsManager.getAllGroups(), source: 'cache' };
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.groupsPromiseResolve = null;
        resolve({ success: true, count: Object.keys(groupsManager.getAllGroups()).length, groups: groupsManager.getAllGroups(), source: 'timeout_cache' });
      }, 7000);

      this.groupsPromiseResolve = (res) => {
        clearTimeout(timeout);
        resolve(res);
      };

      try {
        this.botProcess.send({ type: 'FETCH_GROUPS' });
      } catch (err) {
        clearTimeout(timeout);
        this.groupsPromiseResolve = null;
        resolve({ success: true, count: Object.keys(groupsManager.getAllGroups()).length, groups: groupsManager.getAllGroups(), source: 'error_cache' });
      }
    });
  }

  async editMessage(payload) {
    if (!this.botProcess || this.status !== 'CONNECTED') {
      throw new Error('Bot belum tersambung ke WhatsApp. Pastikan status bot ONLINE.');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.editMsgResolve = null;
        reject(new Error('Timeout: Bot tidak merespons pengeditan pesan dalam 20 detik.'));
      }, 20000);

      this.editMsgResolve = (res) => {
        clearTimeout(timeout);
        if (res.success) resolve(res);
        else reject(new Error(res.error || 'Gagal mengedit pesan WhatsApp.'));
      };

      try {
        this.botProcess.send({ type: 'EDIT_MESSAGE', payload });
      } catch (err) {
        clearTimeout(timeout);
        this.editMsgResolve = null;
        reject(err);
      }
    });
  }

  async relinkEcosystem() {
    if (!this.botProcess || this.status !== 'CONNECTED') {
      const botEcosystemGroups = require('../lib/botEcosystemGroups');
      const data = botEcosystemGroups.getSavedData();
      return {
        success: false,
        error: 'Bot belum tersambung ke WhatsApp. Pastikan status bot ONLINE untuk memindai WhatsApp secara langsung.',
        groups: data.groups || {},
        community: data.community || null,
      };
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.relinkPromiseResolve = null;
        resolve({ success: false, error: 'Timeout: Bot tidak merespons sinkronisasi ekosistem dalam 30 detik.' });
      }, 30000);

      this.relinkPromiseResolve = (res) => {
        clearTimeout(timeout);
        resolve(res);
      };

      try {
        this.botProcess.send({ type: 'RELINK_ECOSYSTEM' });
      } catch (err) {
        clearTimeout(timeout);
        this.relinkPromiseResolve = null;
        resolve({ success: false, error: err.message });
      }
    });
  }

  async checkOnWhatsApp(rawPhone) {
    if (!rawPhone) return { valid: false, error: 'Nomor WhatsApp tidak boleh kosong.' };
    let clean = String(rawPhone).replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    else if (clean.startsWith('8')) clean = '62' + clean;

    if (clean.length < 10 || clean.length > 16) {
      return { valid: false, error: 'Format nomor tidak valid. Panjang nomor WhatsApp harus antara 10-15 digit.' };
    }

    // Validasi awalan operator seluler Indonesia jika diawali 62
    if (clean.startsWith('62')) {
      const validPrefixes = [
        '811','812','813','821','822','823','851','852','853', // Telkomsel
        '814','815','816','855','856','857','858',             // Indosat
        '817','818','819','859','877','878',                   // XL
        '895','896','897','898','899',                         // Three
        '881','882','883','884','885','886','887','888','889', // Smartfren
        '831','832','833','838'                                // Axis
      ];
      const matchPrefix = validPrefixes.some((p) => clean.slice(2).startsWith(p));
      if (!matchPrefix) {
        return { valid: false, error: `Awalan operator untuk nomor +${clean} tidak dikenali sebagai nomor seluler yang valid.` };
      }
    }

    // Jika bot sedang tidak online atau proses belum berjalan, gunakan validasi format operator di atas
    if (!this.botProcess || this.status !== 'CONNECTED') {
      return {
        valid: true,
        phone: clean,
        note: 'Bot WhatsApp offline. Validasi format operator berhasil lolos.',
        exists: true,
      };
    }

    // Bot tersambung: tanyakan ke WhatsApp server secara langsung melalui Baileys sock.onWhatsApp
    return new Promise((resolve) => {
      const requestId = 'wa_chk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      if (!this.waCheckResolvers) this.waCheckResolvers = new Map();

      const timer = setTimeout(() => {
        if (this.waCheckResolvers.has(requestId)) {
          this.waCheckResolvers.delete(requestId);
          // Timeout: anggap format lolos agar tidak memblokir user jika jaringan WA lambat
          resolve({ valid: true, phone: clean, exists: true, note: 'Timeout cek status WhatsApp via Baileys; format valid.' });
        }
      }, 7000);

      this.waCheckResolvers.set(requestId, (res) => {
        clearTimeout(timer);
        if (res.exists) {
          resolve({ valid: true, phone: clean, exists: true, jid: res.jid });
        } else {
          resolve({ valid: false, phone: clean, exists: false, error: 'Nomor ini tidak terdaftar sebagai pengguna WhatsApp aktif.' });
        }
      });

      try {
        this.botProcess.send({
          type: 'CHECK_ON_WHATSAPP',
          requestId,
          phone: clean,
        });
      } catch (err) {
        clearTimeout(timer);
        this.waCheckResolvers.delete(requestId);
        resolve({ valid: true, phone: clean, exists: true, note: 'Gagal kirim IPC, format valid.' });
      }
    });
  }
}

const botManager = new BotManager();
module.exports = botManager;
