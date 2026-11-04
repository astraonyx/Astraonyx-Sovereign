// commands/hermes.js — Handler Command WhatsApp untuk Hermes Autonomous AI Agent
const hermesAgent = require('../lib/hermesAgent');
const hermesManager = require('../server/hermesManager');
const config = require('../config');
const { box, success, warning, usage, bullet, LINE } = require('../lib/messageStyle');

async function handleHermesCommand({ sock, msg, chatJid, senderNumber, isGroup, command, args, reply }) {
  const instanceId = process.env.INSTANCE_ID;
  let cfg = null;
  let botOwnerUserId = null;
  if (instanceId) {
    try {
      const clusterManager = require('../server/clusterManager');
      const clusterDb = clusterManager.readClusterDb();
      const inst = clusterDb[instanceId];
      if (inst && inst.ownerUserId) {
        botOwnerUserId = inst.ownerUserId;
        cfg = hermesManager.getUserConfig(botOwnerUserId);
      }
    } catch (_) {}
  }
  if (!cfg) {
    cfg = hermesManager.getConfig();
  }

  // Mode Reset Memory: /hermesclear
  if (command === 'hermesclear') {
    const sessionKey = chatJid + '_' + senderNumber;
    hermesAgent.clearSessionMemory(sessionKey);
    await reply(success('Hermes Memory Reset', '🧠 Memori dan konteks percakapan Hermes Agent kamu di chat ini telah dibersihkan.'));
    return;
  }

  // Mode Status: /hermesstatus
  if (command === 'hermesstatus') {
    const stats = hermesAgent.getMemoryStats();
    const status = hermesManager.getStatus();

    const toolsList = stats.tools.map((t) => '• *' + t.name + '*: ' + t.description).join('\n');

    const body = [
      '*Status Sistem Hermes AI Agent*',
      LINE,
      '🤖 Model: `' + (status.model || hermesAgent.HERMES_DEFAULT_MODEL) + '`',
      '⚡ Engine: Hermes 3 / Llama 3.1 Autonomous ReAct',
      '📦 Terpasang: ' + (status.installed ? '✅ Ya' : '❌ Belum'),
      '🔌 Status Agent: ' + (status.enabled ? '🟢 AKTIF' : '⚪ NONAKTIF'),
      '🔑 API Key: ' + (status.hasApiKey ? '✅ Terhubung' : '❌ Belum diset'),
      '🧠 Sesi Aktif: ' + stats.activeSessions + ' percakapan',
      '🛠️ Tools Terdaftar: ' + stats.registeredToolsCount + ' alat',
      LINE,
      '*Daftar Tools Otonom:*',
      toolsList,
    ].join('\n');

    await reply(box({
      prefix: 'HERMES',
      statusTag: 'STATUS',
      title: 'Hermes Autonomous Agent',
      body,
      footer: 'Gunakan `' + config.prefix + 'hermes <pertanyaan>` atau `' + config.prefix + 'hermes-agent <misi>`',
    }));
    return;
  }

  // Input Prompt
  const prompt = args.join(' ').trim();
  if (!prompt) {
    await reply(usage(
      config.prefix + command + ' <pertanyaan/misi>',
      'Perintahkan Hermes Autonomous Agent untuk berpikir, menggunakan tools, dan mengeksekusi tugas.\n\n' +
      'Contoh:\n' +
      '• `' + config.prefix + 'hermes Jam berapa sekarang dan hitung 125 * 450?`\n' +
      '• `' + config.prefix + 'hermes-agent Cari informasi tentang ibukota Nusantara lalu buatkan ringkasannya`\n' +
      '• `' + config.prefix + 'hermesstatus` untuk melihat status engine\n' +
      '• `' + config.prefix + 'hermesclear` untuk reset memori chat'
    ));
    return;
  }

  if (!cfg.apiKey || cfg.apiKey.trim().length < 8) {
    await reply(warning(
      'Hermes AI Dinonaktifkan (API Key Belum Disetel)',
      `⚠️ *Hermes AI Agent Tidak Berjalan*\n\n` +
      `Bot ini tidak dapat memproses perintah AI karena akun pemilik bot belum memasang API Key pribadi.\n\n` +
      `📌 *Penjelasan:*\n` +
      `Setiap akun di platform ini beroperasi independen dan wajib menyetel API Key mandiri (Google Gemini / OpenRouter / Groq) agar tidak saling membebani kuota.\n\n` +
      `👉 *Solusi:*\n` +
      `Buka Web Dashboard Polaris ➔ Masuk menu *🧠 Hermes AI* atau *⚙️ Pengaturan Akun* ➔ Masukkan API Key Anda lalu klik Simpan. Bot akan langsung aktif!`
    ));
    return;
  }

  try {
    const isMission = command === 'hermes-agent';

    const result = await hermesAgent.runAutonomousAgent({
      prompt,
      senderNumber,
      chatJid,
      isGroup,
      groupName: isGroup ? (chatJid.split('@')[0]) : '',
      userConfig: cfg,
      apiKey: cfg.apiKey,
      userId: botOwnerUserId,
    });

    if (!result.success) {
      await reply(warning('Hermes Gagal Merespon', result.error || 'Terjadi kesalahan pada reasoning agent.'));
      return;
    }

    let toolBadges = '';
    if (result.steps && result.steps.length > 0) {
      const toolNames = Array.from(new Set(result.steps.map((s) => s.tool)));
      toolBadges = '\n\n⚙️ _Tools Dieksekusi (' + result.steps.length + ' langkah): ' + toolNames.join(', ') + '_';
    }

    const waFormatter = require('../lib/whatsappFormatter');
    const formattedResultText = waFormatter.formatForWhatsApp(result.text);

    if (isMission) {
      let stepSummary = '';
      if (result.steps && result.steps.length > 0) {
        stepSummary = result.steps.map((s, idx) => {
          const icon = s.icon || '🛠️';
          const title = s.title || `Langkah ${idx + 1} (${s.tool})`;
          let detail = s.detail || '';
          if (s.result && s.result.filename) {
            detail = `${s.result.filename} (${s.result.size || ''})`;
          } else if (s.result && s.result.message) {
            detail = s.result.message;
          }
          return `${icon} *${title}*` + (detail ? ` ➔ _${detail}_` : '');
        }).join('\n');
        stepSummary = '*Eksekusi Langkah Otonom:*\n' + stepSummary + '\n' + LINE + '\n';
      }

      let artifactInfo = '';
      if (result.artifacts && result.artifacts.length > 0) {
        artifactInfo = '\n\n📁 *Artefak Dihasilkan:*\n' + result.artifacts.map((a) => '• `' + a.filename + '` (' + a.size + ')').join('\n');
      }

      const body = [
        '🎯 *Misi:* ' + prompt,
        LINE,
        stepSummary + '*Sintesis Hasil Misi:*\n' + formattedResultText,
        artifactInfo,
        toolBadges,
      ].join('\n');

      await reply(box({
        prefix: 'HERMES AGENT',
        statusTag: 'MISSION COMPLETE',
        title: 'Laporan Tugas Otonom',
        body,
        footer: 'Model: ' + result.model + ' • Iterasi: ' + result.iterations + ' langkah',
      }));
    } else {
      let artifactInfo = '';
      if (result.artifacts && result.artifacts.length > 0) {
        artifactInfo = '\n\n📁 *Artefak Dihasilkan:*\n' + result.artifacts.map((a) => '• `' + a.filename + '` (' + a.size + ')').join('\n');
      }
      const header = '🧠 _Hermes Autonomous Agent (' + result.model.split('/').pop() + ')_';
      await reply(success('Hermes 3', header + '\n\n' + formattedResultText + artifactInfo + toolBadges));
    }

    // Kirim file artefak fisik ke WhatsApp jika ada
    if (result.artifacts && result.artifacts.length > 0 && sock) {
      const fs = require('fs');
      const artifactManager = require('../lib/artifactManager');
      for (const art of result.artifacts) {
        try {
          const record = artifactManager.getArtifactById(art.id);
          if (record && record.filePath && fs.existsSync(record.filePath)) {
            const buf = fs.readFileSync(record.filePath);
            const isImg = ['png', 'jpg', 'jpeg'].includes(record.filetype);
            if (isImg) {
              await sock.sendMessage(chatJid, {
                image: buf,
                caption: '📁 *Artefak:* ' + record.filename + ' (' + record.size + ')',
              });
            } else {
              await sock.sendMessage(chatJid, {
                document: buf,
                mimetype: 'application/octet-stream',
                fileName: record.filename,
                caption: '📁 *Artefak:* ' + record.filename + ' (' + record.size + ')',
              });
            }
          }
        } catch (err) {
          console.error('[hermesCommand] Gagal mengirim file artefak ke WA:', err.message);
        }
      }
    }
  } catch (err) {
    await reply(warning('Hermes Execution Error', err.message));
  }
}

