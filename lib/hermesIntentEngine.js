// lib/hermesIntentEngine.js — Advanced Intent Classification & Semantic Understanding Engine
// Memproses dan mengklasifikasikan maksud pengguna secara mendalam agar respon AI 100% presisi

const INTENT_TYPES = {
  TABLE_GENERATION: 'TABLE_GENERATION',
  CASUAL_CHITCHAT: 'CASUAL_CHITCHAT',
  MATH_REASONING: 'MATH_REASONING',
  CODE_SNIPPET: 'CODE_SNIPPET',
  FILE_ARTIFACT_CREATION: 'FILE_ARTIFACT_CREATION',
  EXPLANATION_SUMMARY: 'EXPLANATION_SUMMARY',
  GENERAL_QUERY: 'GENERAL_QUERY',
};

// Pola leksikal & semantik bahasa Indonesia dan Inggris
const PATTERNS = {
  // Pola permintaan tabel
  table: [
    /\b(bikin|buat|buatkan|tampilkan|sajikan|kasih|generate|format|susun|masukkan|jadikan)\s+(tabel|table|tabulasi|matriks|matrix)\b/i,
    /\b(tabel|table)\s+(perbandingan|jadwal|harga|spesifikasi|data|rekap|rangkuman|komparasi|klasifikasi|menu|daftar)\b/i,
    /\b(dalam\s+bentuk\s+tabel|bentuk\s+tabel|format\s+tabel|format\s+table|jadikan\s+tabel|tabelkan)\b/i,
    /\b(tabel|table)\s*(jadwal|siswa|nilai|keuangan|produk|fitur|perbandingan)\b/i,
    /\bbuatkan\s+(jadwal|rekap|komparasi)\s+.*(kolom|baris|tabel)\b/i,
  ],

  // Pola sapaan santai / ping / tes
  chitchat: [
    /^(p+|ping|pe|tes|test|testing)(\s+(bang|bro|wir|min|woi|oy|kawan|bos))?[\s!?.]*$/i,
    /^(halo|hai|hey|helo|hi|hallo|holla)(\s+(bang|bro|wir|min|kawan|teman|kak|om|gan|sis|lu|semua|admin|bos))?[\s!.]*$/i,
    /^(selamat\s+(pagi|siang|sore|malam))[\s!.]*$/i,
    /^(assalamu[']?alaikum|samlikum|assalamualaikum)[\s!.]*$/i,
    /^(siapa\s+(kamu|anda|lu|kau)|kamu\s+siapa|lu\s+siapa)\??$/i,
    /^(ada\s+orang|bot\s+aktif|bot\s+hidup|masih\s+hidup|bang|bro|woi|oy|oii)[\s!?.]*$/i,
  ],

  // Pola matematika & analitik
  math: [
    /\b(hitung|kalkulasi|evaluasi|sederhanakan|selesaikan|turunkan|integralkan|buktikan)\b/i,
    /\b(integral|limit|turunan|derivatif|diferensial|matematika|aljabar|trigonometri|kalkulus|geometri|matriks|vektor)\b/i,
    /\b(persamaan|rumus|nilai\s+eksak|asimtotik|konvergen|divergen|zeta|gamma|sigma|\b(sin|cos|tan|log|ln|sqrt)\b)\b/i,
    /[∫∑∏√πθλ]/,
    /\b\d+\s*[\+\-\*\/]\s*\d+\b/,
  ],

  // Pola kode & fungsi
  codeSnippet: [
    /\b(tulis|buat|bikin|contoh|koding|coding|script|skrip|fungsi|function|algoritma|code|kode|syntax)\s+(js|javascript|python|php|html|css|sql|bash|c\+\+|java|typescript|golang|rust|regex)\b/i,
    /\b(bagaimana\s+cara|gimana\s+cara|cara\s+membuat|buatkan\s+fungsi|bikin\s+fungsi|bikin\s+algoritma|buatkan\s+script)\b/i,
    /\b(regex|regular\s+expression|query\s+sql|fetch\s+api|endpoint\s+express)\b/i,
  ],

  // Pola eksplisit pembuatan file artefak fisik
  fileArtifact: [
    /\b(buat|bikin|simpan|export|ekspor|download|generate)\s+(file|berkas|dokumen|artefak|artifact)\s+([a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9]+)\b/i,
    /\b(buatkan|bikin|buat)\s+(file\s+html|file\s+docx|file\s+pdf|file\s+excel|file\s+xlsx|file\s+css|file\s+js|file\s+json|file\s+python|file\s+py)\b/i,
    /\b(buatkan\s+website\s+lengkap\s+di\s+file|bikin\s+landing\s+page\s+lengkap\s+di\s+file|simpan\s+ke\s+file)\b/i,
  ],

  // Pola penjelasan dan rangkuman
  explanation: [
    /\b(jelaskan|apa\s+itu|apa\s+yang\s+dimaksud|definisi|pengertian|uraikan|analisis|bagaimana\s+cara\s+kerja|mengapa|kenapa)\b/i,
    /\b(rangkum|ringkas|kesimpulan|poin-poin\s+penting|kelebihan\s+dan\s+kekurangan)\b/i,
  ],
};

/**
 * Menganalisis teks prompt dan menentukan intensi utama pengguna
 * @param {string} prompt - Teks instruksi dari pengguna
 * @param {object} options - Konteks tambahan (activeSkill, senderNumber, dll.)
 * @returns {object} Hasil klasifikasi semantik dan direktif instruksi
 */
function analyzeIntent(prompt, options = {}) {
  const text = String(prompt || '').trim();
  const lower = text.toLowerCase();
  const activeSkill = options.activeSkill || null;

  // 1. Cek Pola Sapaan Santai / Ping
  if (PATTERNS.chitchat.some((rx) => rx.test(lower))) {
    return {
      primaryIntent: INTENT_TYPES.CASUAL_CHITCHAT,
      confidence: 0.98,
      directives: [
        'Respon sapaan ini secara singkat, santai, hangat, dan ramah sesuai persona.',
        'JANGAN mengeksekusi alat/tool apa pun.',
        'JANGAN membuat file atau dokumen.',
        'Tanyakan apa yang bisa kamu bantu hari ini secara bersahabat.',
      ],
      systemPromptDirective: `[INTENT: CASUAL CHAT & GREETING]
Pengguna sedang menyapa atau mengecek responsivitas bot ("${text}").
Tanggapi dengan hangat, ramah, singkat, dan natural (contoh: "Halo! Ada yang bisa saya bantu sekarang, Bos?").
DILARANG membuat file, dilarang menjalankan tool, dan dilarang membuat respons panjang yang tidak perlu.`,
    };
  }

  // 2. Cek Pola Permintaan Tabel
  const isTableReq = PATTERNS.table.some((rx) => rx.test(lower)) || (lower.includes('tabel') && !lower.includes('file html'));
  if (isTableReq) {
    return {
      primaryIntent: INTENT_TYPES.TABLE_GENERATION,
      confidence: 0.95,
      directives: [
        'Pengguna meminta TABEL. Kamu WAJIB menyajikan data dalam bentuk Markdown Table semantik (| Kolom 1 | Kolom 2 |).',
        'DILARANG KERAS membuat file HTML, dilarang menghasilkan kode HTML <table>, dan dilarang memanggil create_artifact!',
        'Sajikan tabel secara langsung dan rapi di dalam teks pesan percakapan.',
      ],
      systemPromptDirective: `[INTENT: MARKDOWN TABLE GENERATION]
Pengguna meminta dibuatkan TABEL ("${text}").
ATURAN UTAMA & LARANGAN MUTLAK:
1. Kamu WAJIB menyajikan tabel dalam format Markdown (| Kolom 1 | Kolom 2 |) dengan perataan yang jelas (|:---|:---:|---:|).
2. DILARANG KERAS membuat file HTML atau berkas apa pun! Jangan gunakan create_artifact!
3. DILARANG menggunakan tag HTML seperti <table>, <tr>, <td>. Gunakan sintaks Markdown murni agar sistem parser dapat merendernya secara interaktif dengan fitur salin & sortir.
4. Berikan penjelasan singkat yang relevan sebelum atau sesudah tabel.`,
    };
  }

  // 3. Cek Pola Pembuatan File Artefak Fisik
  const isFileReq = PATTERNS.fileArtifact.some((rx) => rx.test(lower)) || (activeSkill && (activeSkill.name === 'banner-design' || activeSkill.name === 'slides'));
  if (isFileReq) {
    return {
      primaryIntent: INTENT_TYPES.FILE_ARTIFACT_CREATION,
      confidence: 0.92,
      directives: [
        'Pengguna secara eksplisit meminta pembuatan file fisik atau menggunakan skill pembuat berkas.',
        'Gunakan tool "create_artifact" dengan parameter yang tepat.',
      ],
      systemPromptDirective: `[INTENT: PHYSICAL FILE ARTIFACT CREATION]
Pengguna meminta file fisik atau berkas mandiri.
Jika skill aktif mengizinkan alat, kamu dapat menggunakan tool create_artifact untuk membuat file (HTML, CSS, JS, DOCX, dll.) yang dapat diunduh pengguna.`,
    };
  }

  // 4. Cek Pola Matematika & Analitik
  if (PATTERNS.math.some((rx) => rx.test(lower))) {
    return {
      primaryIntent: INTENT_TYPES.MATH_REASONING,
      confidence: 0.90,
      directives: [
        'Gunakan format KaTeX proporsional: $$ ... $$ untuk display dan \\( ... \\) untuk inline.',
        'Selesaikan secara analitik langkah demi langkah dengan pembuktian yang ketat.',
        'Kotakkan jawaban akhir dalam \\boxed{...}.',
      ],
      systemPromptDirective: `[INTENT: RIGOROUS MATHEMATICAL REASONING]
Pengguna memberikan persoalan matematika atau kalkulus analitik.
Gunakan format 5 langkah: Diketahui, Definisi/Rumus, Transformasi/Substitusi, Perhitungan, dan Jawaban Akhir dalam \\boxed{...}.
Gunakan sintaks KaTeX untuk seluruh simbol dan formula matematika.`,
    };
  }

  // 5. Cek Pola Cuplikan Kode (Bukan file utuh)
  if (PATTERNS.codeSnippet.some((rx) => rx.test(lower))) {
    return {
      primaryIntent: INTENT_TYPES.CODE_SNIPPET,
      confidence: 0.88,
      directives: [
        'Sajikan kode di dalam fenced code block dengan penanda bahasa eksplisit (```javascript, ```python, dll.).',
        'JANGAN membuat file fisik kecuali jika pengguna secara tegas meminta file disimpan ke disk.',
      ],
      systemPromptDirective: `[INTENT: IN-CHAT CODE SNIPPET]
Pengguna meminta kode atau fungsi pemrograman.
Sajikan kode bersih dengan penjelasan ringkas langsung di dalam pesan chat menggunakan Markdown fenced code block (misal: \`\`\`javascript ... \`\`\`).
Jangan membuat file dokumen fisik kecuali jika pengguna meminta "simpan sebagai file".`,
    };
  }

  // 6. Cek Pola Penjelasan & Rangkuman
  if (PATTERNS.explanation.some((rx) => rx.test(lower))) {
    return {
      primaryIntent: INTENT_TYPES.EXPLANATION_SUMMARY,
      confidence: 0.85,
      directives: [
        'Gunakan heading terstruktur, bullet point, dan penekanan teks yang rapi.',
        'Gunakan callout (> [!NOTE] atau > [!TIP]) untuk poin penting.',
      ],
      systemPromptDirective: `[INTENT: STRUCTURED EXPLANATION & SUMMARY]
Pengguna meminta penjelasan mendalam atau rangkuman.
Susun jawaban dengan struktur hirarkis yang jelas, heading Markdown, daftar poin, dan callout informasi penting.`,
    };
  }

  // Default: General Query
  return {
    primaryIntent: INTENT_TYPES.GENERAL_QUERY,
    confidence: 0.75,
    directives: ['Tanggapi secara cerdas, ringkas, dan tepat sasaran.'],
    systemPromptDirective: `[INTENT: DIRECT RESPONSE]
Pahami instruksi pengguna secara mendalam dan berikan jawaban yang paling relevan, cerdas, dan terstruktur.`,
  };
}

module.exports = {
  INTENT_TYPES,
  analyzeIntent,
};
