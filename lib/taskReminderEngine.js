// lib/taskReminderEngine.js — Smart Task & Deadline Reminder Core Engine
// Parser Waktu Fleksibel (Natural Language & Standar), Countdown Renderer, dan Manajemen Kartu Tugas

/**
 * Normalisasi nama hari ke nomor hari (0 = Minggu, 1 = Senin, ... 6 = Sabtu)
 */
const DAY_MAP = {
  minggu: 0,
  ahad: 0,
  senin: 1,
  selasa: 2,
  rabu: 3,
  kamis: 4,
  jumat: 5,
  "jum'at": 5,
  sabtu: 6,
};

/**
 * Format tanggal ke teks representasi WIB yang elegan
 */
function formatTimeWIB(timestamp) {
  if (!timestamp) return '-';
  const d = new Date(timestamp);
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  const dayName = days[d.getDay()];
  const dateNum = String(d.getDate()).padStart(2, '0');
  const monthName = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${dayName}, ${dateNum} ${monthName} ${year} ${hours}:${minutes} WIB`;
}

/**
 * Menghitung sisa waktu / keterlambatan dan menyajikan badge visual
 */
function formatCountdown(targetMs, nowMs = Date.now()) {
  const diff = targetMs - nowMs;
  const isOverdue = diff <= 0;
  const absDiff = Math.abs(diff);

  const days = Math.floor(absDiff / (24 * 3600 * 1000));
  const hours = Math.floor((absDiff % (24 * 3600 * 1000)) / (3600 * 1000));
  const minutes = Math.floor((absDiff % (3600 * 1000)) / (60 * 1000));

  let timeStr = '';
  if (days > 0) timeStr += `${days}h `;
  if (hours > 0 || days > 0) timeStr += `${hours}j `;
  timeStr += `${minutes}m`;

  if (isOverdue) {
    // Hitung batas auto-delete (3 hari = 72 jam setelah deadline)
    const autoDeleteMs = targetMs + (3 * 24 * 3600 * 1000);
    const deleteDiff = autoDeleteMs - nowMs;
    const deleteDays = Math.max(0, Math.floor(deleteDiff / (24 * 3600 * 1000)));
    const deleteHours = Math.max(0, Math.floor((deleteDiff % (24 * 3600 * 1000)) / (3600 * 1000)));

    return {
      isOverdue: true,
      badge: '🔴 LEWAT DEADLINE',
      text: `Terlambat ${timeStr}`,
      autoDeleteIn: `${deleteDays} hari ${deleteHours} jam`,
      diffMs: diff,
    };
  }

  if (diff <= 3 * 3600 * 1000) {
    return {
      isOverdue: false,
      badge: '🟡 SEGERA BERAKHIR',
      text: `Sisa ${timeStr}`,
      diffMs: diff,
    };
  }

  return {
    isOverdue: false,
    badge: '🟢 AKTIF',
    text: `Sisa ${timeStr}`,
    diffMs: diff,
  };
}

/**
 * Parser Waktu Cerdas untuk Deadline (Natural Language & Standar Tanggal Indonesia)
 * @param {string} inputStr - String waktu input
 * @param {Date} [refDate] - Tanggal acuan (default now)
 * @returns {{ success: boolean, timestamp: number, formattedStr: string, error?: string }}
 */
function parseDeadline(inputStr, refDate = new Date()) {
  if (!inputStr || typeof inputStr !== 'string' || !inputStr.trim()) {
    return { success: false, error: 'Waktu deadline kosong.' };
  }

  let text = inputStr.trim().toLowerCase();

  // 1. Ekstrak jam dan menit jika ada pola "jam X", "pukul X", "XX:XX", atau "X malam/pagi/sore/siang"
  let parsedHour = 23;
  let parsedMinute = 59;
  let hasExplicitTime = false;

  // Cek pola HH:mm (contoh: 20:00, 08:30)
  const timeRegex = /\b(\d{1,2})[:.](\d{2})\b/;
  const timeMatch = text.match(timeRegex);
  if (timeMatch) {
    parsedHour = parseInt(timeMatch[1], 10);
    parsedMinute = parseInt(timeMatch[2], 10);
    hasExplicitTime = true;
    text = text.replace(timeMatch[0], '').trim();
  } else {
    // Cek pola "jam 8 malam", "pukul 15"
    const jamWordMatch = text.match(/(?:jam|pukul)\s*(\d{1,2})(?:\s*(pagi|siang|sore|malam))?/);
    if (jamWordMatch) {
      let h = parseInt(jamWordMatch[1], 10);
      const modifier = jamWordMatch[2];
      if (modifier === 'malam' && h < 12) h += 12;
      if (modifier === 'sore' && h < 12 && h <= 6) h += 12;
      if (modifier === 'siang' && h < 12 && h <= 3) h += 12;
      parsedHour = h;
      parsedMinute = 0;
      hasExplicitTime = true;
      text = text.replace(jamWordMatch[0], '').trim();
    }
  }

  // Validasi batas jam & menit
  if (parsedHour < 0 || parsedHour > 23 || parsedMinute < 0 || parsedMinute > 59) {
    return { success: false, error: `Format jam tidak valid: ${parsedHour}:${parsedMinute}` };
  }

  const target = new Date(refDate);

  // 2. Cek Relatif Jam/Menit: "X jam lagi", "X menit lagi"
  const relHoursMatch = text.match(/(\d+)\s*(?:jam|jam lagi)/);
  if (relHoursMatch && !hasExplicitTime) {
    const addH = parseInt(relHoursMatch[1], 10);
    target.setHours(target.getHours() + addH);
    return {
      success: true,
      timestamp: target.getTime(),
      formattedStr: formatTimeWIB(target.getTime()),
    };
  }

  const relMinutesMatch = text.match(/(\d+)\s*(?:menit|menit lagi)/);
  if (relMinutesMatch && !hasExplicitTime) {
    const addM = parseInt(relMinutesMatch[1], 10);
    target.setMinutes(target.getMinutes() + addM);
    return {
      success: true,
      timestamp: target.getTime(),
      formattedStr: formatTimeWIB(target.getTime()),
    };
  }

  // 3. Cek Relatif Hari: "X hari lagi"
  const relDaysMatch = text.match(/(\d+)\s*(?:hari|hari lagi)/);
  if (relDaysMatch) {
    const addDays = parseInt(relDaysMatch[1], 10);
    target.setDate(target.getDate() + addDays);
    target.setHours(parsedHour, parsedMinute, 0, 0);
    return {
      success: true,
      timestamp: target.getTime(),
      formattedStr: formatTimeWIB(target.getTime()),
    };
  }

  // 4. Kata Kunci "hari ini", "besok", "lusa"
  if (text.includes('hari ini')) {
    target.setHours(parsedHour, parsedMinute, 0, 0);
    // Jika jam sudah lewat hari ini dan user tidak eksplisit, anggap valid tapi terlewat
    return {
      success: true,
      timestamp: target.getTime(),
      formattedStr: formatTimeWIB(target.getTime()),
    };
  }

  if (text.includes('besok')) {
    target.setDate(target.getDate() + 1);
    target.setHours(parsedHour, parsedMinute, 0, 0);
    return {
      success: true,
      timestamp: target.getTime(),
      formattedStr: formatTimeWIB(target.getTime()),
    };
  }

  if (text.includes('lusa')) {
    target.setDate(target.getDate() + 2);
    target.setHours(parsedHour, parsedMinute, 0, 0);
    return {
      success: true,
      timestamp: target.getTime(),
      formattedStr: formatTimeWIB(target.getTime()),
    };
  }

  // 5. Nama Hari ("senin", "selasa", dsb)
  for (const [dayName, dayIndex] of Object.entries(DAY_MAP)) {
    if (text.includes(dayName)) {
      const currentDay = refDate.getDay();
      let diff = dayIndex - currentDay;
      if (diff <= 0) diff += 7; // ambil hari di minggu depan jika hari sudah lewat atau sama
      target.setDate(target.getDate() + diff);
      target.setHours(parsedHour, parsedMinute, 0, 0);
      return {
        success: true,
        timestamp: target.getTime(),
        formattedStr: formatTimeWIB(target.getTime()),
      };
    }
  }

  // 6. Format Tanggal Standar: YYYY-MM-DD atau DD/MM/YYYY atau DD-MM-YYYY atau DD/MM atau DD-MM
  const dateRegex = /\b(\d{1,4})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/;
  const dateMatch = text.match(dateRegex);
  if (dateMatch) {
    let year = refDate.getFullYear();
    let month = 0;
    let day = 1;

    // Kasus YYYY-MM-DD
    if (dateMatch[1].length === 4) {
      year = parseInt(dateMatch[1], 10);
      month = parseInt(dateMatch[2], 10) - 1;
      day = parseInt(dateMatch[3] || '1', 10);
    } else {
      // Kasus DD/MM/YYYY atau DD/MM
      day = parseInt(dateMatch[1], 10);
      month = parseInt(dateMatch[2], 10) - 1;
      if (dateMatch[3]) {
        year = parseInt(dateMatch[3], 10);
        if (year < 100) year += 2000;
      } else {
        // Jika hanya DD/MM, jika bulan sudah lewat tahun ini, gunakan tahun depan
        if (month < refDate.getMonth() || (month === refDate.getMonth() && day < refDate.getDate())) {
          year += 1;
        }
      }
    }

    const customDate = new Date(year, month, day, parsedHour, parsedMinute, 0, 0);
    if (!isNaN(customDate.getTime())) {
      return {
        success: true,
        timestamp: customDate.getTime(),
        formattedStr: formatTimeWIB(customDate.getTime()),
      };
    }
  }

  // 7. Jika hanya waktu murni (misal: "19:00" atau "jam 8 malam")
  if (hasExplicitTime) {
    target.setHours(parsedHour, parsedMinute, 0, 0);
    // Jika jam sudah lewat hari ini, arahkan ke besok
    if (target.getTime() <= refDate.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    return {
      success: true,
      timestamp: target.getTime(),
      formattedStr: formatTimeWIB(target.getTime()),
    };
  }

  return {
    success: false,
    error: `Format waktu "${inputStr}" tidak dikenali. Gunakan contoh: "besok 20:00", "lusa 15:00", "senin 23:59", atau "15/09/2026 18:00".`,
  };
}

/**
 * Render Papan Daftar Tugas Menjadi Kartu WhatsApp
 */
function renderTaskListCard(tasks, chatJid, reminderTarget = null) {
  const isEnabled = reminderTarget?.enabled ?? true;
  const remindTime = reminderTarget?.daily_remind_time || '07:00';

  const lines = [
    `╔════════════════════════════════════╗`,
    `  📋 *[ POLARIS TASK & DEADLINE BOARD ]*`,
    `╚════════════════════════════════════╝`,
    `🔔 *Pengingat Harian:* ${isEnabled ? `Aktif Tiap ${remindTime} WIB` : 'Nonaktif (Gunakan `/reminder on`)'}`,
    `⏰ *Waktu Server:* ${new Date().toLocaleTimeString('id-ID')} WIB`,
    `──────────────────────────────`,
  ];

  if (!tasks || tasks.length === 0) {
    lines.push(`🎉 *Tidak ada tugas aktif!* Semua tugas selesai atau belum ada tugas yang dicatat.`);
    lines.push(``);
    lines.push(`💡 _Ketik \`/addtugas <nama tugas> <deadline>\` untuk menambah tugas baru._`);
    return lines.join('\n');
  }

  const active = [];
  const overdue = [];

  tasks.forEach((t) => {
    const cd = formatCountdown(t.deadline_at);
    if (cd.isOverdue) overdue.push({ ...t, cd });
    else active.push({ ...t, cd });
  });

  // Tampilkan Tugas Terlewat Deadline lebih dulu (High Priority)
  if (overdue.length > 0) {
    lines.push(`🚨 *PERINGATAN: TUGAS LEWAT DEADLINE (${overdue.length})*`);
    overdue.forEach((t, i) => {
      lines.push(`${i + 1}. ❌ *${t.task_name}*`);
      lines.push(`   • Batas: ${t.deadline_str}`);
      lines.push(`   • Status: *${t.cd.text}*`);
      lines.push(`   • 🧹 _Auto-hapus dalam:_ *${t.cd.autoDeleteIn}*`);
    });
    lines.push(`──────────────────────────────`);
  }

  // Tampilkan Tugas yang Masih Aktif
  if (active.length > 0) {
    lines.push(`⏳ *DAFTAR TUGAS AKTIF (${active.length})*`);
    active.forEach((t, i) => {
      const icon = t.cd.badge.includes('SEGERA') ? '⚠️' : '📌';
      lines.push(`${i + 1}. ${icon} *${t.task_name}*`);
      lines.push(`   • Batas: ${t.deadline_str}`);
      lines.push(`   • Sisa Waktu: *${t.cd.text}* (${t.cd.badge})`);
    });
    lines.push(`──────────────────────────────`);
  }

  lines.push(`💡 *Menu Cepat:*`);
  lines.push(`• \`/addtugas <nama> <deadline>\` ➔ Tambah tugas`);
  lines.push(`• \`/addtimetask <nama> <deadline>\` ➔ Perpanjang deadline`);
  lines.push(`• \`/edittask <nama lama> | <baru> | <deadline>\` ➔ Edit tugas`);
  lines.push(`• \`/deltask <nama> <alasan>\` ➔ Hapus tugas`);

  return lines.join('\n');
}

module.exports = {
  parseDeadline,
  formatCountdown,
  renderTaskListCard,
  formatTimeWIB,
};
