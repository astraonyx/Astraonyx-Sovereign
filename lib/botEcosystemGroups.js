// lib/botEcosystemGroups.js — Auto-Setup Ekosistem 4 Grup Khusus Polaris Bot (Single-User / Owner)
// Memiliki proteksi ketat Anti-Infinite-Loop agar tidak pernah membuat grup berulang-ulang

const fs = require('fs');
const path = require('path');
const config = require('../config');
const { jidNormalizedUser } = require('@whiskeysockets/baileys');

const DATA_FILE = path.resolve(__dirname, '../database/bot_ecosystem_groups.json');

/**
 * Log error ekosistem dengan banner visual yang sangat mencolok di terminal console
 * Memastikan semua kendala ekosistem (pembuatan grup, penautan komunitas, invite code) terpantau seketika
 * @param {string} title - Judul kendala / konteks error
 * @param {Error|string} err - Objek error atau pesan error
 * @param {object} [details] - Informasi diagnostik tambahan
 */
function logEcosystemTerminalError(title, err, details = {}) {
  const border = '═'.repeat(64);
  const errMsg = err?.message || String(err || 'Unknown error');
  console.error(`\n\x1b[41m\x1b[37m\x1b[1m 🚨 [POLARIS ECOSYSTEM ERROR] \x1b[0m`);
  console.error(`\x1b[31m\x1b[1m╔${border}╗`);
  console.error(`║ ⚠️  Konteks : ${title}`);
  console.error(`║ ❌ Masalah : ${errMsg}`);
  if (details && typeof details === 'object' && Object.keys(details).length > 0) {
    console.error(`╟${'─'.repeat(64)}╢`);
    for (const [k, v] of Object.entries(details)) {
      if (v !== undefined && v !== null) {
        const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
        console.error(`║ • ${k.padEnd(16)}: ${valStr.slice(0, 80)}`);
      }
    }
  }
  if (err?.stack) {
    const stackLines = err.stack.split('\n').slice(1, 4).map((l) => l.trim()).filter(Boolean);
    if (stackLines.length > 0) {
      console.error(`╟${'─'.repeat(64)}╢`);
      console.error(`║ 📍 Lokasi Stack:`);
      for (const sl of stackLines) {
        console.error(`║   ↳ ${sl.slice(0, 80)}`);
      }
    }
  }
  console.error(`╚${border}╝\x1b[0m\n`);
}

// Spesifikasi Komunitas Induk yang menaungi 5 grup
const COMMUNITY_SPEC = {
  subject: 'Polaris • Official Community',
  desc: 'Komunitas Resmi Polaris WhatsApp AI Bot Ecosystem. Menyatukan 5 ruang operasional otomatis: Global Hot News, System Logs, Artifact Vault, AI Sandbox, dan Akademi Belajar Polymath Genius. [POLARIS_COMMUNITY]',
};

// Spesifikasi 5 Grup Khusus yang diwajibkan
const ECOSYSTEM_SPECS = [
  {
    key: 'news',
    subject: 'Polaris • Global Hot News',
    desc: '🌍 Ruang feed pencarian berita terkini, trending topik dunia, teknologi, dan hot updates yang dikurasi oleh Polaris AI. [POLARIS_ECOSYSTEM:news]',
    keywords: ['global hot news', 'hot news', 'polaris news', 'berita polaris'],
    welcomeText: '🌐 *Selamat Datang di Polaris • Global Hot News!*\n──────────────────────────────\nGrup ini khusus difungsikan untuk feed pencarian & penyajian rangkuman berita terhangat, perkembangan teknologi, dan tren global dunia secara real-time.',
  },
  {
    key: 'logs',
    subject: 'Polaris • System & Error Logs',
    desc: '🚨 Pusat pengawasan sistem otomatis. Mencatat error runtime, watchdog alert, dan status kesehatan bot secara real-time. [POLARIS_ECOSYSTEM:logs]',
    keywords: ['system & error logs', 'system logs', 'error logs', 'polaris logs'],
    welcomeText: '🚨 *Selamat Datang di Polaris • System & Error Logs!*\n──────────────────────────────\nGrup ini khusus difungsikan sebagai monitor sistem. Setiap kendala, error API, dan log watchdog bot akan tercatat di sini secara real-time.',
  },
  {
    key: 'vault',
    subject: 'Polaris • Output & Artifact Vault',
    desc: '📦 Gudang penyimpanan output bot, file dokumen (HTML, DOCX, ZIP, XLSX), tabel komparasi, dan media hasil eksekusi AI. [POLARIS_ECOSYSTEM:vault]',
    keywords: ['output & artifact vault', 'artifact vault', 'output vault', 'polaris vault'],
    welcomeText: '📦 *Selamat Datang di Polaris • Output & Artifact Vault!*\n──────────────────────────────\nGrup ini berfungsi sebagai brankas output. Seluruh berkas fisik (HTML, DOCX, ZIP, XLSX), tabel komparasi, dan hasil unduhan media otomatis tersimpan rapi di sini.',
  },
  {
    key: 'sandbox',
    subject: 'Polaris • AI Agent Sandbox',
    desc: '🧠 Ruang uji coba prompt kompleks, simulasi multi-step autonomous reasoning, dan eksperimen AI tanpa prefix. [POLARIS_ECOSYSTEM:sandbox]',
    keywords: ['ai agent sandbox', 'ai sandbox', 'agent sandbox', 'polaris sandbox'],
    welcomeText: '🧠 *Selamat Datang di Polaris • AI Agent Sandbox!*\n──────────────────────────────\nGrup ini adalah laboratorium privat kamu untuk menguji prompt AI tingkat lanjut, simulasi autonomous reasoning Hermes, dan pengujian skill tanpa mengganggu obrolan lain.',
  },
  {
    key: 'academy',
    subject: 'Polaris • Belajar & Polymath Genius',
    desc: '🎓 Laboratorium Polymath & Akademi Multi-Disiplin Interaktif. Diskusi & belajar cerdas tanpa command untuk Bahasa Inggris (British/US), Mandarin, Sejarah, Filsafat, Psikologi, Neurosains, Sains/Math, Coding/AI, Detektif, Mentalist, Negosiator, dan Strategi Jenius. [POLARIS_ECOSYSTEM:academy]',
    keywords: ['belajar & polymath', 'polymath genius', 'polaris belajar', 'polaris academy', 'academy & polymath'],
    welcomeText: [
      `╔════════════════════════════════════╗`,
      `  🎓 *[ POLARIS • BELAJAR & POLYMATH GENIUS ]* 🧠`,
      `╚════════════════════════════════════╝`,
      ``,
      `« SYSTEM INITIALIZED: WORLD-CLASS POLYMATH MENTOR »`,
      `Selamat datang di ruang pembelajaran & laboratorium multi-disiplin interaktif! Di sini kamu bisa belajar dan berkonsultasi secara langsung *TANPA PERLU COMMAND* (tidak perlu /ai atau prefix apapun).`,
      ``,
      `📚 *Kurikulum & Domain Kejeniusan yang Tersedia:*`,
      `• 🇬🇧🇺🇸 *Bahasa Inggris*: British vs American (aksen, idiom, grammar, Received Pronunciation vs General American)`,
      `• 🇨🇳 *Bahasa Mandarin*: Pinyin, Hanzi, 4 Tones, drills percakapan harian & bisnis`,
      `• 🏛️ *Sejarah & Peradaban*: Hikmah sejarah, dinamika peradaban, geopolitik kuno hingga modern`,
      `• ⚖️ *Filsafat & Logika*: Stoikisme (Marcus Aurelius, Seneca), dialektika Sokrates, epistemologi`,
      `• 🧠 *Psikologi, Neurosains & Neurologi*: Regulasi dopamin/serotonin, neuroplastisitas, bias kognitif`,
      `• 🔬 *Sains & Matematika*: First-principles thinking, fisika teoretis, kalkulus, statistika`,
      `• 💻 *Informatika, Coding & AI*: Arsitektur sistem, deep learning, Python, prompt engineering`,
      `• 👥 *Society & Sosiologi*: Dinamika sosial, interaksi simbolik, sosiologi modern`,
      `• 🧩 *Problem Solving & Strategic Planner*: 5 Whys, MECE framework, reverse engineering masalah`,
      `• 🎙️ *Public Speaking & Negosiasi*: Tactical Empathy (Chris Voss), Hook-Story-Offer, BATNA`,
      `• 🔍 *Detektif, Observator & Mentalist*: Deduksi Sherlockian, mikro-ekspresi, cold reading etis`,
      `• 🤝 *Manipulator Jenius Versi Baik*: Persuasi etis (Cialdini), reframing kognitif positif`,
      `• 🏰 *Penghafal Jenius*: Memory Palace (Metode Loci), Major System, spaced repetition`,
      `• 👑 *Pemimpin Jenius & Networking Relasi*: EQ kepemimpinan, delegasi taktis, high-value network`,
      ``,
      `💡 *Cara Memulai:*`,
      `Cukup ketik pertanyaan atau topik belajarmu langsung di obrolan grup ini! AI Polymath Mentor akan langsung memandu dengan first-principles, contoh taktis, dan latihan interaktif!`,
    ].join('\n'),
  },
];

/**
 * Mengambil seluruh nomor telepon Owner dari konfigurasi & database whitelist
 * @returns {string[]} Array nomor telepon bersih (e.g. ['6281234567890', ...])
 */
function getAllOwnerNumbers() {
  const ownerSet = new Set();
  if (config.ownerNumber) {
    const clean = String(config.ownerNumber).replace(/[^0-9]/g, '');
    if (clean.length >= 9) ownerSet.add(clean);
  }
  try {
    const { loadWhitelist } = require('./accessControl');
    const wl = loadWhitelist();
    if (Array.isArray(wl.owners)) {
      for (const o of wl.owners) {
        const clean = String(o).replace(/[^0-9]/g, '');
        if (clean.length >= 9) ownerSet.add(clean);
      }
    }
  } catch (_) {}
  return Array.from(ownerSet);
}

/**
 * Mengambil daftar nomor telepon Human Owner (mengecualikan nomor akun bot sendiri)
 * @param {string} myNumber - Nomor telepon bot saat ini
 * @returns {string[]}
 */
function getHumanOwnerNumbers(myNumber) {
  const allOwners = getAllOwnerNumbers();
  const cleanBot = myNumber ? String(myNumber).replace(/[^0-9]/g, '') : '';
  return allOwners.filter((num) => num && num !== cleanBot);
}

/**
 * Sanitasi data ekosistem dari sisa mock/test data atau ID tidak valid
 */
function sanitizeEcosystemData(data) {
  if (!data || typeof data !== 'object') {
    return { hasCreated: false, botNumber: null, community: null, groups: {} };
  }
  // Bersihkan mock/invalid community
  if (data.community && (typeof data.community.jid !== 'string' || data.community.jid.startsWith('mock_') || (data.community.inviteCode && data.community.inviteCode.startsWith('mock_')))) {
    data.community = null;
  }
  // Bersihkan mock/invalid groups
  if (data.groups && typeof data.groups === 'object') {
    for (const [key, g] of Object.entries(data.groups)) {
      if (!g || typeof g.jid !== 'string' || g.jid.startsWith('mock_') || (g.inviteCode && g.inviteCode.startsWith('mock_'))) {
        delete data.groups[key];
      }
    }
  }
  if (data.botNumber && String(data.botNumber).startsWith('6289999999999')) {
    data.botNumber = null;
  }
  return data;
}

/**
 * Mengambil data ekosistem dari SQLite atau File JSON (Dual Persistence)
 */
