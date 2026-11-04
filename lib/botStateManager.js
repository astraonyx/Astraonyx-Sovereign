// lib/botStateManager.js — Manajer Status Operasional Bot Polaris (/bot stop & /bot start)
// Mengatur mode senyap bot, memastikan tidak ada pesan/balasan/error yang keluar saat bot di-stop,
// dan hanya merespon perintah /bot start oleh Owner.

const fs = require('fs');
const path = require('path');
const config = require('../config');

const STATE_FILE = path.resolve(__dirname, '../database/bot_state.json');

// Default state: Bot aktif
let currentState = {
  isStopped: false,
  stoppedAt: null,
  stoppedBy: null,
  reason: '',
  updatedAt: new Date().toISOString(),
};

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        currentState = {
          ...currentState,
          ...parsed,
          isStopped: Boolean(parsed.isStopped),
        };
      }
    }
  } catch (err) {
    console.error('[botStateManager] Gagal membaca state bot dari file:', err.message);
  }
  return currentState;
}

function saveState() {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    currentState.updatedAt = new Date().toISOString();
    fs.writeFileSync(STATE_FILE, JSON.stringify(currentState, null, 2), 'utf-8');
  } catch (err) {
    console.error('[botStateManager] Gagal menyimpan state bot ke file:', err.message);
  }
}

// Inisialisasi awal saat modul dimuat
loadState();

function isBotStopped() {
  return Boolean(currentState.isStopped);
}

function stopBot(byUser = 'Owner', reason = 'Manual stop via /bot stop') {
  currentState.isStopped = true;
  currentState.stoppedAt = new Date().toISOString();
  currentState.stoppedBy = String(byUser || 'Owner');
  currentState.reason = String(reason || '');
  saveState();
  console.log(`[botStateManager] 🔴 BOT DIHENTIKAN oleh ${currentState.stoppedBy}. Mode senyap aktif.`);
  return currentState;
}

function startBot(byUser = 'Owner') {
  currentState.isStopped = false;
  currentState.stoppedAt = null;
  currentState.stoppedBy = String(byUser || 'Owner');
  currentState.reason = 'Resumed via /bot start';
  saveState();
  console.log(`[botStateManager] 🟢 BOT DIAKTIFKAN KEMBALI oleh ${currentState.stoppedBy}. Operasi normal.`);
  return currentState;
}

function getBotState() {
  return { ...currentState };
}

module.exports = {
  isBotStopped,
  stopBot,
  startBot,
  getBotState,
};
