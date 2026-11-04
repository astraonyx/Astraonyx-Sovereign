// commands/status.js — Command /status untuk cek status level whitelist & bot info
const config = require('../config');
const { isOwner, getLevel } = require('../lib/accessControl');
const { formatDuration } = require('./group-utility');

module.exports = {
  name: 'status',
  category: 'Umum',
  desc: 'Menampilkan status level hak akses pengguna dan info bot.',
  async execute(sock, msg, args, { reply, senderNumber, botStartTimestamp }) {
    const level = getLevel(senderNumber);
    let roleTitle = 'Member Biasa';
    let roleBadge = '👤 Pengguna Standar';
    let accessDesc = 'Akses fitur standar bot.';

    if (isOwner(senderNumber)) {
      roleTitle = '👑 BOT OWNER';
      roleBadge = 'Full Root / Master Access';
      accessDesc = 'Memiliki kontrol penuh atas seluruh bot, cluster, grup, dan whitelist.';
    } else if (level === 'level1') {
      roleTitle = '⭐ WHITELIST LEVEL 1';
      roleBadge = 'Admin / Moderator Access';
      accessDesc = 'Diizinkan menggunakan command admin grup, moderasi, AI, dan utility.';
    } else if (level === 'level2') {
      roleTitle = '🔹 WHITELIST LEVEL 2';
      roleBadge = 'Standard Whitelist Access';
      accessDesc = 'Diizinkan menggunakan command standar, downloader, dan AI.';
    }

    const uptimeMs = botStartTimestamp ? (Math.floor(Date.now() / 1000) - botStartTimestamp) * 1000 : process.uptime() * 1000;
    const uptimeStr = formatDuration(uptimeMs);
    const instanceId = process.env.INSTANCE_ID || 'primary';
    const botName = process.env.BOT_NAME || config.botName || 'Polaris';

    const text = `╭───「 🌟 STATUS PENGGUNA 」
│ ◈ Pengirim: @${senderNumber}
│ ◈ Hak Akses: *${roleTitle}*
│ ◈ Level Badge: ${roleBadge}
│ ◈ Deskripsi: ${accessDesc}
├───────────────────────────
│ ◈ Nama Bot: *${botName}*
│ ◈ Instance ID: \`${instanceId}\`
│ ◈ Prefix: \`${config.prefix}\`
│ ◈ Status Baileys: 🟢 *CONNECTED*
│ ◈ Uptime: ${uptimeStr}
╰───────────────────────────`;

    await reply(text, { mentions: [`${senderNumber}@s.whatsapp.net`] });
  },
};
