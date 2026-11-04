// lib/duelEngine.js — Battle XP Duel Engine: Rock-Paper-Scissors (Suit) with Anti-Cheat & Anti-Push Farming
const { duelQueries, rankQueries } = require('../server/db');
const groupLevelEngine = require('./groupLevelEngine');
const { jidToNumber, toJid, normalizeNumber } = require('./helpers');
const { box, warning, success, info, error } = require('./messageStyle');

const MIN_BET = 10;
const MAX_BET = 150;
const MAX_DAILY_DUELS = 3;
const TIMEOUT_MS = 60 * 1000; // 60 detik
const HOUSE_BURN_PCT = 0.05; // 5% house burn fee

// Active duels in memory:
// groupJid -> duelState
const activeDuels = new Map();
// userJid -> groupJid (to route PM /suit choices directly to their active duel)
const userToGroupDuel = new Map();

function normalizePair(userA, userB) {
  return [userA, userB].sort();
}

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getDailyCount(groupJid, userA, userB) {
  try {
    const [u1, u2] = normalizePair(userA, userB);
    const row = duelQueries.getDailyDuelCount.get(groupJid, u1, u2, getTodayStr());
    return row?.duel_count || 0;
  } catch (err) {
    console.error('[duelEngine] Gagal getDailyCount:', err.message);
    return 0;
  }
}

function incrementDailyCount(groupJid, userA, userB) {
  try {
    const [u1, u2] = normalizePair(userA, userB);
    const now = new Date().toISOString();
    duelQueries.incrementDailyDuelCount.run({
      group_jid: groupJid,
      user_a: u1,
      user_b: u2,
      duel_date: getTodayStr(),
      updated_at: now,
    });
  } catch (err) {
    console.error('[duelEngine] Gagal incrementDailyCount:', err.message);
  }
}

function cleanupDuel(groupJid) {
  const duel = activeDuels.get(groupJid);
  if (duel) {
    if (duel.timer) clearTimeout(duel.timer);
    userToGroupDuel.delete(duel.challengerJid);
    userToGroupDuel.delete(duel.opponentJid);
    activeDuels.delete(groupJid);
  }
}

function normalizeChoice(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase().trim();
  if (s === 'batu' || s === 'rock' || s === 'b' || s === '✊') return 'batu';
  if (s === 'gunting' || s === 'scissors' || s === 'g' || s === '✌️' || s === '✌') return 'gunting';
  if (s === 'kertas' || s === 'paper' || s === 'k' || s === '🖐️' || s === '✋') return 'kertas';
  return null;
}

function choiceToDisplay(c) {
  if (c === 'batu') return '✊ Batu';
  if (c === 'gunting') return '✌️ Gunting';
  if (c === 'kertas') return '🖐️ Kertas';
  return c;
}

/**
 * Handle timeout event
 */
