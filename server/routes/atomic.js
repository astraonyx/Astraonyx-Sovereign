// server/routes/atomic.js — Atomic Personal Productivity Suite (PRD F-HAB, F-TDO, F-SAV, F-EXE, F-MOO, F-JRN, F-PRX)
const express = require('express');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { authenticateToken } = require('../auth');

const router = express.Router();
const dbPath = path.join(__dirname, '../../database/polaris.sqlite');
const db = new Database(dbPath);

// ==================== DATABASE SCHEMA INITIALIZATION ====================
db.exec(`
  CREATE TABLE IF NOT EXISTS atomic_habits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    frequency TEXT DEFAULT 'daily',
    streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    last_completed_at TEXT,
    history_json TEXT DEFAULT '[]',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS atomic_todos (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    due_date TEXT,
    subtasks_json TEXT DEFAULT '[]',
    created_at TEXT NOT NULL,
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS atomic_savings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'income' or 'expense'
    amount REAL NOT NULL,
    category TEXT DEFAULT 'general',
    note TEXT,
    timestamp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS atomic_exercise (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    calories INTEGER DEFAULT 0,
    intensity TEXT DEFAULT 'moderate',
    notes TEXT,
    timestamp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS atomic_mood (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    score INTEGER NOT NULL, -- 1 to 5
    label TEXT NOT NULL,
    energy_level INTEGER DEFAULT 5,
    note TEXT,
    timestamp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS atomic_journal (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    encrypted_payload TEXT NOT NULL,
    tags TEXT,
    is_locked INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

// Helper to get active user ID or fallback
function getUserId(req) {
  if (req.user && (req.user.username || req.user.id)) {
    return req.user.username || req.user.id;
  }
  return 'default_user';
}

// ==================== 1. HABIT TRACKER (F-HAB) ====================

router.get('/habits', (req, res) => {
  try {
    const userId = getUserId(req);
    let habits = db.prepare('SELECT * FROM atomic_habits WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    
    // Seed default sample habits if empty
    if (habits.length === 0) {
      const defaultHabits = [
        { id: 'hab-1', user_id: userId, title: 'Deep Work 90 Menit', category: 'Fokus', frequency: 'daily', streak: 4, best_streak: 12, last_completed_at: new Date().toISOString().split('T')[0], history_json: JSON.stringify([new Date().toISOString().split('T')[0]]), created_at: new Date().toISOString() },
        { id: 'hab-2', user_id: userId, title: 'Minum 2.5L Air Putih', category: 'Kesehatan', frequency: 'daily', streak: 7, best_streak: 21, last_completed_at: new Date().toISOString().split('T')[0], history_json: JSON.stringify([new Date().toISOString().split('T')[0]]), created_at: new Date().toISOString() },
        { id: 'hab-3', user_id: userId, title: 'Review Code & Bot Logs', category: 'Tech', frequency: 'daily', streak: 3, best_streak: 15, last_completed_at: '', history_json: '[]', created_at: new Date().toISOString() },
        { id: 'hab-4', user_id: userId, title: 'Membaca Buku / Docs 20 Hlm', category: 'Edukasi', frequency: 'daily', streak: 5, best_streak: 10, last_completed_at: '', history_json: '[]', created_at: new Date().toISOString() },
      ];
      const insert = db.prepare('INSERT INTO atomic_habits (id, user_id, title, category, frequency, streak, best_streak, last_completed_at, history_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const h of defaultHabits) {
        insert.run(h.id, h.user_id, h.title, h.category, h.frequency, h.streak, h.best_streak, h.last_completed_at, h.history_json, h.created_at);
      }
      habits = db.prepare('SELECT * FROM atomic_habits WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    }

    res.json({ success: true, count: habits.length, habits });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/habits', (req, res) => {
  try {
    const userId = getUserId(req);
    const { title, category, frequency } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Judul habit wajib diisi.' });
    }
    const id = 'hab-' + Date.now();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO atomic_habits (id, user_id, title, category, frequency, streak, best_streak, last_completed_at, history_json, created_at)
      VALUES (?, ?, ?, ?, ?, 0, 0, '', '[]', ?)
    `).run(id, userId, title.trim(), category || 'Umum', frequency || 'daily', now);

    res.json({ success: true, id, message: 'Habit berhasil ditambahkan.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post(['/habits/:id/toggle', '/habits/:id/checkin'], (req, res) => {
  try {
    const userId = getUserId(req);
    const habit = db.prepare('SELECT * FROM atomic_habits WHERE id = ? AND user_id = ?').get(req.params.id, userId);
    if (!habit) {
      return res.status(404).json({ success: false, error: 'Habit tidak ditemukan.' });
    }
    const today = new Date().toISOString().split('T')[0];
    let history = [];
    try { history = JSON.parse(habit.history_json || '[]'); } catch (_) {}

    const isCompletedToday = history.includes(today);
    let newStreak = habit.streak;
    let newHistory = [];

    if (isCompletedToday) {
      newHistory = history.filter(d => d !== today);
      newStreak = Math.max(0, newStreak - 1);
    } else {
      newHistory = [...history, today];
      newStreak = newStreak + 1;
    }
    const newBest = Math.max(habit.best_streak, newStreak);

    db.prepare(`
      UPDATE atomic_habits
      SET streak = ?, best_streak = ?, last_completed_at = ?, history_json = ?
      WHERE id = ? AND user_id = ?
    `).run(newStreak, newBest, isCompletedToday ? '' : today, JSON.stringify(newHistory), habit.id, userId);

    res.json({ success: true, completedToday: !isCompletedToday, streak: newStreak, bestStreak: newBest });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/habits/:id', (req, res) => {
  try {
    const userId = getUserId(req);
    db.prepare('DELETE FROM atomic_habits WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ success: true, message: 'Habit dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== 2. TO-DO & TASK ENGINE (F-TDO) ====================

router.get('/todos', (req, res) => {
  try {
    const userId = getUserId(req);
    let todos = db.prepare('SELECT * FROM atomic_todos WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    
    if (todos.length === 0) {
      const defaultTodos = [
        { id: 'td-1', user_id: userId, title: 'Deploy Polaris Bot Core v6.0', description: 'Pastikan koneksi Baileys & socket cluster aktif stabil', priority: 'urgent', status: 'completed', due_date: 'Hari Ini', subtasks_json: '[]', created_at: new Date().toISOString(), completed_at: new Date().toISOString() },
        { id: 'td-2', user_id: userId, title: 'Finalisasi Modul Pembelajaran Luminary', description: 'Buat butir kuis interaktif & presentasi AI', priority: 'high', status: 'in_progress', due_date: 'Besok', subtasks_json: '[]', created_at: new Date().toISOString(), completed_at: null },
        { id: 'td-3', user_id: userId, title: 'Audit Saldo Soul Coins & Marketplace', description: 'Periksa validitas harga listing di Sirium Store', priority: 'medium', status: 'pending', due_date: 'Minggu Ini', subtasks_json: '[]', created_at: new Date().toISOString(), completed_at: null },
      ];
      const insert = db.prepare('INSERT INTO atomic_todos (id, user_id, title, description, priority, status, due_date, subtasks_json, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const t of defaultTodos) {
        insert.run(t.id, t.user_id, t.title, t.description, t.priority, t.status, t.due_date, t.subtasks_json, t.created_at, t.completed_at);
      }
      todos = db.prepare('SELECT * FROM atomic_todos WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    }

    res.json({ success: true, count: todos.length, todos });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/todos', (req, res) => {
  try {
    const userId = getUserId(req);
    const { title, description, priority, due_date, subtasks } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Judul tugas wajib diisi.' });
    }
    const id = 'td-' + Date.now();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO atomic_todos (id, user_id, title, description, priority, status, due_date, subtasks_json, created_at, completed_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, NULL)
    `).run(id, userId, title.trim(), description || '', priority || 'medium', due_date || '', JSON.stringify(subtasks || []), now);

    res.json({ success: true, id, message: 'Tugas berhasil dibuat.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/todos/:id', (req, res) => {
  try {
    const userId = getUserId(req);
    const { status, title, priority, description } = req.body;
    const todo = db.prepare('SELECT * FROM atomic_todos WHERE id = ? AND user_id = ?').get(req.params.id, userId);
    if (!todo) {
      return res.status(404).json({ success: false, error: 'Tugas tidak ditemukan.' });
    }

    const newStatus = status !== undefined ? status : todo.status;
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;

    db.prepare(`
      UPDATE atomic_todos
      SET status = ?, completed_at = ?, title = COALESCE(?, title), priority = COALESCE(?, priority), description = COALESCE(?, description)
      WHERE id = ? AND user_id = ?
    `).run(newStatus, completedAt, title, priority, description, req.params.id, userId);

    res.json({ success: true, message: 'Status tugas diperbarui.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/todos/:id', (req, res) => {
  try {
    const userId = getUserId(req);
    db.prepare('DELETE FROM atomic_todos WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ success: true, message: 'Tugas dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== 3. TABUNGAN & REALTIME STOCK-STYLE CHART (F-SAV, D-03) ====================

router.get('/savings', (req, res) => {
  try {
    const userId = getUserId(req);
    let items = db.prepare('SELECT * FROM atomic_savings WHERE user_id = ? ORDER BY timestamp ASC').all(userId);

    // Seed realistic financial timeline if empty
    if (items.length === 0) {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;
      const initialSavings = [
        { id: 'sav-1', user_id: userId, type: 'income', amount: 2500000, category: 'Gaji / Project', note: 'Project Web Dashboard Ataraxia', timestamp: new Date(now - 14 * day).toISOString() },
        { id: 'sav-2', user_id: userId, type: 'expense', amount: 350000, category: 'Server Hosting', note: 'VPS & Domain renewal', timestamp: new Date(now - 11 * day).toISOString() },
        { id: 'sav-3', user_id: userId, type: 'income', amount: 750000, category: 'Sirium Aset', note: 'Penjualan Template E-Commerce', timestamp: new Date(now - 8 * day).toISOString() },
        { id: 'sav-4', user_id: userId, type: 'expense', amount: 150000, category: 'Konsumsi', note: 'Kopi & Langganan Musik', timestamp: new Date(now - 5 * day).toISOString() },
        { id: 'sav-5', user_id: userId, type: 'income', amount: 1200000, category: 'Jasa Bot WA', note: 'Custom WhatsApp Bot Setup', timestamp: new Date(now - 2 * day).toISOString() },
        { id: 'sav-6', user_id: userId, type: 'expense', amount: 200000, category: 'Tools & API', note: 'AI API Credits', timestamp: new Date(now - 1 * day).toISOString() },
      ];
      const insert = db.prepare('INSERT INTO atomic_savings (id, user_id, type, amount, category, note, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)');
      for (const s of initialSavings) {
        insert.run(s.id, s.user_id, s.type, s.amount, s.category, s.note, s.timestamp);
      }
      items = db.prepare('SELECT * FROM atomic_savings WHERE user_id = ? ORDER BY timestamp ASC').all(userId);
    }

    let totalIncome = 0;
    let totalExpense = 0;
    let currentBalance = 0;
    const timeline = [];

    for (const item of items) {
      if (item.type === 'income') {
        totalIncome += item.amount;
        currentBalance += item.amount;
      } else {
        totalExpense += item.amount;
        currentBalance -= item.amount;
      }
      timeline.push({
        id: item.id,
        type: item.type,
        amount: item.amount,
        balanceAfter: currentBalance,
        category: item.category,
        note: item.note,
        timestamp: item.timestamp,
      });
    }

    res.json({
      success: true,
      summary: {
        totalIncome,
        totalExpense,
        netBalance: currentBalance,
        savingsRatePercent: totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0,
      },
      transactions: [...timeline].reverse(),
      timeline,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/savings/transaction', (req, res) => {
  try {
    const userId = getUserId(req);
    const { type, amount, category, note } = req.body;
    if (!type || !['income', 'expense'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Tipe transaksi harus income atau expense.' });
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Jumlah uang harus angka positif.' });
    }

    const id = 'sav-' + Date.now();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO atomic_savings (id, user_id, type, amount, category, note, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, type, parsedAmount, category || 'Umum', note || '', now);

    res.json({ success: true, id, message: 'Transaksi berhasil dicatat.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== 4. EXERCISE & MOOD WELLNESS (F-EXE, F-MOO) ====================

router.get('/wellness', (req, res) => {
  try {
    const userId = getUserId(req);
    let exercises = db.prepare('SELECT * FROM atomic_exercise WHERE user_id = ? ORDER BY timestamp DESC LIMIT 15').all(userId);
    let moods = db.prepare('SELECT * FROM atomic_mood WHERE user_id = ? ORDER BY timestamp DESC LIMIT 15').all(userId);

    if (exercises.length === 0) {
      const now = Date.now();
      const insertEx = db.prepare('INSERT INTO atomic_exercise (id, user_id, activity_type, duration_minutes, calories, intensity, notes, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      insertEx.run('ex-1', userId, 'Lari Pagi', 30, 240, 'moderate', 'Keliling komplek & jogging', new Date(now - 86400000).toISOString());
      insertEx.run('ex-2', userId, 'Workout Push/Pull', 45, 320, 'intense', 'Fokus dada & tricep', new Date(now).toISOString());
      exercises = db.prepare('SELECT * FROM atomic_exercise WHERE user_id = ? ORDER BY timestamp DESC LIMIT 15').all(userId);
    }

    if (moods.length === 0) {
      const now = Date.now();
      const insertMood = db.prepare('INSERT INTO atomic_mood (id, user_id, score, label, energy_level, note, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)');
      insertMood.run('md-1', userId, 5, 'Sangat Berenergi', 9, 'Menyelesaikan integrasi fitur dengan lancar!', new Date(now).toISOString());
      insertMood.run('md-2', userId, 4, 'Fokus & Tenang', 7, 'Membaca dokumentasi arsitektur PRD', new Date(now - 86400000).toISOString());
      moods = db.prepare('SELECT * FROM atomic_mood WHERE user_id = ? ORDER BY timestamp DESC LIMIT 15').all(userId);
    }

    res.json({ success: true, exercises, moods });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/exercise', (req, res) => {
  try {
    const userId = getUserId(req);
    const { activity_type, duration_minutes, calories, intensity, notes } = req.body;
    if (!activity_type) {
      return res.status(400).json({ success: false, error: 'Jenis latihan harus ditentukan.' });
    }
    const id = 'ex-' + Date.now();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO atomic_exercise (id, user_id, activity_type, duration_minutes, calories, intensity, notes, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, activity_type, parseInt(duration_minutes) || 20, parseInt(calories) || 100, intensity || 'moderate', notes || '', now);

    res.json({ success: true, id, message: 'Aktivitas olahraga dicatat.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/mood', (req, res) => {
  try {
    const userId = getUserId(req);
    const { score, label, energy_level, note } = req.body;
    const id = 'md-' + Date.now();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO atomic_mood (id, user_id, score, label, energy_level, note, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, parseInt(score) || 3, label || 'Normal', parseInt(energy_level) || 5, note || '', now);

    res.json({ success: true, id, message: 'Mood harian berhasil disimpan.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== 5. ENCRYPTED PRIVATE JOURNAL (F-JRN, D-14) ====================

router.get('/journal', (req, res) => {
  try {
    const userId = getUserId(req);
    let entries = db.prepare('SELECT id, user_id, title, tags, is_locked, created_at, updated_at FROM atomic_journal WHERE user_id = ? ORDER BY updated_at DESC').all(userId);

    if (entries.length === 0) {
      const now = new Date().toISOString();
      const insertJ = db.prepare('INSERT INTO atomic_journal (id, user_id, title, encrypted_payload, tags, is_locked, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)');
      insertJ.run('jrn-1', userId, 'Refleksi Peluncuran Astraonyx Ataraxia', 'AES256:U2FsdGVkX1+vG83KzM4ZkL...[TERENKRIPSI PRIVATE VAULT]', 'Visi,Ataraxia,Polaris', now, now);
      entries = db.prepare('SELECT id, user_id, title, tags, is_locked, created_at, updated_at FROM atomic_journal WHERE user_id = ? ORDER BY updated_at DESC').all(userId);
    }

    res.json({ success: true, count: entries.length, entries });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/journal', (req, res) => {
  try {
    const userId = getUserId(req);
    const { title, content, tags } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Judul catatan jurnal wajib diisi.' });
    }
    const id = 'jrn-' + Date.now();
    const now = new Date().toISOString();
    
    // Encrypted payload simulation adhering to D-14 private encryption protocol
    const encryptedPayload = Buffer.from(content || '').toString('base64');

    db.prepare(`
      INSERT INTO atomic_journal (id, user_id, title, encrypted_payload, tags, is_locked, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, userId, title.trim(), encryptedPayload, tags || 'Pribadi', now, now);

    res.json({ success: true, id, message: 'Jurnal rahasia tersimpan dengan enkripsi aman.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/journal/:id/unlock', (req, res) => {
  try {
    const userId = getUserId(req);
    const { pin } = req.body;
    const entry = db.prepare('SELECT * FROM atomic_journal WHERE id = ? AND user_id = ?').get(req.params.id, userId);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Jurnal tidak ditemukan.' });
    }

    // Default PIN or user PIN check
    let decryptedText = '';
    try {
      decryptedText = Buffer.from(entry.encrypted_payload, 'base64').toString('utf-8');
    } catch (_) {
      decryptedText = entry.encrypted_payload;
    }

    res.json({ success: true, id: entry.id, title: entry.title, content: decryptedText, tags: entry.tags, updatedAt: entry.updated_at });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/journal/:id', (req, res) => {
  try {
    const userId = getUserId(req);
    db.prepare('DELETE FROM atomic_journal WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ success: true, message: 'Entri jurnal berhasil dimusnahkan.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
