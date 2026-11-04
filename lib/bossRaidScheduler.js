// lib/bossRaidScheduler.js — Scheduler Harian Boss Raid (Otomatis Spawn Jam 8 Malam / 20:00 WIB)
const { db } = require('../server/db');
const bossRaidEngine = require('./bossRaidEngine');
const { loadGroupSettings } = require('./groupSettings');

let lastSpawnDateKey = ''; // 'YYYY-MM-DD'
let schedulerInterval = null;

function getJakartaTime() {
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  return new Date(utc + 3600000 * 7); // UTC + 7 (WIB)
}

/**
 * Memulai scheduler pengecekan jam 20:00 WIB
 */
function startBossRaidScheduler(sock) {
  if (schedulerInterval) clearInterval(schedulerInterval);

  console.log('[bossRaidScheduler] Scheduler Boss Raid aktif (Otomatis spawn jam 20:00 WIB / 8 PM).');

  schedulerInterval = setInterval(async () => {
    try {
      const nowWib = getJakartaTime();
      const hour = nowWib.getHours();
      const minute = nowWib.getMinutes();
      const dateKey = nowWib.toISOString().slice(0, 10);

      // Cek apakah jam 20:00 WIB dan belum spawn hari ini
      if (hour === 20 && minute === 0 && lastSpawnDateKey !== dateKey) {
        lastSpawnDateKey = dateKey;
        console.log(`[bossRaidScheduler] 🚨 Waktu 20:00 WIB tercapai! Memulai Boss Raid harian di grup...`);
        await triggerScheduledRaid(sock);
      }
    } catch (err) {
      console.error('[bossRaidScheduler] Error scheduler tick:', err.message);
    }
  }, 60 * 1000); // Cek tiap 60 detik
}

/**
 * Eksekusi spawn boss di seluruh grup yang memenuhi syarat
 */
async function triggerScheduledRaid(sock) {
  if (!sock) return;

  // 1. Ambil grup yang mengaktifkan rank di database SQLite
  let targetGroups = [];
  try {
    const rows = db.prepare(`SELECT group_jid FROM group_rank_settings WHERE is_enabled = 1`).all();
    targetGroups = rows.map((r) => r.group_jid);
  } catch (_) {}

  // 2. Fallback jika belum ada group_rank_settings, gunakan grup allowed yang aktif
  if (targetGroups.length === 0) {
    try {
      const settings = loadGroupSettings();
      targetGroups = Object.keys(settings.allowedGroups || {});
    } catch (_) {}
  }

  if (targetGroups.length === 0) {
    console.log('[bossRaidScheduler] Tidak ada grup aktif yang terdaftar untuk Boss Raid.');
    return;
  }

  for (const groupJid of targetGroups) {
    try {
      await bossRaidEngine.startRaid(sock, groupJid, true);
      console.log(`[bossRaidScheduler] ✅ Boss Raid berhasil di-spawn di grup: ${groupJid}`);
      // Jeda 2 detik antar grup agar koneksi socket stabil
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (gErr) {
      console.error(`[bossRaidScheduler] Gagal spawn di grup ${groupJid}:`, gErr.message);
    }
  }
}

module.exports = {
  startBossRaidScheduler,
  triggerScheduledRaid,
  getJakartaTime,
};