async function handleTimeout(sock, groupJid) {
  const duel = activeDuels.get(groupJid);
  if (!duel) return;

  try {
    const cNum = jidToNumber(duel.challengerJid);
    const oNum = jidToNumber(duel.opponentJid);

    if (duel.status === 'WAITING_ACCEPT') {
      await sock.sendMessage(groupJid, {
        text: info(
          'Duel Kedaluwarsa',
          `⏱️ Waktu respon habis (60 detik).\n@${oNum} tidak merespon tantangan dari @${cNum}. Duel dibatalkan.`
        ),
        mentions: [duel.challengerJid, duel.opponentJid],
      });
    } else if (duel.status === 'CHOOSING') {
      const cChose = Boolean(duel.challengerChoice);
      const oChose = Boolean(duel.opponentChoice);

      if (!cChose && !oChose) {
        await sock.sendMessage(groupJid, {
          text: warning(
            'Duel Dibatalkan',
            `⏱️ Waktu memilih habis! Kedua petarung (@${cNum} & @${oNum}) tidak menentukan pilihan. Duel dibatalkan tanpa perubahan XP.`
          ),
          mentions: [duel.challengerJid, duel.opponentJid],
        });
      } else if (cChose && !oChose) {
        await sock.sendMessage(groupJid, {
          text: warning(
            'Duel Berakhir (AFK)',
            `⏱️ @${oNum} tidak memilih pilihan suit tepat waktu (AFK/Walkout).\nDuel dibatalkan demi keadilan pertandingan.`
          ),
          mentions: [duel.challengerJid, duel.opponentJid],
        });
      } else if (!cChose && oChose) {
        await sock.sendMessage(groupJid, {
          text: warning(
            'Duel Berakhir (AFK)',
            `⏱️ @${cNum} tidak memilih pilihan suit tepat waktu (AFK/Walkout).\nDuel dibatalkan demi keadilan pertandingan.`
          ),
          mentions: [duel.challengerJid, duel.opponentJid],
        });
      }
    }
  } catch (err) {
    console.error('[duelEngine] Error saat handleTimeout:', err.message);
  } finally {
    cleanupDuel(groupJid);
  }
}

/**
 * Buat tantangan duel baru
 */
