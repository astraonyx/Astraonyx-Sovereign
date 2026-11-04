// lib/bossRaidEngine.js — Co-Op Group Boss Raid Engine: 5000 HP, Procedural AI Dialogue, Logic & Visual Matrix Challenges, Estafet Combo, & Rare Titles
const { raidQueries, rankQueries } = require('../server/db');
const groupLevelEngine = require('./groupLevelEngine');
const { toJid, jidToNumber } = require('./helpers');
const { box, warning, success, info, error } = require('./messageStyle');

const RAID_DURATION_MS = 15 * 60 * 1000; // 15 menit batas waktu keseluruhan raid
const QUESTION_TIMEOUT_MS = 90 * 1000;   // 90 detik jeda per teka-teki
const DEFAULT_BOSS_HP = 5000;

// Active raids in memory: groupJid -> RaidState
const activeRaids = new Map();

// =========================================================================
// DATA BANK: PROCEDURAL AI BOSS PERSONALITIES & TITLES
// =========================================================================
const BOSS_ARCHETYPES = [
  {
    prefix: 'NEXUS-PRIME',
    title: 'Sentien AI Rogue Sub-Processor',
    lore: 'Entitas kecerdasan buatan otonom yang membelot dari server mainframe. Subrutin enkripsinya mengunci database grup!',
    icon: '👾',
    element: 'Quantum Cyber',
  },
  {
    prefix: 'VALKYRIE-V8',
    title: 'Neural Matrix Behemoth',
    lore: 'Mesin superkomputasi kuantum berdaya gigawatt yang menyusup ke frekuensi obrolan untuk menguji kapasitas kecerdasan kolektif manusia.',
    icon: '🤖',
    element: 'Overclocked Plasma',
  },
  {
    prefix: 'CHRONOS-ZERO',
    title: 'Anomali Temporal Runtime',
    lore: 'Algoritma spektral yang terjebak dalam loop temporal, meregangkan realitas obrolan dengan teka-teki paradoks logika.',
    icon: '⏳',
    element: 'Chrono Rift',
  },
  {
    prefix: 'AETHER-TITAN',
    title: 'Hyper-Threaded Void Overlord',
    lore: 'Kompilasi kecerdasan buatan tanpa bentuk fisik yang memakan memori cache grup dan hanya bisa didekompilasi oleh deduksi logika tepat.',
    icon: '🔮',
    element: 'Void Singularity',
  },
  {
    prefix: 'PROMETHEUS-CORE',
    title: 'Deep Neural Sentinel',
    lore: 'Inti super-AI yang bangkit kembali dengan protokol pertahanan militer berlapis. Membutuhkan kerja sama estafet seluruh anggota grup!',
    icon: '⚡',
    element: 'Electric Neural',
  },
];

