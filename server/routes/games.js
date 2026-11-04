// server/routes/games.js — Games Arena, Starlium AI, Mabar Online & Boss Raid
const express = require('express');
const {
  authenticateToken,
  requireWriteAccess,
  readUsers,
  normalizeRole,
  getRoleLevel,
} = require('../auth');
const { gameQueries, challengeQueries, raidQueries } = require('../db');
const { broadcastWs } = require('../wsServer');
const bossRaidEngine = require('../../lib/bossRaidEngine');

const gamesRouter = express.Router();
const raidRouter = express.Router();

// ==================== GAMES ARENA & STARLIUM AI (/api/games) ====================

// Ringkasan game arena
gamesRouter.get('/summary', authenticateToken, (req, res) => {
  try {
    const summary = gameQueries.getGameSummary();
    const userStats = gameQueries.getUserGameSummary ? gameQueries.getUserGameSummary(req.user.username) : null;
    res.json({ success: true, ...summary, userStats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Papan peringkat (leaderboard)
gamesRouter.get('/leaderboard/:gameType', authenticateToken, (req, res) => {
  try {
    const { gameType } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const leaderboard = gameQueries.getGameLeaderboard(gameType, limit);
    res.json({ success: true, gameType, leaderboard });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Rekam statistik match game
gamesRouter.post('/record', authenticateToken, (req, res) => {
  try {
    const { gameType, playerName, opponentType, difficulty, result: gameResult, score, durationSeconds, meta } = req.body;
    if (!gameType) return res.status(400).json({ success: false, error: 'gameType wajib diisi.' });
    gameQueries.recordGameStat({
      gameType,
      playerName: playerName || req.user.username || 'Guest',
      opponentType: opponentType || 'bot',
      difficulty: difficulty || 'normal',
      result: gameResult || 'completed',
      score: score || 0,
      durationSeconds: durationSeconds || 0,
      meta: meta || {},
    });
    res.json({ success: true, message: 'Game stat recorded.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Statistik pembelajaran AI Starlium
gamesRouter.get('/starlium/stats', authenticateToken, (req, res) => {
  try {
    const stats = gameQueries.getStarliumStats();
    res.json({ success: true, ...stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Simpan match ke dataset Starlium
gamesRouter.post('/starlium/save-match', authenticateToken, (req, res) => {
  try {
    gameQueries.saveStarliumMatch(req.body);
    res.json({ success: true, message: 'Match saved to Starlium learning database.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Buku pembuka catur Starlium
gamesRouter.get('/starlium/opening-book', authenticateToken, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const book = gameQueries.getStarliumOpeningBook(limit);
    res.json({ success: true, openingBook: book });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Ambil daftar calon lawan mabar (seluruh user terdaftar selain diri sendiri)
gamesRouter.get('/opponents', authenticateToken, (req, res) => {
  try {
    const users = readUsers();
    const opponents = users
      .filter(u => u.id !== req.user.id && !u.isBanned)
      .map(u => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName || u.username,
        avatarUrl: u.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(u.username)}`,
        role: normalizeRole(u.role),
        tierLevel: getRoleLevel(u.role),
      }));
    res.json({ success: true, opponents });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Kirim tantangan mabar
gamesRouter.post('/challenge/send', authenticateToken, (req, res) => {
  try {
    const { targetUsername, gameType, initialFen, customSeed } = req.body;
    if (!targetUsername || !gameType) {
      return res.status(400).json({ success: false, error: 'targetUsername dan gameType wajib diisi.' });
    }
    const users = readUsers();
    const targetUser = users.find(u => u.username.toLowerCase() === targetUsername.trim().toLowerCase());
    if (!targetUser) return res.status(404).json({ success: false, error: `Pengguna '${targetUsername}' tidak ditemukan.` });
    if (targetUser.id === req.user.id) return res.status(400).json({ success: false, error: 'Tidak dapat menantang diri sendiri.' });

    const challengeId = 'ch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const nowMs = Date.now();
    const expiresAtMs = nowMs + 30000;

    const gameState = {
      gameType,
      fen: initialFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      moves: [],
      whitePlayer: req.user.username,
      blackPlayer: targetUser.username,
      whiteId: req.user.id,
      blackId: targetUser.id,
      turn: 'w',
      customSeed: customSeed || Math.random().toString(36).substring(2, 9),
      createdAtMs: nowMs,
      expiresAtMs,
    };

    challengeQueries.create({
      id: challengeId,
      challengerId: req.user.id,
      challengerUsername: req.user.username,
      challengedId: targetUser.id,
      challengedUsername: targetUser.username,
      gameType,
      gameStateJson: JSON.stringify(gameState),
    });

    broadcastWs('GAME_CHALLENGE', {
      challengeId,
      challengerUsername: req.user.username,
      challengerDisplayName: req.user.displayName || req.user.username,
      challengerAvatarUrl: req.user.avatarUrl || '',
      challengedId: targetUser.id,
      challengedUsername: targetUser.username,
      gameType,
      expiresAtMs,
      timeoutSeconds: 30,
    }, { to: [req.user.id, targetUser.id] });

    res.json({
      success: true,
      challengeId,
      expiresAtMs,
      timeoutSeconds: 30,
      targetUsername: targetUser.username,
      message: `Tantangan ${gameType.toUpperCase()} berhasil dikirim ke @${targetUser.username}! Menunggu respon 30 detik...`
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Cek status tantangan & hitung mundur
gamesRouter.get('/challenge/status/:id', authenticateToken, (req, res) => {
  try {
    const challenge = challengeQueries.getById(req.params.id);
    if (!challenge) return res.status(404).json({ success: false, error: 'Tantangan tidak ditemukan.' });

    let state = {};
    try { state = JSON.parse(challenge.game_state_json || '{}'); } catch (_) {}
    const now = Date.now();
    const createdTime = new Date(challenge.created_at).getTime();
    const expiresAtMs = state.expiresAtMs || (createdTime + 30000);
    let currentStatus = challenge.status;

    if (currentStatus === 'pending' && now > expiresAtMs) {
      currentStatus = 'expired';
      try { challengeQueries.updateStatus(challenge.id, 'expired'); } catch (_) {}
      broadcastWs('CHALLENGE_EXPIRED', { challengeId: challenge.id }, { to: [challenge.challenger_id, challenge.challenged_id] });
    }

    const remainingSeconds = Math.max(0, Math.ceil((expiresAtMs - now) / 1000));

    res.json({
      success: true,
      challengeId: challenge.id,
      status: currentStatus,
      gameType: challenge.game_type,
      challengerUsername: challenge.challenger_username,
      challengedUsername: challenge.challenged_username,
      remainingSeconds,
      isExpired: currentStatus === 'expired' || remainingSeconds <= 0,
      state,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Batalkan tantangan mabar
gamesRouter.post('/challenge/cancel', authenticateToken, (req, res) => {
  try {
    const { challengeId } = req.body;
    const challenge = challengeQueries.getById(challengeId);
    challengeQueries.cancel(challengeId, req.user.id);
    broadcastWs('CHALLENGE_CANCELLED', { challengeId }, { to: challenge ? [challenge.challenger_id, challenge.challenged_id] : [req.user.id] });
    res.json({ success: true, message: 'Tantangan berhasil dibatalkan.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Daftar tantangan mabar yang pending
gamesRouter.get('/challenge/pending', authenticateToken, (req, res) => {
  try {
    const list = challengeQueries.getPendingForUser(req.user.id);
    res.json({ success: true, challenges: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Respon tantangan mabar (terima/tolak)
gamesRouter.post('/challenge/respond', authenticateToken, (req, res) => {
  try {
    const { challengeId, accept } = req.body;
    const challenge = challengeQueries.getById(challengeId);
    if (!challenge) return res.status(404).json({ success: false, error: 'Tantangan tidak ditemukan.' });
    if (challenge.challenged_id !== req.user.id) return res.status(403).json({ success: false, error: 'Hanya yang ditantang yang dapat merespon.' });

    let state = {};
    try { state = JSON.parse(challenge.game_state_json || '{}'); } catch (_) {}
    const createdTime = new Date(challenge.created_at).getTime();
    const expiresAtMs = state.expiresAtMs || (createdTime + 30000);
    if (Date.now() > expiresAtMs) {
      challengeQueries.updateStatus(challengeId, 'expired');
      return res.status(400).json({ success: false, error: 'Tantangan sudah kadaluarsa (melewati batas waktu 30 detik).' });
    }

    const newStatus = accept ? 'active' : 'declined';
    challengeQueries.updateStatus(challengeId, newStatus);

    broadcastWs('CHALLENGE_RESPONSE', {
      challengeId,
      challengerId: challenge.challenger_id,
      challengedUsername: req.user.username,
      status: newStatus,
      gameType: challenge.game_type,
    }, { to: [challenge.challenger_id, req.user.id] });

    res.json({ success: true, status: newStatus });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Ambil state match game
gamesRouter.get('/challenge/state/:id', authenticateToken, (req, res) => {
  try {
    const challenge = challengeQueries.getById(req.params.id);
    if (!challenge) return res.status(404).json({ success: false, error: 'Match tidak ditemukan.' });
    let state = {};
    try { state = JSON.parse(challenge.game_state_json || '{}'); } catch (_) {}
    res.json({
      success: true,
      challenge: {
        id: challenge.id,
        challengerUsername: challenge.challenger_username,
        challengedUsername: challenge.challenged_username,
        gameType: challenge.game_type,
        status: challenge.status,
        turnUserId: challenge.turn_user_id,
        winnerId: challenge.winner_id,
        state,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sinkronisasi gerakan pemain (move)
gamesRouter.post('/challenge/move', authenticateToken, (req, res) => {
  try {
    const { challengeId, move, fen, score, isGameOver, winner } = req.body;
    const challenge = challengeQueries.getById(challengeId);
    if (!challenge) return res.status(404).json({ success: false, error: 'Match tidak ditemukan.' });
    if (challenge.status !== 'active') return res.status(400).json({ success: false, error: 'Match sudah tidak aktif.' });

    let state = {};
    try { state = JSON.parse(challenge.game_state_json || '{}'); } catch (_) {}
    if (move) {
      state.moves = state.moves || [];
      state.moves.push(move);
    }
    if (fen) state.fen = fen;
    if (score !== undefined) state.score = score;

    const nextTurnUserId = req.user.id === challenge.challenger_id ? challenge.challenged_id : challenge.challenger_id;

    if (isGameOver) {
      challengeQueries.updateStatus(challengeId, 'finished', winner || '');
    } else {
      challengeQueries.updateState(challengeId, JSON.stringify(state), nextTurnUserId);
    }

    broadcastWs('GAME_MOVE', {
      challengeId,
      byUserId: req.user.id,
      byUsername: req.user.username,
      move,
      fen,
      isGameOver: Boolean(isGameOver),
      winner: winner || '',
    }, { to: [challenge.challenger_id, challenge.challenged_id] });

    res.json({ success: true, message: 'Move disinkronkan.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==================== CO-OP BOSS RAID & RPG TITLES (/api/raid) ====================

// Status Boss Raid
raidRouter.get('/status', (req, res) => {
  try {
    const active = [];
    for (const [chatJid, raid] of bossRaidEngine.activeRaids.entries()) {
      active.push({
        chatJid,
        bossName: raid.boss.name,
        bossTitle: raid.boss.title,
        archetype: raid.boss.archetype,
        currentHp: raid.boss.currentHp,
        maxHp: raid.boss.maxHp,
        phase: raid.boss.phase,
        comboStreak: raid.comboStreak,
        startedAt: raid.startedAt,
        participantsCount: Object.keys(raid.damageDealers || {}).length,
      });
    }

    const recent = raidQueries.getRecentRaids(15);
    res.json({
      success: true,
      activeRaidsCount: active.length,
      activeRaids: active,
      recentHistory: recent,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Daftar Juara Raid (Champions)
raidRouter.get('/champions', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 25;
    const champions = raidQueries.getAllRaidChampions(limit);
    res.json({ success: true, champions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Gelar & Titel RPG yang dimiliki user
raidRouter.get('/titles', authenticateToken, (req, res) => {
  try {
    const user = readUsers().find((u) => u.id === req.user.id);
    const identifier = user?.linkedOwnerNumber || req.user.linkedOwnerNumber || req.user.username || req.user.id;
    const targetJid = req.query.jid || identifier;
    const unlockedTitles = raidQueries.getUserTitles(targetJid);
    const equipped = raidQueries.getEquippedTitle(targetJid);

    res.json({
      success: true,
      identifier: targetJid,
      equippedTitle: equipped || null,
      titles: unlockedTitles || [],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Pasang titel RPG
raidRouter.post('/equip', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const { titleId } = req.body || {};
    if (!titleId) {
      return res.status(400).json({ success: false, error: 'ID titel wajib disertakan.' });
    }

    const user = readUsers().find((u) => u.id === req.user.id);
    const identifier = user?.linkedOwnerNumber || req.user.linkedOwnerNumber || req.user.username || req.user.id;

    const result = bossRaidEngine.equipUserTitle(identifier, titleId);
    if (!result.success) {
      return res.status(400).json(result);
    }

    const equipped = raidQueries.getEquippedTitle(identifier);
    res.json({ success: true, message: result.message, equippedTitle: equipped });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = {
  gamesRouter,
  raidRouter,
};