async function createChallenge(sock, groupJid, challengerJid, challengerName, opponentJid, opponentName, bet, msg) {
  // 1. Cek aktivasi rank grup
  if (!groupLevelEngine.isPlayRankEnabled(groupJid)) {
    return {
      success: false,
      message: warning(
        'Fitur Rank Belum Aktif',
        'Fitur Battle XP Duel membutuhkan sistem rank aktif di grup ini.\n\nMinta Admin Grup mengaktifkannya dengan:\n👉 */playrank on*'
      ),
    };
  }

  // 2. Cek apakah menantang diri sendiri atau bot
  if (challengerJid === opponentJid) {
    return {
      success: false,
      message: warning('Gagal Menantang', 'Kamu tidak bisa menantang diri sendiri beradu duel!'),
    };
  }

  const botNum = normalizeNumber(jidToNumber(sock.user?.id || ''));
  const oppNum = normalizeNumber(jidToNumber(opponentJid));
  if (oppNum === botNum) {
    return {
      success: false,
      message: warning('Gagal Menantang', 'Bot adalah wasit pertandingan, tidak bisa diajak duel taruhan XP! 😄'),
    };
  }

  // 3. Cek apakah ada duel aktif di grup ini
  if (activeDuels.has(groupJid)) {
    return {
      success: false,
      message: warning('Arena Sedang Dipakai', 'Masih ada pertandingan duel yang sedang berlangsung di grup ini. Tunggu hingga selesai!'),
    };
  }

  // 4. Cek apakah salah satu pemain sedang dalam duel di grup lain
  if (userToGroupDuel.has(challengerJid)) {
    return {
      success: false,
      message: warning('Masih Bertarung', 'Kamu masih memiliki pertandingan duel yang belum selesai!'),
    };
  }
  if (userToGroupDuel.has(opponentJid)) {
    return {
      success: false,
      message: warning('Lawan Sedang Bertarung', `@${oppNum} saat ini sedang bertarung di duel lain!`),
      mentions: [opponentJid],
    };
  }

  // 5. Cek XP & Level pemain (Anti Push Alt: Min Level 2 / 100 XP)
  const challengerRecord = rankQueries.getUserXp.get(groupJid, challengerJid) || { xp: 0, level: 1 };
  const opponentRecord = rankQueries.getUserXp.get(groupJid, opponentJid) || { xp: 0, level: 1 };

  if (challengerRecord.xp < 100) {
    return {
      success: false,
      message: warning(
        'XP Tidak Cukup',
        `Kamu membutuhkan minimal *100 XP* (Level 2) untuk memulai duel taruhan.\nXP kamu saat ini: *${challengerRecord.xp} XP*.\nAktiflah mengobrol di grup terlebih dahulu!`
      ),
    };
  }

  if (opponentRecord.xp < 100) {
    return {
      success: false,
      message: warning(
        'Lawan Belum Memenuhi Syarat',
        `@${oppNum} belum memiliki minimal 100 XP (Level 2) untuk diajak duel taruhan.\nXP lawan: *${opponentRecord.xp} XP*.`,
      ),
      mentions: [opponentJid],
    };
  }

  // 6. Cek batas taruhan: Min 10, Max 150, dan Max 50% dari pemain dengan XP terkecil
  const parsedBet = parseInt(bet, 10);
  if (isNaN(parsedBet) || parsedBet < MIN_BET) {
    return {
      success: false,
      message: warning('Taruhan Tidak Valid', `Minimal taruhan XP duel adalah *${MIN_BET} XP*. Contoh: \`/duel @user 25\``),
    };
  }

  const maxAllowedBet = Math.min(
    MAX_BET,
    Math.floor(challengerRecord.xp * 0.5),
    Math.floor(opponentRecord.xp * 0.5)
  );

  if (parsedBet > maxAllowedBet) {
    return {
      success: false,
      message: warning(
        'Taruhan Terlalu Besar',
        `Maksimal taruhan yang diizinkan untuk duel ini adalah *${maxAllowedBet} XP* ` +
        `(Maksimal ${MAX_BET} XP atau 50% dari modal pemain terkecil demi mencegah eksploitasi push XP).`
      ),
    };
  }

  // 7. Cek batas duel harian antara 2 akun yang sama (Anti Alt Push: Max 3x per hari)
  const dailyCount = getDailyCount(groupJid, challengerJid, opponentJid);
  if (dailyCount >= MAX_DAILY_DUELS) {
    return {
      success: false,
      message: warning(
        'Batas Harian Tercapai',
        `Kamu dan @${oppNum} sudah berduel sebanyak *${dailyCount}x hari ini*.\n` +
        `Demi sportivitas & pencegahan farming XP, batas duel antar akun yang sama adalah maksimal *${MAX_DAILY_DUELS}x per hari*. Silahkan coba lagi besok!`,
      ),
      mentions: [opponentJid],
    };
  }

  // 8. Daftarkan Duel
  const duel = {
    groupJid,
    challengerJid,
    challengerName: challengerName || `@${jidToNumber(challengerJid)}`,
    opponentJid,
    opponentName: opponentName || `@${oppNum}`,
    bet: parsedBet,
    status: 'WAITING_ACCEPT',
    createdAt: Date.now(),
    challengerChoice: null,
    opponentChoice: null,
    timer: setTimeout(() => handleTimeout(sock, groupJid), TIMEOUT_MS),
  };

  activeDuels.set(groupJid, duel);
  userToGroupDuel.set(challengerJid, groupJid);
  userToGroupDuel.set(opponentJid, groupJid);

  const card = box({
    prefix: 'POLARIS ARENA',
    statusTag: 'DUEL CHALLENGE',
    title: '🥊 TANTANGAN BATTLE XP DUEL!',
    body: `Petarung *@${jidToNumber(challengerJid)}* menantang *@${oppNum}* beradu Suit (Batu-Gunting-Kertas)!\n\n` +
          `💰 *Taruhan XP:* *${parsedBet} XP*\n` +
          `📊 *Duel Harian:* (${dailyCount}/${MAX_DAILY_DUELS} pertandingan hari ini)\n\n` +
          `👉 *Respon Lawan:*\n` +
          `• Ketik */terima* untuk bertarung\n` +
          `• Ketik */tolak* untuk membatalkan\n\n` +
          `⏱️ *Batas Waktu Respon:* 60 detik`,
    footer: 'Pajak arena 5% burn fee untuk pemenang.',
  });

  return {
    success: true,
    message: card,
    mentions: [challengerJid, opponentJid],
  };
}

