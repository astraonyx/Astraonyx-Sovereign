// commands/wayground.js — Wayground (Quizizz) Learning Suite & Assessment Engine for WhatsApp
const {
  DEFAULT_QUIZZES,
  generateQuizWithAI,
  createLobby,
  getLobby,
  waygroundQueries
} = require('../server/waygroundEngine');
const waFormatter = require('../lib/whatsappFormatter');
const { box, success, warning, info } = require('../lib/messageStyle');

// Active WhatsApp Quiz Sessions: Key = `${chatJid}_${senderNumber}`
const activeSessions = new Map();

/**
 * Main Command Handler for Wayground
 */
async function handleWaygroundCommand(context) {
  const { sock, chatJid, msg, command, args, reply, senderNumber, isOwner } = context;
  const cleanCmd = String(command || '').toLowerCase().replace(/^[!./#]/, '');
  const sub = (args[0] || '').toLowerCase().trim();
  const sessionKey = `${chatJid}_${senderNumber || 'user'}`;

  // ==================== 1. JIKA USER SEDANG DI DALAM SESI KUIS ====================
  if (activeSessions.has(sessionKey)) {
    const session = activeSessions.get(sessionKey);
    const textAnswer = (sub || args.join(' ') || '').toLowerCase().trim();

    // Cek perintah stop
    if (textAnswer === 'stop' || textAnswer === 'keluar' || textAnswer === 'batal') {
      activeSessions.delete(sessionKey);
      await reply(`🛑 *Sesi kuis Wayground dihentikan.*\nSkor yang terkumpul sejauh ini: *${session.score} Pts*.`);
      return true;
    }

    // Cek jawaban: 'a'/'1', 'b'/'2', 'c'/'3', 'd'/'4'
    const optionMap = { a: 0, b: 1, c: 2, d: 3, '1': 0, '2': 1, '3': 2, '4': 3 };
    if (textAnswer in optionMap) {
      const selectedIndex = optionMap[textAnswer];
      await evaluateAnswer(session, selectedIndex, context, sessionKey);
      return true;
    }
  }

  // ==================== 2. MENU UTAMA WAYGROUND ====================
  if (!sub || sub === 'help' || sub === 'menu') {
    const stats = waygroundQueries.getStats();
    const menuLines = [
      `🌟 *[ LUMINARY • WAYGROUND ACADEMY ]* 🌟`,
      `_Platform Kuis Interaktif, Flashcards & Arena Belajar Cerdas_`,
      `──────────────────────────────`,
      `🎮 *FITUR UTAMA WAYGROUND:*`,
      `• *.wayground play <id/nomor>*`,
      `  └ Mainkan kuis interaktif solo dengan skoring dan streak`,
      `• *.wayground ai <topik>*`,
      `  └ Buat kuis otomatis dengan AI tentang topik apa saja`,
      `• *.wayground host <id>*`,
      `  └ Buat Game PIN live untuk tantangan grup / dashboard`,
      `• *.wayground flashcard <id>*`,
      `  └ Buka kartu belajar cepat (Spaced Repetition)`,
      `• *.wayground list*`,
      `  └ Lihat katalog seluruh kuis yang tersedia`,
      `• *.wayground stats*`,
      `  └ Cek statistik akurasi, total sesi & XP belajarmu`,
      `──────────────────────────────`,
      `📊 *STATISTIK GLOBAL:*`,
      `• Total Kuis Tersedia: *${stats.totalQuizzes || 8}* Modul`,
      `• Total Sesi Dimainkan: *${stats.totalSessions || 0}* Kali`,
      `• Rata-rata Akurasi: *${stats.avgAccuracy || 0}%*`,
      `──────────────────────────────`,
      `💡 _Ketik *.wayground play 1* untuk langsung memulai kuis pertama!_`,
    ];
    await reply(menuLines.join('\n'));
    return true;
  }

  // ==================== 3. DAFTAR KUIS (.wayground list) ====================
  if (sub === 'list' || sub === 'katalog') {
    const quizzes = waygroundQueries.getAllQuizzes();
    const listLines = [
      `📚 *[ KATALOG KUIS WAYGROUND TERSEDIA ]*`,
      `──────────────────────────────`,
    ];

    quizzes.slice(0, 10).forEach((q, idx) => {
      listLines.push(`*${idx + 1}. ${q.icon || '📖'} ${q.title}*`);
      listLines.push(`   🆔 \`${q.id}\` | 🏷️ ${q.category.toUpperCase()} | ⏱️ ${q.time_limit}s`);
      listLines.push(`   ❓ ${q.questions?.length || 0} Soal • _${q.description || ''}_`);
      listLines.push('');
    });

    listLines.push(`──────────────────────────────`);
    listLines.push(`👉 _Untuk main: ketik *.wayground play <nomor/id>_*`);
    listLines.push(`👉 _Contoh: *.wayground play 1* atau *.wayground play wg_fullstack*_`);
    await reply(listLines.join('\n'));
    return true;
  }

  // ==================== 4. MAIN KUIS SOLO (.wayground play <id>) ====================
  if (sub === 'play' || sub === 'main' || sub === 'start' || cleanCmd === 'kuis') {
    let quizQuery = args[1] || (cleanCmd === 'kuis' ? args[0] : null);
    const quizzes = waygroundQueries.getAllQuizzes();

    let targetQuiz = null;
    if (quizQuery) {
      const num = parseInt(quizQuery, 10);
      if (!isNaN(num) && num >= 1 && num <= quizzes.length) {
        targetQuiz = quizzes[num - 1];
      } else {
        targetQuiz = quizzes.find(q => q.id === quizQuery || q.title.toLowerCase().includes(quizQuery.toLowerCase()));
      }
    }

    if (!targetQuiz) {
      // Default pilih kuis pertama jika tidak ditentukan
      targetQuiz = quizzes[0] || DEFAULT_QUIZZES[0];
    }

    // Inisialisasi sesi baru
    const session = {
      quiz: targetQuiz,
      currentIndex: 0,
      totalQuestions: targetQuiz.questions.length,
      score: 0,
      streak: 0,
      correctCount: 0,
      incorrectCount: 0,
      startTime: Date.now(),
      questionStartTime: Date.now(),
      answers: [],
      userName: senderNumber || 'Scholar'
    };

    activeSessions.set(sessionKey, session);

    await reply([
      `🚀 *[ MEMULAI KUIS WAYGROUND ]*`,
      `📚 *${targetQuiz.title}*`,
      `🎯 *Topik:* ${targetQuiz.topic}`,
      `❓ *Total:* ${session.totalQuestions} Pertanyaan`,
      `⏱️ *Batas Waktu:* ${targetQuiz.time_limit} Detik per soal`,
      `──────────────────────────────`,
      `Siapkan fokusmu! Pertanyaan pertama akan segera muncul...`
    ].join('\n'));

    // Kirim pertanyaan pertama
    await sendNextQuestion(session, context);
    return true;
  }

  // ==================== 5. GENERATE DENGAN AI (.wayground ai <topik>) ====================
  if (sub === 'ai' || sub === 'bikin' || sub === 'generate') {
    const topic = args.slice(1).join(' ').trim();
    if (!topic) {
      await reply(warning('Topik Kosong', 'Tentukan topik kuis yang ingin dibuat dengan AI.\n\nContoh:\n*.wayground ai Quantum Computing*\n*.wayground ai JavaScript ES2024*'));
      return true;
    }

    await reply(`🧠 *Wayground AI Studio sedang merancang kuis cerdas seputar "${topic}"... Mohon tunggu sejenak.*`);

    try {
      const genResult = await generateQuizWithAI({
        topic,
        questionCount: 5,
        difficulty: 'medium',
        language: 'id'
      });

      if (genResult && genResult.quiz) {
        const generatedQuiz = genResult.quiz;
        // Langsung mulai kuis yang baru saja digenerate
        const session = {
          quiz: generatedQuiz,
          currentIndex: 0,
          totalQuestions: generatedQuiz.questions.length,
          score: 0,
          streak: 0,
          correctCount: 0,
          incorrectCount: 0,
          startTime: Date.now(),
          questionStartTime: Date.now(),
          answers: [],
          userName: senderNumber || 'Scholar'
        };

        activeSessions.set(sessionKey, session);

        await reply([
          `✨ *[ KUIS AI BERHASIL DIBUAT! ]*`,
          `📚 *${generatedQuiz.title}*`,
          `📖 _${generatedQuiz.description}_`,
          `──────────────────────────────`,
          `Kuis langsung dimulai! Pertanyaan pertama:`
        ].join('\n'));

        await sendNextQuestion(session, context);
        return true;
      }
    } catch (err) {
      await reply(warning('Gagal Generate', `Terjadi kendala saat merancang kuis: ${err.message}`));
      return true;
    }
  }

  // ==================== 6. HOST LIVE MULTIPLAYER GAME PIN (.wayground host <id>) ====================
  if (sub === 'host' || sub === 'mabar' || sub === 'battle') {
    let quizQuery = args[1];
    const quizzes = waygroundQueries.getAllQuizzes();
    let targetQuiz = null;

    if (quizQuery) {
      const num = parseInt(quizQuery, 10);
      if (!isNaN(num) && num >= 1 && num <= quizzes.length) {
        targetQuiz = quizzes[num - 1];
      } else {
        targetQuiz = quizzes.find(q => q.id === quizQuery);
      }
    }

    if (!targetQuiz) targetQuiz = quizzes[0] || DEFAULT_QUIZZES[0];

    try {
      const lobby = createLobby({ quizId: targetQuiz.id, hostName: senderNumber || 'WA Host' });
      const hostMsg = [
        `🎮 *[ WAYGROUND LIVE MULTIPLAYER LOBBY ]* 🎮`,
        `──────────────────────────────`,
        `🔑 *GAME PIN: [ ${lobby.pin} ]*`,
        `📚 *Kuis:* ${targetQuiz.title}`,
        `❓ *Jumlah Soal:* ${targetQuiz.questions.length} Soal`,
        `👤 *Host:* ${lobby.host_name}`,
        `──────────────────────────────`,
        `🚀 *CARA BERGABUNG:*`,
        `1. Buka Web Dashboard Polaris di tab *Luminary (Study Space)*`,
        `2. Masukkan Game PIN *${lobby.pin}* pada kolom PIN Join`,
        `3. Atau jawab bersama di grup ini saat sesi live dimulai!`,
        `──────────────────────────────`,
        `💡 _PIN ini valid dan aktif di server sekarang._`
      ].join('\n');

      await reply(hostMsg);
      return true;
    } catch (err) {
      await reply(warning('Gagal Membuat Lobi', err.message));
      return true;
    }
  }

  // ==================== 7. FLASHCARDS REVIEW (.wayground flashcard <id>) ====================
  if (sub === 'flashcard' || sub === 'kartu' || cleanCmd === 'flashcard') {
    let quizQuery = args[1] || (cleanCmd === 'flashcard' ? args[0] : null);
    const quizzes = waygroundQueries.getAllQuizzes();
    let targetQuiz = quizzes[0];

    if (quizQuery) {
      const num = parseInt(quizQuery, 10);
      if (!isNaN(num) && num >= 1 && num <= quizzes.length) {
        targetQuiz = quizzes[num - 1];
      } else {
        targetQuiz = quizzes.find(q => q.id === quizQuery) || quizzes[0];
      }
    }

    const randomQ = targetQuiz.questions[Math.floor(Math.random() * targetQuiz.questions.length)];
    const cardMsg = [
      `🎴 *[ WAYGROUND FLASHCARD DECK ]*`,
      `📚 *Topik:* ${targetQuiz.title}`,
      `──────────────────────────────`,
      `❓ *PERTANYAAN / KARTU DEPAN:*`,
      `${randomQ.question}`,
      `──────────────────────────────`,
      `💡 *CLUE:* _${randomQ.hint || 'Pikirkan konsep dasarnya'}_`,
      `──────────────────────────────`,
      `✅ *JAWABAN & PENJELASAN (KARTU BELAKANG):*`,
      `*Opsi Benar:* ${randomQ.options[randomQ.correctAnswer]}`,
      `_${randomQ.explanation}_`,
      `──────────────────────────────`,
      `Ketik *.wayground flashcard* lagi untuk kartu berikutnya!`
    ].join('\n');

    await reply(cardMsg);
    return true;
  }

  // ==================== 8. STATISTIK AKUN (.wayground stats) ====================
  if (sub === 'stats' || sub === 'rank' || sub === 'skor') {
    const stats = waygroundQueries.getStats();
    await reply([
      `📊 *[ STATISTIK PEMBELAJARAN WAYGROUND ]*`,
      `──────────────────────────────`,
      `🎮 Total Sesi Dimainkan: *${stats.totalSessions}* Kali`,
      `✨ Total Akumulasi Skor: *${Number(stats.totalScore).toLocaleString('id-ID')}* XP`,
      `🎯 Rata-rata Akurasi: *${stats.avgAccuracy}%*`,
      `✅ Total Soal Benar: *${stats.totalCorrect}* dari ${stats.totalQuestions}`,
      `📚 Modul Kuis Aktif: *${stats.totalQuizzes}* Materi`,
      `──────────────────────────────`,
      `Tingkat Master: *${stats.avgAccuracy >= 80 ? '🌟 Polymath Genius' : stats.avgAccuracy >= 60 ? '🎓 Senior Scholar' : '🌱 Academic Apprentice'}*`
    ].join('\n'));
    return true;
  }

  return false;
}

/**
 * Mengirimkan pertanyaan kuis berikutnya ke WhatsApp
 */
async function sendNextQuestion(session, context) {
  const { reply } = context;
  const currentQ = session.quiz.questions[session.currentIndex];
  session.questionStartTime = Date.now();

  const letters = ['🅰️', '🅱️', '🅲', '🅳'];
  const optionLines = currentQ.options.map((opt, i) => `${letters[i]} ${opt}`).join('\n');

  const msgContent = [
    `🎯 *[ WAYGROUND — PERTANYAAN ${session.currentIndex + 1}/${session.totalQuestions} ]*`,
    `📚 *${session.quiz.title}*`,
    `✨ Skor: *${session.score} Pts* | 🔥 Streak: *x${session.streak}*`,
    `──────────────────────────────`,
    `❓ *${currentQ.question}*`,
    ``,
    optionLines,
    `──────────────────────────────`,
    `💡 *Ketik A, B, C, atau D untuk menjawab!*`,
    `Ketik *.wayground stop* untuk berhenti.`
  ].join('\n');

  await reply(msgContent);
}

/**
 * Mengevaluasi jawaban peserta
 */
async function evaluateAnswer(session, selectedIndex, context, sessionKey) {
  const { reply } = context;
  const currentQ = session.quiz.questions[session.currentIndex];
  const isCorrect = selectedIndex === currentQ.correctAnswer;
  const elapsedSec = Math.round((Date.now() - session.questionStartTime) / 1000);
  const timeLimit = session.quiz.time_limit || 30;
  const timeRemaining = Math.max(0, timeLimit - elapsedSec);

  const letters = ['A', 'B', 'C', 'D'];

  if (isCorrect) {
    session.streak += 1;
    session.correctCount += 1;
    const speedBonus = Math.round(timeRemaining * 15);
    const streakBonus = Math.min((session.streak - 1) * 200, 1000);
    const addedPoints = 1000 + speedBonus + streakBonus;
    session.score += addedPoints;

    session.answers.push({
      questionIndex: session.currentIndex,
      isCorrect: true,
      timeRemaining,
      points: addedPoints
    });

    await reply([
      `🎉 *LUAR BIASA, BENAR!* (+${addedPoints.toLocaleString('id-ID')} Pts)`,
      `🔥 *Streak: x${session.streak}* (Bonus Kecepatan: +${speedBonus})`,
      `📖 *Penjelasan:* ${currentQ.explanation}`,
    ].join('\n'));
  } else {
    session.streak = 0;
    session.incorrectCount += 1;
    session.answers.push({
      questionIndex: session.currentIndex,
      isCorrect: false,
      timeRemaining: 0,
      points: 0
    });

    const correctLetter = letters[currentQ.correctAnswer];
    const correctText = currentQ.options[currentQ.correctAnswer];

    await reply([
      `❌ *KURANG TEPAT!* (Streak Terputus)`,
      `Jawaban yang benar adalah *${correctLetter}. ${correctText}*`,
      `📖 *Penjelasan:* ${currentQ.explanation}`,
    ].join('\n'));
  }

  session.currentIndex += 1;

  // Cek apakah masih ada soal berikutnya
  if (session.currentIndex < session.totalQuestions) {
    setTimeout(async () => {
      await sendNextQuestion(session, context);
    }, 1500);
  } else {
    // Sesi Kuis Selesai!
    activeSessions.delete(sessionKey);
    const totalTimeSec = Math.round((Date.now() - session.startTime) / 1000);
    const accuracy = Math.round((session.correctCount / session.totalQuestions) * 100);

    // Simpan ke SQLite Database
    waygroundQueries.saveHistory({
      id: `wgh_wa_${Date.now()}`,
      quiz_id: session.quiz.id,
      quiz_title: session.quiz.title,
      mode: 'whatsapp_solo',
      player_name: session.userName,
      score: session.score,
      total_questions: session.totalQuestions,
      correct_count: session.correctCount,
      incorrect_count: session.incorrectCount,
      accuracy,
      time_spent: totalTimeSec,
      streak_record: session.streak,
      answers: session.answers
    });

    let tierBadge = '🌱 Apprentice';
    if (accuracy >= 90) tierBadge = '🏆 Grandmaster Polymath';
    else if (accuracy >= 75) tierBadge = '🌟 Senior Scholar';
    else if (accuracy >= 50) tierBadge = '🎖️ Adept Scholar';

    const finishMsg = [
      `🏁 *[ SESI KUIS WAYGROUND SELESAI! ]* 🏁`,
      `──────────────────────────────`,
      `📚 *${session.quiz.title}*`,
      `👤 Pemain: *${session.userName}*`,
      `✨ Total Skor: *${session.score.toLocaleString('id-ID')} Pts*`,
      `🎯 Akurasi: *${accuracy}%* (${session.correctCount}/${session.totalQuestions} Benar)`,
      `⏱️ Waktu Pengerjaan: *${totalTimeSec} Detik*`,
      `🏅 Predikat: *${tierBadge}*`,
      `──────────────────────────────`,
      `🎉 Hasil rekaman sesi telah disimpan ke basis data Polaris Studyspace!`,
      `Ketik *.wayground play* untuk mencoba modul kuis lainnya!`
    ].join('\n');

    await reply(finishMsg);
  }
}

module.exports = {
  handleWaygroundCommand
};
