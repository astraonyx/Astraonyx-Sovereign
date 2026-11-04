// lib/translateHelper.js — Terjemahan & TTS pakai endpoint gratis Google
// Translate (translate.googleapis.com), TANPA API key, TANPA package
// tambahan (ditulis langsung pakai fetch, bukan pakai library pihak ketiga
// seperti google-translate-api-x — meski itu valid, project ini prinsipnya
// minim dependency, ditulis ulang sendiri biar bisa diaudit penuh).
//
// Endpoint ini yang sama dipakai translate.google.com sendiri di browser,
// bukan Google Cloud Translation API resmi (yang berbayar/butuh API key).

const TRANSLATE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const TTS_ENDPOINT = 'https://translate.google.com/translate_tts';
const MAX_TEXT_LENGTH = 5000; // batas Google Translate per-request
const MAX_TTS_LENGTH = 200; // TTS endpoint lebih ketat soal panjang teks

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Kembalikan { success, text, detectedSourceLang } atau { success: false, error }
async function translateText(text, targetLang, sourceLang = 'auto') {
  if (!text || !text.trim()) {
    return { success: false, error: 'Teks kosong.' };
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return { success: false, error: `Teks terlalu panjang (maksimal ${MAX_TEXT_LENGTH} karakter).` };
  }

  const params = new URLSearchParams({
    client: 'gtx',
    sl: sourceLang,
    tl: targetLang,
    dt: 't',
    q: text,
  });

  try {
    const res = await fetchWithTimeout(`${TRANSLATE_ENDPOINT}?${params}`, {}, 15000);
    if (!res.ok) {
      return { success: false, error: `Google Translate merespons status ${res.status}.` };
    }

    const json = await res.json();
    // Format respons: [[[translated, original, ...], ...], null, detectedLang, ...]
    if (!Array.isArray(json) || !Array.isArray(json[0])) {
      return { success: false, error: 'Format respons tidak dikenali.' };
    }

    const translatedText = json[0].map((segment) => segment[0]).join('');
    const detectedSourceLang = json[2] || sourceLang;

    return { success: true, text: translatedText, detectedSourceLang };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Kembalikan { success, audioBuffer } atau { success: false, error }
// Catatan: endpoint TTS Google membatasi panjang teks per-request (~200
// karakter), untuk teks lebih panjang perlu dipecah jadi beberapa request
// lalu digabung — di luar cakupan implementasi awal ini.
async function textToSpeech(text, lang = 'id') {
  if (!text || !text.trim()) {
    return { success: false, error: 'Teks kosong.' };
  }
  if (text.length > MAX_TTS_LENGTH) {
    return { success: false, error: `Teks terlalu panjang untuk TTS (maksimal ${MAX_TTS_LENGTH} karakter).` };
  }

  const params = new URLSearchParams({
    ie: 'UTF-8',
    client: 'tw-ob', // client key yang dipakai endpoint TTS publik, bukan client resmi berbayar
    tl: lang,
    q: text,
  });

  try {
    const res = await fetchWithTimeout(`${TTS_ENDPOINT}?${params}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36' },
    }, 15000);

    if (!res.ok) {
      return { success: false, error: `Google TTS merespons status ${res.status}.` };
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('audio')) {
      return { success: false, error: 'Respons bukan file audio (kemungkinan bahasa tidak didukung atau diblokir sementara).' };
    }

    const audioBuffer = Buffer.from(await res.arrayBuffer());
    return { success: true, audioBuffer };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { translateText, textToSpeech, MAX_TEXT_LENGTH, MAX_TTS_LENGTH };