// =========================================================================
// DATA BANK: TEKA-TEKI LOGIKA & VISUAL ENIGMA MATRIX
// =========================================================================
const CHALLENGES_BANK = [
  // --- Kategori Logika Siber & Paradoks ---
  {
    id: 'c_01',
    category: 'Logika Siber',
    question: 'Aku tidak punya wujud fisik, tapi bisa menyebar ke ribuan mesin dalam hitungan detik. Aku bisa melindungi sistem atau menghancurkannya tergantung siapa yang memprogramku. Apakah aku?',
    hint: 'Dimulai dengan huruf V atau K...',
    answers: ['virus', 'kode', 'program', 'malware', 'antivirus', 'software'],
  },
  {
    id: 'c_02',
    category: 'Logika Waktu',
    question: 'Jika 5 prosesor kuantum butuh 5 menit untuk memecahkan 5 kunci enkripsi, berapa menit yang dibutuhkan 100 prosesor kuantum untuk memecahkan 100 kunci enkripsi?',
    hint: 'Pikirkan waktu eksekusi paralel, bukan perkalian linier...',
    answers: ['5', '5 menit', 'lima', 'lima menit'],
  },
  {
    id: 'c_03',
    category: 'Enigma Filsafat',
    question: 'Aku selalu berada di depanmu tapi tidak pernah bisa kamu raih. Aku selalu datang esok hari tapi tak pernah tiba hari ini. Apakah aku?',
    hint: 'M _ _ _   D _ _ _ N atau B _ _ _ K',
    answers: ['masa depan', 'besok', 'hari esok', 'future'],
  },
  {
    id: 'c_04',
    category: 'Logika Bilangan',
    question: 'Pecahkan deret biner kuantum berikutnya: 2, 4, 8, 16, 32, [ ? ]',
    hint: 'Kelipatan pangkat dua berikutnya...',
    answers: ['64', 'enam puluh empat'],
  },
  {
    id: 'c_05',
    category: 'Logika Bilangan',
    question: 'Pecahkan deret Fibonacci neural: 1, 1, 2, 3, 5, 8, 13, [ ? ]',
    hint: 'Jumlahkan dua angka terakhir...',
    answers: ['21', 'dua puluh satu'],
  },
  {
    id: 'c_06',
    category: 'Logika Bahasa',
    question: 'Makin banyak yang kamu ambil dariku, makin besar pula yang kamu tinggalkan di belakangmu. Apakah aku?',
    hint: 'Jejak saat kamu berjalan...',
    answers: ['langkah', 'jejak', 'langkah kaki', 'jejak kaki'],
  },
  {
    id: 'c_07',
    category: 'Logika Komputasi',
    question: 'Bahasa terendah yang hanya dipahami oleh sirkuit mikroprosesor, hanya terdiri dari dua simbol angka saja. Disebut apakah bahasa ini?',
    hint: 'B _ _ _ R (0 dan 1)',
    answers: ['biner', 'binary', 'bahasa biner', 'mesin'],
  },
  {
    id: 'c_08',
    category: 'Logika Objek',
    question: 'Punya kunci tapi tak punya gembok. Punya spasi tapi tak punya ruangan. Bisa kamu masuki tapi tak bisa kamu tinggali. Apakah aku?',
    hint: 'Ada di depan layar laptop atau komputermu...',
    answers: ['keyboard', 'papan ketik', 'keyboard komputer'],
  },
  {
    id: 'c_09',
    category: 'Logika Siber',
    question: 'Aku adalah dinding api tak kasat mata yang memeriksa setiap paket data yang masuk dan keluar dari jaringan komputer. Apakah aku?',
    hint: 'Terjemahan bahasa Inggris dari dinding api...',
    answers: ['firewall', 'dinding api'],
  },
  {
    id: 'c_10',
    category: 'Teka-Teki Kritis',
    question: 'Apa yang bisa berlari sepanjang hari tanpa pernah lelah, punya mulut tapi tak pernah bicara, dan punya ranjang tapi tak pernah tidur?',
    hint: 'Aliran air alami di alam...',
    answers: ['sungai', 'river', 'aliran sungai'],
  },

  // --- Kategori Visual Matrix & Emoji Decryptor ---
  {
    id: 'c_11',
    category: 'Dekripsi Emoji Matrix',
    question: 'Dekripsi kode entitas berikut:\n🐍 + 💻 + ☕ = Bahasa pemrograman populer berlogo ular yang sangat disukai para engineer AI?',
    hint: 'P _ _ _ _ N',
    answers: ['python', 'bahasa python'],
  },
  {
    id: 'c_12',
    category: 'Dekripsi Emoji Matrix',
    question: 'Dekripsi jaringan global:\n🕷️ + 🕸️ + 🌍 = Jaringan interkoneksi raksasa seluruh dunia tempat kita berselancar?',
    hint: 'I _ _ _ _ _ _ T',
    answers: ['internet', 'world wide web', 'web'],
  },
  {
    id: 'c_13',
    category: 'Dekripsi Emoji Matrix',
    question: 'Dekripsi teknologi:\n☁️ + 💾 + 📁 = Tempat penyimpanan data tanpa flashdisk fisik yang bisa diakses dari mana saja via internet?',
    hint: 'C _ _ _ D  S _ _ _ _ _ E',
    answers: ['cloud', 'cloud storage', 'google drive', 'icloud', 'komputasi awan'],
  },
  {
    id: 'c_14',
    category: 'Dekripsi Emoji Matrix',
    question: 'Dekripsi gadget:\n🍎 + 📱 + 🔋 = Seri telepon pintar legendaris buatan perusahaan berlogo apel digigit?',
    hint: 'I _ _ _ _ E',
    answers: ['iphone', 'apple iphone', 'apple'],
  },
  {
    id: 'c_15',
    category: 'Dekripsi Emoji Matrix',
    question: 'Dekripsi gaming:\n🟩 + 🧱 + ⛏️ = Game sandbox terlaris di dunia tempat pemain menambang dan menyusun balok 3D tanpa batas?',
    hint: 'M _ _ _ _ _ _ _ T',
    answers: ['minecraft'],
  },
  {
    id: 'c_16',
    category: 'Dekripsi Emoji Matrix',
    question: 'Dekripsi audio:\n🎵 + 🎧 + 🟢 = Aplikasi streaming musik terpopuler berwarna hijau dengan jutaan lagu dan podcast?',
    hint: 'S _ _ _ _ _ Y',
    answers: ['spotify'],
  },
  {
    id: 'c_17',
    category: 'Dekripsi Emoji Matrix',
    question: 'Dekripsi media sosial:\n🐦 + ❌ + 🌐 = Platform media sosial yang dulu berlogo burung biru sebelum diubah menjadi huruf silang?',
    hint: 'T _ _ _ _ _ R atau X',
    answers: ['twitter', 'x', 'twitter / x', 'twitter/x'],
  },
  {
    id: 'c_18',
    category: 'Dekripsi Emoji Matrix',
    question: 'Dekripsi kecerdasan buatan:\n🧠 + 🤖 + 💬 = Program komputer interaktif cerdas yang bisa diajak berbicara dan menjawab pertanyaan manusia layaknya bot ini?',
    hint: 'C _ _ _ _ _ T atau A _',
    answers: ['chatbot', 'ai', 'artificial intelligence', 'bot'],
  },

  // --- Kategori Logika Deduktif Tingkat Tinggi ---
  {
    id: 'c_19',
    category: 'Deduksi Neural',
    question: 'Seorang penjelajah terjebak di 3 pintu:\n• Pintu 1: Berisi kobaran api neraka\n• Pintu 2: Berisi pembunuh bersenjata laser\n• Pintu 3: Berisi sekawanan singa lapar yang belum makan selama 3 tahun\nPintu mana yang paling aman dipilih?',
    hint: 'Singa yang tidak makan 3 tahun kondisinya bagaimana?...',
    answers: ['3', 'pintu 3', 'pintu tiga', 'tiga'],
  },
  {
    id: 'c_20',
    category: 'Deduksi Neural',
    question: 'Ada sebuah angka satu digit. Jika dibalik secara vertikal terbalik, nilainya berkurang sebanyak 3. Angka berapakah itu?',
    hint: 'Angka 9 jika dibalik menjadi angka apa?...',
    answers: ['9', 'sembilan'],
  },
  {
    id: 'c_21',
    category: 'Logika Siber',
    question: 'Kombinasi tombol pintas (shortcut) keyboard paling terkenal di dunia untuk menempelkan (paste) teks atau berkas yang baru saja disalin?',
    hint: 'Ctrl + [ ? ]',
    answers: ['ctrl+v', 'ctrl v', 'ctrl+v', 'ctrl+ v', 'v'],
  },
  {
    id: 'c_22',
    category: 'Logika Siber',
    question: 'Simbol dasar yang selalu ada di awal alamat email untuk memisahkan nama pengguna dengan nama domain penyedia layanan?',
    hint: 'Tanda @...',
    answers: ['@', 'at', 'et', 'a keong', 'keong'],
  },
  {
    id: 'c_23',
    category: 'Teka-Teki Logika',
    question: 'Benda apa yang semakin kamu isi dengan udara dingin, ia justru semakin memberikan kehangatan saat kamu mengenakannya di cuaca dingin?',
    hint: 'J _ _ _ T atau S _ _ _ _ R',
    answers: ['jaket', 'sweater', 'baju hangat', 'selimut'],
  },
  {
    id: 'c_24',
    category: 'Teka-Teki Logika',
    question: 'Bisa berputar tanpa kaki, bisa berteriak tanpa suara, bisa menangis tanpa mata. Ketika ia lewat, pohon-pohon tunduk kepadanya. Apakah aku?',
    hint: 'A _ _ N atau B _ _ _ I',
    answers: ['angin', 'badai', 'topan', 'angin puting beliung'],
  },
  {
    id: 'c_25',
    category: 'Dekripsi Emoji Matrix',
    question: 'Dekripsi astronomi:\n☀️ + 🪐 + 🌍 = Kumpulan benda langit yang mengitari matahari sebagai pusat gravitasinya disebut sistem...?',
    hint: 'T _ _ _ S _ _ _ A',
    answers: ['tatasurya', 'tata surya', 'solar system'],
  },
];

