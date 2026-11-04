// lib/taskReminderScheduler.js — Background Scheduler untuk Pengingat Deadline & Pembersihan Tugas Otomatis
// Memeriksa tugas tiap menit: Pengingat Harian, Peringatan H-24h/H-3h/H-1h, Peringatan Overdue, dan Auto-Clean 3 Hari

const { taskQueries } = require('../server/db');
const { renderTaskListCard, formatCountdown, formatTimeWIB } = require('./taskReminderEngine');

// Cegah pengiriman dobel: targetJid + dateKey -> boolean
const lastDailySentMap = new Map();
// Cegah notifikasi mendekati deadline dikirim berulang: taskId + warningType -> boolean
const warningSentMap = new Map();

function startTaskReminderScheduler(sock) {
  if (!sock) return;

  console.log('⏰ [TaskReminderScheduler] Memulai background scheduler tugas & deadline...');

  // Jalankan interval setiap 60 detik (1 menit)
  setInterval(async () => {
    try {
      const now = new Date();
      const nowMs = now.getTime();
      const dateKey = now.toISOString().slice(0, 10); // YYYY-MM-DD
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // ==================== 1. PEMBERSIHAN OTOMATIS TUGAS (LEWAT 3 HARI) ====================
      const cleanedTasks = taskQueries.cleanOldExpiredTasks(nowMs);
      if (cleanedTasks.length > 0) {
        // Kelompokkan berdasarkan target_jid
        const byTarget = new Map();
        cleanedTasks.forEach((t) => {
          if (!byTarget.has(t.target_jid)) byTarget.set(t.target_jid, []);
          byTarget.get(t.target_jid).push(t);
        });

        for (const [targetJid, tasks] of byTarget.entries()) {
          try {
            const listStr = tasks.map((t, idx) => `• *${t.task_name}* (Batas: ${t.deadline_str})`).join('\n');
            const cleanNotice = [
              `🧹 *[PEMBERSIHAN TUGAS OTOMATIS]*`,
              `──────────────────────────────`,
              `Sistem telah menghapus *${tasks.length} tugas* berikut dari daftar aktif karena telah melewati deadline selama lebih dari 3 hari (72 jam):`,
              ``,
              listStr,
              `──────────────────────────────`,
              `💡 _Daftar tugas kamu kini lebih bersih dan terorganisir!_`,
            ].join('\n');

            await sock.sendMessage(targetJid, { text: cleanNotice });
          } catch (cErr) {
            console.error(`[TaskReminder] Gagal kirim notice auto-clean ke ${targetJid}:`, cErr.message);
          }
        }
      }

      // ==================== 2. PENGINGAT REKAP HARIAN (/setremind) ====================
      const targets = taskQueries.getAllActiveTargets();
      for (const target of targets) {
        const targetJid = target.chat_jid;
        const remindTime = target.daily_remind_time || '07:00';

        if (currentHHMM === remindTime) {
          const sentKey = `${targetJid}_${dateKey}_${remindTime}`;
          if (!lastDailySentMap.has(sentKey)) {
            lastDailySentMap.set(sentKey, true);

            try {
              const activeTasks = taskQueries.getActiveTasks(targetJid);
              const card = renderTaskListCard(activeTasks, targetJid, target);
              await sock.sendMessage(targetJid, { text: card });
            } catch (dErr) {
              console.error(`[TaskReminder] Gagal kirim rekap harian ke ${targetJid}:`, dErr.message);
            }
          }
        }
      }

      // ==================== 3. PERINGATAN DEADLINE MENDEKAT & OVERDUE ====================
      const allActive = taskQueries.getActiveTasks();
      for (const t of allActive) {
        const diffMs = t.deadline_at - nowMs;
        const diffHours = diffMs / (3600 * 1000);
        const targetJid = t.target_jid;

        // 3.a H-24 Jam (antara 23.8 jam s.d 24.2 jam)
        if (diffHours <= 24.1 && diffHours >= 23.5) {
          const key = `${t.id}_h24`;
          if (!warningSentMap.has(key)) {
            warningSentMap.set(key, true);
            try {
              await sock.sendMessage(targetJid, {
                text: `⏰ *[PENGINGAT DEADLINE H-24 JAM]*\n──────────────────────────────\n📌 Tugas: *${t.task_name}*\n⏳ Batas Waktu: ${t.deadline_str}\nSisa waktu: *1 hari lagi*. Jangan lupa diselesaikan ya!`
              });
            } catch (_) {}
          }
        }

        // 3.b H-3 Jam (antara 2.8 jam s.d 3.2 jam)
        if (diffHours <= 3.1 && diffHours >= 2.8) {
          const key = `${t.id}_h3`;
          if (!warningSentMap.has(key)) {
            warningSentMap.set(key, true);
            try {
              await sock.sendMessage(targetJid, {
                text: `⚠️ *[PERINGATAN: DEADLINE SISA 3 JAM]*\n──────────────────────────────\n📌 Tugas: *${t.task_name}*\n⏳ Batas Waktu: ${t.deadline_str}\nWaktu pengerjaan hampir habis! Segera periksa dan kumpulkan.`
              });
            } catch (_) {}
          }
        }

        // 3.c H-1 Jam (antara 0.8 jam s.d 1.1 jam)
        if (diffHours <= 1.05 && diffHours >= 0.85) {
          const key = `${t.id}_h1`;
          if (!warningSentMap.has(key)) {
            warningSentMap.set(key, true);
            try {
              await sock.sendMessage(targetJid, {
                text: `🚨 *[CRITICAL: DEADLINE SISA 1 JAM]*\n──────────────────────────────\n📌 Tugas: *${t.task_name}*\n⏳ Batas Waktu: ${t.deadline_str}\nSegera finalisasi tugasmu sekarang juga!`
              });
            } catch (_) {}
          }
        }

        // 3.d Tepat Lewat Deadline (antara 0 s.d 3 menit lewat deadline)
        if (diffMs <= 0 && diffMs >= -3 * 60 * 1000) {
          const key = `${t.id}_expired_now`;
          if (!warningSentMap.has(key)) {
            warningSentMap.set(key, true);
            try {
              await sock.sendMessage(targetJid, {
                text: `🛑 *[BATAS WAKTU DEADLINE TELAH TIBA]*\n──────────────────────────────\n❌ Tugas: *${t.task_name}*\n⏳ Batas: ${t.deadline_str}\nDeadline untuk tugas ini telah berakhir! Tugas akan tetap diingatkan sampai 3 hari ke depan sebelum dibersihkan otomatis.`
              });
              taskQueries.updateLastReminded(t.id, nowMs, true);
            } catch (_) {}
          }
        }

        // 3.e Peringatan Berkala Overdue (Setiap 24 Jam setelah lewat deadline)
        if (diffMs < -3 * 60 * 1000) {
          const hoursSinceLastReminder = (nowMs - (t.last_reminded_at || 0)) / (3600 * 1000);
          if (hoursSinceLastReminder >= 20) { // Ingatkan sekali sehari
            try {
              const cd = formatCountdown(t.deadline_at, nowMs);
              await sock.sendMessage(targetJid, {
                text: `🚨 *[PERINGATAN: TUGAS MASIH TERTUNGGAK]*\n──────────────────────────────\n❌ Tugas: *${t.task_name}*\n📅 Deadline: ${t.deadline_str}\n⏱️ Status: *${cd.text}*\n🧹 _Akan dihapus otomatis dalam:_ *${cd.autoDeleteIn}*\n\nJika sudah selesai, hapus lewat \`/deltask ${t.task_name} sudah selesai\``
              });
              taskQueries.updateLastReminded(t.id, nowMs, true);
            } catch (_) {}
          }
        }
      }

      // Bersihkan memory cache maps lama (lebih dari 7 hari)
      if (lastDailySentMap.size > 200) lastDailySentMap.clear();
      if (warningSentMap.size > 500) warningSentMap.clear();

    } catch (loopErr) {
      console.error('[TaskReminderScheduler] Error running tick:', loopErr.message);
    }
  }, 60 * 1000); // interval 1 menit
}

module.exports = {
  startTaskReminderScheduler,
};
