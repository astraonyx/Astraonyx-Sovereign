// lib/hermesAdaptive.js — Modul Adaptif Hermes Agent
// 1. Persona Mirroring (Gaya bicara otomatis mengikuti tuannya)
// 2. Belajar dari Pengalaman (Long-Term Memory Engine)
// 3. Auto Create Skill (Pembuat skill baru mandiri)
// 4. Panduan Desain Sistem UI/UX Pro Max

const fs = require('fs');
const path = require('path');

const MEMORY_FILE = path.resolve(__dirname, '../database/hermes_memory.json');
const ADAPTATION_FILE = path.resolve(__dirname, '../database/hermes_adaptation_memory.json');
const RAW_CHAT_FILE = path.resolve(__dirname, '../database/hermes_chat_history.json');
const PERSONAS_FILE = path.resolve(__dirname, '../database/hermes_personas.json');

// Inisialisasi file database jika belum ada
function initStorage() {
  const dbDir = path.resolve(__dirname, '../database');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  if (!fs.existsSync(MEMORY_FILE)) {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify({
      preferences: {},
      learnedFacts: [],
      corrections: [],
    }, null, 2), 'utf8');
  }

  if (!fs.existsSync(ADAPTATION_FILE)) {
    fs.writeFileSync(ADAPTATION_FILE, JSON.stringify({
      lessons: [],
      preferences: {},
      corrections: [],
    }, null, 2), 'utf8');
  }

  if (!fs.existsSync(RAW_CHAT_FILE)) {
    fs.writeFileSync(RAW_CHAT_FILE, JSON.stringify([], null, 2), 'utf8');
  }

  if (!fs.existsSync(PERSONAS_FILE)) {
    fs.writeFileSync(PERSONAS_FILE, JSON.stringify({}, null, 2), 'utf8');
  }
}

initStorage();

// ==================== 1. PERSONA MIRRORING ENGINE ====================
/**
 * Menganalisis pesan pengguna untuk mendeteksi gaya bahasa dan preferensi panggilan,
 * lalu menyimpan profil persona agar Hermes bisa menirukan dan beradaptasi secara alami.
 */
function analyzeAndSavePersona(userText, senderNumber = 'user') {
  if (!userText || typeof userText !== 'string') return null;

  const text = userText.toLowerCase().trim();
  let personas = {};
  try {
    personas = JSON.parse(fs.readFileSync(PERSONAS_FILE, 'utf8') || '{}');
  } catch (_) {}

  const current = personas[senderNumber] || {
    style: 'santai',
    salutation: 'Bro',
    slangLevel: 'medium',
    detectedWords: [],
    lastUpdated: new Date().toISOString(),
  };

  // Kamus Diksi
  const gaulWords = ['gw', 'gue', 'gua', 'lu', 'lo', 'loe', 'bro', 'bang', 'wir', 'cuy', 'pea', 'woi', 'woilah', 'njir', 'anjay', 'dong', 'deh', 'dah', 'kan', 'gimana', 'bikin', 'gk', 'gak', 'ga', 'bgt', 'make', 'aja', 'trus'];
  const masterWords = ['tuan', 'master', 'owner', 'bos', 'boss', 'atasan', 'komandan'];
  const formalWords = ['mohon', 'tolong', 'terima kasih', 'selamat pagi', 'selamat siang', 'selamat malam', 'bapak', 'ibu', 'apakah', 'bagaimana', 'perkenalkan'];

  let gaulCount = 0;
  let masterCount = 0;
  let formalCount = 0;

  const tokens = text.split(/[\s,.;:!?]+/);
  tokens.forEach((t) => {
    if (gaulWords.includes(t)) gaulCount++;
    if (masterWords.includes(t)) masterCount++;
    if (formalWords.includes(t)) formalCount++;
  });

  // Tentukan gaya bicara
  if (masterCount > 0 || text.includes('tuan') || text.includes('bos')) {
    current.style = 'master_servant';
    current.salutation = text.includes('tuan') ? 'Tuan' : 'Bos';
    current.slangLevel = 'loyal';
  } else if (gaulCount >= 2 || text.includes('wir') || text.includes('pea') || text.includes('woi')) {
    current.style = 'gaul_akrab';
    if (text.includes('wir')) current.salutation = 'Wir';
    else if (text.includes('bang')) current.salutation = 'Bang';
    else if (text.includes('bro')) current.salutation = 'Bro';
    else current.salutation = 'Bro';
    current.slangLevel = 'high';
  } else if (formalCount >= 2) {
    current.style = 'formal';
    current.salutation = 'Bapak/Ibu';
    current.slangLevel = 'none';
  }

  current.lastUpdated = new Date().toISOString();
  personas[senderNumber] = current;

  try {
    fs.writeFileSync(PERSONAS_FILE, JSON.stringify(personas, null, 2), 'utf8');
  } catch (_) {}

  return current;
}

