// lib/autoResponderEngine.js — Visual Auto-Responder Rule Engine
const { autoResponderQueries, analyticsQueries } = require('../server/db');
const { isGroupJid, jidToNumber } = require('./helpers');
const config = require('../config');

let cachedRules = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 10000; // 10 detik

function getActiveRules() {
  const now = Date.now();
  if (cachedRules && (now - lastCacheTime < CACHE_TTL_MS)) {
    return cachedRules;
  }
  try {
    cachedRules = autoResponderQueries.getActive.all();
    lastCacheTime = now;
    return cachedRules;
  } catch (err) {
    console.error('[autoResponder] Gagal memuat aturan:', err.message);
    return [];
  }
}

function invalidateRuleCache() {
  cachedRules = null;
  lastCacheTime = 0;
}

function extractMessageText(msg) {
  if (!msg || !msg.message) return '';
  const m = msg.message;
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    ''
  ).trim();
}

/**
 * Memeriksa apakah pesan memicu aturan auto-responder dan mengirimkan balasannya
 */
async function checkAndReply(sock, msg) {
  if (!sock || !msg || !msg.key) return false;
  if (msg.key.fromMe) return false; // Jangan balas pesan bot sendiri

  const chatJid = msg.key.remoteJid;
  const isGroup = isGroupJid(chatJid);
  const text = extractMessageText(msg);
  if (!text) return false;

  const rules = getActiveRules();
  if (!rules || rules.length === 0) return false;

  const senderJid = isGroup ? (msg.key.participant || msg.participant) : chatJid;
  const senderNumber = jidToNumber(senderJid);
  const pushName = msg.pushName || senderNumber;

  for (const rule of rules) {
    // 1. Cek Scope
    if (rule.scope === 'group' && !isGroup) continue;
    if (rule.scope === 'private' && isGroup) continue;

    // 2. Cek Pattern Matching
    const keyword = (rule.keyword || '').trim();
    if (!keyword) continue;

    let isMatch = false;
    const lowerText = text.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();

    switch (rule.match_type) {
      case 'exact':
        isMatch = lowerText === lowerKeyword;
        break;
      case 'starts_with':
        isMatch = lowerText.startsWith(lowerKeyword);
        break;
      case 'regex':
        try {
          const reg = new RegExp(keyword, 'i');
          isMatch = reg.test(text);
        } catch (_) {
          isMatch = false;
        }
        break;
      case 'contains':
      default:
        isMatch = lowerText.includes(lowerKeyword);
        break;
    }

    if (isMatch) {
      // 3. Format Template Variables
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

      let replyContent = rule.response_content || '';
      replyContent = replyContent
        .replace(/\{name\}/gi, pushName)
        .replace(/\{sender\}/gi, `@${senderNumber}`)
        .replace(/\{number\}/gi, senderNumber)
        .replace(/\{time\}/gi, timeStr)
        .replace(/\{date\}/gi, dateStr)
        .replace(/\{botName\}/gi, config.botName || 'Polaris');

      // 4. Kirim Balasan Sesuai Tipe
      try {
        const mentions = [senderJid];

        if (rule.response_type === 'image' && rule.media_url) {
          await sock.sendMessage(chatJid, {
            image: { url: rule.media_url },
            caption: replyContent,
            mentions,
          }, { quoted: msg });
        } else if (rule.response_type === 'sticker' && rule.media_url) {
          await sock.sendMessage(chatJid, {
            sticker: { url: rule.media_url },
          }, { quoted: msg });
        } else {
          // Default text
          await sock.sendMessage(chatJid, {
            text: replyContent,
            mentions,
          }, { quoted: msg });
        }

        // Catat statistik
        try {
          analyticsQueries.incrementMetric('message_count');
          if (isGroup) {
            analyticsQueries.recordGroupActivity(chatJid, msg.key.remoteJidAlt || chatJid);
          }
        } catch (_) {}

        return true; // Berhasil menangani auto-responder
      } catch (sendErr) {
        console.error('[autoResponder] Gagal mengirim balasan:', sendErr.message);
      }
    }
  }

  return false;
}

module.exports = {
  checkAndReply,
  getActiveRules,
  invalidateRuleCache,
  extractMessageText,
};
