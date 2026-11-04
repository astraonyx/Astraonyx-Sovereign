// lib/groupFunEngine.js — Modul Fun Games & Entertainment Polaris:
// 1. Truth or Dare (/truth, /dare)
// 2. Tebak-Tebakan Berhadiah XP (/tebakkata, /caklontong, /tebaktebakan)
// 3. Wheel of Fortune & Gacha Hoki (/spin, /roll) dengan cooldown 5 jam
const { box, success, warning, info, error, bullet } = require('./messageStyle');
const { rankQueries } = require('../server/db');
const groupLevelEngine = require('./groupLevelEngine');
const rpgEngine = require('./rpgEngine');
const { jidToNumber, toJid } = require('./helpers');

const SPIN_COOLDOWN_MS = 5 * 60 * 60 * 1000; // Minimal 1 kali per 5 jam
const QUIZ_PRIZE_XP = 50;
const QUIZ_TIMEOUT_MS = 60 * 1000; // 60 detik batas waktu tebak kata

// Sesi game aktif per grup: Map<groupJid, { type, question, answer, hint, timer, startTime }>
const activeGames = new Map();

// =========================================================================
// DATA BANK: TRUTH OR DARE
// =========================================================================
const TRUTH_LIST = [
  'Siapa orang di grup ini yang paling sering kamu perhatiin status atau profilnya diam-diam?',
  'Kapan terakhir kali kamu menangis karena cinta, dan apa alasan sebenarnya?',
  'Kalau harus pacaran dengan salah satu member di grup ini, siapa orang yang bakal kamu pilih?',
  'Apa kebohongan terbesar yang pernah kamu buat ke orang tua dan belum pernah ketahuan?',
  'Pernah gak kamu stalk mantan pakai akun fake (second account)? Ceritain!',
  'Apa hal paling memalukan yang pernah terjadi dalam hidupmu sampai sekarang?',
  'Pernah naksir pacar teman sendiri gak? Jujur ya!',
  'Apa first impression kamu saat pertama kali kenal/tahu orang yang ada di grup ini?',
  'Sebutkan 1 rahasia tentang dirimu yang gak ada seorang pun di grup ini yang tahu!',
  'Siapa orang terakhir yang kamu chat sebelum buka grup ini?',
  'Apa sifat terburuk (red flag) yang kamu sadari ada di dalam dirimu sendiri?',
  'Pernah pura-pura tidur atau pura-pura gak baca chat karena malas balas seseorang?',
  'Kalau ada mesin waktu, hal bodoh apa di masa lalu yang paling ingin kamu batalkan?',
  'Sebutkan 3 kriteria fisik & sifat orang yang bisa langsung bikin kamu luluh/salting parah!',
  'Pernahkah kamu mengirim pesan cinta tapi salah kirim ke orang lain atau grup keluarga?',
  'Siapa member di grup ini yang menurutmu paling asik dan siapa yang paling bikin penasaran?',
  'Hal paling aneh apa yang pernah kamu cari (search) di browser tengah malam?',
  'Pernah gak kamu nembak orang terus ditolak mentah-mentah? Ceritain singkatnya!',
  'Kalau disuruh memilih: Balikan sama mantan terindah atau jomblo 3 tahun ke depan?',
  'Apa momen paling bikin baper yang pernah kamu alami sama seseorang yang akhirnya gak jadian?',
];