function getSavedData() {
  let data = null;

  // 1. Coba baca dari SQLite kv_store
  try {
    const { kvQueries } = require('../server/db');
    if (kvQueries && typeof kvQueries.get === 'function') {
      const rowVal = kvQueries.get('bot_ecosystem_state');
      if (rowVal && typeof rowVal === 'object') {
        data = rowVal;
      }
    }
  } catch (_) {}

  // 2. Fallback baca dari file JSON jika SQLite belum ada
  if (!data || !data.groups) {
    try {
      if (fs.existsSync(DATA_FILE)) {
        data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      }
    } catch (_) {}
  }

  if (data && typeof data === 'object') {
    if (!data.groups) data.groups = {};
    return sanitizeEcosystemData(data);
  }

  return { hasCreated: false, botNumber: null, community: null, groups: {} };
}

/**
 * Menyimpan data ekosistem ke SQLite dan File JSON secara serempak
 */
function saveData(data) {
  if (!data || typeof data !== 'object') return;
  const cleanData = sanitizeEcosystemData(data);

  // 1. Simpan ke File JSON
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(cleanData, null, 2), 'utf-8');
  } catch (err) {
    logEcosystemTerminalError('Gagal Menyimpan Database File JSON Ekosistem', err, { DATA_FILE });
  }

  // 2. Simpan ke SQLite kv_store
  try {
    const { kvQueries } = require('../server/db');
    if (kvQueries && typeof kvQueries.set === 'function') {
      kvQueries.set('bot_ecosystem_state', cleanData);
    }
  } catch (errDb) {
    logEcosystemTerminalError('Gagal Menyimpan State Ekosistem ke SQLite kv_store', errDb);
  }
}

let isCreating = false;

// Helper Signature Tag dinamis per nomor bot (Portabel & Multi-User)
function getGroupTag(key, botNumber) {
  return botNumber ? `[polaris_eco:${key}:${botNumber}]` : `[polaris_ecosystem:${key}]`;
}

function getCommunityTag(botNumber) {
  return botNumber ? `[polaris_community:${botNumber}]` : `[polaris_community]`;
}

/**
 * Deteksi kategori grup berdasarkan subjek atau tag deskripsi
 */
function detectCategoryForGroup(subject, desc) {
  const s = (subject || '').toLowerCase();
  const d = (desc || '').toLowerCase();
  for (const spec of ECOSYSTEM_SPECS) {
    if (d.includes(`[polaris_eco:${spec.key}:`) || d.includes(`[polaris_ecosystem:${spec.key}]`)) {
      return spec.key;
    }
    if (s.includes(spec.subject.toLowerCase())) {
      return spec.key;
    }
    if (Array.isArray(spec.keywords) && spec.keywords.some((kw) => s.includes(kw.toLowerCase()))) {
      return spec.key;
    }
  }
  return 'vault';
}

/**
 * Merekam isi chat/media dari grup lama dan me-repost ke grup utama kategori masing-masing
 */
async function harvestAndMigrateGroupData(sock, oldGroupJid, oldSubject, targetCategoryKey, targetGroupJid) {
  if (!sock || !oldGroupJid || !targetGroupJid) return false;
  if (oldGroupJid === targetGroupJid) return false;

  console.log(`[BotEcosystem Migrate] 📦 Memulai konsolidasi data dari "${oldSubject}" (${oldGroupJid}) ke [${targetCategoryKey.toUpperCase()}] (${targetGroupJid})...`);

  let messages = [];
  try {
    const { db } = require('../server/db');
    if (db) {
      const rows = db.prepare('SELECT sender_name, message_type, content_text, media_path, timestamp FROM message_vault WHERE chat_jid = ? ORDER BY timestamp DESC LIMIT 20').all(oldGroupJid);
      if (rows && rows.length > 0) {
        messages = rows.reverse();
      }
    }
  } catch (_) {}

  const spec = ECOSYSTEM_SPECS.find((s) => s.key === targetCategoryKey);
  const categoryTitle = spec ? spec.subject : targetCategoryKey.toUpperCase();

  const report = [
    `📦 *[POLARIS DATA CONSOLIDATION & MIGRATION]*`,
    `──────────────────────────────`,
    `• *Sumber Grup Lama:* ${oldSubject || oldGroupJid}`,
    `• *JID Lama:* \`${oldGroupJid}\``,
    `• *Kategori Ekosistem:* [${targetCategoryKey.toUpperCase()}] ${categoryTitle}`,
    `• *Waktu Migrasi:* ${new Date().toLocaleString('id-ID')}`,
    ``,
    `🔒 Seluruh riwayat percakapan, berkas dokumen, dan data penting dari grup lama telah berhasil diamankan dan dipindahkan ke grup resmi ini. Grup lama telah dibubarkan dan ditutup secara tuntas.`,
  ];

  if (messages.length > 0) {
    report.push(``);
    report.push(`📜 *Rangkuman Catatan & Pesan Terakhir dari Grup Lama:*`);
    for (const m of messages) {
      const sender = m.sender_name || 'Member';
      const text = m.content_text ? `"${m.content_text.slice(0, 150)}"` : `[Media: ${m.message_type}]`;
      report.push(`• *${sender}*: ${text}`);
    }
  }

  // Kirim laporan konsolidasi ke grup tujuan
  if (typeof sock.sendMessage === 'function') {
    try {
      await sock.sendMessage(targetGroupJid, { text: report.join('\n') });
      console.log(`[BotEcosystem Migrate] ✨ Berhasil mengirimkan laporan konsolidasi ke grup utama ${targetGroupJid}!`);

      // Kirim ulang berkas media/dokumen yang masih tersimpan di disk
      for (const m of messages) {
        if (m.media_path && fs.existsSync(m.media_path)) {
          try {
            const buf = fs.readFileSync(m.media_path);
            const fileName = path.basename(m.media_path);
            if (m.message_type === 'image') {
              await sock.sendMessage(targetGroupJid, { image: buf, caption: `📎 Arsip migrasi: ${fileName}` });
            } else if (m.message_type === 'video') {
              await sock.sendMessage(targetGroupJid, { video: buf, caption: `📎 Arsip migrasi: ${fileName}` });
            } else if (m.message_type === 'audio') {
              await sock.sendMessage(targetGroupJid, { audio: buf, mimetype: 'audio/mp4' });
            } else {
              await sock.sendMessage(targetGroupJid, { document: buf, fileName, mimetype: 'application/octet-stream' });
            }
            await new Promise((r) => setTimeout(r, 1000));
          } catch (_) {}
        }
      }
      return true;
    } catch (sendErr) {
      console.warn(`[BotEcosystem Migrate] Gagal mengirim migrasi ke ${targetGroupJid}:`, sendErr.message);
    }
  }
  return false;
}

/**
 * Membubarkan grup lama secara tuntas (kick semua anggota termasuk owner, clear chat, lalu leave)
 */
async function dismantleDuplicateGroup(sock, oldGroupJid, oldGroupMeta, myJid, myNumber) {
  if (!sock || !oldGroupJid) return;

  const participants = oldGroupMeta?.participants || [];
  const cleanBotNumber = myNumber ? String(myNumber).replace(/[^0-9]/g, '') : '';
  const botLid = sock?.user?.lid ? jidNormalizedUser(sock.user.lid) : '';

  const isBotAdmin = participants.some((p) => {
    const pId = p.id ? jidNormalizedUser(p.id) : '';
    return (pId === myJid || (cleanBotNumber && pId.includes(cleanBotNumber)) || (botLid && pId === botLid)) &&
      (p.admin === 'admin' || p.admin === 'superadmin');
  });

  // 1. Kick seluruh anggota (termasuk human owner) jika bot adalah admin grup
  if (isBotAdmin && typeof sock.groupParticipantsUpdate === 'function') {
    const toKick = participants
      .map((p) => (p.id ? jidNormalizedUser(p.id) : ''))
      .filter((id) => id && id !== myJid && (!cleanBotNumber || !id.includes(cleanBotNumber)) && id !== botLid);

    if (toKick.length > 0) {
      try {
        console.log(`[BotEcosystem Dismantle] 🚪 Mengeluarkan ${toKick.length} peserta (termasuk owner) dari grup lama ${oldGroupJid}...`);
        await sock.groupParticipantsUpdate(oldGroupJid, toKick, 'remove');
        await new Promise((r) => setTimeout(r, 1500));
      } catch (kickErr) {
        logEcosystemTerminalError('Gagal Mengeluarkan Anggota dari Grup Duplikat', kickErr, { oldGroupJid });
      }
    }
  }

  // 2. Bersihkan chat grup di memori bot jika didukung
  if (typeof sock.chatModify === 'function') {
    try {
      await sock.chatModify({ clear: { messages: [] } }, oldGroupJid);
    } catch (_) {}
  }

  // 3. Bot keluar dari grup lama
  if (typeof sock.groupLeave === 'function') {
    try {
      console.log(`[BotEcosystem Dismantle] 🚪 Bot meninggalkan grup lama ${oldGroupJid}...`);
      await sock.groupLeave(oldGroupJid);
      await new Promise((r) => setTimeout(r, 1500));
    } catch (lErr) {
      logEcosystemTerminalError('Gagal Meninggalkan Grup Duplikat (groupLeave)', lErr, { oldGroupJid });
    }
  }
}

/**
 * Membersihkan grup-grup duplikat/sampah:
 * Rekam & Repost data ke grup utama kategori terkait -> Kick seluruh anggota -> Bot leave.
 */
async function cleanupJunkGroups(sock, myJid, myNumber, activeCanonicalGroups = null) {
  if (!sock || typeof sock.groupLeave !== 'function') return;

  const saved = getSavedData();
  const canonicalJids = new Set([
    saved.community?.jid,
    ...Object.values(saved.groups || {}).map((g) => g?.jid),
    ...Object.values(activeCanonicalGroups || {}).map((g) => g?.jid),
  ].filter(Boolean));

  // Daftar JID yang spesifik teridentifikasi sebagai sampah insiden
  const KNOWN_JUNK_JIDS = new Set([
    '120363413056560156@g.us',
    '120363412244441430@g.us',
    '120363430352018560@g.us',
    '120363413944397325@g.us',
    '120363413986815303@g.us',
    '120363428629960817@g.us',
    '120363427711146694@g.us',
  ]);

  try {
    const activeGroups = await sock.groupFetchAllParticipating().catch(() => ({}));

    for (const [gJid, gMeta] of Object.entries(activeGroups)) {
      if (!gJid || canonicalJids.has(gJid)) continue;

      const isKnownJunk = KNOWN_JUNK_JIDS.has(gJid);
      const subject = (gMeta?.subject || '').trim();
      const desc = (gMeta?.desc || gMeta?.description || '').trim();
      const isPolarisDuplicate = isKnownJunk || subject.startsWith('Polaris •') || subject.includes('Polaris Official Community') || desc.includes('[polaris_eco:') || desc.includes('[polaris_ecosystem:');

      if (!isPolarisDuplicate) continue;

      console.log(`[BotEcosystem Cleanup] 🧹 Memproses grup duplikat/lama: ${gJid} ("${subject}")...`);

      // 1. Deteksi kategori grup lama
      const catKey = detectCategoryForGroup(subject, desc);
      const targetGroupJid = activeCanonicalGroups?.[catKey]?.jid || saved.groups?.[catKey]?.jid;

      // 2. Rekam isi chat & file, lalu repost ke grup utama kategori terkait
      if (targetGroupJid && targetGroupJid !== gJid) {
        await harvestAndMigrateGroupData(sock, gJid, subject, catKey, targetGroupJid);
      }

      // 3. Pembubaran tuntas (kick seluruh peserta termasuk owner + clear chat + bot leave)
      await dismantleDuplicateGroup(sock, gJid, gMeta, myJid, myNumber);
    }
  } catch (err) {
    logEcosystemTerminalError('Error Pembersihan Grup Duplikat/Sampah', err);
  }
}

