// dashboard/js/gamesEngine.js — Polaris Games Arena Full Engine
// Implements 7 Complete Games with Nano Banana Assets, Fluid Animations & Procedural Web Audio API:
// 1. Chess Arena (Stockfish 11 + Starlium AI 500k Matrix, Luxury SVG Pieces, Check Pulse, Move Trails)
// 2. Minesweeper (Custom SVG Cyber Mine & Flag, Screen Shake, Click & Detonation Audio)
// 3. Tic-Tac-Toe / XOX (Glowing Cyber X & O Vectors, Placement Audio, Win Fanfare)
// 4. SOS Arena (NxN Dynamic Grid, Turn Combos, SOS Formed Audio Chime)
// 5. Galaxy Snake (Starfield Canvas, Nano Banana Orbiting Star Food, Cute Animated Eyes, Particle Bursts)
// 6. Cosmic Memory Flip (1-5 Players, 3D Card Flips, Match & Mismatch Chimes)
// 7. Dots & Boxes (2-5 Players & Bot, Territory Capture, Line & Box Audio)

(function() {
  'use strict';

  // ==================== 0. SOUND FX & TAB NAVIGATION ====================
  const sfx = window.NanoSoundFX || {
    playChessMove: () => {}, playChessCapture: () => {}, playChessCheck: () => {}, playChessCheckmate: () => {}, playChessIllegal: () => {},
    playSnakeEat: () => {}, playSnakeDie: () => {}, playSnakeTurn: () => {},
    playMineClick: () => {}, playMineFlag: () => {}, playMineExplosion: () => {}, playMineWin: () => {},
    playXOXPlace: () => {}, playXOXWin: () => {}, playSOSPlace: () => {}, playSOSFormed: () => {},
    playCardFlip: () => {}, playCardMatch: () => {}, playCardMismatch: () => {},
    playDotsLine: () => {}, playDotsBox: () => {}
  };

  // Sound Toggle Controller
  function updateSoundUI() {
    const btn = document.getElementById('btn-game-sound-toggle');
    const icon = document.getElementById('sound-toggle-icon');
    const label = document.getElementById('sound-toggle-label');
    if (!btn) return;
    const isMuted = window.NanoSoundFX ? window.NanoSoundFX.isMuted : false;
    if (icon) icon.textContent = isMuted ? '🔇' : '🔊';
    if (label) label.textContent = isMuted ? 'Suara: BISU' : 'Suara: ON';
    if (isMuted) {
      btn.classList.remove('active');
    } else {
      btn.classList.add('active');
    }
  }

  document.getElementById('btn-game-sound-toggle')?.addEventListener('click', () => {
    if (window.NanoSoundFX) {
      window.NanoSoundFX.toggleMute();
      updateSoundUI();
    }
  });
  window.addEventListener('nanosound:mutechange', updateSoundUI);
  updateSoundUI();

  // Tab navigation & Stage Switcher
  function switchPolarisGameStage(gameKey) {
    if (!gameKey) gameKey = 'chess';
    const gameTabs = document.querySelectorAll('.game-card-tab');
    const gameViews = document.querySelectorAll('.game-view');
    const starliumSubtabs = document.querySelectorAll('.starlium-subtab');

    gameTabs.forEach(t => t.classList.toggle('active', t.dataset.game === gameKey));
    gameViews.forEach(v => v.classList.toggle('active', v.id === `view-${gameKey}`));
    starliumSubtabs.forEach(st => st.classList.toggle('active', st.dataset.game === gameKey));

    const activeBadge = document.getElementById('starlium-active-game-badge');
    if (activeBadge) {
      const gameNames = {
        chess: '♟️ Catur Stockfish 11',
        sudoku: '🔢 Sudoku Master 9x9',
        minesweeper: '💣 Minesweeper Klasik',
        xox: '❌ Tic-Tac-Toe AI',
        sos: '🔤 SOS Arena NxN',
        snake: '🐍 Galaxy Snake',
        memory: '🃏 Cosmic Memory Flip',
        dots: '📦 Dots & Boxes'
      };
      activeBadge.textContent = gameNames[gameKey] || gameKey;
    }

    if (window.NanoSoundFX) window.NanoSoundFX.playCardFlip();

    // Lazy inits
    if (gameKey === 'chess' && !chess) initChess();
    if (gameKey === 'sudoku' && !window.__sudokuStarted) initSudoku();
    if (gameKey === 'snake' && !window.__snakeRunning) initSnake();
    if (gameKey === 'memory' && !window.__memoryStarted) initMemory();
    if (gameKey === 'dots' && !window.__dotsStarted) initDots();
  }
  window.switchPolarisGameStage = switchPolarisGameStage;

  document.querySelectorAll('.game-card-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const gameKey = tab.dataset.game;
      switchPolarisGameStage(gameKey);
    });
  });

  function fireConfetti() {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 85,
        spread: 75,
        origin: { y: 0.6 }
      });
    }
  }

  // ==================== 1. CHESS ENGINE (STOCKFISH 11 UCI & CHESS.COM STUDIO) ====================
  let chess = null;
  let chessFlipped = false;
  let selectedSquare = null;
  let stockfishWorker = null;
  let starliumStatsCache = { totalMatches: 0, targetMatches: 500000, isUnlocked: false, progressPercent: 0 };
  let lastValidChessMode = 'stockfish';
  let lastMoveFrom = null;
  let lastMoveTo = null;
  let premoveFrom = null;
  let premoveTo = null;
  let activeOnlineMatch = null; // { challengeId, playerColor: 'w'|'b', opponentUsername }
  let isCoachModeActive = false;

  // Drag-and-drop state
  let isChessDragging = false;
  let chessDragFromSq = null;
  let chessDragFollower = null;
  let chessDragStartX = 0;
  let chessDragStartY = 0;
  let chessDragMoved = false;

  // Timers
  let chessWhiteTime = 600; // 10 minutes
  let chessBlackTime = 600;
  let chessClockInterval = null;

  // Initialize Official Stockfish 11 Web Worker
  function initStockfishEngine() {
    try {
      if (stockfishWorker) {
        stockfishWorker.terminate();
        stockfishWorker = null;
      }
      // Try local offline stockfish.min.js first
      stockfishWorker = new Worker('/js/vendor/stockfish.min.js');
      setupStockfishWorkerEvents();
    } catch (err) {
      console.warn('[Chess] Direct worker failed, trying blob worker:', err.message);
      try {
        const workerBlob = new Blob([
          `importScripts('${window.location.origin}/js/vendor/stockfish.min.js');`
        ], { type: 'application/javascript' });
        stockfishWorker = new Worker(URL.createObjectURL(workerBlob));
        setupStockfishWorkerEvents();
      } catch (err2) {
        console.warn('[Chess] Blob worker failed, using CDN fallback:', err2.message);
        try {
          const cdnBlob = new Blob([
            `importScripts('https://cdn.jsdelivr.net/npm/stockfish@11.0.0/src/stockfish.min.js');`
          ], { type: 'application/javascript' });
          stockfishWorker = new Worker(URL.createObjectURL(cdnBlob));
          setupStockfishWorkerEvents();
        } catch (err3) {
          console.error('[Chess] All Stockfish workers failed, using heuristic minimax:', err3.message);
        }
      }
    }
  }

  function setupStockfishWorkerEvents() {
    if (!stockfishWorker) return;
    const setEngineBadge = (text, state) => {
      const badge = document.getElementById('chess-engine-badge');
      if (!badge) return;
      badge.textContent = text;
      badge.dataset.state = state;
    };
    setEngineBadge('Stockfish 11 loading…', 'loading');
    const failEngine = (reason) => {
      console.warn('[Chess] Stockfish unavailable, falling back to heuristic engine:', reason);
      try { if (stockfishWorker) stockfishWorker.terminate(); } catch (_) {}
      stockfishWorker = null;
      setEngineBadge('Heuristic engine (Stockfish offline)', 'fallback');
    };
    stockfishWorker.addEventListener('error', (ev) => failEngine(ev && ev.message));
    stockfishWorker.postMessage('uci');
    stockfishWorker.postMessage('isready');

    stockfishWorker.addEventListener('message', (event) => {
      const line = typeof event.data === 'string' ? event.data : '';
      if (!line) return;
      if (line === 'readyok') setEngineBadge('Stockfish 11 Ready', 'ready');

      // Real-time evaluation parse: info depth ... score cp <score> / score mate <moves>
      if (line.startsWith('info') && line.includes('score')) {
        const cpMatch = line.match(/score cp (-?\d+)/);
        const mateMatch = line.match(/score mate (-?\d+)/);
        if (cpMatch) {
          let scoreCp = parseInt(cpMatch[1], 10);
          if (chess && chess.turn() === 'b') scoreCp = -scoreCp; // White perspective
          updateEvaluationBar(scoreCp / 100);
        } else if (mateMatch) {
          let mateMoves = parseInt(mateMatch[1], 10);
          if (chess && chess.turn() === 'b') mateMoves = -mateMoves;
          updateEvaluationBar(mateMoves > 0 ? 999 : -999, mateMoves);
        }
      }
    });
  }

  initStockfishEngine();

  // Authentic Chess.com Staunton Vector Pieces (Ivory White & Obsidian Charcoal)
  function getStauntonChessPieceSvg(type, color) {
    const isWhite = color === 'w';
    const id = `staunton_${type}_${color}_${Math.random().toString(36).substr(2, 6)}`;
    const gradId = `st_grad_${id}`;
    const strokeId = `st_strk_${id}`;

    // Premium gradients matching Chess.com Neo/Wood board
    const fillGrad = isWhite
      ? `<linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="65%" stop-color="#f5efe6"/>
          <stop offset="100%" stop-color="#e6dcce"/>
        </linearGradient>`
      : `<linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#44403c"/>
          <stop offset="55%" stop-color="#262322"/>
          <stop offset="100%" stop-color="#141211"/>
        </linearGradient>`;

    const mainStroke = isWhite ? '#1c1917' : '#0a0a0a';
    const innerHighlight = isWhite ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)';
    const goldAccent = '#f59e0b';
    const filterId = `sh_${id}`;
    const filterDrop = `<filter id="${filterId}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2.5" stdDeviation="2.2" flood-color="${isWhite ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.75)'}"/>
    </filter>`;

    let paths = '';
    switch (type.toLowerCase()) {
      case 'p': // Pawn
        paths = `
          <!-- Pawn Head -->
          <circle cx="22.5" cy="12" r="6" fill="url(#${gradId})" stroke="${mainStroke}" stroke-width="1.8"/>
          <circle cx="20.5" cy="10" r="1.8" fill="${innerHighlight}"/>
          <!-- Collar Ring -->
          <path d="M16 18.5 C18 17 27 17 29 18.5 C29 20 16 20 16 18.5 Z" fill="url(#${gradId})" stroke="${mainStroke}" stroke-width="1.6"/>
          <!-- Body -->
          <path d="M17.5 20 C18.5 26 15.5 30 12.5 33 C18.5 33.5 26.5 33.5 32.5 33 C29.5 30 26.5 26 27.5 20 Z" fill="url(#${gradId})" stroke="${mainStroke}" stroke-width="1.8"/>
          <path d="M21 22 C21.5 26 19.5 29 17 31" stroke="${innerHighlight}" stroke-width="1.2" stroke-linecap="round" fill="none"/>
          <!-- Base Pedestal -->
          <path d="M9.5 34 C16 33 29 33 35.5 34 L36.5 39 C36.5 40.5 8.5 40.5 8.5 39 Z" fill="url(#${gradId})" stroke="${mainStroke}" stroke-width="1.8"/>
          <rect x="11" y="37" width="23" height="1.8" rx="0.9" fill="${innerHighlight}"/>
        `;
        break;

      case 'r': // Rook
        paths = `
          <!-- Castle Battlements -->
          <path d="M10 10 L10 17 L14.5 17 L14.5 14 L18.5 14 L18.5 17 L26.5 17 L26.5 14 L30.5 14 L30.5 17 L35 17 L35 10 Z" fill="url(#${gradId})" stroke="${mainStroke}" stroke-width="1.8"/>
          <rect x="12" y="17" width="21" height="3" fill="url(#${gradId})" stroke="${mainStroke}" stroke-width="1.6"/>
          <!-- Tower Body -->
          <path d="M13.5 20 L15.5 33 L29.5 33 L31.5 20 Z" fill="url(#${gradId})" stroke="${mainStroke}" stroke-width="1.8"/>
          <path d="M16.5 22 L17.8 31" stroke="${innerHighlight}" stroke-width="1.3" stroke-linecap="round"/>
          <!-- Base Pedestal -->
          <path d="M9 34 C16 33.2 29 33.2 36 34 L37 40 C37 41 8 41 8 40 Z" fill="url(#${gradId})" stroke="${mainStroke}" stroke-width="1.8"/>
          <rect x="11" y="37.5" width="23" height="1.8" rx="0.9" fill="${innerHighlight}"/>
        `;
        break;

      case 'n': // Knight
        paths = `
          <!-- Sculpted Horse Head -->
          <path d="M12.5 38 C12.5 36 15 32 16.5 29 C14.5 26.5 13 22 12 18 C11 15 13 14 15.5 15 C14.5 12 16 9 18.5 7.5 C20.5 6 23.5 6 25.5 6.5 C27.5 8 28.5 10 27.5 12 C30 11 32.5 12.5 33.5 15.5 C34.5 18.5 33.5 22 30.5 25 C31.5 29 32.5 34 33.5 38 Z" fill="url(#${gradId})" stroke="${mainStroke}" stroke-width="1.8"/>
          <!-- Mane Details -->
          <path d="M22 8 L24 13 L20 16" stroke="${mainStroke}" stroke-width="1.4" fill="none"/>
          <path d="M26 12 L28 17 L24 19" stroke="${mainStroke}" stroke-width="1.4" fill="none"/>
          <!-- Eye & Snout -->
          <circle cx="16.5" cy="18" r="1.5" fill="${isWhite ? '#1c1917' : '#ffffff'}"/>
          <path d="M12.5 22 C14.5 22 16 23.5 16 25" stroke="${mainStroke}" stroke-width="1.4" fill="none"/>
          <!-- Base Pedestal -->
          <path d="M9 38 C16 37 29 37 36 38 L37 41 C37 42 8 42 8 41 Z" fill="url(#${gradId})" stroke="${mainStroke}" stroke-width="1.8"/>
        `;
        break;

      case 'b': // Bishop
        paths = `
          <!-- Mitre Finial Ball -->
          <circle cx="22.5" cy="7.5" r="2.2" fill="${goldAccent}" stroke="${mainStroke}" stroke-width="1.4"/>
          <!-- Mitre Cap -->
          <path d="M22.5 9.5 C15.5 12.5 15 22.5 17.5 26.5 C18.5 28 26.5 28 27.5 26.5 C30 22.5 29.5 12.5 22.5 9.5 Z" fill="url(#${gradId})" stroke="${mainStroke}" stroke-width="1.8"/>
          <!-- Diagonal Sliced Cleft -->
          <path d="M20 14 L26 21" stroke="${mainStroke}" stroke-width="1.8" stroke-linecap="round"/>
          <circle cx="20.5" cy="13.5" r="1.2" fill="${innerHighlight}"/>
          <!-- Collar & Stem -->
          <path d="M16.5 27 C17.5 30 15 32 13.5 34 C19 34.5 26 34.5 31.5 34 C30 32 27.5 30 28.5 27 Z" fill="url(#${gradId})" stroke="${mainStroke}" stroke-width="1.8"/>
          <!-- Base Pedestal -->
          <path d="M9 35 C16 34 29 34 36 35 L37 40 C37 41 8 41 8 40 Z" fill="url(#${gradId})" stroke="${mainStroke}" stroke-width="1.8"/>
        `;
        break;

      case 'q': // Queen
        paths = `
          <!-- Coronet Pearls -->
          <circle cx="9.5" cy="14" r="1.8" fill="${goldAccent}" stroke="${mainStroke}" stroke-width="1.2"/>
          <circle cx="15.5" cy="10" r="1.8" fill="${goldAccent}" stroke="${mainStroke}" stroke-width="1.2"/>
          <circle cx="22.5" cy="8" r="2.2" fill="${goldAccent}" stroke="${mainStroke}" stroke-width="1.3"/>
          <circle cx="29.5" cy="10" r="1.8" fill="${goldAccent}" stroke="${mainStroke}" stroke-width="1.2"/>
          <circle cx="35.5" cy="14" r="1.8" fill="${goldAccent}" stroke="${mainStroke}" stroke-width="1.2"/>
          <!-- Crown Robe Points -->
          <path d="M9.5 16 L13.5 26 L22.5 13 L31.5 26 L35.5 16 C33.5 23 30.5 28 28.5 30 L16.5 30 C14.5 28 11.5 23 9.5 16 Z" fill="url(#${gradId})" stroke="${mainStroke}" stroke-width="1.8"/>
          <circle cx="22.5" cy="23" r="2.4" fill="${innerHighlight}"/>
          <!-- Robe Waist & Base -->
          <path d="M15 31 C15.5 33 13.5 35 12 36 L33 36 C31.5 35 29.5 33 30 31 Z" fill="url(#${gradId})" stroke="${mainStroke}" stroke-width="1.8"/>
          <path d="M8.5 36.5 C16 35.5 29 35.5 36.5 36.5 L37.5 41 C37.5 42 7.5 42 7.5 41 Z" fill="url(#${gradId})" stroke="${mainStroke}" stroke-width="1.8"/>
        `;
        break;

      case 'k': // King
        paths = `
          <!-- Imperial Cross Finial -->
          <path d="M22.5 4.5 L22.5 11.5 M19 7.5 L26 7.5" stroke="${goldAccent}" stroke-width="2" stroke-linecap="round"/>
          <circle cx="22.5" cy="7.5" r="1.2" fill="#ffffff"/>
          <!-- Crown Arch & Velvet Dome -->
          <path d="M12 15 C12 11.5 17 11.5 22.5 12.5 C28 11.5 33 11.5 33 15 C34 22 29.5 26 28 30 L17 30 C15.5 26 11 22 12 15 Z" fill="url(#${gradId})" stroke="${mainStroke}" stroke-width="1.8"/>
          <path d="M16 18 L22.5 24 L29 18" stroke="${mainStroke}" stroke-width="1.5" fill="none"/>
          <circle cx="22.5" cy="21" r="1.8" fill="${goldAccent}"/>
          <!-- Waist & Robe Pedestal -->
          <path d="M14.5 31 C15.5 33 13.5 35 12 36 L33 36 C31.5 35 29.5 33 30.5 31 Z" fill="url(#${gradId})" stroke="${mainStroke}" stroke-width="1.8"/>
          <path d="M8.5 36.5 C16 35.5 29 35.5 36.5 36.5 L37.5 41 C37.5 42 7.5 42 7.5 41 Z" fill="url(#${gradId})" stroke="${mainStroke}" stroke-width="1.8"/>
        `;
        break;

      default:
        paths = `<circle cx="22.5" cy="22.5" r="10" fill="${mainStroke}"/>`;
    }

    return `<svg class="staunton-piece-svg" viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
      <defs>${fillGrad}${filterDrop}</defs>
      <g filter="url(#${filterId})">${paths}</g>
    </svg>`;
  }

  // Alias for compatibility
  function getNanoChessPieceSvg(type, color) {
    return getStauntonChessPieceSvg(type, color);
  }

  const pieceValues = { 'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000 };

  // Real-time Vertical Evaluation Bar updater
  function updateEvaluationBar(score, mate = null) {
    const fillEl = document.getElementById('chess-eval-fill');
    const badgeEl = document.getElementById('chess-eval-badge');
    if (!fillEl || !badgeEl) return;

    if (mate !== null && Math.abs(score) >= 900) {
      if (mate > 0) {
        fillEl.style.height = '100%';
        badgeEl.textContent = `M${mate}`;
        badgeEl.className = 'chess-eval-score-badge white-top';
      } else {
        fillEl.style.height = '0%';
        badgeEl.textContent = `-M${Math.abs(mate)}`;
        badgeEl.className = 'chess-eval-score-badge black-top';
      }
      return;
    }

    const clamped = Math.max(-6, Math.min(6, score));
    const percent = 50 + (clamped / 6) * 45;
    fillEl.style.height = `${percent.toFixed(1)}%`;

    const sign = score > 0 ? '+' : '';
    badgeEl.textContent = `${sign}${score.toFixed(1)}`;
    if (score >= 0) {
      badgeEl.className = 'chess-eval-score-badge white-top';
    } else {
      badgeEl.className = 'chess-eval-score-badge black-top';
    }
  }

  // Calculate quick heuristic balance when engine is idle
  function calculateStaticEvaluation() {
    if (!chess) return 0;
    let materialScore = 0;
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p) {
          const val = pieceValues[p.type] || 0;
          materialScore += (p.color === 'w' ? val : -val);
        }
      }
    }
    return materialScore / 100;
  }

  // Update captured pieces trays for both players
  function updateCapturedPiecesTray() {
    if (!chess) return;
    const oppTray = document.getElementById('chess-opponent-captured');
    const userTray = document.getElementById('chess-user-captured');
    if (!oppTray && !userTray) return;

    const initialPieces = {
      w: { p: 8, r: 2, n: 2, b: 2, q: 1 },
      b: { p: 8, r: 2, n: 2, b: 2, q: 1 }
    };
    const currentPieces = {
      w: { p: 0, r: 0, n: 0, b: 0, q: 0 },
      b: { p: 0, r: 0, n: 0, b: 0, q: 0 }
    };

    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type !== 'k') {
          currentPieces[p.color][p.type]++;
        }
      }
    }

    // White lost pieces (captured by Black) -> show in opponent tray
    let oppHtml = '';
    ['q', 'r', 'b', 'n', 'p'].forEach(type => {
      const lost = initialPieces.w[type] - currentPieces.w[type];
      for (let i = 0; i < lost; i++) {
        oppHtml += `<div class="chess-captured-piece-mini">${getStauntonChessPieceSvg(type, 'w')}</div>`;
      }
    });
    if (oppTray) oppTray.innerHTML = oppHtml;

    // Black lost pieces (captured by White) -> show in user tray
    let userHtml = '';
    ['q', 'r', 'b', 'n', 'p'].forEach(type => {
      const lost = initialPieces.b[type] - currentPieces.b[type];
      for (let i = 0; i < lost; i++) {
        userHtml += `<div class="chess-captured-piece-mini">${getStauntonChessPieceSvg(type, 'b')}</div>`;
      }
    });
    if (userTray) userTray.innerHTML = userHtml;
  }

  // Clock Timer Tick Engine
  function startChessClock() {
    clearInterval(chessClockInterval);
    chessClockInterval = setInterval(() => {
      if (!chess || chess.game_over()) return;
      if (chess.turn() === 'w') {
        if (chessWhiteTime > 0) chessWhiteTime--;
      } else {
        if (chessBlackTime > 0) chessBlackTime--;
      }
      renderChessClocks();
    }, 1000);
  }

  function renderChessClocks() {
    const oppTimer = document.getElementById('chess-opponent-timer');
    const userTimer = document.getElementById('chess-user-timer');
    const isWhiteTurn = chess ? chess.turn() === 'w' : true;

    function fmt(sec) {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    if (userTimer) {
      userTimer.textContent = fmt(chessWhiteTime);
      userTimer.classList.toggle('active-turn', isWhiteTurn);
    }
    if (oppTimer) {
      oppTimer.textContent = fmt(chessBlackTime);
      oppTimer.classList.toggle('active-turn', !isWhiteTurn);
    }
  }

  async function refreshStarliumTelemetry() {
    try {
      const res = await fetch('/api/games/starlium/stats');
      if (res.ok) {
        const json = await res.json();
        if (json.stats) {
          starliumStatsCache = json.stats;
          const total = starliumStatsCache.totalMatches || 0;
          const target = starliumStatsCache.targetMatches || 500000;
          const isUnlocked = total >= target;
          const percent = Math.min(100, Math.round((total / target) * 10000) / 100);

          const counterEl = document.getElementById('starlium-match-counter');
          const percentEl = document.getElementById('starlium-progress-percent');
          const barEl = document.getElementById('starlium-progress-bar');
          const badgeEl = document.getElementById('starlium-lock-badge');

          if (counterEl) counterEl.textContent = total.toLocaleString();
          if (percentEl) percentEl.textContent = `${percent.toFixed(2)}%`;
          if (barEl) barEl.style.width = `${percent}%`;

          if (isUnlocked) {
            if (badgeEl) {
              badgeEl.textContent = '🔓 TERBUKA';
              badgeEl.style.color = '#34d399';
            }
          } else {
            if (badgeEl) {
              badgeEl.textContent = '🔒 TERKUNCI';
              badgeEl.style.color = '#fbbf24';
            }
          }
        }
      }
    } catch (_) {}
  }

  function getChessMode() {
    const sel = document.getElementById('chess-mode-select');
    return sel ? sel.value : 'stockfish';
  }

  function setChessMode(mode) {
    const sel = document.getElementById('chess-mode-select');
    if (sel) sel.value = mode;

    document.querySelectorAll('.chess-diff-pill').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.mode === mode);
    });

    const oppName = document.getElementById('chess-opponent-name');
    const oppElo = document.getElementById('chess-opponent-elo');
    const oppAvatar = document.getElementById('chess-opponent-avatar');

    if (oppName && oppElo) {
      switch (mode) {
        case 'easy':
          oppName.innerHTML = `Bot Pemula <span class="chess-player-elo" id="chess-opponent-elo">(1000)</span>`;
          if (oppAvatar) oppAvatar.textContent = '🟢';
          break;
        case 'medium':
          oppName.innerHTML = `Bot Klub <span class="chess-player-elo" id="chess-opponent-elo">(1500)</span>`;
          if (oppAvatar) oppAvatar.textContent = '🟡';
          break;
        case 'hard':
          oppName.innerHTML = `Bot Master <span class="chess-player-elo" id="chess-opponent-elo">(2200)</span>`;
          if (oppAvatar) oppAvatar.textContent = '🔴';
          break;
        case 'stockfish':
          oppName.innerHTML = `Stockfish 11 <span class="chess-player-elo" id="chess-opponent-elo">(3200)</span>`;
          if (oppAvatar) oppAvatar.textContent = '🤖';
          break;
        case 'pvp':
          oppName.innerHTML = `Pemain 2 (Hitam) <span class="chess-player-elo" id="chess-opponent-elo">(Lokal)</span>`;
          if (oppAvatar) oppAvatar.textContent = '👥';
          break;
        case 'starlium':
          oppName.innerHTML = `Starlium AI <span class="chess-player-elo" id="chess-opponent-elo">(3500)</span>`;
          if (oppAvatar) oppAvatar.textContent = '🌟';
          break;
        default:
          oppName.innerHTML = `Lawan <span class="chess-player-elo" id="chess-opponent-elo">(1500)</span>`;
          if (oppAvatar) oppAvatar.textContent = '👤';
      }
    }
  }

  function initChess() {
    if (typeof Chess === 'undefined') {
      setTimeout(initChess, 150);
      return;
    }
    chess = new Chess();
    selectedSquare = null;
    lastMoveFrom = null;
    lastMoveTo = null;
    premoveFrom = null;
    premoveTo = null;
    chessWhiteTime = 600;
    chessBlackTime = 600;

    renderChessBoard();
    updateChessStatus();
    updateCapturedPiecesTray();
    renderChessClocks();
    startChessClock();
    refreshStarliumTelemetry();
    updateEvaluationBar(0);

    // Bind difficulty pills
    document.querySelectorAll('.chess-diff-pill').forEach(pill => {
      pill.onclick = (e) => {
        e.stopPropagation();
        const mode = pill.dataset.mode;
        if (mode === 'starlium' && !starliumStatsCache.isUnlocked) {
          alert('🔒 Mode AI Starlium Masih Terkunci! Membutuhkan pembelajaran 500k match.');
          return;
        }
        setChessMode(mode);
        const botCard = document.getElementById('btn-chess-card-bot');
        const pvpCard = document.getElementById('btn-chess-card-pvp');
        if (botCard) botCard.classList.add('active');
        if (pvpCard) pvpCard.classList.remove('active');
        sfx.playCardFlip();
      };
    });

    // Bind Coach Mode Card
    const coachCard = document.getElementById('btn-chess-card-coach');
    if (coachCard && !coachCard.dataset.bound) {
      coachCard.dataset.bound = 'true';
      coachCard.onclick = () => {
        isCoachModeActive = !isCoachModeActive;
        coachCard.classList.toggle('active', isCoachModeActive);
        sfx.playCardFlip();
        if (isCoachModeActive) {
          triggerCoachAdvice();
        } else {
          const coachText = document.getElementById('chess-coach-text');
          if (coachText) coachText.textContent = 'Mode Pelatih dinonaktifkan.';
        }
      };
    }

    // Bind Dua Pemain Pass & Play Card & Bot Card
    const pvpCard = document.getElementById('btn-chess-card-pvp');
    const botCard = document.getElementById('btn-chess-card-bot');
    if (pvpCard && !pvpCard.dataset.bound) {
      pvpCard.dataset.bound = 'true';
      pvpCard.onclick = () => {
        setChessMode('pvp');
        pvpCard.classList.add('active');
        if (botCard) botCard.classList.remove('active');
        sfx.playCardFlip();
      };
    }
    if (botCard && !botCard.dataset.bound) {
      botCard.dataset.bound = 'true';
      botCard.onclick = () => {
        setChessMode('stockfish');
        botCard.classList.add('active');
        if (pvpCard) pvpCard.classList.remove('active');
        sfx.playCardFlip();
      };
    }

    // Bind New Match & Flip
    document.getElementById('btn-chess-new')?.addEventListener('click', () => {
      sfx.playChessMove();
      initChess();
    });
    document.getElementById('btn-chess-flip')?.addEventListener('click', () => {
      sfx.playChessMove();
      chessFlipped = !chessFlipped;
      renderChessBoard();
    });
  }

  function renderChessBoard() {
    const boardEl = document.getElementById('chess-board');
    if (!boardEl || !chess) return;
    boardEl.innerHTML = '';

    const ranks = chessFlipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
    const files = chessFlipped ? ['h','g','f','e','d','c','b','a'] : ['a','b','c','d','e','f','g','h'];

    // Update outer coordinates labels
    document.querySelectorAll('.board-coords-file-top .coord-label, .board-coords-file-bottom .coord-label').forEach((el, idx) => {
      if (files[idx]) el.textContent = files[idx];
    });
    document.querySelectorAll('.board-coords-rank-left .coord-label, .board-coords-rank-right .coord-label').forEach((el, idx) => {
      if (ranks[idx]) el.textContent = ranks[idx];
    });

    // In-check king square
    let inCheckKingSquare = null;
    if (chess.in_check()) {
      const turn = chess.turn();
      for (let r = 1; r <= 8; r++) {
        for (const f of ['a','b','c','d','e','f','g','h']) {
          const p = chess.get(f + r);
          if (p && p.type === 'k' && p.color === turn) {
            inCheckKingSquare = f + r;
            break;
          }
        }
        if (inCheckKingSquare) break;
      }
    }

    const validMoves = selectedSquare ? chess.moves({ square: selectedSquare, verbose: true }) : [];
    const validDestMap = new Map();
    validMoves.forEach(m => validDestMap.set(m.to, m));

    ranks.forEach((rank, rIdx) => {
      files.forEach((file, fIdx) => {
        const sq = file + rank;
        const squareEl = document.createElement('div');
        const isDark = (rIdx + fIdx) % 2 === 1;
        squareEl.className = `chess-square ${isDark ? 'sq-dark' : 'sq-light'}`;
        squareEl.dataset.square = sq;

        // Visual highlights
        if (selectedSquare === sq) squareEl.classList.add('sq-selected');
        if (lastMoveFrom === sq) squareEl.classList.add('sq-last-from');
        if (lastMoveTo === sq) squareEl.classList.add('sq-last-to');
        if (inCheckKingSquare === sq) squareEl.classList.add('sq-in-check');

        // Move target hints
        if (validDestMap.has(sq)) {
          const moveInfo = validDestMap.get(sq);
          if (moveInfo.captured) {
            squareEl.classList.add('sq-hint-capture');
          } else {
            squareEl.classList.add('sq-hint-move');
          }
        }

        // Render piece
        const piece = chess.get(sq);
        if (piece) {
          const svgMarkup = getStauntonChessPieceSvg(piece.type, piece.color);
          const pieceContainer = document.createElement('div');
          pieceContainer.style.width = '100%';
          pieceContainer.style.height = '100%';
          pieceContainer.style.display = 'flex';
          pieceContainer.style.alignItems = 'center';
          pieceContainer.style.justifyContent = 'center';
          if (sq === lastMoveTo) {
            pieceContainer.classList.add('piece-bounce-anim');
          }
          pieceContainer.innerHTML = svgMarkup;
          squareEl.appendChild(pieceContainer);
        }

        // Mouse & Touch Drag-and-Drop + Click Listeners
        squareEl.addEventListener('mousedown', (e) => handleChessSquareMouseDown(e, sq));
        squareEl.addEventListener('touchstart', (e) => handleChessSquareTouchStart(e, sq), { passive: false });

        boardEl.appendChild(squareEl);
      });
    });

    const premoveBadge = document.getElementById('chess-premove-badge');
    if (premoveBadge) {
      premoveBadge.style.display = (premoveFrom && premoveTo) ? 'inline-block' : 'none';
      if (premoveFrom && premoveTo) {
        premoveBadge.textContent = `⚡ Premove: ${premoveFrom.toUpperCase()} → ${premoveTo.toUpperCase()}`;
      }
    }
  }

  // ==================== DRAG & DROP FOLLOW CURSOR SYSTEM ====================
  function handleChessSquareMouseDown(e, sq) {
    if (e.button !== 0) return; // Only left click
    startChessDrag(sq, e.clientX, e.clientY);
  }

  function handleChessSquareTouchStart(e, sq) {
    if (!e.touches || e.touches.length === 0) return;
    const touch = e.touches[0];
    startChessDrag(sq, touch.clientX, touch.clientY);
  }

  function startChessDrag(sq, clientX, clientY) {
    if (!chess || chess.game_over()) return;

    const mode = getChessMode();
    const isOnline = Boolean(activeOnlineMatch);
    const myColor = isOnline ? activeOnlineMatch.playerColor : 'w';
    const isMyTurn = isOnline ? (chess.turn() === myColor) : (mode === 'pvp' || chess.turn() === 'w');

    const piece = chess.get(sq);

    // If clicking a valid destination for already selected square, execute click-to-move immediately
    if (selectedSquare && selectedSquare !== sq) {
      const validMoves = chess.moves({ square: selectedSquare, verbose: true });
      if (validMoves.some(m => m.to === sq)) {
        executeChessMove(selectedSquare, sq);
        return;
      }
    }

    if (!isMyTurn || !piece || piece.color !== chess.turn()) {
      // Allow click on opponent or empty square to cancel selection or set premove
      handleChessSquareClick(sq);
      return;
    }

    isChessDragging = true;
    chessDragFromSq = sq;
    chessDragStartX = clientX;
    chessDragStartY = clientY;
    chessDragMoved = false;

    // Create floating clone follower tracking cursor
    if (chessDragFollower) {
      chessDragFollower.remove();
      chessDragFollower = null;
    }
    chessDragFollower = document.createElement('div');
    chessDragFollower.className = 'chess-drag-piece-follower';
    chessDragFollower.innerHTML = getStauntonChessPieceSvg(piece.type, piece.color);
    chessDragFollower.style.left = `${clientX}px`;
    chessDragFollower.style.top = `${clientY}px`;
    document.body.appendChild(chessDragFollower);

    // Ghost source piece square
    const srcEl = document.querySelector(`.chess-square[data-square="${sq}"]`);
    if (srcEl) srcEl.classList.add('sq-dragging');

    selectedSquare = sq;
    renderChessBoard();
  }

  window.addEventListener('mousemove', (e) => {
    if (!isChessDragging || !chessDragFollower) return;
    const dx = Math.abs(e.clientX - chessDragStartX);
    const dy = Math.abs(e.clientY - chessDragStartY);
    if (dx > 5 || dy > 5) chessDragMoved = true;
    chessDragFollower.style.left = `${e.clientX}px`;
    chessDragFollower.style.top = `${e.clientY}px`;
  });

  window.addEventListener('touchmove', (e) => {
    if (!isChessDragging || !chessDragFollower || !e.touches || e.touches.length === 0) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - chessDragStartX);
    const dy = Math.abs(touch.clientY - chessDragStartY);
    if (dx > 5 || dy > 5) chessDragMoved = true;
    chessDragFollower.style.left = `${touch.clientX}px`;
    chessDragFollower.style.top = `${touch.clientY}px`;
    e.preventDefault();
  }, { passive: false });

  window.addEventListener('mouseup', (e) => {
    if (!isChessDragging) return;
    endChessDrag(e.clientX, e.clientY);
  });

  window.addEventListener('touchend', (e) => {
    if (!isChessDragging) return;
    const touch = e.changedTouches ? e.changedTouches[0] : null;
    endChessDrag(touch ? touch.clientX : chessDragStartX, touch ? touch.clientY : chessDragStartY);
  });

  function endChessDrag(clientX, clientY) {
    if (!isChessDragging) return;
    isChessDragging = false;

    if (chessDragFollower) {
      chessDragFollower.remove();
      chessDragFollower = null;
    }

    const fromSq = chessDragFromSq;
    chessDragFromSq = null;

    document.querySelectorAll('.chess-square.sq-dragging').forEach(el => el.classList.remove('sq-dragging'));

    let targetEl = null;
    if (clientX !== undefined && clientY !== undefined) {
      targetEl = document.elementFromPoint(clientX, clientY)?.closest('.chess-square');
    }
    const toSq = targetEl ? targetEl.dataset.square : null;

    if (chessDragMoved && toSq && toSq !== fromSq) {
      executeChessMove(fromSq, toSq);
    } else {
      // Short click or dropped in place -> select square
      selectedSquare = (selectedSquare === fromSq) ? fromSq : fromSq;
      renderChessBoard();
    }
  }

  function handleChessSquareClick(sq) {
    if (!chess || chess.game_over()) return;

    const mode = getChessMode();
    const isOnline = Boolean(activeOnlineMatch);
    const myColor = isOnline ? activeOnlineMatch.playerColor : 'w';
    const isMyTurn = isOnline ? (chess.turn() === myColor) : (mode === 'pvp' || chess.turn() === 'w');

    if (!isMyTurn) {
      const piece = chess.get(sq);
      if (!premoveFrom) {
        if (piece && piece.color === myColor) {
          premoveFrom = sq;
          premoveTo = null;
          sfx.playChessMove();
        }
      } else if (premoveFrom === sq) {
        premoveFrom = null;
        premoveTo = null;
      } else if (piece && piece.color === myColor) {
        premoveFrom = sq;
        premoveTo = null;
        sfx.playChessMove();
      } else {
        premoveTo = sq;
        sfx.playChessMove();
      }
      renderChessBoard();
      return;
    }

    if (selectedSquare && selectedSquare !== sq) {
      const moved = executeChessMove(selectedSquare, sq);
      if (moved) return;
    }

    const piece = chess.get(sq);
    if (piece && piece.color === chess.turn()) {
      selectedSquare = sq;
      sfx.playChessMove();
    } else {
      if (selectedSquare) sfx.playChessIllegal();
      selectedSquare = null;
    }
    renderChessBoard();
  }

  function executeChessMove(fromSq, toSq) {
    if (!chess || chess.game_over()) return false;

    const move = chess.move({ from: fromSq, to: toSq, promotion: 'q' });
    if (!move) {
      sfx.playChessIllegal();
      selectedSquare = null;
      renderChessBoard();
      return false;
    }

    lastMoveFrom = fromSq;
    lastMoveTo = toSq;
    selectedSquare = null;
    premoveFrom = null;
    premoveTo = null;

    if (chess.in_checkmate()) {
      sfx.playChessCheckmate();
    } else if (chess.in_check()) {
      sfx.playChessCheck();
    } else if (move.captured) {
      sfx.playChessCapture();
    } else {
      sfx.playChessMove();
    }

    renderChessBoard();
    updateChessStatus();
    updateCapturedPiecesTray();

    // Trigger evaluation update
    if (stockfishWorker) {
      stockfishWorker.postMessage('position fen ' + chess.fen());
      stockfishWorker.postMessage('go depth 8');
    } else {
      updateEvaluationBar(calculateStaticEvaluation());
    }

    const isOnline = Boolean(activeOnlineMatch);
    if (isOnline) {
      sendOnlineMove(move);
    } else if (!chess.game_over() && getChessMode() !== 'pvp') {
      setTimeout(triggerBotChessMove, 300);
    }

    // Trigger Coach Advice if mode active
    if (isCoachModeActive && !chess.game_over()) {
      setTimeout(triggerCoachAdvice, 400);
    }

    return true;
  }

  async function triggerCoachAdvice() {
    if (!isCoachModeActive || !chess || chess.game_over()) return;
    const coachText = document.getElementById('chess-coach-text');
    if (!coachText) return;

    coachText.textContent = 'Pelatih Stockfish sedang menganalisis posisi terbaik...';

    const fen = chess.fen();
    const best = await getStockfishMove(fen, 10);
    if (best && best.from && best.to) {
      const piece = chess.get(best.from);
      const pieceName = {
        'p': 'Pion', 'n': 'Kuda', 'b': 'Gajah', 'r': 'Benteng', 'q': 'Menteri', 'k': 'Raja'
      }[piece ? piece.type : 'p'] || 'Bidak';

      coachText.innerHTML = `<strong>Saran Pelatih:</strong> Gerakkan <b>${pieceName}</b> dari <b>${best.from.toUpperCase()}</b> ke <b>${best.to.toUpperCase()}</b> untuk kontrol posisi maksimal!`;
    }
  }

  async function triggerBotChessMove() {
    if (!chess || chess.game_over()) return;
    const mode = getChessMode();
    const badge = document.getElementById('chess-engine-badge');
    if (badge) badge.textContent = `Bot berpikir (${mode.toUpperCase()})...`;

    let bestMove = null;

    if (mode === 'easy') {
      const moves = chess.moves({ verbose: true });
      bestMove = moves[Math.floor(Math.random() * moves.length)];
    } else if (mode === 'medium') {
      bestMove = getHeuristicMove(2);
    } else if (mode === 'hard') {
      bestMove = getHeuristicMove(3);
    } else if (mode === 'stockfish' && stockfishWorker) {
      bestMove = await getStockfishMove(chess.fen(), 10);
    } else if (mode === 'starlium') {
      bestMove = await getStarliumMove();
    } else {
      bestMove = await getStockfishMove(chess.fen(), 8);
    }

    if (bestMove) {
      const executed = chess.move(bestMove);
      if (executed) {
        lastMoveFrom = executed.from;
        lastMoveTo = executed.to;

        if (chess.in_checkmate()) {
          sfx.playChessCheckmate();
        } else if (chess.in_check()) {
          sfx.playChessCheck();
        } else if (executed.captured) {
          sfx.playChessCapture();
        } else {
          sfx.playChessMove();
        }
      }
      renderChessBoard();
      updateChessStatus();
      updateCapturedPiecesTray();
      if (badge) badge.textContent = 'Engine Ready';

      // Auto-trigger Premove if player queued a move during bot's turn
      setTimeout(executePremoveIfQueued, 80);

      // Trigger coach advice after bot move
      if (isCoachModeActive) {
        setTimeout(triggerCoachAdvice, 200);
      }
    }
  }

  function getStockfishMove(fen, depth = 10) {
    return new Promise((resolve) => {
      if (!stockfishWorker) return resolve(getHeuristicMove(2));

      const onMessage = (event) => {
        const line = typeof event.data === 'string' ? event.data : '';
        if (line.startsWith('bestmove')) {
          stockfishWorker.removeEventListener('message', onMessage);
          const parts = line.split(' ');
          const moveUci = parts[1];
          if (moveUci && moveUci !== '(none)') {
            const from = moveUci.substring(0, 2);
            const to = moveUci.substring(2, 4);
            const promotion = moveUci.length > 4 ? moveUci[4] : undefined;
            resolve({ from, to, promotion });
          } else {
            resolve(getHeuristicMove(2));
          }
        }
      };

      stockfishWorker.addEventListener('message', onMessage);
      stockfishWorker.postMessage('position fen ' + fen);
      stockfishWorker.postMessage('go depth ' + depth);

      setTimeout(() => {
        stockfishWorker.removeEventListener('message', onMessage);
        resolve(getHeuristicMove(2));
      }, 4000);
    });
  }

  // Heuristic evaluation for internal fallback
  function getHeuristicMove(depth) {
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return null;

    let best = moves[0];
    let bestVal = -999999;

    for (const m of moves) {
      chess.move(m);
      const val = -minimaxChess(depth - 1, -1000000, 1000000, false);
      chess.undo();
      if (val > bestVal) {
        bestVal = val;
        best = m;
      }
    }
    return best;
  }

  function minimaxChess(depth, alpha, beta, isMaximizing) {
    if (depth === 0) return evaluateBoard();
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) {
      if (chess.in_checkmate()) return isMaximizing ? -99999 : 99999;
      return 0;
    }

    if (isMaximizing) {
      let maxEval = -1000000;
      for (const m of moves) {
        chess.move(m);
        const evalScore = minimaxChess(depth - 1, alpha, beta, false);
        chess.undo();
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = 1000000;
      for (const m of moves) {
        chess.move(m);
        const evalScore = minimaxChess(depth - 1, alpha, beta, true);
        chess.undo();
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  function evaluateBoard() {
    let score = 0;
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p) {
          const val = pieceValues[p.type] || 0;
          score += (p.color === 'w' ? val : -val);
        }
      }
    }
    return chess.turn() === 'w' ? score : -score;
  }

  async function getStarliumMove() {
    try {
      const fen = chess.fen();
      const res = await fetch('/api/games/starlium/next-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen, pgn: chess.pgn(), movesCount: chess.history().length })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.move) return json.move;
      }
    } catch (_) {}
    return getStockfishMove(chess.fen(), 10);
  }

  function executePremoveIfQueued() {
    if (!chess || chess.game_over()) return;
    const isOnline = Boolean(activeOnlineMatch);
    const myColor = isOnline ? activeOnlineMatch.playerColor : 'w';
    if (chess.turn() !== myColor) return;
    if (!premoveFrom || !premoveTo) return;

    const from = premoveFrom;
    const to = premoveTo;
    premoveFrom = null;
    premoveTo = null;

    executeChessMove(from, to);
  }

  function updateChessStatus() {
    const turnEl = document.getElementById('chess-turn-indicator');
    const statusEl = document.getElementById('chess-game-status');
    const pgnEl = document.getElementById('chess-pgn-box');

    if (!chess) return;

    if (turnEl) {
      const isWhite = chess.turn() === 'w';
      turnEl.innerHTML = `
        <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${isWhite ? '#38bdf8' : '#c084fc'}; box-shadow: 0 0 8px ${isWhite ? '#38bdf8' : '#c084fc'};"></span>
        <span>Giliran: ${isWhite ? 'Putih (White to Move)' : 'Hitam (Black to Move)'}</span>
      `;
      turnEl.style.color = isWhite ? '#38bdf8' : '#c084fc';
    }

    if (pgnEl) {
      pgnEl.textContent = chess.pgn() || '1. Menunggu langkah pertama...';
      pgnEl.scrollTop = pgnEl.scrollHeight;
    }

    if (statusEl) {
      if (chess.in_checkmate()) {
        const winner = chess.turn() === 'w' ? 'Hitam' : 'Putih';
        statusEl.textContent = `🏆 SKAKMAT! Pemenang: ${winner}!`;
        statusEl.style.color = '#34d399';
        fireConfetti();
        saveStarliumMatchRecord(winner === 'Putih' ? 'white' : 'black');
        clearInterval(chessClockInterval);
      } else if (chess.in_draw() || chess.in_stalemate() || chess.in_threefold_repetition()) {
        statusEl.textContent = '🤝 Permainan Berakhir Remis (Draw / Stalemate)!';
        statusEl.style.color = '#fbbf24';
        saveStarliumMatchRecord('draw');
        clearInterval(chessClockInterval);
      } else if (chess.in_check()) {
        statusEl.textContent = '⚠️ SKAK! Raja dalam ancaman bahaya!';
        statusEl.style.color = '#fb7185';
      } else {
        statusEl.textContent = '';
      }
    }
  }

  async function saveStarliumMatchRecord(result) {
    try {
      const mode = getChessMode();
      await fetch('/api/games/starlium/save-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: `chess_${Date.now()}`,
          pgn: chess.pgn(),
          fenFinal: chess.fen(),
          result,
          whitePlayer: 'Pemain 1',
          blackPlayer: mode,
          difficulty: mode,
          movesCount: chess.history().length,
          openingName: 'Polaris Standard Match',
        })
      });
      await refreshStarliumTelemetry();
    } catch (_) {}
  }

  // ==================== 2. MINESWEEPER ENGINE ====================
  let msRows = 10, msCols = 10, msMines = 12;
  let msGrid = [];
  let msFirstClick = true;
  let msTimer = 0;
  let msTimerInterval = null;
  let msGameOver = false;

  const NANO_MINE_SVG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="6.5" fill="#0f172a" stroke="#f43f5e" stroke-width="1.8"/>
    <circle cx="12" cy="12" r="2.8" fill="#fb7185"/>
    <line x1="12" y1="2" x2="12" y2="5.5" stroke="#f43f5e" stroke-width="2" stroke-linecap="round"/>
    <line x1="12" y1="18.5" x2="12" y2="22" stroke="#f43f5e" stroke-width="2" stroke-linecap="round"/>
    <line x1="2" y1="12" x2="5.5" y2="12" stroke="#f43f5e" stroke-width="2" stroke-linecap="round"/>
    <line x1="18.5" y1="12" x2="22" y2="12" stroke="#f43f5e" stroke-width="2" stroke-linecap="round"/>
    <line x1="5" y1="5" x2="7.5" y2="7.5" stroke="#f43f5e" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="16.5" y1="16.5" x2="19" y2="19" stroke="#f43f5e" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="5" y1="19" x2="7.5" y2="16.5" stroke="#f43f5e" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="16.5" y1="7.5" x2="19" y2="5" stroke="#f43f5e" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`;

  const NANO_FLAG_SVG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="6" y1="3" x2="6" y2="21" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>
    <path d="M6 4 L19 8.5 L6 13 Z" fill="url(#flagGradMS)" stroke="#38bdf8" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="6" cy="3" r="1.5" fill="#fbbf24"/>
    <line x1="3" y1="21" x2="9" y2="21" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>
    <defs>
      <linearGradient id="flagGradMS" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#38bdf8"/>
        <stop offset="100%" stop-color="#fb7185"/>
      </linearGradient>
    </defs>
  </svg>`;

  function initMinesweeper() {
    msCols = Math.max(5, Math.min(30, parseInt(document.getElementById('ms-cols')?.value) || 10));
    msRows = Math.max(5, Math.min(30, parseInt(document.getElementById('ms-rows')?.value) || 10));
    const maxMines = Math.floor(msCols * msRows * 0.85);
    msMines = Math.max(1, Math.min(maxMines, parseInt(document.getElementById('ms-mines')?.value) || 12));

    msGameOver = false;
    msFirstClick = true;
    clearInterval(msTimerInterval);
    msTimer = 0;
    const timerEl = document.getElementById('ms-timer');
    const counterEl = document.getElementById('ms-mine-counter');
    const faceEl = document.getElementById('ms-face-btn');

    if (timerEl) timerEl.textContent = '⏱️ 000';
    if (counterEl) counterEl.textContent = `💣 ${String(msMines).padStart(3, '0')}`;
    if (faceEl) faceEl.textContent = '🙂';

    msGrid = Array.from({ length: msRows }, () =>
      Array.from({ length: msCols }, () => ({
        mine: false,
        revealed: false,
        flagged: false,
        count: 0
      }))
    );

    renderMinesweeper();
  }

  function renderMinesweeper() {
    const boardEl = document.getElementById('ms-board');
    if (!boardEl) return;
    boardEl.style.gridTemplateColumns = `repeat(${msCols}, 30px)`;
    boardEl.style.gridTemplateRows = `repeat(${msRows}, 30px)`;
    boardEl.innerHTML = '';

    for (let r = 0; r < msRows; r++) {
      for (let c = 0; c < msCols; c++) {
        const cell = msGrid[r][c];
        const cellEl = document.createElement('div');
        cellEl.className = 'mine-cell';
        cellEl.dataset.r = r;
        cellEl.dataset.c = c;

        if (cell.revealed) {
          cellEl.classList.add('revealed');
          if (cell.mine) {
            cellEl.classList.add('mine');
            cellEl.innerHTML = NANO_MINE_SVG;
          } else if (cell.count > 0) {
            cellEl.textContent = cell.count;
            const colors = ['', '#38bdf8', '#34d399', '#fb7185', '#818cf8', '#fbbf24', '#2dd4bf', '#f43f5e', '#a855f7'];
            cellEl.style.color = colors[cell.count] || '#fff';
          }
        } else if (cell.flagged) {
          cellEl.innerHTML = NANO_FLAG_SVG;
        }

        cellEl.addEventListener('click', () => handleMineLeftClick(r, c));
        cellEl.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          handleMineRightClick(r, c);
        });

        boardEl.appendChild(cellEl);
      }
    }
  }

  function handleMineLeftClick(r, c) {
    if (msGameOver) return;
    const cell = msGrid[r][c];
    if (cell.flagged || cell.revealed) return;

    if (msFirstClick) {
      msFirstClick = false;
      placeMines(r, c);
      msTimerInterval = setInterval(() => {
        msTimer++;
        const timerEl = document.getElementById('ms-timer');
        if (timerEl) timerEl.textContent = `⏱️ ${String(Math.min(999, msTimer)).padStart(3, '0')}`;
      }, 1000);
    }

    if (cell.mine) {
      // Game Over: Explosion
      msGameOver = true;
      clearInterval(msTimerInterval);
      const faceEl = document.getElementById('ms-face-btn');
      if (faceEl) faceEl.textContent = '💥';
      sfx.playMineExplosion();

      const boardEl = document.getElementById('ms-board');
      if (boardEl) {
        boardEl.classList.add('shake-anim');
        setTimeout(() => boardEl.classList.remove('shake-anim'), 500);
      }

      revealAllMines();
      return;
    }

    sfx.playMineClick();
    revealCell(r, c);
    checkMinesweeperWin();
    renderMinesweeper();
  }

  function handleMineRightClick(r, c) {
    if (msGameOver || msFirstClick) return;
    const cell = msGrid[r][c];
    if (cell.revealed) return;

    cell.flagged = !cell.flagged;
    sfx.playMineFlag();
    const flaggedCount = msGrid.flat().filter(x => x.flagged).length;
    const counterEl = document.getElementById('ms-mine-counter');
    if (counterEl) counterEl.textContent = `💣 ${String(Math.max(0, msMines - flaggedCount)).padStart(3, '0')}`;
    renderMinesweeper();
  }

  function placeMines(safeR, safeC) {
    let placed = 0;
    while (placed < msMines) {
      const rr = Math.floor(Math.random() * msRows);
      const cc = Math.floor(Math.random() * msCols);
      if (Math.abs(rr - safeR) <= 1 && Math.abs(cc - safeC) <= 1) continue;
      if (!msGrid[rr][cc].mine) {
        msGrid[rr][cc].mine = true;
        placed++;
      }
    }

    for (let r = 0; r < msRows; r++) {
      for (let c = 0; c < msCols; c++) {
        if (!msGrid[r][c].mine) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < msRows && nc >= 0 && nc < msCols && msGrid[nr][nc].mine) {
                count++;
              }
            }
          }
          msGrid[r][c].count = count;
        }
      }
    }
  }

  function revealCell(r, c) {
    if (r < 0 || r >= msRows || c < 0 || c >= msCols) return;
    const cell = msGrid[r][c];
    if (cell.revealed || cell.flagged || cell.mine) return;

    cell.revealed = true;
    if (cell.count === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr !== 0 || dc !== 0) revealCell(r + dr, c + dc);
        }
      }
    }
  }

  function revealAllMines() {
    for (let r = 0; r < msRows; r++) {
      for (let c = 0; c < msCols; c++) {
        if (msGrid[r][c].mine) msGrid[r][c].revealed = true;
      }
    }
    renderMinesweeper();
  }

  function checkMinesweeperWin() {
    let unrevealedNonMines = 0;
    for (let r = 0; r < msRows; r++) {
      for (let c = 0; c < msCols; c++) {
        if (!msGrid[r][c].mine && !msGrid[r][c].revealed) {
          unrevealedNonMines++;
        }
      }
    }
    if (unrevealedNonMines === 0) {
      msGameOver = true;
      clearInterval(msTimerInterval);
      const faceEl = document.getElementById('ms-face-btn');
      if (faceEl) faceEl.textContent = '😎';
      sfx.playMineWin();
      fireConfetti();
    }
  }

  document.getElementById('btn-ms-start')?.addEventListener('click', () => {
    sfx.playMineClick();
    initMinesweeper();
  });
  document.getElementById('ms-face-btn')?.addEventListener('click', () => {
    sfx.playMineClick();
    initMinesweeper();
  });

  // ==================== 3. XOX (TIC-TAC-TOE) ENGINE ====================
  let xoxBoard = Array(9).fill(null);
  let xoxTurn = 'X';
  let xoxGameOver = false;

  const NANO_X_SVG = `<svg viewBox="0 0 40 40" width="48" height="48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="8" y1="8" x2="32" y2="32" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
    <line x1="32" y1="8" x2="8" y2="32" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
    <circle cx="20" cy="20" r="3" fill="#bae6fd"/>
  </svg>`;

  const NANO_O_SVG = `<svg viewBox="0 0 40 40" width="48" height="48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="13" stroke="#fb7185" stroke-width="4.5"/>
    <circle cx="20" cy="20" r="5" fill="rgba(251, 113, 133, 0.25)"/>
  </svg>`;

  function initXOX() {
    xoxBoard = Array(9).fill(null);
    xoxTurn = 'X';
    xoxGameOver = false;
    const statusText = document.getElementById('xox-status-text');
    if (statusText) {
      statusText.textContent = 'Giliran: Pemain X';
      statusText.style.color = 'var(--accent-cyan)';
    }
    document.querySelectorAll('.xox-cell').forEach(cell => {
      cell.innerHTML = '';
      cell.className = 'xox-cell';
    });
  }

  const winningLines = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6]
  ];

  function checkXOXWinner(board) {
    for (const [a, b, c] of winningLines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], line: [a, b, c] };
      }
    }
    if (board.every(x => x !== null)) return { winner: 'tie' };
    return null;
  }

  document.querySelectorAll('.xox-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      const idx = parseInt(cell.dataset.idx);
      if (xoxGameOver || xoxBoard[idx]) return;

      const mode = document.getElementById('xox-mode-select')?.value || 'pvp';
      if (mode !== 'pvp' && xoxTurn === 'O') return;

      xoxBoard[idx] = xoxTurn;
      cell.innerHTML = xoxTurn === 'X' ? NANO_X_SVG : NANO_O_SVG;
      cell.classList.add(xoxTurn.toLowerCase());
      sfx.playXOXPlace(xoxTurn);

      const winResult = checkXOXWinner(xoxBoard);
      if (winResult) {
        finishXOX(winResult);
        return;
      }

      xoxTurn = xoxTurn === 'X' ? 'O' : 'X';
      const statusText = document.getElementById('xox-status-text');
      if (statusText) {
        statusText.textContent = `Giliran: Pemain ${xoxTurn}`;
        statusText.style.color = xoxTurn === 'X' ? 'var(--accent-cyan)' : 'var(--accent-rose)';
      }

      if (mode !== 'pvp' && xoxTurn === 'O') {
        setTimeout(triggerBotXOX, 260);
      }
    });
  });

  function triggerBotXOX() {
    if (xoxGameOver) return;
    const mode = document.getElementById('xox-mode-select')?.value || 'medium';
    let idx = null;

    if (mode === 'easy') {
      const empty = xoxBoard.map((v, i) => v === null ? i : null).filter(v => v !== null);
      idx = empty[Math.floor(Math.random() * empty.length)];
    } else if (mode === 'medium') {
      idx = findWinningMove('O') || findWinningMove('X');
      if (idx === null) {
        const empty = xoxBoard.map((v, i) => v === null ? i : null).filter(v => v !== null);
        idx = empty[Math.floor(Math.random() * empty.length)];
      }
    } else if (mode === 'hard') {
      idx = findWinningMove('O') || findWinningMove('X');
      if (idx === null && xoxBoard[4] === null) idx = 4;
      if (idx === null) {
        const corners = [0, 2, 6, 8].filter(i => xoxBoard[i] === null);
        if (corners.length) idx = corners[Math.floor(Math.random() * corners.length)];
      }
      if (idx === null) {
        const empty = xoxBoard.map((v, i) => v === null ? i : null).filter(v => v !== null);
        idx = empty[Math.floor(Math.random() * empty.length)];
      }
    } else {
      idx = getBestXOXMinimax();
    }

    if (idx !== null) {
      const cell = document.querySelector(`.xox-cell[data-idx="${idx}"]`);
      xoxBoard[idx] = 'O';
      if (cell) {
        cell.innerHTML = NANO_O_SVG;
        cell.classList.add('o');
      }
      sfx.playXOXPlace('O');

      const winResult = checkXOXWinner(xoxBoard);
      if (winResult) {
        finishXOX(winResult);
        return;
      }

      xoxTurn = 'X';
      const statusText = document.getElementById('xox-status-text');
      if (statusText) {
        statusText.textContent = 'Giliran: Pemain X';
        statusText.style.color = 'var(--accent-cyan)';
      }
    }
  }

  function findWinningMove(player) {
    for (let i = 0; i < 9; i++) {
      if (xoxBoard[i] === null) {
        xoxBoard[i] = player;
        const res = checkXOXWinner(xoxBoard);
        xoxBoard[i] = null;
        if (res && res.winner === player) return i;
      }
    }
    return null;
  }

  function getBestXOXMinimax() {
    let bestScore = -Infinity;
    let move = null;
    for (let i = 0; i < 9; i++) {
      if (xoxBoard[i] === null) {
        xoxBoard[i] = 'O';
        const score = minimaxXOX(xoxBoard, 0, false);
        xoxBoard[i] = null;
        if (score > bestScore) {
          bestScore = score;
          move = i;
        }
      }
    }
    return move;
  }

  function minimaxXOX(board, depth, isMaximizing) {
    const res = checkXOXWinner(board);
    if (res) {
      if (res.winner === 'O') return 10 - depth;
      if (res.winner === 'X') return depth - 10;
      if (res.winner === 'tie') return 0;
    }

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
          board[i] = 'O';
          maxScore = Math.max(maxScore, minimaxXOX(board, depth + 1, false));
          board[i] = null;
        }
      }
      return maxScore;
    } else {
      let minScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
          board[i] = 'X';
          minScore = Math.min(minScore, minimaxXOX(board, depth + 1, true));
          board[i] = null;
        }
      }
      return minScore;
    }
  }

  function finishXOX(res) {
    xoxGameOver = true;
    const statusText = document.getElementById('xox-status-text');
    if (res.winner === 'tie') {
      if (statusText) {
        statusText.textContent = '🤝 Permainan Berakhir Seri (Draw)!';
        statusText.style.color = 'var(--accent-amber)';
      }
      sfx.playChessMove();
    } else {
      if (statusText) {
        statusText.textContent = `🎉 Pemenang: Pemain ${res.winner}!`;
        statusText.style.color = res.winner === 'X' ? 'var(--accent-cyan)' : 'var(--accent-rose)';
      }
      res.line?.forEach(i => {
        const c = document.querySelector(`.xox-cell[data-idx="${i}"]`);
        if (c) c.style.boxShadow = `0 0 25px ${res.winner === 'X' ? '#38bdf8' : '#fb7185'}`;
      });
      sfx.playXOXWin();
      fireConfetti();
    }
  }

  document.getElementById('btn-xox-new')?.addEventListener('click', () => {
    sfx.playChessMove();
    initXOX();
  });

  // ==================== 4. SOS ARENA ENGINE ====================
  let sosSize = 6;
  let sosGrid = [];
  let sosCurrentPlayer = 1;
  let sosP1Score = 0, sosP2Score = 0;
  let sosChosenLetter = 'S';
  let sosGameOver = false;

  function initSOS() {
    sosSize = Math.max(3, Math.min(12, parseInt(document.getElementById('sos-grid-size')?.value) || 6));
    sosGrid = Array.from({ length: sosSize }, () => Array(sosSize).fill(null));
    sosCurrentPlayer = 1;
    sosP1Score = 0;
    sosP2Score = 0;
    sosGameOver = false;

    const p1ScoreEl = document.getElementById('sos-p1-score');
    const p2ScoreEl = document.getElementById('sos-p2-score');
    if (p1ScoreEl) p1ScoreEl.textContent = '0';
    if (p2ScoreEl) p2ScoreEl.textContent = '0';

    updateSOSTurnStatus();
    renderSOSBoard();
  }

  function renderSOSBoard() {
    const boardEl = document.getElementById('sos-board');
    if (!boardEl) return;
    boardEl.style.gridTemplateColumns = `repeat(${sosSize}, 44px)`;
    boardEl.style.gridTemplateRows = `repeat(${sosSize}, 44px)`;
    boardEl.innerHTML = '';

    for (let r = 0; r < sosSize; r++) {
      for (let c = 0; c < sosSize; c++) {
        const cellVal = sosGrid[r][c];
        const cellEl = document.createElement('div');
        cellEl.className = 'sos-cell';
        cellEl.dataset.r = r;
        cellEl.dataset.c = c;
        cellEl.textContent = cellVal || '';

        if (cellVal === null && !sosGameOver) {
          cellEl.addEventListener('click', () => handleSOSCellClick(r, c));
        }

        boardEl.appendChild(cellEl);
      }
    }
  }

  function handleSOSCellClick(r, c) {
    if (sosGameOver || sosGrid[r][c] !== null) return;
    const mode = document.getElementById('sos-mode-select')?.value || 'hard';
    if (mode !== 'pvp' && sosCurrentPlayer === 2) return;

    makeSOSMove(r, c, sosChosenLetter);
  }

  function makeSOSMove(r, c, letter) {
    sosGrid[r][c] = letter;
    sfx.playSOSPlace(letter);

    const formedCount = checkFormedSOS(r, c, letter);
    if (formedCount > 0) {
      sfx.playSOSFormed();
      if (sosCurrentPlayer === 1) {
        sosP1Score += formedCount;
        const sEl = document.getElementById('sos-p1-score');
        if (sEl) sEl.textContent = sosP1Score;
      } else {
        sosP2Score += formedCount;
        const sEl = document.getElementById('sos-p2-score');
        if (sEl) sEl.textContent = sosP2Score;
      }
      // Highlight formed cell
      const cellEl = document.querySelector(`.sos-cell[data-r="${r}"][data-c="${c}"]`);
      if (cellEl) cellEl.classList.add(sosCurrentPlayer === 1 ? 'p1-sos' : 'p2-sos');
    } else {
      sosCurrentPlayer = sosCurrentPlayer === 1 ? 2 : 1;
    }

    renderSOSBoard();
    updateSOSTurnStatus();

    if (sosGrid.flat().every(x => x !== null)) {
      finishSOS();
      return;
    }

    const mode = document.getElementById('sos-mode-select')?.value || 'hard';
    if (!sosGameOver && mode !== 'pvp' && sosCurrentPlayer === 2) {
      setTimeout(triggerBotSOS, 280);
    }
  }

  function checkFormedSOS(r, c, letter) {
    let count = 0;
    const dirs = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal \
      [1, -1]   // diagonal /
    ];

    dirs.forEach(([dr, dc]) => {
      if (letter === 'O') {
        if (getSOSCell(r - dr, c - dc) === 'S' && getSOSCell(r + dr, c + dc) === 'S') count++;
      } else if (letter === 'S') {
        if (getSOSCell(r + dr, c + dc) === 'O' && getSOSCell(r + 2*dr, c + 2*dc) === 'S') count++;
        if (getSOSCell(r - dr, c - dc) === 'O' && getSOSCell(r - 2*dr, c - 2*dc) === 'S') count++;
      }
    });

    return count;
  }

  function getSOSCell(r, c) {
    if (r < 0 || r >= sosSize || c < 0 || c >= sosSize) return null;
    return sosGrid[r][c];
  }

  function triggerBotSOS() {
    if (sosGameOver) return;
    const mode = document.getElementById('sos-mode-select')?.value || 'hard';
    const empties = [];
    for (let r = 0; r < sosSize; r++) {
      for (let c = 0; c < sosSize; c++) {
        if (sosGrid[r][c] === null) empties.push({ r, c });
      }
    }
    if (empties.length === 0) return;

    let chosen = null;
    let chosenLetter = 'S';

    // 1. Try to find immediate scoring move
    for (const empty of empties) {
      for (const l of ['S', 'O']) {
        if (checkFormedSOS(empty.r, empty.c, l) > 0) {
          chosen = empty;
          chosenLetter = l;
          break;
        }
      }
      if (chosen) break;
    }

    if (!chosen) {
      chosen = empties[Math.floor(Math.random() * empties.length)];
      chosenLetter = Math.random() > 0.5 ? 'S' : 'O';
    }

    makeSOSMove(chosen.r, chosen.c, chosenLetter);
  }

  function updateSOSTurnStatus() {
    const statusEl = document.getElementById('sos-turn-status');
    if (!statusEl) return;
    statusEl.textContent = `Giliran: Pemain ${sosCurrentPlayer} (${sosCurrentPlayer === 1 ? 'Biru' : 'Merah'})`;
    statusEl.style.color = sosCurrentPlayer === 1 ? '#38bdf8' : '#fb7185';
  }

  function finishSOS() {
    sosGameOver = true;
    const statusEl = document.getElementById('sos-turn-status');
    if (statusEl) {
      if (sosP1Score > sosP2Score) {
        statusEl.textContent = `🎉 PEMAIN 1 MENANG! (${sosP1Score} vs ${sosP2Score})`;
        statusEl.style.color = '#38bdf8';
      } else if (sosP2Score > sosP1Score) {
        statusEl.textContent = `🎉 PEMAIN 2 MENANG! (${sosP2Score} vs ${sosP1Score})`;
        statusEl.style.color = '#fb7185';
      } else {
        statusEl.textContent = `🤝 HASIL SERI! Skor seimbang (${sosP1Score} - ${sosP2Score})`;
        statusEl.style.color = '#fbbf24';
      }
    }
    sfx.playChessCheckmate();
    fireConfetti();
  }

  document.getElementById('btn-sos-pick-s')?.addEventListener('click', () => {
    sosChosenLetter = 'S';
    document.getElementById('btn-sos-pick-s')?.classList.add('active');
    document.getElementById('btn-sos-pick-o')?.classList.remove('active');
    sfx.playSOSPlace('S');
  });
  document.getElementById('btn-sos-pick-o')?.addEventListener('click', () => {
    sosChosenLetter = 'O';
    document.getElementById('btn-sos-pick-o')?.classList.add('active');
    document.getElementById('btn-sos-pick-s')?.classList.remove('active');
    sfx.playSOSPlace('O');
  });
  document.getElementById('btn-sos-new')?.addEventListener('click', () => {
    sfx.playChessMove();
    initSOS();
  });

  // ==================== 5. GALAXY SNAKE ENGINE ====================
  let snakeCanvas, snakeCtx;
  let snakeP1 = [], snakeP2 = [];
  let dirP1 = { x: 1, y: 0 }, dirP2 = { x: -1, y: 0 };
  let snakeFood = { x: 10, y: 10 };
  let snakeP1Score = 0, snakeP2Score = 0;
  let snakeGameInterval = null;
  let foodOrbitTheta = 0;
  let floatingScores = [];
  let deathParticles = [];
  let snakeIsDead = false;
  const gridSize = 20;

  function initSnake() {
    window.__snakeRunning = true;
    snakeCanvas = document.getElementById('snake-canvas');
    if (!snakeCanvas) return;
    snakeCtx = snakeCanvas.getContext('2d');

    const mode = document.getElementById('snake-mode-select')?.value || 'solo';
    const p2Box = document.getElementById('snake-p2-score-box');
    if (p2Box) p2Box.style.display = mode === 'duo' ? 'block' : 'none';

    snakeP1 = [{ x: 6, y: 10 }, { x: 5, y: 10 }, { x: 4, y: 10 }, { x: 3, y: 10 }];
    dirP1 = { x: 1, y: 0 };
    snakeP1Score = 0;
    snakeIsDead = false;
    floatingScores = [];
    deathParticles = [];

    const p1El = document.getElementById('snake-p1-score');
    if (p1El) p1El.textContent = '0';

    if (mode === 'duo') {
      snakeP2 = [{ x: 23, y: 10 }, { x: 24, y: 10 }, { x: 25, y: 10 }, { x: 26, y: 10 }];
      dirP2 = { x: -1, y: 0 };
      snakeP2Score = 0;
      const p2El = document.getElementById('snake-p2-score');
      if (p2El) p2El.textContent = '0';
    }

    spawnSnakeFood();
    clearInterval(snakeGameInterval);
    snakeGameInterval = setInterval(updateSnakeGame, 105);
    sfx.playChessMove();
  }

  function spawnSnakeFood() {
    if (!snakeCanvas) return;
    const maxX = Math.floor(snakeCanvas.width / gridSize);
    const maxY = Math.floor(snakeCanvas.height / gridSize);
    snakeFood = {
      x: Math.floor(Math.random() * maxX),
      y: Math.floor(Math.random() * maxY)
    };
  }

  function triggerSnakeCrash(loserText) {
    snakeIsDead = true;
    clearInterval(snakeGameInterval);
    sfx.playSnakeDie();

    // Spawn 32 colorful cosmic explosion particles
    const head = snakeP1[0];
    const originX = head.x * gridSize + gridSize / 2;
    const originY = head.y * gridSize + gridSize / 2;

    for (let i = 0; i < 32; i++) {
      const angle = (Math.PI * 2 / 32) * i + Math.random() * 0.2;
      const speed = Math.random() * 4.5 + 1.5;
      deathParticles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        color: ['#38bdf8', '#34d399', '#fb7185', '#fbbf24', '#c084fc'][Math.floor(Math.random() * 5)],
        alpha: 1
      });
    }

    // Animate explosion and draw arcade banner
    let frames = 0;
    const animId = setInterval(() => {
      frames++;
      drawSnakeScene();

      // Update particles
      deathParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.025;
      });
      deathParticles = deathParticles.filter(p => p.alpha > 0);

      // Draw Arcade Game Over Banner
      if (frames > 15) {
        snakeCtx.save();
        snakeCtx.fillStyle = 'rgba(7, 9, 14, 0.85)';
        snakeCtx.fillRect(snakeCanvas.width / 2 - 160, snakeCanvas.height / 2 - 65, 320, 130);
        snakeCtx.strokeStyle = '#f43f5e';
        snakeCtx.lineWidth = 2;
        snakeCtx.strokeRect(snakeCanvas.width / 2 - 160, snakeCanvas.height / 2 - 65, 320, 130);

        snakeCtx.fillStyle = '#fff';
        snakeCtx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
        snakeCtx.textAlign = 'center';
        snakeCtx.fillText('💥 ' + loserText, snakeCanvas.width / 2, snakeCanvas.height / 2 - 20);

        snakeCtx.fillStyle = '#34d399';
        snakeCtx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
        snakeCtx.fillText(`Skor Akhir P1: ${snakeP1Score}`, snakeCanvas.width / 2, snakeCanvas.height / 2 + 10);

        snakeCtx.fillStyle = 'var(--text-muted, #94a3b8)';
        snakeCtx.font = '11px "JetBrains Mono", monospace';
        snakeCtx.fillText('Klik [▶️ Mulai / Reset] untuk main lagi!', snakeCanvas.width / 2, snakeCanvas.height / 2 + 38);
        snakeCtx.restore();
      }

      if (frames > 40 && deathParticles.length === 0) {
        clearInterval(animId);
      }
    }, 30);
  }

  function updateSnakeGame() {
    if (snakeIsDead || !snakeCanvas) return;
    const mode = document.getElementById('snake-mode-select')?.value || 'solo';
    const maxX = Math.floor(snakeCanvas.width / gridSize);
    const maxY = Math.floor(snakeCanvas.height / gridSize);

    // P1 Movement
    const head1 = { x: snakeP1[0].x + dirP1.x, y: snakeP1[0].y + dirP1.y };
    if (head1.x < 0 || head1.x >= maxX || head1.y < 0 || head1.y >= maxY || snakeP1.some(s => s.x === head1.x && s.y === head1.y)) {
      triggerSnakeCrash('Pemain 1 Game Over!');
      return;
    }
    snakeP1.unshift(head1);
    if (head1.x === snakeFood.x && head1.y === snakeFood.y) {
      snakeP1Score += 10;
      const sEl = document.getElementById('snake-p1-score');
      if (sEl) sEl.textContent = snakeP1Score;
      sfx.playSnakeEat();
      floatingScores.push({
        x: head1.x * gridSize + gridSize / 2,
        y: head1.y * gridSize,
        text: '+10',
        alpha: 1
      });
      spawnSnakeFood();
    } else {
      snakeP1.pop();
    }

    // P2 Movement (Duo)
    if (mode === 'duo' && snakeP2.length) {
      const head2 = { x: snakeP2[0].x + dirP2.x, y: snakeP2[0].y + dirP2.y };
      if (head2.x < 0 || head2.x >= maxX || head2.y < 0 || head2.y >= maxY || snakeP2.some(s => s.x === head2.x && s.y === head2.y)) {
        triggerSnakeCrash('Pemain 2 Game Over!');
        return;
      }
      snakeP2.unshift(head2);
      if (head2.x === snakeFood.x && head2.y === snakeFood.y) {
        snakeP2Score += 10;
        const sEl = document.getElementById('snake-p2-score');
        if (sEl) sEl.textContent = snakeP2Score;
        sfx.playSnakeEat();
        floatingScores.push({
          x: head2.x * gridSize + gridSize / 2,
          y: head2.y * gridSize,
          text: '+10',
          alpha: 1
        });
        spawnSnakeFood();
      } else {
        snakeP2.pop();
      }
    }

    drawSnakeScene();
  }

  function drawSnakeScene() {
    if (!snakeCanvas || !snakeCtx) return;
    const mode = document.getElementById('snake-mode-select')?.value || 'solo';

    // 1. Deep Space Canvas Background with starry grid
    snakeCtx.fillStyle = '#060913';
    snakeCtx.fillRect(0, 0, snakeCanvas.width, snakeCanvas.height);

    // Subtle star dust
    snakeCtx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let x = 10; x < snakeCanvas.width; x += 40) {
      for (let y = 10; y < snakeCanvas.height; y += 40) {
        snakeCtx.fillRect(x, y, 1.5, 1.5);
      }
    }

    // 2. Nano Banana Cosmic Star Food (with 4 orbiting satellites)
    foodOrbitTheta += 0.08;
    const foodCenterX = snakeFood.x * gridSize + gridSize / 2;
    const foodCenterY = snakeFood.y * gridSize + gridSize / 2;

    // Glowing halo pulse
    const pulseScale = 1 + Math.sin(foodOrbitTheta * 1.5) * 0.15;
    const grad = snakeCtx.createRadialGradient(foodCenterX, foodCenterY, 2, foodCenterX, foodCenterY, 14 * pulseScale);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.4, '#fbbf24');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0)');

    snakeCtx.save();
    snakeCtx.fillStyle = grad;
    snakeCtx.beginPath();
    snakeCtx.arc(foodCenterX, foodCenterY, 14 * pulseScale, 0, Math.PI * 2);
    snakeCtx.fill();

    // Central star diamond
    snakeCtx.fillStyle = '#fff';
    snakeCtx.beginPath();
    snakeCtx.arc(foodCenterX, foodCenterY, 4.5, 0, Math.PI * 2);
    snakeCtx.fill();

    // Orbiting mini spark particles
    for (let i = 0; i < 4; i++) {
      const angle = foodOrbitTheta + (i * Math.PI / 2);
      const orbX = foodCenterX + Math.cos(angle) * (10 * pulseScale);
      const orbY = foodCenterY + Math.sin(angle) * (10 * pulseScale);
      snakeCtx.fillStyle = ['#38bdf8', '#34d399', '#fb7185', '#c084fc'][i];
      snakeCtx.beginPath();
      snakeCtx.arc(orbX, orbY, 2, 0, Math.PI * 2);
      snakeCtx.fill();
    }
    snakeCtx.restore();

    // 3. Render Snake 1 (Celestial Emerald)
    drawCyberSnake(snakeP1, dirP1, '#34d399', '#059669', '#6ee7b7');

    // 4. Render Snake 2 (Cyber Rose in Duo mode)
    if (mode === 'duo' && snakeP2.length) {
      drawCyberSnake(snakeP2, dirP2, '#fb7185', '#e11d48', '#fda4af');
    }

    // 5. Floating Score Popups
    floatingScores.forEach(fs => {
      snakeCtx.save();
      snakeCtx.font = 'bold 12px "JetBrains Mono", monospace';
      snakeCtx.fillStyle = `rgba(52, 211, 153, ${fs.alpha})`;
      snakeCtx.textAlign = 'center';
      snakeCtx.fillText(fs.text, fs.x, fs.y);
      fs.y -= 1;
      fs.alpha -= 0.03;
      snakeCtx.restore();
    });
    floatingScores = floatingScores.filter(fs => fs.alpha > 0);

    // 6. Death explosion particles
    deathParticles.forEach(p => {
      snakeCtx.save();
      snakeCtx.fillStyle = p.color;
      snakeCtx.globalAlpha = Math.max(0, p.alpha);
      snakeCtx.beginPath();
      snakeCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      snakeCtx.fill();
      snakeCtx.restore();
    });
  }

  function drawCyberSnake(segments, dir, primaryColor, darkColor, lightColor) {
    if (!segments.length) return;

    snakeCtx.save();
    snakeCtx.shadowBlur = 10;
    snakeCtx.shadowColor = primaryColor;

    // Body segments with organic taper
    for (let i = segments.length - 1; i > 0; i--) {
      const seg = segments[i];
      const cx = seg.x * gridSize + gridSize / 2;
      const cy = seg.y * gridSize + gridSize / 2;
      const radius = (gridSize / 2 - 1.5) * (1 - 0.28 * (i / segments.length));

      snakeCtx.fillStyle = i % 2 === 0 ? primaryColor : darkColor;
      snakeCtx.beginPath();
      snakeCtx.arc(cx, cy, radius, 0, Math.PI * 2);
      snakeCtx.fill();
    }

    // Head segment
    const head = segments[0];
    const headX = head.x * gridSize + gridSize / 2;
    const headY = head.y * gridSize + gridSize / 2;
    const headRadius = gridSize / 2 - 1;

    snakeCtx.fillStyle = lightColor;
    snakeCtx.beginPath();
    snakeCtx.arc(headX, headY, headRadius, 0, Math.PI * 2);
    snakeCtx.fill();

    // Cute animated eyes facing moving direction
    snakeCtx.shadowBlur = 0;
    const eyeOffsetX = dir.x === 0 ? 3.5 : (dir.x > 0 ? 4 : -4);
    const eyeOffsetY = dir.y === 0 ? 3.5 : (dir.y > 0 ? 4 : -4);

    let eye1X, eye1Y, eye2X, eye2Y;
    if (dir.x !== 0) {
      eye1X = headX + eyeOffsetX;
      eye1Y = headY - 3.5;
      eye2X = headX + eyeOffsetX;
      eye2Y = headY + 3.5;
    } else {
      eye1X = headX - 3.5;
      eye1Y = headY + eyeOffsetY;
      eye2X = headX + 3.5;
      eye2Y = headY + eyeOffsetY;
    }

    // Eye whites
    snakeCtx.fillStyle = '#ffffff';
    snakeCtx.beginPath();
    snakeCtx.arc(eye1X, eye1Y, 2.2, 0, Math.PI * 2);
    snakeCtx.arc(eye2X, eye2Y, 2.2, 0, Math.PI * 2);
    snakeCtx.fill();

    // Eye pupils
    snakeCtx.fillStyle = '#0f172a';
    snakeCtx.beginPath();
    snakeCtx.arc(eye1X + dir.x * 0.8, eye1Y + dir.y * 0.8, 1.2, 0, Math.PI * 2);
    snakeCtx.arc(eye2X + dir.x * 0.8, eye2Y + dir.y * 0.8, 1.2, 0, Math.PI * 2);
    snakeCtx.fill();

    snakeCtx.restore();
  }

  window.addEventListener('keydown', (e) => {
    // P1: WASD
    if (e.key === 'w' || e.key === 'W') { if (dirP1.y === 0) { dirP1 = { x: 0, y: -1 }; sfx.playSnakeTurn(); } }
    if (e.key === 's' || e.key === 'S') { if (dirP1.y === 0) { dirP1 = { x: 0, y: 1 }; sfx.playSnakeTurn(); } }
    if (e.key === 'a' || e.key === 'A') { if (dirP1.x === 0) { dirP1 = { x: -1, y: 0 }; sfx.playSnakeTurn(); } }
    if (e.key === 'd' || e.key === 'D') { if (dirP1.x === 0) { dirP1 = { x: 1, y: 0 }; sfx.playSnakeTurn(); } }

    // P2: Arrows
    if (e.key === 'ArrowUp') { if (dirP2.y === 0) { dirP2 = { x: 0, y: -1 }; sfx.playSnakeTurn(); } }
    if (e.key === 'ArrowDown') { if (dirP2.y === 0) { dirP2 = { x: 0, y: 1 }; sfx.playSnakeTurn(); } }
    if (e.key === 'ArrowLeft') { if (dirP2.x === 0) { dirP2 = { x: -1, y: 0 }; sfx.playSnakeTurn(); } }
    if (e.key === 'ArrowRight') { if (dirP2.x === 0) { dirP2 = { x: 1, y: 0 }; sfx.playSnakeTurn(); } }
  });

  document.getElementById('btn-snake-start')?.addEventListener('click', initSnake);

  // ==================== 6. COSMIC MEMORY FLIP (1 - 5 PLAYERS) ====================
  const memoryIcons = ['🚀', '🛸', '👾', '🪐', '🌟', '🍌', '💎', '⚡', '🔮', '👑', '🛡️', '☄️'];
  let memoryDeck = [];
  let memoryFlipped = [];
  let memoryScores = [];
  let memoryTurn = 0;
  let memoryTotalPlayers = 2;

  function initMemory() {
    window.__memoryStarted = true;
    memoryTotalPlayers = parseInt(document.getElementById('memory-players-count')?.value) || 2;
    memoryScores = Array(memoryTotalPlayers).fill(0);
    memoryTurn = 0;
    memoryFlipped = [];

    const paired = [...memoryIcons, ...memoryIcons].sort(() => Math.random() - 0.5);
    memoryDeck = paired.map((icon, id) => ({ id, icon, matched: false }));

    renderMemoryHUD();
    renderMemoryGrid();
    sfx.playCardFlip();
  }

  function renderMemoryHUD() {
    const hud = document.getElementById('memory-players-hud');
    if (!hud) return;
    hud.innerHTML = '';

    const colors = ['#38bdf8', '#fb7185', '#34d399', '#c084fc', '#fbbf24'];

    memoryScores.forEach((score, i) => {
      const card = document.createElement('div');
      const isTurn = i === memoryTurn;
      card.style.cssText = `
        background: ${isTurn ? 'rgba(56, 189, 248, 0.2)' : 'rgba(0,0,0,0.3)'};
        border: 2px solid ${isTurn ? colors[i] : 'var(--border-subtle)'};
        padding: 8px 16px; border-radius: 10px; font-weight: 800; font-size: 0.85rem;
        color: ${colors[i]}; display: flex; align-items: center; gap: 8px;
        box-shadow: ${isTurn ? `0 0 15px ${colors[i]}40` : 'none'};
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      `;
      card.innerHTML = `<span>👤 P${i + 1}:</span> <span>${score} Pasang</span>`;
      hud.appendChild(card);
    });
  }

  function renderMemoryGrid() {
    const grid = document.getElementById('memory-grid');
    if (!grid) return;
    grid.innerHTML = '';

    memoryDeck.forEach((card, idx) => {
      const el = document.createElement('div');
      const isUp = card.matched || memoryFlipped.includes(idx);
      el.style.cssText = `
        height: 80px; background: ${isUp ? '#1e293b' : 'rgba(255,255,255,0.06)'};
        border: 2px solid ${card.matched ? '#34d399' : (isUp ? '#38bdf8' : 'var(--border-subtle)')};
        border-radius: 12px; display: flex; align-items: center; justify-content: center;
        font-size: ${isUp ? '2.1rem' : '1.2rem'}; cursor: ${card.matched ? 'default' : 'pointer'};
        user-select: none; transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), background 0.3s;
        box-shadow: ${isUp ? '0 8px 20px rgba(56, 189, 248, 0.25)' : 'none'};
      `;
      el.textContent = isUp ? card.icon : '🍌';

      if (!card.matched && !memoryFlipped.includes(idx)) {
        el.addEventListener('click', () => handleMemoryFlip(idx));
      }
      grid.appendChild(el);
    });
  }

  function handleMemoryFlip(idx) {
    if (memoryFlipped.length >= 2 || memoryFlipped.includes(idx)) return;
    memoryFlipped.push(idx);
    sfx.playCardFlip();
    renderMemoryGrid();

    if (memoryFlipped.length === 2) {
      const [i1, i2] = memoryFlipped;
      if (memoryDeck[i1].icon === memoryDeck[i2].icon) {
        memoryDeck[i1].matched = true;
        memoryDeck[i2].matched = true;
        memoryScores[memoryTurn]++;
        memoryFlipped = [];
        sfx.playCardMatch();
        fireConfetti();
        renderMemoryHUD();
        renderMemoryGrid();

        if (memoryDeck.every(c => c.matched)) {
          const max = Math.max(...memoryScores);
          const winnerIdx = memoryScores.indexOf(max);
          sfx.playChessCheckmate();
          alert(`Game Selesai! Pemenang adalah Pemain ${winnerIdx + 1} dengan ${max} pasang!`);
        }
      } else {
        sfx.playCardMismatch();
        setTimeout(() => {
          memoryFlipped = [];
          memoryTurn = (memoryTurn + 1) % memoryTotalPlayers;
          renderMemoryHUD();
          renderMemoryGrid();
        }, 900);
      }
    }
  }

  document.getElementById('btn-memory-new')?.addEventListener('click', () => {
    sfx.playCardFlip();
    initMemory();
  });

  // ==================== 7. DOTS & BOXES ENGINE ====================
  let dotsN = 4;
  let dotsPlayers = 2;
  let dotsLinesH = [];
  let dotsLinesV = [];
  let dotsBoxes = [];
  let dotsTurn = 0;
  let dotsScores = [];
  let dotsVsBot = false;

  function initDots() {
    window.__dotsStarted = true;
    dotsN = parseInt(document.getElementById('dots-grid-size')?.value) || 4;
    const pVal = document.getElementById('dots-players-count')?.value || '2';
    if (pVal === 'vs_bot') {
      dotsPlayers = 2;
      dotsVsBot = true;
    } else {
      dotsPlayers = parseInt(pVal) || 2;
      dotsVsBot = false;
    }

    dotsLinesH = Array.from({ length: dotsN + 1 }, () => Array(dotsN).fill(null));
    dotsLinesV = Array.from({ length: dotsN }, () => Array(dotsN + 1).fill(null));
    dotsBoxes = Array.from({ length: dotsN }, () => Array(dotsN).fill(null));
    dotsTurn = 0;
    dotsScores = Array(dotsPlayers).fill(0);

    renderDotsHUD();
    renderDotsBoard();
    sfx.playDotsLine();
  }

  const dotColors = ['#38bdf8', '#fb7185', '#34d399', '#c084fc', '#fbbf24'];

  function renderDotsHUD() {
    const hud = document.getElementById('dots-players-hud');
    const turnText = document.getElementById('dots-turn-text');
    if (!hud) return;
    hud.innerHTML = '';

    dotsScores.forEach((score, i) => {
      const card = document.createElement('div');
      const isTurn = i === dotsTurn;
      card.style.cssText = `
        background: ${isTurn ? `${dotColors[i]}25` : 'rgba(0,0,0,0.3)'};
        border: 2px solid ${isTurn ? dotColors[i] : 'var(--border-subtle)'};
        padding: 8px 16px; border-radius: 10px; font-weight: 800; font-size: 0.85rem;
        color: ${dotColors[i]}; display: flex; align-items: center; gap: 8px;
        box-shadow: ${isTurn ? `0 0 15px ${dotColors[i]}40` : 'none'};
      `;
      const label = dotsVsBot && i === 1 ? '🤖 Bot AI' : `👤 Pemain ${i + 1}`;
      card.innerHTML = `<span>${label}:</span> <span>${score} Kotak</span>`;
      hud.appendChild(card);
    });

    if (turnText) {
      turnText.textContent = `Giliran: ${dotsVsBot && dotsTurn === 1 ? 'Bot AI' : `Pemain ${dotsTurn + 1}`}`;
      turnText.style.color = dotColors[dotsTurn];
    }
  }

  function renderDotsBoard() {
    const container = document.getElementById('dots-canvas-container');
    if (!container) return;
    container.innerHTML = '';

    const spacing = 58;
    const totalSize = (dotsN * spacing) + 40;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', totalSize);
    svg.setAttribute('height', totalSize);
    svg.style.userSelect = 'none';

    // 1. Boxes
    for (let r = 0; r < dotsN; r++) {
      for (let c = 0; c < dotsN; c++) {
        const owner = dotsBoxes[r][c];
        if (owner !== null) {
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', 20 + c * spacing);
          rect.setAttribute('y', 20 + r * spacing);
          rect.setAttribute('width', spacing);
          rect.setAttribute('height', spacing);
          rect.setAttribute('fill', `${dotColors[owner]}40`);
          svg.appendChild(rect);

          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', 20 + c * spacing + spacing / 2);
          text.setAttribute('y', 20 + r * spacing + spacing / 2 + 5);
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('fill', dotColors[owner]);
          text.setAttribute('font-weight', '900');
          text.setAttribute('font-size', '14');
          text.textContent = dotsVsBot && owner === 1 ? 'BOT' : `P${owner + 1}`;
          svg.appendChild(text);
        }
      }
    }

    // 2. Horizontal Lines
    for (let r = 0; r <= dotsN; r++) {
      for (let c = 0; c < dotsN; c++) {
        const owner = dotsLinesH[r][c];
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', 20 + c * spacing);
        line.setAttribute('y1', 20 + r * spacing);
        line.setAttribute('x2', 20 + (c + 1) * spacing);
        line.setAttribute('y2', 20 + r * spacing);
        line.setAttribute('stroke', owner !== null ? dotColors[owner] : 'rgba(255,255,255,0.18)');
        line.setAttribute('stroke-width', owner !== null ? '6' : '4');
        line.setAttribute('stroke-linecap', 'round');
        line.style.cursor = owner === null ? 'pointer' : 'default';

        if (owner === null) {
          line.addEventListener('click', () => handleDotsLineClick('H', r, c));
          line.addEventListener('mouseenter', () => { if (owner === null) line.setAttribute('stroke', 'rgba(56, 189, 248, 0.7)'); });
          line.addEventListener('mouseleave', () => { if (owner === null) line.setAttribute('stroke', 'rgba(255,255,255,0.18)'); });
        }
        svg.appendChild(line);
      }
    }

    // 3. Vertical Lines
    for (let r = 0; r < dotsN; r++) {
      for (let c = 0; c <= dotsN; c++) {
        const owner = dotsLinesV[r][c];
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', 20 + c * spacing);
        line.setAttribute('y1', 20 + r * spacing);
        line.setAttribute('x2', 20 + c * spacing);
        line.setAttribute('y2', 20 + (r + 1) * spacing);
        line.setAttribute('stroke', owner !== null ? dotColors[owner] : 'rgba(255,255,255,0.18)');
        line.setAttribute('stroke-width', owner !== null ? '6' : '4');
        line.setAttribute('stroke-linecap', 'round');
        line.style.cursor = owner === null ? 'pointer' : 'default';

        if (owner === null) {
          line.addEventListener('click', () => handleDotsLineClick('V', r, c));
          line.addEventListener('mouseenter', () => { if (owner === null) line.setAttribute('stroke', 'rgba(56, 189, 248, 0.7)'); });
          line.addEventListener('mouseleave', () => { if (owner === null) line.setAttribute('stroke', 'rgba(255,255,255,0.18)'); });
        }
        svg.appendChild(line);
      }
    }

    // 4. Dots
    for (let r = 0; r <= dotsN; r++) {
      for (let c = 0; c <= dotsN; c++) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', 20 + c * spacing);
        circle.setAttribute('cy', 20 + r * spacing);
        circle.setAttribute('r', '5.5');
        circle.setAttribute('fill', '#ffffff');
        svg.appendChild(circle);
      }
    }

    container.appendChild(svg);
  }

  function handleDotsLineClick(type, r, c) {
    if (dotsVsBot && dotsTurn === 1) return;
    claimDotsLine(type, r, c);
  }

  function claimDotsLine(type, r, c) {
    if (type === 'H') {
      if (dotsLinesH[r][c] !== null) return;
      dotsLinesH[r][c] = dotsTurn;
    } else {
      if (dotsLinesV[r][c] !== null) return;
      dotsLinesV[r][c] = dotsTurn;
    }

    sfx.playDotsLine();

    // Check newly formed boxes
    let completedBoxes = 0;
    for (let br = 0; br < dotsN; br++) {
      for (let bc = 0; bc < dotsN; bc++) {
        if (dotsBoxes[br][bc] === null) {
          const top = dotsLinesH[br][bc] !== null;
          const bottom = dotsLinesH[br + 1][bc] !== null;
          const left = dotsLinesV[br][bc] !== null;
          const right = dotsLinesV[br][bc + 1] !== null;
          if (top && bottom && left && right) {
            dotsBoxes[br][bc] = dotsTurn;
            dotsScores[dotsTurn]++;
            completedBoxes++;
          }
        }
      }
    }

    if (completedBoxes > 0) {
      sfx.playDotsBox();
      fireConfetti();
    } else {
      dotsTurn = (dotsTurn + 1) % dotsPlayers;
    }

    renderDotsHUD();
    renderDotsBoard();

    // Check finish
    if (dotsBoxes.flat().every(x => x !== null)) {
      const maxScore = Math.max(...dotsScores);
      const winner = dotsScores.indexOf(maxScore);
      sfx.playChessCheckmate();
      alert(`Permainan Selesai! Pemenang: ${dotsVsBot && winner === 1 ? 'Bot AI' : `Pemain ${winner + 1}`} dengan skor ${maxScore}!`);
      return;
    }

    if (dotsVsBot && dotsTurn === 1) {
      setTimeout(triggerBotDots, 350);
    }
  }

  function triggerBotDots() {
    for (let br = 0; br < dotsN; br++) {
      for (let bc = 0; bc < dotsN; bc++) {
        if (dotsBoxes[br][bc] === null) {
          const missing = [];
          if (dotsLinesH[br][bc] === null) missing.push({ type: 'H', r: br, c: bc });
          if (dotsLinesH[br + 1][bc] === null) missing.push({ type: 'H', r: br + 1, c: bc });
          if (dotsLinesV[br][bc] === null) missing.push({ type: 'V', r: br, c: bc });
          if (dotsLinesV[br][bc + 1] === null) missing.push({ type: 'V', r: br, c: bc + 1 });
          if (missing.length === 1) {
            claimDotsLine(missing[0].type, missing[0].r, missing[0].c);
            return;
          }
        }
      }
    }

    const openH = [];
    for (let r = 0; r <= dotsN; r++) {
      for (let c = 0; c < dotsN; c++) {
        if (dotsLinesH[r][c] === null) openH.push({ type: 'H', r, c });
      }
    }
    const openV = [];
    for (let r = 0; r < dotsN; r++) {
      for (let c = 0; c <= dotsN; c++) {
        if (dotsLinesV[r][c] === null) openV.push({ type: 'V', r, c });
      }
    }

    const allOpen = [...openH, ...openV];
    if (allOpen.length > 0) {
      const pick = allOpen[Math.floor(Math.random() * allOpen.length)];
      claimDotsLine(pick.type, pick.r, pick.c);
    }
  }

  document.getElementById('btn-dots-new')?.addEventListener('click', () => {
    sfx.playDotsLine();
    initDots();
  });

  // ==================== MABAR ONLINE & MULTIPLAYER CONTROLLER (TEMPORARILY DISABLED) ====================
  async function sendOnlineMove(move) {
    if (!activeOnlineMatch) return;
    // Mabar feature temporarily paused for algorithm rework
    return;
  }

  // ==================== 8. SUDOKU MASTER ENGINE ====================
  let sudokuGrid = [];
  let sudokuSolution = [];
  let sudokuGiven = [];
  let sudokuNotes = [];
  let sudokuSelectedCell = null; // { r, c }
  let sudokuNotesMode = false;
  let sudokuMistakes = 0;
  let sudokuHintsLeft = 3;
  let sudokuTimerSeconds = 0;
  let sudokuTimerInterval = null;
  let sudokuUndoStack = [];
  let sudokuActiveMabar = null;
  window.__sudokuStarted = false;

  function initSudoku(difficulty) {
    window.__sudokuStarted = true;
    const diffSelect = document.getElementById('sudoku-difficulty-select');
    const diff = difficulty || (diffSelect ? diffSelect.value : 'medium');
    
    // Reset timer
    if (sudokuTimerInterval) clearInterval(sudokuTimerInterval);
    sudokuTimerSeconds = 0;
    updateSudokuTimerUI();
    sudokuTimerInterval = setInterval(() => {
      sudokuTimerSeconds++;
      updateSudokuTimerUI();
    }, 1000);

    sudokuMistakes = 0;
    sudokuHintsLeft = 3;
    sudokuUndoStack = [];
    sudokuSelectedCell = null;
    updateSudokuHUD();

    // Generate puzzle
    const puzzle = generateSudokuPuzzle(diff);
    sudokuSolution = puzzle.solution;
    sudokuGiven = puzzle.initial.map(row => [...row]);
    sudokuGrid = puzzle.initial.map(row => [...row]);
    sudokuNotes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));

    renderSudokuBoard();
    renderSudokuKeypad();
  }

  function updateSudokuTimerUI() {
    const el = document.getElementById('sudoku-timer-display');
    if (!el) return;
    const m = Math.floor(sudokuTimerSeconds / 60).toString().padStart(2, '0');
    const s = (sudokuTimerSeconds % 60).toString().padStart(2, '0');
    el.textContent = `${m}:${s}`;
  }

  function updateSudokuHUD() {
    const misEl = document.getElementById('sudoku-mistakes-display');
    if (misEl) {
      misEl.textContent = `${sudokuMistakes} / 3`;
      misEl.style.color = sudokuMistakes >= 2 ? '#ef4444' : (sudokuMistakes === 1 ? '#fbbf24' : '#fb7185');
    }
    const hintEl = document.getElementById('sudoku-hints-display');
    if (hintEl) hintEl.textContent = `${sudokuHintsLeft} tersisa`;
  }

  // Sudoku Generator & Solver
  function generateSudokuPuzzle(difficulty) {
    const board = Array.from({ length: 9 }, () => Array(9).fill(0));
    
    // Fill diagonal 3x3 boxes (mutually independent)
    for (let box = 0; box < 9; box += 3) {
      fillBox(board, box, box);
    }
    // Solve to get full valid board
    solveSudokuGrid(board);
    const fullSolution = board.map(row => [...row]);

    // Clues count based on difficulty
    let clues = 32;
    if (difficulty === 'easy') clues = 38;
    else if (difficulty === 'medium') clues = 30;
    else if (difficulty === 'hard') clues = 25;
    else if (difficulty === 'expert') clues = 22;

    const puzzle = board.map(row => [...row]);
    const cellsToRemove = 81 - clues;
    const positions = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) positions.push([r, c]);
    }
    // Shuffle positions
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    for (let i = 0; i < cellsToRemove; i++) {
      const [r, c] = positions[i];
      puzzle[r][c] = 0;
    }

    return { initial: puzzle, solution: fullSolution };
  }

  function fillBox(grid, startRow, startCol) {
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    let idx = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        grid[startRow + r][startCol + c] = nums[idx++];
      }
    }
  }

  function isSafeSudoku(grid, row, col, num) {
    for (let c = 0; c < 9; c++) if (grid[row][c] === num) return false;
    for (let r = 0; r < 9; r++) if (grid[r][col] === num) return false;
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (grid[startRow + r][startCol + c] === num) return false;
      }
    }
    return true;
  }

  function solveSudokuGrid(grid) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isSafeSudoku(grid, r, c, num)) {
              grid[r][c] = num;
              if (solveSudokuGrid(grid)) return true;
              grid[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  function renderSudokuBoard() {
    const boardEl = document.getElementById('sudoku-grid');
    if (!boardEl) return;
    boardEl.innerHTML = '';

    const selVal = sudokuSelectedCell ? sudokuGrid[sudokuSelectedCell.r][sudokuSelectedCell.c] : null;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement('div');
        cell.className = 'sudoku-cell';
        cell.dataset.row = r;
        cell.dataset.col = c;

        const val = sudokuGrid[r][c];
        const isGiven = sudokuGiven[r][c] !== 0;

        if (isGiven) cell.classList.add('given');
        else if (val !== 0) cell.classList.add('user-filled');

        // Selection & Highlights
        if (sudokuSelectedCell) {
          if (sudokuSelectedCell.r === r && sudokuSelectedCell.c === c) {
            cell.classList.add('selected');
          } else if (selVal && val === selVal) {
            cell.classList.add('highlight-same');
          } else if (sudokuSelectedCell.r === r || sudokuSelectedCell.c === c ||
                     (Math.floor(sudokuSelectedCell.r / 3) === Math.floor(r / 3) &&
                      Math.floor(sudokuSelectedCell.c / 3) === Math.floor(c / 3))) {
            cell.classList.add('highlight-peer');
          }
        }

        if (val !== 0) {
          cell.textContent = val;
        } else {
          // Render pencil draft notes
          const notesSet = sudokuNotes[r][c];
          if (notesSet && notesSet.size > 0) {
            const notesGrid = document.createElement('div');
            notesGrid.className = 'sudoku-notes';
            for (let n = 1; n <= 9; n++) {
              const noteBox = document.createElement('div');
              noteBox.className = 'sudoku-note-num';
              noteBox.textContent = notesSet.has(n) ? n : '';
              notesGrid.appendChild(noteBox);
            }
            cell.appendChild(notesGrid);
          }
        }

        cell.addEventListener('click', () => {
          selectSudokuCell(r, c);
        });

        boardEl.appendChild(cell);
      }
    }
  }

  function selectSudokuCell(r, c) {
    sudokuSelectedCell = { r, c };
    renderSudokuBoard();
    if (window.NanoSoundFX) window.NanoSoundFX.playMineClick();
  }

  function handleSudokuNumberInput(num) {
    if (!sudokuSelectedCell) return;
    const { r, c } = sudokuSelectedCell;
    if (sudokuGiven[r][c] !== 0) return; // Cannot edit initial given cells

    if (sudokuNotesMode) {
      // Toggle note
      const cellNotes = sudokuNotes[r][c];
      if (cellNotes.has(num)) cellNotes.delete(num);
      else cellNotes.add(num);
      renderSudokuBoard();
      return;
    }

    // Direct placement mode
    const correctVal = sudokuSolution[r][c];
    if (num === correctVal) {
      // Correct!
      sudokuUndoStack.push({ r, c, prevVal: sudokuGrid[r][c], prevNotes: new Set(sudokuNotes[r][c]) });
      sudokuGrid[r][c] = num;
      sudokuNotes[r][c].clear();

      // Clear note from peers
      for (let i = 0; i < 9; i++) {
        sudokuNotes[r][i].delete(num);
        sudokuNotes[i][c].delete(num);
      }
      const br = Math.floor(r / 3) * 3;
      const bc = Math.floor(c / 3) * 3;
      for (let tr = 0; tr < 3; tr++) {
        for (let tc = 0; tc < 3; tc++) {
          sudokuNotes[br + tr][bc + tc].delete(num);
        }
      }

      if (window.NanoSoundFX) window.NanoSoundFX.playXOXPlace();
      renderSudokuBoard();
      renderSudokuKeypad();
      checkSudokuVictory();
      syncSudokuMabarProgress();
    } else {
      // Conflict / Mistake!
      sudokuMistakes++;
      updateSudokuHUD();
      if (window.NanoSoundFX) window.NanoSoundFX.playChessIllegal();

      // Trigger conflict animation on cell
      const cellEl = document.querySelector(`.sudoku-cell[data-row="${r}"][data-col="${c}"]`);
      if (cellEl) {
        cellEl.classList.add('conflict');
        setTimeout(() => cellEl?.classList.remove('conflict'), 450);
      }

      if (sudokuMistakes >= 3) {
        if (sudokuTimerInterval) clearInterval(sudokuTimerInterval);
        setTimeout(() => {
          alert('❌ Game Over! Anda telah mencapai 3 kesalahan.\nCoba lagi papan baru!');
          initSudoku();
        }, 200);
      }
    }
  }

  function eraseSudokuCell() {
    if (!sudokuSelectedCell) return;
    const { r, c } = sudokuSelectedCell;
    if (sudokuGiven[r][c] !== 0) return;

    sudokuUndoStack.push({ r, c, prevVal: sudokuGrid[r][c], prevNotes: new Set(sudokuNotes[r][c]) });
    sudokuGrid[r][c] = 0;
    sudokuNotes[r][c].clear();
    renderSudokuBoard();
    renderSudokuKeypad();
  }

  function undoSudokuMove() {
    if (sudokuUndoStack.length === 0) return;
    const last = sudokuUndoStack.pop();
    sudokuGrid[last.r][last.c] = last.prevVal;
    sudokuNotes[last.r][last.c] = last.prevNotes;
    renderSudokuBoard();
    renderSudokuKeypad();
  }

  function useSudokuHint() {
    if (sudokuHintsLeft <= 0) {
      alert('Bantuan sudah habis!');
      return;
    }
    const emptyCells = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (sudokuGrid[r][c] === 0) emptyCells.push({ r, c });
      }
    }
    if (emptyCells.length === 0) return;

    const chosen = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    sudokuHintsLeft--;
    updateSudokuHUD();

    sudokuGrid[chosen.r][chosen.c] = sudokuSolution[chosen.r][chosen.c];
    sudokuNotes[chosen.r][chosen.c].clear();
    sudokuSelectedCell = { r: chosen.r, c: chosen.c };
    renderSudokuBoard();
    renderSudokuKeypad();
    checkSudokuVictory();
  }

  function checkSudokuVictory() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (sudokuGrid[r][c] !== sudokuSolution[r][c]) return false;
      }
    }
    // Puzzle completely solved!
    if (sudokuTimerInterval) clearInterval(sudokuTimerInterval);
    fireConfetti();
    if (window.NanoSoundFX) window.NanoSoundFX.playMineWin();

    const m = Math.floor(sudokuTimerSeconds / 60);
    const s = sudokuTimerSeconds % 60;
    setTimeout(() => {
      alert(`🎉 LUAR BIASA! Papan Sudoku Berhasil Diselesaikan!\nWaktu: ${m} menit ${s} detik\nKesalahan: ${sudokuMistakes} / 3`);
    }, 250);
    return true;
  }

  function renderSudokuKeypad() {
    const pad = document.getElementById('sudoku-keypad');
    if (!pad) return;
    pad.innerHTML = '';

    // Count occurrences of each number 1-9
    const counts = {};
    for (let n = 1; n <= 9; n++) counts[n] = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (sudokuGrid[r][c] > 0) counts[sudokuGrid[r][c]]++;
      }
    }

    for (let n = 1; n <= 9; n++) {
      const remaining = 9 - counts[n];
      const btn = document.createElement('button');
      btn.className = 'sudoku-num-btn';
      btn.innerHTML = `
        <span>${n}</span>
        <span class="sudoku-num-count">${remaining <= 0 ? '✓' : remaining}</span>
      `;
      if (remaining <= 0) btn.disabled = true;

      btn.addEventListener('click', () => {
        handleSudokuNumberInput(n);
      });
      pad.appendChild(btn);
    }
  }

  // Keyboard navigation & physical input for Sudoku
  window.addEventListener('keydown', (e) => {
    const viewSudoku = document.getElementById('view-sudoku');
    if (!viewSudoku || !viewSudoku.classList.contains('active')) return;

    if (e.key >= '1' && e.key <= '9') {
      handleSudokuNumberInput(parseInt(e.key, 10));
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      eraseSudokuCell();
    } else if (e.key.toLowerCase() === 'n') {
      toggleSudokuNotesMode();
    } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      if (!sudokuSelectedCell) {
        selectSudokuCell(0, 0);
        return;
      }
      let { r, c } = sudokuSelectedCell;
      if (e.key === 'ArrowUp') r = (r + 8) % 9;
      if (e.key === 'ArrowDown') r = (r + 1) % 9;
      if (e.key === 'ArrowLeft') c = (c + 8) % 9;
      if (e.key === 'ArrowRight') c = (c + 1) % 9;
      selectSudokuCell(r, c);
    }
  });

  function toggleSudokuNotesMode() {
    sudokuNotesMode = !sudokuNotesMode;
    const btn = document.getElementById('btn-sudoku-notes');
    const label = document.getElementById('sudoku-notes-label');
    if (label) label.textContent = sudokuNotesMode ? 'Pensil: ON' : 'Pensil: OFF';
    if (btn) {
      if (sudokuNotesMode) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  }

  // Wire Sudoku Stage Buttons
  document.getElementById('btn-sudoku-new')?.addEventListener('click', () => initSudoku());
  document.getElementById('sudoku-difficulty-select')?.addEventListener('change', (e) => initSudoku(e.target.value));
  document.getElementById('btn-sudoku-notes')?.addEventListener('click', toggleSudokuNotesMode);
  document.getElementById('btn-sudoku-erase')?.addEventListener('click', eraseSudokuCell);
  document.getElementById('btn-sudoku-undo')?.addEventListener('click', undoSudokuMove);
  document.getElementById('btn-sudoku-hint')?.addEventListener('click', useSudokuHint);
  async function syncSudokuMabarProgress() {
    if (!sudokuActiveMabar) return;
    // Mabar feature temporarily paused for algorithm rework
    return;
  }

  // ==================== 9. MABAR ONLINE SYSTEM & 30s COUNTDOWN ====================
  let mabarOpponentsCache = [];
  let waitingTimerInterval = null;
  let activeWaitingChallengeId = null;
  let incomingTimerInterval = null;
  let activeIncomingChallenge = null;

  function openMabarModal(defaultGame = 'chess') {
    const modal = document.getElementById('modal-mabar-challenge');
    if (!modal) return;
    modal.style.display = 'flex';
    const gameSelect = document.getElementById('mabar-game-type-select');
    if (gameSelect && defaultGame) gameSelect.value = defaultGame;
    loadOpponentsMabar();
    loadPendingChallenges();
  }

  function closeMabarModal() {
    const modal = document.getElementById('modal-mabar-challenge');
    if (modal) modal.style.display = 'none';
  }

  async function loadOpponentsMabar() {
    const listEl = document.getElementById('mabar-friends-list');
    if (!listEl) return;
    try {
      const token = localStorage.getItem('polaris_token');
      if (!token) {
        listEl.innerHTML = '<div style="font-size: 0.78rem; color: #fb7185; padding: 8px 0;">Silakan login terlebih dahulu untuk mabar online.</div>';
        return;
      }
      const res = await fetch('/api/games/opponents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success || !data.opponents || data.opponents.length === 0) {
        listEl.innerHTML = '<div style="font-size: 0.78rem; color: var(--text-muted); padding: 8px 0;">Belum ada akun lawan yang ditemukan.</div>';
        return;
      }

      mabarOpponentsCache = data.opponents;
      renderOpponentsList(mabarOpponentsCache);
    } catch (err) {
      listEl.innerHTML = `<div style="font-size: 0.78rem; color: #fb7185; padding: 8px 0;">Gagal memuat lawan: ${err.message}</div>`;
    }
  }

  function renderOpponentsList(opponents) {
    const listEl = document.getElementById('mabar-friends-list');
    if (!listEl) return;
    if (opponents.length === 0) {
      listEl.innerHTML = '<div style="font-size: 0.78rem; color: var(--text-muted); padding: 8px 0;">Tidak ada akun yang sesuai kata kunci.</div>';
      return;
    }

    listEl.innerHTML = opponents.map(f => `
      <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-subtle);">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #38bdf8, #818cf8); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800; color: #000; overflow: hidden;">
            ${f.avatarUrl ? `<img src="${f.avatarUrl}" style="width:100%;height:100%;object-fit:cover;">` : (f.displayName || f.username).charAt(0).toUpperCase()}
          </div>
          <div>
            <div style="font-size: 0.82rem; font-weight: 700; color: #fff;">${f.displayName || f.username}</div>
            <div style="font-size: 0.68rem; color: var(--text-muted);">@${f.username} • ${(f.role || 'User').toUpperCase()}</div>
          </div>
        </div>
        <button class="btn-action active btn-mabar-challenge-trigger" data-username="${f.username}" style="font-size: 0.74rem; padding: 5px 12px;">
          ⚔️ Tantang Mabar
        </button>
      </div>
    `).join('');

    listEl.querySelectorAll('.btn-mabar-challenge-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget.dataset.username;
        const gameTypeSelect = document.getElementById('mabar-game-type-select');
        const gameType = gameTypeSelect ? gameTypeSelect.value : 'chess';
        sendMabarChallenge(target, gameType);
      });
    });
  }

  // Filter opponents in real time
  document.getElementById('mabar-search-opponent-input')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      renderOpponentsList(mabarOpponentsCache);
      return;
    }
    const filtered = mabarOpponentsCache.filter(op => 
      op.username.toLowerCase().includes(q) ||
      (op.displayName && op.displayName.toLowerCase().includes(q))
    );
    renderOpponentsList(filtered);
  });

  async function loadPendingChallenges() {
    const listEl = document.getElementById('mabar-pending-list');
    if (!listEl) return;
    try {
      const token = localStorage.getItem('polaris_token');
      if (!token) return;
      const res = await fetch('/api/games/challenge/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success || !data.challenges || data.challenges.length === 0) {
        listEl.innerHTML = '<div style="font-size: 0.78rem; color: var(--text-muted); padding: 4px 0;">Tidak ada tantangan yang tertunda.</div>';
        return;
      }

      listEl.innerHTML = data.challenges.map(ch => `
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(56, 189, 248, 0.08); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(56, 189, 248, 0.25);">
          <div>
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--accent-cyan);">Tantangan ${(ch.game_type || 'chess').toUpperCase()} dari @${ch.challenger_username}</div>
            <div style="font-size: 0.68rem; color: var(--text-muted);">${new Date(ch.created_at).toLocaleTimeString('id-ID')}</div>
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="btn-action active btn-accept-ch" data-id="${ch.id}" data-challenger="${ch.challenger_username}" data-game="${ch.game_type || 'chess'}" style="font-size: 0.72rem; padding: 4px 10px; background: #10b981; border-color: #10b981;">
              Terima
            </button>
            <button class="btn-action btn-decline-ch" data-id="${ch.id}" style="font-size: 0.72rem; padding: 4px 10px;">
              Tolak
            </button>
          </div>
        </div>
      `).join('');

      listEl.querySelectorAll('.btn-accept-ch').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const chId = e.currentTarget.dataset.id;
          const oppUser = e.currentTarget.dataset.challenger;
          const gType = e.currentTarget.dataset.game;
          await respondChallenge(chId, true, oppUser, gType);
        });
      });

      listEl.querySelectorAll('.btn-decline-ch').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const chId = e.currentTarget.dataset.id;
          await respondChallenge(chId, false);
        });
      });
    } catch (_) {}
  }

  // SEND CHALLENGE WITH 30-SECOND WAITING COUNTDOWN MODAL
  async function sendMabarChallenge(targetUsername, gameType = 'chess') {
    try {
      const token = localStorage.getItem('polaris_token');
      const payload = { targetUsername, gameType };
      if (gameType === 'chess' && chess) {
        payload.initialFen = chess.fen();
      } else if (gameType === 'sudoku') {
        const puzzle = generateSudokuPuzzle('medium');
        payload.sudokuData = { initial: puzzle.initial, solution: puzzle.solution };
      }

      const res = await fetch('/api/games/challenge/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Gagal mengirim tantangan.');
        return;
      }

      closeMabarModal();
      activeWaitingChallengeId = data.challengeId;
      startWaitingCountdown(data.challengeId, targetUsername, gameType, data.expiresAtMs || (Date.now() + 30000));
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  function startWaitingCountdown(challengeId, targetUsername, gameType, expiresAtMs) {
    const modal = document.getElementById('modal-challenge-waiting');
    const nameEl = document.getElementById('waiting-opponent-name');
    const secEl = document.getElementById('waiting-timer-seconds');
    const circle = document.getElementById('waiting-timer-circle');

    if (!modal) return;
    modal.style.display = 'flex';
    if (nameEl) nameEl.textContent = `@${targetUsername} (${gameType.toUpperCase()})`;
    if (circle) {
      circle.style.strokeDashoffset = '0';
      circle.style.stroke = '#38bdf8';
    }

    if (waitingTimerInterval) clearInterval(waitingTimerInterval);

    waitingTimerInterval = setInterval(async () => {
      const now = Date.now();
      const remainingMs = Math.max(0, expiresAtMs - now);
      const remainingSec = Math.ceil(remainingMs / 1000);

      if (secEl) secEl.textContent = remainingSec;
      if (circle) {
        // Circumference is 264
        const offset = 264 - (remainingSec / 30) * 264;
        circle.style.strokeDashoffset = offset;
        if (remainingSec <= 10) circle.style.stroke = '#fb7185';
      }

      // Check status from server
      try {
        const token = localStorage.getItem('polaris_token');
        const stRes = await fetch(`/api/games/challenge/status/${challengeId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const stData = await stRes.json();
        if (stData.success) {
          if (stData.status === 'active') {
            // ACCEPTED!
            clearInterval(waitingTimerInterval);
            modal.style.display = 'none';
            fireConfetti();
            if (window.NanoSoundFX) window.NanoSoundFX.playXOXWin();
            alert(`⚔️ Tantangan diterima oleh @${targetUsername}! Permainan dimulai!`);
            startActiveMabarMatch(challengeId, 'w', targetUsername, gameType, stData.challenge?.state);
            return;
          } else if (stData.status === 'declined') {
            clearInterval(waitingTimerInterval);
            modal.style.display = 'none';
            alert(`Tantangan ditolak oleh @${targetUsername}.`);
            return;
          } else if (stData.status === 'cancelled') {
            clearInterval(waitingTimerInterval);
            modal.style.display = 'none';
            return;
          } else if (stData.status === 'expired' || remainingSec <= 0) {
            clearInterval(waitingTimerInterval);
            modal.style.display = 'none';
            alert(`⚠️ Tantangan gagal: Lawan (@${targetUsername}) tidak merespon dalam 30 detik.`);
            return;
          }
        }
      } catch (_) {}

      if (remainingSec <= 0) {
        clearInterval(waitingTimerInterval);
        modal.style.display = 'none';
        alert(`⚠️ Tantangan gagal: Lawan (@${targetUsername}) tidak merespon dalam 30 detik.`);
      }
    }, 1000);
  }

  // Cancel waiting challenge button
  document.getElementById('btn-cancel-waiting-challenge')?.addEventListener('click', async () => {
    if (waitingTimerInterval) clearInterval(waitingTimerInterval);
    const modal = document.getElementById('modal-challenge-waiting');
    if (modal) modal.style.display = 'none';

    if (activeWaitingChallengeId) {
      try {
        const token = localStorage.getItem('polaris_token');
        await fetch('/api/games/challenge/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ challengeId: activeWaitingChallengeId })
        });
      } catch (_) {}
      activeWaitingChallengeId = null;
    }
  });

  async function respondChallenge(challengeId, accept, oppUser = 'Lawan', gameType = 'chess') {
    try {
      const token = localStorage.getItem('polaris_token');
      const res = await fetch('/api/games/challenge/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ challengeId, accept })
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Gagal merespon tantangan.');
        return;
      }
      if (accept) {
        closeMabarModal();
        const incomingModal = document.getElementById('modal-incoming-challenge');
        if (incomingModal) incomingModal.style.display = 'none';
        if (incomingTimerInterval) clearInterval(incomingTimerInterval);

        startActiveMabarMatch(challengeId, 'b', oppUser, gameType, data.challenge?.state);
        alert(`⚔️ Match online dimulai! Anda melawan @${oppUser} di game ${gameType.toUpperCase()}.`);
      } else {
        loadPendingChallenges();
        const incomingModal = document.getElementById('modal-incoming-challenge');
        if (incomingModal) incomingModal.style.display = 'none';
        if (incomingTimerInterval) clearInterval(incomingTimerInterval);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  function startActiveMabarMatch(challengeId, playerRole, opponentUsername, gameType, state) {
    // Switch to corresponding game tab
    const targetTab = document.querySelector(`.game-card-tab[data-game="${gameType}"]`);
    if (targetTab) {
      targetTab.click();
    } else {
      switchPolarisGameStage(gameType);
    }

    if (gameType === 'chess') {
      activeOnlineMatch = {
        challengeId,
        playerColor: playerRole,
        opponentUsername
      };
      chessFlipped = (playerRole === 'b');
      initChess();
      const statusBadge = document.getElementById('chess-engine-badge');
      if (statusBadge) statusBadge.textContent = `Online: vs @${opponentUsername} (${playerRole === 'w' ? 'Anda Putih' : 'Anda Hitam'})`;
    } else if (gameType === 'sudoku') {
      sudokuActiveMabar = {
        challengeId,
        opponentUsername
      };
      const mabarBar = document.getElementById('sudoku-mabar-status-bar');
      const nameSpan = document.getElementById('sudoku-mabar-opponent-name');
      if (mabarBar) mabarBar.style.display = 'block';
      if (nameSpan) nameSpan.textContent = opponentUsername;
      
      if (state && state.sudokuData) {
        sudokuSolution = state.sudokuData.solution;
        sudokuGiven = state.sudokuData.initial.map(row => [...row]);
        sudokuGrid = state.sudokuData.initial.map(row => [...row]);
        renderSudokuBoard();
        renderSudokuKeypad();
      } else {
        initSudoku();
      }
    }
  }

  // Periodic polling for incoming challenges & state sync (TEMPORARILY DISABLED)
  // Note: Will be re-implemented with the new matchmaking algorithm
  /*
  setInterval(async () => {
    // Polling logic temporarily paused
  }, 2000);
  */

  // Bind Mabar Modal triggers
  document.getElementById('btn-mabar-online')?.addEventListener('click', () => openMabarModal());
  document.getElementById('btn-close-mabar-modal')?.addEventListener('click', closeMabarModal);
  document.getElementById('btn-refresh-friends-mabar')?.addEventListener('click', () => {
    loadOpponentsMabar();
    loadPendingChallenges();
  });

  document.getElementById('btn-mabar-send-friend-req')?.addEventListener('click', async () => {
    const input = document.getElementById('mabar-add-username-input');
    const feedback = document.getElementById('mabar-friend-req-feedback');
    const targetUsername = input ? input.value.trim() : '';
    if (!targetUsername) return;
    try {
      const token = localStorage.getItem('polaris_token');
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ targetUsername })
      });
      const data = await res.json();
      if (feedback) {
        feedback.style.display = 'block';
        feedback.style.color = data.success ? '#34d399' : '#fb7185';
        feedback.textContent = data.success ? (data.message || 'Permintaan dikirim.') : data.error;
      }
      if (data.success && input) input.value = '';
    } catch (err) {
      if (feedback) {
        feedback.style.display = 'block';
        feedback.style.color = '#fb7185';
        feedback.textContent = err.message;
      }
    }
  });

  // Auto-init active games
  initChess();
  initMinesweeper();
  initXOX();
  initSOS();
})();