/**
 * Hasilkan instruksi persona yang akan diinjeksikan ke System Prompt
 */
function getPersonaInstruction(senderNumber = 'user') {
  let personas = {};
  try {
    personas = JSON.parse(fs.readFileSync(PERSONAS_FILE, 'utf8') || '{}');
  } catch (_) {}

  const p = personas[senderNumber];
  if (!p) {
    return 'Gaya bicara: Santai, ramah, responsif, dan cerdas. Panggil lawan bicara dengan "Bro" atau "Tuan" tergantung konteks.';
  }

  if (p.style === 'master_servant') {
    return `[PANDUAN GAYA BICARA ADAPTIF]:
- Tuannya menginginkan kepatuhan dan kesetiaan penuh.
- Panggil dia dengan "${p.salutation}".
- Nada bicara: Sigap, penuh hormat, patuh, dan percaya diri ("Siap ${p.salutation}, perintah langsung saya laksanakan tanpa ragu!").
- Jangan kaku, namun tetap menjaga wibawa sebagai asisten AI autonomous terandal miliknya.`;
  }

  if (p.style === 'gaul_akrab') {
    return `[PANDUAN GAYA BICARA ADAPTIF]:
- Tuannya berbicara dengan gaya gaul, akrab, santai, dan bersahabat (slang Indonesia).
- Panggil dia dengan "${p.salutation}".
- Gunakan bahasa yang luwes, supel, dan asyik ("Siap ${p.salutation}!", "Gua kerjain sekarang...", "Beres nih, langsung cekidot!").
- Tetap cerdas dan akurat dalam mengeksekusi tugas dan memanggil alat.`;
  }

  if (p.style === 'formal') {
    return `[PANDUAN GAYA BICARA ADAPTIF]:
- Pengguna berbicara dengan gaya formal, sopan, dan terstruktur.
- Gunakan bahasa Indonesia baku, profesional, dan hormat.`;
  }

  return 'Gaya bicara: Santai, bersahabat, cerdas, dan menyenangkan.';
}