const DARE_LIST = [
  'Kirim Voice Note nyanyi lagu romantis reff-nya aja ke grup ini sekarang juga! Tanpa instrumen ya!',
  'Ganti info / bio WhatsApp kamu jadi: "Lagi naksir seseorang di grup ini 😳" selama 1 jam!',
  'Tag salah satu member di grup ini dan bilang: "Sebenernya dari dulu aku kagum sama kamu..."',
  'Screenshot halaman chat teratas WhatsApp kamu (boleh sensor isi pesannya dikit) dan kirim ke grup!',
  'Ketik gombalan paling maut yang kamu tahu lalu tag salah satu lawan jenismu di grup ini!',
  'Kirim foto wajah kamu dengan pose paling konyol/jelek ke grup sekarang juga!',
  'Ganti foto profil WhatsApp kamu pakai foto artis yang paling kamu benci selama 30 menit!',
  'Kirim Voice Note bilang "Selamat malam sayang, mimpi indah ya" dengan nada paling manja!',
  'Tag admin grup ini dan minta dia nge-kick kamu kalau dia berani!',
  'Tulis pantun romantis 4 baris yang bikin satu grup ini senyum-senyum sendiri!',
  'Kirim pesan ke teman terdekatmu: "Aku mau pinjam uang 10 juta sekarang buat lamaran", terus screenshot reaksinya!',
  'Puji 3 orang member di grup ini satu per satu dengan kata-kata paling tulus yang kamu punya!',
  'Kirim stiker WhatsApp paling memalukan yang ada di daftar favoritmu ke grup ini!',
  'Ketik "I love you" ke orang nomor 3 di daftar chat WhatsApp kamu, lalu kirim buktinya!',
  'Bikin pantun gombalan kilat untuk orang yang tepat berada di atas chat-mu saat ini!',
];

// =========================================================================
// DATA BANK: TEBAK KATA & CAK LONTONG
// =========================================================================
const TEBAK_KATA_LIST = [
  { q: 'Benda berkaki empat yang tidak bisa berjalan dan selalu ada di ruang makan atau belajar?', a: 'meja', h: 'M _ _ A' },
  { q: 'Punya daun tapi bukan pohon, punya punggung tapi tak bernyawa, penuh ilmu pengetahuan?', a: 'buku', h: 'B _ _ U' },
  { q: 'Bisa dipotong berkali-kali tapi tidak pernah berkurang, makin dipotong makin panjang?', a: 'kuku', h: 'K _ _ U' },
  { q: 'Benda yang kalau diisi makin ringan dan kalau ditiup makin besar?', a: 'balon', h: 'B _ _ _ N' },
  { q: 'Punya mata banyak tapi tidak bisa melihat, biasa dimakan direbus atau digoreng?', a: 'nanas', h: 'N _ _ _ S' },
  { q: 'Bisa naik tapi tidak pernah bisa turun lagi seiring berjalannya waktu?', a: 'umur', h: 'U _ _ R' },
  { q: 'Benda apa yang kalau dilempar ke atas warnanya putih, tapi pas jatuh ke bawah warnanya kuning?', a: 'telur', h: 'T _ _ _ R' },
  { q: 'Benda yang makin basah saat makin banyak mengeringkan sesuatu?', a: 'handuk', h: 'H _ _ _ _ K' },
  { q: 'Punya leher tapi tidak punya kepala, suka diisi air dingin atau hangat?', a: 'botol', h: 'B _ _ _ L' },
  { q: 'Benda yang berjalan memutar tapi tidak pernah pusing dan selalu memberi petunjuk waktu?', a: 'jam', h: 'J _ M' },
  { q: 'Hewan yang kepalanya di kaki, matanya di kaki, sayapnya di kaki, badannya di kaki?', a: 'semut keinjak', h: 'S _ _ _ T  K _ _ _ _ _ K' },
  { q: 'Benda apa yang selalu berjalan di depan tapi tidak pernah sampai duluan?', a: 'bayangan', h: 'B _ _ _ _ _ _ N' },
  { q: 'Kalau ditutup kelihatan, kalau dibuka malah tidak kelihatan?', a: 'kelopak mata', h: 'K _ _ _ _ _ K  M _ _ A' },
  { q: 'Benda yang ditarik mundur tapi malah melesat maju ke depan?', a: 'ketapel', h: 'K _ _ _ _ _ L' },
  { q: 'Kendaraan roda dua yang tidak butuh bensin tapi bikin yang naik berkeringat sehat?', a: 'sepeda', h: 'S _ _ _ _ A' },
];

