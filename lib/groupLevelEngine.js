// lib/groupLevelEngine.js — Gamifikasi Grup: Level, XP, Tiers & Leaderboard (SQLite)
const { rankQueries, raidQueries } = require('../server/db');
const { resolveParticipantNumber, jidToNumber, normalizeNumber, toJid } = require('./helpers');
const { box, success, warning, info, bullet } = require('./messageStyle');

const XP_COOLDOWN_MS = 20 * 1000; // 20 detik jeda perolehan XP untuk kenyamanan & anti-spam

/**
 * Struktur Jenjang 7 Rank Tier dengan Perolehan EXP Berskala Seimbang
 */
const RANK_TIERS = [
  {
    tierLevel: 1,
    minLevel: 1,
    maxLevel: 9,
    name: 'Bronze Novice',
    badge: '🥉',
    color: 'Bronze Copper',
    baseXpMin: 15,
    baseXpMax: 25,
    mediaBonus: 10,
    textBonus: 6,
    multiplierStr: '1.0x',
    desc: 'Tingkat pemula, mengawali jejak keaktifan di grup.',
  },
  {
    tierLevel: 2,
    minLevel: 10,
    maxLevel: 24,
    name: 'Silver Explorer',
    badge: '🥈',
    color: 'Silver Chrome',
    baseXpMin: 25,
    baseXpMax: 40,
    mediaBonus: 15,
    textBonus: 10,
    multiplierStr: '1.25x',
    desc: 'Penjelajah aktif dengan kontribusi obrolan yang stabil.',
  },
  {
    tierLevel: 3,
    minLevel: 25,
    maxLevel: 49,
    name: 'Gold Knight',
    badge: '🥇',
    color: 'Golden Yellow',
    baseXpMin: 40,
    baseXpMax: 65,
    mediaBonus: 20,
    textBonus: 14,
    multiplierStr: '1.6x',
    desc: 'Kesatria grup yang konsisten dan disegani member lain.',
  },
  {
    tierLevel: 4,
    minLevel: 50,
    maxLevel: 74,
    name: 'Platinum Vanguard',
    badge: '💎',
    color: 'Platinum White',
    baseXpMin: 65,
    baseXpMax: 95,
    mediaBonus: 25,
    textBonus: 18,
    multiplierStr: '2.0x',
    desc: 'Garda depan komunitas dengan reputasi dan keaktifan tinggi.',
  },
  {
    tierLevel: 5,
    minLevel: 75,
    maxLevel: 99,
    name: 'Diamond Champion',
    badge: '👑',
    color: 'Cyan Diamond',
    baseXpMin: 95,
    baseXpMax: 135,
    mediaBonus: 30,
    textBonus: 22,
    multiplierStr: '2.5x',
    desc: 'Kampiun obrolan, pilar utama penggerak suasana grup.',
  },
  {
    tierLevel: 6,
    minLevel: 100,
    maxLevel: 149,
    name: 'Master Grandmaster',
    badge: '🌌',
    color: 'Deep Nebula',
    baseXpMin: 135,
    baseXpMax: 180,
    mediaBonus: 35,
    textBonus: 28,
    multiplierStr: '3.0x',
    desc: 'Master percakapan legendaris di garda terdepan Polaris.',
  },
  {
    tierLevel: 7,
    minLevel: 150,
    maxLevel: 999,
    name: 'Cosmos Legend',
    badge: '⭐',
    color: 'Cosmic Gold',
    baseXpMin: 180,
    baseXpMax: 250,
    mediaBonus: 45,
    textBonus: 35,
    multiplierStr: '4.0x',
    desc: 'Legenda kosmik tertinggi di puncak tahta kekuasaan Polaris.',
  },
];

/**
 * Formula XP kumulatif yang dibutuhkan untuk mencapai level tertentu
 * Kurva progresif RPG seimbang:
 * Level 1: 0 XP
 * Level 2: 125 XP (mudah dicapai dalam 4-6 obrolan awal)
 * Level bertahap naik proporsional dengan peningkatan rate perolehan EXP di tiap tier
 */
function xpForLevel(lvl) {
  if (lvl <= 1) return 0;
  return Math.floor(75 * Math.pow(lvl - 1, 1.45) + 50 * (lvl - 1));
}

/**
 * Hitung level saat ini dari total XP
 */
function calculateLevel(xp) {
  if (!xp || xp < 125) return 1;
  let lvl = 1;
  while (xp >= xpForLevel(lvl + 1)) {
    lvl++;
  }
  return lvl;
}

