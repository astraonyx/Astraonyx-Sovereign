// server/routes/wayground.js — API Routes for Wayground (Quizizz) & Luminary Studyspace
const express = require('express');
const {
  DEFAULT_QUIZZES,
  generateQuizWithAI,
  createLobby,
  getLobby,
  joinLobby,
  submitLobbyAnswer,
  updateLobbyState,
  waygroundQueries
} = require('../waygroundEngine');
const { authenticateToken } = require('../auth');

const waygroundRouter = express.Router();

/**
 * GET /api/wayground/quizzes
 * Mengambil seluruh daftar kuis dengan filter pencarian dan kategori
 */
waygroundRouter.get('/quizzes', (req, res) => {
  try {
    const { search, category } = req.query;
    let quizzes = waygroundQueries.getAllQuizzes(search || '', category || 'all');
    if (quizzes.length === 0 && (!search || search === '') && (!category || category === 'all')) {
      // Re-seed fallback
      for (const q of DEFAULT_QUIZZES) {
        waygroundQueries.saveQuiz(q);
      }
      quizzes = waygroundQueries.getAllQuizzes('', 'all');
    }
    res.json({ success: true, count: quizzes.length, quizzes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/wayground/quizzes/:id
 * Mengambil detail kuis lengkap beserta butir soal
 */
waygroundRouter.get('/quizzes/:id', (req, res) => {
  try {
    const quiz = waygroundQueries.getQuizById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Kuis tidak ditemukan.' });
    }
    res.json({ success: true, quiz });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/wayground/quizzes
 * Membuat atau memperbarui kuis custom
 */
waygroundRouter.post('/quizzes', (req, res) => {
  try {
    const { id, title, description, category, topic, icon, time_limit, difficulty, questions, author } = req.body;
    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, error: 'Judul kuis dan minimal 1 butir pertanyaan wajib diisi.' });
    }

    const quizObj = {
      id: id || `wg_custom_${Date.now()}`,
      title: String(title).trim(),
      description: String(description || '').trim(),
      category: String(category || 'general'),
      topic: String(topic || title).trim(),
      icon: String(icon || '📚'),
      time_limit: Number(time_limit) || 30,
      difficulty: String(difficulty || 'medium'),
      questions: questions.map((q, idx) => ({
        ...q,
        id: q.id || `q_${Date.now()}_${idx + 1}`,
        type: q.type || 'multiple_choice',
        question: String(q.question || `Pertanyaan ${idx + 1}`),
        options: Array.isArray(q.options) ? q.options : (q.options || ['A', 'B', 'C', 'D']),
        correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : 0,
        explanation: String(q.explanation || ''),
        hint: String(q.hint || ''),
        points: Number(q.points) || 1000
      })),
      author: String(author || 'Polaris Scholar').trim(),
    };

    const saved = waygroundQueries.saveQuiz(quizObj);
    res.json({ success: true, message: 'Kuis berhasil disimpan!', quiz: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/wayground/quizzes/:id
 * Menghapus kuis custom
 */
waygroundRouter.delete('/quizzes/:id', (req, res) => {
  try {
    waygroundQueries.deleteQuiz(req.params.id);
    res.json({ success: true, message: 'Kuis berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/wayground/generate
 * Membuat kuis otomatis menggunakan AI / Analisis Dokumen Teks / PDF
 */
waygroundRouter.post('/generate', async (req, res) => {
  try {
    const { topic, text, questionCount, difficulty, language } = req.body;
    if (!topic && !text) {
      return res.status(400).json({ success: false, error: 'Topik atau konten dokumen wajib disertakan.' });
    }

    const result = await generateQuizWithAI({
      topic,
      text,
      questionCount: parseInt(questionCount, 10) || 5,
      difficulty: difficulty || 'medium',
      language: language || 'id'
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/wayground/play/submit
 * Menyimpan hasil sesi permainan kuis (Solo Mode / Flashcards)
 */
waygroundRouter.post('/play/submit', (req, res) => {
  try {
    const {
      quiz_id,
      quiz_title,
      mode,
      player_name,
      score,
      total_questions,
      correct_count,
      incorrect_count,
      accuracy,
      time_spent,
      streak_record,
      answers
    } = req.body;

    const entry = {
      id: `wgh_${Date.now()}`,
      quiz_id: quiz_id || 'unknown',
      quiz_title: quiz_title || 'Untitled Quiz',
      mode: mode || 'solo',
      player_name: player_name || 'Scholar',
      score: Number(score) || 0,
      total_questions: Number(total_questions) || 0,
      correct_count: Number(correct_count) || 0,
      incorrect_count: Number(incorrect_count) || 0,
      accuracy: Number(accuracy) || 0,
      time_spent: Number(time_spent) || 0,
      streak_record: Number(streak_record) || 0,
      answers: answers || []
    };

    waygroundQueries.saveHistory(entry);
    const updatedStats = waygroundQueries.getStats();

    res.json({ success: true, message: 'Hasil sesi berhasil disimpan!', historyId: entry.id, stats: updatedStats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/wayground/history
 * Mengambil histori sesi permainan dan ringkasan metrik statistik
 */
waygroundRouter.get('/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 30;
    const history = waygroundQueries.getHistory(limit);
    const stats = waygroundQueries.getStats();
    res.json({ success: true, stats, history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/wayground/lobby/create
 * Membuat lobi multiplayer baru dengan Game PIN
 */
waygroundRouter.post('/lobby/create', (req, res) => {
  try {
    const { quizId, hostName } = req.body;
    if (!quizId) {
      return res.status(400).json({ success: false, error: 'quizId wajib disertakan.' });
    }
    const lobby = createLobby({ quizId, hostName: hostName || 'Host' });
    res.json({ success: true, lobby });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/wayground/lobby/:pin
 * Mengambil status lobi live
 */
waygroundRouter.get('/lobby/:pin', (req, res) => {
  try {
    const lobby = getLobby(req.params.pin);
    if (!lobby) {
      return res.status(404).json({ success: false, error: 'Lobi tidak ditemukan.' });
    }
    res.json({ success: true, lobby });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/wayground/lobby/:pin/join
 * Pemain bergabung ke dalam lobi live
 */
waygroundRouter.post('/lobby/:pin/join', (req, res) => {
  try {
    const { playerName, avatar } = req.body;
    const result = joinLobby({
      pin: req.params.pin,
      playerName: (playerName || 'Player').trim(),
      avatar: avatar || '🦊'
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/wayground/lobby/:pin/answer
 * Pemain mengirim jawaban pada pertanyaan lobi
 */
waygroundRouter.post('/lobby/:pin/answer', (req, res) => {
  try {
    const { playerId, questionIndex, isCorrect, timeRemaining, points } = req.body;
    const result = submitLobbyAnswer({
      pin: req.params.pin,
      playerId,
      questionIndex: Number(questionIndex) || 0,
      isCorrect: Boolean(isCorrect),
      timeRemaining: Number(timeRemaining) || 0,
      points: Number(points) || 1000
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/wayground/lobby/:pin/state
 * Memperbarui status jalannya lobi (mulai, next question, tamat)
 */
waygroundRouter.post('/lobby/:pin/state', (req, res) => {
  try {
    const { status, currentQuestion } = req.body;
    const lobby = updateLobbyState({
      pin: req.params.pin,
      status,
      currentQuestion
    });
    res.json({ success: true, lobby });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==================== LUMINARY PROJECT TRACKING (PRD F-PRJ, D-42) ====================
// Struktur wajib: Project → Task → Subtask → Progress → Documentation (opsional: video, foto, suara, file)
const path = require('path');
const Database = require('better-sqlite3');
const dbPath = path.join(__dirname, '../../database/polaris.sqlite');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS luminary_projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Academy',
    creator TEXT NOT NULL,
    progress INTEGER DEFAULT 0,
    tasks_json TEXT DEFAULT '[]',
    docs_json TEXT DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

// Seed sample project if empty
try {
  const pCount = db.prepare('SELECT count(*) as cnt FROM luminary_projects').get().cnt;
  if (pCount === 0) {
    const defaultProject = {
      id: 'prj-1',
      title: 'Pembuatan Robot WhatsApp Terpadu Ataraxia',
      description: 'Membangun bot cerdas berbasis Baileys & AI hermes autonomous.',
      category: 'Teknologi & Bot',
      creator: 'Cosmos',
      progress: 75,
      tasks_json: JSON.stringify([
        {
          id: 'tsk-1',
          title: 'Setup Baileys Auth & Credentials',
          status: 'completed',
          subtasks: [
            { id: 'sub-1', title: 'Generate QR code canvas', completed: true },
            { id: 'sub-2', title: 'Pairing code multi-session', completed: true }
          ]
        },
        {
          id: 'tsk-2',
          title: 'Integrasi Multi-Key Fallback Hermes',
          status: 'in_progress',
          subtasks: [
            { id: 'sub-3', title: 'Deep research grounding', completed: true },
            { id: 'sub-4', title: 'Auto-retry token exhaustion', completed: false }
          ]
        }
      ]),
      docs_json: JSON.stringify([
        { id: 'doc-1', title: 'Diagram Arsitektur Baileys Multi-Session', type: 'image', url: '/assets/icons/polaris.png', timestamp: new Date().toISOString() },
        { id: 'doc-2', title: 'Catatan Spesifikasi PRD v1.0', type: 'document', url: '#', timestamp: new Date().toISOString() }
      ]),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.prepare('INSERT INTO luminary_projects (id, title, description, category, creator, progress, tasks_json, docs_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      defaultProject.id, defaultProject.title, defaultProject.description, defaultProject.category, defaultProject.creator, defaultProject.progress, defaultProject.tasks_json, defaultProject.docs_json, defaultProject.created_at, defaultProject.updated_at
    );
  }
} catch (e) {
  console.error('[wayground] Gagal seed project:', e.message);
}

waygroundRouter.get('/projects', (req, res) => {
  try {
    const projects = db.prepare('SELECT * FROM luminary_projects ORDER BY updated_at DESC').all();
    res.json({ success: true, count: projects.length, projects });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

waygroundRouter.post('/projects', (req, res) => {
  try {
    const { title, description, category, creator } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Judul project wajib diisi.' });
    }
    const id = 'prj-' + Date.now();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO luminary_projects (id, title, description, category, creator, progress, tasks_json, docs_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, '[]', '[]', ?, ?)
    `).run(id, title.trim(), description || '', category || 'Akademik', creator || 'Cosmos', now, now);

    res.json({ success: true, id, message: 'Project berhasil dibuat.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

waygroundRouter.post('/projects/:id/tasks', (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM luminary_projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ success: false, error: 'Project tidak ditemukan.' });

    const { taskTitle, subtasks } = req.body;
    let tasks = [];
    try { tasks = JSON.parse(project.tasks_json || '[]'); } catch (_) {}

    const newTask = {
      id: 'tsk-' + Date.now(),
      title: taskTitle || 'Tugas Baru',
      status: 'pending',
      subtasks: (subtasks || []).map((s, idx) => ({ id: `sub-${Date.now()}-${idx}`, title: s, completed: false }))
    };
    tasks.push(newTask);

    const now = new Date().toISOString();
    db.prepare('UPDATE luminary_projects SET tasks_json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(tasks), now, req.params.id);
    res.json({ success: true, task: newTask });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

waygroundRouter.post('/projects/:id/documentation', (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM luminary_projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ success: false, error: 'Project tidak ditemukan.' });

    const { title, type, url } = req.body;
    let docs = [];
    try { docs = JSON.parse(project.docs_json || '[]'); } catch (_) {}

    const newDoc = {
      id: 'doc-' + Date.now(),
      title: title || 'Dokumentasi File',
      type: type || 'file', // video, foto, suara, file (D-42)
      url: url || '',
      timestamp: new Date().toISOString()
    };
    docs.push(newDoc);

    const now = new Date().toISOString();
    db.prepare('UPDATE luminary_projects SET docs_json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(docs), now, req.params.id);
    res.json({ success: true, doc: newDoc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = waygroundRouter;
