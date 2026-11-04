// lib/reminderScheduler.js — Scheduler auto-reminder harian per grup.
// Cek tiap menit, kirim pesan ke grup yang jadwalnya cocok dengan jam:menit
// sekarang. Dipanggil sekali dari index.js setelah bot connect.

const { loadGroupSettings } = require('./groupSettings');

// Cegah kirim dobel dalam menit yang sama kalau interval check kebetulan
// jalan 2x berdekatan (jitter timer, dsb) -- simpan "hour:minute" terakhir
// yang sudah dikirim per grup, reset otomatis begitu menitnya berubah.
const lastSentKey = new Map(); // chatJid -> "HH:MM" terakhir terkirim

function startReminderScheduler(sock) {
  setInterval(async () => {
    const now = new Date();
    // Key HARUS termasuk tanggal, bukan cuma "HH:MM" -- kalau tidak, begitu
    // hari berganti, jam:menit yang sama akan dianggap "sudah pernah
    // dikirim" selamanya dan reminder berhenti terkirim setelah hari
    // pertama (bug ini sempat ketahuan saat testing sebelum dikirim).
    const dateKey = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const currentKey = `${dateKey} ${now.getHours()}:${now.getMinutes()}`;

    let data;
    try {
      data = loadGroupSettings();
    } catch (err) {
      console.error('[reminderScheduler] Gagal baca groupSettings:', err.message);
      return;
    }

    for (const [chatJid, group] of Object.entries(data.allowedGroups || {})) {
      const r = group.reminder;
      if (!r || !r.enabled || r.hour === null || r.minute === null) continue;
      if (r.hour !== now.getHours() || r.minute !== now.getMinutes()) continue;
      if (lastSentKey.get(chatJid) === currentKey) continue; // sudah terkirim menit ini

      lastSentKey.set(chatJid, currentKey);
      try {
        await sock.sendMessage(chatJid, { text: `⏰ *Reminder* ✦\n═══════════════\n${r.message}` });
      } catch (err) {
        console.error(`[reminderScheduler] Gagal kirim reminder ke ${chatJid}:`, err.message);
      }
    }
  }, 60 * 1000); // cek tiap menit, cukup presisi untuk reminder jam:menit
}

module.exports = { startReminderScheduler };