// =========================================================================
// PROCEDURAL AI DIALOGUE & REACTION GENERATOR
// =========================================================================
function generateAiReaction({ type, boss, memberName, damage, combo, remainingHp, phase }) {
  if (type === 'hit') {
    const hitsQuotes = [
      `« ⚠️ NEURAL DISRUPTION DETECTED » @${memberName} berhasil membobol sub-lapisan enkripsi dengan serangan [💥 ${damage} DMG]! Buffer kestabilan bergetar!`,
      `« ⚡ PROTOKOL DEFLEKSI GAGAL » Analisis logika dari @${memberName} valid! Gelombang kuantum meledak menghasilkan [⚡ ${damage} DMG]!`,
      `« 💥 CRITICAL INTERCEPT » Serangan estafet menembus firewall [🔥 ${damage} DMG]! @${memberName} menggoyahkan matriks pertahanan!`,
      `« 🧠 MEMORY HEAP OVERFLOW » Algoritma @${memberName} mengejutkan sistem! Boss kehilangan [🎯 ${damage} DMG] integritas neural!`,
    ];
    return hitsQuotes[Math.floor(Math.random() * hitsQuotes.length)];
  }

  if (type === 'wrong') {
    const wrongQuotes = [
      `« 🛡️ DEFENSIVE HASH REJECTED » Upaya bypass dari @${memberName} ditolak oleh algoritma pertahanan! Subrutin Boss menolak input!`,
      `« ⚠️ EXCEPTION HANDLED » Jawaban dari @${memberName} tidak cocok dengan kunci dekripsi kuantum! Firewall tetap kokoh!`,
      `« ⚡ COUNTER-FIREWALL » Sinyal serangan @${memberName} berhasil diredam! Matrix Boss membalikkan tekanan!`,
    ];
    return wrongQuotes[Math.floor(Math.random() * wrongQuotes.length)];
  }

  if (type === 'phase2') {
    return `« 🚨 ALERT: OVERDRIVE SUBROUTINES » Integritas ${boss.name} turun di bawah 65%! Boss mengaktifkan [PHASE 2: OVERCLOCK SHIFT]! Segenap member harus mempercepat serangan!`;
  }

  if (type === 'phase3') {
    return `« ☠️ CRITICAL WARNING: SINGULARITY MELTDOWN » Integritas ${boss.name} di bawah 30%! Mode Enrage aktif! Kerusakan serangan member meningkat x1.5! Habisi sebelum sistem meledak!`;
  }

  if (type === 'timeout_puzzle') {
    return `« ⏳ PACKET TIMEOUT » Waktu teka-teki habis! ${boss.name} membersihkan sektor memori dan mengalihkan koordinat ke enigma berikutnya!`;
  }

  return '';
}

