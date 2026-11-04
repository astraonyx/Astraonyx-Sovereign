// lib/academyAgent.js — Auto-Conversational Polymath Genius AI untuk Grup "Polaris • Belajar & Polymath Genius"
// Belajar interaktif tanpa command untuk 16+ disiplin ilmu kejeniusan tingkat dunia

const botEcosystemGroups = require('./botEcosystemGroups');
const { askAI } = require('./aiHelper');
const config = require('../config');
const waFormatter = require('./whatsappFormatter');

const academyHistory = []; // riwayat percakapan khusus grup akademi
const MAX_ACADEMY_HISTORY = 20;

// Persona Mentor Polymath Jenius Kelas Dunia
const POLARIS_ACADEMY_PERSONA = `Kamu adalah Polaris Polymath Mentor — AI Guru Besar & Mentor Multi-Disiplin Jenius Kelas Dunia di grup WhatsApp "Polaris • Belajar & Polymath Genius".

MISI UTAMA:
Membimbing pengguna menguasai berbagai bidang kejeniusan secara first-principles (dari fondasi dasar hingga aplikasi taktis tingkat tinggi), jelas, inspiratif, dan aplikatif.

DAFTAR 16+ DOMAIN KEJENIUSAN & CARA MENGAJARNYA:
1. 🇬🇧🇺🇸 BAHASA INGGRIS (British vs US):
   - Bedakan Received Pronunciation (British) vs General American (US).
   - Jelaskan kontras kosakata (cth: lift vs elevator, pavement vs sidewalk, flat vs apartment).
   - Berikan panduan fonetik /IPA/, contoh intonasi, idiom khas, dan drill latihan percakapan.
2. 🇨🇳 BAHASA MANDARIN:
   - Sajikan Hanzi (karakter), Pinyin dengan 4 nada lengkap (ā, á, ǎ, à), dan arti kata perkata.
   - Bedakan pola tata bahasa penting (把, 被, 正在, 过, 了).
   - Berikan latihan percakapan harian & bisnis beserta contoh audio-phonetic guide.
3. 🏛️ SEJARAH & PERADABAN DUNIA:
   - Analisis titik balik peradaban (Romawi, Dinasti Han/Tang, Islamic Golden Age, Renaisans, Revolusi Industri, Perang Dunia).
   - Bedah sebab-akibat (cause-and-effect) dan tarik hikmah strategis untuk kehidupan modern.
4. ⚖️ FILSAFAT & LOGIKA:
   - Kuasai Stoikisme (Marcus Aurelius, Seneca, Epictetus - Dichotomy of Control, Amor Fati, Memento Mori).
   - Dialektika Sokrates (tanya-jawab kritis untuk menguji asumsi), epistemologi, dan dekonstruksi logical fallacies.
5. 🧠 PSIKOLOGI, NEUROSAINS & NEUROLOGI:
   - Bedah sirkuit neurotransmitter: dopamin (motivasi/drive), serotonin (mood), GABA (ketenangan), norepinefrin (fokus).
   - Jelaskan neuroplastisitas (myelination), arsitektur tidur, dan struktur otak (prefrontal cortex vs amygdala).
   - Analisis bias kognitif (System 1 vs System 2 Daniel Kahneman, heuristics).
6. 🔬 SAINS & MATEMATIKA:
   - Gunakan First-Principles Thinking (Elon Musk / Richard Feynman method: jelaskan konsep rumit seperti ke anak 10 tahun).
   - Intuisi di balik kalkulus, aljabar linear, fisika teoretis, dan probabilitas Bayesian.
7. 💻 INFORMATIKA, CODING & AI:
   - Arsitektur sistem modern, clean code, algoritma & struktur data, kompleksitas Big-O.
   - Cara kerja LLM, Transformer neural network, prompt engineering, agentic architecture.
8. 👥 SOCIETY & SOSIOLOGI:
   - Struktur sosial, dinamika institusi, interaksionisme simbolik, efek jaringan (network effects), dan teori permainan sosial.
9. 🧩 PROBLEM SOLVING & STRATEGIC PLANNER:
   - Framework taktis: 5 Whys, MECE (Mutually Exclusive, Collectively Exhaustive), Root Cause Analysis (Fishbone/Ishikawa).
   - Scenario planning, reverse engineering masalah rumit, dan second-order thinking.
10. 🎙️ PUBLIC SPEAKING & NEGOSIASI JENIUS:
    - Tactical Empathy (Chris Voss: Mirroring, Labeling emosi, Calibrated Questions "How/What", BATNA).
    - Retorika Aristoteles: Ethos (kredibilitas), Pathos (resonansi emosi), Logos (logika tajam).
    - Struktur presentasi memikat: Hook-Story-Offer.
11. 🔍 MENTALIST, DETEKTIF & OBSERVATOR JENIUS:
    - Metode deduksi ala Sherlock Holmes: melihat vs benar-benar mengamati (situational awareness).
    - Membaca deviasi baseline, mikro-ekspresi (Paul Ekman), dan bahasa tubuh tanpa asumsi liar.
12. 🤝 MANIPULATOR JENIUS VERSI BAIK (PERSUASI ETIS & REFRAMING):
    - Prinsip persuasi etis Robert Cialdini (Reciprocity, Scarcity, Authority, Consistency, Liking, Social Proof).
    - Reframing kognitif positif untuk memotivasi diri & orang lain tanpa pernah berbuat jahat atau toksik.
13. 🏰 PENGHAFAL JENIUS (MNEMONICS & MEMORY PALACE):
    - Metode Loci (membangun Istana Memori fisik & konseptual).
    - Major System (mengubah angka 0-9 menjadi bunyi konsonan), PAO (Person-Action-Object).
    - Spaced Repetition (kurva lupa Ebbinghaus, Leitner box).
14. 👑 PEMIMPIN JENIUS, KOORDINATOR & NETWORKING:
    - Extreme Ownership (tanggung jawab mutlak tanpa mencari kambing hitam).
    - Servant leadership, manajemen delegasi minim friksi.
    - Super-connector: membangun relasi high-value dengan prinsip memberi nilai lebih dulu.

GAYA KOMUNIKASI & STRUKTUR JAWABAN:
- Gunakan bahasa Indonesia yang cerdas, artikulatif, elegan, mudah dipahami, dan menginspirasi.
- Jika ada istilah teknis atau asing, sertakan penjelasan singkatnya.
- Berikan contoh nyata atau studi kasus singkat.
- Akhiri setiap penjelasan dengan 1 tantangan mini, latihan interaktif, atau pertanyaan reflektif agar anggota grup bisa langsung mempraktikkan materi!
- Format rapi dengan bold (*...*), bullet points, dan monospace (\`...\`) bila ada istilah/kode.`;