const CAK_LONTONG_LIST = [
  { q: 'Supaya bersih dan wangi, biasanya orang mandi pakai...?', a: 'yakin', h: 'Y _ _ _ N (Kalau gak yakin, ngapain mandi!)' },
  { q: 'Banteng menyeruduk karena memakai warna...?', a: 'tenaga', h: 'T _ _ _ _ A (Kalau gak pakai tenaga ya lemes!)' },
  { q: 'Hewan yang tinggal di kutub utara dan makan ikan adalah...?', a: 'lapar', h: 'L _ _ _ R (Kalau kenyang mah tidur!)' },
  { q: 'Orang yang mengemudikan pesawat terbang disebut...?', a: 'duduk', h: 'D _ _ _ K (Ya masa pilot nyetir sambil kayang!)' },
  { q: 'Alat untuk memotong kertas atau kain yang tajam adalah...?', a: 'bisa', h: 'B _ _ A (Kalau tumpul ya gak bisa!)' },
  { q: 'Orang kedinginan biasanya memakai...?', a: 'baju', h: 'B _ _ U (Kalau gak pakai baju ya masuk angin!)' },
  { q: 'Tempat untuk menyimpan uang dengan aman biasanya di...?', a: 'ingat', h: 'I _ _ _ T (Kalau lupa naruhnya, uangnya hilang!)' },
  { q: 'Gajah bisa terbang kalau...?', a: 'khayal', h: 'K _ _ _ _ L (Di dunia nyata mana ada gajah terbang!)' },
  { q: 'Hewan yang bisa merayap di dinding dan makan nyamuk adalah...?', a: 'banyak', h: 'B _ _ _ _ K (Cicak kan emang banyak di rumah!)' },
  { q: 'Sebelum makan biasanya orang membaca...?', a: 'menu', h: 'M _ _ U (Biar tahu harganya dulu dong!)' },
];

const TEBAK_TEBAKAN_LIST = [
  { q: 'Kuda apa yang bikin semua orang bahagia dan berbunga-bunga?', a: 'kudapat cintamu', h: 'K _ _ _ _ _ T  C _ _ _ _ _ U' },
  { q: 'Awan apa yang paling ditunggu-tunggu sama orang yang lagi kasmaran?', a: 'awanna be with you', h: 'A _ _ _ _ A  B E  W _ _ H  Y O U' },
  { q: 'Kopi apa yang rasanya manis banget dan bikin gak bisa tidur?', a: 'kopikirkan dirimu', h: 'K _ _ _ _ _ _ _ N  D _ _ _ _ U' },
  { q: 'Minyak apa yang bikin orang senyum-senyum seharian?', a: 'minyaksikan senyummu', h: 'M _ _ _ _ _ _ _ _ N  S _ _ _ _ _ U' },
  { q: 'Bis apa yang paling bikin salting kalau lewat?', a: 'bisikan sayangmu', h: 'B _ _ _ _ _ N  S _ _ _ _ _ U' },
  { q: 'Rumah apa yang paling indah dan bikin betah selamanya?', a: 'rumah tangga kita', h: 'R _ _ _ H  T _ _ _ _ A  K _ _ A' },
  { q: 'Jus apa yang rasanya paling manis di dunia?', a: 'just for you', h: 'J _ _ T  F O R  Y O U' },
  { q: 'Kotak apa yang sangat menyakitkan bagi seseorang?', a: 'kotak sadar aku cinta kamu', h: 'K _ _ _ K  S A D A R ...' },
];

const SUSUN_KATA_LIST = [
  { q: 'Susun huruf berikut menjadi nama hewan mamalia besar: G - J - A - H - A', a: 'gajah', h: 'G _ _ _ H' },
  { q: 'Susun huruf berikut menjadi nama buah manis berkulit tebal: M - A - N - G - G - A', a: 'mangga', h: 'M _ _ _ _ A' },
  { q: 'Susun huruf berikut menjadi nama negara sakura: J - E - P - A - N - G', a: 'jepang', h: 'J _ _ _ _ G' },
  { q: 'Susun huruf berikut menjadi profesi medis: D - O - K - T - E - R', a: 'dokter', h: 'D _ _ _ _ R' },
  { q: 'Susun huruf berikut menjadi alat tulis lembaran: K - E - R - T - A - S', a: 'kertas', h: 'K _ _ _ _ S' },
  { q: 'Susun huruf berikut menjadi kendaraan terbang: P - E - S - A - W - A - T', a: 'pesawat', h: 'P _ _ _ _ _ T' },
  { q: 'Susun huruf berikut menjadi nama planet terdekat matahari: M - E - R - K - U - R - I - U - S', a: 'merkurius', h: 'M _ _ _ _ _ _ _ S' },
  { q: 'Susun huruf berikut menjadi perabotan penyimpan pakaian: L - E - M - A - R - I', a: 'lemari', h: 'L _ _ _ _ I' },
  { q: 'Susun huruf berikut menjadi tempat belajar siswa: S - E - K - O - L - A - H', a: 'sekolah', h: 'S _ _ _ _ _ H' },
  { q: 'Susun huruf berikut menjadi alat penunjuk waktu: A - R - L - O - J - I', a: 'arloji', h: 'A _ _ _ _ I' },
];

