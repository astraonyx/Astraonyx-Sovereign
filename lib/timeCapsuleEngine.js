// lib/timeCapsuleEngine.js — Digital Time Capsule Engine
// Menyimpan kenangan & pesan rahasia terenkripsi yang otomatis dibuka dan di-tag tepat pada waktu yang ditentukan
const { capsuleQueries } = require('../server/db');
const { jidToNumber, toJid } = require('./helpers');
const { box, success, warning, info } = require('./messageStyle');

function formatIndonesianDate(date) {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const d = new Date(date);
  const dayName = days[d.getDay()];
  const dayNum = d.getDate();
  const monthName = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${dayName}, ${dayNum} ${monthName} ${year} pukul ${hours}:${minutes} WIB`;
}

/**
 * Parsing string waktu relatif atau tanggal absolut menjadi timestamp (ms)
 */
function parseUnlockTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const raw = timeStr.trim().toLowerCase();
  const now = Date.now();

  // 1. Format Relatif Sederhana: 1m, 30m, 1h, 24h, 1d, 7d, 30d, 1y
  const relMatch = raw.match(/^(\d+)\s*(m|min|menit|h|j|jam|d|hari|w|minggu|mo|bln|bulan|y|th|tahun)$/i);
  if (relMatch) {
    const val = parseInt(relMatch[1], 10);
    const unit = relMatch[2].toLowerCase();

    let ms = 0;
    if (unit.startsWith('m') && !unit.startsWith('min') && !unit.startsWith('men') && !unit.startsWith('ming')) {
      ms = val * 60 * 1000;
    } else if (unit.startsWith('min') || unit.startsWith('men')) {
      ms = val * 60 * 1000;
    } else if (unit === 'h' || unit.startsWith('j')) {
      ms = val * 60 * 60 * 1000;
    } else if (unit === 'd' || unit.startsWith('h')) {
      ms = val * 24 * 60 * 60 * 1000;
    } else if (unit.startsWith('w') || unit.startsWith('ming')) {
      ms = val * 7 * 24 * 60 * 60 * 1000;
    } else if (unit.startsWith('mo') || unit.startsWith('b')) {
      ms = val * 30 * 24 * 60 * 60 * 1000;
    } else if (unit.startsWith('y') || unit.startsWith('t')) {
      ms = val * 365 * 24 * 60 * 60 * 1000;
    }

    if (ms > 0) return now + ms;
  }

  // 2. Format Kata: "besok 08:00", "lusa 19:30"
  if (raw.startsWith('besok')) {
    const timePart = raw.replace('besok', '').trim();
    const tMatch = timePart.match(/^(\d{1,2})[:.](\d{2})$/);
    const target = new Date(now + 24 * 60 * 60 * 1000);
    if (tMatch) {
      target.setHours(parseInt(tMatch[1], 10), parseInt(tMatch[2], 10), 0, 0);
    } else {
      target.setHours(8, 0, 0, 0); // default jam 8 pagi
    }
    return target.getTime();
  }

  if (raw.startsWith('lusa')) {
    const timePart = raw.replace('lusa', '').trim();
    const tMatch = timePart.match(/^(\d{1,2})[:.](\d{2})$/);
    const target = new Date(now + 48 * 60 * 60 * 1000);
    if (tMatch) {
      target.setHours(parseInt(tMatch[1], 10), parseInt(tMatch[2], 10), 0, 0);
    } else {
      target.setHours(8, 0, 0, 0);
    }
    return target.getTime();
  }

  // 3. Format Absolut: YYYY-MM-DD HH:mm atau DD-MM-YYYY HH:mm
  // Cek format DD-MM-YYYY atau DD/MM/YYYY
  const ddmmyyyy = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2})[:.](\d{2}))?$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    const year = parseInt(ddmmyyyy[3], 10);
    const hours = ddmmyyyy[4] ? parseInt(ddmmyyyy[4], 10) : 8;
    const minutes = ddmmyyyy[5] ? parseInt(ddmmyyyy[5], 10) : 0;
    const d = new Date(year, month, day, hours, minutes, 0, 0);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // Cek standard Date.parse (e.g. YYYY-MM-DD HH:mm)
  const parsed = Date.parse(timeStr);
  if (!isNaN(parsed)) return parsed;

  return null;
}

/**
 * Buat dan segel Kapsul Waktu Digital baru
 */
async function createCapsule(chatJid, creatorJid, creatorName, targetJid, targetName, messageContent, timeStr) {
  if (!messageContent || messageContent.trim().length === 0) {
    return {
      success: false,
      message: warning('Pesan Kosong', 'Harap masukkan isi pesan atau kenangan yang ingin disimpan ke dalam kapsul waktu.'),
    };
  }

  const unlockAt = parseUnlockTime(timeStr);
  const now = Date.now();

  if (!unlockAt || isNaN(unlockAt)) {
    return {
      success: false,
      message: warning(
        'Format Waktu Tidak Dikenali',
        'Gunakan format durasi atau tanggal yang valid:\n\n' +
        '📌 *Contoh Format Relatif:*\n' +
        '• `10m` (10 menit lagi)\n' +
        '• `2h` (2 jam lagi)\n' +
        '• `3d` (3 hari lagi)\n' +
        '• `1w` (1 minggu lagi)\n' +
        '• `1bln` (1 bulan lagi)\n\n' +
        '📌 *Contoh Format Tanggal:*\n' +
        '• `besok 08:00`\n' +
        '• `15-09-2026 19:30`\n' +
        '• `2026-12-31 23:59`'
      ),
    };
  }

  if (unlockAt <= now + 20 * 1000) {
    return {
      success: false,
      message: warning('Waktu Terlalu Dekat', 'Waktu pembukaan kapsul harus minimal 30 detik ke masa depan.'),
    };
  }

  // Maksimal 10 tahun
  if (unlockAt > now + 10 * 365 * 24 * 60 * 60 * 1000) {
    return {
      success: false,
      message: warning('Waktu Terlalu Jauh', 'Batas maksimal penyimpanan kapsul waktu adalah 10 tahun.'),
    };
  }

  const capsuleId = `tc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const nowIso = new Date().toISOString();

  capsuleQueries.insert.run({
    id: capsuleId,
    chat_jid: chatJid,
    creator_jid: creatorJid,
    creator_name: creatorName || `@${jidToNumber(creatorJid)}`,
    target_jid: targetJid,
    target_name: targetName || `@${jidToNumber(targetJid)}`,
    message_content: messageContent.trim(),
    unlock_at: unlockAt,
    created_at: nowIso,
  });

  const formattedDate = formatIndonesianDate(unlockAt);
  const targetNum = jidToNumber(targetJid);
  const creatorNum = jidToNumber(creatorJid);

  const card = box({
    prefix: 'POLARIS TIME CAPSULE',
    statusTag: 'SEALED & LOCKED',
    title: '⏳ KAPSUL WAKTU DIGITAL DISEGEL!',
    body: `Pesan rahasia & kenangan berharga telah diamankan ke dalam kubah waktu digital.\n\n` +
          `💌 *Untuk:* @${targetNum}\n` +
          `✍️ *Dari:* @${creatorNum}\n` +
          `🔒 *Status:* Terenkripsi & Terkunci Rapat\n\n` +
          `🔓 *Jadwal Terbuka Otomatis:*\n` +
          `📅 *${formattedDate}*\n\n` +
          `_Pesan ini tidak bisa dibuka oleh siapapun hingga waktu yang ditentukan tiba._`,
    footer: `ID Kapsul: ${capsuleId}`,
  });

  return {
    success: true,
    capsuleId,
    message: card,
    mentions: [creatorJid, targetJid],
  };
}

