// lib/messageCache.js — Cache pesan in-memory, dipakai untuk .delchat (bulk delete).
// Hanya nyimpen data seperlunya (key + fromMe + participant + timestamp),
// bukan isi pesan. Hilang kalau bot restart — itu OK, bulk delete cuma
// relevan untuk pesan yang masih "baru" selama bot nyala.

const { normalizeNumber, jidToNumber } = require('./helpers');

const MAX_PER_CHAT = 200; // cap per chat, biar memory nggak bengkak di grup rame

// Map<chatJid, Array<{ key, fromMe, participant, timestamp }>>
const cache = new Map();

function recordMessage(chatJid, msg) {
  if (!chatJid || !msg?.key?.id) return;

  if (!cache.has(chatJid)) {
    cache.set(chatJid, []);
  }
  const list = cache.get(chatJid);

  list.push({
    key: msg.key,
    fromMe: Boolean(msg.key.fromMe),
    participant: msg.key.participant || msg.key.participantAlt || null,
    timestamp: Number(msg.messageTimestamp) || Math.floor(Date.now() / 1000),
  });

  if (list.length > MAX_PER_CHAT) {
    list.splice(0, list.length - MAX_PER_CHAT);
  }
}

// Ambil N key pesan terakhir dari bot sendiri di chat tsb (buat .delchat <n>)
function getLastBotMessages(chatJid, count) {
  const list = cache.get(chatJid) || [];
  return list
    .filter((m) => m.fromMe)
    .slice(-count)
    .map((m) => m.key);
}

// Ambil N key pesan terakhir dari participant tertentu di chat tsb (buat .delchat <n> @user)
// Cocokkan lewat nomor yang sudah dinormalisasi, bukan string JID mentah,
// karena participant tercache dan mentionedJid yang dikirim WhatsApp bisa
// berbeda skema (@lid vs @s.whatsapp.net) untuk orang yang sama.
function getLastMessagesFromUser(chatJid, participantJid, count) {
  const targetNumber = normalizeNumber(jidToNumber(participantJid));
  const list = cache.get(chatJid) || [];
  return list
    .filter((m) => m.participant && normalizeNumber(jidToNumber(m.participant)) === targetNumber)
    .slice(-count)
    .map((m) => m.key);
}

module.exports = { recordMessage, getLastBotMessages, getLastMessagesFromUser };