// =========================================================================
// WHEEL OF FORTUNE / GACHA OUTCOMES
// =========================================================================
const WHEEL_OUTCOMES = [
  { label: '💥 ZONK APES!', xp: -15, desc: 'Roda berhenti di tengkorak apes! Kamu kehilangan 15 XP.', isLuck: false },
  { label: '💨 ANGIN LALU', xp: 0, desc: 'Roda berhenti di kotak kosong. Tidak ada XP yang didapat!', isLuck: false },
  { label: '🍀 DAUN KEBERUNTUNGAN', xp: 30, desc: 'Lumayan! Dewi fortuna memberimu tambahan +30 XP.', isLuck: true },
  { label: '🔥 PETI EMAS', xp: 75, desc: 'Mantap jiwa! Putaran mendarat di Peti Harta Karun (+75 XP)!', isLuck: true },
  { label: '💎 JACKPOT FANTASTIS!', xp: 150, desc: '🎉 BINTANG KOSMIK JATUH! Kamu memenangkan JACKPOT BESAR +150 XP!', isLuck: true },
  { label: '🎭 KOTAK TANTANGAN (DARE)', xp: 0, desc: 'Kamu mendarat di Kotak Misteri! Bot menugaskanmu mengirim 1 pesan gombalan ke grup ini sekarang!', isLuck: false },
];

// =========================================================================
// METHODS
// =========================================================================

function getRandomTruth() {
  const index = Math.floor(Math.random() * TRUTH_LIST.length);
  return TRUTH_LIST[index];
}

function getRandomDare() {
  const index = Math.floor(Math.random() * DARE_LIST.length);
  return DARE_LIST[index];
}

