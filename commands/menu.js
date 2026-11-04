// commands/menu.js — Menu Interaktif & Direktori Fitur Polaris Project
// Desain monokromatis mewah Astraonyx Ataraxia dengan layout kotak editorial premium
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { COMMANDS } = require('../lib/commandRegistry');
const { getCustomFeatures, getCommandOverrides } = require('../lib/commandOverridesHelper');
const { formatDuration } = require('./group-utility');
const rpgEngine = require('../lib/rpgEngine');

// Helper untuk format teks kategori kotak monokromatis mewah
function renderCategoryBox(title, commands, prefix) {
  let out = `┏『 *\`乂 ${title.toUpperCase()} 乂\`* 』━⊱\n`;
  for (const cmd of commands) {
    const desc = cmd.desc ? ` — _${cmd.desc}_` : '';
    out += `│⦿ 〔 *${prefix}${cmd.name}*${desc}\n`;
  }
  out += `◣──────────❈\n\n`;
  return out;
}

// Ambil info tingkatan pengguna dari auth database jika tersedia
function getUserTier(senderNumber, isOwnerFlag) {
  if (isOwnerFlag) {
    return { name: 'Cosmos (Supreme Owner)', badge: '👑🌌', level: 10 };
  }
  try {
    const auth = require('../server/auth');
    if (typeof auth.getRoleInfo === 'function') {
      const cleanPhone = String(senderNumber || '').replace(/\D/g, '');
      const users = auth.getAllWunaUsers ? auth.getAllWunaUsers() : [];
      const found = users.find(
        (u) => u.phoneNumber && u.phoneNumber.replace(/\D/g, '') === cleanPhone
      );
      if (found && found.role) {
        return auth.getRoleInfo(found.role);
      }
    }
  } catch (_) {}
  return { name: 'Member (Stardust Citizen)', badge: '🔰', level: 1 };
}

