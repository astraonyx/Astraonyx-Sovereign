// lib/ecosystemAcademyScheduler.js — Scheduler Harian & Manajemen Modul Belajar Polymath Genius
// Mengatur jadwal belajar harian, auto-update deskripsi grup, dan siaran materi jam 18:00 WIB

const fs = require('fs');
const path = require('path');
const config = require('../config');
const botEcosystemGroups = require('./botEcosystemGroups');
const { askAI } = require('./aiHelper');
const waFormatter = require('./whatsappFormatter');

const ACADEMY_STATE_FILE = path.resolve(__dirname, '../database/academy_scheduler_state.json');

// 7 Modul Kurikulum Mingguan Berulang (Polymath Genius Roadmap)
const WEEKLY_CURRICULUM = [
  // 0: Minggu
  {
    dayIndex: 0,
    dayName: 'Minggu',
    domain: '🎙️ Negosiasi Taktis Chris Voss, Retorika Aristoteles & Leadership',
    topic: 'Tactical Empathy, Calibrated Questions & Extreme Ownership',
    keywords: 'negosiasi, persuasi etis, chris voss, aristoteles ethos pathos logos, leadership',
    syllabus: 'Teknik "Never Split the Difference", Mirroring, Labeling Emosi, Pertanyaan "How/What", Tanggung Jawab Mutlak Pemimpin.',
  },
  // 1: Senin
  {
    dayIndex: 1,
    dayName: 'Senin',
    domain: '💻 Coding, Arsitektur AI & Modern Software Engineering',
    topic: 'Clean Architecture, Agentic AI Workflows & First-Principles Systems',
    keywords: 'clean code, agentic ai, transformer llm, system design, algoritma struktur data',
    syllabus: 'Membedah arsitektur decoupled, prinsip Single Responsibility, cara kerja LLM Attention Mechanism, dan optimasi efisiensi komputasi.',
  },
  // 2: Selasa
  {
    dayIndex: 2,
    dayName: 'Selasa',
    domain: '🌐 Bahasa Global & Diplomasi Internasional (British/US & Mandarin)',
    topic: 'Nuansa Fonetik British vs US & Fondasi Percakapan Bisnis Mandarin',
    keywords: 'bahasa inggris british vs american, mandarin pinyin hanzi, percakapan taktis',
    syllabus: 'Kontras kosakata Received Pronunciation vs GenAm, pola tata bahasa Mandarin kunci (把, 被, 了), intonasi 4 nada, dan etika diplomasi global.',
  },
  // 3: Rabu
  {
    dayIndex: 3,
    dayName: 'Rabu',
    domain: '⚖️ Filsafat, Stoikisme & Logika Kritis Anti-Fallacy',
    topic: 'Dichotomy of Control Marcus Aurelius & Dialektika Sokrates',
    keywords: 'stoikisme, marcus aurelius, epictetus, logika deduktif, socratic questioning',
    syllabus: 'Membedakan apa yang ada di dalam vs di luar kendali kita, Amor Fati, Memento Mori, serta dekonstruksi 10 Logical Fallacies umum dalam debat.',
  },
  // 4: Kamis
  {
    dayIndex: 4,
    dayName: 'Kamis',
    domain: '🧠 Neurosains, Psikologi Kognitif & Biohacking Fokus',
    topic: 'Sirkuit Dopamin, Neuroplastisitas & Daniel Kahneman System 1 vs 2',
    keywords: 'dopamin reset, neuroplastisitas, prefrontal cortex, bias kognitif, deep work',
    syllabus: 'Cara mengatur baseline dopamin untuk menghindari burnout, myelination neuron untuk menguasai skill 10x lebih cepat, dan mengatasi cognitive heuristics.',
  },
  // 5: Jumat
  {
    dayIndex: 5,
    dayName: 'Jumat',
    domain: '🔬 Sains, Matematika Intuitif & First-Principles Thinking',
    topic: 'Mental Model Richard Feynman & Teori Permainan (Game Theory)',
    keywords: 'first-principles thinking, feynman technique, intuisi kalkulus, game theory nash equilibrium',
    syllabus: 'Mendekonstruksi konsep rumit hingga ke kebenaran paling dasar, intuisi visual di balik limit & diferensial, serta Prisoner\'s Dilemma dalam strategi kehidupan.',
  },
  // 6: Sabtu
  {
    dayIndex: 6,
    dayName: 'Sabtu',
    domain: '🔍 Deduksi Sherlock Holmes, Mentalist & Observasi Situasional',
    topic: 'Membaca Deviasi Baseline, Mikro-Ekspresi & Situational Awareness',
    keywords: 'metode deduksi sherlock, observasi mikro-ekspresi paul ekman, membaca gestur',
    syllabus: 'Perbedaan melihat vs benar-benar mengamati, membaca deviasi baseline perilaku, klaster bahasa tubuh, dan situational awareness tanpa bias asumsi.',
  },
];

