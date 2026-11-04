// lib/sandboxAgent.js — Auto-Conversational AI untuk Grup "Polaris • AI Agent Sandbox"
const botEcosystemGroups = require('./botEcosystemGroups');
const { askAI } = require('./aiHelper');
const config = require('../config');
const waFormatter = require('./whatsappFormatter');

const sandboxHistory = []; // riwayat percakapan khusus grup sandbox
const MAX_SANDBOX_HISTORY = 16;

/**
 * Memeriksa apakah chat berasal dari grup Polaris • AI Agent Sandbox
 */
function isSandboxChat(chatJid) {
  if (!chatJid) return false;
  const saved = botEcosystemGroups.getSavedData();
  const sandboxGid = saved.groups?.sandbox?.jid;
  return sandboxGid && chatJid === sandboxGid;
}

/**
 * Menangani obrolan bebas di grup sandbox secara interaktif
 */
async function handleSandboxChat(sock, msg, text) {
  if (!sock || !msg || !text || msg.key.fromMe) return false;

  const chatJid = msg.key.remoteJid;
  if (!isSandboxChat(chatJid)) return false;

  const trimmed = text.trim();
  // JANGAN ladeni dengan AI jika pesan diawali prefix command (seperti . atau / atau ! atau #)
  // Biarkan command handler yang mengeksekusi pesan command
  if (
    trimmed.startsWith('.') ||
    trimmed.startsWith('/') ||
    (config.prefix && trimmed.startsWith(config.prefix)) ||
    trimmed.startsWith('!') ||
    trimmed.startsWith('#')
  ) {
    return false;
  }

  try {
    // Kirim react tanda berpikir 🧠
    await sock.sendMessage(chatJid, { react: { text: '🧠', key: msg.key } }).catch(() => {});

    sandboxHistory.push({ role: 'user', text });
    while (sandboxHistory.length > MAX_SANDBOX_HISTORY) sandboxHistory.shift();

    const result = await askAI(text, config, sandboxHistory);

    if (!result.success || !result.text) {
      await sock.sendMessage(chatJid, {
        text: `⚠️ *[Sandbox AI Notice]*: Maaf, belum dapat merespon (${result.error || 'Unknown error'}). Pastikan API Key AI aktif.`,
      }, { quoted: msg });
      return true;
    }

    sandboxHistory.push({ role: 'assistant', text: result.text });
    while (sandboxHistory.length > MAX_SANDBOX_HISTORY) sandboxHistory.shift();

    const formatted = waFormatter.formatForWhatsApp(result.text);
    const replyText = [
      `🧠 *[POLARIS AI SANDBOX]*`,
      `──────────────────────────────`,
      formatted,
    ].join('\n');

    await sock.sendMessage(chatJid, { text: replyText }, { quoted: msg });
    await sock.sendMessage(chatJid, { react: { text: '✨', key: msg.key } }).catch(() => {});
    return true;
  } catch (err) {
    console.error('[SandboxAgent] Error:', err.message);
    return false;
  }
}

module.exports = {
  isSandboxChat,
  handleSandboxChat,
};