function getRandomQuestion(type) {
  let pool = TEBAK_KATA_LIST;
  if (type === 'caklontong') pool = CAK_LONTONG_LIST;
  if (type === 'tebaktebakan') pool = TEBAK_TEBAKAN_LIST;
  if (type === 'susunkata') pool = SUSUN_KATA_LIST;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

/**
 * Mulai sesi tebak-tebakan di grup
 */
async function startQuiz(sock, chatJid, type = 'tebakkata') {
  if (activeGames.has(chatJid)) {
    const ongoing = activeGames.get(chatJid);
    return {
      started: false,
      message: warning(
        'Sesi Sedang Berjalan',
        `Masih ada kuis yang belum terjawab di grup ini!\n\n` +
        `❓ *Soal:* ${ongoing.question}\n` +
        `💡 *Hint:* \`${ongoing.hint}\`\n\n` +
        `Ketik langsung jawabanmu di grup atau ketik */nyerah* jika menyerah.`
      ),
    };
  }

  const item = getRandomQuestion(type);
  const titles = {
    tebakkata: 'TEBAK KATA POLARIS',
    caklontong: 'TEBAK CAK LONTONG',
    tebaktebakan: 'TEBAK-TEBAKAN SERU',
  };

  const gameData = {
    type,
    question: item.q,
    answer: item.a.toLowerCase().trim(),
    hint: item.h,
    prizeXp: QUIZ_PRIZE_XP,
    startTime: Date.now(),
    timer: setTimeout(async () => {
      if (activeGames.has(chatJid)) {
        activeGames.delete(chatJid);
        const timeoutMsg =
          `⌛ *[WAKTU HABIS!]*\n` +
          `──────────────────────────────\n` +
          `Yah, tidak ada yang berhasil menjawab tebakan ini!\n` +
          `🔑 *Jawaban yang Benar:* *${item.a.toUpperCase()}*\n` +
          `──────────────────────────────\n` +
          `Ketik */${type}* untuk mencoba tebakan baru lagi!`;

        await sock.sendMessage(chatJid, { text: timeoutMsg }).catch(() => {});
      }
    }, QUIZ_TIMEOUT_MS),
  };

  activeGames.set(chatJid, gameData);

  const cardText = box({
    prefix: 'POLARIS GAMES',
    statusTag: 'KUIS XP',
    title: titles[type] || 'TEBAK-TEBAKAN',
    body:
      `❓ *Pertanyaan:*\n${item.q}\n\n` +
      `💡 *Petunjuk:* \`${item.h}\`\n` +
      `✨ *Hadiah:* *+${QUIZ_PRIZE_XP} XP* untuk penjawab pertama!\n` +
      `⏳ *Batas Waktu:* 60 detik`,
    footer: 'Langsung ketik jawabanmu di chat ini tanpa prefix!',
  });

  return { started: true, text: cardText };
}

/**
 * Evaluasi jawaban dari pesan masuk di grup
 */
async function checkAnswer(sock, msg, senderNumber) {
  const chatJid = msg.key.remoteJid;
  if (!chatJid || !activeGames.has(chatJid)) return false;

  const session = activeGames.get(chatJid);
  const rawText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  const cleanAnswer = rawText.toLowerCase().trim();

  if (!cleanAnswer) return false;

  // Cek apakah jawaban cocok
  if (cleanAnswer === session.answer) {
    clearTimeout(session.timer);
    activeGames.delete(chatJid);

    const userJid = msg.key.participant || msg.key.remoteJidAlt || `${senderNumber}@s.whatsapp.net`;
    const pushName = msg.pushName || 'Sahabat';

    // Beri hadiah ganda (Fusi Group Rank XP & RPG EXP + 1,000 Koin Emas)
    await groupLevelEngine.addXp(chatJid, userJid, session.prizeXp, pushName, sock, msg);
    const rpgReward = rpgEngine.addRpgExpAndCoins(senderNumber, session.prizeXp, 1000);

    const winMsg =
      `🎉 *[TEBAKAN TERJAWAB!]* 🏆\n` +
      `──────────────────────────────\n` +
      `Luar biasa @${senderNumber}! Jawaban kamu tepat!\n\n` +
      `🔑 *Jawaban:* *${session.answer.toUpperCase()}*\n` +
      `✨ *Hadiah Fusi:* *+${session.prizeXp} Group & RPG EXP* | *+1,000 Koin Emas*\n` +
      `${rpgReward.lvlInfo.levelUp ? `🌟 *RPG LEVEL UP! Sekarang Level ${rpgReward.lvlInfo.newLevel}!*\n` : ''}` +
      `──────────────────────────────\n` +
      `Peringkatmu di */topchat* & */rpgprofile* otomatis naik! 🚀`;

    await sock.sendMessage(chatJid, {
      text: winMsg,
      mentions: [toJid(senderNumber)],
    }, { quoted: msg }).catch(() => {});

    return true;
  }

  return false;
}

/**
 * Menyerah dari kuis yang sedang aktif
 */
async function giveUp(chatJid) {
  if (!activeGames.has(chatJid)) {
    return warning('Tidak Ada Kuis Aktif', 'Saat ini tidak ada sesi tebakan yang sedang berjalan di grup ini.');
  }

  const session = activeGames.get(chatJid);
  clearTimeout(session.timer);
  activeGames.delete(chatJid);

  return info(
    'Menyerah',
    `Sesi kuis dihentikan.\n🔑 *Jawaban yang Benar:* *${session.answer.toUpperCase()}*\n\nKetik */tebakkata* jika ingin bermain lagi!`
  );
}

/**
 * Putar Roda Keberuntungan / Gacha Hoki (/spin, /roll)
 * Menerapkan batas waktu ketat: Minimal 1 kali per 5 jam per user
 */
async function playWheelOfFortune(groupJid, userJid, senderNumber, userName, sock, msg) {
  const currentRecord = rankQueries.getUserXp.get(groupJid, userJid) || {
    xp: 0,
    last_spin_at: 0,
    user_name: userName || '',
  };

  const now = Date.now();
  const lastSpinTime = Number(currentRecord.last_spin_at) || 0;
  const timeSinceLastSpin = now - lastSpinTime;

  // Cek batas cooldown 5 jam
  if (timeSinceLastSpin < SPIN_COOLDOWN_MS) {
    const remainingMs = SPIN_COOLDOWN_MS - timeSinceLastSpin;
    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingMinutes = Math.ceil((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
      allowed: false,
      text: warning(
        'Cooldown Gacha 5 Jam',
        `⏳ Sabar ya @${senderNumber}! Roda keberuntungan hanya dapat diputar *1 kali setiap 5 jam*.\n\n` +
        `⏰ *Sisa Waktu:* ${remainingHours} jam ${remainingMinutes} menit lagi sebelum putaran berikutnya!`
      ),
      mentions: [userJid],
    };
  }

  // Pilih hasil secara berbobot (weighted probabilities)
  // 25% Zonk, 20% Angin lalu, 25% Hoki kecil, 15% Hoki sedang, 10% Jackpot, 5% Dare
  const rand = Math.random() * 100;
  let outcome;
  if (rand < 25) {
    outcome = WHEEL_OUTCOMES[0]; // Zonk (-15 XP)
  } else if (rand < 45) {
    outcome = WHEEL_OUTCOMES[1]; // Angin Lalu (0 XP)
  } else if (rand < 70) {
    outcome = WHEEL_OUTCOMES[2]; // +30 XP
  } else if (rand < 85) {
    outcome = WHEEL_OUTCOMES[3]; // +75 XP
  } else if (rand < 95) {
    outcome = WHEEL_OUTCOMES[4]; // +150 XP JACKPOT
  } else {
    outcome = WHEEL_OUTCOMES[5]; // Dare Challenge
  }

  // Simpan timestamp putaran baru ke SQLite
  const isoNow = new Date().toISOString();
  rankQueries.updateSpinTime.run(now, isoNow, groupJid, userJid);

  // Perbarui XP pemain (Fusi Group Rank XP & RPG EXP)
  if (outcome.xp !== 0) {
    await groupLevelEngine.addXp(groupJid, userJid, outcome.xp, userName, sock, msg);
    if (outcome.xp > 0) {
      rpgEngine.addRpgExpAndCoins(senderNumber, outcome.xp, outcome.xp * 15);
    }
  }

  const updatedRecord = rankQueries.getUserXp.get(groupJid, userJid);
  const currentTotalXp = updatedRecord ? updatedRecord.xp : 0;

  const spinVisual =
    `🎰 *[WHEEL OF FORTUNE • GACHA HOKI]*\n` +
    `──────────────────────────────\n` +
    `👤 *Pemain:* @${senderNumber}\n` +
    `🎡 *Roda Berputar:* [ 🍒 ✦ 💎 ✦ 💀 ✦ 🍀 ]\n` +
    `🎯 *Hasil Mendarat Di:* *${outcome.label}*\n\n` +
    `📝 *Efek:* ${outcome.desc}\n` +
    (outcome.xp > 0 ? `✨ *Perolehan XP:* +${outcome.xp} XP\n` : '') +
    (outcome.xp < 0 ? `🔻 *Pengurangan XP:* ${outcome.xp} XP\n` : '') +
    `📊 *Total XP Sekarang:* ${currentTotalXp.toLocaleString('id-ID')} XP\n` +
    `──────────────────────────────\n` +
    `⏳ Putaran berikutnya dapat dilakukan dalam *5 jam ke depan*!`;

  return {
    allowed: true,
    text: spinVisual,
    mentions: [userJid],
  };
}

module.exports = {
  getRandomTruth,
  getRandomDare,
  startQuiz,
  checkAnswer,
  giveUp,
  playWheelOfFortune,
};