/**
 * Terima tantangan duel
 */
async function acceptChallenge(sock, groupJid, userJid, msg) {
  const duel = activeDuels.get(groupJid);
  if (!duel || duel.status !== 'WAITING_ACCEPT') {
    return {
      success: false,
      message: warning('Tidak Ada Tantangan', 'Tidak ada tantangan duel yang sedang menunggu konfirmasi di grup ini.'),
    };
  }

  if (userJid !== duel.opponentJid) {
    const oppNum = jidToNumber(duel.opponentJid);
    return {
      success: false,
      message: warning('Bukan Untukmu', `Hanya @${oppNum} yang berhak menerima tantangan duel ini!`),
      mentions: [duel.opponentJid],
    };
  }

  // Update status ke CHOOSING dan restart timer
  if (duel.timer) clearTimeout(duel.timer);
  duel.status = 'CHOOSING';
  duel.timer = setTimeout(() => handleTimeout(sock, groupJid), TIMEOUT_MS);

  const cNum = jidToNumber(duel.challengerJid);
  const oNum = jidToNumber(duel.opponentJid);

  const card = box({
    prefix: 'POLARIS ARENA',
    statusTag: 'BATTLE START',
    title: '⚔️ DUEL SUIT DIMULAI!',
    body: `Tantangan telah diterima oleh *@${oNum}*!\n\n` +
          `🥊 *Petarung 1:* @${cNum}\n` +
          `🥊 *Petarung 2:* @${oNum}\n` +
          `💰 *Taruhan:* *${duel.bet} XP*\n\n` +
          `🔒 *CARA MEMILIH (ANTI-INTIP & ANTI-LAG):*\n` +
          `1. Ketik di grup ini: */suit batu* / */suit gunting* / */suit kertas*\n` +
          `   *(Pesanmu akan OTOMATIS dihapus bot dalam 0.3 detik agar lawan tidak melihat!)*\n` +
          `2. *ATAU* kirim pesan pribadi (PM) ke Bot: */suit [pilihan]*\n\n` +
          `⏱️ *Waktu Memilih:* 60 detik!`,
    footer: 'Pilihan kedua pemain dikunci secara rahasia.',
  });

  return {
    success: true,
    message: card,
    mentions: [duel.challengerJid, duel.opponentJid],
  };
}

/**
 * Tolak tantangan duel
 */
async function rejectChallenge(sock, groupJid, userJid, msg) {
  const duel = activeDuels.get(groupJid);
  if (!duel || duel.status !== 'WAITING_ACCEPT') {
    return {
      success: false,
      message: warning('Tidak Ada Tantangan', 'Tidak ada tantangan duel yang bisa ditolak saat ini.'),
    };
  }

  const isOpponent = userJid === duel.opponentJid;
  const isChallenger = userJid === duel.challengerJid;

  if (!isOpponent && !isChallenger) {
    return {
      success: false,
      message: warning('Akses Ditolak', 'Hanya penantang atau lawan yang dapat membatalkan duel ini.'),
    };
  }

  cleanupDuel(groupJid);

  const userNum = jidToNumber(userJid);
  const text = isOpponent
    ? `❌ @${userNum} telah menolak tantangan duel. Pertandingan dibatalkan.`
    : `❌ @${userNum} telah membatalkan tantangan duelnya.`;

  return {
    success: true,
    message: info('Duel Dibatalkan', text),
    mentions: [userJid],
  };
}

/**
 * Submit pilihan suit (Batu / Gunting / Kertas)
 * Mendukung pengiriman di grup (auto-delete) ATAU via PM bot (anti-peek)
 */
