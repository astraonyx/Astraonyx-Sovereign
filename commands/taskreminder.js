// commands/taskreminder.js — Smart Task & Deadline Reminder Command Handler
// /reminder, /addtugas, /addtimetask, /edittask, /deltask, /setremind, /listtugas

const { taskQueries } = require('../server/db');
const { parseDeadline, formatCountdown, renderTaskListCard, formatTimeWIB } = require('../lib/taskReminderEngine');
const { box, success, warning, error, usage, info, LINE } = require('../lib/messageStyle');
const config = require('../config');

/**
 * Memisahkan nama tugas dan deadline dari argumen fleksibel (Mendukung pemisah '|' maupun spasi)
 */
function splitTaskAndDeadline(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return { taskName: '', deadlineStr: '' };

  // 1. Jika ada pemisah pipe '|'
  if (text.includes('|')) {
    const parts = text.split('|');
    return {
      taskName: parts[0].trim(),
      deadlineStr: parts.slice(1).join('|').trim(),
    };
  }

  // 2. Jika tanpa pipe, coba scan dari belakang untuk pola tanggal/waktu
  const tokens = text.split(/\s+/);
  if (tokens.length <= 1) {
    return { taskName: text, deadlineStr: '' };
  }

  // Coba potong 1, 2, 3, atau 4 kata terakhir sebagai waktu
  for (let cut = Math.min(4, tokens.length - 1); cut >= 1; cut--) {
    const candidateDeadline = tokens.slice(-cut).join(' ');
    const candidateTask = tokens.slice(0, -cut).join(' ');
    const testParse = parseDeadline(candidateDeadline);
    if (testParse.success) {
      return {
        taskName: candidateTask.trim(),
        deadlineStr: candidateDeadline.trim(),
      };
    }
  }

  // Fallback: anggap token terakhir sebagai deadline
  return {
    taskName: tokens.slice(0, -1).join(' ').trim(),
    deadlineStr: tokens.slice(-1).join(' ').trim(),
  };
}

