// astraonyx/polaris/router/commandDispatcher.js — Master Dynamic Command Dispatcher for Astraonyx Ataraxia
const fs = require('fs');
const path = require('path');
const config = require('../../../config');
const sanctum = require('../../sanctum');
const luminary = require('../../luminary');
const starlium = require('../../starlium');
const mori = require('../../mori');
const hermes = require('../hermes');
const skillManager = require('../../../server/skillManager');
const deniaPluginLoader = require('../../../lib/deniaPluginLoader');
const { COMMANDS } = require('../../../lib/commandRegistry');
const { success, warning, denied, error, info } = require('../../../lib/messageStyle');

// Rate Limiter / Cooldown Map
const cooldowns = new Map();
function isSpamming(sender, cdTime = 1500) {
  const now = Date.now();
  if (cooldowns.has(sender)) {
    const expiration = cooldowns.get(sender) + cdTime;
    if (now < expiration) return true;
  }
  cooldowns.set(sender, now);
  return false;
}

// Command yang membutuhkan hak akses Level 1 (Owner atau Level 1)
const LEVEL1_REQUIRED = new Set([
  'kick', 'add', 'promote', 'demote', 'groupname', 'groupdesc', 'grouppic', 'link', 'revoke', 'groupinfo', 'leave',
  'close', 'announce', 'open', 'mute', 'restrict',
  'delchat',
  'warn', 'resetwarn', 'setwarnlimit',
]);

// Command khusus di dalam grup WhatsApp
const GROUP_ONLY = new Set([
  ...LEVEL1_REQUIRED,
  'antilink', 'antibad', 'antibot', 'antifake', 'welcome', 'setwelcome', 'notify', 'listwordlist', 'delwordlist',
  'antispam', 'antivirtex', 'banned', 'unbanned', 'listban',
  'hidetag', 'groupsetting',
  'listadmin', 'listmember',
  'playrank', 'topchat', 'tierlist',
  'duel', 'suit', 'raid', 'boss', 'attack',
  'mining', 'nambang', 'mancing', 'fishing', 'hunt', 'berburu', 'pasar', 'market', 'bank', 'daily', 'klaim', 'slot', 'casino', 'rpgprofile', 'profile', 'inv', 'inventory',
]);

// Command dengan reaksi ✅ (efek berat / permanen)
const REACT_COMMANDS = new Set([
  'kick', 'add', 'promote', 'demote', 'groupname', 'groupdesc', 'grouppic', 'revoke', 'leave',
  'close', 'announce', 'open', 'mute', 'restrict',
  'delchat', 'delsw', 'upsw', 'sw',
  'adduser', 'deluser', 'setlevel',
  'allowgroup', 'disallowgroup',
  'bindeco', 'synceco', 'inteco',
  'opencvc', 'openvc', 'buka',
  'sticker', 'toimg', 'tourl', 'nobg', 'removebg', 'hd', 'upscale',
  'playrank', 'duel',
  'addtugas', 'addtimetask', 'edittask', 'deltask', 'setremind', 'reminder',
  'status', 'interping', 'info', 'botinfo', 'menu', 'help', 'allmenu',
  'viewwebb', 'viewweb', 'webview', 'webinwa',
  'editoutput', 'editmsg', 'revisi', 'editpesan',
  'redeem', 'chpost', 'relink', 'linkgroup', 'linkallgroups',
]);

async function reactCommand(sock, chatJid, msg, command) {
  if (!REACT_COMMANDS.has(command)) return;
  try {
    await sock.sendMessage(chatJid, {
      react: { text: '✅', key: msg.key },
    });
  } catch (_) {}
}

async function reactWith(sock, chatJid, msg, emoji) {
  try {
    await sock.sendMessage(chatJid, { react: { text: emoji, key: msg.key } });
  } catch (_) {}
}

// Master Command Registry Map
const COMMAND_REGISTRY = new Map();
let isInitialized = false;