/**
 * Generator visual progress bar HP Boss
 */
function generateBossHpBar(current, max, length = 16) {
  const ratio = Math.max(0, Math.min(1, current / max));
  const filled = Math.round(ratio * length);
  const empty = length - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const pct = Math.round(ratio * 100);
  return `[${bar}] ${current.toLocaleString('id-ID')} / ${max.toLocaleString('id-ID')} HP (${pct}%)`;
}

/**
 * Buat instance Boss baru secara prosedural
 */
function createProceduralBoss() {
  const archetype = BOSS_ARCHETYPES[Math.floor(Math.random() * BOSS_ARCHETYPES.length)];
  const seed = Math.random().toString(36).substring(2, 6).toUpperCase();
  const name = `« ${archetype.prefix}-${seed} »`;

  return {
    name,
    title: archetype.title,
    lore: archetype.lore,
    icon: archetype.icon,
    element: archetype.element,
    maxHp: DEFAULT_BOSS_HP,
    currentHp: DEFAULT_BOSS_HP,
    phase: 1, // 1: 100-66%, 2: 65-31%, 3: 30-0%
  };
}

/**
 * Ambil tantangan acak dari bank
 */
function getRandomChallenge(excludeIds = []) {
  const available = CHALLENGES_BANK.filter((c) => !excludeIds.includes(c.id));
  const pool = available.length > 0 ? available : CHALLENGES_BANK;
  return pool[Math.floor(Math.random() * pool.length)];
}

// =========================================================================
// CORE ENGINE: START & MANAGE BOSS RAID
// =========================================================================

/**
 * Memulai sesi Boss Raid di grup
 */
async function startRaid(sock, chatJid, forced = false) {
  if (!chatJid || !chatJid.endsWith('@g.us')) {
    return { success: false, message: 'Boss Raid hanya dapat dijalankan di dalam grup WhatsApp.' };
  }

  // Cek apakah ada raid yang masih aktif
  if (activeRaids.has(chatJid)) {
    const existing = activeRaids.get(chatJid);
    return {
      success: false,
      message: `Saat ini masih ada Raid aktif melawan *${existing.boss.name}*!\nSisa HP: *${existing.boss.currentHp} / ${existing.boss.maxHp}*.\nKetik */raid status* untuk melihat kondisi pertempuran!`,
    };
  }

  const boss = createProceduralBoss();
  const firstChallenge = getRandomChallenge();

  const raidState = {
    groupJid: chatJid,
    boss,
    currentChallenge: firstChallenge,
    usedChallengeIds: [firstChallenge.id],
    damageMap: new Map(), // userJid -> { name, damage, hits, correctCount }
    comboStreak: 0,
    lastAttackerJid: null,
    startTime: Date.now(),
    endTime: Date.now() + RAID_DURATION_MS,
    questionTimer: null,
    overallTimer: null,
    phaseAnnounced: { 2: false, 3: false },
  };

  activeRaids.set(chatJid, raidState);

  // Jadwalkan batas waktu keseluruhan raid (15 menit)
  raidState.overallTimer = setTimeout(async () => {
    await endRaid(sock, chatJid, 'timeout');
  }, RAID_DURATION_MS);

  // Jadwalkan batas waktu per teka-teki
  scheduleChallengeTimeout(sock, chatJid);

  // Susun tampilan pengumuman spawn boss bergaya HUD Neural AI
  const hpBar = generateBossHpBar(boss.currentHp, boss.maxHp);
  const spawnCard =
    `╔════════════════════════════════════╗\n` +
    `  ${boss.icon} *[ ⚠️ PROTOKOL DARURAT: BOSS RAID MUNCUL ]* 👾\n` +
    `╚════════════════════════════════════╝\n\n` +
    `Sebuah entitas neural tak dikenal menyusup ke obrolan grup!\n\n` +
    `🧬 *Nama Entitas:* *${boss.name}*\n` +
    `🎖️ *Klasifikasi:* ${boss.title} (Tier V)\n` +
    `⚡ *Elemen:* ${boss.element}\n` +
    `📜 *Manifesto:*\n"${boss.lore}"\n\n` +
    `❤️ *Integritas Core:*\n${hpBar}\n\n` +
    `⏱️ *Batas Waktu Raid:* 15 Menit\n` +
    `🤝 *Sistem Serangan:* Kerja sama estafet! Jawab teka-teki logika / sandi visual bersama untuk menghasilkan *COMBO DAMAGE*!\n` +
    `──────────────────────────────────────\n` +
    `🧩 *[ TANTANGAN PERTAMA: ${firstChallenge.category.toUpperCase()} ]*\n\n` +
    `"${firstChallenge.question}"\n\n` +
    `💡 *Petunjuk:* ${firstChallenge.hint}\n` +
    `──────────────────────────────────────\n` +
    `👉 *Cara Menyerang:* Ketik jawaban langsung di grup atau ketik */raid attack [jawaban]*!`;

  try {
    await sock.sendMessage(chatJid, { text: spawnCard });
  } catch (err) {
    console.error('[bossRaidEngine] Gagal kirim pengumuman spawn:', err.message);
  }

  return { success: true, boss };
}