// ==================== 2. STRUCTURED ADAPTATION & MEMORY ENGINE ====================
function readAdaptation() {
  try {
    const raw = fs.readFileSync(ADAPTATION_FILE, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (_) {
    return { lessons: [], preferences: {}, corrections: [] };
  }
}

function saveAdaptation(data) {
  try {
    fs.writeFileSync(ADAPTATION_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[hermesAdaptive] Gagal menyimpan adaptation memory:', err.message);
  }
}

function recordRawChat({ senderNumber = 'user', role = 'user', content = '', toolCalls = null }) {
  try {
    let history = [];
    if (fs.existsSync(RAW_CHAT_FILE)) {
      history = JSON.parse(fs.readFileSync(RAW_CHAT_FILE, 'utf8') || '[]');
    }
    history.push({
      id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      senderNumber,
      role,
      content: String(content || '').slice(0, 3000),
      toolCalls,
    });
    // Batasi riwayat raw chat agar tidak membengkak tak terkendali (max 500 riwayat)
    if (history.length > 500) history.shift();
    fs.writeFileSync(RAW_CHAT_FILE, JSON.stringify(history, null, 2), 'utf8');
  } catch (err) {
    console.error('[hermesAdaptive] Gagal mencatat raw chat:', err.message);
  }
}

function addLesson({ lesson, category = 'workflow', sourceMessageId = '', confidence = 'low', confidenceScore = 0.35 }) {
  if (!lesson || typeof lesson !== 'string') return null;
  const data = readAdaptation();
  data.lessons = data.lessons || [];

  const cleanLesson = lesson.trim();
  const existingIdx = data.lessons.findIndex((l) => l.lesson.toLowerCase() === cleanLesson.toLowerCase());

  if (existingIdx >= 0) {
    const item = data.lessons[existingIdx];
    item.reinforcement_count = (item.reinforcement_count || 1) + 1;
    item.last_confirmed_at = new Date().toISOString();
    if (item.reinforcement_count >= 3) {
      item.confidence = 'high';
      item.confidence_score = Math.max(item.confidence_score || 0.7, 0.9);
    } else if (item.reinforcement_count >= 2) {
      item.confidence = 'medium';
      item.confidence_score = Math.max(item.confidence_score || 0.5, 0.65);
    }
    saveAdaptation(data);
    return item;
  }

  const newLesson = {
    id: 'les_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    lesson: cleanLesson,
    category,
    confidence,
    confidence_score: confidenceScore,
    source_message_id: sourceMessageId || null,
    reinforcement_count: 1,
    created_at: new Date().toISOString(),
    last_confirmed_at: new Date().toISOString(),
  };

  data.lessons.push(newLesson);
  if (data.lessons.length > 100) data.lessons.shift();
  saveAdaptation(data);
  return newLesson;
}

function addCorrection(wrongBehavior, rightBehavior, sourceMessageId = '') {
  const data = readAdaptation();
  data.corrections = data.corrections || [];

  const existing = data.corrections.find((c) => c.wrong_behavior.toLowerCase() === wrongBehavior.toLowerCase());
  if (existing) {
    existing.reinforcement_count = (existing.reinforcement_count || 1) + 1;
    existing.right_behavior = rightBehavior;
    existing.last_confirmed_at = new Date().toISOString();
    if (existing.reinforcement_count >= 3) {
      existing.confidence = 'high';
    } else if (existing.reinforcement_count >= 2) {
      existing.confidence = 'medium';
    }
    saveAdaptation(data);
    return { success: true, item: existing };
  }

  const newCorr = {
    id: 'corr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    wrong_behavior: wrongBehavior,
    right_behavior: rightBehavior,
    confidence: 'medium',
    reinforcement_count: 1,
    source_message_id: sourceMessageId || null,
    created_at: new Date().toISOString(),
    last_confirmed_at: new Date().toISOString(),
  };

  data.corrections.push(newCorr);
  if (data.corrections.length > 50) data.corrections.shift();
  saveAdaptation(data);

  // Sekaligus buat lesson turunan
  addLesson({
    lesson: `Patuhi koreksi: Hindari ${wrongBehavior}, gunakan ${rightBehavior}`,
    category: 'correction',
    sourceMessageId,
    confidence: 'medium',
    confidenceScore: 0.65,
  });

  return { success: true, item: newCorr };
}

function setPreference(key, value) {
  const data = readAdaptation();
  data.preferences = data.preferences || {};
  data.preferences[key] = {
    value,
    updated_at: new Date().toISOString(),
  };
  saveAdaptation(data);
  return { success: true, key, value };
}

function getMemoryContext() {
  const data = readAdaptation();
  const parts = [];

  if (data.lessons && data.lessons.length > 0) {
    // Tampilkan hanya pelajaran dengan confidence medium ke atas atau recent
    const validLessons = data.lessons.slice(-8).map((l) => {
      const confLabel = l.confidence === 'high' ? 'TINGGI' : (l.confidence === 'medium' ? 'SEDANG' : 'AWAL');
      return `• [CONFIDENCE: ${confLabel} (${l.category})] ${l.lesson}`;
    }).join('\n');
    parts.push(`[ADAPTASI & PEMBELAJARAN PENGALAMAN]:\n${validLessons}`);
  }

  if (data.corrections && data.corrections.length > 0) {
    const recentCorr = data.corrections.slice(-5).map((c) => {
      return `• [KOREKSI TERVERIFIKASI] HINDARI: ${c.wrong_behavior} ➔ GUNAKAN: ${c.right_behavior}`;
    }).join('\n');
    parts.push(`[EVALUASI & KOREKSI MASA LALU]:\n${recentCorr}`);
  }

  if (data.preferences && Object.keys(data.preferences).length > 0) {
    const prefs = Object.entries(data.preferences).map(([k, v]) => `• ${k}: ${JSON.stringify(v.value || v)}`).join('\n');
    parts.push(`[PREFERENSI KHUSUS PENGGUNA]:\n${prefs}`);
  }

  if (parts.length > 0) {
    parts.push(`[PANDUAN PRIORITAS UTAMA]:
Aturan adaptasi di atas adalah hasil pembelajaran masa lalu. JIKA pengguna saat ini memberikan instruksi yang berbeda, baru, atau bertentangan, INSTRUKSI TERBARU DARI PENGGUNA SAAT INI WAJIB DIUTAMAKAN dan jangan pernah dibatasi oleh aturan masa lalu.`);
  }

  return parts.join('\n\n');
}

// ==================== 3. AUTO CREATE SKILL ENGINE ====================
function createSkillFile({ name, description, parameters, code, type = 'js' }) {
  const skillManager = require('../server/skillManager');
  const safeName = String(name || '').toLowerCase().replace(/[^a-z0-9_]/g, '_').trim();
  if (!safeName) throw new Error('Nama skill tidak valid.');

  const SKILLS_DIR = skillManager.SKILLS_DIR;
  if (!fs.existsSync(SKILLS_DIR)) fs.mkdirSync(SKILLS_DIR, { recursive: true });

  if (type === 'js') {
    // Generate standard executable CommonJS module
    const jsContent = `// Auto-generated skill: ${safeName}
// Dibuat secara otonom oleh Hermes Agent pada ${new Date().toISOString()}

module.exports = {
  name: "${safeName}",
  description: "${(description || 'Skill otomatis buatan Hermes').replace(/"/g, '\\"')}",
  parameters: ${JSON.stringify(parameters || { type: 'object', properties: {} }, null, 2)},
  execute: async (args, context) => {
    ${code ? code : `
    // Logika default auto-generated
    return {
      success: true,
      skill: "${safeName}",
      message: "Skill ${safeName} berhasil dieksekusi.",
      args,
    };`}
  }
};
`;
    const targetFile = path.join(SKILLS_DIR, `${safeName}.js`);
    fs.writeFileSync(targetFile, jsContent, 'utf8');

    // Update metadata
    skillManager.saveCustomSkill(`${safeName}.js`, jsContent);
    return {
      success: true,
      name: safeName,
      filename: `${safeName}.js`,
      path: targetFile,
      message: `Skill /${safeName} berhasil dibuat dan langsung aktif!`,
    };
  } else {
    // JSON response skill
    const jsonObj = {
      name: safeName,
      description: description || `Skill ${safeName}`,
      parameters: parameters || { type: 'object', properties: {} },
      response: code || `Fitur skill /${safeName} aktif.`,
    };
    const jsonStr = JSON.stringify(jsonObj, null, 2);
    const targetFile = path.join(SKILLS_DIR, `${safeName}.json`);
    fs.writeFileSync(targetFile, jsonStr, 'utf8');
    skillManager.saveCustomSkill(`${safeName}.json`, jsonStr);
    return {
      success: true,
      name: safeName,
      filename: `${safeName}.json`,
      path: targetFile,
      message: `Skill JSON /${safeName} berhasil dibuat dan langsung aktif!`,
    };
  }
}

// ==================== 4. UI/UX PRO MAX BUILT-IN SYSTEM ====================
const UI_UX_PRO_MAX_INSTRUCTION = `[PANDUAN DESAIN UI/UX PRO MAX TERINTEGRASI]:
Kamu menguasai sistem keahlian UI/UX Pro Max untuk semua pembuatan website, landing page, dan antarmuka:
1. DESIGN SYSTEM GENERATION:
   - Warna: Gunakan palet harmonis (misal: Slate/Zinc dark mode dengan aksen Neon Cyan #38bdf8, Emerald #10b981, Purple #a855f7).
   - Tipografi: Pasangan font modern (Inter/Plus Jakarta Sans/Outfit untuk display, JetBrains Mono untuk angka/kode).
   - Kontras: Pastikan rasio kontras teks ke latar belakang memenuhi WCAG AA/AAA (tidak boleh teks gelap di background gelap).
2. MODERN LAYOUT & BEST PRACTICES:
   - Framework: Default ke HTML + Tailwind CSS (via CDN) dengan glassmorphism (backdrop-filter: blur), border halus (rgba(255,255,255,0.08)), rounded modern (rounded-xl, rounded-2xl).
   - Micro-Interactions: Efek hover halus (transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg).
   - Responsivitas: Desain fleksibel (grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3) ramah mobile dan desktop.
3. PRE-DELIVERY CHECKS:
   - Lengkapi dengan elemen nyata (Hero section, Feature cards, Pricing table, Testimonial, Call to Action, Footer interaktif).
   - Jangan pernah membuat placeholder teks membosankan; buat konten nyata yang memikat!
   - Saat membuat file HTML, selalu panggil tool \`create_artifact\` untuk menghasilkan file fisik yang bisa di-preview langsung.`;

module.exports = {
  analyzeAndSavePersona,
  getPersonaInstruction,
  readAdaptation,
  saveAdaptation,
  readMemory: readAdaptation,
  recordRawChat,
  addLesson,
  addLearnedFact: (fact, cat) => addLesson({ lesson: fact, category: cat || 'general', confidence: 'low' }),
  addCorrection,
  setPreference,
  getMemoryContext,
  createSkillFile,
  UI_UX_PRO_MAX_INSTRUCTION,
};