/**
 * Cek dan buka seluruh kapsul waktu yang jatuh tempo
 * Dijalankan otomatis secara periodik
 */
async function checkDueCapsules(sock) {
  try {
    const now = Date.now();
    const dueList = capsuleQueries.getDue.all(now);

    if (!dueList || dueList.length === 0) return;

    for (const item of dueList) {
      try {
        // Tandai sudah dibuka
        capsuleQueries.markOpened.run(item.id);

        const targetNum = jidToNumber(item.target_jid);
        const creatorNum = jidToNumber(item.creator_jid);
        const createdDate = formatIndonesianDate(item.created_at);
        const openedDate = formatIndonesianDate(Date.now());

        const openCard = box({
          prefix: 'POLARIS TIME CAPSULE',
          statusTag: 'UNLOCKED',
          title: '🔓 KAPSUL WAKTU DIGITAL TERBUKA!',
          body: `✨ *Sebuah pesan berharga dari masa lalu akhirnya tiba di saat yang ditentukan!*\n\n` +
                `💌 *Pesan untuk:* @${targetNum}\n` +
                `✍️ *Telah disegel oleh:* @${creatorNum}\n` +
                `⏳ *Disegel pada:* ${createdDate}\n` +
                `──────────────────────────────\n\n` +
                `📜 *ISI PESAN RAHASIA:*\n` +
                `"${item.message_content}"\n\n` +
                `──────────────────────────────\n` +
                `Semoga kenangan ini membawa kehangatan, senyuman, atau jawaban yang kamu nanti. 💖`,
          footer: `ID Kapsul: ${item.id}`,
        });

        await sock.sendMessage(item.chat_jid, {
          text: openCard,
          mentions: [item.creator_jid, item.target_jid],
        });

        console.log(`[timeCapsuleEngine] 🔓 Kapsul ${item.id} berhasil dibuka dan dikirimkan ke ${item.chat_jid}`);
      } catch (sendErr) {
        console.error(`[timeCapsuleEngine] Gagal mengirim kapsul ${item.id}:`, sendErr.message);
      }
    }
  } catch (err) {
    console.error('[timeCapsuleEngine] Error saat cek kapsul:', err.message);
  }
}