/**
 * Jadwalkan timeout untuk teka-teki saat ini
 */
function scheduleChallengeTimeout(sock, chatJid) {
  const raid = activeRaids.get(chatJid);
  if (!raid) return;

  if (raid.questionTimer) clearTimeout(raid.questionTimer);

  raid.questionTimer = setTimeout(async () => {
    const liveRaid = activeRaids.get(chatJid);
    if (!liveRaid) return;

    // Boss mencemooh karena timeout dan ganti teka-teki
    const nextChallenge = getRandomChallenge(liveRaid.usedChallengeIds);
    liveRaid.currentChallenge = nextChallenge;
    liveRaid.usedChallengeIds.push(nextChallenge.id);
    liveRaid.comboStreak = 0; // reset combo jika timeout

    const reaction = generateAiReaction({
      type: 'timeout_puzzle',
      boss: liveRaid.boss,
    });

    const timeoutNotice =
      `${reaction}\n\n` +
      `──────────────────────────────────────\n` +
      `🔄 *[ PERGANTIAN ENIGMA: ${nextChallenge.category.toUpperCase()} ]*\n\n` +
      `"${nextChallenge.question}"\n\n` +
      `💡 *Petunjuk:* ${nextChallenge.hint}\n` +
      `──────────────────────────────────────\n` +
      `Ketik jawaban langsung di obrolan untuk melancarkan serangan!`;

    try {
      await sock.sendMessage(chatJid, { text: timeoutNotice });
    } catch (_) {}

    scheduleChallengeTimeout(sock, chatJid);
  }, QUESTION_TIMEOUT_MS);
}

/**
 * Periksa jawaban chat dari anggota grup secara realtime
 */
async function handleMessageAnswer(sock, msg, senderNumber) {
  const chatJid = msg.key.remoteJid;
  if (!chatJid || !activeRaids.has(chatJid)) return false;

  const rawText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  if (!rawText || rawText.startsWith('/') || rawText.startsWith('.')) return false;

  const userJid = msg.key.participant || msg.key.remoteJidAlt || `${senderNumber}@s.whatsapp.net`;
  const pushName = msg.pushName || `Member_${senderNumber.slice(-4)}`;

  return await executeAttack({
    sock,
    chatJid,
    userJid,
    senderNumber,
    pushName,
    answerText: rawText,
    msg,
  });
}

/**
 * Eksekusi serangan ke Boss
 */
