// lib/cleanupScheduler.js — Luminary Background Cleanup Automation for Astraonyx Ataraxia
const { clearTmpFolder, getTmpFileCount, getTmpTotalSize } = require('./tmpManager');

let cleanupIntervalTimer = null;
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // Tiap 30 menit

/**
 * Menjalankan satu siklus pembersihan folder sementara
 */
function runCleanupCycle() {
  try {
    const categories = ['media', 'downloader'];
    let totalFreed = 0;
    let totalDeleted = 0;

    for (const cat of categories) {
      const res = clearTmpFolder(cat);
      if (res && res.deletedCount > 0) {
        totalDeleted += res.deletedCount;
        totalFreed += (res.freedBytes || 0);
      }
    }

    if (totalDeleted > 0) {
      const mb = (totalFreed / 1024 / 1024).toFixed(2);
      console.log(`[Luminary Cleanup] Berhasil membersihkan ${totalDeleted} file sementara (${mb} MB terbebas).`);
    }
  } catch (err) {
    console.error('[Luminary Cleanup] Kesalahan saat menjalankan siklus pembersihan:', err.message);
  }
}

/**
 * Memulai penjadwal pembersihan otomatis di latar belakang
 */
function startCleanupScheduler(intervalMs = CLEANUP_INTERVAL_MS) {
  if (cleanupIntervalTimer) return;
  console.log('[Luminary] Scheduler pembersihan folder sementara otomatis diaktifkan.');
  // Jalankan pembersihan awal 10 detik setelah boot
  setTimeout(runCleanupCycle, 10000);
  cleanupIntervalTimer = setInterval(runCleanupCycle, intervalMs);
}

/**
 * Menghentikan penjadwal pembersihan
 */
function stopCleanupScheduler() {
  if (cleanupIntervalTimer) {
    clearInterval(cleanupIntervalTimer);
    cleanupIntervalTimer = null;
    console.log('[Luminary] Scheduler pembersihan folder sementara dihentikan.');
  }
}

module.exports = {
  startCleanupScheduler,
  stopCleanupScheduler,
  runCleanupCycle,
};
