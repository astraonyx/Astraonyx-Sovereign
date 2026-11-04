// commands/belajar.js — Handler Perintah Modul Belajar & Polymath Genius
// .jadwal, .materi, .kuis

const config = require('../config');
const { getTodayCurriculum, WEEKLY_CURRICULUM, formatWibDate, broadcastDailyLesson } = require('../lib/ecosystemAcademyScheduler');
const { askAI } = require('../lib/aiHelper');
const waFormatter = require('../lib/whatsappFormatter');
const { box, success, warning, info } = require('../lib/messageStyle');

async function handleBelajarCommand(context, ...fallbackArgs) {
  let sock, chatJid, msg, command, args, reply, isOwner;
  if (context && typeof context === 'object' && ('sock' in context || 'reply' in context)) {
    sock = context.sock;
    chatJid = context.chatJid;
    msg = context.msg;
    command = context.command;
    args = Array.isArray(context.args) ? context.args : [];
    reply = context.reply;
    isOwner = context.isOwner;
  } else {
    sock = context;
    msg = fallbackArgs[0];
    command = (fallbackArgs[1] || '').replace(/^[!./#]/, '');
    args = Array.isArray(fallbackArgs[2]) ? fallbackArgs[2] : [];
    chatJid = msg?.key?.remoteJid;
    reply = async (t) => sock.sendMessage(chatJid, { text: typeof t === 'string' ? t : (t.text || '') });
    isOwner = false;
  }
  args = args || [];
  const sub = (args[0] || '').toLowerCase();

  // ==================== 1. COMMAND: .jadwal ====================
  if (command === 'jadwal' || (command === 'belajar' && sub === 'jadwal')) {
    const today = getTodayCurriculum();
    const dateFormatted = formatWibDate();

    const lines = [
      `🎓 *[ JADWAL KULIAH POLARIS POLYMATH ]*`,
      `📅 *Hari Ini:* ${dateFormatted}`,
      `🌟 *Fokus Hari Ini:* ${today.domain}`,
      `📖 *Topik:* ${today.topic}`,
      `──────────────────────────────`,
      `📋 *SILABUS MINGGUAN (7 HARI):*`,
    ];

    for (const c of WEEKLY_CURRICULUM) {
      const isToday = c.dayIndex === today.dayIndex ? '👉 *(HARI INI)*' : '';
      lines.push(`• *${c.dayName}* ${isToday}`);
      lines.push(`  └ ${c.domain}`);
      lines.push(`    _Fokus:_ ${c.topic}`);
    }

    lines.push(`──────────────────────────────`);
    lines.push(`⏰ *Sesi Kuliah & Kuis:* Setiap hari pukul 18:00 WIB.`);
    lines.push(`💡 _Di grup Polaris • Belajar & Polymath Genius, kamu bisa bertanya dan berdiskusi langsung tanpa prefix command!_`);

    await reply(lines.join('\n'));
    return true;
  }

  // ==================== 2. COMMAND: .kuis ====================
  if (command === 'kuis' || (command === 'belajar' && sub === 'kuis')) {
    if (args.length > 0 && sub !== 'kuis') {
      const { handleWaygroundCommand } = require('./wayground');
      return await handleWaygroundCommand(context);
    }

    const cur = getTodayCurriculum();
    await reply(`🧠 *Polymath Mentor sedang merancang tantangan kuis untuk topik "${cur.topic}"...*`);

    const prompt = `Sebagai Polaris Polymath Mentor, buatkan 1 soal kuis tantangan studi kasus interaktif untuk domain "${cur.domain}" (${cur.topic}).
Format:
1. 🎯 *SOAL / DILEMA KASUS*
2. ❓ *PERTANYAAN*
3. 💡 *CLUE ANALISIS*
Minta peserta untuk menjawab langsung di chat.`;

    const aiRes = await askAI(prompt, config, [], 'Kamu adalah Polaris Polymath Mentor Jenius.');
    if (aiRes.success && aiRes.text) {
      const formatted = waFormatter.formatForWhatsApp(aiRes.text);
      await reply([
        `🎯 *[ TANTANGAN KUIS POLYMATH GENIUS ]*`,
        `──────────────────────────────`,
        formatted,
        `──────────────────────────────`,
        `Ketik jawaban analisismu langsung di sini! Mentor akan mengoreksi dan memberikan feedback cerdas.`,
        ``,
        `💡 *Main kuis interaktif Wayground (skor & streak)? Ketik:* \`.wayground play\``,
      ].join('\n'));
    } else {
      await reply(warning('Gagal Mengambil Kuis', 'Mentor sedang sibuk, silakan coba beberapa saat lagi.'));
    }
    return true;
  }

  // ==================== 3. COMMAND: .materi ====================
  if (command === 'materi' || command === 'belajar') {
    const query = (command === 'belajar' && sub === 'materi' ? args.slice(1).join(' ') : args.join(' ')).trim();

    // Jika owner minta paksa broadcast jadwal hari ini jam 18:00
    if (query === 'siar' || query === 'broadcast' || query === 'hari-ini') {
      if (!isOwner) {
        await reply(warning('Akses Ditolak', 'Hanya Owner yang dapat memicu siaran materi harian secara manual.'));
        return true;
      }
      await reply(`🚀 *Menyiarkan modul belajar harian ke grup Polaris • Belajar & Polymath Genius...*`);
      const res = await broadcastDailyLesson(sock, true);
      if (res) {
        await reply(success('Siaran Berhasil', 'Modul belajar harian sukses dikirim dan diarsipkan ke Vault!'));
      } else {
        await reply(warning('Siaran Gagal', 'Pastikan grup Belajar & Polymath Genius sudah terdaftar di database ekosistem.'));
      }
      return true;
    }

    // Riset materi spesifik sesuai query user
    const targetTopic = query || getTodayCurriculum().topic;
    await reply(`🔍 *Polaris AI sedang meriset materi mendalam tentang "${targetTopic}"...*`);

    const prompt = `Sebagai Polaris Polymath Mentor, susunlah micro-lesson lengkap dan bernilai tinggi tentang "${targetTopic}".
Gunakan pendekatan First-Principles Thinking:
1. 🌟 *KONSEP KUNCI & ANALOGI INTUITIF*
2. ⚡ *3 PRINSIP TAKTIS & APLIKASI NYATA*
3. 🏛️ *CONTOH STUDI KASUS*
4. 💡 *KESIMPULAN EKSEKUTIF*

Gunakan bahasa Indonesia cerdas, elegan, terstruktur rapi.`;

    const aiRes = await askAI(prompt, config, [], 'Kamu adalah Polaris Polymath Mentor.');
    if (aiRes.success && aiRes.text) {
      const formatted = waFormatter.formatForWhatsApp(aiRes.text);
      await reply([
        `📚 *[ MATERI RISET POLYMATH GENIUS ]*`,
        `📖 *Topik:* ${targetTopic}`,
        `──────────────────────────────`,
        formatted,
        `──────────────────────────────`,
        `💡 _Ketik \`${config.prefix}jadwal\` untuk kurikulum harian atau \`${config.prefix}kuis\` untuk latihan otak!_`,
      ].join('\n'));
    } else {
      await reply(warning('Gagal Meriset Materi', 'Terjadi kendala saat meriset materi via AI. Silakan coba lagi.'));
    }
    return true;
  }

  return false;
}

module.exports = {
  handleBelajarCommand,
};