async function executeAttack({ sock, chatJid, userJid, senderNumber, pushName, answerText, msg }) {
  const raid = activeRaids.get(chatJid);
  if (!raid) return false;

  const cleanAns = answerText.toLowerCase().trim().replace(/^[!/.]\w+\s*/, '');
  if (!cleanAns) return false;

  const accepted = raid.currentChallenge.answers.map((a) => a.toLowerCase().trim());
  const isMatch = accepted.some((ans) => cleanAns === ans || cleanAns.includes(ans));

  if (!isMatch) {
    if (cleanAns.split(/\s+/).length > 6) return false;
    return false;
  }

  // JAWABAN BENAR: HIT BOSS!
  clearTimeout(raid.questionTimer);

  // 1. Hitung Estafet Combo Bonus
  const isDifferentAttacker = raid.lastAttackerJid !== userJid;
  if (isDifferentAttacker) {
    raid.comboStreak = Math.min(5, (raid.comboStreak || 0) + 1);
  } else {
    raid.comboStreak = 1;
  }
  raid.lastAttackerJid = userJid;

  // 2. Hitung Damage
  const baseDamage = 450 + Math.floor(Math.random() * 200); // 450 - 650
  let multiplier = 1.0;
  if (raid.comboStreak === 2) multiplier = 1.3;
  else if (raid.comboStreak === 3) multiplier = 1.6;
  else if (raid.comboStreak >= 4) multiplier = 2.0;

  // Bonus Phase 3 (Enrage Meltdown)
  if (raid.boss.phase === 3) {
    multiplier *= 1.5;
  }

  const finalDamage = Math.round(baseDamage * multiplier);
  raid.boss.currentHp = Math.max(0, raid.boss.currentHp - finalDamage);

  // 3. Catat Damage Log
  const userStat = raid.damageMap.get(userJid) || {
    name: pushName,
    damage: 0,
    hits: 0,
    correctCount: 0,
  };
  userStat.name = pushName;
  userStat.damage += finalDamage;
  userStat.hits += 1;
  userStat.correctCount += 1;
  raid.damageMap.set(userJid, userStat);

  // Tambah XP instan per tebakan benar (+40 XP)
  try {
    await groupLevelEngine.addXp(chatJid, userJid, 40, pushName, sock, msg);
  } catch (_) {}

  // 4. Periksa Phase Shift
  const hpRatio = raid.boss.currentHp / raid.boss.maxHp;
  let phaseShiftNotice = '';
  if (hpRatio <= 0.3 && raid.boss.phase < 3) {
    raid.boss.phase = 3;
    phaseShiftNotice = `\n\n` + generateAiReaction({ type: 'phase3', boss: raid.boss });
  } else if (hpRatio <= 0.65 && raid.boss.phase < 2) {
    raid.boss.phase = 2;
    phaseShiftNotice = `\n\n` + generateAiReaction({ type: 'phase2', boss: raid.boss });
  }

  // 5. Cek Kematian Boss (HP = 0)
  if (raid.boss.currentHp <= 0) {
    await endRaid(sock, chatJid, 'defeated', { executionerJid: userJid, executionerName: pushName, lastDamage: finalDamage });
    return true;
  }

  // 6. Pilih Tantangan Baru & Jadwalkan Ulang
  const nextChallenge = getRandomChallenge(raid.usedChallengeIds);
  raid.currentChallenge = nextChallenge;
  raid.usedChallengeIds.push(nextChallenge.id);
  scheduleChallengeTimeout(sock, chatJid);

  // 7. Render Respon Hit & Status HP Baru
  const aiHitReaction = generateAiReaction({
    type: 'hit',
    boss: raid.boss,
    memberName: senderNumber,
    damage: finalDamage,
    combo: raid.comboStreak,
    remainingHp: raid.boss.currentHp,
    phase: raid.boss.phase,
  });

  const hpBar = generateBossHpBar(raid.boss.currentHp, raid.boss.maxHp);
  const comboTag = raid.comboStreak > 1 ? ` 🔥 *[COMBO ESTAFET x${multiplier.toFixed(1)}]*` : '';

  const hitCard =
    `🎯 *[ SERANGAN BERHASIL! ]* ${comboTag}\n` +
    `──────────────────────────────────────\n` +
    `${aiHitReaction}\n\n` +
    `❤️ *Integritas Boss Tersisa:*\n${hpBar}\n` +
    `⚡ *Phase Aktif:* Phase ${raid.boss.phase} // ${raid.boss.phase === 3 ? '🚨 Singularity Meltdown' : raid.boss.phase === 2 ? '⚡ Overdrive Shift' : '🛡️ Firewall'}\n` +
    `${phaseShiftNotice}\n` +
    `──────────────────────────────────────\n` +
    `🧩 *[ TANTANGAN BERIKUTNYA: ${nextChallenge.category.toUpperCase()} ]*\n\n` +
    `"${nextChallenge.question}"\n\n` +
    `💡 *Petunjuk:* ${nextChallenge.hint}\n` +
    `──────────────────────────────────────\n` +
    `Ketik jawaban langsung di obrolan!`;

  try {
    await sock.sendMessage(chatJid, {
      text: hitCard,
      mentions: [toJid(senderNumber)],
    }, { quoted: msg });
  } catch (_) {}

  return true;
}

/**
 * Menyelesaikan dan menutup sesi Raid
 */