async function handleMenuCommand({
  sock,
  chatJid,
  msg,
  senderNumber,
  pushName,
  isOwnerFlag,
  args,
  reply,
  command,
  botStartTimestamp,
}) {
  const prefix = config.prefix || '/';
  const botName = (config.botName || 'POLARIS').toUpperCase();

  // Pastikan plugin tambahan termuat secara aman
  try {
    const deniaPluginLoader = require('../lib/deniaPluginLoader');
    if (typeof deniaPluginLoader.loadPlugins === 'function') {
      await deniaPluginLoader.loadPlugins();
    }
  } catch (_) {}

  // Load custom commands & overrides
  const overrides = getCommandOverrides();
  const customFeats = getCustomFeatures();

  const customCmdList = Object.values(customFeats || {})
    .filter((f) => f && f.enabled !== false)
    .map((f) => ({
      name: f.name,
      category: f.category || 'Kustom Web',
      desc: f.desc || (f.response ? (f.response.length > 50 ? f.response.slice(0, 47) + '...' : f.response) : 'Command kustom'),
      ownerOnly: Boolean(f.permission === 'owner' || f.ownerOnly),
    }));

  const activeBuiltIns = COMMANDS.filter((cmd) => {
    if (overrides[cmd.name] && overrides[cmd.name].enabled === false) {
      return false;
    }
    return true;
  });

  const allAvailable = [...activeBuiltIns, ...customCmdList];

  // Tambahkan skill Hermes AI jika ada
  try {
    const skillManager = require('../server/skillManager');
    const hermesSkills = skillManager.getCustomTools().map((s) => ({
      name: s.rawName || s.name,
      category: 'Hermes AI',
      desc: s.description || 'Keahlian otonom Hermes Neural Agent',
      ownerOnly: false,
    }));
    allAvailable.push(...hermesSkills);
  } catch (_) {}

  const visibleCommands = allAvailable.filter((c) => !c.ownerOnly || isOwnerFlag);

  // Ambil Data RPG & EXP Pengguna
  let userRpg = { level: 1, exp: 0, money: 0, bank: 0 };
  try {
    if (senderNumber && typeof rpgEngine.getUser === 'function') {
      userRpg = rpgEngine.getUser(senderNumber) || userRpg;
    }
  } catch (_) {}

  const level = userRpg.level || 1;
  const exp = userRpg.exp || 0;
  const maxExp = 1000 * level;
  const percent = Math.min(Math.floor((exp / maxExp) * 100), 100);
  const bar = '■'.repeat(Math.floor(percent / 10)) + '□'.repeat(10 - Math.floor(percent / 10));
  const saldo = (userRpg.money || 0).toLocaleString('id-ID');
  const bank = (userRpg.bank || 0).toLocaleString('id-ID');

  const tier = getUserTier(senderNumber, isOwnerFlag);
  const userName = pushName || (senderNumber ? `+${senderNumber}` : 'Pengguna');
  const userPhone = senderNumber ? `+${senderNumber}` : '-';

  // Telemetri Sistem & Runtime
  const uptimeMs = botStartTimestamp
    ? (Math.floor(Date.now() / 1000) - botStartTimestamp) * 1000
    : process.uptime() * 1000;
  const uptimeStr = formatDuration(uptimeMs);

  const nowJakarta = new Date();
  const timeStr = nowJakarta.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour12: false,
  });
  const dateStr = nowJakarta.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Header Telemetri & Info Pengguna (Typografi Editorial Premium Astraonyx)
  const headerCard = `╔═══════════════════════════════╗
   ✦ ${botName} MULTI-BOT OS ✦
  Cluster Telemetry & Neural Network
╚═══════════════════════════════╝

◤───「 \`INFO USER\` 」──✦
> ⎆  [ Nama   : ${userName}
> ⎆  [ Nomor  : ${userPhone}
> ⎆  [ Tingkat: ${tier.badge} ${tier.name}
> ⎆  [ Level  : Lv.${level} [${bar}] ${percent}%
> ⎆  [ Saldo  : Rp ${saldo}
> ⎆  [ Bank   : Rp ${bank}
> ⎆  [ Mode   : Multi-Device (Baileys v6.0)
◣──────────❈

◤───「 \`INFO BOT & CLUSTER\` 」──✦
> ⎆  [ Runtime: ${uptimeStr}
> ⎆  [ Versi  : v2.8.0 Obsidian Master
> ⎆  [ Respon : Aktif (Low Latency)
> ⎆  [ Tanggal: ${dateStr}
> ⎆  [ Waktu  : ${timeStr} WIB
> ⎆  [ Prefix : ${prefix}
◣─────────────✦`;

  // Pemetaan Kategori Terstruktur
  const categoryAliases = {
    dwnld: 'Downloader',
    downloader: 'Downloader',
    unduh: 'Downloader',
    download: 'Downloader',
    rpg: 'Game & RPG',
    game: 'Game & RPG',
    fun: 'Game & RPG',
    games: 'Game & RPG',
    ai: 'AI & Hermes',
    hermes: 'AI & Hermes',
    neural: 'AI & Hermes',
    tools: 'Tools & Media',
    tool: 'Tools & Media',
    media: 'Tools & Media',
    maker: 'Tools & Media',
    group: 'Group & Moderasi',
    grup: 'Group & Moderasi',
    admin: 'Group & Moderasi',
    anon: 'Anonymous & Menfess',
    anonymous: 'Anonymous & Menfess',
    menfess: 'Anonymous & Menfess',
    owner: 'Owner & Cosmos',
    cosmos: 'Owner & Cosmos',
  };

  const categories = {
    'Downloader': [],
    'Game & RPG': [],
    'AI & Hermes': [],
    'Tools & Media': [],
    'Group & Moderasi': [],
    'Anonymous & Menfess': [],
    'Owner & Cosmos': [],
    'Lainnya': [],
  };

  for (const cmd of visibleCommands) {
    const rawCat = (cmd.category || '').toLowerCase();
    if (rawCat.includes('down') || rawCat.includes('unduh')) {
      categories['Downloader'].push(cmd);
    } else if (rawCat.includes('game') || rawCat.includes('rpg') || rawCat.includes('fun')) {
      categories['Game & RPG'].push(cmd);
    } else if (rawCat.includes('ai') || rawCat.includes('hermes') || rawCat.includes('neural')) {
      categories['AI & Hermes'].push(cmd);
    } else if (rawCat.includes('tool') || rawCat.includes('maker') || rawCat.includes('media') || rawCat.includes('stiker')) {
      categories['Tools & Media'].push(cmd);
    } else if (rawCat.includes('group') || rawCat.includes('grup') || rawCat.includes('admin') || rawCat.includes('kunci')) {
      categories['Group & Moderasi'].push(cmd);
    } else if (rawCat.includes('anon') || rawCat.includes('menfess')) {
      categories['Anonymous & Menfess'].push(cmd);
    } else if (rawCat.includes('owner') || rawCat.includes('whitelist') || rawCat.includes('cosmos')) {
      categories['Owner & Cosmos'].push(cmd);
    } else {
      categories['Lainnya'].push(cmd);
    }
  }

  // Cek argumen (misal: /menu dwnld, /menu rpg, /allmenu, /menu <command>)
  const firstArg = (args && args[0]) ? args[0].toLowerCase().replace(new RegExp(`^\\${prefix}`), '') : null;
  const isAllMenu = command === 'allmenu' || firstArg === 'all' || firstArg === 'allmenu';

  let finalMenuText = '';

  // Kasus 1: Detail 1 Command Spesifik (/menu <nama_command>)
  if (firstArg && !isAllMenu && !categoryAliases[firstArg]) {
    const targetCmd = visibleCommands.find((c) => c.name.toLowerCase() === firstArg);
    if (targetCmd) {
      finalMenuText = `${headerCard}\n\n┏『 *\`乂 DETAIL COMMAND: ${prefix}${targetCmd.name} 乂\`* 』━⊱
│⦿ 〔 *Nama Perintah* : ${prefix}${targetCmd.name}
│⦿ 〔 *Kategori*      : ${targetCmd.category || 'Umum'}
│⦿ 〔 *Hak Akses*     : ${targetCmd.ownerOnly ? '👑 Owner / Cosmos' : '🟢 Bebas / Publik'}
│⦿ 〔 *Deskripsi*     : ${targetCmd.desc || 'Tidak ada deskripsi'}
◣──────────❈

> _Ketik \`${prefix}menu\` untuk kembali ke daftar menu utama._`;
    }
  }

  // Kasus 2: Tampilkan 1 Kategori Tertentu (/menu dwnld, /menu rpg, dll)
  if (!finalMenuText && firstArg && categoryAliases[firstArg]) {
    const selectedCategory = categoryAliases[firstArg];
    const cmds = categories[selectedCategory] || [];
    finalMenuText = `${headerCard}\n\n${renderCategoryBox(selectedCategory, cmds, prefix)}> _Ketik \`${prefix}menu\` untuk melihat modul lain atau \`${prefix}allmenu\` untuk seluruh fitur._`;
  }

  // Kasus 3: Seluruh Menu Lengkap (/allmenu atau /menu all)
  if (!finalMenuText && isAllMenu) {
    let allBody = '';
    for (const [catName, cmds] of Object.entries(categories)) {
      if (cmds.length > 0) {
        allBody += renderCategoryBox(catName, cmds, prefix);
      }
    }
    finalMenuText = `${headerCard}\n\n${allBody.trim()}\n\n> _Gunakan \`${prefix}menu <nama_command>\` untuk instruksi detail setiap perintah._`;
  }

  // Kasus 4: Menu Utama Ringkas (/menu tanpa argumen)
  if (!finalMenuText) {
    finalMenuText = `${headerCard}

_Selamat datang di sistem kendali ${botName}!_
_Silakan pilih modul menu di bawah atau ketik perintah langsung:_

┏『 *\`乂 ᴋ ᴀ ᴛ ᴇ ɢ ᴏ ʀ ɪ - ᴍᴇɴᴜ 乂\`* 』━⊱
│⦿ 〔 *${prefix}allmenu* ➔ Seluruh 100+ Fitur Terbuka
│⦿ 〔 *${prefix}menu dwnld* ➔ 3-Layer Downloader Media
│⦿ 〔 *${prefix}menu rpg* ➔ Game & RPG Dual EXP Fusion
│⦿ 〔 *${prefix}menu ai* ➔ Hermes Neural AI & Studio
│⦿ 〔 *${prefix}menu tools* ➔ Stiker, Maker & Audio Tools
│⦿ 〔 *${prefix}menu group* ➔ Moderasi & Pengaturan Grup
│⦿ 〔 *${prefix}menu anon* ➔ Anonymous Chat & Menfess WA
│⦿ 〔 *${prefix}menu owner* ➔ Sanctum Cosmos Hub Control
◣──────────❈

> 💡 _Tips: Ketik \`${prefix}menu <nama_command>\` untuk melihat manual detail command tertentu (contoh: \`${prefix}menu dwnld\` atau \`${prefix}menu mining\`)._
> ⚡ _Total ${visibleCommands.length} perintah aktif siap digunakan._`;
  }

  // Thumbnail GIF/Video Hitam Putih Monokrom (Aesthetic Noir Looping)
  const localMp4Path = path.join(__dirname, '..', 'assets', 'media', 'menu_monochrome.mp4');
  const localGifPath = path.join(__dirname, '..', 'assets', 'media', 'menu_monochrome.gif');

  let mediaPayload = null;
  if (fs.existsSync(localMp4Path)) {
    try {
      mediaPayload = {
        video: fs.readFileSync(localMp4Path),
        gifPlayback: true,
      };
    } catch (_) {}
  } else if (fs.existsSync(localGifPath)) {
    try {
      mediaPayload = {
        video: fs.readFileSync(localGifPath),
        gifPlayback: true,
      };
    } catch (_) {}
  }

  if (!mediaPayload) {
    mediaPayload = {
      video: { url: 'https://media.giphy.com/media/4ilFRqgbzbx4c/giphy.mp4' },
      gifPlayback: true,
    };
  }

  // Kirim dengan video GIF playback dan externalAdReply aesthetic
  if (sock && chatJid) {
    try {
      await sock.sendMessage(
        chatJid,
        {
          ...mediaPayload,
          caption: finalMenuText,
          contextInfo: {
            mentionedJid: senderNumber ? [`${senderNumber}@s.whatsapp.net`] : [],
            externalAdReply: {
              title: `✦ ${botName} MULTI-BOT OS ✦`,
              body: `Cluster Status: ONLINE • Node Polaris Core`,
              thumbnailUrl: 'https://media.giphy.com/media/4ilFRqgbzbx4c/giphy.gif',
              sourceUrl: 'https://github.com/Astraonyx',
              mediaType: 1,
              renderLargerThumbnail: true,
            },
          },
        },
        msg ? { quoted: msg } : {}
      );
      return;
    } catch (err) {
      console.error('[menu] Pengiriman thumbnail media gagal, fallback ke teks:', err.message);
    }
  }

  // Fallback standar ke reply teks jika soket/media tidak merespon
  await reply(finalMenuText);
}

module.exports = { handleMenuCommand };