/**
 * Dapatkan data Rank Tier lengkap berdasarkan level
 */
function getRankTier(level) {
  const lvl = Math.max(1, parseInt(level, 10) || 1);
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (lvl >= RANK_TIERS[i].minLevel) {
      return RANK_TIERS[i];
    }
  }
  return RANK_TIERS[0];
}

/**
 * Kalkulasi perolehan EXP berjenjang berdasarkan level user saat ini,
 * panjang pesan (effort bonus), dan ada tidaknya media
 */
function calculateEarnedXp(currentLevel, messageText = '', hasMedia = false) {
  const tier = getRankTier(currentLevel);

  // 1. Base EXP acak sesuai bracket tier
  const baseEarned = Math.floor(Math.random() * (tier.baseXpMax - tier.baseXpMin + 1)) + tier.baseXpMin;

  // 2. Bonus Media (gambar, video, audio, stiker, dokumen)
  const mediaXp = hasMedia ? tier.mediaBonus : 0;

  // 3. Bonus Usaha / Kualitas Panjang Pesan (Text Length Effort Bonus)
  const len = String(messageText || '').trim().length;
  let textXp = 0;
  if (len >= 60) {
    textXp = tier.textBonus; // Pesan panjang / diskusi mendalam
  } else if (len >= 20) {
    textXp = Math.floor(tier.textBonus * 0.5); // Pesan kalimat wajar
  }

  const total = baseEarned + mediaXp + textXp;
  return {
    total,
    baseEarned,
    mediaXp,
    textXp,
    tier,
  };
}

/**
 * Cek apakah sistem rank aktif di grup ini
 */
function isPlayRankEnabled(groupJid) {
  try {
    const row = rankQueries.getGroupSetting.get(groupJid);
    return Boolean(row && row.is_enabled === 1);
  } catch (err) {
    console.error('[groupLevelEngine] Gagal cek setting playrank:', err.message);
    return false;
  }
}

/**
 * Ambil konfigurasi lengkap rank grup
 */
function getGroupRankSetting(groupJid) {
  try {
    return rankQueries.getGroupSetting.get(groupJid) || { is_enabled: 0, level_up_notice: 1 };
  } catch (_) {
    return { is_enabled: 0, level_up_notice: 1 };
  }
}

/**
 * Ubah status aktivasi rank grup
 */
function setPlayRankSetting(groupJid, isEnabled, levelUpNotice = 1) {
  const now = new Date().toISOString();
  rankQueries.setGroupSetting.run({
    group_jid: groupJid,
    is_enabled: isEnabled ? 1 : 0,
    level_up_notice: levelUpNotice ? 1 : 0,
    created_at: now,
    updated_at: now,
  });
  return { is_enabled: isEnabled ? 1 : 0, level_up_notice: levelUpNotice ? 1 : 0 };
}

/**
 * Reset seluruh data rank di grup
 */
function resetGroupRank(groupJid) {
  rankQueries.resetGroup.run(groupJid);
  return true;
}

/**
 * Evaluasi pesan masuk untuk perolehan XP berskala tier dan deteksi Level Up seimbang
 */
