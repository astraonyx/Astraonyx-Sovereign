// lib/deniaPluginLoader.js
// Dynamic loader & adapter untuk 70 plugin Denia ke ekosistem bot Polaris
// Menggunakan prefix '/' dan terintegrasi penuh dengan Bot Output Routing & Output Cache

const fs = require('fs');
const path = require('path');
const { LRUCache } = require('lru-cache');
const { downloadMediaMessage, jidNormalizedUser } = require('@whiskeysockets/baileys');
const botOutputCache = require('./botOutputCache');
const config = require('../config');

// Inisialisasi DENIA globals
function initGlobals() {
  if (global.__deniaGlobalsInitialized) return;
  global.__deniaGlobalsInitialized = true;

  try {
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
    if (ffmpegInstaller && ffmpegInstaller.path) {
      const ffmpegDir = path.dirname(ffmpegInstaller.path);
      if (!process.env.PATH.includes(ffmpegDir)) {
        process.env.PATH = `${ffmpegDir};${process.env.PATH}`;
      }
      global.__ffmpegBin = ffmpegInstaller.path;
    }
  } catch (_) {}

  global.ownerName = 'Polaris Owner';
  global.ownerNumber = config.ownerNumber || '6281111';
  global.botName = config.botName || 'Polaris';
  global.footer = '✦ ' + (config.botName || 'Polaris');
  global.botNumber = config.ownerNumber || '6281111';
  global.defaultLimit = 99999;
  global.stickerPackName = '📦 Polaris Sticker';
  global.stickerPackPublisher = 'Polaris Bot';
  global.localTimezone = 'Asia/Jakarta';
  global.botThumbnail = './media/Image/thumbnail.jpg';
  global.temporaryFolder = 'tmp';
  global.pluginsFolder = 'plugins';
  global.requestTimeout = 90000;
  global.ffmpegTimeout = 60000;
  global.minDelay = 100;
  global.maxDelay = 3000;
  global.ignoreOldMessageTS = 30;
  global.rssLimit = 384 * 1024 * 1024;
  global.ffmpegConcurrency = 4;
  global.maxNSFWScore = 0.75;
  global.maxHistoryChatSize = 20;

  if (!global.ExploreSession) {
    global.ExploreSession = new LRUCache({
      max: 256,
      ttl: 90000,
      updateAgeOnGet: false,
      updateAgeOnHas: false,
      ttlAutopurge: true
    });
  }
}

initGlobals();

const pluginsMap = new Map(); // command/alias -> plugin object
const allPluginList = [];
let autoDownloadPlugin = null;
let reactionPlugin = null;
let deniaUtilities = null;

// Rekursif ambil semua file plugin
function getAllFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(full));
    } else if (file.endsWith('.js')) {
      results.push(full);
    }
  }
  return results;
}

// Inisialisasi dan load seluruh plugin
async function loadPlugins() {
  initGlobals();
  if (pluginsMap.size > 0) return { count: pluginsMap.size, plugins: allPluginList };

  // Load utilities
  try {
    const utilsPath = 'file:///' + path.resolve('plugins/denia/lib/Utilities.js').replace(/\\/g, '/');
    deniaUtilities = await import(utilsPath);
  } catch (uErr) {
    console.error('[DENIA LOADER] Gagal load Utilities.js:', uErr.message);
  }

  const pluginsDir = path.resolve('plugins/denia/plugins');
  const files = getAllFiles(pluginsDir).filter(f => !f.endsWith('menu.js'));

  let loaded = 0;
  for (const file of files) {
    try {
      const fileUrl = 'file:///' + file.replace(/\\/g, '/');
      const mod = await import(fileUrl);
      const plugin = mod.default || mod;

      if (!plugin) continue;

      const rel = path.relative(pluginsDir, file).replace(/\\/g, '/');
      plugin._file = rel;

      // Cek listener khusus
      if (rel.includes('_auto-download.js')) {
        autoDownloadPlugin = plugin;
      }
      if (rel.includes('reaction.js')) {
        reactionPlugin = plugin;
      }

      // Daftarkan command & aliases
      const cmds = Array.isArray(plugin.command) ? plugin.command : (plugin.command ? [plugin.command] : []);
      const aliases = Array.isArray(plugin.hidden) ? plugin.hidden : (plugin.hidden ? [plugin.hidden] : []);

      let pluginCat = plugin.category || 'tools';
      if (pluginCat.toLowerCase() === 'download' || pluginCat.toLowerCase() === 'downloader') {
        pluginCat = 'Downloader';
      }

      allPluginList.push({
        file: rel,
        category: pluginCat,
        commands: cmds,
        aliases: aliases,
        plugin
      });

      for (const cmd of cmds) {
        if (typeof cmd === 'string') {
          pluginsMap.set(cmd.toLowerCase(), plugin);
        }
      }
      for (const alias of aliases) {
        if (typeof alias === 'string') {
          pluginsMap.set(alias.toLowerCase(), plugin);
        }
      }

      loaded++;
    } catch (err) {
      console.error('[DENIA LOADER] Gagal memuat plugin ' + file + ':', err.message);
    }
  }

  console.log('[DENIA LOADER] Sukses memuat ' + loaded + ' plugin DENIA (Total ' + pluginsMap.size + ' pemicu command)!');

  try {
    const { registerDeniaCommands } = require('./commandRegistry');
    if (typeof registerDeniaCommands === 'function') {
      registerDeniaCommands(allPluginList);
    }
  } catch (_) {}

  return { count: pluginsMap.size, plugins: allPluginList };
}