/**
 * Daftar kapsul aktif yang pernah dibuat pengguna di chat ini
 */
function listUserCapsules(chatJid, creatorJid) {
  const list = capsuleQueries.getByCreator.all(chatJid, creatorJid);
  if (!list || list.length === 0) {
    return info(
      'Kapsul Waktu Kosong',
      'Kamu belum memiliki kapsul waktu aktif yang sedang menunggu waktu buka di chat ini.\n\nKetik */timecapsule @user <waktu> <pesan>* untuk membuatnya!'
    );
  }

  let body = `Daftar kapsul waktu yang kamu buat dan sedang disegel:\n\n`;
  list.forEach((item, idx) => {
    const targetNum = jidToNumber(item.target_jid);
    const unlockStr = formatIndonesianDate(item.unlock_at);
    body += `${idx + 1}. 💌 *Untuk:* @${targetNum}\n` +
            `   ├ 📅 *Jadwal Buka:* ${unlockStr}\n` +
            `   └ 🔑 *ID:* \`${item.id}\`\n\n`;
  });

  body += `_Kapsul akan otomatis dikirimkan ke obrolan ini tepat saat waktunya tiba._`;

  return box({
    prefix: 'POLARIS TIME CAPSULE',
    statusTag: 'MY CAPSULES',
    title: 'DAFTAR KAPSUL WAKTU AKTIF',
    body,
    footer: `Total: ${list.length} kapsul tersegel`,
  });
}

/**
 * Batalkan / hapus kapsul waktu yang belum terbuka
 */
function deleteUserCapsule(chatJid, creatorJid, capsuleId) {
  if (!capsuleId) return warning('ID Kapsul Kosong', 'Gunakan: `/delcapsule <id_kapsul>`');
  const res = capsuleQueries.delete.run(capsuleId, creatorJid);
  if (res.changes > 0) {
    return success('Kapsul Dihapus', `Kapsul waktu \`${capsuleId}\` telah berhasil dibatalkan dan dihapus dari kubah waktu.`);
  }
  return warning('Gagal Menghapus', `Kapsul dengan ID \`${capsuleId}\` tidak ditemukan atau kamu bukan pembuatnya.`);
}

module.exports = {
  formatIndonesianDate,
  parseUnlockTime,
  createCapsule,
  checkDueCapsules,
  listUserCapsules,
  deleteUserCapsule,
};