async function processMessage(sock, msg, senderNumber) {
  try {
    const chatJid = msg.key.remoteJid;
    if (!chatJid || !chatJid.endsWith('@g.us')) return;
    if (msg.key.fromMe) return;

    // Cek apakah fitur /playrank diaktifkan untuk grup ini
    if (!isPlayRankEnabled(chatJid)) return;

    const userJid = msg.key.participant || msg.key.remoteJidAlt || `${senderNumber}@s.whatsapp.net`;
    const pushName = msg.pushName || '';
    const now = Date.now();

    const currentRecord = rankQueries.getUserXp.get(chatJid, userJid) || {
      xp: 0,
      level: 1,
      message_count: 0,
      last_xp_at: 0,
    };

    // Selalu tambah jumlah pesan
    const newMessageCount = (currentRecord.message_count || 0) + 1;

    // Cek anti-spam cooldown perolehan XP (20 detik)
    const lastXpTime = currentRecord.last_xp_at || 0;
    const canEarnXp = (now - lastXpTime) >= XP_COOLDOWN_MS;

    let newXp = currentRecord.xp || 0;
    let earnedXp = 0;

    if (canEarnXp) {
      const m = msg.message;
      const text =
        m?.conversation ||
        m?.extendedTextMessage?.text ||
        m?.imageMessage?.caption ||
        m?.videoMessage?.caption ||
        m?.documentMessage?.caption ||
        '';

      const hasMedia = Boolean(
        m?.imageMessage ||
        m?.videoMessage ||
        m?.audioMessage ||
        m?.stickerMessage ||
        m?.documentMessage ||
        m?.viewOnceMessage ||
        m?.viewOnceMessageV2
      );

      // Hitung perolehan EXP berskala sesuai tier level saat ini
      const reward = calculateEarnedXp(currentRecord.level || 1, text, hasMedia);
      earnedXp = reward.total;
      newXp += earnedXp;
    }

    const oldLevel = currentRecord.level || calculateLevel(currentRecord.xp || 0);
    const newLevel = calculateLevel(newXp);

    const isoNow = new Date().toISOString();
    rankQueries.upsertUserXp.run({
      group_jid: chatJid,
      user_jid: userJid,
      user_name: pushName || currentRecord.user_name || '',
      xp: newXp,
      level: newLevel,
      message_count: newMessageCount,
      last_xp_at: canEarnXp ? now : lastXpTime,
      created_at: isoNow,
      updated_at: isoNow,
    });

    // Rayakan kenaikan level jika ada dan fitur notifikasi aktif
    if (newLevel > oldLevel) {
      const setting = getGroupRankSetting(chatJid);
      if (setting.level_up_notice !== 0) {
        const oldTier = getRankTier(oldLevel);
        const newTier = getRankTier(newLevel);
        const isTierUp = newTier.tierLevel > oldTier.tierLevel;
        const mentionNum = senderNumber || jidToNumber(userJid);

        let tierBonusText = '';
        if (isTierUp) {
          tierBonusText = `\n👑 *PROMOSI TIER:* Selamat, kamu resmi naik ke ${newTier.badge} *${newTier.name}*!\nRate EXP kamu kini meningkat menjadi *${newTier.baseXpMin}-${newTier.baseXpMax} XP/chat* (${newTier.multiplierStr})!`;
        }

        const levelUpMsg =
          `🎉 *[LEVEL UP!]*\n` +
          `──────────────────────────────\n` +
          `Selamat @${mentionNum}, kamu baru saja naik level!\n\n` +
          `🆙 *Level:* Level ${oldLevel} ➔ *Level ${newLevel}*\n` +
          `🎖️ *Rank Tier:* ${newTier.badge} *${newTier.name}* (Tingkat ${newTier.tierLevel}/7)\n` +
          `⚡ *Rate EXP:* ${newTier.baseXpMin}-${newTier.baseXpMax} XP/chat (${newTier.multiplierStr})\n` +
          `✨ *Total XP:* ${newXp.toLocaleString('id-ID')} XP` +
          tierBonusText +
          `\n──────────────────────────────\n` +
          `Terus aktif mengobrol untuk menguasai tahta Top 1 grup! 🚀`;

        await sock.sendMessage(chatJid, {
          text: levelUpMsg,
          mentions: [toJid(mentionNum)],
        }, { quoted: msg }).catch(() => {});
      }
    }
  } catch (err) {
    console.error('[groupLevelEngine] Error processMessage:', err.message);
  }
}

/**
 * Generator visual progress bar
 */
function generateProgressBar(currentInLvl, neededInLvl, length = 10) {
  if (neededInLvl <= 0) neededInLvl = 1;
  const ratio = Math.min(1, Math.max(0, currentInLvl / neededInLvl));
  const filledCount = Math.round(ratio * length);
  const emptyCount = length - filledCount;
  const filled = '▰'.repeat(filledCount);
  const empty = '▱'.repeat(emptyCount);
  const pct = Math.round(ratio * 100);
  return `${filled}${empty} ${pct}%`;
}

/**
 * Buat kartu profil /rank untuk user
 */
