// commands/ai.js — /ai <pertanyaan> (OpenRouter, auto-pilih model gratis + fallback Groq)
const { askAI, MAX_PROMPT_LENGTH } = require('../lib/aiHelper');
const config = require('../config');
const { success, warning, usage } = require('../lib/messageStyle');

// History percakapan per user, in-memory saja (hilang kalau bot restart).
// Disimpan per senderNumber (bukan per chat), supaya konteks nyambung baik
// di grup maupun private chat yang sama. Dibatasi jumlah entry biar tidak
// bocor memori kalau banyak user pakai .ai terus-menerus dalam waktu lama.
const conversationHistory = new Map(); // senderNumber -> [{role, text}, ...]
const MAX_HISTORY_ENTRIES = 12; // 6 pasang tanya-jawab

function getHistory(senderNumber) {
  return conversationHistory.get(senderNumber) || [];
}

function pushHistory(senderNumber, userText, aiText) {
  const history = getHistory(senderNumber);
  history.push({ role: 'user', text: userText }, { role: 'assistant', text: aiText });
  while (history.length > MAX_HISTORY_ENTRIES) history.shift();
  conversationHistory.set(senderNumber, history);
}

async function handleAiCommand({ senderNumber, command, args, reply }) {
  if (command === 'aiforget') {
    conversationHistory.delete(senderNumber);
    await reply(success('Riwayat Dihapus', '🧹 Riwayat percakapan AI kamu sudah direset.'));
    return;
  }

  const prompt = args.join(' ');
  if (!prompt) {
    await reply(usage('/ai <pertanyaan>', `Maksimal ${MAX_PROMPT_LENGTH} karakter. Riwayat percakapan otomatis diingat; reset lewat \`/aiforget\`.`));
    return;
  }

  const instanceId = process.env.INSTANCE_ID;
  let customKey = null;
  if (instanceId) {
    try {
      const clusterManager = require('../server/clusterManager');
      const clusterDb = clusterManager.readClusterDb();
      const inst = clusterDb[instanceId];
      if (inst && inst.ownerUserId) {
        const hermesManager = require('../server/hermesManager');
        const userCfg = hermesManager.getUserConfig(inst.ownerUserId);
        if (userCfg && userCfg.apiKey) customKey = userCfg.apiKey;
      }
    } catch (_) {}
  }

  const effectiveConfig = {
    ...config,
    openRouterApiKey: customKey || config.openRouterApiKey,
    groqApiKey: (customKey && customKey.startsWith('gsk_')) ? customKey : config.groqApiKey,
    geminiApiKey: (customKey && customKey.startsWith('AIza')) ? customKey : config.geminiApiKey,
  };

  if (!effectiveConfig.openRouterApiKey && !effectiveConfig.groqApiKey && !effectiveConfig.geminiApiKey) {
    await reply(warning(
      'Perintah AI Dinonaktifkan (API Key Belum Disetel)',
      `⚠️ *Fitur AI Tidak Dapat Berjalan*\n\n` +
      `Akun pemilik bot ini belum menyetel AI API Key pribadi.\n\n` +
      `📌 *Penjelasan:*\n` +
      `Setiap akun di platform ini wajib menyetel API Key mandiri (Google Gemini / OpenRouter / Groq) agar tidak saling membebani kuota.\n\n` +
      `👉 *Solusi:*\n` +
      `Buka Web Dashboard Polaris ➔ Menu *🧠 Hermes AI* atau *⚙️ Pengaturan Akun* ➔ Masukkan API Key gratis Anda lalu simpan.`
    ));
    return;
  }

  const history = getHistory(senderNumber);
  const result = await askAI(prompt, effectiveConfig, history);

  if (!result.success) {
    await reply(warning('Gagal Merespons', result.error));
    return;
  }

  pushHistory(senderNumber, prompt, result.text);

  const waFormatter = require('../lib/whatsappFormatter');
  const formattedText = waFormatter.formatForWhatsApp(result.text);
  const modelInfo = result.model ? `_Model: ${result.model}_\n\n` : '';
  await reply(success('AI Response', `${modelInfo}${formattedText}`));
}

module.exports = { handleAiCommand };