/**
 * Mengambil state riwayat siaran jadwal belajar
 */
function getAcademyState() {
  try {
    if (fs.existsSync(ACADEMY_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(ACADEMY_STATE_FILE, 'utf-8'));
    }
  } catch (_) {}
  return {
    lastBroadcastDate: null,
    lastDescUpdateDate: null,
    activeQuiz: null,
  };
}

/**
 * Menyimpan state riwayat siaran jadwal belajar
 */
function saveAcademyState(state) {
  try {
    fs.mkdirSync(path.dirname(ACADEMY_STATE_FILE), { recursive: true });
    fs.writeFileSync(ACADEMY_STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.error('[AcademyScheduler] Gagal simpan state:', e.message);
  }
}

/**
 * Mendapatkan kurikulum hari ini sesuai hari lokal WIB (GMT+7)
 */
function getTodayCurriculum(date = new Date()) {
  const wibTime = new Date(date.getTime() + (7 * 60 + date.getTimezoneOffset()) * 60000);
  const dayIndex = wibTime.getDay();
  return WEEKLY_CURRICULUM.find((c) => c.dayIndex === dayIndex) || WEEKLY_CURRICULUM[1];
}

/**
 * Format tanggal lokal Indonesia WIB
 */
function formatWibDate(date = new Date()) {
  const wibTime = new Date(date.getTime() + (7 * 60 + date.getTimezoneOffset()) * 60000);
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${days[wibTime.getDay()]}, ${wibTime.getDate()} ${months[wibTime.getMonth()]} ${wibTime.getFullYear()}`;
}

/**
 * Format string tanggal YYYY-MM-DD WIB
 */
function getWibDateString(date = new Date()) {
  const wibTime = new Date(date.getTime() + (7 * 60 + date.getTimezoneOffset()) * 60000);
  const y = wibTime.getFullYear();
  const m = String(wibTime.getMonth() + 1).padStart(2, '0');
  const d = String(wibTime.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Memperbarui deskripsi grup WhatsApp Polaris • Belajar & Polymath Genius
 */
async function updateAcademyGroupDescription(sock, force = false) {
  if (!sock || typeof sock.groupUpdateDescription !== 'function') return false;

  const todayStr = getWibDateString();
  const state = getAcademyState();

  if (!force && state.lastDescUpdateDate === todayStr) {
    return true;
  }

  const saved = botEcosystemGroups.getSavedData();
  const academyJid = saved.groups?.academy?.jid;
  if (!academyJid) {
    return false;
  }

  const cur = getTodayCurriculum();
  const dateFormatted = formatWibDate();

  const newDesc = [
    `🎓 POLARIS • BELAJAR & POLYMATH GENIUS`,
    `──────────────────────────────`,
    `📅 JADWAL HARI INI (${dateFormatted}):`,
    `🌟 Domain: ${cur.domain}`,
    `📖 Topik: ${cur.topic}`,
    `⏰ Kuliah & Kuis Interaktif: Setiap Hari Pukul 18:00 WIB`,
    `──────────────────────────────`,
    `💡 Belajar interaktif tanpa prefix command. Tanyakan topik sains, coding, bahasa, filsafat, atau strategi apa saja langsung di chat ini 24/7!`,
    `[POLARIS_ECOSYSTEM:academy]`,
  ].join('\n');

  try {
    await sock.groupUpdateDescription(academyJid, newDesc);
    console.log(`[AcademyScheduler] ✨ Sukses memperbarui deskripsi grup Akademi (${cur.topic})!`);
    state.lastDescUpdateDate = todayStr;
    saveAcademyState(state);
    return true;
  } catch (err) {
    console.warn(`[AcademyScheduler] Gagal update deskripsi grup: ${err.message}`);
    return false;
  }
}

/**
 * Melakukan riset AI dan menyiarkan materi kuliah harian + kuis interaktif ke grup belajar
 */
async function broadcastDailyLesson(sock, force = false) {
  if (!sock) return false;

  const todayStr = getWibDateString();
  const state = getAcademyState();

  if (!force && state.lastBroadcastDate === todayStr) {
    return false;
  }

  const saved = botEcosystemGroups.getSavedData();
  const academyJid = saved.groups?.academy?.jid;
  if (!academyJid) {
    console.warn('[AcademyScheduler] JID grup Akademi belum terdaftar di database ekosistem.');
    return false;
  }

  const cur = getTodayCurriculum();
  const dateFormatted = formatWibDate();

  console.log(`[AcademyScheduler] 🧠 Memulai riset & penyusunan materi harian jam 18:00 WIB: ${cur.domain}...`);

  const prompt = `Sebagai Polaris Polymath Mentor, susunlah 1 modul kuliah singkat tingkat dunia (High-Value Micro-Lesson) untuk grup belajar kita hari ini.

DATA MODUL HARI INI:
- Hari / Tanggal: ${dateFormatted}
- Domain Kejeniusan: ${cur.domain}
- Fokus Topik: ${cur.topic}
- Silabus: ${cur.syllabus}

FORMAT STRUKTUR OUTPUT WAJIB:
1. 🌟 *INTISARI & FIRST-PRINCIPLES THINKING*
   Jelaskan inti topik ini dari kebenaran paling mendasar (analogi intuitif, bebas jargon rumit, gamblang).
2. ⚡ *3 PRINSIP TAKTIS & ACTIONABLE STEPS*
   Berikan 3 poin konkrit yang bisa langsung diaplikasikan dalam kehidupan/pekerjaan nyata.
3. 🏛️ *CONTOH STUDI KASUS NYATA*
   Contoh penerapan nyata tokoh jenius (ilmuwan/arsitek/tokoh sejarah/pakar modern).
4. 🎯 *CHALLENGE / KUIS INTERAKTIF HARI INI*
   Buat 1 pertanyaan atau studi kasus dilema mini yang MENANTANG anggota grup untuk menjawab langsung di grup. Soal harus memancing pemikiran kritis dan solutif.

Gunakan bahasa Indonesia yang elegan, berbobot, cerdas, dan membakar semangat belajar. Format teks WhatsApp yang sangat rapi.`;

  try {
    const aiResult = await askAI(prompt, config, [], 'Kamu adalah Polaris Polymath Mentor Jenius Kelas Dunia.');
    if (!aiResult.success || !aiResult.text) {
      console.error('[AcademyScheduler] Gagal menghasilkan materi AI:', aiResult.error);
      return false;
    }

    const formattedText = waFormatter.formatForWhatsApp(aiResult.text);

    const broadcastMessage = [
      `⏰ *[ 18:00 WIB • POLARIS DAILY STUDY SESSION ]*`,
      `🎓 *AKADEMI BELAJAR & POLYMATH GENIUS*`,
      `📅 *Jadwal:* ${dateFormatted}`,
      `🌟 *Domain:* ${cur.domain}`,
      `📖 *Topik:* ${cur.topic}`,
      `──────────────────────────────`,
      formattedText,
      `──────────────────────────────`,
      `💬 *Tantangan Terbuka:*`,
      `Jawab soal kuis di atas langsung di obrolan grup ini! Polaris AI akan mengevaluasi analisis jawabanmu secara real-time.`,
    ].join('\n');

    // 1. Kirim ke grup Polaris • Belajar & Polymath Genius
    await sock.sendMessage(academyJid, { text: broadcastMessage });
    console.log(`[AcademyScheduler] 🚀 Sukses menyiarkan materi belajar 18:00 WIB ke grup Akademi!`);

    // 2. Arsipkan salinan materi ke grup Polaris • Output & Artifact Vault
    botEcosystemGroups.sendOutputToVaultGroup(
      sock,
      `Modul Belajar Harian: ${cur.topic}`,
      `📚 *ARSIP MODUL AKADEMI [${dateFormatted}]*\n\n` +
      `• *Domain:* ${cur.domain}\n` +
      `• *Topik:* ${cur.topic}\n\n` +
      formattedText
    ).catch(() => {});

    // 3. Perbarui deskripsi grup agar sesuai status hari ini
    await updateAcademyGroupDescription(sock, true);

    // 4. Catat state
    state.lastBroadcastDate = todayStr;
    state.activeQuiz = {
      date: todayStr,
      domain: cur.domain,
      topic: cur.topic,
      createdAt: new Date().toISOString(),
    };
    saveAcademyState(state);

    return true;
  } catch (err) {
    console.error('[AcademyScheduler] Error saat broadcast materi harian:', err.message);
    return false;
  }
}

/**
 * Menjalankan background watchdog scheduler untuk modul belajar (Target harian: 18:00 WIB)
 */
function startAcademyScheduler(sock) {
  if (global.__academySchedulerTimer) {
    clearInterval(global.__academySchedulerTimer);
    global.__academySchedulerTimer = null;
  }

  console.log('[AcademyScheduler] 🎓 Scheduler Modul Belajar Akademi aktif (Target harian: 18:00 WIB)!');

  // Jalankan update deskripsi awal saat startup
  setTimeout(() => {
    updateAcademyGroupDescription(sock, false).catch(() => {});
  }, 5000);

  // Periksa setiap 30 detik apakah jam lokal WIB sudah masuk 18:00
  global.__academySchedulerTimer = setInterval(async () => {
    try {
      if (!sock) return;

      const now = new Date();
      const wibTime = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
      const hours = wibTime.getHours();
      const minutes = wibTime.getMinutes();
      const todayStr = getWibDateString(now);
      const state = getAcademyState();

      // 1. Pada pagi hari jam 06:00 WIB: Pastikan deskripsi grup sudah terupdate
      if (hours === 6 && minutes === 0 && state.lastDescUpdateDate !== todayStr) {
        await updateAcademyGroupDescription(sock, true);
      }

      // 2. Tepat pada jam 18:00 WIB (antara 18:00 s.d 18:05): Siarkan materi harian
      if (hours === 18 && minutes >= 0 && minutes <= 5 && state.lastBroadcastDate !== todayStr) {
        console.log(`[AcademyScheduler] ⏰ Waktu menunjukkan ${hours}:${String(minutes).padStart(2, '0')} WIB. Memicu sesi belajar harian!`);
        await broadcastDailyLesson(sock, false);
      }
    } catch (cycleErr) {
      console.error('[AcademyScheduler] Error siklus scheduler:', cycleErr.message);
    }
  }, 30 * 1000);
}

module.exports = {
  WEEKLY_CURRICULUM,
  getTodayCurriculum,
  formatWibDate,
  getWibDateString,
  getAcademyState,
  updateAcademyGroupDescription,
  broadcastDailyLesson,
  startAcademyScheduler,
};
