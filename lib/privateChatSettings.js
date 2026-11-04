// lib/privateChatSettings.js — Setting per chat pribadi (bukan grup).
// Terpisah dari groupSettings.js supaya tidak nyampur logic grup vs DM.
// Sekarang cuma dipakai untuk antidelete, tapi terbuka untuk fitur lain nanti.

const fs = require('fs');
const config = require('../config');

function defaultSettings() {
  return {
    antidelete: false,
  };
}

function loadPrivateChatSettings() {
  try {
    const raw = fs.readFileSync(config.paths.privateChatSettings, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    // File belum ada (wajar di first-run) -> mulai dari kosong, jangan log sebagai error.
    if (err.code !== 'ENOENT') {
      console.error('[privateChatSettings] Gagal baca privateChatSettings.json:', err.message);
    }
    return { chats: {} };
  }
}

function savePrivateChatSettings(data) {
  fs.writeFileSync(config.paths.privateChatSettings, JSON.stringify(data, null, 2));
}

function getChatSettings(chatJid) {
  const data = loadPrivateChatSettings();
  return data.chats[chatJid] || null;
}

function updateChatSettings(chatJid, updater) {
  const data = loadPrivateChatSettings();
  if (!data.chats[chatJid]) {
    data.chats[chatJid] = defaultSettings();
  }
  updater(data.chats[chatJid]);
  savePrivateChatSettings(data);
  return data.chats[chatJid];
}

module.exports = {
  defaultSettings,
  loadPrivateChatSettings,
  savePrivateChatSettings,
  getChatSettings,
  updateChatSettings,
};