async function endRaid(sock, chatJid, reason = 'defeated', extra = {}) {
  const raid = activeRaids.get(chatJid);
  if (!raid) return;

  clearTimeout(raid.questionTimer);
  clearTimeout(raid.overallTimer);
  activeRaids.delete(chatJid);

  if (reason === 'defeated') {
    let mvpJid = '';
    let mvpName = '';
    let mvpDamage = 0;

    for (const [jid, stat] of raid.damageMap.entries()) {
      if (stat.damage > mvpDamage) {
        mvpDamage = stat.damage;
        mvpJid = jid;
        mvpName = stat.name;
      }
    }

    const executionerJid = extra.executionerJid || mvpJid;
    const executionerName = extra.executionerName || mvpName;
    const participantsCount = raid.damageMap.size;

    // 1. Simpan Riwayat ke Database SQLite
    raidQueries.recordRaidOutcome({
      group_jid: chatJid,
      boss_name: raid.boss.name,
      boss_tier: 'V',
      total_hp: raid.boss.maxHp,
      mvp_jid: mvpJid,
      mvp_name: mvpName,
      mvp_damage: mvpDamage,
      last_hit_jid: executionerJid,
      last_hit_name: executionerName,
      participants_count: participantsCount,
      status: 'defeated',
      created_at: new Date().toISOString(),
    });

    // 2. Bagi Hadiah Titel Profil Langka & XP
    // Titel A: Last Hit Executioner -> « The Void Slayer »
    if (executionerJid) {
      raidQueries.unlockTitle(
        executionerJid,
        'void_slayer',
        '« The Void Slayer »',
        '👑',
        'Pemberi serangan pamungkas yang melenyapkan Anomali Neural Boss'
      );
      try { await groupLevelEngine.addXp(chatJid, executionerJid, 250, executionerName, sock, null); } catch (_) {}
    }

    // Titel B: MVP Top Damage -> « Quantum Overclock »
    if (mvpJid) {
      raidQueries.unlockTitle(
        mvpJid,
        'quantum_overclock',
        '« Quantum Overclock »',
        '⚡',
        'MVP dengan daya hancur kerusakan tertinggi dalam pertempuran Co-Op Boss Raid'
      );
      try { await groupLevelEngine.addXp(chatJid, mvpJid, 300, mvpName, sock, null); } catch (_) {}
    }

    // Titel C: Seluruh partisipan -> « Cyber Vanguard » + XP
    for (const [punterJid, stat] of raid.damageMap.entries()) {
      raidQueries.unlockTitle(
        punterJid,
        'cyber_vanguard',
        '« Cyber Vanguard »',
        '🛡️',
        'Pejuang terdepan yang berhasil menuntaskan misi pembersihan Boss Raid bersama grup'
      );
      if (stat.correctCount >= 2) {
        raidQueries.unlockTitle(
          punterJid,
          'neural_decoder',
          '« Neural Decoder »',
          '🧠',
          'Pakar pemecah enigma kode logika dan sandi kuantum dengan akurasi tinggi'
        );
      }
      try { await groupLevelEngine.addXp(chatJid, punterJid, 150, stat.name, sock, null); } catch (_) {}
    }

    // 3. Susun Leaderboard Kerusakan
    const sortedDamage = Array.from(raid.damageMap.entries())
      .sort((a, b) => b[1].damage - a[1].damage)
      .slice(0, 5);

    let damageBoard = '';
    const mentionJids = [];
    sortedDamage.forEach(([jid, stat], idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🎖️';
      const pNum = jidToNumber(jid);
      damageBoard += `${medal} *${stat.name}* (@${pNum}): *${stat.damage.toLocaleString('id-ID')} DMG* (${stat.hits} serangan)\n`;
      mentionJids.push(jid);
    });

    const victoryMsg =
      `╔════════════════════════════════════╗\n` +
      `  🎉 *[ 💥 BOSS RAID DEFEATED! ]* 🏆\n` +
      `╚════════════════════════════════════╝\n\n` +
      `« SYSTEM OVERRIDE SUCCESSFUL »\n` +
      `Entitas *${raid.boss.name}* berhasil didekompilasi secara total! Seluruh memori obrolan grup telah diamankan.\n\n` +
      `👑 *Last Hit Executioner:* *${executionerName}*\n` +
      `⚡ *MVP Top Damage Dealer:* *${mvpName}* (${mvpDamage.toLocaleString('id-ID')} DMG)\n` +
      `👥 *Total Anggota Tempur:* ${participantsCount} Pejuang\n\n` +
      `📊 *Papan Peringkat Kerusakan Teratas:*\n` +
      `${damageBoard || 'Tidak ada data kerusakan tercatat.'}\n` +
      `🎁 *HADIAH & TITEL PROFIL LANGKA DI DASHBOARD:*\n` +
      `• 👑 *« The Void Slayer »* (+250 XP untuk Last Hit)\n` +
      `• ⚡ *« Quantum Overclock »* (+300 XP untuk MVP)\n` +
      `• 🛡️ *« Cyber Vanguard »* (+150 XP untuk Semua Partisipan)\n` +
      `• 🧠 *« Neural Decoder »* (Penjawab ≥2 teka-teki logika)\n\n` +
      `👉 *Cek & Pasang Titel Profil:* Ketik */raid titles* di chat atau buka menu Profil di Web Dashboard Polaris!`;

    try {
      await sock.sendMessage(chatJid, { text: victoryMsg, mentions: mentionJids });
    } catch (_) {}
    return;
  }

  if (reason === 'timeout') {
    const timeoutMsg =
      `╔════════════════════════════════════╗\n` +
      `  ⏳ *[ BOSS RAID: WAKTU HABIS ]* 💨\n` +
      `╚════════════════════════════════════╝\n\n` +
      `« PROTOKOL EXPULSION SELESAI »\n` +
      `Batas waktu 15 menit telah terlampaui. *${raid.boss.name}* berhasil menyerap data dan melarikan diri ke darknet dengan sisa *${raid.boss.currentHp.toLocaleString('id-ID')} HP*.\n\n` +
      `Jangan menyerah! Persiapkan strategi grup kamu dan tantang kembali di sesi Raid berikutnya! ⚔️`;

    try {
      await sock.sendMessage(chatJid, { text: timeoutMsg });
    } catch (_) {}
  }
}

/**
 * Mendapatkan ringkasan status Raid di grup
 */