async function handleTaskReminderCommand({ sock, chatJid, msg, command, args, reply, senderNumber }) {
  const userJid = msg.key.participant || msg.key.remoteJid;
  const rawArgStr = args.join(' ').trim();

  // ==================== 1. COMMAND: /reminder <on/off/status> ====================
  if (command === 'reminder') {
    const action = (args[0] || '').toLowerCase();

    if (action === 'on') {
      taskQueries.setReminderTarget(chatJid, 1, '07:00', userJid);
      await reply(success(
        'Target Pengingat Diaktifkan',
        `📍 *Lokasi Pengingat:* Chat ini telah ditetapkan sebagai target resmi tugas & deadline.\n` +
        `⏰ *Jadwal Rekap Harian:* Jam 07:00 WIB (Ubah via \`${config.prefix}setremind <jam:menit>\`)\n` +
        `🔔 *Notifikasi Proaktif:* H-24 jam, H-3 jam, H-1 jam, dan saat deadline berakhir.\n\n` +
        `💡 _Ketik \`${config.prefix}addtugas <nama> <deadline>\` untuk mulai mencatat tugas!_`
      ));
      return;
    }

    if (action === 'off') {
      taskQueries.setReminderTarget(chatJid, 0, '07:00', userJid);
      await reply(warning(
        'Target Pengingat Dinonaktifkan',
        'Chat ini tidak lagi menerima pengingat harian dan peringatan deadline tugas.\n' +
        `Untuk mengaktifkan kembali, ketik \`${config.prefix}reminder on\`.`
      ));
      return;
    }

    // Default: Status
    const target = taskQueries.getReminderTarget(chatJid);
    const activeTasks = taskQueries.getActiveTasks(chatJid);
    const isEnabled = target ? target.enabled === 1 : false;
    const remindTime = target?.daily_remind_time || '07:00';

    await reply(info(
      'Status Pengingat Tugas',
      `📍 *Target Chat Ini:* ${isEnabled ? '🟢 AKTIF' : '⚪ NONAKTIF'}\n` +
      `⏰ *Jadwal Rekap:* Setiap hari jam ${remindTime} WIB\n` +
      `📋 *Tugas Aktif:* ${activeTasks.length} tugas\n\n` +
      `• Nyalakan: \`${config.prefix}reminder on\`\n` +
      `• Matikan: \`${config.prefix}reminder off\`\n` +
      `• Atur Jam Rekap: \`${config.prefix}setremind <HH:mm>\`\n` +
      `• Lihat Semua Tugas: \`${config.prefix}listtugas\``
    ));
    return;
  }

  // ==================== 2. COMMAND: /setremind <jam:menit> ====================
  if (command === 'setremind' || command === 'setrekap') {
    const timeInput = (args[0] || '').trim();
    const timeRegex = /^([01]?\d|2[0-3])[:.]([0-5]\d)$/;
    const match = timeInput.match(timeRegex);

    if (!match) {
      await reply(usage(
        `${config.prefix}setremind <HH:mm>`,
        'Atur jam berapa rekap tugas harian otomatis dikirim ke chat ini (format 24 jam).\n\n' +
        `*Contoh:*\n` +
        `• \`${config.prefix}setremind 07:00\` (Setiap pagi jam 7)\n` +
        `• \`${config.prefix}setremind 19:30\` (Setiap malam jam 7.30 malam)`
      ));
      return;
    }

    const hh = String(parseInt(match[1], 10)).padStart(2, '0');
    const mm = String(parseInt(match[2], 10)).padStart(2, '0');
    const formattedTime = `${hh}:${mm}`;

    taskQueries.setReminderTarget(chatJid, 1, formattedTime, userJid);

    await reply(success(
      'Jadwal Rekap Harian Diatur',
      `⏰ *Waktu Rekap:* Setiap hari jam *${formattedTime} WIB*\n` +
      `📍 *Lokasi:* Chat ini\n\n` +
      `Bot akan otomatis mengirimkan papan daftar tugas aktif, deadline terdekat, dan tugas tertunggak pada jam tersebut!`
    ));
    return;
  }

  // ==================== 3. COMMAND: /addtugas / /addtask <nama tugas> <deadline> ====================
  if (command === 'addtugas' || command === 'addtask' || command === 'newtask') {
    const { taskName, deadlineStr } = splitTaskAndDeadline(rawArgStr);

    if (!taskName || !deadlineStr) {
      await reply(usage(
        `${config.prefix}addtask <nama tugas> <deadline>`,
        'Catat tugas baru dengan batas waktu deadline otomatis.\n\n' +
        `*Contoh Penggunaan:*\n` +
        `• \`${config.prefix}addtask PR Matematika Bab 4 besok 20:00\`\n` +
        `• \`${config.prefix}addtask Laporan Fisika | 18/09/2026 23:59\`\n` +
        `• \`${config.prefix}addtask Makalah Sosiologi senin jam 3 sore\`\n` +
        `• \`${config.prefix}addtask Kuis Sejarah lusa 14:00\`\n` +
        `• \`${config.prefix}addtask Resume Jurnal 3 hari lagi\``
      ));
      return;
    }

    const parsed = parseDeadline(deadlineStr);
    if (!parsed.success) {
      await reply(error('Waktu Deadline Tidak Valid', parsed.error));
      return;
    }

    // Auto-aktifkan chat ini sebagai target reminder jika belum aktif
    const target = taskQueries.getReminderTarget(chatJid);
    if (!target) {
      taskQueries.setReminderTarget(chatJid, 1, '07:00', userJid);
    }

    const taskId = 'tk_' + Math.random().toString(36).substring(2, 7);
    taskQueries.addTask({
      id: taskId,
      targetJid: chatJid,
      creatorJid: userJid,
      taskName,
      deadlineAt: parsed.timestamp,
      deadlineStr: parsed.formattedStr,
    });

    const cd = formatCountdown(parsed.timestamp);

    await reply(success(
      'Tugas Berhasil Dicatat',
      `📌 *Tugas:* ${taskName}\n` +
      `⏳ *Deadline:* ${parsed.formattedStr}\n` +
      `⏱️ *Status Waktu:* ${cd.text} (${cd.badge})\n` +
      `🔑 *ID Tugas:* \`${taskId}\`\n\n` +
      `🔔 *Sistem Pengingat:* Otomatis diingatkan berkala sampai deadline, dan dibersihkan otomatis 3 hari setelah deadline.`
    ));
    return;
  }

  // ==================== 4. COMMAND: /addtimetask <nama tugas> <deadline baru> ====================
  if (command === 'addtimetask' || command === 'extendtask') {
    const { taskName: searchTask, deadlineStr: newDeadlineStr } = splitTaskAndDeadline(rawArgStr);

    if (!searchTask || !newDeadlineStr) {
      await reply(usage(
        `${config.prefix}addtimetask <nama/id tugas> <deadline baru>`,
        'Perpanjang atau ubah batas deadline untuk tugas yang sudah terdaftar.\n\n' +
        `*Contoh:*\n` +
        `• \`${config.prefix}addtimetask PR Matematika lusa 23:59\`\n` +
        `• \`${config.prefix}addtimetask Laporan Fisika | minggu 20:00\``
      ));
      return;
    }

    const existing = taskQueries.getTaskByIdOrName(chatJid, searchTask);
    if (!existing) {
      await reply(warning(
        'Tugas Tidak Ditemukan',
        `Tidak ditemukan tugas aktif dengan kata kunci *"${searchTask}"* di chat ini.\n` +
        `Ketik \`${config.prefix}listtugas\` untuk melihat daftar nama tugas yang ada.`
      ));
      return;
    }

    const parsed = parseDeadline(newDeadlineStr);
    if (!parsed.success) {
      await reply(error('Waktu Deadline Baru Tidak Valid', parsed.error));
      return;
    }

    taskQueries.updateTaskTime(existing.id, parsed.timestamp, parsed.formattedStr);
    const cd = formatCountdown(parsed.timestamp);

    await reply(success(
      'Batas Deadline Diperpanjang',
      `📌 *Tugas:* ${existing.task_name}\n` +
      `📅 *Deadline Lama:* ${existing.deadline_str}\n` +
      `🚀 *Deadline Baru:* ${parsed.formattedStr}\n` +
      `⏱️ *Sisa Waktu Baru:* ${cd.text} (${cd.badge})`
    ));
    return;
  }

  // ==================== 5. COMMAND: /edittask <nama lama> | <nama baru> | <deadline baru> ====================
  if (command === 'edittask') {
    const parts = rawArgStr.split('|').map((p) => p.trim());
    if (parts.length < 3) {
      await reply(usage(
        `${config.prefix}edittask <nama lama> | <nama baru> | <deadline baru>`,
        'Ubah nama tugas sekaligus waktu deadlinenya.\n\n' +
        `*Contoh:*\n` +
        `\`${config.prefix}edittask PR Matematika | PR Matematika Bab 4 & 5 | lusa 22:00\``
      ));
      return;
    }

    const [searchName, newName, newDeadStr] = parts;
    const existing = taskQueries.getTaskByIdOrName(chatJid, searchName);
    if (!existing) {
      await reply(warning(
        'Tugas Tidak Ditemukan',
        `Tidak ditemukan tugas aktif dengan kata kunci *"${searchName}"* di chat ini.\n` +
        `Ketik \`${config.prefix}listtugas\` untuk memeriksa daftar tugas.`
      ));
      return;
    }

    const parsed = parseDeadline(newDeadStr);
    if (!parsed.success) {
      await reply(error('Format Deadline Baru Tidak Valid', parsed.error));
      return;
    }

    taskQueries.editTask(existing.id, newName, parsed.timestamp, parsed.formattedStr);
    const cd = formatCountdown(parsed.timestamp);

    await reply(success(
      'Tugas Berhasil Diedit',
      `📝 *Tugas:* ~${existing.task_name}~ ➔ *${newName}*\n` +
      `📅 *Deadline:* ${parsed.formattedStr}\n` +
      `⏱️ *Status:* ${cd.text} (${cd.badge})`
    ));
    return;
  }

  // ==================== 6. COMMAND: /deltask / /deltugas / /deletetask <nama tugas> <alasan> ====================
  if (command === 'deltask' || command === 'deltugas' || command === 'deletetask' || command === 'removetask') {
    let taskQuery = '';
    let reason = '';

    if (rawArgStr.includes('|')) {
      const parts = rawArgStr.split('|').map((p) => p.trim());
      taskQuery = parts[0];
      reason = parts.slice(1).join(' ').trim();
    } else {
      const tokens = rawArgStr.split(/\s+/);
      if (tokens.length >= 2) {
        taskQuery = tokens[0];
        reason = tokens.slice(1).join(' ');
      } else {
        taskQuery = tokens[0] || '';
      }
    }

    if (!taskQuery || !reason) {
      await reply(usage(
        `${config.prefix}deltask <nama/id tugas> <alasan penghapusan>`,
        'Hapus tugas yang sudah selesai atau dibatalkan beserta alasannya.\n\n' +
        `*Contoh:*\n` +
        `• \`${config.prefix}deltask PR Matematika sudah dikumpulkan di e-learning\`\n` +
        `• \`${config.prefix}deltask Laporan Fisika | tugas dibatalkan dosen\``
      ));
      return;
    }

    const existing = taskQueries.getTaskByIdOrName(chatJid, taskQuery);
    if (!existing) {
      await reply(warning(
        'Tugas Tidak Ditemukan',
        `Tidak ditemukan tugas aktif dengan kata kunci *"${taskQuery}"* di chat ini.\n` +
        `Ketik \`${config.prefix}listtugas\` untuk melihat daftar tugas.`
      ));
      return;
    }

    taskQueries.deleteTaskWithReason(existing.id, reason);

    await reply(success(
      'Tugas Berhasil Dihapus',
      `🗑️ *Tugas:* ${existing.task_name}\n` +
      `📝 *Alasan Hapus:* "${reason}"\n` +
      `👤 *Dihapus Oleh:* @${senderNumber || ''}\n\n` +
      `Tugas telah dinonaktifkan dan dikeluarkan dari pengingat rutin!`
    ));
    return;
  }

  // ==================== 7. COMMAND: /listtugas, /listtask, /tasks, /tugas ====================
  if (command === 'listtugas' || command === 'tugas' || command === 'listtask' || command === 'tasks' || command === 'task') {
    const target = taskQueries.getReminderTarget(chatJid);
    const activeTasks = taskQueries.getActiveTasks(chatJid);
    const card = renderTaskListCard(activeTasks, chatJid, target);

    await sock.sendMessage(chatJid, { text: card }, { quoted: msg });
    return;
  }
}

module.exports = {
  handleTaskReminderCommand,
};
