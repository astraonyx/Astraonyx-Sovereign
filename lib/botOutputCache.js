// lib/botOutputCache.js — Cache Penyimpanan Pesan & Output Bot Terkini untuk Fitur Edit
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.resolve(__dirname, '../database/bot_outputs_cache.json');
const MAX_CACHE = 60;

function getCachedOutputs() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    }
  } catch (_) {}
  return [];
}

function recordBotOutput({ id, chatJid, text, command = 'general' }) {
  if (!id || !chatJid || !text) return;
  try {
    const list = getCachedOutputs();
    list.unshift({
      id,
      chatJid,
      text: String(text).slice(0, 4000),
      command,
      timestamp: new Date().toISOString(),
    });
    const trimmed = list.slice(0, MAX_CACHE);
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
  } catch (err) {
    console.error('[botOutputCache] Gagal mencatat output:', err.message);
  }
}

function updateCachedOutput(id, newText) {
  try {
    const list = getCachedOutputs();
    const item = list.find((m) => m.id === id);
    if (item) {
      item.text = newText;
      item.editedAt = new Date().toISOString();
      fs.writeFileSync(CACHE_FILE, JSON.stringify(list, null, 2), 'utf-8');
    }
  } catch (_) {}
}

module.exports = {
  recordBotOutput,
  getCachedOutputs,
  updateCachedOutput,
};