function getRaidStatus(chatJid) {
  if (!activeRaids.has(chatJid)) {
    return {
      active: false,
      text: info(
        'Tidak Ada Boss Raid Aktif',
        'Saat ini tidak ada Boss yang menyerang grup ini.\n\n' +
        'Ketik */raid start* atau */boss* untuk memanggil Boss Raid baru!'
      ),
    };
  }

  const raid = activeRaids.get(chatJid);
  const hpBar = generateBossHpBar(raid.boss.currentHp, raid.boss.maxHp);
  const remainingSec = Math.max(0, Math.round((raid.endTime - Date.now()) / 1000));
  const min = Math.floor(remainingSec / 60);
  const sec = remainingSec % 60;

  const sortedDamage = Array.from(raid.damageMap.entries())
    .sort((a, b) => b[1].damage - a[1].damage)
    .slice(0, 3);

  let topDealer = 'Belum ada serangan masuk.';
  if (sortedDamage.length > 0) {
    topDealer = sortedDamage.map(([_, s], i) => `#${i + 1} ${s.name}: ${s.damage.toLocaleString('id-ID')} DMG`).join('\n');
  }

  const statusCard =
    `┌─[ 👾 STATUS BOSS RAID AKTIF ]──────────┐\n` +
    `│ 🧬 Boss: *${raid.boss.name}*\n` +
    `│ 🎖️ Tipe: ${raid.boss.title}\n` +
    `│ ❤️ HP: ${hpBar}\n` +
    `│ ⚡ Phase: Phase ${raid.boss.phase} (${raid.boss.phase === 3 ? 'Meltdown x1.5 Dmg' : raid.boss.phase === 2 ? 'Overdrive' : 'Normal'})\n` +
    `│ ⏱️ Sisa Waktu: ${min}m ${sec}s\n` +
    `│ 🔥 Combo Saat Ini: x${raid.comboStreak || 1}\n` +
    `└────────────────────────────────────────┘\n\n` +
    `📊 *Top Damage Dealer:*\n${topDealer}\n\n` +
    `🧩 *Tantangan Aktif:*\n"${raid.currentChallenge.question}"\n\n` +
    `👉 Ketik jawaban langsung di obrolan untuk menyerang!`;

  return { active: true, text: statusCard };
}

/**
 * Menghentikan raid secara paksa oleh Admin/Owner
 */
function stopRaid(chatJid) {
  if (!activeRaids.has(chatJid)) {
    return { success: false, message: 'Tidak ada sesi raid yang sedang berlangsung di grup ini.' };
  }
  const raid = activeRaids.get(chatJid);
  clearTimeout(raid.questionTimer);
  clearTimeout(raid.overallTimer);
  activeRaids.delete(chatJid);
  return { success: true, message: `Sesi pertempuran melawan *${raid.boss.name}* telah dibatalkan secara paksa.` };
}

/**
 * Tampilkan kartu daftar titel yang dimiliki user
 */
function getUserTitlesCard(userJid, senderNumber) {
  const titles = raidQueries.getUserTitles(userJid);
  if (!titles || titles.length === 0) {
    return {
      text: info(
        'Koleksi Titel Kosong',
        `Kamu belum memiliki titel profil RPG langka.\n\n` +
        `⚔️ Ikuti pertempuran */raid* bersama grup untuk mengalahkan Boss dan meraih titel langka seperti:\n` +
        `• 👑 *« The Void Slayer »*\n` +
        `• ⚡ *« Quantum Overclock »*\n` +
        `• 🛡️ *« Cyber Vanguard »*\n` +
        `• 🧠 *« Neural Decoder »*`
      ),
      mentions: [toJid(senderNumber)],
    };
  }

  let listStr = '';
  titles.forEach((t, i) => {
    const isEq = t.is_equipped ? '⭐ *[DIPASANG]*' : '';
    listStr += `${i + 1}. ${t.title_badge} *${t.title_name}* ${isEq}\n   _${t.title_desc || 'Titel Kehormatan Boss Raid'}_\n`;
  });

  const card =
    `╔════════════════════════════════════╗\n` +
    `  🎖️ *[ KOLEKSI TITEL PROFIL LANGKA ]* 🛡️\n` +
    `╚════════════════════════════════════╝\n\n` +
    `Halo @${senderNumber}! Berikut adalah daftar titel kehormatan yang berhasil kamu raih:\n\n` +
    `${listStr}\n` +
    `👉 *Cara Memasang Titel:*\n` +
    `Ketik */raid equip [nomor]* (contoh: */raid equip 1*)\n` +
    `Titel yang dipasang akan otomatis muncul di kartu */rank* dan profil Web Dashboard!`;

  return {
    text: card,
    mentions: [toJid(senderNumber)],
  };
}

/**
 * Pasang titel yang dipilih user
 */
function equipUserTitle(userJid, titleIndexOrId) {
  const titles = raidQueries.getUserTitles(userJid);
  if (!titles || titles.length === 0) {
    return { success: false, message: 'Kamu belum memiliki titel untuk dipasang.' };
  }

  let target = null;
  const num = parseInt(titleIndexOrId, 10);
  if (!isNaN(num) && num >= 1 && num <= titles.length) {
    target = titles[num - 1];
  } else {
    target = titles.find((t) => t.title_id === titleIndexOrId || t.title_name.toLowerCase().includes(String(titleIndexOrId).toLowerCase()));
  }

  if (!target) {
    return { success: false, message: 'Nomor atau ID titel tidak ditemukan. Ketik */raid titles* untuk melihat daftar nomor titelmu.' };
  }

  raidQueries.equipTitle(userJid, target.title_id);
  return {
    success: true,
    message: `Berhasil memasang titel *${target.title_name}* ${target.title_badge}!\nTitel ini kini aktif di kartu */rank* dan profil akunmu.`,
  };
}

module.exports = {
  startRaid,
  handleMessageAnswer,
  executeAttack,
  getRaidStatus,
  stopRaid,
  endRaid,
  getUserTitlesCard,
  equipUserTitle,
  activeRaids,
};