function getRankCard(groupJid, userJid, displayName, phoneNumber) {
  const record = rankQueries.getUserXp.get(groupJid, userJid) || {
    xp: 0,
    level: 1,
    message_count: 0,
  };

  const level = record.level || calculateLevel(record.xp);
  const tier = getRankTier(level);
  const currentXp = record.xp || 0;

  const prevLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const xpInCurrentLvl = Math.max(0, currentXp - prevLevelXp);
  const neededForNextLvl = Math.max(1, nextLevelXp - prevLevelXp);

  const progressBar = generateProgressBar(xpInCurrentLvl, neededForNextLvl, 10);
  const rankPos = rankQueries.getUserRank.get(groupJid, currentXp)?.rank || 1;
  const totalMembers = rankQueries.getTotalMembers.get(groupJid)?.total || 1;

  const display = displayName || record.user_name || `@${phoneNumber}`;
  const equippedTitle = raidQueries ? raidQueries.getEquippedTitle(userJid) : null;
  const titleLine = equippedTitle ? `🏷️ *Titel RPG:* ${equippedTitle.title_badge} *${equippedTitle.title_name}*\n` : '';

  const body =
    `👤 *Member:* ${display}\n` +
    titleLine +
    `🎖️ *Rank Tier:* ${tier.badge} *${tier.name}* (Tingkat ${tier.tierLevel}/7)\n` +
    `🆙 *Level:* *Level ${level}*\n` +
    `⚡ *Rate EXP Tier:* *${tier.baseXpMin} - ${tier.baseXpMax} XP* / chat (${tier.multiplierStr})\n` +
    `🎁 *Bonus Tier:* +${tier.mediaBonus} XP Media • +${tier.textBonus} XP Diskusi\n` +
    `📊 *Posisi Leaderboard:* *#${rankPos}* dari ${totalMembers} member\n` +
    `💬 *Total Pesan:* ${record.message_count.toLocaleString('id-ID')} pesan\n\n` +
    `✨ *Progres XP:* ${currentXp.toLocaleString('id-ID')} / ${nextLevelXp.toLocaleString('id-ID')} XP\n` +
    `📈 *Level Progress:*\n${progressBar}`;

  return {
    text: box({
      prefix: 'POLARIS GAMING',
      statusTag: 'RANK',
      title: 'PROFIL LEVEL & XP',
      body,
      footer: 'Ketik /topchat untuk melihat leaderboard! | /rank tier untuk daftar tier',
    }),
    mentions: [userJid],
  };
}

/**
 * Buat tampilan struktur jenjang 7 Rank Tier dan perolehan EXP
 */
function getTierLadderCard() {
  let rows = '';
  for (const t of RANK_TIERS) {
    const range = t.maxLevel >= 999 ? `Lvl ${t.minLevel}+` : `Lvl ${t.minLevel}-${t.maxLevel}`;
    rows += `${t.badge} *${t.name}* (${range})\n` +
            `   ├ ⚡ Rate EXP: *${t.baseXpMin}-${t.baseXpMax} XP* (${t.multiplierStr})\n` +
            `   ├ 🎁 Bonus: +${t.mediaBonus} XP Media • +${t.textBonus} XP Diskusi\n` +
            `   └ 📜 _${t.desc}_\n\n`;
  }

  const body =
    `Struktur jenjang 7 Rank Tier & Perolehan EXP seimbang di Polaris:\n\n` +
    rows.trim() +
    `\n\n💡 *Tips Leveling:*\n` +
    `• Mengobrol aktif di grup memberikan EXP bertahap sesuai tier.\n` +
    `• Kalimat lebih panjang (>50 karakter) & kirim media memberi bonus EXP ekstra.\n` +
    `• Cooldown anti-spam 20 detik agar obrolan tetap kondusif.`;

  return {
    text: box({
      prefix: 'POLARIS GAMING',
      statusTag: 'TIER LIST',
      title: 'JENJANG RANK & SKALA EXP',
      body,
      footer: 'Ketik /rank untuk cek profilmu!',
    }),
  };
}

/**
 * Buat tampilan papan peringkat /topchat
 */
function getLeaderboardCard(groupJid, senderJid, senderNumber) {
  const topList = rankQueries.getLeaderboard.all(groupJid, 10);
  const totalMembers = rankQueries.getTotalMembers.get(groupJid)?.total || 0;

  if (!topList || topList.length === 0) {
    return {
      text: info('Papan Peringkat Kosong', 'Belum ada obrolan yang tercatat sejak rank diaktifkan. Mulailah mengobrol!'),
      mentions: [],
    };
  }

  const medals = ['🥇', '🥈', '🥉'];
  const mentionJids = [];
  let boardRows = '';

  topList.forEach((row, index) => {
    const medal = medals[index] || `#${index + 1}`;
    const tier = getRankTier(row.level);
    const num = jidToNumber(row.user_jid);
    const name = row.user_name ? `${row.user_name} (@${num})` : `@${num}`;
    mentionJids.push(row.user_jid);

    boardRows += `${medal} *${name}*\n` +
                 `   ├ 🎖️ *${tier.badge} ${tier.name}* • Lvl ${row.level}\n` +
                 `   └ ✨ *${row.xp.toLocaleString('id-ID')} XP* (${row.message_count} pesan)\n`;
  });

  // Cek posisi user sendiri jika di luar Top 10
  const senderRecord = rankQueries.getUserXp.get(groupJid, senderJid);
  let userRankFooter = '';
  if (senderRecord) {
    const myRank = rankQueries.getUserRank.get(groupJid, senderRecord.xp)?.rank || 1;
    if (myRank > 10) {
      userRankFooter = `\n──────────────────────────────\n📍 *Peringkat Kamu:* #${myRank} (Lvl ${senderRecord.level} • ${senderRecord.xp.toLocaleString('id-ID')} XP)`;
    }
  }

  const fullContent =
    `Daftar member paling aktif di grup ini:\n\n` +
    boardRows +
    userRankFooter;

  return {
    text: box({
      prefix: 'POLARIS GAMING',
      statusTag: 'LEADERBOARD',
      title: 'TOP 10 ACTIVE CHATTERS',
      body: fullContent,
      footer: `Total Partisipan: ${totalMembers} member`,
    }),
    mentions: mentionJids,
  };
}