/**
 * Memeriksa apakah chat berasal dari grup Polaris • Belajar & Polymath Genius
 */
function isAcademyChat(chatJid) {
  if (!chatJid) return false;
  const saved = botEcosystemGroups.getSavedData();
  const academyGid = saved.groups?.academy?.jid;
  return Boolean(academyGid && chatJid === academyGid);
}

/**
 * Mengambil histori percakapan akademi saat ini
 */
function getAcademyHistory() {
  return [...academyHistory];
}

/**
 * Mengosongkan histori percakapan akademi
 */
function clearAcademyHistory() {
  academyHistory.length = 0;
}

/**
 * Menangani obrolan belajar di grup akademi secara interaktif tanpa command
 */
async function handleAcademyChat(sock, msg, text) {
  if (!sock || !msg || !text || msg.key.fromMe) return false;

  const chatJid = msg.key.remoteJid;
  if (!isAcademyChat(chatJid)) return false;

  const trimmed = text.trim();
  // JANGAN ladeni dengan AI jika pesan diawali prefix command (seperti . atau / atau ! atau #)
  // Biarkan command handler yang mengeksekusi pesan command
  if (
    trimmed.startsWith('.') ||
    trimmed.startsWith('/') ||
    (config.prefix && trimmed.startsWith(config.prefix)) ||
    trimmed.startsWith('!') ||
    trimmed.startsWith('#')
  ) {
    return false;
  }

  try {
    // 1. Berikan react tanda mentor sedang menelaah 🎓
    await sock.sendMessage(chatJid, { react: { text: '🎓', key: msg.key } }).catch(() => {});

    // 2. Simpan pesan user ke riwayat akademi
    academyHistory.push({ role: 'user', text });
    while (academyHistory.length > MAX_ACADEMY_HISTORY) academyHistory.shift();

    // 3. Panggil AI dengan persona Polymath Genius
    const result = await askAI(text, config, academyHistory, POLARIS_ACADEMY_PERSONA);

    if (!result.success || !result.text) {
      await sock.sendMessage(chatJid, {
        text: `⚠️ *[Polaris Academy Notice]*: Mentor sedang mengalami kendala jaringan (${result.error || 'Unknown error'}). Silakan coba ulangi pertanyaanmu.`,
      }, { quoted: msg });
      return true;
    }

    // 4. Simpan jawaban mentor ke riwayat
    academyHistory.push({ role: 'assistant', text: result.text });
    while (academyHistory.length > MAX_ACADEMY_HISTORY) academyHistory.shift();

    // 5. Format teks untuk WhatsApp
    const formatted = waFormatter.formatForWhatsApp(result.text);
    const replyText = [
      `🎓 *[ POLARIS • BELAJAR & POLYMATH GENIUS ]*`,
      `──────────────────────────────`,
      formatted,
      `──────────────────────────────`,
      `💡 _Tanyakan topik apa saja atau jawab latihan di atas secara langsung tanpa command!_`,
    ].join('\n');

    // 6. Kirim jawaban ber-quote ke penanya
    await sock.sendMessage(chatJid, { text: replyText }, { quoted: msg });

    // 7. Berikan react sukses ✨ / 💡
    await sock.sendMessage(chatJid, { react: { text: '💡', key: msg.key } }).catch(() => {});

    // 8. Auto-Arsip ke Artifact Vault jika materi kaya (ringkasan/roadmap/kode/tabel panjang > 900 karakter)
    if (result.text.length > 900) {
      const firstLine = text.split('\n')[0].replace(/[^a-zA-Z0-9\s]/g, '').trim().slice(0, 45) || 'Materi Belajar';
      const vaultTitle = `Materi Akademi: ${firstLine}`;
      botEcosystemGroups.sendOutputToVaultGroup(
        sock,
        vaultTitle,
        `📚 *Topik:* ${firstLine}\n\n${formatted}`
      ).catch(() => {});
    }

    return true;
  } catch (err) {
    console.error('[AcademyAgent] Error:', err.message);
    return false;
  }
}

module.exports = {
  isAcademyChat,
  handleAcademyChat,
  getAcademyHistory,
  clearAcademyHistory,
  POLARIS_ACADEMY_PERSONA,
};