async function submitChoice(sock, chatJid, userJid, rawChoice, msg, isGroup) {
  const choice = normalizeChoice(rawChoice);
  if (!choice) {
    return {
      success: false,
      message: warning(
        'Pilihan Tidak Valid',
        'Gunakan pilihan: */suit batu*, */suit gunting*, atau */suit kertas*.'
      ),
    };
  }

  // 1. Jika dikirim di grup, SEGERA hapus pesan tersebut agar lawan tidak sempat membaca!
  if (isGroup && msg?.key?.id) {
    try {
      await sock.sendMessage(chatJid, {
        delete: {
          remoteJid: chatJid,
          fromMe: false,
          id: msg.key.id,
          participant: msg.key.participant,
        },
      });
    } catch (_) {}
  }

  // 2. Temukan duel aktif (di grup yang sama atau via userToGroupDuel jika di PM)
  const targetGroupJid = isGroup ? chatJid : userToGroupDuel.get(userJid);
  if (!targetGroupJid || !activeDuels.has(targetGroupJid)) {
    return {
      success: false,
      message: warning('Tidak Ada Duel', 'Kamu tidak sedang memiliki duel aktif yang membutuhkan pilihan suit.'),
    };
  }

  const duel = activeDuels.get(targetGroupJid);
  if (duel.status !== 'CHOOSING') {
    return {
      success: false,
      message: warning('Belum Saatnya Memilih', 'Duel belum masuk ke tahap pemilihan suit.'),
    };
  }

  const isChallenger = userJid === duel.challengerJid;
  const isOpponent = userJid === duel.opponentJid;

  if (!isChallenger && !isOpponent) {
    return {
      success: false,
      message: warning('Bukan Peserta', 'Kamu bukan peserta dalam pertandingan duel ini.'),
    };
  }

  // Simpan pilihan
  if (isChallenger) {
    if (duel.challengerChoice) {
      return {
        success: false,
        message: info('Sudah Memilih', 'Kamu sudah mengunci pilihanmu sebelumnya. Menunggu lawan memilih...'),
      };
    }
    duel.challengerChoice = choice;
  } else {
    if (duel.opponentChoice) {
      return {
        success: false,
        message: info('Sudah Memilih', 'Kamu sudah mengunci pilihanmu sebelumnya. Menunggu lawan memilih...'),
      };
    }
    duel.opponentChoice = choice;
  }

  const userNum = jidToNumber(userJid);

  // Jika dikirim via PM, balas ke PM bahwa pilihan berhasil dikunci
  if (!isGroup) {
    await sock.sendMessage(chatJid, {
      text: success('Pilihan Dikunci', `🔒 Pilihanmu (*${choiceToDisplay(choice)}*) berhasil dikunci secara rahasia!\nMenunggu hasil duel di grup...`),
    }, { quoted: msg }).catch(() => {});
  } else {
    // Di grup, beri notifikasi anonim bahwa pemain telah memilih
    await sock.sendMessage(targetGroupJid, {
      text: `🔒 *@${userNum}* telah mengunci pilihannya secara rahasia!`,
      mentions: [userJid],
    }).catch(() => {});
  }

  // 3. Jika kedua pemain sudah memilih, selesaikan duel sekarang juga!
  if (duel.challengerChoice && duel.opponentChoice) {
    await resolveDuel(sock, duel);
  }

  return { success: true };
}

/**
 * Hitung pemenang dan transfer XP dengan 5% House Burn Fee
 */