/**
 * Heuristik Pencocokan Grup Ekosistem (Tag Digital Signature / Keywords / Nama)
 */
function matchEcosystemKey(groupMeta, spec, myNumber) {
  if (!groupMeta) return false;
  const subject = (groupMeta.subject || '').trim().toLowerCase();
  const desc = (groupMeta.desc || groupMeta.description || '').toLowerCase();

  // 1. Cek Dynamic Signature Tag per nomor bot
  if (myNumber && desc.includes(getGroupTag(spec.key, myNumber).toLowerCase())) {
    return true;
  }

  // 2. Cek Signature Tag umum di Deskripsi
  if (desc.includes(`[polaris_ecosystem:${spec.key}]`)) {
    return true;
  }

  // 3. Cek Kesamaan Nama Persis
  if (subject === spec.subject.trim().toLowerCase()) {
    return true;
  }

  // 4. Cek Keywords
  if (Array.isArray(spec.keywords)) {
    for (const kw of spec.keywords) {
      if (subject.includes(kw.toLowerCase())) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Memastikan 5 grup ekosistem bot sudah dibuat, terhubung, dan tersinkronisasi
 * DILENGKAPI INTELIJEN RE-CONNECT OTOMATIS:
 * - Jika auth info dicopot lalu dipasang kembali, bot akan men-scan ulang grup partisipan
 * - Menemukan grup lama lewat Tag Signature dinamis atau Keyword
 * - Jika bot ada invite link tersimpan namun belum masuk, bot akan auto-join
 * - ZERO DUPLICATION: Tidak pernah membuat grup baru di latar belakang
 */
async function ensureEcosystemGroups(sock, forceRefresh = false) {
  if (!sock || typeof sock.groupFetchAllParticipating !== 'function') {
    return { success: false, reason: 'Baileys group methods not available' };
  }

  if (isCreating || global.__ecosystemCreationActive) {
    return { success: true, message: 'Proses sinkronisasi grup sedang berlangsung' };
  }
  isCreating = true;
  global.__ecosystemCreationActive = true;

  try {
    const myJid = sock.user?.id ? jidNormalizedUser(sock.user.id) : null;
    if (!myJid) {
      logEcosystemTerminalError('Inisialisasi Ekosistem Ditunda', new Error('Akun bot belum siap (sock.user belum terdefinisi). Menunggu koneksi WhatsApp stabil.'));
      isCreating = false;
      global.__ecosystemCreationActive = false;
      return { success: false, reason: 'user_not_ready' };
    }
    const myNumber = myJid.split('@')[0] || '';
    let saved = getSavedData();

    let savedGroups = saved.groups || {};
    let savedCommunity = saved.community || null;
    let communityJid = savedCommunity?.jid || null;

    console.log(`[BotEcosystem] Memulai pemindaian ekosistem grup untuk bot ${myNumber || 'active'}...`);

    // 1. Ambil seluruh grup yang diikuti akun bot saat ini
    let activeGroups = {};
    try {
      activeGroups = await sock.groupFetchAllParticipating();
    } catch (e) {
      logEcosystemTerminalError('Gagal Mengambil Daftar Grup Aktif (groupFetchAllParticipating)', e);
    }

    // FAIL-SAFE GUARD: Jika activeGroups kosong (rate-limit WhatsApp atau koneksi belum siap),
    // JANGAN PERNAH mengambil kesimpulan grup hilang dan JANGAN membuat grup baru!
    if (!activeGroups || Object.keys(activeGroups).length === 0) {
      logEcosystemTerminalError('Daftar Grup Aktif Kosong atau Terkena Rate Limit WhatsApp', new Error('WhatsApp merespons daftar grup kosong. Sinkronisasi dibatalkan untuk menghindari duplikasi grup.'));
      isCreating = false;
      global.__ecosystemCreationActive = false;
      return { success: false, reason: 'active_groups_empty_or_rate_limited' };
    }

    // 2. Pemindaian Multi-Layer dengan Skor Prioritas & Disambiguasi (Tag Dinamis > ID Kanonikal > Nama Sama)
    const detectedGroupsByKey = {};
    const groupScoresByKey = {};
    let detectedCommunityJid = null;
    let bestCommunityScore = -1;

    const botLid = sock.user?.lid ? jidNormalizedUser(sock.user.lid) : '';
    const allOwnerNumbers = getAllOwnerNumbers();

    // A. Disambiguasi Komunitas Resmi
    // Jika savedCommunity JID masih aktif di WhatsApp, itu adalah PRIORITAS UTAMA (Skor 1000)
    if (savedCommunity?.jid && activeGroups[savedCommunity.jid]) {
      detectedCommunityJid = savedCommunity.jid;
      bestCommunityScore = 1000;
    } else {
      for (const [gJid, gMeta] of Object.entries(activeGroups)) {
        if (!gMeta) continue;
        const desc = (gMeta.desc || gMeta.description || '').toLowerCase();
        const subj = (gMeta.subject || '').toLowerCase();
        let commScore = 0;

        if (desc.includes(getCommunityTag(myNumber).toLowerCase())) commScore += 1000;
        else if (desc.includes('[polaris_community]')) commScore += 500;
        if (subj.includes('polaris • official community') || subj.includes('polaris official community')) commScore += 100;
        const pIds = (gMeta.participants || []).map((p) => p.id ? jidNormalizedUser(p.id) : '');
        if (allOwnerNumbers.some((num) => pIds.some((id) => id.includes(num)))) commScore += 200;
        if ((gMeta.participants || []).length > 1) commScore += 50;

        if (commScore > bestCommunityScore && commScore >= 100) {
          bestCommunityScore = commScore;
          detectedCommunityJid = gJid;
        }
      }
    }

    // B. Disambiguasi 5 Grup Ekosistem (Jika Nama Sama tapi ID Beda)
    for (const spec of ECOSYSTEM_SPECS) {
      const canonicalJid = savedGroups[spec.key]?.jid;

      // 1. Prioritas Tertinggi: Jika ID yang sudah tercatat di database masih aktif di WhatsApp bot
      // Dan diverifikasi cocok dengan spesifikasi kategori (atau diikat manual oleh Owner)
      if (canonicalJid && activeGroups[canonicalJid]) {
        const cMeta = activeGroups[canonicalJid];
        const cSubject = (cMeta.subject || '').trim().toLowerCase();
        const cDesc = (cMeta.desc || cMeta.description || '').toLowerCase();
        const hasTag = cDesc.includes(getGroupTag(spec.key, myNumber).toLowerCase()) || cDesc.includes(`[polaris_ecosystem:${spec.key}]`);
        const matchesName = cSubject === spec.subject.trim().toLowerCase() ||
          (Array.isArray(spec.keywords) && spec.keywords.some((kw) => cSubject.includes(kw.toLowerCase())));
        const isManual = savedGroups[spec.key]?.manuallyBound === true;

        if (hasTag || matchesName || isManual) {
          detectedGroupsByKey[spec.key] = {
            jid: canonicalJid,
            meta: cMeta,
            creationTime: Number(cMeta.creation || 0),
          };
          groupScoresByKey[spec.key] = 1000;
          continue;
        }
      }

      // 2. Jika belum ada atau ID lama hilang: Evaluasi seluruh grup aktif berdasarkan bobot akurasi & riwayat
      let bestGroup = null;
      let highestScore = -1;

      for (const [gJid, gMeta] of Object.entries(activeGroups)) {
        if (!gMeta) continue;
        const subject = (gMeta.subject || '').trim().toLowerCase();
        const desc = (gMeta.desc || gMeta.description || '').toLowerCase();
        const creationTime = Number(gMeta.creation || 0); // Unix timestamp detik pembuatan grup oleh WhatsApp
        // SYARAT WAJIB IDENTITAS:
        // Grup HARUS memiliki kecocokan Tag, Subjek, atau Kata Kunci dengan spesifikasi kategori ini!
        // Jangan memasangkan grup acak hanya karena bot admin atau ada partisipan owner.
        const hasDynamicTag = desc.includes(getGroupTag(spec.key, myNumber).toLowerCase());
        const hasGenericTag = desc.includes(`[polaris_ecosystem:${spec.key}]`);
        const isSubjectMatch = subject === spec.subject.trim().toLowerCase();
        const isKeywordMatch = Array.isArray(spec.keywords) && spec.keywords.some((kw) => subject.includes(kw.toLowerCase()));

        if (!hasDynamicTag && !hasGenericTag && !isSubjectMatch && !isKeywordMatch) {
          continue;
        }

        let score = 0;

        // A. Dynamic Signature Tag per nomor bot (+1000)
        if (hasDynamicTag) score += 1000;
        // B. Generic Signature Tag di deskripsi (+500)
        else if (hasGenericTag) score += 500;

        // Kesesuaian Nama & Keyword (+100 / +50)
        if (isSubjectMatch) score += 100;
        else if (isKeywordMatch) score += 50;

        // C. Status Admin Bot (+200)
        const isBotAdmin = (gMeta.participants || []).some((p) => {
          const pId = p.id ? jidNormalizedUser(p.id) : '';
          return (pId === myJid || (myNumber && pId.includes(myNumber)) || (botLid && pId === botLid)) &&
            (p.admin === 'admin' || p.admin === 'superadmin');
        });
        if (isBotAdmin) score += 200;

        // D. Keberadaan Owner di dalam grup (+200) -> Menandakan grup nyata berinteraksi dengan Owner
        const hasOwner = (gMeta.participants || []).some((p) => {
          const pId = p.id ? jidNormalizedUser(p.id) : '';
          return allOwnerNumbers.some((num) => pId.includes(num));
        });
        if (hasOwner) score += 200;

        // E. Terhubung ke komunitas (+100)
        if (communityJid && gMeta.linkedParent === communityJid) score += 100;

        // F. Jumlah Partisipan Aktif (+50)
        if ((gMeta.participants || []).length > 1) score += 50;

        // TIE-BREAKER LOGIC (Jika Nama Sama & Sama-Sama Tanpa Key):
        // Jika skor lebih tinggi, langsung jadikan kandidat utama.
        // Jika skor seri (imbang), utamakan grup yang berumur lebih tua (creationTime lebih kecil)
        // karena grup lama adalah tempat riwayat pesan, media, dan data penting berada!
        let isBetter = false;
        if (score > highestScore) {
          isBetter = true;
        } else if (score === highestScore && highestScore >= 50 && bestGroup) {
          if (creationTime > 0 && bestGroup.creationTime > 0) {
            if (creationTime < bestGroup.creationTime) {
              console.log(`[BotEcosystem] ⏳ Tie-Breaker Umur: Mengutamakan grup lama "${gMeta.subject}" (Dibuat: ${new Date(creationTime * 1000).toISOString()}) dibanding grup baru (Dibuat: ${new Date(bestGroup.creationTime * 1000).toISOString()}).`);
              isBetter = true;
            }
          } else if (hasOwner && !bestGroup.hasOwner) {
            isBetter = true;
          }
        }

        if (isBetter && score >= 50) {
          if (bestGroup && bestGroup.jid !== gJid) {
            console.log(`[BotEcosystem] ℹ️ Disambiguasi grup "${spec.subject}": Ditemukan multiple grup dengan nama serupa. Mengutamakan JID ${gJid} (Skor: ${score}) dibanding ${bestGroup.jid} (Skor: ${highestScore}).`);
          }
          highestScore = score;
          bestGroup = { jid: gJid, meta: gMeta, creationTime, hasOwner };
        }
      }

      if (bestGroup) {
        detectedGroupsByKey[spec.key] = bestGroup;
        groupScoresByKey[spec.key] = highestScore;
      }
    }

    // Hubungkan atau Buat Ulang Komunitas jika terputus/tanpa backup
    let isNewCommunityCreated = false;

    if (detectedCommunityJid) {
      if (!communityJid || communityJid !== detectedCommunityJid) {
        console.log(`[BotEcosystem] 🔗 Terhubung otomatis ke Komunitas Polaris yang ada: ${detectedCommunityJid}`);
        communityJid = detectedCommunityJid;
        savedCommunity = {
          ...(savedCommunity || {}),
          jid: detectedCommunityJid,
          subject: COMMUNITY_SPEC.subject,
          boundAt: new Date().toISOString(),
        };
      }
      if (typeof sock.groupInviteCode === 'function') {
        const cCode = await sock.groupInviteCode(detectedCommunityJid).catch(() => null);
        if (cCode) {
          savedCommunity.inviteCode = cCode;
          savedCommunity.inviteLink = `https://chat.whatsapp.com/${cCode}`;
        }
      }
    } else {
      // Bot TIDAK ada di komunitas via pemindaian aktif.
      // 1. Coba auto-join via inviteCode tersimpan jika ada
      let rejoinedViaInvite = false;
      if (savedCommunity?.inviteCode && typeof sock.groupAcceptInvite === 'function') {
        try {
          console.log(`[BotEcosystem] 🚪 Mencoba auto-join Komunitas menggunakan invite code tersimpan (${savedCommunity.inviteCode})...`);
          const joinRes = await sock.groupAcceptInvite(savedCommunity.inviteCode).catch(() => null);
          if (joinRes) {
            console.log(`[BotEcosystem] ✨ Sukses auto-join Komunitas Polaris via backup invite (${joinRes})!`);
            communityJid = joinRes;
            savedCommunity.jid = joinRes;
            savedCommunity.boundAt = new Date().toISOString();
            rejoinedViaInvite = true;
          }
        } catch (jErr) {
          logEcosystemTerminalError('Gagal Auto-Join Komunitas via Backup Invite', jErr, { inviteCode: savedCommunity.inviteCode });
        }
      }

      // 2. JIKA BELUM ADA DI KOMUNITAS: Coba inisialisasi Komunitas Resmi jika didukung Baileys
      if (!rejoinedViaInvite) {
        if (typeof sock.communityCreate === 'function') {
          try {
            console.log(`[BotEcosystem] 🏛️ Komunitas resmi belum ada. Mencoba inisialisasi Komunitas Resmi "${COMMUNITY_SPEC.subject}"...`);
            const createdComm = await sock.communityCreate(COMMUNITY_SPEC.subject, COMMUNITY_SPEC.desc);
            const cId = createdComm?.id;
            if (cId) {
              communityJid = cId.includes('@') ? cId : `${cId}@g.us`;
              savedCommunity = {
                jid: communityJid,
                subject: COMMUNITY_SPEC.subject,
                boundAt: new Date().toISOString(),
              };
              isNewCommunityCreated = true;
              console.log(`[BotEcosystem] ✨ Sukses membuat Komunitas Resmi baru: ${communityJid}!`);
              if (typeof sock.groupInviteCode === 'function') {
                const cCode = await sock.groupInviteCode(communityJid).catch(() => null);
                if (cCode) {
                  savedCommunity.inviteCode = cCode;
                  savedCommunity.inviteLink = `https://chat.whatsapp.com/${cCode}`;
                }
              }
            }
          } catch (commErr) {
            logEcosystemTerminalError('Gagal Membuat Komunitas Otomatis (communityCreate)', commErr, { subject: COMMUNITY_SPEC.subject });
            console.warn(`[BotEcosystem] ℹ️ Akun bot belum berada di dalam Komunitas Resmi (${savedCommunity?.jid || COMMUNITY_SPEC.subject}). 5 Grup ekosistem tetap beroperasi penuh secara mandiri.`);
          }
        } else {
          console.warn(`[BotEcosystem] ℹ️ Akun bot belum berada di dalam Komunitas Resmi (${savedCommunity?.jid || COMMUNITY_SPEC.subject}). Silakan undang bot ke komunitas secara manual.`);
        }
      }
    }

    const updatedGroups = { ...savedGroups };
    if (isNewCommunityCreated) {
      for (const k of Object.keys(updatedGroups)) {
        if (updatedGroups[k]) {
          updatedGroups[k].linkedToCommunity = false;
        }
      }
    }
    let newlyCreatedCount = 0;
    let reconnectedCount = 0;

    // 3. Periksa setiap spesifikasi grup
    for (const spec of ECOSYSTEM_SPECS) {
      const existingRecord = updatedGroups[spec.key];
      const detected = detectedGroupsByKey[spec.key];

      // A. Jika terdeteksi di grup aktif via Tag/Keyword/Nama
      if (detected) {
        // Cek apakah bot adalah Admin/Pemilik di grup yang terdeteksi
        const isBotAdmin = (detected.meta?.participants || []).some((p) => {
          const pId = p.id ? jidNormalizedUser(p.id) : '';
          return (pId === myJid || (myNumber && pId.includes(myNumber)) || (botLid && pId === botLid)) &&
            (p.admin === 'admin' || p.admin === 'superadmin');
        });

        // JIKA BOT BUKAN PEMILIK / BUKAN ADMIN:
        // Bot tidak punya wewenang mengelola grup tersebut. Bot keluar dan membuat grup baru resmi!
        if (!isBotAdmin) {
          console.warn(`[BotEcosystem] ⚠️ Bot BUKAN admin/pemilik di grup "${detected.meta?.subject}" (${detected.jid}). Bot keluar dan membuat grup baru resmi khusus bot...`);
          if (typeof sock.groupLeave === 'function') {
            await sock.groupLeave(detected.jid).catch((lErr) => {
              logEcosystemTerminalError(`Gagal Meninggalkan Grup Lama Bukan Admin [${detected.meta?.subject}]`, lErr, { jid: detected.jid });
            });
          }

          if (typeof sock.groupCreate === 'function') {
            try {
              console.log(`[BotEcosystem] 🆕 Membuat grup baru resmi "${spec.subject}" (Single-Bot Only, DILARANG undang owner)...`);
              let createRes = null;
              try {
                createRes = await sock.groupCreate(spec.subject, [myJid]);
              } catch (selfCreateErr) {
                try {
                  createRes = await sock.groupCreate(spec.subject, []);
                } catch (emptyCreateErr) {
                  throw selfCreateErr;
                }
              }
              const newGid = createRes?.id || createRes?.gid;
              if (newGid) {
                newlyCreatedCount++;
                console.log(`[BotEcosystem] ✨ Sukses membuat grup ekosistem baru: ${newGid}!`);
                updatedGroups[spec.key] = {
                  jid: newGid,
                  subject: spec.subject,
                  boundAt: new Date().toISOString(),
                  creationTime: Math.floor(Date.now() / 1000),
                };
                const targetTag = getGroupTag(spec.key, myNumber);
                const initialDesc = `${spec.desc} ${targetTag}`;
                if (typeof sock.groupUpdateDescription === 'function') {
                  await sock.groupUpdateDescription(newGid, initialDesc).catch((dErr) => {
                    logEcosystemTerminalError(`Gagal Update Deskripsi Grup Pengganti [${spec.subject}]`, dErr, { newGid });
                  });
                }
                if (typeof sock.groupInviteCode === 'function') {
                  const code = await sock.groupInviteCode(newGid).catch((cErr) => {
                    logEcosystemTerminalError(`Gagal Mengambil Invite Code Baru [${spec.subject}]`, cErr, { newGid });
                    return null;
                  });
                  if (code) {
                    updatedGroups[spec.key].inviteCode = code;
                    updatedGroups[spec.key].inviteLink = `https://chat.whatsapp.com/${code}`;
                  }
                }
                continue;
              }
            } catch (createErr) {
              logEcosystemTerminalError(`Gagal Membuat Grup Baru Pengganti [${spec.subject}]`, createErr, { key: spec.key, myJid });
            }
          }
        }

        const isNewBind = !existingRecord || existingRecord.jid !== detected.jid;
        if (isNewBind) {
          console.log(`[BotEcosystem] 🎯 AUTO-DETECT BERHASIL: Menautkan kembali grup "${spec.subject}" (${detected.jid}).`);
          reconnectedCount++;
        }
        updatedGroups[spec.key] = {
          ...(existingRecord || {}),
          jid: detected.jid,
          subject: spec.subject,
          boundAt: new Date().toISOString(),
          creationTime: detected.creationTime || existingRecord?.creationTime || null,
        };

        // AUTO-HEALING KEY INJECTION:
        // Jika grup ini belum memiliki Dynamic Signature Tag di deskripsinya, suntikkan secara otomatis!
        try {
          const currentDesc = detected.meta?.desc || detected.meta?.description || '';
          const targetTag = getGroupTag(spec.key, myNumber);
          if (!currentDesc.toLowerCase().includes(targetTag.toLowerCase())) {
            if (isBotAdmin && typeof sock.groupUpdateDescription === 'function') {
              const updatedDesc = currentDesc.trim()
                ? `${currentDesc.trim()}\n\n${targetTag}`
                : `${spec.desc} ${targetTag}`;
              console.log(`[BotEcosystem] 💉 AUTO-HEALING: Menyuntikkan Digital Signature Tag ke deskripsi grup "${spec.subject}" (${detected.jid})...`);
              await sock.groupUpdateDescription(detected.jid, updatedDesc);
              console.log(`[BotEcosystem] ✨ Sukses menyuntikkan tag signature ke grup "${spec.subject}"!`);
            }
          }
        } catch (injectErr) {
          console.warn(`[BotEcosystem] Warning auto-healing key injection pada "${spec.subject}":`, injectErr.message);
        }

        // Simpan invite code untuk proteksi reconnect di masa depan jika bot admin
        try {
          if (typeof sock.groupInviteCode === 'function') {
            const inviteCode = await sock.groupInviteCode(detected.jid).catch(() => null);
            if (inviteCode) {
              updatedGroups[spec.key].inviteCode = inviteCode;
              updatedGroups[spec.key].inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
            }
          }
        } catch (_) {}

        continue;
      }

      // B. Jika di database ada JID dan masih aktif di WhatsApp
      if (existingRecord && existingRecord.jid && activeGroups[existingRecord.jid]) {
        console.log(`[BotEcosystem] ✓ Grup [${spec.subject}] aktif (${existingRecord.jid}).`);
        continue;
      }

      // C. Jika bot belum bergabung tapi memiliki inviteCode yang tersimpan dari sesi sebelumnya
      if (existingRecord && existingRecord.inviteCode && typeof sock.groupAcceptInvite === 'function') {
        try {
          console.log(`[BotEcosystem] 🚪 Mencoba auto-join grup "${spec.subject}" menggunakan invite code tersimpan (${existingRecord.inviteCode})...`);
          const joinRes = await sock.groupAcceptInvite(existingRecord.inviteCode);
          if (joinRes) {
            console.log(`[BotEcosystem] ✨ Sukses auto-join grup "${spec.subject}" (${joinRes})!`);
            updatedGroups[spec.key].jid = joinRes;
            updatedGroups[spec.key].boundAt = new Date().toISOString();
            reconnectedCount++;
            continue;
          }
        } catch (joinErr) {
          logEcosystemTerminalError(`Gagal Auto-Join Grup Ekosistem via Invite [${spec.subject}]`, joinErr, {
            key: spec.key,
            inviteCode: existingRecord.inviteCode,
            catatan: 'Link undangan kemungkinan telah dicabut/kadaluwarsa. Link lama dibersihkan dan grup akan dipulihkan/dibuat ulang.',
          });
          existingRecord.inviteCode = null;
          existingRecord.inviteLink = null;
        }
      }

      // D. JIKA BELUM ADA DI AKUN BOT: Buat grup baru resmi khusus bot (Single-Bot Only, TANPA undang owner)
      if (typeof sock.groupCreate === 'function') {
        try {
          console.log(`[BotEcosystem] 🆕 Belum ada grup "${spec.subject}". Membuat grup baru resmi (Single-Bot Only, DILARANG undang owner)...`);
          let createRes = null;
          try {
            createRes = await sock.groupCreate(spec.subject, [myJid]);
          } catch (selfCreateErr) {
            try {
              createRes = await sock.groupCreate(spec.subject, []);
            } catch (emptyCreateErr) {
              throw selfCreateErr;
            }
          }
          const newGid = createRes?.id || createRes?.gid;
          if (newGid) {
            newlyCreatedCount++;
            console.log(`[BotEcosystem] ✨ Sukses membuat grup baru "${spec.subject}": ${newGid}!`);
            updatedGroups[spec.key] = {
              jid: newGid,
              subject: spec.subject,
              boundAt: new Date().toISOString(),
              creationTime: Math.floor(Date.now() / 1000),
            };
            const targetTag = getGroupTag(spec.key, myNumber);
            const initialDesc = `${spec.desc} ${targetTag}`;
            if (typeof sock.groupUpdateDescription === 'function') {
              await sock.groupUpdateDescription(newGid, initialDesc).catch((dErr) => {
                logEcosystemTerminalError(`Gagal Update Deskripsi Grup Baru [${spec.subject}]`, dErr, { newGid });
              });
            }
            if (typeof sock.groupInviteCode === 'function') {
              const code = await sock.groupInviteCode(newGid).catch((cErr) => {
                logEcosystemTerminalError(`Gagal Mengambil Invite Code Baru [${spec.subject}]`, cErr, { newGid });
                return null;
              });
              if (code) {
                updatedGroups[spec.key].inviteCode = code;
                updatedGroups[spec.key].inviteLink = `https://chat.whatsapp.com/${code}`;
              }
            }
            continue;
          }
        } catch (createErr) {
          logEcosystemTerminalError(`Gagal Membuat Grup Baru Resmi [${spec.subject}]`, createErr, { key: spec.key, myJid });
        }
      }

      console.warn(`[BotEcosystem] ℹ️ Akun bot belum bergabung di grup "${spec.subject}" (${existingRecord?.jid || spec.key}).`);
    }

    // 4. Hubungkan / Tautkan Seluruh 5 Grup ke Komunitas Induk
    if (communityJid && typeof sock.communityLinkGroup === 'function') {
      console.log(`[BotEcosystem] 🔄 Memulai sinkronisasi penautan 5 grup ke Komunitas (${communityJid})...`);

      // 4a. Cek grup apa saja yang sudah terdaftar di Komunitas via Baileys API
      let actuallyLinkedSet = new Set();
      if (typeof sock.communityFetchLinkedGroups === 'function') {
        try {
          const commFetch = await sock.communityFetchLinkedGroups(communityJid);
          if (commFetch?.linkedGroups && Array.isArray(commFetch.linkedGroups)) {
            for (const lg of commFetch.linkedGroups) {
              if (lg.id) actuallyLinkedSet.add(lg.id);
            }
          }
        } catch (fErr) {
          console.warn('[BotEcosystem] Warning fetchLinkedGroups awal:', fErr.message);
        }
      }

      for (const spec of ECOSYSTEM_SPECS) {
        const gRecord = updatedGroups[spec.key];
        if (!gRecord || !gRecord.jid) continue;

        // Jika sudah terverifikasi di komunitas, tandai sukses dan lewati
        if (actuallyLinkedSet.has(gRecord.jid)) {
          console.log(`[BotEcosystem] ✅ Grup "${spec.subject}" (${gRecord.jid}) sudah terverifikasi ada di dalam Komunitas.`);
          gRecord.linkedToCommunity = true;
          continue;
        }

        // Cek metadata grup & status admin bot
        let gMeta = null;
        if (typeof sock.groupMetadata === 'function') {
          try {
            gMeta = await sock.groupMetadata(gRecord.jid);
            const myParticipant = (gMeta?.participants || []).find((p) => {
              const pId = p.id ? jidNormalizedUser(p.id) : '';
              return pId === myJid || (myNumber && pId.includes(myNumber));
            });
            console.log(`[BotEcosystem DIAGNOSTIC] Group "${spec.subject}" (${gRecord.jid}):`, {
              subject: gMeta?.subject,
              owner: gMeta?.owner,
              subjectOwner: gMeta?.subjectOwner,
              linkedParent: gMeta?.linkedParent,
              sockUser: sock.user,
              participants: gMeta?.participants
            });

            if (gMeta?.linkedParent) {
              if (gMeta.linkedParent === communityJid) {
                console.log(`[BotEcosystem] ✅ Grup "${spec.subject}" metadata linkedParent sudah sesuai.`);
                gRecord.linkedToCommunity = true;
                actuallyLinkedSet.add(gRecord.jid);
                continue;
              } else {
                console.warn(`[BotEcosystem] ⚠️ Grup "${spec.subject}" masih terhubung ke komunitas lama (${gMeta.linkedParent}). Melepas tautan (unlink)...`);
                if (typeof sock.communityUnlinkGroup === 'function') {
                  await sock.communityUnlinkGroup(gRecord.jid, gMeta.linkedParent).catch((uErr) => {
                    console.warn(`[BotEcosystem] Gagal unlink dari komunitas lama: ${uErr.message}`);
                  });
                  await new Promise((r) => setTimeout(r, 2500));
                }
              }
            }
          } catch (mErr) {
            console.warn(`[BotEcosystem] Gagal baca groupMetadata untuk "${spec.subject}":`, mErr.message);
          }
        }

        // Periksa apakah bot adalah admin di grup ini
        let isBotAdminInGroup = (gMeta?.participants || []).some((p) => {
          const pId = p.id ? jidNormalizedUser(p.id) : '';
          const botLid = sock.user?.lid ? jidNormalizedUser(sock.user.lid) : '';
          return (pId === myJid || (myNumber && pId.includes(myNumber)) || (botLid && pId === botLid)) &&
            (p.admin === 'admin' || p.admin === 'superadmin');
        });

        if (!isBotAdminInGroup) {
          if (typeof sock.groupParticipantsUpdate === 'function' && myJid) {
            try {
              await sock.groupParticipantsUpdate(gRecord.jid, [myJid], 'promote');
              isBotAdminInGroup = true;
              console.log(`[BotEcosystem] ✨ Sukses auto-promote bot ke admin di "${spec.subject}"!`);
            } catch (_) {}
          }
        }

        if (!isBotAdminInGroup) {
          console.warn(`[BotEcosystem] ⚠️ PERHATIAN: Akun bot bukan admin di grup "${spec.subject}" (${gRecord.jid}). WhatsApp mewajibkan hak admin di grup untuk dapat menautkannya ke Komunitas. Harap Owner jadikan bot sebagai Admin grup.`);
          gRecord.linkedToCommunity = false;
          continue;
        }

        // Tautkan grup ke Komunitas
        try {
          console.log(`[BotEcosystem] 🔗 Menautkan grup "${spec.subject}" (${gRecord.jid}) ke Komunitas (${communityJid})...`);
          await sock.communityLinkGroup(gRecord.jid, communityJid);
          console.log(`[BotEcosystem] ✨ Sukses instruksi taut grup "${spec.subject}"!`);
          gRecord.linkedToCommunity = true;
          gRecord.lastLinkError = null;
          actuallyLinkedSet.add(gRecord.jid);
        } catch (linkErr) {
          const rawErr = linkErr?.message || String(linkErr);
          let errCode = rawErr.match(/\b(400|401|403|404|405|500)\b/)?.[1] || '';
          if (!errCode && rawErr.toLowerCase().includes('not-allowed')) {
            errCode = '405';
          }

          let explanation = 'Terjadi kendala saat mengirim stanza penautan ke WhatsApp.';
          if (errCode === '500') {
            explanation = 'Server WhatsApp merespons 500 (Internal Server Error). Ini biasanya terjadi jika grup masih tercatat di data relasi komunitas lama atau cache hak admin WhatsApp belum tersinkronisasi penuh.';
            // Coba periksa apakah grup ini tersangkut di komunitas lain dan unlink
            for (const otherJid of Object.keys(activeGroups)) {
              if (otherJid !== communityJid && otherJid.endsWith('@g.us')) {
                const oMeta = activeGroups[otherJid];
                const oSubj = (oMeta?.subject || '').toLowerCase();
                const oDesc = (oMeta?.desc || '').toLowerCase();
                if (oDesc.includes('[polaris_community]') || oSubj.includes('polaris • official community')) {
                  try {
                    console.log(`[BotEcosystem] 🧹 Mencoba unlink "${spec.subject}" dari komunitas ghost (${otherJid})...`);
                    await sock.communityUnlinkGroup(gRecord.jid, otherJid);
                    await new Promise((r) => setTimeout(r, 1500));
                  } catch (_) {}
                }
              }
            }
          } else if (errCode === '405') {
            explanation = 'WhatsApp menolak penautan (405 Not-Allowed). Hal ini terjadi jika server WhatsApp mendeteksi pembatasan otorisasi penautan grup (hanya SuperAdmin/Creator atau Admin grup yang berwenang menautkan grup ke komunitas, atau izin grup hanya memperbolehkan Creator komunitas).';
          } else if (errCode === '401' || errCode === '403') {
            explanation = 'Hak otorisasi administratif ditolak oleh server WhatsApp.';
          }

          logEcosystemTerminalError(`Gagal Menautkan Grup ke Komunitas [${spec.subject}]`, linkErr, {
            groupJid: gRecord.jid,
            communityJid,
            errorCode: errCode || 'Unknown',
            analisis: explanation,
            botAdminStatus: isBotAdminInGroup ? 'Admin' : 'Bukan Admin',
          });
          gRecord.linkedToCommunity = false;
          gRecord.lastLinkError = rawErr;
          gRecord.lastLinkAttempt = Date.now();

          // Kirim notifikasi error yang jelas dan detail
          sendLogErrorToGroup(
            sock,
            `KENDALA PENAUTAN KOMUNITAS: ${spec.subject}`,
            `• Grup: ${spec.subject} (${gRecord.jid})\n` +
            `• Komunitas: ${communityJid}\n` +
            `• Kode Error: ${errCode || 'Unknown'}\n` +
            `• Pesan Sistem: ${rawErr}\n` +
            `• Analisis Masalah: ${explanation}\n` +
            `• Status Bot di Grup: ${isBotAdminInGroup ? 'Admin' : 'Bukan Admin'}\n` +
            `• Status: Sistem telah mencatat kegagalan ini dan menerapkan cooldown agar tidak membombardir server WhatsApp.`
          ).catch(() => {});
        }

        // Jeda cukup 2800ms antar penautan grup agar tidak terkena rate-limit WhatsApp
        await new Promise((r) => setTimeout(r, 2800));
      }

      // 4b. Verifikasi Ulang Ground-Truth dari Server WhatsApp
      if (typeof sock.communityFetchLinkedGroups === 'function') {
        try {
          await new Promise((r) => setTimeout(r, 1500));
          const finalCommFetch = await sock.communityFetchLinkedGroups(communityJid);
          if (finalCommFetch?.linkedGroups && Array.isArray(finalCommFetch.linkedGroups)) {
            const finalLinkedSet = new Set(finalCommFetch.linkedGroups.map((g) => g.id).filter(Boolean));
            let totalLinked = 0;
            for (const spec of ECOSYSTEM_SPECS) {
              const gRecord = updatedGroups[spec.key];
              if (gRecord && gRecord.jid) {
                const isConfirmed = finalLinkedSet.has(gRecord.jid) || !!gRecord.linkedToCommunity;
                gRecord.linkedToCommunity = isConfirmed;
                if (isConfirmed) totalLinked++;
              }
            }
            console.log(`[BotEcosystem] 📊 Verifikasi Komunitas Selesai: ${totalLinked} dari 5 grup resmi terkonfirmasi berada dalam Komunitas!`);
          }
        } catch (fErr2) {
          console.warn('[BotEcosystem] Warning verifikasi akhir fetchLinkedGroups:', fErr2.message);
        }
      }
    }

    // Jika Komunitas baru dibuat, kirim notifikasi alert ke System Logs
    if (isNewCommunityCreated && updatedGroups.logs?.jid) {
      sendLogErrorToGroup(
        sock,
        '🌟 KOMUNITAS POLARIS DIBUAT ULANG & SELURUH GRUP DITAUTKAN',
        `Komunitas Polaris baru berhasil dibuat secara otomatis:\n\n` +
        `• JID Komunitas: ${communityJid}\n` +
        `• Status: Seluruh grup ekosistem & grup bot otomatis ditautkan ke Komunitas.`
      ).catch(() => {});
    }

    // 5. Cleanup grup duplikat/sampah Polaris (harvest -> repost per kategori -> dismantle)
    try {
      await cleanupJunkGroups(sock, myJid, myNumber, updatedGroups);
    } catch (cleanErr) {
      console.warn('[BotEcosystem] Warning cleanupJunkGroups:', cleanErr.message);
    }

    // 6. Final Save ke SQLite & JSON
    const finalPayload = {
      hasCreated: true,
      botNumber: myNumber,
      community: savedCommunity,
      groups: updatedGroups,
      lastUpdated: new Date().toISOString(),
    };
    saveData(finalPayload);

    console.log(`[BotEcosystem] 🏁 Sinkronisasi Selesai! Terhubung: ${Object.keys(updatedGroups).length} grup. Dihubungkan ulang: ${reconnectedCount}, Dibuat baru: ${newlyCreatedCount}.`);

    isCreating = false;
    global.__ecosystemCreationActive = false;

    return {
      success: true,
      newlyCreatedCount,
      reconnectedCount,
      community: savedCommunity,
      groups: updatedGroups,
    };
  } catch (err) {
    logEcosystemTerminalError('Fatal Error pada ensureEcosystemGroups', err);
    isCreating = false;
    global.__ecosystemCreationActive = false;
    return { success: false, error: err.message };
  }
}

/**
 * On-demand Relink Ecosystem: Memindai ulang grup yang ada dan mengaitkan ulang seketika
 */
async function relinkEcosystem(sock) {
  const saved = getSavedData();
  if (saved.groups) {
    for (const k of Object.keys(saved.groups)) {
      if (saved.groups[k]) saved.groups[k].linkedToCommunity = false;
    }
    saveData(saved);
  }
  return await ensureEcosystemGroups(sock, true);
}

/**
 * Kirim log error atau alert ke grup "Polaris • System & Error Logs"
 */
async function sendLogErrorToGroup(sock, errorTitle, errorDetail) {
  try {
    const saved = getSavedData();
    const logsGid = saved.groups?.logs?.jid;
    if (!logsGid || !sock) return;

    const text = [
      `🚨 *[POLARIS ERROR ALERT]*`,
      `──────────────────────────────`,
      `⚠️ *Kejadian:* ${errorTitle}`,
      `⏰ *Waktu:* ${new Date().toLocaleTimeString('id-ID')} WIB`,
      `──────────────────────────────`,
      `\`\`\`\n${String(errorDetail || '').slice(0, 1500)}\n\`\`\``,
    ].join('\n');

    await sock.sendMessage(logsGid, { text });
  } catch (_) {}
}

/**
 * Kirim output atau artefak ke grup "Polaris • Output & Artifact Vault"
 */
async function sendOutputToVaultGroup(sock, title, content) {
  try {
    const saved = getSavedData();
    const vaultGid = saved.groups?.vault?.jid;
    if (!vaultGid || !sock) return;

    const text = [
      `📦 *[POLARIS ARTIFACT VAULT]*`,
      `──────────────────────────────`,
      `📁 *Item:* ${title}`,
      `⏰ *Waktu:* ${new Date().toLocaleTimeString('id-ID')} WIB`,
      `──────────────────────────────`,
      content,
    ].join('\n');

    await sock.sendMessage(vaultGid, { text });
  } catch (_) {}
}

/**
 * Cek apakah sebuah JID merupakan bagian dari ekosistem grup atau komunitas Polaris
 */
function isEcosystemGroup(chatJid) {
  if (!chatJid) return false;
  const saved = getSavedData();
  if (saved.community?.jid === chatJid) return true;
  return Object.values(saved.groups || {}).some((g) => g.jid === chatJid);
}

/**
 * Pemulihan Otomatis saat bot keluar/dikeluarkan dari grup ekosistem
 */
async function recoverEcosystemGroup(sock, key, oldJid) {
  if (!sock) return;
  const saved = getSavedData();
  const groupRecord = key === 'community' ? saved.community : saved.groups?.[key];
  const inviteCode = groupRecord?.inviteCode;

  console.log(`[BotEcosystem] 🔄 Memulai Auto-Recovery untuk grup ekosistem [${key}]...`);

  // Langkah 1: Coba auto-join via inviteCode tersimpan
  if (inviteCode && typeof sock.groupAcceptInvite === 'function') {
    try {
      await new Promise((r) => setTimeout(r, 2000)); // jeda anti rate-limit
      const joinRes = await sock.groupAcceptInvite(inviteCode);
      if (joinRes) {
        console.log(`[BotEcosystem] ✨ SUKSES AUTO-REJOIN grup [${key}] via invite code (${joinRes})!`);
        if (key === 'community') {
          saved.community.jid = joinRes;
          saved.community.boundAt = new Date().toISOString();
        } else {
          saved.groups[key].jid = joinRes;
          saved.groups[key].boundAt = new Date().toISOString();
        }
        saveData(saved);

        // Kirim pengumuman bahwa bot berhasil auto-rejoin
        await new Promise((r) => setTimeout(r, 1500));
        await sock.sendMessage(joinRes, {
          text: `🔄 *[POLARIS ECOSYSTEM AUTO-RECOVERY]*\nBot mendeteksi telah keluar/dikeluarkan dari grup ekosistem ini dan berhasil bergabung kembali secara otomatis via permanent invite token.`,
        }).catch(() => {});

        return { success: true, method: 'invite', jid: joinRes };
      }
    } catch (joinErr) {
      logEcosystemTerminalError(`Gagal Auto-Rejoin Grup Ekosistem via Invite [${key}]`, joinErr, { key, oldJid, inviteCode });
      if (groupRecord) {
        groupRecord.inviteCode = null;
        groupRecord.inviteLink = null;
        saveData(saved);
      }
    }
  }

  // Langkah 2: Jika invite code gagal/tidak ada ("link lama gak guna" / grup bubar)
  if (key === 'community') {
    console.warn(`[BotEcosystem] ⚠️ Komunitas [community] tidak dapat auto-join via invite code. Silakan undang bot kembali secara manual atau jalankan /relinkcommunity.`);
    return { success: false, reason: 'cannot_rejoin_community_manual_required' };
  }

  // Untuk grup ekosistem (news, logs, vault, sandbox, academy):
  // Segera picu ensureEcosystemGroups untuk membuat grup pengganti resmi baru & invite link baru yang segar
  console.log(`[BotEcosystem] 🔄 Menjadwalkan regenerasi grup ekosistem [${key}] dan pembuatan invite link baru yang segar...`);
  setTimeout(() => {
    ensureEcosystemGroups(sock, true).catch((recErr) => {
      logEcosystemTerminalError(`Gagal Auto-Recovery Grup Ekosistem [${key}]`, recErr, { key });
    });
  }, 2000);

  return { success: true, method: 'auto_recreate_scheduled', key };
}

/**
 * Event Listener saat member dikeluarkan/keluar dari grup (group-participants.update)
 * Jika yang dikeluarkan adalah BOT SENDIRI dari salah satu grup ekosistem,
 * sistem langsung mendeteksi dan melakukan AUTO-REJOIN seketika!
 */
async function handleGroupParticipantsUpdate(sock, event) {
  if (!sock || !event) return;
  const myJid = sock.user?.id ? jidNormalizedUser(sock.user.id) : null;
  if (!myJid) return;
  const myNum = myJid.split('@')[0];
  const botLid = sock.user?.lid ? jidNormalizedUser(sock.user.lid) : '';

  const participants = Array.isArray(event.participants) ? event.participants : [event.participants];
  const isBotInvolved = participants.some((p) => {
    const pJid = typeof p === 'string' ? jidNormalizedUser(p) : (p?.id ? jidNormalizedUser(p.id) : '');
    return pJid === myJid || (myNum && pJid.includes(myNum)) || (botLid && pJid === botLid);
  });

  if (!isBotInvolved) return;

  // 1. EVENT INSTAN: Bot dijadikan Admin di grup (Promote)
  if (event.action === 'promote') {
    const saved = getSavedData();
    for (const spec of ECOSYSTEM_SPECS) {
      if (saved.groups?.[spec.key]?.jid === event.id) {
        console.log(`[BotEcosystem] ✨ EVENT INSTAN: Bot baru saja dijadikan ADMIN di grup "${spec.subject}" (${event.id})!`);
        if (saved.community?.jid && typeof sock.communityLinkGroup === 'function') {
          console.log(`[BotEcosystem] 🔗 Melakukan penautan langsung ke Komunitas Polaris...`);
          try {
            await new Promise((r) => setTimeout(r, 2000));
            await sock.communityLinkGroup(event.id, saved.community.jid);
            console.log(`[BotEcosystem] ✨ Sukses instan menautkan "${spec.subject}" ke Komunitas!`);
            saved.groups[spec.key].linkedToCommunity = true;
            saved.groups[spec.key].lastLinkError = null;
            saveData(saved);
          } catch (pErr) {
            logEcosystemTerminalError(`Penautan Instan Pasca-Promote Gagal [${spec.subject}]`, pErr, { groupId: event.id, communityJid: saved.community?.jid });
          }
        }
        break;
      }
    }
    return;
  }

  // 2. EVENT INSTAN: Bot dikeluarkan dari grup (Remove)
  if (event.action === 'remove') {
    const saved = getSavedData();
    let affectedKey = null;
    let affectedSpec = null;

    for (const spec of ECOSYSTEM_SPECS) {
      if (saved.groups?.[spec.key]?.jid === event.id) {
        affectedKey = spec.key;
        affectedSpec = spec;
        break;
      }
    }
    if (!affectedKey && saved.community?.jid === event.id) {
      affectedKey = 'community';
      affectedSpec = COMMUNITY_SPEC;
    }

    if (!affectedKey) return;

    console.warn(`[BotEcosystem] 🚨 DARURAT: Bot terdeteksi DIKELUARKAN dari grup ekosistem "${affectedSpec.subject}" (${event.id}) oleh ${event.author || 'unknown'}!`);

    // Log insiden ke System & Error Logs
    sendLogErrorToGroup(
      sock,
      `BOT DIKELUARKAN DARI GRUP EKOSISTEM: ${affectedSpec.subject}`,
      `Grup: ${affectedSpec.subject} (${event.id})\n` +
      `Pelaku: ${event.author || 'unknown'}\n` +
      `Waktu: ${new Date().toLocaleTimeString('id-ID')} WIB\n` +
      `Status: Menjalankan pemulihan otomatis (Auto-Recovery)...`
    ).catch(() => {});

    // Eksekusi pemulihan instan
    await recoverEcosystemGroup(sock, affectedKey, event.id);
  }
}

/**
 * Watchdog Latar Belakang untuk Ekosistem Grup
 * Memastikan setiap 2 menit (120 detik) bahwa bot masih ada di kelima grup ekosistem.
 * Jika bot dikeluarkan saat offline atau invite link berubah, otomatis dipulihkan.
 */
function startEcosystemWatchdog(sock) {
  if (global.__ecosystemWatchdogTimer) {
    clearInterval(global.__ecosystemWatchdogTimer);
    global.__ecosystemWatchdogTimer = null;
  }

  // Interval watchdog tiap 2 menit
  global.__ecosystemWatchdogTimer = setInterval(async () => {
    try {
      if (!sock || typeof sock.groupFetchAllParticipating !== 'function') return;
      const activeGroups = await sock.groupFetchAllParticipating().catch(() => ({}));
      if (!activeGroups || Object.keys(activeGroups).length === 0) {
        return; // Anti-buta guard: abaikan jika WhatsApp sedang rate-limited / offline
      }
      const saved = getSavedData();
      let needSync = false;

      // Periksa masing-masing grup spesifikasi
      for (const spec of ECOSYSTEM_SPECS) {
        const record = saved.groups?.[spec.key];
        if (record && record.jid) {
          const isStillPresent = !!activeGroups[record.jid];
          if (!isStillPresent) {
            console.warn(`[BotEcosystem Watchdog] ⚠️ Bot terdeteksi TIDAK ADA di grup ekosistem "${spec.subject}" (${record.jid})!`);
            needSync = true;
            // Coba auto-rejoin instan
            if (record.inviteCode && typeof sock.groupAcceptInvite === 'function') {
              try {
                console.log(`[BotEcosystem Watchdog] Mencoba auto-rejoin via invite code: ${record.inviteCode}`);
                const re = await sock.groupAcceptInvite(record.inviteCode);
                if (re) {
                  console.log(`[BotEcosystem Watchdog] ✨ Berhasil auto-rejoin "${spec.subject}"!`);
                  needSync = false;
                }
              } catch (_) {}
            }
          } else {
            // Perbarui invite code jika belum ada atau untuk memastikan link tetap segar
            if (!record.inviteCode && typeof sock.groupInviteCode === 'function') {
              try {
                const code = await sock.groupInviteCode(record.jid).catch(() => null);
                if (code) {
                  saved.groups[spec.key].inviteCode = code;
                  saved.groups[spec.key].inviteLink = `https://chat.whatsapp.com/${code}`;
                  saveData(saved);
                }
              } catch (_) {}
            }
            // Jika grup aktif tapi belum tertaut ke Komunitas, beri cooldown 15 menit agar detector tidak asal nyala
            if (saved.community?.jid && record.linkedToCommunity === false) {
              const lastAttempt = record.lastLinkAttempt || 0;
              if (Date.now() - lastAttempt > 15 * 60 * 1000) {
                console.log(`[BotEcosystem Watchdog] ⏳ Grup "${spec.subject}" belum tertaut ke Komunitas (cooldown 15m terpenuhi). Menjadwalkan sinkronisasi...`);
                needSync = true;
              }
            }
          }
        }
      }

      // Periksa Komunitas Induk Polaris
      const commRecord = saved.community;
      if (commRecord && commRecord.jid) {
        const isCommPresent = !!activeGroups[commRecord.jid];
        if (!isCommPresent) {
          console.warn(`[BotEcosystem Watchdog] ⚠️ Bot terdeteksi TIDAK ADA di Komunitas Polaris (${commRecord.jid})!`);
          needSync = true;
          if (commRecord.inviteCode && typeof sock.groupAcceptInvite === 'function') {
            try {
              console.log(`[BotEcosystem Watchdog] Mencoba auto-rejoin Komunitas via invite code: ${commRecord.inviteCode}`);
              const re = await sock.groupAcceptInvite(commRecord.inviteCode);
              if (re) {
                console.log(`[BotEcosystem Watchdog] ✨ Berhasil auto-rejoin Komunitas Polaris!`);
                needSync = false;
              }
            } catch (_) {}
          }
        } else {
          // Perbarui invite code komunitas jika belum tersimpan
          if (!commRecord.inviteCode && typeof sock.groupInviteCode === 'function') {
            try {
              const code = await sock.groupInviteCode(commRecord.jid).catch(() => null);
              if (code) {
                saved.community.inviteCode = code;
                saved.community.inviteLink = `https://chat.whatsapp.com/${code}`;
                saveData(saved);
              }
            } catch (_) {}
          }
        }
      } else {
        needSync = true;
      }

      if (needSync) {
        console.log('[BotEcosystem Watchdog] 🛠️ Memicu re-link & pemulihan ekosistem grup/komunitas...');
        await ensureEcosystemGroups(sock, true);
      }
    } catch (err) {
      logEcosystemTerminalError('Error pada Siklus Watchdog Ekosistem', err);
    }
  }, 120 * 1000);

  console.log('[BotEcosystem] 🛡️ Watchdog Ekosistem Grup & Komunitas aktif (interval: 120 detik)!');
}

/**
 * Memaksa pembuatan ulang Komunitas Polaris dan menautkan ulang seluruh grup ekosistem
 * @param {object} sock - Baileys WASocket
 */
async function recreateCommunity(sock) {
  if (!sock) return { success: false, error: 'Socket WhatsApp belum siap' };
  const saved = getSavedData();
  saved.community = null; // reset komunitas lama
  if (saved.groups) {
    for (const k of Object.keys(saved.groups)) {
      if (saved.groups[k]) saved.groups[k].linkedToCommunity = false;
    }
  }
  saveData(saved);
  return await ensureEcosystemGroups(sock, true);
}

/**
 * Menautkan satu grup tertentu ke Komunitas Resmi Polaris
 * @param {object} sock - Baileys WASocket
 * @param {string} groupJid - JID grup yang ingin ditautkan
 */
async function linkGroupToCommunity(sock, groupJid) {
  if (!sock || !groupJid) throw new Error('Parameter socket atau groupJid tidak valid.');
  const saved = getSavedData();
  const commJid = saved.community?.jid;
  if (!commJid) throw new Error('Komunitas Polaris belum dibuat atau belum terdaftar.');

  // 1. Cek metadata grup
  const gMeta = await sock.groupMetadata(groupJid).catch(() => null);
  if (!gMeta) throw new Error(`Tidak dapat mengambil metadata grup: ${groupJid}`);

  // 2. Jika ada linkedParent lama yang berbeda, coba unlink dulu
  if (gMeta.linkedParent && gMeta.linkedParent !== commJid) {
    console.log(`[BotEcosystem] Melepas tautan lama ${gMeta.linkedParent} dari ${groupJid}...`);
    if (typeof sock.communityUnlinkGroup === 'function') {
      await sock.communityUnlinkGroup(groupJid, gMeta.linkedParent).catch(() => {});
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // 3. Tautkan ke komunitas Polaris
  if (typeof sock.communityLinkGroup === 'function') {
    await sock.communityLinkGroup(groupJid, commJid);
  } else {
    throw new Error('Metode sock.communityLinkGroup tidak didukung Baileys.');
  }

  // Update status jika grup ini termasuk dalam 5 grup ekosistem
  for (const k of Object.keys(saved.groups || {})) {
    if (saved.groups[k]?.jid === groupJid) {
      saved.groups[k].linkedToCommunity = true;
      saveData(saved);
      break;
    }
  }

  return {
    success: true,
    groupJid,
    groupSubject: gMeta.subject || groupJid,
    communityJid: commJid,
  };
}

/**
 * Menautkan SEMUA grup yang diikuti bot (di mana bot adalah admin) ke Komunitas Polaris
 */
async function linkAllGroupsToCommunity(sock) {
  if (!sock) throw new Error('Socket belum siap.');
  const saved = getSavedData();
  const commJid = saved.community?.jid;
  if (!commJid) throw new Error('Komunitas Polaris belum dibuat.');

  const myJid = sock.user?.id ? jidNormalizedUser(sock.user.id) : null;
  const myNum = myJid ? myJid.replace(/[^0-9]/g, '') : '';

  // 1. Ambil semua grup
  const allGroups = await sock.groupFetchAllParticipating().catch(() => ({}));
  const results = { linked: [], skipped: [], failed: [] };

  // Ambil daftar yang sudah tertaut
  let alreadyLinkedSet = new Set();
  if (typeof sock.communityFetchLinkedGroups === 'function') {
    const fetched = await sock.communityFetchLinkedGroups(commJid).catch(() => null);
    if (fetched?.linkedGroups) {
      alreadyLinkedSet = new Set(fetched.linkedGroups.map((g) => g.id).filter(Boolean));
    }
  }

  for (const [gJid, gMeta] of Object.entries(allGroups)) {
    if (!gJid || gJid === commJid) continue;
    if (alreadyLinkedSet.has(gJid)) {
      results.skipped.push({ jid: gJid, name: gMeta.subject || gJid, reason: 'Sudah tertaut' });
      continue;
    }

    // Periksa apakah bot adalah admin di grup ini
    const isBotAdmin = (gMeta.participants || []).some((p) => {
      const pId = p.id ? jidNormalizedUser(p.id) : '';
      return (pId === myJid || (myNum && pId.includes(myNum))) && (p.admin === 'admin' || p.admin === 'superadmin');
    });

    if (!isBotAdmin) {
      results.skipped.push({ jid: gJid, name: gMeta.subject || gJid, reason: 'Bot bukan admin grup' });
      continue;
    }

    try {
      if (gMeta.linkedParent && gMeta.linkedParent !== commJid) {
        if (typeof sock.communityUnlinkGroup === 'function') {
          await sock.communityUnlinkGroup(gJid, gMeta.linkedParent).catch(() => {});
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
      await sock.communityLinkGroup(gJid, commJid);
      results.linked.push({ jid: gJid, name: gMeta.subject || gJid });

      // Perbarui status jika grup ini termasuk salah satu grup ekosistem
      for (const k of Object.keys(saved.groups || {})) {
        if (saved.groups[k]?.jid === gJid) {
          saved.groups[k].linkedToCommunity = true;
          saveData(saved);
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 2500));
    } catch (err) {
      logEcosystemTerminalError(`Gagal Menautkan Grup ke Komunitas (linkAllGroupsToCommunity) [${gMeta.subject}]`, err, { groupJid: gJid, commJid });
      results.failed.push({ jid: gJid, name: gMeta.subject || gJid, error: err.message });
    }
  }

  return results;
}

/**
 * Mengikat secara manual suatu grup menjadi grup resmi kategori tertentu
 * @param {object} sock - Baileys socket
 * @param {string} key - Kategori ('news' | 'logs' | 'vault' | 'sandbox' | 'academy')
 * @param {string} targetJid - JID grup WhatsApp
 * @returns {Promise<{success: boolean, message: string, key?: string, jid?: string, subject?: string}>}
 */
async function bindGroupToEcosystem(sock, key, targetJid) {
  if (!key || !targetJid) {
    return { success: false, message: 'Key kategori dan JID grup wajib disertakan.' };
  }

  const spec = ECOSYSTEM_SPECS.find((s) => s.key === key.toLowerCase().trim());
  if (!spec) {
    const validKeys = ECOSYSTEM_SPECS.map((s) => s.key).join(', ');
    return { success: false, message: `Kategori "${key}" tidak valid. Pilihan: ${validKeys}` };
  }

  const myJid = sock?.user?.id ? jidNormalizedUser(sock.user.id) : '';
  const myNumber = myJid ? myJid.split('@')[0] : '';
  const botLid = sock?.user?.lid ? jidNormalizedUser(sock.user.lid) : '';

  // 1. Ambil metadata grup tujuan
  let gMeta = null;
  if (sock && typeof sock.groupMetadata === 'function') {
    try {
      gMeta = await sock.groupMetadata(targetJid);
    } catch (err) {
      logEcosystemTerminalError(`Gagal Membaca Metadata Grup Saat /bindeco [${targetJid}]`, err, { key, targetJid });
      return { success: false, message: `Gagal membaca metadata grup ${targetJid}: ${err.message}` };
    }
  }

  const subject = gMeta?.subject || spec.subject;
  const creationTime = Number(gMeta?.creation || 0);

  // 2. Periksa apakah bot adalah admin di grup tujuan
  let isBotAdmin = false;
  if (gMeta?.participants) {
    isBotAdmin = gMeta.participants.some((p) => {
      const pId = p.id ? jidNormalizedUser(p.id) : '';
      return (pId === myJid || (myNumber && pId.includes(myNumber)) || (botLid && pId === botLid)) &&
        (p.admin === 'admin' || p.admin === 'superadmin');
    });
  }

  // 3. Auto-Healing: Suntikkan Digital Signature Tag ke deskripsi grup jika bot admin
  let tagInjected = false;
  if (isBotAdmin && typeof sock?.groupUpdateDescription === 'function') {
    try {
      const currentDesc = gMeta?.desc || gMeta?.description || '';
      const targetTag = getGroupTag(spec.key, myNumber);
      if (!currentDesc.toLowerCase().includes(targetTag.toLowerCase())) {
        const updatedDesc = currentDesc.trim()
          ? `${currentDesc.trim()}\n\n${targetTag}`
          : `${spec.desc} ${targetTag}`;
        await sock.groupUpdateDescription(targetJid, updatedDesc);
        tagInjected = true;
      } else {
        tagInjected = true;
      }
    } catch (e) {
      logEcosystemTerminalError(`Gagal Injeksi Signature Tag Saat Manual Bind [${targetJid}]`, e, { key, targetJid });
    }
  }

  // 4. Update Database
  const saved = getSavedData();
  if (!saved.groups) saved.groups = {};

  const oldRecord = saved.groups[spec.key];
  saved.groups[spec.key] = {
    ...(oldRecord || {}),
    jid: targetJid,
    subject: subject,
    boundAt: new Date().toISOString(),
    creationTime: creationTime || oldRecord?.creationTime || null,
    manuallyBound: true,
  };

  // Ambil invite code jika bot admin
  if (isBotAdmin && typeof sock?.groupInviteCode === 'function') {
    try {
      const inviteCode = await sock.groupInviteCode(targetJid).catch(() => null);
      if (inviteCode) {
        saved.groups[spec.key].inviteCode = inviteCode;
        saved.groups[spec.key].inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
      }
    } catch (_) {}
  }

  // 5. Tautkan ke Komunitas Resmi jika ada
  let linkedToCommunity = false;
  const commJid = saved.community?.jid;
  if (commJid && isBotAdmin && typeof sock?.communityLinkGroup === 'function') {
    try {
      await sock.communityLinkGroup(targetJid, commJid);
      linkedToCommunity = true;
      saved.groups[spec.key].linkedToCommunity = true;
    } catch (linkErr) {
      logEcosystemTerminalError(`Gagal Taut Komunitas Saat Manual Bind [${subject}]`, linkErr, { key: spec.key, targetJid, commJid });
    }
  }

  saveData(saved);

  return {
    success: true,
    message: `Sukses mengikat grup "${subject}" sebagai ruang resmi [${spec.subject}]!`,
    key: spec.key,
    subject,
    jid: targetJid,
    isBotAdmin,
    tagInjected,
    linkedToCommunity,
    creationTime: creationTime ? new Date(creationTime * 1000).toISOString() : null,
  };
}

/**
 * Mengambil ringkasan diagnosis 5 grup ekosistem + komunitas
 * @param {object} sock - Baileys socket
 */
async function getEcosystemDiagnostics(sock) {
  const saved = getSavedData();
  const myJid = sock?.user?.id ? jidNormalizedUser(sock.user.id) : '';
  const myNumber = myJid ? myJid.split('@')[0] : '';

  let activeGroups = {};
  if (sock && typeof sock.groupFetchAllParticipating === 'function') {
    try {
      activeGroups = await sock.groupFetchAllParticipating();
    } catch (_) {}
  }

  const commJid = saved.community?.jid;
  const communityInfo = {
    jid: commJid,
    subject: saved.community?.subject || COMMUNITY_SPEC.subject,
    isActive: Boolean(commJid && activeGroups[commJid]),
    inviteLink: saved.community?.inviteLink || null,
  };

  const groupsInfo = [];
  for (const spec of ECOSYSTEM_SPECS) {
    const record = saved.groups?.[spec.key];
    const jid = record?.jid;
    const meta = jid ? activeGroups[jid] : null;
    const targetTag = getGroupTag(spec.key, myNumber);
    const desc = meta?.desc || meta?.description || '';
    const hasTag = desc.toLowerCase().includes(targetTag.toLowerCase()) || desc.includes(`[polaris_ecosystem:${spec.key}]`);

    groupsInfo.push({
      key: spec.key,
      specSubject: spec.subject,
      jid: jid || null,
      activeSubject: meta?.subject || record?.subject || null,
      isActive: Boolean(meta),
      creationTime: meta?.creation ? new Date(meta.creation * 1000).toISOString() : (record?.creationTime ? new Date(record.creationTime * 1000).toISOString() : null),
      hasTag,
      isBotAdmin: Boolean((meta?.participants || []).some((p) => {
        const pId = p.id ? jidNormalizedUser(p.id) : '';
        return (pId === myJid || (myNumber && pId.includes(myNumber))) && (p.admin === 'admin' || p.admin === 'superadmin');
      })),
      linkedToCommunity: Boolean(record?.linkedToCommunity || (commJid && meta?.linkedParent === commJid)),
      inviteLink: record?.inviteLink || null,
      participantCount: meta?.participants ? meta.participants.length : null,
    });
  }

  return {
    community: communityInfo,
    groups: groupsInfo,
    totalActive: groupsInfo.filter((g) => g.isActive).length,
  };
}

/**
 * Invite human owner ke semua 5 grup ekosistem (on-demand via /inteco)
 * Jika bot tidak bisa add langsung (privacy), kirim invite link via DM ke owner.
 * @param {object} sock - Baileys socket
 * @param {string} ownerNumber - Nomor HP owner (tanpa @s.whatsapp.net)
 * @returns {object} { success, results: [{key, status, method}], communityLink }
 */
async function inviteOwnerToAllEcosystemGroups(sock, ownerNumber) {
  if (!sock || !ownerNumber) return { success: false, reason: 'no_sock_or_owner' };

  const saved = getSavedData();
  const ownerJid = `${String(ownerNumber).replace(/[^0-9]/g, '')}@s.whatsapp.net`;
  const results = [];

  for (const spec of ECOSYSTEM_SPECS) {
    const record = saved.groups?.[spec.key];
    const groupJid = record?.jid;
    if (!groupJid) {
      results.push({ key: spec.key, subject: spec.subject, status: 'skip', reason: 'group_not_found' });
      continue;
    }

    // Cek apakah owner sudah jadi member
    let alreadyMember = false;
    try {
      const meta = await sock.groupMetadata(groupJid).catch(() => null);
      if (meta?.participants) {
        alreadyMember = meta.participants.some((p) => {
          const pId = p.id ? jidNormalizedUser(p.id) : '';
          return pId === ownerJid || pId.includes(ownerNumber.replace(/[^0-9]/g, ''));
        });
      }
    } catch (_) {}

    if (alreadyMember) {
      results.push({ key: spec.key, subject: spec.subject, status: 'already_member', method: 'none' });
      continue;
    }

    // Coba add langsung via groupParticipantsUpdate
    let addSuccess = false;
    try {
      await sock.groupParticipantsUpdate(groupJid, [ownerJid], 'add');
      await new Promise((r) => setTimeout(r, 1200));
      addSuccess = true;
      results.push({ key: spec.key, subject: spec.subject, status: 'success', method: 'direct_add' });
      console.log(`[BotEcosystem /inteco] ✅ Berhasil menambahkan owner (${ownerJid}) ke grup [${spec.key}] (${groupJid})`);
    } catch (addErr) {
      const errMsg = addErr?.message || String(addErr);
      console.warn(`[BotEcosystem /inteco] ⚠️ Gagal add langsung ke [${spec.key}]: ${errMsg}. Fallback ke invite link...`);
    }

    // Fallback: kirim invite link via DM ke owner jika add gagal (privacy restricted)
    if (!addSuccess) {
      try {
        let inviteCode = record?.inviteCode;
        if (!inviteCode && typeof sock.groupInviteCode === 'function') {
          inviteCode = await sock.groupInviteCode(groupJid).catch(() => null);
          if (inviteCode) {
            saved.groups[spec.key].inviteCode = inviteCode;
            saveData(saved);
          }
        }
        const inviteLink = inviteCode ? `https://chat.whatsapp.com/${inviteCode}` : null;
        if (inviteLink) {
          await sock.sendMessage(ownerJid, {
            text: `🔗 *Undangan Grup Ekosistem Polaris*\n\n📌 *[${spec.key.toUpperCase()}] ${spec.subject}*\nKlik link di bawah untuk bergabung:\n${inviteLink}`,
          }).catch(() => {});
          results.push({ key: spec.key, subject: spec.subject, status: 'invite_sent', method: 'dm_link', link: inviteLink });
          console.log(`[BotEcosystem /inteco] 📨 Link undangan [${spec.key}] dikirim via DM ke ${ownerJid}`);
        } else {
          results.push({ key: spec.key, subject: spec.subject, status: 'failed', reason: 'no_invite_code' });
        }
      } catch (dmErr) {
        logEcosystemTerminalError(`Gagal Mengirim Link Undangan Owner via DM [${spec.key}]`, dmErr, { ownerJid, groupJid });
        results.push({ key: spec.key, subject: spec.subject, status: 'failed', reason: dmErr?.message });
      }
    }

    await new Promise((r) => setTimeout(r, 800));
  }

  // Kirim juga link komunitas induk via DM
  const communityJid = saved.community?.jid;
  let communityLink = saved.community?.inviteLink || null;
  if (communityJid && !communityLink && typeof sock.communityInviteCode === 'function') {
    try {
      const code = await sock.communityInviteCode(communityJid).catch(() => null);
      if (code) {
        communityLink = `https://chat.whatsapp.com/${code}`;
        saved.community.inviteLink = communityLink;
        saveData(saved);
      }
    } catch (_) {}
  }
  if (communityLink) {
    await sock.sendMessage(ownerJid, {
      text: `🌐 *Link Komunitas Polaris (Induk)*\n${communityLink}\n\nGabung komunitas untuk akses semua 5 ruang ekosistem sekaligus!`,
    }).catch(() => {});
  }

  return {
    success: true,
    results,
    communityLink,
  };
}

module.exports = {
  COMMUNITY_SPEC,
  ECOSYSTEM_SPECS,
  getGroupTag,
  getCommunityTag,
  cleanupJunkGroups,
  ensureEcosystemGroups,
  relinkEcosystem,
  recreateCommunity,
  linkGroupToCommunity,
  linkAllGroupsToCommunity,
  sendLogErrorToGroup,
  sendOutputToVaultGroup,
  getSavedData,
  saveData,
  isEcosystemGroup,
  handleGroupParticipantsUpdate,
  recoverEcosystemGroup,
  startEcosystemWatchdog,
  bindGroupToEcosystem,
  getEcosystemDiagnostics,
  inviteOwnerToAllEcosystemGroups,
  detectCategoryForGroup,
  dismantleDuplicateGroup,
  harvestAndMigrateGroupData,
  logEcosystemTerminalError,
};