// Handler pemanggilan skill langsung via command /<namaskill> (misal: /uipro, /ui-ux-pro-max, /banner-design, /slides)
async function handleHermesSkillCommand({
  sock,
  msg,
  chatJid,
  senderNumber,
  isGroup,
  skillName,
  skill = null,
  args = [],
  reply,
}) {
  const skillManager = require('../server/skillManager');
  const hermesManager = require('../server/hermesManager');
  const targetSkill = skill || skillManager.findSkillByName(skillName);

  if (!targetSkill) {
    await reply(warning('Skill Tidak Ditemukan', `Skill "${skillName}" belum terpasang atau tidak aktif.`));
    return;
  }

  const prompt = args.join(' ').trim();
  const displayName = targetSkill.displayName || targetSkill.rawName || targetSkill.name;

  // Jika tanpa argumen, tampilkan panduan skill
  if (!prompt) {
    const aliasText = targetSkill.aliases && targetSkill.aliases.length > 0
      ? `\n• Alias command: ${targetSkill.aliases.map((a) => '`/' + a + '`').join(', ')}`
      : '';
    const desc = targetSkill.description || 'Keahlian otonom Hermes Agent.';

    let examplePrompt = 'Buatkan landing page coffee shop dark mode modern dengan Tailwind CSS';
    const sLower = (targetSkill.rawName || targetSkill.name || '').toLowerCase();
    if (sLower.includes('banner')) {
      examplePrompt = 'Buatkan banner promo YouTube 16:9 tema neon cyberpunk';
    } else if (sLower.includes('slide')) {
      examplePrompt = 'Buatkan presentasi materi pitch deck startup AI 5 slide';
    } else if (sLower.includes('brand')) {
      examplePrompt = 'Buatkan panduan visual brand identity dan palet warna produk kopi';
    } else if (sLower.includes('system') || sLower.includes('styling')) {
      examplePrompt = 'Buatkan design system komponen button, card, dan modal modern';
    }

    await reply(box({
      prefix: 'HERMES SKILL',
      statusTag: 'READY',
      title: displayName.toUpperCase(),
      body: [
        '✨ *Deskripsi Keahlian:*',
        desc,
        LINE,
        '💡 *Cara Menggunakan:*',
        `Ketik \`${config.prefix}${skillName} <instruksi/keinginan kamu>\``,
        aliasText,
        LINE,
        '🚀 *Contoh Perintah:*',
        `• \`${config.prefix}${skillName} ${examplePrompt}\``,
      ].filter(Boolean).join('\n'),
      footer: 'Hermes 3 Autonomous Skill Runtime',
    }));
    return;
  }

  const instanceId = process.env.INSTANCE_ID;
  let cfg = null;
  let botOwnerUserId = null;
  if (instanceId) {
    try {
      const clusterManager = require('../server/clusterManager');
      const clusterDb = clusterManager.readClusterDb();
      const inst = clusterDb[instanceId];
      if (inst && inst.ownerUserId) {
        botOwnerUserId = inst.ownerUserId;
        cfg = hermesManager.getUserConfig(botOwnerUserId);
      }
    } catch (_) {}
  }
  if (!cfg) {
    cfg = hermesManager.getConfig();
  }

  if (!cfg.apiKey || cfg.apiKey.trim().length < 8) {
    await reply(warning(
      'Hermes AI Dinonaktifkan (API Key Belum Disetel)',
      `⚠️ *Hermes AI Skill Tidak Berjalan*\n\n` +
      `Bot ini tidak dapat menjalankan keahlian otonom karena akun pemilik bot belum memasang API Key pribadi.\n\n` +
      `📌 *Penjelasan:*\n` +
      `Setiap akun di platform ini beroperasi independen dan wajib menyetel API Key mandiri (Google Gemini / OpenRouter / Groq) agar tidak saling membebani kuota.\n\n` +
      `👉 *Solusi:*\n` +
      `Buka Web Dashboard Polaris ➔ Masuk menu *🧠 Hermes AI* atau *⚙️ Pengaturan Akun* ➔ Masukkan API Key Anda lalu klik Simpan. Bot akan langsung aktif!`
    ));
    return;
  }

  try {
    const result = await hermesAgent.runAutonomousAgent({
      prompt,
      senderNumber,
      chatJid,
      isGroup,
      groupName: isGroup ? (chatJid.split('@')[0]) : '',
      activeSkill: targetSkill,
      userConfig: cfg,
      apiKey: cfg.apiKey,
      userId: botOwnerUserId,
    });

    if (!result.success) {
      await reply(warning('Hermes Skill Gagal', result.error || 'Terjadi kendala pada eksekusi skill.'));
      return;
    }

    let toolBadges = '';
    if (result.steps && result.steps.length > 0) {
      const toolNames = Array.from(new Set(result.steps.map((s) => s.tool)));
      toolBadges = '\n\n⚙️ _Tools Dieksekusi: ' + toolNames.join(', ') + '_';
    }

    let artifactInfo = '';
    if (result.artifacts && result.artifacts.length > 0) {
      artifactInfo = '\n\n📁 *Artefak Fisik Dihasilkan:*\n' + result.artifacts.map((a) => '• `' + a.filename + '` (' + a.size + ')').join('\n');
    }

    const waFormatter = require('../lib/whatsappFormatter');
    const formattedResultText = waFormatter.formatForWhatsApp(result.text);

    const header = `🎨 *Hermes Activated Skill [${displayName}]*`;
    await reply(box({
      prefix: 'HERMES',
      statusTag: 'SKILL APPLIED',
      title: displayName,
      body: [
        header,
        LINE,
        formattedResultText,
        artifactInfo,
        toolBadges,
      ].filter(Boolean).join('\n'),
      footer: 'Model: ' + result.model + ' • Engine: ReAct Autonomous',
    }));

    // Kirim artefak fisik ke WhatsApp jika ada
    if (result.artifacts && result.artifacts.length > 0 && sock) {
      const fs = require('fs');
      const artifactManager = require('../lib/artifactManager');
      for (const art of result.artifacts) {
        try {
          const record = artifactManager.getArtifactById(art.id);
          if (record && record.filePath && fs.existsSync(record.filePath)) {
            const buf = fs.readFileSync(record.filePath);
            const isImg = ['png', 'jpg', 'jpeg'].includes(record.filetype);
            if (isImg) {
              await sock.sendMessage(chatJid, {
                image: buf,
                caption: '📁 *Artefak Skill [' + displayName + ']:* ' + record.filename + ' (' + record.size + ')',
              });
            } else {
              await sock.sendMessage(chatJid, {
                document: buf,
                mimetype: 'application/octet-stream',
                fileName: record.filename,
                caption: '📁 *Artefak Skill [' + displayName + ']:* ' + record.filename + ' (' + record.size + ')',
              });
            }
          }
        } catch (err) {
          console.error('[hermesSkillCommand] Gagal mengirim file artefak ke WA:', err.message);
        }
      }
    }
  } catch (err) {
    await reply(warning('Hermes Skill Error', err.message));
  }
}

module.exports = {
  handleHermesCommand,
  handleHermesSkillCommand,
};
