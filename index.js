const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, jidNormalizedUser, Browsers } = require('baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const astraonyx = require('./astraonyx');
const { success, warning, denied, info, error: errorBox } = require('./lib/messageStyle');
const { normalizeNumber, jidToNumber, isGroupJid, toJid, looksLikeVirtex } = require('./lib/helpers');
const { canProcess, isOwner, canUseAdminCommands, isWhitelisted, getLevel } = require('./lib/accessControl');
const { updateGroup, getGroup, isGroupAllowed } = require('./lib/groupSettings');
const { getChatSettings } = require('./lib/privateChatSettings');
const { handleAdminCommand } = require('./commands/admin');
const { handleGroupLockCommand } = require('./commands/group-lock');
const { handleWhitelistCommand } = require('./commands/whitelist');
const { handleEcosystemCommand } = require('./commands/ecosystem');
const { handleMenuCommand } = require('./commands/menu');
const { handleDeleteCommand } = require('./commands/delete');
const { handleModerationCommand } = require('./commands/moderation');
const { handleSecurityCommand } = require('./commands/security');
const { handleOpenCvc, handleChPost } = require('./commands/owner');
const opencocCmd = require('./commands/opencoc');
const { handleGroupUtilityCommand, clearAfk, getAfk, getAfkForAutoClear, formatDuration } = require('./commands/group-utility');
const { handleMemberCommand } = require('./commands/member');
const { handleMediaCommand } = require('./commands/media');
const { handleDownloaderCommand } = require('./commands/downloader');
const { handleTextToolsCommand } = require('./commands/text-tools');
const { handleReminderCommand } = require('./commands/reminder');
const { handlePdfToolkitCommand } = require('./commands/pdftoolkit');
const { handleTaskReminderCommand } = require('./commands/taskreminder');
const { startTaskReminderScheduler } = require('./lib/taskReminderScheduler');
const { handleAiCommand } = require('./commands/ai');
const { handleHermesCommand, handleHermesSkillCommand } = require('./commands/hermes');
const { handleViewWebbCommand } = require('./commands/viewwebb');
const { handleEditOutputCommand } = require('./commands/editoutput');
const { handleRankCommand } = require('./commands/rank');
const { handleFunCommand } = require('./commands/fun');
const { handleDuelCommand } = require('./commands/duel');
const { handleTimeCapsuleCommand } = require('./commands/timecapsule');
const { handleDeepTalkCommand } = require('./commands/deeptalk');
const { handleRaidCommand } = require('./commands/raid');
const { handleRpgCommand } = require('./commands/rpg');
const bossRaidEngine = require('./lib/bossRaidEngine');
const bossRaidScheduler = require('./lib/bossRaidScheduler');
const virtexShield = require('./lib/virtexShield');
const groupLevelEngine = require('./lib/groupLevelEngine');
const storyManager = require('./lib/storyManager');
const { handleUpSwCommand, handleDelSwCommand } = require('./commands/story');
const groupFunEngine = require('./lib/groupFunEngine');
const timeCapsuleEngine = require('./lib/timeCapsuleEngine');
const channelFollower = require('./lib/channelFollower');
const botEcosystemGroups = require('./lib/botEcosystemGroups');
const outputVaultAutoDownloader = require('./lib/outputVaultAutoDownloader');
const botOutputCache = require('./lib/botOutputCache');
const botStateManager = require('./lib/botStateManager');
const { optimizeVideoForWhatsApp, optimizeImageForWhatsApp } = require('./lib/mediaOptimizer');
const skillManager = require('./server/skillManager');
const deniaPluginLoader = require('./lib/deniaPluginLoader');
const { startReminderScheduler } = require('./lib/reminderScheduler');
const { startCleanupScheduler } = require('./lib/cleanupScheduler');
const { handleInfoCommand } = require('./commands/info');
const { handleCleartmp, handleTmpStatus } = require('./commands/cleanup');
const { recordMessage } = require('./lib/messageCache');
const { processMessage: processModeration } = require('./lib/moderationEngine');
const antidelete = require('./lib/antidelete');
const { handleGroupParticipantsUpdate } = require('./lib/welcomeHandler');
const { isBotAdmin, resolveParticipantNumber } = require('./lib/helpers');
const { getCommandOverrides, getCustomFeatures, renderTemplate } = require('./lib/commandOverridesHelper');
const contactsManager = require('./lib/contactsManager');
const groupsManager = require('./lib/groupsManager');
const autoResponderEngine = require('./lib/autoResponderEngine');
const ecosystemNewsScheduler = require('./lib/ecosystemNewsScheduler');
const sandboxAgent = require('./lib/sandboxAgent');
const academyAgent = require('./lib/academyAgent');
const ecosystemAcademyScheduler = require('./lib/ecosystemAcademyScheduler');
const { handleBelajarCommand } = require('./commands/belajar');
const { analyticsQueries } = require('./server/db');
const { getCachedGroupMetadata } = require('./lib/helpers');

process.on('uncaughtException', (err) => {
  if (err && (err.name === 'TimeoutError' || err.message?.includes('aborted') || err.message?.includes('timeout') || err.code === 'ABORT_ERR')) {
    console.warn('[BOT RESILIENCE] Caught timeout notice (non-fatal):', err.message);
    return;
  }
  console.error('[UNCAUGHT EXCEPTION]', err);
});
process.on('unhandledRejection', (reason) => {
  const msg = reason?.message || String(reason || '');
  if (msg.includes('aborted') || msg.includes('timeout') || reason?.name === 'TimeoutError') {
    console.warn('[BOT RESILIENCE] Unhandled rejection notice (non-fatal):', msg);
    return;
  }
  console.error('[UNHANDLED REJECTION]', reason);
});

const botStartTimestamp = Math.floor(Date.now() / 1000);

// Daftar command owner-only yang dialihkan ke handler masing-masing sebelum canProcess().
const WHITELIST_COMMANDS = ['adduser', 'deluser', 'setlevel', 'setowner', 'unsetowner', 'listuser'];
const ECOSYSTEM_COMMANDS = ['bindeco', 'listeco', 'synceco', 'inteco'];
const CLEANUP_COMMANDS = ['cleartmp', 'tmpstatus'];
const { registerPolarisEvents } = require('./astraonyx/polaris/events');
const { reactCommand, reactWith, isSpamming } = require('./astraonyx/polaris/router/commandDispatcher');

// Kirim ulang media yang sudah dihapus, sesuai tipe filenya. Caption dipasang
// di media itu sendiri (bukan pesan teks terpisah) supaya rapi jadi 1 pesan.
async function repostDeletedMedia(sock, chatJid, deleted, caption, mentions = []) {
  const buffer = fs.readFileSync(deleted.mediaPath);

  try {
    switch (deleted.mediaType) {
      case 'gambar':
        await sock.sendMessage(chatJid, { image: buffer, caption, mentions });
        return;
      case 'video':
        await sock.sendMessage(chatJid, { video: buffer, caption, mentions });
        return;
      case 'stiker':
        // Stiker tidak bisa dikasih caption, kirim caption terpisah dulu
        await sock.sendMessage(chatJid, { text: caption, mentions });
        await sock.sendMessage(chatJid, { sticker: buffer });
        return;
      case 'audio':
        await sock.sendMessage(chatJid, { text: caption, mentions });
        await sock.sendMessage(chatJid, { audio: buffer, mimetype: 'audio/ogg; codecs=opus' });
        return;
      case 'dokumen':
        await sock.sendMessage(chatJid, { document: buffer, caption, mentions, fileName: 'file' });
        return;
      default:
        await sock.sendMessage(chatJid, { text: caption, mentions });
    }
  } catch (err) {
    console.error('[antidelete] Gagal repost media, fallback ke teks:', err.message);
    await sock.sendMessage(chatJid, { text: caption, mentions });
  }
}

async function startBot() {
  if (global.__activeWASocket) {
    try {
      global.__activeWASocket.ev?.removeAllListeners?.();
      global.__activeWASocket.ws?.close?.();
      global.__activeWASocket.end?.();
    } catch (_) {}
    global.__activeWASocket = null;
  }

  if (!fs.existsSync(config.paths.authInfo)) {
    fs.mkdirSync(config.paths.authInfo, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(config.paths.authInfo);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
  });
  global.__activeWASocket = sock;

  // Interceptor Anti-Bocor: Jika bot sedang STOPPED (MODE SENYAP), tahan dan drop seluruh pesan keluar
  const originalSendMessage = sock.sendMessage.bind(sock);
  sock.sendMessage = async function (jid, content, options = {}) {
    if (botStateManager.isBotStopped() && !options?.__allowWhileStopped) {
      console.log(`[botStateManager] 🔴 Pesan keluar ke ${jid} dibatalkan karena bot dalam mode SENYAP (STOPPED).`);
      return null;
    }
    return originalSendMessage(jid, content, options);
  };

  sock.ev.on('creds.update', saveCreds);

  // Dukungan pairing code (dipicu dashboard lewat env var PAIRING_NUMBER,
  // format 628xxxxxxxxxx). Hanya diminta sekali per proses, dan hanya kalau
  // device ini belum pernah register (creds.registered masih false) --
  // kalau sudah register, permintaan pairing code baru akan ditolak Baileys.
  const pairingNumber = process.env.PAIRING_NUMBER;
  let pairingRequested = false;

  const isAlreadyAuthenticated = () => Boolean(
    sock.authState?.creds?.registered === true &&
    sock.authState?.creds?.me &&
    (sock.authState?.creds?.me?.id || sock.authState?.creds?.me?.jid)
  );

  const requestPairing = async () => {
    if (!pairingNumber || isAlreadyAuthenticated() || pairingRequested) return;
    pairingRequested = true;
    try {
      let cleanPairNum = pairingNumber.replace(/[^0-9]/g, '');
      if (cleanPairNum.startsWith('0')) {
        cleanPairNum = '62' + cleanPairNum.slice(1);
      } else if (cleanPairNum.startsWith('8')) {
        cleanPairNum = '62' + cleanPairNum;
      }
      console.log(`[${config.botName}] Meminta kode pairing ke WhatsApp untuk nomor: ${cleanPairNum}...`);
      const code = await sock.requestPairingCode(cleanPairNum);
      console.log(`[${config.botName}] PAIRING_CODE:${code}`);
    } catch (err) {
      console.error(`[${config.botName}] Gagal minta pairing code:`, err.message);
      pairingRequested = false; // izinkan retry jika belum berhasil
    }
  };

  // Pemicu 1: Timer inisialisasi socket setelah 3 detik
  if (pairingNumber && !isAlreadyAuthenticated()) {
    setTimeout(requestPairing, 3000);
  }

  // Registrasi Modular Event Baileys (Connection, Contacts, Groups, Participants)
  registerPolarisEvents(sock, {
    pairingNumber,
    requestPairing,
    isAlreadyAuthenticated,
    getPairingRequested: () => pairingRequested,
    reconnectCallback: startBot,
  });

  // Listener IPC dari Dashboard Web untuk fitur Post Story WhatsApp (SW)
  if (!global.__ipcStoryHandlerRegistered) {
    global.__ipcStoryHandlerRegistered = true;
    process.on('message', async (ipcMsg) => {
      if (ipcMsg?.type === 'POST_STORY') {
        try {
          const currentSock = global.__activeWASocket;
          if (!currentSock) {
            throw new Error('Bot belum tersambung ke WhatsApp. Tunggu status ONLINE.');
          }

          const {
            storyType,
            text,
            caption,
            mediaPath,
            bgColor,
            font,
            audienceType,
            customContacts,
            excludedContacts,
            mentionedNumbers,
            tagGroups,
          } = ipcMsg.payload || {};

          // 1. Tentukan Audience Privacy (statusJidList)
          let statusJidList = [];
          const allKnownJids = contactsManager.getAllContactJids();

          if (audienceType === 'exclude' && excludedContacts) {
            const raw = Array.isArray(excludedContacts) ? excludedContacts.join(',') : String(excludedContacts);
            const tokens = raw.split(/[,;\s\n]+/).map((t) => t.replace(/[^0-9]/g, '')).filter(Boolean);
            statusJidList = allKnownJids.filter((j) => !tokens.includes(j.split('@')[0]));
          } else if (audienceType === 'custom' && customContacts) {
            const raw = Array.isArray(customContacts) ? customContacts.join(',') : String(customContacts);
            const tokens = raw.split(/[,;\s\n]+/);
            const jids = new Set();
            tokens.forEach((t) => {
              const c = t.replace(/[^0-9]/g, '');
              if (c.length >= 9) jids.add(`${c}@s.whatsapp.net`);
            });
            statusJidList = Array.from(jids);
          } else if (audienceType === 'luna') {
            try {
              const wlPath = path.resolve(__dirname, 'database/whitelist.json');
              if (fs.existsSync(wlPath)) {
                const wl = JSON.parse(fs.readFileSync(wlPath, 'utf8'));
                const jids = new Set();
                (wl.owners || []).forEach((n) => {
                  const c = String(n).replace(/[^0-9]/g, '');
                  if (c.length >= 9) jids.add(`${c}@s.whatsapp.net`);
                });
                (wl.allowed || []).forEach((item) => {
                  const n = typeof item === 'string' ? item : item.number;
                  const c = String(n || '').replace(/[^0-9]/g, '');
                  if (c.length >= 9) jids.add(`${c}@s.whatsapp.net`);
                });
                statusJidList = Array.from(jids);
              }
            } catch (errWl) {
              console.error('[STORY] Gagal membaca whitelist untuk audience Luna:', errWl.message);
            }
          } else {
            // 'all' / Semua Kontak: Wajib isi statusJidList dengan seluruh kontak agar Baileys mengirim ke WhatsApp
            statusJidList = allKnownJids;
          }

          // Filter ketat: Keluarkan nomor bot sendiri dari statusJidList!
          // Pada protokol WhatsApp status broadcast, pengirim adalah bot itu sendiri (currentSock.user.id).
          // Jika nomor pengirim dimasukkan ke daftar penerima (statusJidList), HP pengirim menerima broadcast
          // status miliknya sendiri sebagai pesan masuk terenkripsi yang gagal didekripsi lokal,
          // sehingga muncul lingkaran MERAH ("merah-merah / gagal memuat video") pada "Status Saya"!
          const botJid = currentSock.user?.id ? jidNormalizedUser(currentSock.user.id) : '';
          const botNum = botJid ? botJid.replace(/[^0-9]/g, '') : '';

          statusJidList = (statusJidList || []).filter((jid) => {
            const clean = String(jid || '').replace(/[^0-9]/g, '');
            const isLid = clean.length > 14 || clean.startsWith('2777');
            return clean && clean.length >= 9 && !isLid && clean !== botNum;
          });

          // Masukkan nomor Human Owner (jika bukan nomor bot itu sendiri)
          if (config.ownerNumber) {
            const ownerClean = String(config.ownerNumber).replace(/[^0-9]/g, '');
            if (ownerClean.length >= 9 && ownerClean !== botNum && ownerClean.length <= 14) {
              const ownerJid = `${ownerClean}@s.whatsapp.net`;
              if (!statusJidList.includes(ownerJid)) {
                statusJidList.push(ownerJid);
              }
            }
          }

          // Safety check: Baileys WAJIB memiliki minimal 1 penerima di statusJidList
          if (!statusJidList || statusJidList.length === 0) {
            const fallbackContacts = allKnownJids.filter((j) => {
              const clean = String(j || '').replace(/[^0-9]/g, '');
              return clean.length >= 9 && clean.length <= 14 && clean !== botNum && !clean.startsWith('2777');
            });
            statusJidList = fallbackContacts.length > 0 ? fallbackContacts : (config.ownerNumber ? [`${config.ownerNumber.replace(/[^0-9]/g, '')}@s.whatsapp.net`] : []);
          }

          // 2. Tentukan Mentions (contextInfo.mentionedJid)
          let contextInfo = undefined;
          if (mentionedNumbers) {
            const raw = Array.isArray(mentionedNumbers) ? mentionedNumbers.join(',') : String(mentionedNumbers);
            const tokens = raw.split(/[,;\s\n]+/);
            const mentionedJids = [];
            tokens.forEach((t) => {
              const c = t.replace(/[^0-9]/g, '');
              if (c.length >= 9 && !mentionedJids.includes(`${c}@s.whatsapp.net`)) {
                mentionedJids.push(`${c}@s.whatsapp.net`);
              }
            });
            if (mentionedJids.length > 0) {
              contextInfo = { mentionedJid: mentionedJids };
            }
          }

          // 3. Kirim Status dengan statusJidList & broadcast: true
          // DILENGKAPI: Wajib kirim copy status ke nomor sendiri & owner agar bisa dilihat, disimpan, atau dihapus
          const selfJids = storyManager.getSelfAndOwnerJids(currentSock, config);
          const sentSelfKeys = [];
          let statusMsg = null;
          let previewText = '';

          if (storyType === 'text') {
            if (!text || !text.trim()) {
              throw new Error('Teks status WhatsApp tidak boleh kosong.');
            }
            let fontNum = Number(font) || 1;
            // Map index UI (1-5) ke nilai Enum resmi Baileys WAProto.FontType:
            // 1: SYSTEM_TEXT, 2: FB_SCRIPT, 7: MORNINGBREEZE_REGULAR, 8: CALISTOGA_REGULAR, 9: EXO2_EXTRABOLD
            const fontMap = { 1: 1, 2: 2, 3: 7, 4: 8, 5: 9, 7: 7, 8: 8, 9: 9 };
            const safeFont = fontMap[fontNum] || 1;
            const safeBgColor = bgColor || '#005c4b';
            previewText = text.trim();

            statusMsg = await currentSock.sendMessage('status@broadcast', {
              text: text.trim(),
              backgroundColor: safeBgColor,
              font: safeFont,
              ...(contextInfo ? { contextInfo } : {}),
            }, {
              backgroundColor: safeBgColor,
              font: safeFont,
              statusJidList,
              broadcast: true,
            });

            // WAJIB: Kirim copy status teks ke nomor sendiri & owner
            for (const targetJid of selfJids) {
              try {
                const selfRes = await currentSock.sendMessage(targetJid, {
                  text: `📢 *[STATUS WHATSAPP TERPASANG]*\n\n"${text.trim()}"\n\n───────────────────\n🎨 *Background:* \`${safeBgColor}\`\n⏱️ *Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n🆔 *Status ID:* \`${statusMsg?.key?.id || '-'}\`\n\n🗑️ *Hapus Status:* Balas (*reply*) pesan ini dengan \`/delsw\` (atau ketik \`/delsw\`) untuk menghapus status ini dari WhatsApp.`,
                });
                if (selfRes?.key) sentSelfKeys.push({ jid: targetJid, key: selfRes.key });
              } catch (eSend) {
                console.error(`[STORY] Gagal kirim copy teks ke nomor sendiri (${targetJid}):`, eSend.message);
              }
            }
          } else if (storyType === 'media') {
            let effectiveMediaPath = mediaPath;

            if (!effectiveMediaPath && ipcMsg.payload?.mediaBase64) {
              const uploadDir = path.resolve(__dirname, config.paths.tmpMedia || './tmp/media');
              if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
              const safeExt = (ipcMsg.payload.mediaExt || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase();
              effectiveMediaPath = path.join(uploadDir, `story_ipc_${Date.now()}.${safeExt}`);
              const base64Data = ipcMsg.payload.mediaBase64.replace(/^data:[^;]+;base64,/, '');
              fs.writeFileSync(effectiveMediaPath, Buffer.from(base64Data, 'base64'));
            }

            if (!effectiveMediaPath || !fs.existsSync(effectiveMediaPath)) {
              throw new Error('File media status tidak ditemukan untuk diunggah ke WhatsApp.');
            }

            const extLower = path.extname(effectiveMediaPath).toLowerCase();
            const isVideo = ['.mp4', '.mov', '.mkv', '.webm', '.avi', '.3gp', '.flv'].includes(extLower);
            previewText = caption || (isVideo ? 'Video Status' : 'Gambar Status');

            if (isVideo) {
              // Optimasi video standar WhatsApp Status (H.264, AAC, yuv420p, faststart, max 30s, thumbnail)
              console.log(`[STORY] 🎬 Mempersiapkan video status WhatsApp dari ${effectiveMediaPath}...`);
              const opt = await optimizeVideoForWhatsApp(effectiveMediaPath, { maxDuration: 30 });

              statusMsg = await currentSock.sendMessage('status@broadcast', {
                video: opt.videoBuffer,
                caption: caption || '',
                mimetype: 'video/mp4',
                jpegThumbnail: opt.jpegThumbnail || undefined,
                seconds: opt.seconds || 15,
                fileLength: opt.size,
                ptv: false,
                ...(contextInfo ? { contextInfo } : {}),
              }, {
                statusJidList,
                broadcast: true,
              });

              // WAJIB: Kirim copy video status ke nomor sendiri & owner
              for (const targetJid of selfJids) {
                try {
                  const selfCaption = caption
                    ? `${caption}\n\n📢 *[STATUS WHATSAPP TERPASANG]*\n🗑️ *Hapus Status:* Reply video ini dengan \`/delsw\` (atau ketik \`/delsw\`)`
                    : `📢 *[STATUS WHATSAPP TERPASANG]*\n🎬 Video Status WhatsApp telah berhasil dipasang.\n\n🗑️ *Hapus Status:* Reply video ini dengan \`/delsw\` (atau ketik \`/delsw\`)`;

                  const selfRes = await currentSock.sendMessage(targetJid, {
                    video: opt.videoBuffer,
                    caption: selfCaption,
                    mimetype: 'video/mp4',
                    jpegThumbnail: opt.jpegThumbnail || undefined,
                    seconds: opt.seconds || 15,
                  });
                  if (selfRes?.key) sentSelfKeys.push({ jid: targetJid, key: selfRes.key });
                } catch (eSend) {
                  console.error(`[STORY] Gagal kirim copy video ke nomor sendiri (${targetJid}):`, eSend.message);
                }
              }

              if (opt.outputPath && opt.outputPath !== effectiveMediaPath) {
                try { fs.unlinkSync(opt.outputPath); } catch (_) {}
              }
            } else {
              // Optimasi gambar status (sharp thumbnail jika ada)
              const optImg = await optimizeImageForWhatsApp(effectiveMediaPath).catch(() => ({
                imageBuffer: fs.readFileSync(effectiveMediaPath),
                jpegThumbnail: null,
              }));

              statusMsg = await currentSock.sendMessage('status@broadcast', {
                image: optImg.imageBuffer,
                caption: caption || '',
                mimetype: 'image/jpeg',
                jpegThumbnail: optImg.jpegThumbnail || undefined,
                ...(contextInfo ? { contextInfo } : {}),
              }, {
                statusJidList,
                broadcast: true,
              });

              // WAJIB: Kirim copy gambar status ke nomor sendiri & owner
              for (const targetJid of selfJids) {
                try {
                  const selfCaption = caption
                    ? `${caption}\n\n📢 *[STATUS WHATSAPP TERPASANG]*\n🗑️ *Hapus Status:* Reply foto ini dengan \`/delsw\` (atau ketik \`/delsw\`)`
                    : `📢 *[STATUS WHATSAPP TERPASANG]*\n📸 Foto Status WhatsApp telah berhasil dipasang.\n\n🗑️ *Hapus Status:* Reply foto ini dengan \`/delsw\` (atau ketik \`/delsw\`)`;

                  const selfRes = await currentSock.sendMessage(targetJid, {
                    image: optImg.imageBuffer,
                    caption: selfCaption,
                    mimetype: 'image/jpeg',
                    jpegThumbnail: optImg.jpegThumbnail || undefined,
                  });
                  if (selfRes?.key) sentSelfKeys.push({ jid: targetJid, key: selfRes.key });
                } catch (eSend) {
                  console.error(`[STORY] Gagal kirim copy gambar ke nomor sendiri (${targetJid}):`, eSend.message);
                }
              }
            }

            try { fs.unlinkSync(effectiveMediaPath); } catch (_) {}
          }

          // Catat ke storyManager riwayat status dan kunci pesan di nomor sendiri
          storyManager.recordStory({
            statusKey: statusMsg?.key,
            selfMessageKeys: sentSelfKeys,
            storyType,
            preview: previewText,
            audienceCount: statusJidList ? statusJidList.length : 'all',
            instanceId: process.env.INSTANCE_ID || 'primary',
          });

          // 4. Tag / Beritahu Grup Terpilih (jika ada)
          if (Array.isArray(tagGroups) && tagGroups.length > 0) {
            const previewNote = caption || text || '';
            const announcement = `✨ *POLARIS STORY UPDATE* ✨\n\n📢 Status WhatsApp baru telah diunggah!\n${previewNote ? `📝 *Preview:* "${previewNote}"\n\n` : ''}👀 Silakan cek status WhatsApp bot sekarang ya!`;

            for (const gJid of tagGroups) {
              try {
                if (typeof gJid === 'string' && gJid.endsWith('@g.us')) {
                  await currentSock.sendMessage(gJid, { text: announcement });
                }
              } catch (gErr) {
                console.error(`[STORY] Gagal kirim notif story ke grup ${gJid}:`, gErr.message);
              }
            }
          }

          if (process.send) {
            process.send({
              type: 'STORY_RESULT',
              success: true,
              statusId: statusMsg?.key?.id,
              audienceCount: statusJidList ? statusJidList.length : 'all',
              selfDelivered: sentSelfKeys.length,
              groupsNotified: Array.isArray(tagGroups) ? tagGroups.length : 0,
            });
          }
        } catch (err) {
          console.error('[STORY] Gagal kirim story WA:', err.message);
          if (process.send) {
            process.send({ type: 'STORY_RESULT', success: false, error: err.message });
          }
        }
      }

      if (ipcMsg?.type === 'DELETE_STORY') {
        try {
          const currentSock = global.__activeWASocket;
          if (!currentSock) {
            throw new Error('Bot belum tersambung ke WhatsApp. Tunggu status ONLINE.');
          }
          const { storyId } = ipcMsg.payload || {};
          const instId = process.env.INSTANCE_ID || 'primary';
          let targetStory = null;
          if (storyId) {
            targetStory = storyManager.findStoryByMessageId(storyId, instId);
          }
          if (!targetStory) {
            targetStory = storyManager.getLatestActiveStory(instId);
          }
          if (!targetStory) {
            throw new Error('Tidak ada status WhatsApp aktif yang tercatat untuk dihapus.');
          }

          const delResult = await storyManager.deleteStoryOnWhatsApp(currentSock, targetStory, instId);
          if (process.send) {
            process.send({
              type: 'DELETE_STORY_RESULT',
              success: true,
              data: delResult,
              statusId: targetStory.statusKey?.id,
            });
          }
        } catch (dErr) {
          console.error('[STORY] Gagal hapus story WA via IPC:', dErr.message);
          if (process.send) {
            process.send({ type: 'DELETE_STORY_RESULT', success: false, error: dErr.message });
          }
        }
      }

      if (ipcMsg?.type === 'FETCH_GROUPS') {
        try {
          const currentSock = global.__activeWASocket;
          if (!currentSock) {
            if (process.send) process.send({ type: 'FETCH_GROUPS_RESULT', success: false, error: 'Bot belum tersambung ke WhatsApp.' });
            return;
          }
          const groups = await currentSock.groupFetchAllParticipating();
          const count = groupsManager.syncGroupsFromBaileys(groups);
          if (process.send) {
            process.send({ type: 'FETCH_GROUPS_RESULT', success: true, count, groups: groupsManager.getAllGroups() });
          }
        } catch (fErr) {
          if (process.send) process.send({ type: 'FETCH_GROUPS_RESULT', success: false, error: fErr.message });
        }
      }

      if (ipcMsg?.type === 'EDIT_MESSAGE') {
        try {
          const currentSock = global.__activeWASocket;
          if (!currentSock) {
            if (process.send) process.send({ type: 'EDIT_MESSAGE_RESULT', success: false, error: 'Bot belum tersambung ke WhatsApp.' });
            return;
          }

          const { targetStanzaId, destination, text, chatJid } = ipcMsg.payload || {};
          if (!text || !text.trim()) {
            if (process.send) process.send({ type: 'EDIT_MESSAGE_RESULT', success: false, error: 'Teks pesan baru tidak boleh kosong.' });
            return;
          }

          const waFormatter = require('./lib/whatsappFormatter');
          const formattedText = waFormatter.formatForWhatsApp(text);
          const editoutputCmd = require('./commands/editoutput');

          // Opsi A: Kirim ke nomor teman atau grup tertentu
          if (destination) {
            const destJid = editoutputCmd.resolveDestinationJid(destination);
            if (!destJid) {
              if (process.send) process.send({ type: 'EDIT_MESSAGE_RESULT', success: false, error: `Tujuan "${destination}" tidak valid.` });
              return;
            }

            const sent = await currentSock.sendMessage(destJid, { text: formattedText });
            if (sent?.key?.id) {
              botOutputCache.recordBotOutput({
                id: sent.key.id,
                chatJid: destJid,
                text: formattedText,
                command: 'web_edit_forward',
              });
            }

            if (process.send) {
              process.send({
                type: 'EDIT_MESSAGE_RESULT',
                success: true,
                mode: 'forward',
                destination: destJid,
                messageId: sent?.key?.id,
              });
            }
            return;
          }

          // Opsi B: Edit langsung di tempat (In-Place Edit)
          let targetId = targetStanzaId;
          let targetChat = chatJid;

          if (!targetId) {
            const cached = botOutputCache.getCachedOutputs();
            if (targetChat) {
              const lastInChat = cached.find((c) => c.chatJid === targetChat);
              if (lastInChat) targetId = lastInChat.id;
            } else if (cached.length > 0) {
              targetId = cached[0].id;
              targetChat = cached[0].chatJid;
            }
          }

          if (!targetId || !targetChat) {
            if (process.send) {
              process.send({ type: 'EDIT_MESSAGE_RESULT', success: false, error: 'Target pesan bot yang ingin diedit tidak ditemukan.' });
            }
            return;
          }

          const editKey = {
            remoteJid: targetChat,
            fromMe: true,
            id: targetId,
          };

          try {
            await currentSock.sendMessage(targetChat, {
              text: formattedText,
              edit: editKey,
            });
            botOutputCache.updateCachedOutput(targetId, formattedText);

            if (process.send) {
              process.send({
                type: 'EDIT_MESSAGE_RESULT',
                success: true,
                mode: 'in_place',
                id: targetId,
                chatJid: targetChat,
              });
            }
          } catch (editErr) {
            console.warn('[IPC EDIT_MESSAGE] In-place edit lewat 15 menit atau gagal, fallback kirim pesan revisi:', editErr.message);
            const fallbackSent = await currentSock.sendMessage(targetChat, {
              text: `📝 *[REVISI PESAN DARI DASHBOARD]*\n──────────────────────────────\n${formattedText}`,
            });
            if (process.send) {
              process.send({
                type: 'EDIT_MESSAGE_RESULT',
                success: true,
                mode: 'fallback_sent',
                note: 'Batas edit 15 menit WhatsApp telah lewat. Pesan revisi dikirim sebagai pesan baru.',
                id: fallbackSent?.key?.id,
                chatJid: targetChat,
              });
            }
          }
        } catch (err) {
          console.error('[IPC EDIT_MESSAGE] Error:', err.message);
          if (process.send) {
            process.send({ type: 'EDIT_MESSAGE_RESULT', success: false, error: err.message });
          }
        }
      }

      if (ipcMsg?.type === 'RELINK_ECOSYSTEM') {
        try {
          const currentSock = global.__activeWASocket;
          if (!currentSock) {
            if (process.send) process.send({ type: 'RELINK_ECOSYSTEM_RESULT', success: false, error: 'Bot belum tersambung ke WhatsApp. Pastikan status bot ONLINE.' });
            return;
          }
          const ecoRes = await botEcosystemGroups.relinkEcosystem(currentSock);
          if (process.send) {
            process.send({ type: 'RELINK_ECOSYSTEM_RESULT', ...ecoRes });
          }
        } catch (rErr) {
          if (process.send) process.send({ type: 'RELINK_ECOSYSTEM_RESULT', success: false, error: rErr.message });
        }
      }

      if (ipcMsg?.type === 'CHECK_ON_WHATSAPP') {
        const reqId = ipcMsg.requestId;
        const phone = ipcMsg.phone;
        try {
          const currentSock = global.__activeWASocket;
          if (!currentSock) {
            if (process.send) {
              process.send({
                type: 'CHECK_ON_WHATSAPP_RESULT',
                requestId: reqId,
                botOnline: false,
                exists: true,
                jid: `${phone}@s.whatsapp.net`,
              });
            }
            return;
          }

          const jid = `${phone}@s.whatsapp.net`;
          const results = await currentSock.onWhatsApp(jid);
          const found = Array.isArray(results) && results.find((r) => r && r.exists);
          if (process.send) {
            process.send({
              type: 'CHECK_ON_WHATSAPP_RESULT',
              requestId: reqId,
              botOnline: true,
              exists: !!found,
              jid: found?.jid || jid,
            });
          }
        } catch (err) {
          if (process.send) {
            process.send({
              type: 'CHECK_ON_WHATSAPP_RESULT',
              requestId: reqId,
              botOnline: false,
              exists: false,
              error: err.message,
            });
          }
        }
      }
    });
  }

  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0];
      if (!msg.message) return;

      const msgTimestamp = Number(msg.messageTimestamp) || 0;
      if (msgTimestamp < botStartTimestamp) return;

      const chatJid = msg.key.remoteJid;
      const isGroup = isGroupJid(chatJid);

      // 🛡️ PASSIVE AUTO-ON VIRTEX & CRASH SHIELD (MR-X292/virtex defense)
      // Berjalan pasif otomatis di SEMUA pesan masuk (grup & PM) tanpa toggle manual.
      // Jika terdeteksi virtex/crash, pesan dimusnahkan seketika dan di-drop!
      const isVirtexNeutralized = await virtexShield.interceptAndNeutralize({
        sock,
        msg,
        chatJid,
        senderNumber: msg.key.participant || msg.key.remoteJidAlt || msg.key.remoteJid,
        isGroup,
        isBotAdminFn: () => isBotAdmin(sock, chatJid),
      });
      if (isVirtexNeutralized) {
        if (process.send) {
          process.send({
            type: 'VIRTEX_ATTACK_BLOCKED',
            data: {
              chatJid,
              attacker: msg.key.participant || msg.key.remoteJidAlt || msg.key.remoteJid,
              timestamp: new Date().toISOString(),
            },
          });
        }
        return;
      }

      // Cache SEMUA pesan masuk (bukan cuma command) supaya .delchat <n> @user
      // bisa nemuin pesan biasa juga, bukan cuma pesan command.
      recordMessage(chatJid, msg);

      // Polaris Ghost Protocol: Deteksi Anti-Revoke (Pesan Dihapus) & Anti-ViewOnce (1x Lihat)
      try {
        const antiRevokeEngine = require('./lib/antiRevokeEngine');
        antiRevokeEngine.processIncomingGhostMessage(sock, msg).catch(() => {});
      } catch (_) {}

      // Catat pengirim ke database kontak untuk status privacy & mention
      const senderJid = msg.key.participant || msg.key.remoteJidAlt || msg.key.remoteJid;
      if (senderJid && senderJid.endsWith('@s.whatsapp.net')) {
        contactsManager.recordContact(senderJid, msg.pushName);
      }

      // Catat & perbarui nama grup secara realtime saat ada pesan grup masuk
      if (isGroup && typeof getCachedGroupMetadata === 'function') {
        try {
          getCachedGroupMetadata(sock, chatJid).then((meta) => {
            if (meta?.subject) {
              groupsManager.recordGroup(chatJid, meta.subject, meta);
            }
          }).catch(() => {});
        } catch (_) {}
      }

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        '';

      let senderNumber;
      if (isGroup && msg.key.fromMe) {
        senderNumber = normalizeNumber(jidToNumber(sock.user.id));
      } else if (isGroup) {
        // PENTING: participantAlt TIDAK reliable untuk pesan orang lain di grup
        // (kadang selalu berisi nomor owner/bot, bukan nomor pengirim asli).
        // Resolve lewat groupMetadata (cocokkan LID -> phoneNumber) supaya akurat.
        senderNumber = await resolveParticipantNumber(sock, chatJid, msg.key.participant);
      } else if (msg.key.fromMe) {
        senderNumber = normalizeNumber(jidToNumber(sock.user.id));
      } else {
        senderNumber = normalizeNumber(jidToNumber(msg.key.remoteJidAlt || msg.key.remoteJid));
      }

      // 🛑 EMERGENCY SILENCE ENGINE: /bot stop & /bot start
      // Jika bot sedang dalam status STOPPED (MODE SENYAP):
      // - Bot TIDAK BOLEH membalas apapun (tidak boleh chat, error pun gak bisa, ekosistem ikut berhenti).
      // - Bot HANYA merespon satu perintah: /bot start oleh Owner!
      if (botStateManager.isBotStopped()) {
        const trimmed = (text || '').trim();
        const detectedPrefix = [config.prefix, '/', '.', '!', '#'].find((p) => p && trimmed.startsWith(p));
        if (detectedPrefix) {
          const parts = trimmed.slice(detectedPrefix.length).trim().split(/\s+/);
          const cmd = (parts[0] || '').toLowerCase();
          const sub = (parts[1] || '').toLowerCase();
          if (cmd === 'bot' && (sub === 'start' || sub === 'hidup' || sub === 'on' || sub === 'resume')) {
            if (isOwner(senderNumber)) {
              botStateManager.startBot(senderNumber);
              await sock.sendMessage(chatJid, {
                text: `🟢 *[SYSTEM BOT DIAKTIFKAN KEMBALI]*\n──────────────────────────────\nBot telah di-*START* kembali oleh Owner (@${senderNumber}).\n\n✅ *Status Operasional: NORMAL*\n• Bot kembali merespon pesan & perintah.\n• Seluruh grup ekosistem, AI agent, scheduler, dan fitur kembali aktif.`,
                mentions: [`${senderNumber}@s.whatsapp.net`],
              }, { quoted: msg, __allowWhileStopped: true });
              return;
            }
          }
        }
        // Jika bot sedang STOPPED dan bukan /bot start oleh Owner, DIAM TOTAL (Silent Drop, No Reply, No Error)
        return;
      }

      // Khusus command opencoc: awalan '|' di awal chat WAJIB memicu opencoc
      // (bahkan jika isi chat '|blabla bla bla', asalkan ada tanda '|' di awal chat, tetap memicu opencoc)
      if (text.startsWith('|')) {
        if (isSpamming(senderNumber)) return;
        if (!isOwner(senderNumber)) return;
        setImmediate(async () => {
          try {
            await opencocCmd.execute(sock, msg, text);
          } catch (error) {
            console.error('[EXECUTION ERROR] opencoc (|):', error.message);
          }
        });
        return;
      }

      // 1. Catat metrik analitik pesan masuk ke database SQLite
      try {
        analyticsQueries.incrementMetric('message_count');
        if (isGroup) {
          const gName = groupsManager.getGroupName ? groupsManager.getGroupName(chatJid) : chatJid;
          analyticsQueries.recordGroupActivity(chatJid, gName || chatJid);
        }
      } catch (_) {}

      // 2. Tangani percakapan interaktif di grup "Polaris • AI Agent Sandbox"
      if (isGroup && sandboxAgent && typeof sandboxAgent.handleSandboxChat === 'function') {
        const handledBySandbox = await sandboxAgent.handleSandboxChat(sock, msg, text);
        if (handledBySandbox) return;
      }

      // 2.b Tangani Auto-Detect Link & Auto-Download KHUSUS di grup "Polaris • Output & Artifact Vault"
      if (isGroup && outputVaultAutoDownloader && typeof outputVaultAutoDownloader.handleAutoDownload === 'function') {
        let groupSubject = '';
        try {
          groupSubject = groupsManager.getGroupName(chatJid) || getGroup(chatJid)?.name || '';
        } catch (_) {}
        const handledByAutoDownloader = await outputVaultAutoDownloader.handleAutoDownload({
          sock,
          msg,
          text,
          senderNumber,
          isGroup,
          chatJid,
          groupSubject,
        });
        if (handledByAutoDownloader) return;
      }

      // 2.c Tangani percakapan belajar interaktif di grup "Polaris • Belajar & Polymath Genius" (Tanpa Command)
      if (isGroup && academyAgent && typeof academyAgent.handleAcademyChat === 'function') {
        const handledByAcademy = await academyAgent.handleAcademyChat(sock, msg, text);
        if (handledByAcademy) return;
      }

      // 3. Tangani Auto-Responder Rule Engine (Pencocokan Kata Kunci / Regex)
      if (autoResponderEngine && typeof autoResponderEngine.checkAndReply === 'function') {
        const handledByAutoResponder = await autoResponderEngine.checkAndReply(sock, msg);
        if (handledByAutoResponder) return;
      }

      // Deteksi apakah pesan adalah perintah (command) ber-prefix (misal '.', '/', '!', '#', atau config.prefix)
      const trimmedText = text.trim();
      const detectedPrefix = [config.prefix, '/', '.', '!', '#'].find((p) => p && trimmedText.startsWith(p));
      const isCommand = Boolean(detectedPrefix);

      // 4. Tangani Perolehan XP & Leveling Grup (Polaris Group Rank Engine)
      if (isGroup && !msg.key.fromMe && !isCommand) {
        groupLevelEngine.processMessage(sock, msg, senderNumber).catch(() => {});
      }

      // 5. Tangani Jawaban Kuis Tebak-Tebakan / Cak Lontong Aktif
      if (isGroup && !msg.key.fromMe && !isCommand) {
        const answered = await groupFunEngine.checkAnswer(sock, msg, senderNumber);
        if (answered) return;
      }

      // 6. Tangani Serangan Co-Op Boss Raid (Jawaban Teka-Teki / Sandi Visual Tanpa Prefix)
      if (isGroup && !msg.key.fromMe && !isCommand) {
        const raidHit = await bossRaidEngine.handleMessageAnswer(sock, msg, senderNumber);
        if (raidHit) return;
      }

      if (!isCommand) return;

      const command = trimmedText.slice(detectedPrefix.length).trim().split(/\s+/)[0].toLowerCase();
      const args = trimmedText.slice(detectedPrefix.length).trim().split(/\s+/).slice(1);
      if (!command) return;

      // Cek override dari Web Dashboard (apakah command dinonaktifkan, custom response, outputRouting, atau izin akses)
      const commandOverrides = getCommandOverrides();
      const customFeatures = getCustomFeatures();

      // Cek izin akses spesifik command (per-command permission)
      const cmdPermission = commandOverrides[command]?.permission || customFeatures[command]?.permission || null;

      // Kategori Command Have Fun & Gamifikasi Grup
      // HANYA bisa digunakan oleh publik/anggota umum jika:
      // 1. Grup diizinkan (isGroupAllowed)
      // 2. Fitur rank di grup tersebut sudah DI-ON-KAN (/playrank on)
      const GROUP_PUBLIC_FUN_COMMANDS = new Set([
        'rank', 'level', 'xp', 'topchat', 'toprank', 'leaderboard',
        'tebakkata', 'caklontong', 'tebaktebakan', 'nyerah',
        'truth', 'dare',
        'spin', 'roll',
        'duel', 'terima', 'tolak', 'suit',
        'timecapsule', 'kapsulwaktu', 'listcapsule', 'delcapsule',
        'deeptalk', 'kartudeep', 'deepcard',
        'raid', 'boss', 'attack',
      ]);

      const groupAllowed = isGroup && isGroupAllowed(chatJid);
      const isPlayRankOn = groupAllowed && groupLevelEngine.isPlayRankEnabled(chatJid);
      const isPublicCommand =
        command === 'redeem' ||
        command === 'claimtoken' ||
        cmdPermission === 'public' ||
        cmdPermission === 'everyone' ||
        (isPlayRankOn && GROUP_PUBLIC_FUN_COMMANDS.has(command));

      // Admin grup yang diizinkan boleh memanggil /playrank on/off/status/reset
      const isAllowedPlayrank = groupAllowed && command === 'playrank';

      // USER RULE: Hanya nomor di whitelist yang boleh menggunakan command.
      // Kecuali jika command diset "Semua Orang" (publik), izinkan siapapun.
      // Jika nomor pengirim BUKAN dari whitelist dan command bukan publik, abaikan tanpa respon (silent drop).
      if (!isPublicCommand && !isAllowedPlayrank && !isWhitelisted(senderNumber)) return;

      if (cmdPermission && !isPublicCommand) {
        const senderLvl = getLevel(senderNumber); // 'owner' | 'level1' | 'level2'
        if (cmdPermission === 'owner' && senderLvl !== 'owner') {
          return;
        }
        if (cmdPermission === 'level1' && senderLvl !== 'owner' && senderLvl !== 'level1') {
          return;
        }
        if (typeof cmdPermission === 'object' && cmdPermission.type === 'custom') {
          const allowedNums = (cmdPermission.numbers || []).map((n) => String(n).replace(/[^0-9]/g, ''));
          if (!allowedNums.includes(senderNumber) && senderLvl !== 'owner') {
            return;
          }
        } else if (typeof cmdPermission === 'string' && cmdPermission.includes(',')) {
          const allowedNums = cmdPermission.split(',').map((n) => n.replace(/[^0-9]/g, '')).filter(Boolean);
          if (!allowedNums.includes(senderNumber) && senderLvl !== 'owner') {
            return;
          }
        }
      }

      const activeRouting = commandOverrides[command]?.outputRouting || customFeatures[command]?.outputRouting || { mode: 'inplace' };

      let effectiveTargetJid = chatJid;
      let routingNotice = null;

      if (activeRouting && activeRouting.mode && activeRouting.mode !== 'inplace') {
        if (activeRouting.mode === 'self') {
          const selfNum = contactsManager.normalizePhoneNumber(config.ownerNumber) || (sock.user?.id ? jidNormalizedUser(sock.user.id).split('@')[0] : null);
          if (selfNum) {
            effectiveTargetJid = `${selfNum}@s.whatsapp.net`;
            routingNotice = `_Output command /${command} telah dikirimkan ke nomor sendiri (Owner)._`;
          }
        } else if (activeRouting.mode === 'friend' && activeRouting.destination) {
          const friendNum = contactsManager.normalizePhoneNumber(activeRouting.destination);
          if (friendNum) {
            effectiveTargetJid = `${friendNum}@s.whatsapp.net`;
            routingNotice = `_Output command /${command} telah dikirimkan ke nomor teman (${friendNum})._`;
          }
        } else if (activeRouting.mode === 'group') {
          const dest = String(activeRouting.destination || 'vault').toLowerCase().trim();
          const ecoData = botEcosystemGroups.getSavedData();
          if (dest === 'vault' || !dest) {
            const vaultGroup = ecoData.groups?.vault;
            if (vaultGroup && vaultGroup.jid) {
              effectiveTargetJid = vaultGroup.jid;
              routingNotice = `_Output command /${command} telah dialihkan ke grup Polaris • Output & Artifact Vault._`;
            }
          } else if (ecoData.groups && ecoData.groups[dest] && ecoData.groups[dest].jid) {
            effectiveTargetJid = ecoData.groups[dest].jid;
            routingNotice = `_Output command /${command} telah dialihkan ke grup ${ecoData.groups[dest].subject}._`;
          } else if (activeRouting.destination && activeRouting.destination.includes('@g.us')) {
            effectiveTargetJid = activeRouting.destination.trim();
            routingNotice = `_Output command /${command} telah dialihkan ke grup tujuan (GC)._`;
          } else {
            const vaultGroup = ecoData.groups?.vault;
            if (vaultGroup && vaultGroup.jid) {
              effectiveTargetJid = vaultGroup.jid;
              routingNotice = `_Output command /${command} telah dialihkan ke grup Polaris • Output & Artifact Vault._`;
            }
          }
        }
      }

      const isRedirected = effectiveTargetJid !== chatJid;
      let hasSentRoutingNotice = false;

      // Helper reply dengan auto-tagging (@number -> mentionedJid) & per-command output routing
      const reply = async (replyText, opts = {}) => {
        let textStr = typeof replyText === 'string' ? replyText : String(replyText || '');
        textStr = textStr.replace(/@user\b/gi, `@${senderNumber}`);
        const matches = textStr.match(/@([0-9]{9,16})/g) || [];
        const autoMentions = matches.map((m) => `${m.slice(1)}@s.whatsapp.net`);
        const combinedMentions = Array.from(new Set([...(opts.mentions || []), ...autoMentions]));

        const destChat = effectiveTargetJid || chatJid;
        const sent = await sock.sendMessage(
          destChat,
          {
            text: textStr,
            ...(combinedMentions.length > 0 ? { contextInfo: { mentionedJid: combinedMentions } } : {}),
            ...opts,
          },
          isRedirected ? {} : { quoted: msg }
        );
        if (sent?.key?.id) {
          botOutputCache.recordBotOutput({
            id: sent.key.id,
            chatJid: destChat,
            text: textStr,
            command,
          });
        }

        // Jika output dialihkan ke chat tujuan lain, beri notifikasi singkat ke pengirim di chat asal
        if (isRedirected && !hasSentRoutingNotice && routingNotice) {
          hasSentRoutingNotice = true;
          try {
            await sock.sendMessage(chatJid, { text: routingNotice }, { quoted: msg });
          } catch (_) {}
        }

        return sent;
      };

      // Command owner-only untuk approve/cabut izin grup, dicek SEBELUM canProcess()
      if (command === 'allowgroup' || command === 'disallowgroup') {
        if (!isOwner(senderNumber)) return;
        if (!isGroup) {
          await reply(warning('Khusus Grup', 'Command ini cuma bisa dipakai di dalam grup.'));
          return;
        }
        if (command === 'allowgroup') {
          updateGroup(chatJid, (g) => { g.allowed = true; });
          await reply(success('Grup Diizinkan', 'Grup ini sekarang diizinkan pakai bot.'));
        } else {
          updateGroup(chatJid, (g) => { g.allowed = false; });
          await reply(warning('Grup Dicabut', 'Grup ini sekarang tidak diizinkan pakai bot.'));
        }
        await reactCommand(sock, chatJid, msg, command);
        return;
      }

      // Command whitelist owner-only, dicek SEBELUM canProcess() (sama alasannya dengan allowgroup)
      if (WHITELIST_COMMANDS.includes(command)) {
        if (!isOwner(senderNumber)) return;
        await handleWhitelistCommand({ sock, chatJid, msg, senderNumber, command, args, reply });
        if (command !== 'listuser') await reactCommand(sock, chatJid, msg, command);
        return;
      }

      // Command ekosistem grup owner-only (/bindeco, /listeco, /synceco)
      if (ECOSYSTEM_COMMANDS.includes(command)) {
        if (!isOwner(senderNumber)) return;
        await handleEcosystemCommand({ sock, chatJid, msg, senderNumber, command, args, reply });
        if (command !== 'listeco') await reactCommand(sock, chatJid, msg, command);
        return;
      }

      // Command Kontrol Operasional Bot (/bot stop, /bot start, /bot status)
      if (command === 'bot') {
        if (!isOwner(senderNumber)) {
          await reply(denied('Akses Ditolak', 'Perintah kontrol status bot hanya dapat dijalankan oleh Owner / Cosmos.'));
          return;
        }

        const sub = (args[0] || '').toLowerCase();
        if (sub === 'stop' || sub === 'mati' || sub === 'off' || sub === 'pause') {
          await reply(
            `🔴 *[SYSTEM BOT DIHENTIKAN — MODE SENYAP]*\n──────────────────────────────\nBot berhasil dihentikan oleh Owner (@${senderNumber}).\n\n⚠️ *Kondisi Bot Saat Ini:*\n• Bot berada dalam mode senyap (*PAUSED*).\n• Bot TIDAK akan merespon perintah atau mengirim pesan apa pun di grup maupun chat pribadi.\n• Pesan error pun tidak akan dikirimkan.\n• Seluruh grup ekosistem, auto-responder, AI, game, dan scheduler otomatis berhenti.\n\n👉 *Untuk mengaktifkan kembali, ketik:*\n*/bot start*`,
            { mentions: [`${senderNumber}@s.whatsapp.net`], __allowWhileStopped: true }
          );
          botStateManager.stopBot(senderNumber, 'Manual owner /bot stop');
          await reactCommand(sock, chatJid, msg, command);
          return;
        } else if (sub === 'start' || sub === 'hidup' || sub === 'on' || sub === 'resume') {
          botStateManager.startBot(senderNumber);
          await reply(`🟢 *[SYSTEM BOT SUDAH AKTIF]*\nBot sudah dalam status aktif dan seluruh ekosistem beroperasi normal.`);
          await reactCommand(sock, chatJid, msg, command);
          return;
        } else if (sub === 'status') {
          const state = botStateManager.getBotState();
          await reply(`ℹ️ *[STATUS OPERASIONAL BOT]*\n• Status: ${state.isStopped ? '🔴 SENYAP (STOPPED)' : '🟢 AKTIF (RUNNING)'}\n• Terakhir diubah: ${state.stoppedAt || 'Normal'}\n• Oleh: ${state.stoppedBy || '-'}`);
          return;
        } else {
          await reply(`⚙️ *[PANDUAN KONTROL STATUS BOT]*\n\n• */bot stop* — Hentikan seluruh aktivitas bot (mode senyap total, ekosistem berhenti)\n• */bot start* — Aktifkan kembali bot dan seluruh ekosistem\n• */bot status* — Cek status operasional bot`);
          return;
        }
      }

      // Command cleartmp/tmpstatus owner-only, dicek SEBELUM canProcess()
      if (CLEANUP_COMMANDS.includes(command)) {
        if (!isOwner(senderNumber)) return;
        if (command === 'cleartmp') {
          await handleCleartmp({ args, reply });
        } else {
          await handleTmpStatus({ reply });
        }
        await reactCommand(sock, chatJid, msg, command);
        return;
      }

      // Command createtoken / buattoon (Khusus Owner / Cosmos untuk cetak token naik tingkat)
      if (command === 'createtoken' || command === 'buattoon' || command === 'gentoken') {
        if (!isOwner(senderNumber)) {
          await reply(denied('Akses Ditolak', 'Hanya Owner (Cosmos) yang dapat membuat token naik tingkat.'));
          return;
        }
        const targetRole = args[0];
        const maxUses = parseInt(args[1], 10) || 1;
        const notes = args.slice(2).join(' ') || 'Dibuat via WhatsApp';

        if (!targetRole) {
          await reply(info('Panduan Pembuatan Token Polaris', `Format: *${config.prefix || '/'}createtoken <tier> [maxUses] [catatan]*\n\nPilihan 10 Tingkatan Polaris:\n• cosmos (Level 10 - Owner)\n• overlord (Level 9)\n• supernova (Level 8)\n• starlight (Level 7)\n• nebula_master (Level 6)\n• star_sentinel (Level 5)\n• pulsar (Level 4)\n• astral_voyager (Level 3)\n• cosmic_scout (Level 2)\n• member (Level 1)\n\nContoh:\n*${config.prefix || '/'}createtoken starlight 1 Hadiah Event Komunitas*`));
          return;
        }

        try {
          const upgradeTokenService = require('./server/upgradeTokenService');
          const { readUsers } = require('./server/auth');
          const users = readUsers();
          const ownerUser = users.find(u => (u.phoneNumber && u.phoneNumber.replace(/\D/g, '') === senderNumber) || u.role === 'cosmos');
          const actorId = ownerUser ? ownerUser.id : 'owner_system';

          const tok = upgradeTokenService.createToken(actorId, {
            targetRole,
            maxUses,
            notes,
          });

          await reply(success('Token Naik Tingkat Berhasil Diterbitkan!', `🎟️ *KODE TOKEN:* \`${tok.tokenCode}\`\n\n🎯 *Target Tier:* ${tok.targetRoleInfo.name} (${tok.targetRoleInfo.badge})\n🔢 *Maks Pemakaian:* ${tok.maxUses}x\n📝 *Catatan:* ${tok.notes}\n\n💡 *Cara Pakai:* Kirim \`/redeem ${tok.tokenCode}\` di WhatsApp atau klaim melalui Web Dashboard Polaris.`));
        } catch (err) {
          await reply(errorBox('Gagal Membuat Token', err.message));
        }
        await reactCommand(sock, chatJid, msg, command);
        return;
      }

      // Semua command lain tetap lewat canProcess() (whitelist + grup approved)
      // Kecuali jika command bersifat publik/have-fun di grup yang playrank-nya ON, atau admin mengatur /playrank
      const allowed = (isPublicCommand || isAllowedPlayrank) ? true : canProcess({ senderNumber, chatJid });
      if (!allowed) return;

      // Cek override dari Web Dashboard (apakah command dinonaktifkan atau ada custom output)
      if (commandOverrides[command]) {
        if (commandOverrides[command].enabled === false) {
          await reply(warning('Fitur Dinonaktifkan', 'Fitur command ini sedang dinonaktifkan oleh administrator.'));
          return;
        }
        if (commandOverrides[command].customResponse) {
          const pushName = msg.pushName || senderNumber;
          const templateRaw = commandOverrides[command].customResponse.replace(/@user\b/gi, `@${senderNumber}`);
          const customReply = renderTemplate(templateRaw, {
            '{sender}': `@${senderNumber}`,
            '{user}': `@${senderNumber}`,
            '{senderNumber}': senderNumber,
            '{senderName}': pushName,
            '{userName}': pushName,
            '{botName}': config.botName,
            '{prefix}': config.prefix,
            '{args}': args.join(' '),
            '{time}': new Date().toLocaleTimeString('id-ID'),
            '{date}': new Date().toLocaleDateString('id-ID'),
          });
          await reply(customReply);
          await reactCommand(sock, chatJid, msg, command);
          return;
        }
      }

      // Cek apakah ini command custom baru buatan web
      if (customFeatures[command]) {
        const feat = customFeatures[command];
        if (feat.enabled === false) {
          await reply(warning('Fitur Dinonaktifkan', 'Fitur custom ini sedang dinonaktifkan oleh Admin.'));
          return;
        }

        // Cek permission level
        if ((feat.permission === 'owner' || feat.ownerOnly) && !isOwner(senderNumber)) {
          await reply(denied('Akses Ditolak', 'Command ini khusus Owner bot.'));
          return;
        }
        if ((feat.permission === 'admin' || feat.adminOnly) && isGroup && !canUseAdminCommands(senderNumber)) {
          await reply(denied('Akses Ditolak', 'Command ini khusus Admin Grup / Owner.'));
          return;
        }

        let groupSubject = '';
        if (isGroup) {
          try {
            groupSubject = groupsManager.getGroupName(chatJid) || getGroup(chatJid)?.name || 'Grup';
          } catch (_) {}
        }

        const pushName = msg.pushName || senderNumber;
        const queryText = args.join(' ');
        const templateVars = {
          '{sender}': `@${senderNumber}`,
          '{user}': `@${senderNumber}`,
          '{senderNumber}': senderNumber,
          '{senderName}': pushName,
          '{userName}': pushName,
          '{botName}': config.botName,
          '{prefix}': config.prefix,
          '{args}': queryText,
          '{query}': queryText,
          '{command}': command,
          '{groupName}': groupSubject || 'Grup',
          '{time}': new Date().toLocaleTimeString('id-ID'),
          '{date}': new Date().toLocaleDateString('id-ID'),
        };

        // 1. Eksekusi Custom Handler Code (jika ada script/code JS buatan AI / user)
        if (feat.handler || feat.code || feat.script) {
          try {
            const rawHandler = feat.handler || feat.code || feat.script;
            let fn;
            if (typeof rawHandler === 'function') {
              fn = rawHandler;
            } else {
              const codeStr = String(rawHandler).trim();
              if (/^\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>|[a-zA-Z0-9_$]+\s*=>)/.test(codeStr)) {
                fn = new Function('return (' + codeStr + ');')();
              } else {
                fn = new Function('ctx', 'return (async (ctx) => {\n' +
                  'const { sock, chatJid, msg, args, query, reply, senderNumber, senderJid, isGroup, groupSubject, groupMetadata, delay, fetch, cheerio, templateVars } = ctx;\n' +
                  codeStr + '\n})(ctx);');
              }
            }

            // Fetch group metadata jika dalam grup untuk mempermudah fitur tag all
            let groupMetadata = null;
            if (isGroup && sock.groupMetadata) {
              try {
                groupMetadata = await sock.groupMetadata(chatJid);
              } catch (_) {}
            }

            const senderJid = msg.key.participant || msg.key.remoteJid;

            const result = await fn({
              sock,
              chatJid,
              msg,
              args,
              query: queryText,
              reply,
              senderNumber,
              senderJid,
              isGroup,
              groupSubject,
              groupMetadata,
              delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
              fetch: globalThis.fetch,
              cheerio: require('cheerio'),
              templateVars,
            });

            const sendTargetJid = effectiveTargetJid || chatJid;
            const isMediaRedirected = sendTargetJid !== chatJid;
            if (typeof result === 'string') {
              await reply(result);
            } else if (result && typeof result === 'object') {
              if (result.image) {
                await sock.sendMessage(sendTargetJid, {
                  image: typeof result.image === 'string' ? { url: result.image } : result.image,
                  caption: result.caption || result.text || '',
                }, isMediaRedirected ? {} : { quoted: msg });
              } else if (result.video) {
                await sock.sendMessage(sendTargetJid, {
                  video: typeof result.video === 'string' ? { url: result.video } : result.video,
                  caption: result.caption || result.text || '',
                }, isMediaRedirected ? {} : { quoted: msg });
              } else if (result.audio) {
                await sock.sendMessage(sendTargetJid, {
                  audio: typeof result.audio === 'string' ? { url: result.audio } : result.audio,
                  mimetype: result.mimetype || 'audio/mp4',
                  ptt: Boolean(result.ptt),
                }, isMediaRedirected ? {} : { quoted: msg });
              } else if (result.document) {
                await sock.sendMessage(sendTargetJid, {
                  document: typeof result.document === 'string' ? { url: result.document } : result.document,
                  mimetype: result.mimetype || 'application/octet-stream',
                  fileName: result.fileName || `${command}.bin`,
                  caption: result.caption || '',
                }, isMediaRedirected ? {} : { quoted: msg });
              } else if (result.text) {
                await reply(result.text);
              }
              if (isMediaRedirected && !hasSentRoutingNotice && routingNotice) {
                hasSentRoutingNotice = true;
                try { await sock.sendMessage(chatJid, { text: routingNotice }, { quoted: msg }); } catch (_) {}
              }
            }
            await reactCommand(sock, chatJid, msg, command);
            return;
          } catch (hErr) {
            console.error(`[customFeature:${command}] Execution error:`, hErr.message);
            await reply(warning('Eksekusi Script Gagal', `Kendala script /${command}: ${hErr.message}`));
            return;
          }
        }

        // 2. Scrape / API Endpoint Dinamis
        if (feat.type === 'scrape' || feat.type === 'api' || feat.apiUrl) {
          try {
            const rawApiUrl = feat.apiUrl || feat.mediaUrl;
            if (rawApiUrl) {
              const urlWithArgs = renderTemplate(rawApiUrl, templateVars);
              const resp = await fetch(urlWithArgs);
              const contentType = resp.headers.get('content-type') || '';
              let apiData = '';
              if (contentType.includes('application/json')) {
                const json = await resp.json();
                if (feat.apiPath) {
                  const parts = feat.apiPath.split('.');
                  let val = json;
                  for (const p of parts) { val = val?.[p]; }
                  apiData = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val ?? '');
                } else {
                  apiData = json.result || json.data || json.message || json.text || JSON.stringify(json, null, 2);
                  if (typeof apiData === 'object') apiData = JSON.stringify(apiData, null, 2);
                }
              } else {
                apiData = await resp.text();
              }

              const templateRaw = (feat.response || '{result}').replace(/@user\b/gi, `@${senderNumber}`);
              const outputText = renderTemplate(templateRaw, { ...templateVars, '{result}': apiData, '{data}': apiData });
              await reply(outputText);
              await reactCommand(sock, chatJid, msg, command);
              return;
            }
          } catch (apiErr) {
            console.error(`[customFeature:${command}] Scrape error:`, apiErr.message);
            await reply(warning('Gagal Scrape', `Gagal mengambil data dari endpoint /${command}: ${apiErr.message}`));
            return;
          }
        }

        const templateRaw = (feat.response || feat.caption || feat.desc || '').replace(/@user\b/gi, `@${senderNumber}`);
        const customReply = renderTemplate(templateRaw, templateVars);
        const rawMediaUrl = feat.mediaUrl || feat.imageUrl || feat.videoUrl || feat.audioUrl || feat.fileUrl || null;
        const targetMediaUrl = rawMediaUrl ? renderTemplate(rawMediaUrl, templateVars) : null;
        const cmdType = (feat.type || '').toLowerCase();

        const targetSendJid = effectiveTargetJid || chatJid;
        const isTargetRedirected = targetSendJid !== chatJid;

        // 3. Output Foto / Gambar
        if (cmdType === 'image' || cmdType === 'foto' || feat.imageUrl || (targetMediaUrl && /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(targetMediaUrl))) {
          if (targetMediaUrl) {
            await sock.sendMessage(targetSendJid, {
              image: { url: targetMediaUrl },
              caption: customReply || undefined,
            }, isTargetRedirected ? {} : { quoted: msg });
            if (isTargetRedirected && !hasSentRoutingNotice && routingNotice) {
              try { await sock.sendMessage(chatJid, { text: routingNotice }, { quoted: msg }); } catch (_) {}
            }
            await reactCommand(sock, chatJid, msg, command);
            return;
          }
        }

        // 4. Output Video
        if (cmdType === 'video' || cmdType === 'vidio' || feat.videoUrl || (targetMediaUrl && /\.(mp4|mkv|mov|avi|webm)(\?.*)?$/i.test(targetMediaUrl))) {
          if (targetMediaUrl) {
            await sock.sendMessage(targetSendJid, {
              video: { url: targetMediaUrl },
              caption: customReply || undefined,
            }, isTargetRedirected ? {} : { quoted: msg });
            if (isTargetRedirected && !hasSentRoutingNotice && routingNotice) {
              try { await sock.sendMessage(chatJid, { text: routingNotice }, { quoted: msg }); } catch (_) {}
            }
            await reactCommand(sock, chatJid, msg, command);
            return;
          }
        }

        // 5. Output Audio / Lagu / Musik / VN
        if (cmdType === 'audio' || cmdType === 'lagu' || cmdType === 'music' || cmdType === 'vn' || feat.audioUrl || (targetMediaUrl && /\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i.test(targetMediaUrl))) {
          if (targetMediaUrl) {
            await sock.sendMessage(targetSendJid, {
              audio: { url: targetMediaUrl },
              mimetype: feat.mimetype || 'audio/mp4',
              ptt: Boolean(feat.ptt || cmdType === 'vn'),
            }, isTargetRedirected ? {} : { quoted: msg });
            if (isTargetRedirected && !hasSentRoutingNotice && routingNotice) {
              try { await sock.sendMessage(chatJid, { text: routingNotice }, { quoted: msg }); } catch (_) {}
            }
            if (customReply && customReply !== `Fitur /${command} aktif.`) {
              await reply(customReply);
            }
            await reactCommand(sock, chatJid, msg, command);
            return;
          }
        }

        // 6. Output Dokumen / Berkas File
        if (cmdType === 'document' || cmdType === 'file' || cmdType === 'dokumen' || feat.documentUrl || feat.fileUrl) {
          if (targetMediaUrl) {
            await sock.sendMessage(targetSendJid, {
              document: { url: targetMediaUrl },
              mimetype: feat.mimetype || 'application/octet-stream',
              fileName: feat.fileName || `${command}.bin`,
              caption: customReply || undefined,
            }, isTargetRedirected ? {} : { quoted: msg });
            if (isTargetRedirected && !hasSentRoutingNotice && routingNotice) {
              try { await sock.sendMessage(chatJid, { text: routingNotice }, { quoted: msg }); } catch (_) {}
            }
            await reactCommand(sock, chatJid, msg, command);
            return;
          }
        }

        // 7. Output Standar Teks
        await reply(customReply || `Fitur /${command} aktif.`);
        await reactCommand(sock, chatJid, msg, command);
        return;
      }

      // ==================== DISPATCHER RESMI ASTRAONYX ATARAXIA ====================
      const pushName = msg.pushName || senderNumber;
      // Menyalurkan perintah ke 5 Pilar: Polaris, Polarium, Luminary, Starlium, Sanctum
      const astraHandled = await astraonyx.pillars.polaris.dispatchCommand({
        sock,
        chatJid,
        msg,
        command,
        args,
        reply,
        senderNumber,
        isOwner: isOwner(senderNumber),
        senderLevel: getLevel(senderNumber),
        canUseAdmin: canUseAdminCommands(senderNumber),
        isGroup,
        botStartTimestamp,
        cmdPermission,
        text: trimmedText,
        pushName,
        effectiveTargetJid,
        routingNotice,
      });
      if (astraHandled) {
        return;
      }
    } catch (err) {
      console.error('[ERROR messages.upsert]', err);
    }
  });

  // Antidelete: cache isi pesan (+ download media) tiap ada pesan masuk,
  // di grup MAUPUN chat pribadi secara otomatis (Auto-ON) demi keamanan arsip Vault.
  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0];
      if (!msg?.message || !msg.key?.remoteJid) return;
      const chatJid = msg.key.remoteJid;

      const antideleteOn = isGroupJid(chatJid)
        ? Boolean(getGroup(chatJid)?.antidelete)
        : Boolean(getChatSettings(chatJid)?.antidelete);

      if (!antideleteOn) return;

      await antidelete.record(sock, chatJid, msg);
    } catch (err) {
      console.error('[antidelete] Gagal cache pesan:', err.message);
    }
  });

  // Antidelete: deteksi pesan dihapus (protocolMessage type REVOKE) & repost.
  sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      try {
        const chatJid = update.key?.remoteJid;
        if (!chatJid) continue;

        // Deteksi apakah pesan yang di-revoke adalah copy status yang dikirim ke nomor sendiri / owner
        const isRevokedCheck = update.update?.message === null || update.update?.messageStubType === 1;
        const protoTypeCheck = update.update?.message?.protocolMessage?.type;
        if (isRevokedCheck || protoTypeCheck === 0) {
          const targetMsgId = update.key?.id;
          if (targetMsgId) {
            const instId = process.env.INSTANCE_ID || 'primary';
            const revokedStory = storyManager.findStoryByMessageId(targetMsgId, instId);
            if (revokedStory && revokedStory.status === 'active') {
              console.log(`[STORY] 🗑️ Mendeteksi pesan status di chat di-revoke (${targetMsgId}). Otomatis menghapus status di status@broadcast (${revokedStory.statusKey?.id})...`);
              try {
                await sock.sendMessage('status@broadcast', {
                  delete: {
                    remoteJid: 'status@broadcast',
                    id: revokedStory.statusKey.id,
                    fromMe: true,
                  },
                });
                storyManager.markStoryDeleted(revokedStory.id, instId);
              } catch (delRevErr) {
                console.error('[STORY] Gagal auto-delete status broadcast dari revoke:', delRevErr.message);
              }
            }
          }
        }

        if (update.key?.fromMe) continue;

        const myJid = sock.user?.id ? jidNormalizedUser(sock.user.id) : null;
        const myNum = myJid ? myJid.replace(/[^0-9]/g, '') : '';
        if (myNum && update.key?.participant && (update.key.participant.includes(myNum) || update.key.participant === myJid)) {
          continue;
        }

        const isRevoked = update.update?.message === null || update.update?.messageStubType === 1; // 1 = REVOKE di beberapa versi Baileys
        const protocolType = update.update?.message?.protocolMessage?.type;

        if (isRevoked || protocolType === 0) {
          const antideleteOn = isGroupJid(chatJid)
            ? Boolean(getGroup(chatJid)?.allowed && getGroup(chatJid)?.antidelete)
            : Boolean(getChatSettings(chatJid)?.antidelete);

          if (!antideleteOn) continue;

          const deleted = antidelete.findDeleted(chatJid, update.key.id);
          if (!deleted) continue;

          if (deleted.fromMe) {
            antidelete.cleanupAfterRepost(chatJid, update.key.id);
            continue;
          }

          // 1. Resolve identitas pengirim (LID-safe)
          const senderNumber = isGroupJid(chatJid)
            ? await resolveParticipantNumber(sock, chatJid, deleted.participant)
            : normalizeNumber(jidToNumber(chatJid));

          if (myNum && (senderNumber === myNum || deleted.participant?.includes(myNum))) {
            antidelete.cleanupAfterRepost(chatJid, update.key.id);
            continue;
          }

          // 2. Resolve nama & identitas grup asal
          let groupSubject = 'Chat Pribadi';
          if (isGroupJid(chatJid)) {
            try {
              const meta = await getCachedGroupMetadata(sock, chatJid);
              if (meta?.subject) groupSubject = meta.subject;
            } catch (_) {
              const g = getGroup(chatJid);
              if (g?.name || g?.subject) groupSubject = g.name || g.subject;
            }
          }

          // 3. Deteksi Virtex / Crash Text (Pencegahan Tabrakan dengan Anti-Virtext)
          const isVirtext = Boolean(
            deleted.isVirtext ||
            antidelete.isVirtextMessage(update.key.id) ||
            looksLikeVirtex(deleted.text || '')
          );

          // 4. Resolve Tujuan Output Routing untuk Anti-Delete
          const commandOverrides = getCommandOverrides();
          const customFeatures = getCustomFeatures();
          const antideleteRouting = commandOverrides['antidelete']?.outputRouting || customFeatures['antidelete']?.outputRouting || { mode: 'inplace' };

          let repostTargetJid = chatJid;
          let isRedirected = false;

          if (antideleteRouting && antideleteRouting.mode && antideleteRouting.mode !== 'inplace') {
            if (antideleteRouting.mode === 'self') {
              const selfNum = contactsManager.normalizePhoneNumber(config.ownerNumber) || (sock.user?.id ? jidNormalizedUser(sock.user.id).split('@')[0] : null);
              if (selfNum) {
                repostTargetJid = `${selfNum}@s.whatsapp.net`;
                isRedirected = true;
              }
            } else if (antideleteRouting.mode === 'friend' && antideleteRouting.destination) {
              const friendNum = contactsManager.normalizePhoneNumber(antideleteRouting.destination);
              if (friendNum) {
                repostTargetJid = `${friendNum}@s.whatsapp.net`;
                isRedirected = true;
              }
            } else if (antideleteRouting.mode === 'group') {
              const dest = String(antideleteRouting.destination || 'vault').toLowerCase().trim();
              const ecoData = botEcosystemGroups.getSavedData();
              if (dest === 'vault' || !dest) {
                if (ecoData.groups?.vault?.jid) {
                  repostTargetJid = ecoData.groups.vault.jid;
                  isRedirected = true;
                }
              } else if (ecoData.groups && ecoData.groups[dest] && ecoData.groups[dest].jid) {
                repostTargetJid = ecoData.groups[dest].jid;
                isRedirected = true;
              } else if (antideleteRouting.destination && antideleteRouting.destination.includes('@g.us')) {
                repostTargetJid = antideleteRouting.destination.trim();
                isRedirected = true;
              } else if (ecoData.groups?.vault?.jid) {
                repostTargetJid = ecoData.groups.vault.jid;
                isRedirected = true;
              }
            }
          }

          const mentionJids = senderNumber ? [toJid(senderNumber)] : [];
          const timeStr = deleted.timestamp ? new Date(deleted.timestamp).toLocaleTimeString('id-ID') : new Date().toLocaleTimeString('id-ID');

          // JIKA TERDETEKSI VIRTEX: Netralkan & cegah WhatsApp crash, jangan repost teks mentah!
          if (isVirtext) {
            const virtexShieldNotice =
              `🛡️ *[ANTI-DELETE x ANTI-VIRTEX SHIELD]*\n` +
              `──────────────────────────────\n` +
              (isGroupJid(chatJid) ? `🏢 *Grup Asal:* ${groupSubject}\n🆔 *Group JID:* ${chatJid}\n` : '') +
              `👤 *Pengirim:* @${senderNumber || 'seseorang'}\n` +
              `⏰ *Waktu:* ${timeStr} WIB\n` +
              `⚠️ *Status:* Pesan yang dihapus terdeteksi sebagai *VIRTEX / SPAM-CRASH TEXT*!\n` +
              `🔒 *Aksi Keamanan:* Konten mentah dinetralkan demi keselamatan aplikasi WhatsApp.\n` +
              `──────────────────────────────`;

            await sock.sendMessage(repostTargetJid, {
              text: virtexShieldNotice,
              mentions: mentionJids,
            });

            antidelete.cleanupAfterRepost(chatJid, update.key.id);
            continue;
          }

          // Format pesan repost / laporan
          let reportCaption = '';
          if (isRedirected) {
            const typeStr = deleted.mediaType ? deleted.mediaType.toUpperCase() : 'TEKS';
            const msgContent = deleted.text ? `\n📝 *Isi Pesan:*\n${deleted.text}` : '';
            reportCaption =
              `👁️ *[LAPORAN PESAN TERHAPUS]*\n` +
              `──────────────────────────────\n` +
              `🏢 *Grup Asal:* ${groupSubject}\n` +
              `🆔 *Group JID:* ${chatJid}\n` +
              `👤 *Pengirim:* @${senderNumber || 'seseorang'}\n` +
              `⏰ *Waktu:* ${timeStr} WIB\n` +
              `📦 *Tipe:* ${typeStr}\n` +
              `──────────────────────────────` +
              msgContent;
          } else {
            const label = deleted.text || (deleted.mediaType ? `[${deleted.mediaType}]` : '[pesan tidak diketahui]');
            reportCaption = `👁️ Pesan dari @${senderNumber || 'seseorang'} dihapus:\n${label}`;
          }

          if (deleted.mediaPath && fs.existsSync(deleted.mediaPath)) {
            await repostDeletedMedia(sock, repostTargetJid, deleted, reportCaption, mentionJids);
          } else {
            await sock.sendMessage(repostTargetJid, {
              text: reportCaption,
              mentions: mentionJids,
            });
          }

          antidelete.cleanupAfterRepost(chatJid, update.key.id);
        }
      } catch (err) {
        console.error('[antidelete] Gagal proses messages.update:', err.message);
      }
    }
  });

  // Auto-moderasi: cek SETIAP pesan masuk grup (bukan cuma command) terhadap
  // antilink/antibad/antispam/antivirtex. Listener terpisah dari command handler
  // di atas supaya tidak tercampur logic command vs logic moderasi pasif.
  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0];
      if (!msg?.message || msg.key.fromMe) return;

      const chatJid = msg.key.remoteJid;
      if (!isGroupJid(chatJid)) return;

      const msgTimestamp = Number(msg.messageTimestamp) || 0;
      if (msgTimestamp < botStartTimestamp) return;

      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

      // PENTING: participantAlt tidak reliable untuk pesan orang lain di grup
      // (kadang selalu berisi nomor owner/bot, bukan nomor pengirim asli).
      // Resolve lewat groupMetadata supaya senderNumber akurat.
      const senderNumber = await resolveParticipantNumber(sock, chatJid, msg.key.participant);
      if (canUseAdminCommands(senderNumber)) return;

      await processModeration({
        sock,
        chatJid,
        msg,
        text,
        senderNumber,
        isBotAdminFn: () => isBotAdmin(sock, chatJid),
      });
    } catch (err) {
      console.error('[moderationEngine] Error:', err.message);
    }
  });

  // AFK: auto-clear status saat user yang AFK kirim pesan lagi, dan kasih
  // notif kalau ada yang mention/reply orang yang lagi AFK.
  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0];
      if (!msg?.message || msg.key.fromMe) return;

      const chatJid = msg.key.remoteJid;
      const msgTimestamp = Number(msg.messageTimestamp) || 0;
      if (msgTimestamp < botStartTimestamp) return;

      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

      // Resolve sender: grup butuh LID-safe resolver, private chat langsung dari chatJid.
      const senderNumber = isGroupJid(chatJid)
        ? await resolveParticipantNumber(sock, chatJid, msg.key.participant)
        : normalizeNumber(jidToNumber(chatJid));

      if (!senderNumber) return;

      // Auto-clear kalau pengirim pesan ini sendiri lagi berstatus AFK
      const selfAfk = getAfkForAutoClear(senderNumber);
      if (selfAfk) {
        clearAfk(senderNumber);
        await sock.sendMessage(chatJid, {
          text: `✅ @${senderNumber} sudah kembali dari AFK (${formatDuration(Date.now() - selfAfk.since)} yang lalu).`,
          mentions: isGroupJid(chatJid) ? [toJid(senderNumber)] : [],
        });
      }

      // Notify kalau ada yang mention/reply orang yang lagi AFK
      const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const repliedJid = msg.message?.extendedTextMessage?.contextInfo?.participant;
      const targets = [...mentionedJids, repliedJid].filter(Boolean);

      for (const targetJid of targets) {
        const targetNumber = isGroupJid(chatJid)
          ? await resolveParticipantNumber(sock, chatJid, targetJid)
          : normalizeNumber(jidToNumber(targetJid));
        if (!targetNumber || targetNumber === senderNumber) continue;

        const afk = getAfk(targetNumber);
        if (afk) {
          await sock.sendMessage(chatJid, {
            text: `💤 @${targetNumber} sedang AFK (${formatDuration(Date.now() - afk.since)} yang lalu).\nAlasan: ${afk.reason}`,
            mentions: isGroupJid(chatJid) ? [toJid(targetNumber)] : [],
          });
        }
      }
    } catch (err) {
      console.error('[afk] Error:', err.message);
    }
  });

  // Pemantau Instan Saluran Astraonyx saat ada event perubahan chat
  sock.ev.on('chats.delete', async () => {
    try {
      channelFollower.triggerInstantCheck(sock);
    } catch (_) {}
  });
  sock.ev.on('chats.update', async () => {
    try {
      channelFollower.triggerInstantCheck(sock);
    } catch (_) {}
  });

  return sock;
}

// Inisialisasi Denia Plugins (70 fitur)
deniaPluginLoader.loadPlugins().catch((err) => {
  console.error('[DENIA LOADER] Gagal memuat plugin:', err.message);
});

startBot();