/**
 * Mendaftarkan command handler ke registry map
 */
function registerHandler(triggers, handler, options = {}) {
  const triggerList = Array.isArray(triggers) ? triggers : [triggers];
  for (const trig of triggerList) {
    const key = String(trig).toLowerCase().trim();
    COMMAND_REGISTRY.set(key, {
      handler,
      ownerOnly: Boolean(options.ownerOnly),
      level1Required: Boolean(options.level1Required || LEVEL1_REQUIRED.has(key)),
      groupOnly: Boolean(options.groupOnly || GROUP_ONLY.has(key)),
      category: options.category || 'Umum',
      desc: options.desc || `Fitur /${key}`,
    });
  }
}

/**
 * Dynamic Command Loader: Membaca seluruh file di folder commands/ secara otomatis
 */
function initializeDynamicCommands() {
  if (isInitialized) return;
  isInitialized = true;

  const commandsDir = path.resolve(__dirname, '../../../commands');
  if (!fs.existsSync(commandsDir)) {
    console.warn('[commandDispatcher] Folder commands/ tidak ditemukan.');
    return;
  }

  // 1. Mendaftarkan modul-modul perintah inti resmi Polaris
  try {
    const admin = require('../../../commands/admin');
    registerHandler(['kick', 'add', 'promote', 'demote', 'groupname', 'groupdesc', 'grouppic', 'link', 'revoke', 'groupinfo', 'leave'], admin.handleAdminCommand);
  } catch (e) { console.error('[dispatcher] Gagal load admin:', e.message); }

  try {
    const groupLock = require('../../../commands/group-lock');
    registerHandler(['close', 'announce', 'open', 'mute', 'restrict'], groupLock.handleGroupLockCommand);
  } catch (e) { console.error('[dispatcher] Gagal load group-lock:', e.message); }

  try {
    const whitelist = require('../../../commands/whitelist');
    registerHandler(['adduser', 'deluser', 'listuser', 'setlevel', 'setowner', 'unsetowner'], whitelist.handleWhitelistCommand, { ownerOnly: true });
  } catch (e) { console.error('[dispatcher] Gagal load whitelist:', e.message); }

  try {
    const cleanup = require('../../../commands/cleanup');
    registerHandler(['cleartmp', 'tmpstatus'], async (ctx) => {
      if (ctx.command === 'cleartmp') return cleanup.handleCleartmp(ctx);
      return cleanup.handleTmpStatus(ctx);
    }, { ownerOnly: true });
  } catch (e) { console.error('[dispatcher] Gagal load cleanup:', e.message); }

  try {
    const ecosystem = require('../../../commands/ecosystem');
    registerHandler(['bindeco', 'listeco', 'synceco', 'inteco'], ecosystem.handleEcosystemCommand, { ownerOnly: true });
  } catch (e) { console.error('[dispatcher] Gagal load ecosystem:', e.message); }

  try {
    const del = require('../../../commands/delete');
    registerHandler(['delchat'], del.handleDeleteCommand);
  } catch (e) { console.error('[dispatcher] Gagal load delete:', e.message); }

  try {
    const story = require('../../../commands/story');
    registerHandler(['upsw', 'sw', 'postsw', 'story'], (ctx) => story.handleUpSwCommand({ ...ctx, isOwnerFlag: ctx.isOwner }), { ownerOnly: true });
    registerHandler(['delsw', 'delstatus', 'hapussw'], (ctx) => story.handleDelSwCommand({ ...ctx, isOwnerFlag: ctx.isOwner }), { ownerOnly: true });
  } catch (e) { console.error('[dispatcher] Gagal load story:', e.message); }

  try {
    const moderation = require('../../../commands/moderation');
    registerHandler(['antilink', 'antibad', 'antibot', 'antifake', 'welcome', 'setwelcome', 'notify', 'listwordlist', 'delwordlist', 'antiwame', 'autostickergc', 'autosticker', 'autosimi', 'mutegc', 'botgrup'], moderation.handleModerationCommand);
  } catch (e) { console.error('[dispatcher] Gagal load moderation:', e.message); }

  try {
    const security = require('../../../commands/security');
    registerHandler(['antispam', 'antivirtex', 'antidelete', 'banned', 'unbanned', 'listban'], security.handleSecurityCommand);
  } catch (e) { console.error('[dispatcher] Gagal load security:', e.message); }

  try {
    const owner = require('../../../commands/owner');
    registerHandler(['chpost', 'saluran', 'chbroadcast'], owner.handleChPost);
    registerHandler(['opencvc', 'openvc', 'buka'], owner.handleOpenCvc);
  } catch (e) { console.error('[dispatcher] Gagal load owner:', e.message); }

  try {
    const opencoc = require('../../../commands/opencoc');
    registerHandler(['opencoc', 'coc'], async (ctx) => opencoc.execute(ctx.sock, ctx.msg, ctx.text || ctx.args.join(' ')));
  } catch (e) { console.error('[dispatcher] Gagal load opencoc:', e.message); }

  try {
    const groupUtil = require('../../../commands/group-utility');
    registerHandler(['hidetag', 'groupsetting', 'getpp', 'afk', 'sider', 'siders', 'warcall', 'votekick', 'vkick', 'vote', 'listonline', 'liston'], groupUtil.handleGroupUtilityCommand);
  } catch (e) { console.error('[dispatcher] Gagal load group-utility:', e.message); }

  try {
    const member = require('../../../commands/member');
    registerHandler(['listadmin', 'listmember', 'warn', 'resetwarn', 'setwarnlimit'], member.handleMemberCommand);
  } catch (e) { console.error('[dispatcher] Gagal load member:', e.message); }

  try {
    const media = require('../../../commands/media');
    registerHandler(['sticker', 'stiker', 's', 'stc', 'toimg', 'toimage', 'tourl', 'nobg', 'removebg', 'hd', 'upscale', 'remini', 'enhance'], media.handleMediaCommand);
  } catch (e) { console.error('[dispatcher] Gagal load media:', e.message); }

  try {
    const downloader = require('../../../commands/downloader');
    registerHandler([
      'download', 'dwnld', 'dl', 'down', 'd', 'downloader',
      'mdf', 'tiktok', 'tiktokslide', 'ytmp3', 'ytmp4', 'ig', 'instagram', 'facebook', 'fb',
      'spotify', 'pinterest', 'terabox', 'gdrive', 'twitter', 'twittervid',
      'mori', 'omniget', 'course', 'magnet', 'torrent'
    ], (ctx) => downloader.handleDownloaderCommand({ ...ctx, reactWith }));
  } catch (e) { console.error('[dispatcher] Gagal load downloader:', e.message); }

  try {
    const textTools = require('../../../commands/text-tools');
    registerHandler(['translate', 'tts', 'readmore'], textTools.handleTextToolsCommand);
  } catch (e) { console.error('[dispatcher] Gagal load text-tools:', e.message); }

  try {
    const pdfTools = require('../../../commands/pdftoolkit');
    registerHandler(['topdf', 'img2pdf', 'compresspdf', 'text2pdf'], pdfTools.handlePdfToolkitCommand);
  } catch (e) { console.error('[dispatcher] Gagal load pdftoolkit:', e.message); }

  try {
    const taskReminder = require('../../../commands/taskreminder');
    registerHandler(['reminder', 'setremind', 'setrekap', 'addtugas', 'addtask', 'newtask', 'addtimetask', 'extendtask', 'edittask', 'deltask', 'deltugas', 'deletetask', 'removetask', 'listtugas', 'tugas', 'listtask', 'tasks', 'task'], taskReminder.handleTaskReminderCommand);
  } catch (e) { console.error('[dispatcher] Gagal load taskreminder:', e.message); }

  try {
    const legacyReminder = require('../../../commands/reminder');
    registerHandler(['setreminder'], legacyReminder.handleReminderCommand, { level1Required: true, groupOnly: true });
  } catch (e) { console.error('[dispatcher] Gagal load reminder:', e.message); }

  try {
    const ai = require('../../../commands/ai');
    registerHandler(['ai', 'aiforget'], async (ctx) => {
      if (ctx.command === 'ai') {
        await reactWith(ctx.sock, ctx.chatJid, ctx.msg, '⏳');
        await ai.handleAiCommand(ctx);
        await reactWith(ctx.sock, ctx.chatJid, ctx.msg, '✅');
      } else {
        await ai.handleAiCommand(ctx);
      }
    });
  } catch (e) { console.error('[dispatcher] Gagal load ai:', e.message); }

  try {
    const hermesCmd = require('../../../commands/hermes');
    registerHandler(['hermes', 'hermes-agent', 'hermesclear', 'hermesstatus', 'aistudio', 'astraonyx', 'astraonyxai'], async (ctx) => {
      await reactWith(ctx.sock, ctx.chatJid, ctx.msg, '🧠');
      await hermesCmd.handleHermesCommand(ctx);
      await reactWith(ctx.sock, ctx.chatJid, ctx.msg, '✅');
    });
  } catch (e) { console.error('[dispatcher] Gagal load hermes:', e.message); }

  try {
    const viewWebb = require('../../../commands/viewwebb');
    registerHandler(['viewwebb', 'viewweb', 'webview', 'webinwa'], viewWebb.handleViewWebbCommand);
  } catch (e) { console.error('[dispatcher] Gagal load viewwebb:', e.message); }

  try {
    const editOutput = require('../../../commands/editoutput');
    registerHandler(['editoutput', 'editmsg', 'revisi', 'editpesan'], editOutput.handleEditOutputCommand);
  } catch (e) { console.error('[dispatcher] Gagal load editoutput:', e.message); }

  try {
    const rank = require('../../../commands/rank');
    registerHandler(['playrank', 'rank', 'level', 'xp', 'topchat', 'toprank', 'leaderboard', 'tier', 'tierlist', 'levelinfo'], rank.handleRankCommand);
  } catch (e) { console.error('[dispatcher] Gagal load rank:', e.message); }

  try {
    const fun = require('../../../commands/fun');
    registerHandler(['truth', 'dare', 'tebakkata', 'caklontong', 'tebaktebakan', 'susunkata', 'nyerah', 'spin', 'roll'], fun.handleFunCommand);
  } catch (e) { console.error('[dispatcher] Gagal load fun:', e.message); }

  try {
    const duel = require('../../../commands/duel');
    registerHandler(['duel', 'terima', 'tolak', 'suit'], duel.handleDuelCommand);
  } catch (e) { console.error('[dispatcher] Gagal load duel:', e.message); }

  try {
    const timecapsule = require('../../../commands/timecapsule');
    registerHandler(['timecapsule', 'kapsulwaktu', 'listcapsule', 'delcapsule'], timecapsule.handleTimeCapsuleCommand);
  } catch (e) { console.error('[dispatcher] Gagal load timecapsule:', e.message); }

  try {
    const deeptalk = require('../../../commands/deeptalk');
    registerHandler(['deeptalk', 'kartudeep', 'deepcard'], deeptalk.handleDeepTalkCommand);
  } catch (e) { console.error('[dispatcher] Gagal load deeptalk:', e.message); }

  try {
    const raid = require('../../../commands/raid');
    registerHandler(['raid', 'boss', 'attack'], raid.handleRaidCommand);
  } catch (e) { console.error('[dispatcher] Gagal load raid:', e.message); }

  try {
    const belajar = require('../../../commands/belajar');
    registerHandler(['jadwal', 'materi', 'kuis', 'belajar'], belajar.handleBelajarCommand);
  } catch (e) { console.error('[dispatcher] Gagal load belajar:', e.message); }

  try {
    const rpg = require('../../../commands/rpg');
    registerHandler(['mining', 'nambang', 'mancing', 'fishing', 'hunt', 'berburu', 'pasar', 'market', 'bank', 'daily', 'klaim', 'slot', 'casino', 'rpgprofile', 'profile', 'inv', 'inventory', 'dompet', 'deposit', 'tarik', 'jual', 'sellall'], rpg.handleRpgCommand);
  } catch (e) { console.error('[dispatcher] Gagal load rpg:', e.message); }

  try {
    const infoCmd = require('../../../commands/info');
    registerHandler(['info', 'botinfo'], (ctx) => infoCmd.handleInfoCommand({ ...ctx, isOwnerFlag: ctx.isOwner }));
  } catch (e) { console.error('[dispatcher] Gagal load info:', e.message); }

  try {
    const statusCmd = require('../../../commands/status');
    registerHandler(['status'], (ctx) => statusCmd.execute(ctx.sock, ctx.msg, ctx.args, ctx));
  } catch (e) { console.error('[dispatcher] Gagal load status:', e.message); }

  try {
    const interpingCmd = require('../../../commands/interping');
    registerHandler(['interping'], (ctx) => interpingCmd.execute(ctx.sock, ctx.msg, ctx.args, ctx));
  } catch (e) { console.error('[dispatcher] Gagal load interping:', e.message); }

  try {
    const menuCmd = require('../../../commands/menu');
    registerHandler(['menu', 'help', 'allmenu'], (ctx) => menuCmd.handleMenuCommand({ ...ctx, isOwnerFlag: ctx.isOwner }));
  } catch (e) { console.error('[dispatcher] Gagal load menu:', e.message); }

  // 2. Scan file dinamis baru di folder commands/ yang belum terdaftar
  const existingFiles = new Set([
    'admin.js', 'group-lock.js', 'whitelist.js', 'cleanup.js', 'ecosystem.js', 'delete.js', 'story.js',
    'moderation.js', 'security.js', 'owner.js', 'opencoc.js', 'group-utility.js', 'member.js', 'media.js',
    'downloader.js', 'text-tools.js', 'pdftoolkit.js', 'taskreminder.js', 'reminder.js', 'ai.js', 'hermes.js',
    'viewwebb.js', 'editoutput.js', 'rank.js', 'fun.js', 'duel.js', 'timecapsule.js', 'deeptalk.js', 'raid.js',
    'belajar.js', 'rpg.js', 'info.js', 'status.js', 'interping.js', 'menu.js', 'opencvc.js'
  ]);

  try {
    const files = fs.readdirSync(commandsDir);
    for (const file of files) {
      if (!file.endsWith('.js') || existingFiles.has(file)) continue;

      const fullPath = path.join(commandsDir, file);
      try {
        const mod = require(fullPath);
        const baseName = file.replace('.js', '').toLowerCase();

        if (typeof mod.execute === 'function' || typeof mod === 'function') {
          const fn = typeof mod.execute === 'function' ? mod.execute.bind(mod) : mod;
          const cmdName = mod.name ? String(mod.name).toLowerCase() : baseName;
          const aliases = Array.isArray(mod.aliases) ? mod.aliases.map((a) => String(a).toLowerCase()) : [];
          const allTriggers = [cmdName, ...aliases];

          registerHandler(allTriggers, async (ctx) => {
            if (typeof mod.execute === 'function') {
              return mod.execute(ctx.sock, ctx.msg, ctx.args, ctx);
            }
            return fn(ctx);
          }, {
            ownerOnly: Boolean(mod.ownerOnly),
            level1Required: Boolean(mod.level1Required),
            groupOnly: Boolean(mod.groupOnly),
            category: mod.category || 'Custom Dynamic',
            desc: mod.desc || `Fitur dinamis /${cmdName}`,
          });

          // Otomatis sinkronkan dengan menu jika belum ada
          if (Array.isArray(COMMANDS) && !COMMANDS.some((c) => c.name.toLowerCase() === cmdName)) {
            COMMANDS.push({
              name: cmdName,
              category: mod.category || 'Custom Dynamic',
              desc: mod.desc || `Fitur dinamis /${cmdName}`,
              ownerOnly: Boolean(mod.ownerOnly),
            });
          }
          console.log(`[commandDispatcher] ⚡ Dynamic Command Auto-Loaded: /${cmdName} (${file})`);
        }
      } catch (err) {
        console.error(`[commandDispatcher] Gagal memuat command dinamis ${file}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[commandDispatcher] Gagal scan folder commands/:', err.message);
  }

  console.log(`[commandDispatcher] ✅ Total ${COMMAND_REGISTRY.size} trigger perintah aktif terpetakan di memori.`);
}

/**
 * Dispatcher utama: Menyalurkan perintah ke pilar atau registry dinamis
 */
async function dispatchCommand(context) {
  initializeDynamicCommands();

  const {
    sock,
    chatJid,
    msg,
    command,
    args = [],
    reply,
    senderNumber,
    isOwner = false,
    senderLevel = null,
    canUseAdmin = false,
    isGroup = false,
    botStartTimestamp = Math.floor(Date.now() / 1000),
    cmdPermission = 'all',
  } = context;

  const cleanCmd = String(command || '').toLowerCase().replace(/^[!./#]/, '');
  if (!cleanCmd) return false;

  // 1. Anti-Spam Rate Limiter (Kecuali Owner)
  if (!isOwner && isSpamming(senderNumber)) {
    return true; // Cooldown aktif, silent skip
  }

  // 2. Special Command: Ping & Interping
  if (cleanCmd === 'ping') {
    const start = Date.now();
    await reply(info('Pong!', `Response time: ${Date.now() - start}ms`));
    return true;
  }

  // 3. Special Command: Redeem / Claim Token
  if (cleanCmd === 'redeem' || cleanCmd === 'claimtoken' || cleanCmd === 'pakaitoken') {
    const tokenCode = args[0];
    if (!tokenCode) {
      await reply(warning('Format Salah', `Gunakan: *${config.prefix || '/'}redeem <kode-token>*\nContoh: *${config.prefix || '/'}redeem POLARIS-STARLIGHT-9B1A*`));
      return true;
    }
    try {
      const upgradeTokenService = require('../../../server/upgradeTokenService');
      const res = upgradeTokenService.redeemToken(senderNumber, tokenCode, 'bot_wa');
      await reply(success('Token Berhasil Ditebus!', `${res.message}\n\n👑 *Tingkat Baru:* ${res.targetRoleInfo.name} (${res.targetRoleInfo.badge})\n✨ *Deskripsi:* ${res.targetRoleInfo.description}`));
    } catch (err) {
      await reply(denied('Klaim Token Gagal', err.message));
    }
    await reactCommand(sock, chatJid, msg, cleanCmd);
    return true;
  }

  // 4. Special Command: Ecosystem Relink & Link Groups
  if (cleanCmd === 'relink' || cleanCmd === 'relinkcommunity' || cleanCmd === 'relinkecosystem') {
    if (!isOwner) {
      await reply(denied('Akses Ditolak', 'Command ini khusus owner bot.'));
      return true;
    }
    const botEcosystemGroups = require('../../../lib/botEcosystemGroups');
    await reply(info('Menyinkronkan Ekosistem...', 'Memeriksa keutuhan 5 grup ekosistem & Komunitas Polaris...'));
    try {
      const relinkRes = await botEcosystemGroups.relinkEcosystem(sock);
      const commLink = relinkRes.community?.inviteLink || '-';
      const totalGroups = Object.keys(relinkRes.groups || {}).length;
      const linkedCount = Object.values(relinkRes.groups || {}).filter((g) => g.linkedToCommunity).length;
      await reply(success(
        'Ekosistem Berhasil Disinkronkan',
        `Status Ekosistem Polaris:\n\n` +
        `• Komunitas: *${relinkRes.community?.subject || 'Polaris • Official Community'}*\n` +
        `• Link Komunitas: ${commLink}\n` +
        `• Total Grup Terhubung: ${totalGroups} grup\n` +
        `• Tertaut Komunitas: ${linkedCount} / ${totalGroups} grup\n` +
        `• Dibuat Baru: ${relinkRes.newlyCreatedCount || 0}\n` +
        `• Dikoneksikan Ulang: ${relinkRes.reconnectedCount || 0}`
      ));
    } catch (rErr) {
      await reply(error('Gagal Sinkronisasi Ekosistem', rErr.message));
    }
    await reactCommand(sock, chatJid, msg, cleanCmd);
    return true;
  }

  if (cleanCmd === 'linkgroup' || cleanCmd === 'linkgrup' || cleanCmd === 'linkcommunity') {
    if (!isOwner) {
      await reply(denied('Akses Ditolak', 'Command ini khusus owner bot.'));
      return true;
    }
    const botEcosystemGroups = require('../../../lib/botEcosystemGroups');
    let targetGroupJid = chatJid;
    if (args[0] && args[0].includes('@g.us')) {
      targetGroupJid = args[0].trim();
    } else if (!isGroup) {
      await reply(warning('Petunjuk Penggunaan', 'Ketik `/linkgroup` di dalam grup yang ingin ditautkan, atau `/linkgroup <jid_grup>`.'));
      return true;
    }
    try {
      const linkRes = await botEcosystemGroups.linkGroupToCommunity(sock, targetGroupJid);
      await reply(success('Grup Berhasil Ditautkan!', `Grup *${linkRes.groupSubject}* (${linkRes.groupJid}) kini resmi tertaut ke Komunitas Polaris.`));
    } catch (lErr) {
      await reply(error('Gagal Menautkan Grup', lErr.message));
    }
    await reactCommand(sock, chatJid, msg, cleanCmd);
    return true;
  }

  if (cleanCmd === 'linkallgroups' || cleanCmd === 'linkallgrup') {
    if (!isOwner) {
      await reply(denied('Akses Ditolak', 'Command ini khusus owner bot.'));
      return true;
    }
    const botEcosystemGroups = require('../../../lib/botEcosystemGroups');
    try {
      const allRes = await botEcosystemGroups.linkAllGroupsToCommunity(sock);
      const detail = [
        `• Sukses Ditautkan (${allRes.linked.length}): ${allRes.linked.map((g) => g.name).join(', ') || '-'}`,
        `• Dilewati (${allRes.skipped.length}): ${allRes.skipped.map((g) => `${g.name} (${g.reason})`).join(', ') || '-'}`,
        allRes.failed.length > 0 ? `• Gagal (${allRes.failed.length}): ${allRes.failed.map((g) => `${g.name} (${g.error})`).join(', ')}` : '',
      ].filter(Boolean).join('\n\n');
      await reply(success('Sinkronisasi Komunitas Selesai', detail));
    } catch (allErr) {
      await reply(error('Gagal Menautkan Seluruh Grup', allErr.message));
    }
    await reactCommand(sock, chatJid, msg, cleanCmd);
    return true;
  }

  // 5. Cek Pilar-Pilar Spesifik (Sanctum, Luminary, Starlium, OmniGet, Hermes)
  if (sanctum.commandNames && sanctum.commandNames.has(cleanCmd)) {
    const handled = await sanctum.dispatch(context);
    if (handled) {
      await reactCommand(sock, chatJid, msg, cleanCmd);
      return true;
    }
  }

  if (luminary.commandNames && luminary.commandNames.has(cleanCmd)) {
    const handled = await luminary.dispatch(context);
    if (handled) {
      await reactCommand(sock, chatJid, msg, cleanCmd);
      return true;
    }
  }

  if (starlium.commandNames && starlium.commandNames.has(cleanCmd)) {
    const handled = await starlium.dispatch(context);
    if (handled) {
      await reactCommand(sock, chatJid, msg, cleanCmd);
      return true;
    }
  }

  if (mori.commandNames && mori.commandNames.has(cleanCmd)) {
    const handled = await mori.dispatch(context);
    if (handled) {
      await reactCommand(sock, chatJid, msg, cleanCmd);
      return true;
    }
  }

  if (hermes.commandNames && hermes.commandNames.has(cleanCmd)) {
    const handled = await hermes.dispatch(context);
    if (handled) {
      await reactCommand(sock, chatJid, msg, cleanCmd);
      return true;
    }
  }

  // 6. Cek Dynamic Skill Hermes: /<skill-name>
  const matchedHermesSkill = skillManager.findSkillByName(cleanCmd);
  if (matchedHermesSkill) {
    await reactWith(sock, chatJid, msg, '🧠');
    const { handleHermesSkillCommand } = require('../../../commands/hermes');
    await handleHermesSkillCommand({
      sock,
      msg,
      chatJid,
      senderNumber,
      isGroup,
      skillName: cleanCmd,
      skill: matchedHermesSkill,
      args,
      reply,
    });
    await reactWith(sock, chatJid, msg, '✅');
    return true;
  }

  // 7. Cek Command Registry Dinamis
  const cmdEntry = COMMAND_REGISTRY.get(cleanCmd);
  if (cmdEntry) {
    // A. Guard: Owner Only
    if (cmdEntry.ownerOnly && !isOwner) {
      const isPermitted = cmdPermission === 'all' || cmdPermission === 'whitelist' || cmdPermission === 'public';
      if (!isPermitted) {
        await reply(denied('Akses Ditolak', 'Command ini khusus owner bot.'));
        return true;
      }
    }

    // B. Guard: Level 1 Required (Owner atau Level 1)
    if (cmdEntry.level1Required && !isOwner && !canUseAdmin && senderLevel !== 'level1') {
      await reply(denied('Akses Ditolak', 'Command ini khusus level1 ke atas.'));
      return true;
    }

    // C. Guard: Group Only
    if (cmdEntry.groupOnly && !isGroup) {
      await reply(warning('Khusus Grup', 'Command ini cuma bisa dipakai di dalam grup.'));
      return true;
    }

    // Eksekusi Handler
    try {
      await cmdEntry.handler({
        sock,
        chatJid,
        msg,
        command: cleanCmd,
        args,
        reply,
        senderNumber,
        isOwner,
        senderLevel,
        canUseAdmin,
        isGroup,
        botStartTimestamp,
        reactWith,
        ...context,
      });
      await reactCommand(sock, chatJid, msg, cleanCmd);
      return true;
    } catch (err) {
      console.error(`[commandDispatcher] Error eksekusi /${cleanCmd}:`, err);
      await reply(error('Eksekusi Perintah Gagal', `Kendala pada /${cleanCmd}: ${err.message}`));
      return true;
    }
  }

  // 8. Cek Denia Plugins (Downloader, Maker, Explore, Tools, Sound Effects)
  if (deniaPluginLoader && typeof deniaPluginLoader.hasCommand === 'function' && deniaPluginLoader.hasCommand(cleanCmd)) {
    try {
      const queryText = args.join(' ');
      const executed = await deniaPluginLoader.executeCommand(
        cleanCmd,
        args,
        queryText,
        msg,
        sock,
        {
          chatJid,
          senderNumber,
          isGroup,
          reply,
          reactWith,
          config,
        }
      );
      if (executed) {
        await reactCommand(sock, chatJid, msg, cleanCmd);
        return true;
      }
    } catch (dErr) {
      console.error(`[deniaPlugin] Error execute ${cleanCmd}:`, dErr.message);
    }
  }

  return false;
}

module.exports = {
  dispatchCommand,
  isSpamming,
  reactCommand,
  reactWith,
  registerHandler,
  initializeDynamicCommands,
  COMMAND_REGISTRY,
};
