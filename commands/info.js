// commands/info.js — Informasi Ekosistem Resmi Astraonyx Ataraxia & Telemetri Server
const os = require('os');
const process = require('process');
const config = require('../config');
const { formatDuration } = require('./group-utility');
const { box } = require('../lib/messageStyle');

function formatRam(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function handleInfoCommand({ sock, chatJid, msg, senderNumber, isOwnerFlag, reply, botStartTimestamp }) {
  const uptimeMs = botStartTimestamp
    ? (Math.floor(Date.now() / 1000) - botStartTimestamp) * 1000
    : process.uptime() * 1000;
  const uptimeStr = formatDuration(uptimeMs);

  const memory = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  const nodeVersion = process.version;
  const platform = `${os.type()} ${os.release()} (${os.arch()})`;
  const prefix = config.prefix || '/';
  const botName = config.botName || 'Polaris';
  const instanceId = process.env.INSTANCE_ID || config.instanceId || 'primary';
  const port = process.env.PORT || config.dashboardPort || 3000;

  const infoText = `╔═════════════════════════════════╗
   ✦ ASTRAONYX ATARAXIA ECOSYSTEM ✦
  Multi-Process High-Resilience OS
╚═════════════════════════════════╝

◤───「 PILAR RESMI SUB-PROJECT 」──✦
> 🌌 Astraonyx Ataraxia: Master Platform & Ecosystem
> 🌐 Polarium: Web Platform & Dashboard (Port ${port})
> ⚡ Polaris: WhatsApp Bot Core Engine (Baileys)
> 🛡️ Sanctum: 2FA/PIN, Anti-Virtex & Rate Limiter
> 📥 Mori: Multi-Platform Media Processing Studio
> 👑 Wuna: Official Tier, Identity & Role Engine
> ⏰ Luminary: Automated Background Cron & Schedulers
> 🎮 Starlium: AI Gamification, Neural RPG & Arena
> 🧠 Hermes: Autonomous Multi-Modal AI Assistant
◣─────────────────────────────────✦

◤───「 HOST & TELEMETRI SERVER 」──✦
> ⎆ [ Instance ID  : ${instanceId}
> ⎆ [ Engine       : Node.js ${nodeVersion}
> ⎆ [ OS Platform  : ${platform}
> ⎆ [ Bot Uptime   : ${uptimeStr}
> ⎆ [ Heap Used    : ${formatRam(memory.heapUsed)} / ${formatRam(memory.heapTotal)}
> ⎆ [ RSS Memory   : ${formatRam(memory.rss)}
> ⎆ [ System RAM   : ${formatRam(usedMem)} / ${formatRam(totalMem)}
> ⎆ [ Prefix       : ${prefix}
◣─────────────────────────────────✦

> 💡 _Polarium Dashboard: http://localhost:${port}_
> ⚡ _API Health Status: http://localhost:${port}/api/bot/status_`;

  await reply(infoText);
}

module.exports = {
  name: 'info',
  category: 'Umum',
  desc: 'Menampilkan arsitektur resmi pilar ekosistem Astraonyx Ataraxia & telemetri server.',
  handleInfoCommand,
  execute: async (sock, msg, args, context) => {
    return handleInfoCommand({
      sock,
      chatJid: msg.key.remoteJid,
      msg,
      senderNumber: context.senderNumber,
      isOwnerFlag: context.isOwnerFlag,
      reply: context.reply,
      botStartTimestamp: context.botStartTimestamp,
    });
  },
};