async function resolveDuel(sock, duel) {
  const groupJid = duel.groupJid;
  if (duel.timer) clearTimeout(duel.timer);

  const c1 = duel.challengerChoice;
  const c2 = duel.opponentChoice;
  const cNum = jidToNumber(duel.challengerJid);
  const oNum = jidToNumber(duel.opponentJid);

  const c1Disp = choiceToDisplay(c1);
  const c2Disp = choiceToDisplay(c2);

  // SERI (DRAW)
  if (c1 === c2) {
    const drawCard = box({
      prefix: 'POLARIS ARENA',
      statusTag: 'DUEL DRAW',
      title: '🤝 HASIL DUEL: SERI!',
      body: `Kedua petarung mengeluarkan jurus yang sama!\n\n` +
            `🥊 *@${cNum}:* ${c1Disp}\n` +
            `🥊 *@${oNum}:* ${c2Disp}\n\n` +
            `✨ Taruhan *${duel.bet} XP* dikembalikan utuh kepada kedua pemain.\n` +
            `Pertandingan yang sangat berimbang! 🔥`,
      footer: 'Tidak ada perubahan XP.',
    });

    cleanupDuel(groupJid);
    await sock.sendMessage(groupJid, {
      text: drawCard,
      mentions: [duel.challengerJid, duel.opponentJid],
    }).catch(() => {});
    return;
  }

  // Menentukan Pemenang
  // Batu > Gunting, Gunting > Kertas, Kertas > Batu
  const challengerWins =
    (c1 === 'batu' && c2 === 'gunting') ||
    (c1 === 'gunting' && c2 === 'kertas') ||
    (c1 === 'kertas' && c2 === 'batu');

  const winnerJid = challengerWins ? duel.challengerJid : duel.opponentJid;
  const winnerName = challengerWins ? duel.challengerName : duel.opponentName;
  const winnerNum = jidToNumber(winnerJid);

  const loserJid = challengerWins ? duel.opponentJid : duel.challengerJid;
  const loserName = challengerWins ? duel.opponentName : duel.challengerName;
  const loserNum = jidToNumber(loserJid);

  // Hitung House Burn Fee (5%)
  const burnFee = Math.max(1, Math.floor(duel.bet * HOUSE_BURN_PCT));
  const netReward = duel.bet - burnFee;

  // Eksekusi transfer XP ke SQLite Database
  await groupLevelEngine.addXp(groupJid, winnerJid, netReward, winnerName, sock, null);
  await groupLevelEngine.addXp(groupJid, loserJid, -duel.bet, loserName, sock, null);

  // Catat riwayat harian untuk pencegahan alt-farming
  incrementDailyCount(groupJid, duel.challengerJid, duel.opponentJid);
  const todayTotal = getDailyCount(groupJid, duel.challengerJid, duel.opponentJid);

  // Ambil saldo akhir kedua pemain
  const winRec = rankQueries.getUserXp.get(groupJid, winnerJid) || { xp: 0, level: 1 };
  const loseRec = rankQueries.getUserXp.get(groupJid, loserJid) || { xp: 0, level: 1 };

  const resultCard = box({
    prefix: 'POLARIS ARENA',
    statusTag: 'DUEL VICTORY',
    title: '🏆 HASIL BATTLE XP DUEL!',
    body: `Pertarungan sengit telah selesai!\n\n` +
          `🥊 *@${cNum}:* ${c1Disp}\n` +
          `🥊 *@${oNum}:* ${c2Disp}\n` +
          `──────────────────────────────\n` +
          `👑 *PEMENANG:* *@${winnerNum}*\n\n` +
          `💰 *Hadiah:* *+${netReward} XP* (Total: ${winRec.xp.toLocaleString('id-ID')} XP)\n` +
          `🔥 *Pajak Arena (5% Burn):* *${burnFee} XP dimusnahkan*\n` +
          `📉 *@${loserNum}:* *-${duel.bet} XP* (Total: ${loseRec.xp.toLocaleString('id-ID')} XP)\n\n` +
          `📊 *Sisa Duel Harian Pasangan Ini:* ${todayTotal}/${MAX_DAILY_DUELS} duel`,
    footer: 'Selamat kepada pemenang arena!',
  });

  cleanupDuel(groupJid);

  await sock.sendMessage(groupJid, {
    text: resultCard,
    mentions: [duel.challengerJid, duel.opponentJid],
  }).catch(() => {});
}

module.exports = {
  createChallenge,
  acceptChallenge,
  rejectChallenge,
  submitChoice,
  getDailyCount,
  cleanupDuel,
};