// Cek apakah suatu command dikenali oleh plugin Denia
function hasCommand(command) {
  if (!command) return false;
  return pluginsMap.has(command.toLowerCase().trim());
}

// Dapatkan daftar semua command
function getCommandsList() {
  return Array.from(pluginsMap.keys());
}

// Bungkus objek pesan m dan socket agar selaras dengan output routing
function buildMessageContext(msg, sock, options = {}) {
  const chatJid = options.chatJid || msg.key.remoteJid;
  const effectiveTargetJid = options.effectiveTargetJid || chatJid;
  const isRedirected = effectiveTargetJid !== chatJid;
  let hasSentRoutingNotice = false;

  const senderJid = msg.key.participant || msg.key.remoteJidAlt || msg.key.remoteJid;
  const senderNumber = senderJid ? senderJid.replace(/@.*$/, '') : '';

  // Setup sendMedia pada sock jika belum ada
  if (deniaUtilities && typeof deniaUtilities.ExtendSocket === 'function') {
    deniaUtilities.ExtendSocket(sock);
  }

  // Wrapper reply dengan support output routing & cache
  const reply = async (text, extra = {}) => {
    let textStr = typeof text === 'string' ? text : String(text || '');
    textStr = textStr.replace(/@user\b/gi, '@' + senderNumber);
    const matches = textStr.match(/@([0-9]{9,16})/g) || [];
    const autoMentions = matches.map((m) => m.slice(1) + '@s.whatsapp.net');
    const combinedMentions = Array.from(new Set([...(extra.mentions || []), ...autoMentions]));

    const sent = await sock.sendMessage(
      effectiveTargetJid,
      {
        text: textStr,
        ...(combinedMentions.length > 0 ? { contextInfo: { mentionedJid: combinedMentions } } : {}),
        ...extra,
      },
      isRedirected ? {} : { quoted: msg }
    );

    if (sent?.key?.id) {
      botOutputCache.recordBotOutput({
        id: sent.key.id,
        chatJid: effectiveTargetJid,
        text: textStr,
        command: options.command || 'denia_plugin',
      });
    }

    if (isRedirected && !hasSentRoutingNotice && options.routingNotice) {
      hasSentRoutingNotice = true;
      try {
        await sock.sendMessage(chatJid, { text: options.routingNotice }, { quoted: msg });
      } catch (_) {}
    }

    return sent;
  };

  // Wrapper react
  const react = async (emoji = '🕒') => {
    try {
      await sock.sendMessage(chatJid, {
        react: {
          key: msg.key,
          text: emoji,
        },
      });
    } catch (_) {}
  };

  // Quoted message helper
  let quoted = null;
  const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
  if (contextInfo && contextInfo.quotedMessage) {
    const rawQuoted = contextInfo.quotedMessage;
    const quotedSender = contextInfo.participant || '';
    const quotedText =
      rawQuoted.conversation ||
      rawQuoted.extendedTextMessage?.text ||
      rawQuoted.imageMessage?.caption ||
      rawQuoted.videoMessage?.caption ||
      '';

    const fakeQuotedMsg = {
      key: {
        remoteJid: chatJid,
        id: contextInfo.stanzaId,
        participant: quotedSender,
      },
      message: rawQuoted,
    };

    quoted = {
      key: fakeQuotedMsg.key,
      message: rawQuoted,
      sender: quotedSender,
      text: quotedText,
      body: quotedText,
      msg: rawQuoted,
      download: async () => {
        return await downloadMediaMessage(fakeQuotedMsg, 'buffer', {});
      },
    };
  }

  // Direct message download helper
  const download = async () => {
    return await downloadMediaMessage(msg, 'buffer', {});
  };

  // Pastikan folder temp dan tmp ada
  try {
    if (!fs.existsSync('temp')) fs.mkdirSync('temp', { recursive: true });
    if (!fs.existsSync('tmp')) fs.mkdirSync('tmp', { recursive: true });
  } catch (_) {}

  const m = {
    key: msg.key,
    id: msg.key.id,
    message: msg.message,
    msg: msg,
    chat: effectiveTargetJid,
    originalChat: chatJid,
    sender: senderJid,
    pushName: msg.pushName || 'User',
    text: options.text || '',
    args: options.args || [],
    command: options.command || '',
    quoted,
    download,
    reply,
    react,
  };

  // Wrapped sock agar sendMedia otomatis ter-route ke targetJid
  const originalSendMedia = sock.sendMedia;
  const wrappedSock = Object.create(sock);

  wrappedSock.sendMedia = async (destJid, source, caption = '', quotedMsg = msg, content = {}, extraOpts = {}) => {
    const finalJid = effectiveTargetJid || destJid;
    let result = null;

    // Pastikan quoted adalah WAMessage valid yang punya key dan message
    let validQuoted = undefined;
    if (!isRedirected) {
      if (quotedMsg && quotedMsg.message) validQuoted = quotedMsg;
      else if (msg && msg.message) validQuoted = msg;
    }

    try {
      if (originalSendMedia) {
        result = await originalSendMedia(finalJid, source, caption, validQuoted, content, extraOpts);
      } else if (deniaUtilities && typeof deniaUtilities.ExtendSocket === 'function') {
        deniaUtilities.ExtendSocket(sock);
        result = await sock.sendMedia(finalJid, source, caption, validQuoted, content, extraOpts);
      }
    } catch (sendErr) {
      console.error('[DENIA sendMedia ERROR]', sendErr.message);
      await reply(`❌ Gagal mengirim media: ${sendErr.message}`);
      return null;
    }

    if (result?.key?.id) {
      botOutputCache.recordBotOutput({
        id: result.key.id,
        chatJid: finalJid,
        text: typeof caption === 'string' ? caption : '[Media Output]',
        command: options.command || 'denia_plugin',
      });
    }

    if (isRedirected && !hasSentRoutingNotice && options.routingNotice) {
      hasSentRoutingNotice = true;
      try {
        await sock.sendMessage(chatJid, { text: options.routingNotice }, { quoted: msg });
      } catch (_) {}
    }

    return result;
  };

  return { m, wrappedSock };
}

// Eksekusi plugin command Denia
async function executeCommand(command, args, text, msg, sock, options = {}) {
  const plugin = pluginsMap.get(command.toLowerCase().trim());
  if (!plugin || typeof plugin.run !== 'function') {
    return false;
  }

  const { m, wrappedSock } = buildMessageContext(msg, sock, {
    ...options,
    command,
    args,
    text,
  });

  try {
    await plugin.run(m, {
      sock: wrappedSock,
      isPrefix: '/', // Standardisasi prefix baru ke '/'
      command,
      args,
      text,
    });
    return true;
  } catch (error) {
    console.error('[DENIA EXEC ERROR] Command /' + command + ':', error);
    await m.reply('❌ Terjadi error saat mengeksekusi command: ' + error.message);
    return true;
  }
}

module.exports = {
  initGlobals,
  loadPlugins,
  hasCommand,
  getCommandsList,
  executeCommand,
  buildMessageContext,
};