/**
 * Tambah atau kurangi XP pengguna secara eksplisit (misal dari game tebak kata atau spin)
 */
async function addXp(groupJid, userJid, deltaXp, userName, sock, msg) {
  try {
    const current = rankQueries.getUserXp.get(groupJid, userJid) || {
      xp: 0,
      level: 1,
      message_count: 0,
      last_xp_at: 0,
      last_spin_at: 0,
      user_name: userName || '',
    };

    const newXp = Math.max(0, (current.xp || 0) + deltaXp);
    const oldLevel = current.level || calculateLevel(current.xp || 0);
    const newLevel = calculateLevel(newXp);
    const isoNow = new Date().toISOString();

    rankQueries.upsertUserXp.run({
      group_jid: groupJid,
      user_jid: userJid,
      user_name: userName || current.user_name || '',
      xp: newXp,
      level: newLevel,
      message_count: current.message_count || 0,
      last_xp_at: current.last_xp_at || 0,
      created_at: isoNow,
      updated_at: isoNow,
    });

    if (sock && msg && newLevel > oldLevel) {
      const setting = getGroupRankSetting(groupJid);
      if (setting.level_up_notice !== 0) {
        const oldTier = getRankTier(oldLevel);
        const newTier = getRankTier(newLevel);
        const isTierUp = newTier.tierLevel > oldTier.tierLevel;
        const num = jidToNumber(userJid);

        let tierBonusText = '';
        if (isTierUp) {
          tierBonusText = `\n👑 *PROMOSI TIER:* Selamat, kamu naik ke ${newTier.badge} *${newTier.name}*!\nRate EXP kamu kini menjadi *${newTier.baseXpMin}-${newTier.baseXpMax} XP/chat* (${newTier.multiplierStr})!`;
        }

        const levelUpMsg =
          `🎉 *[LEVEL UP!]*\n` +
          `──────────────────────────────\n` +
          `Selamat @${num}, kamu baru saja naik level berkat bermain game!\n\n` +
          `🆙 *Level:* Level ${oldLevel} ➔ *Level ${newLevel}*\n` +
          `🎖️ *Rank Tier:* ${newTier.badge} *${newTier.name}* (Tingkat ${newTier.tierLevel}/7)\n` +
          `⚡ *Rate EXP:* ${newTier.baseXpMin}-${newTier.baseXpMax} XP/chat (${newTier.multiplierStr})\n` +
          `✨ *Total XP:* ${newXp.toLocaleString('id-ID')} XP` +
          tierBonusText +
          `\n──────────────────────────────\n` +
          `Peringkatmu di /topchat melesat naik! 🚀`;

        await sock.sendMessage(groupJid, {
          text: levelUpMsg,
          mentions: [toJid(num)],
        }, { quoted: msg }).catch(() => {});
      }
    }

    return { oldXp: current.xp, newXp, oldLevel, newLevel };
  } catch (err) {
    console.error('[groupLevelEngine] Gagal addXp:', err.message);
    return null;
  }
}

module.exports = {
  RANK_TIERS,
  xpForLevel,
  calculateLevel,
  getRankTier,
  calculateEarnedXp,
  generateProgressBar,
  isPlayRankEnabled,
  getGroupRankSetting,
  setPlayRankSetting,
  resetGroupRank,
  processMessage,
  addXp,
  getRankCard,
  getTierLadderCard,
  getLeaderboardCard,
};
