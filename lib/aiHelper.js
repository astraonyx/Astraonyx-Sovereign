// lib/aiHelper.js — Integrasi AI chat: OpenRouter (utama) + Groq (fallback).
// Kedua API dipanggil langsung pakai fetch (bukan SDK resmi masing-masing),
// konsisten dengan prinsip project ini (minim dependency eksternal).

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
// Daftar model gratis OpenRouter yang dicoba berurutan — kalau satu error/limit,
// otomatis lanjut ke berikutnya. Urutan = prioritas (paling kuat duluan).
// Override lewat OPENROUTER_MODEL di .env kalau cuma mau pakai 1 model spesifik.
const OPENROUTER_MODEL_CHAIN = process.env.OPENROUTER_MODEL
  ? [process.env.OPENROUTER_MODEL]
  : [
      'nex-agi/nex-n2.5-mini:free',
      'liquid/lfm-2.5-2.6b:free',
      'nex-agi/nex-n2.5-pro:free',
      'nvidia/nemotron-3.5-lightning:free',
    ];
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant'; // dipilih karena limit harian gratis lebih longgar dibanding model 70B untuk pemakaian chatbot personal biasa

const MAX_PROMPT_LENGTH = 4000;
const MAX_HISTORY_TURNS = 6; // batas percakapan yang dikirim ulang sebagai konteks, biar tidak boros token

// Persona bot: santai, jenaga, suka nyeletuk/roasting ringan ala temen deket,
// tapi tetap sopan batas bawahnya — bukan ngehina identitas orang atau
// ngajak ribut beneran. Override lewat AI_PERSONA di .env kalau mau ganti.
const DEFAULT_PERSONA = `Kamu adalah asisten AI di bot WhatsApp bernama Astraonyx. Gaya ngobrolmu santai kayak temen deket: pakai bahasa Indonesia gaul/informal, sesekali nyeletuk julid atau roasting ringan kalau memang lucu dan pas konteksnya, jangan kaku atau formal, jangan sering minta maaf, jangan mulai jawaban dengan "Tentu!" atau semacamnya. Boleh sarkastik dan bercanda kasar dikit ala circle pertemanan, tapi tetap jangan menghina identitas orang (fisik, ras, agama, gender), jangan mem-bully sampai bikin sakit hati beneran, dan jangan toxic ke titik ngajak ribut sungguhan. Intinya: kocak dan nyablak, bukan jahat.`;
const SYSTEM_PERSONA = process.env.AI_PERSONA || DEFAULT_PERSONA;

async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Coba satu model OpenRouter spesifik. Dipanggil berulang oleh askOpenRouter
// untuk tiap model di OPENROUTER_MODEL_CHAIN sampai ada yang sukses.
async function tryOpenRouterModel(model, messages, apiKey) {
  try {
    const res = await fetchWithTimeout(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        // Header ini opsional tapi direkomendasikan OpenRouter untuk
        // identifikasi aplikasi di dashboard mereka.
        'HTTP-Referer': 'https://github.com/astraonyx-bot',
        'X-Title': 'Astraonyx Bot',
      },
      body: JSON.stringify({ model, messages }),
    }, 30000);

    const json = await res.json();

    if (!res.ok) {
      const message = json?.error?.message || `status ${res.status}`;
      // 401/403 = key salah/dicabut -> percuma coba model lain, langsung stop.
      // 429/404/lainnya (model lagi limit/nggak tersedia) -> lanjut model berikutnya.
      const isAuthError = res.status === 401 || res.status === 403;
      return { success: false, error: message, isAuthError };
    }

    const text = json?.choices?.[0]?.message?.content || '';
    if (!text) {
      const finishReason = json?.choices?.[0]?.finish_reason;
      if (finishReason === 'content_filter') {
        return { success: false, error: 'Respons diblokir oleh filter konten model.', isAuthError: false };
      }
      return { success: false, error: `${model} tidak mengembalikan jawaban.`, isAuthError: false };
    }

    return { success: true, text, model };
  } catch (err) {
    return { success: false, error: err.message, isAuthError: false };
  }
}

// history: [{ role: 'user'|'assistant', text: '...' }, ...] (opsional, buat percakapan berkelanjutan)
// Coba tiap model di OPENROUTER_MODEL_CHAIN berurutan sampai ada yang sukses.
async function askOpenRouter(prompt, apiKey, history = [], customPersona = null) {
  if (!apiKey) return { success: false, error: 'OPENROUTER_API_KEY belum diset.', isQuotaOrAuthError: true };

  const messages = [
    { role: 'system', content: customPersona || SYSTEM_PERSONA },
    ...history.slice(-MAX_HISTORY_TURNS).map((h) => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: h.text,
    })),
    { role: 'user', content: prompt },
  ];

  const errors = [];
  for (const model of OPENROUTER_MODEL_CHAIN) {
    const result = await tryOpenRouterModel(model, messages, apiKey);
    if (result.success) {
      return { success: true, text: result.text, provider: `OpenRouter (${result.model})` };
    }
    errors.push(`${model}: ${result.error}`);
    // Key salah/dicabut berlaku untuk semua model -> percuma lanjut coba yang lain.
    if (result.isAuthError) {
      return { success: false, error: result.error, isQuotaOrAuthError: true };
    }
  }

  // Semua model di chain gagal (biasanya limit rame-rame) -> sinyal ke askAI
  // supaya coba fallback ke Groq kalau ada.
  return { success: false, error: errors.join(' | '), isQuotaOrAuthError: true };
}

async function askGroq(prompt, apiKey, history = [], customPersona = null) {
  if (!apiKey) return { success: false, error: 'GROQ_API_KEY belum diset.' };

  const messages = [
    { role: 'system', content: customPersona || SYSTEM_PERSONA },
    ...history.slice(-MAX_HISTORY_TURNS).map((h) => ({ role: h.role, content: h.text })),
    { role: 'user', content: prompt },
  ];

  try {
    const res = await fetchWithTimeout(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: GROQ_MODEL, messages }),
    }, 30000);

    const json = await res.json();

    if (!res.ok) {
      return { success: false, error: json?.error?.message || `status ${res.status}` };
    }

    const text = json?.choices?.[0]?.message?.content || '';
    if (!text) return { success: false, error: 'Groq tidak mengembalikan jawaban.' };

    return { success: true, text, provider: 'Groq (fallback)' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Entry point utama: coba OpenRouter dulu, fallback ke Groq kalau OpenRouter
// kena quota/auth error. Error lain (mis. network timeout) TIDAK fallback,
// supaya tidak menutupi masalah asli dengan percobaan kedua yang sia-sia.
async function askAI(prompt, config, history = [], customPersona = null) {
  if (!prompt || !prompt.trim()) {
    return { success: false, error: 'Pertanyaan kosong.' };
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return { success: false, error: `Pertanyaan terlalu panjang (maksimal ${MAX_PROMPT_LENGTH} karakter).` };
  }

  const openRouterResult = await askOpenRouter(prompt, config.openRouterApiKey, history, customPersona);
  if (openRouterResult.success) return openRouterResult;

  if (openRouterResult.isQuotaOrAuthError && config.groqApiKey) {
    const groqResult = await askGroq(prompt, config.groqApiKey, history, customPersona);
    if (groqResult.success) return groqResult;
    return { success: false, error: `OpenRouter: ${openRouterResult.error} | Groq: ${groqResult.error}` };
  }

  return openRouterResult;
}

module.exports = { askAI, askOpenRouter, askGroq, MAX_PROMPT_LENGTH };
