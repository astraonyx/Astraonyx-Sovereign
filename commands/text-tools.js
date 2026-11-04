// commands/text-tools.js — /translate, /tts, /readmore
const { translateText, textToSpeech, MAX_TEXT_LENGTH, MAX_TTS_LENGTH } = require('../lib/translateHelper');
const { buildReadmore } = require('../lib/readmoreHelper');
const { success, warning, error, usage } = require('../lib/messageStyle');

// Kode bahasa umum yang sering ditulis orang Indonesia (nama lengkap ->
// kode ISO), supaya /translate bisa terima "inggris" selain "en".
const LANG_ALIASES = {
  indonesia: 'id', indo: 'id',
  inggris: 'en', english: 'en',
  jepang: 'ja', japan: 'ja',
  korea: 'ko',
  arab: 'ar',
  mandarin: 'zh-CN', china: 'zh-CN', chinese: 'zh-CN',
  jerman: 'de', german: 'de',
  perancis: 'fr', prancis: 'fr', french: 'fr',
  spanyol: 'es', spanish: 'es',
  rusia: 'ru', russian: 'ru',
  thailand: 'th', thai: 'th',
  vietnam: 'vi',
  melayu: 'ms', malay: 'ms',
  portugis: 'pt', portuguese: 'pt',
  italia: 'it', italian: 'it',
};

function resolveLangCode(input) {
  const lower = input.toLowerCase();
  return LANG_ALIASES[lower] || input; // kalau bukan alias dikenal, anggap sudah kode ISO (en, id, ja, dst)
}

async function handleTranslate({ args, reply }) {
  if (args.length < 2) {
    await reply(usage(
      '/translate <bahasa tujuan> <teks>',
      'Contoh: `/translate inggris Selamat pagi semua`\nBisa pakai nama bahasa (inggris, jepang, arab, dst) atau kode ISO (en, ja, ar).'
    ));
    return;
  }

  const targetLang = resolveLangCode(args[0]);
  const text = args.slice(1).join(' ');

  const result = await translateText(text, targetLang);
  if (!result.success) {
    await reply(error('Gagal Menerjemahkan', result.error));
    return;
  }

  await reply(success(`Terjemahan (${result.detectedSourceLang} → ${targetLang})`, result.text));
}

async function handleTts({ sock, chatJid, msg, args, reply }) {
  let lang = 'id';
  let text = '';

  // Dukung reply pesan teks langsung untuk dibacakan
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || quoted?.imageMessage?.caption || quoted?.videoMessage?.caption || null;

  if (args && args.length > 0) {
    const candidate = args[0].toLowerCase();
    const resolved = LANG_ALIASES[candidate];
    const isIsoCode = /^[a-z]{2}(-[a-z]{2,3})?$/i.test(candidate);

    if ((resolved || isIsoCode) && (args.length > 1 || quotedText)) {
      lang = resolved || candidate;
      text = args.length > 1 ? args.slice(1).join(' ') : quotedText;
    } else {
      text = args.join(' ');
    }
  } else if (quotedText) {
    text = quotedText;
  }

  if (!text || !text.trim()) {
    await reply(usage(
      '/tts [bahasa] <teks>',
      `Ubah teks menjadi pesan suara WhatsApp (Voice Note).\nContoh:\n• \`/tts Halo selamat pagi semuanya!\` (Indonesia)\n• \`/tts en Hello, have a nice day!\` (English)\n• \`/tts ja Ohayou gozaimasu!\` (Jepang)\n• Atau reply pesan teks apa saja dengan \`/tts\` / \`/tts en\`.\nMaksimal ${MAX_TTS_LENGTH} karakter.`
    ));
    return;
  }

  const result = await textToSpeech(text.trim(), lang);
  if (!result.success) {
    await reply(error('Gagal Membuat Suara', result.error));
    return;
  }

  await sock.sendMessage(chatJid, { audio: result.audioBuffer, mimetype: 'audio/mpeg', ptt: true }, { quoted: msg });
}

async function handleReadmore({ args, reply }) {
  const fullText = args.join(' ');
  const separatorIndex = fullText.indexOf('|');

  if (!fullText || separatorIndex === -1) {
    await reply(usage(
      '/readmore <teks keliatan>|<teks tersembunyi>',
      'Contoh: `/readmore Ini spoiler film baru!|Ternyata di akhir dia cuma mimpi.`'
    ));
    return;
  }

  const visible = fullText.slice(0, separatorIndex).trim();
  const hidden = fullText.slice(separatorIndex + 1).trim();

  if (!visible || !hidden) {
    await reply(warning('Bagian Kosong', 'Bagian yang keliatan dan yang disembunyikan harus diisi dua-duanya.'));
    return;
  }

  // PENTING: hasil buildReadmore() TIDAK dibungkus box-style — pesan ini
  // sengaja diisi karakter invisible (U+200E) supaya WhatsApp melipatnya
  // jadi tombol "Baca Selengkapnya". Menambah header/garis box di sini
  // akan merusak teknik itu.
  const message = buildReadmore(visible, hidden);
  await reply(message);
}

async function handleTextToolsCommand({ sock, chatJid, msg, command, args, reply }) {
  switch (command) {
    case 'translate':
      return handleTranslate({ args, reply });
    case 'tts':
      return handleTts({ sock, chatJid, msg, args, reply });
    case 'readmore':
      return handleReadmore({ args, reply });
    default:
      return;
  }
}

module.exports = { handleTextToolsCommand };
