/**
 * PillarRouter - Sovereign Multi-Pillar Router Engine
 * Controls state navigation and coordination across 9 sovereign pillars.
 * Zero em-dash compliance.
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'astraonyx_active_pillar';

  const PILLARS = [
    {
      id: 'astraonyx',
      alias: 'core',
      name: 'Astraonyx Core',
      title: 'Sovereign Command Matrix',
      badge: 'Kernel',
      icon: 'assets/brand/astraonyx-mark.svg',
      description: 'Root governance, telemetry cluster, and cluster runtime nodes.'
    },
    {
      id: 'polaris',
      alias: 'bot',
      name: 'Polaris',
      title: 'Bot Hub & Hermetic AI',
      badge: 'Core Bot',
      icon: 'assets/icons/hd/polaris.png',
      description: 'WhatsApp Baileys runtime, Hermes conversational intelligence, and automation rules.'
    },
    {
      id: 'polarium',
      alias: 'social',
      name: 'Polarium',
      title: 'Social Mesh',
      badge: 'Social Suite',
      icon: 'assets/icons/hd/polarium.png',
      description: 'Multi-platform social mesh, feeds, direct messaging, and cloud storage.'
    },
    {
      id: 'luminary',
      alias: 'study',
      name: 'Luminary',
      title: 'Cosmic Academy',
      badge: 'Academy & AI',
      icon: 'assets/icons/hd/luminary.png',
      description: 'Interactive quizzes, 3D flashcards, AI studio generator, and knowledge metrics.'
    },
    {
      id: 'atomic',
      alias: 'productivity',
      name: 'Atomic',
      title: 'Produktivitas & Vault',
      badge: 'Personal Ops',
      icon: 'assets/icons/hd/atomic.png',
      description: 'Habit tracker, structured tasks, realtime investment analytics, and secure journal.'
    },
    {
      id: 'nebula',
      alias: 'tools',
      name: 'Nebula',
      title: 'Media & Tools Hub',
      badge: 'Media Core',
      icon: 'assets/icons/hd/nebula.png',
      description: 'Mori media suite, OmniGet downloads, APK tools, Tarot arcana, and Spotify streaming.'
    },
    {
      id: 'starlium',
      alias: 'games',
      name: 'Starlium',
      title: 'Galaxy Arcade',
      badge: 'Arcade Engine',
      icon: 'assets/icons/hd/starlium.png',
      description: 'Stockfish chess, Sudoku master, Minesweeper, and retro cosmic arena games.'
    },
    {
      id: 'sirium',
      alias: 'marketplace',
      name: 'Sirium',
      title: 'Marketplace Aset',
      badge: 'Marketplace',
      icon: 'assets/icons/hd/sirium.png',
      description: 'Digital asset catalog, merchant storefronts, and creator asset distribution.'
    },
    {
      id: 'sanctum',
      alias: 'owner',
      name: 'Sanctum',
      title: 'Panel Admin (Cosmos)',
      badge: 'Root Vault',
      icon: 'assets/icons/hd/sanctum.png',
      ownerOnly: true,
      description: 'Owner management, live system terminal, system audit log, and crypt security.'
    }
  ];

  let activePillarId = 'polaris';
  try {
    const saved = global.localStorage ? global.localStorage.getItem(STORAGE_KEY) : null;
    if (saved && PILLARS.some(p => p.id === saved || p.alias === saved)) {
      activePillarId = saved === 'tools' ? 'nebula' : (saved === 'games' ? 'starlium' : saved);
    }
  } catch (_) {}

  const subscribers = [];

  function normalizePillarId(rawId) {
    if (!rawId) return 'polaris';
    const clean = String(rawId).toLowerCase().trim();
    if (clean === 'tools') return 'nebula';
    if (clean === 'games') return 'starlium';
    if (clean === 'social') return 'polarium';
    if (clean === 'study') return 'luminary';
    if (clean === 'core') return 'astraonyx';
    const match = PILLARS.find(p => p.id === clean || p.alias === clean);
    return match ? match.id : 'polaris';
  }

  function getPillars() {
    return PILLARS.slice();
  }

  function getActivePillar() {
    return activePillarId;
  }

  function getActivePillarMeta() {
    return PILLARS.find(p => p.id === activePillarId) || PILLARS[1];
  }

  function subscribe(listener) {
    if (typeof listener === 'function' && !subscribers.includes(listener)) {
      subscribers.push(listener);
    }
    return () => {
      const idx = subscribers.indexOf(listener);
      if (idx !== -1) subscribers.splice(idx, 1);
    };
  }

  function switchPillar(targetId, subroute = null) {
    const target = normalizePillarId(targetId);
    activePillarId = target;

    try {
      if (global.localStorage) {
        global.localStorage.setItem(STORAGE_KEY, target);
      }
    } catch (_) {}

    // Update document root attributes for styling and targeting
    if (typeof document !== 'undefined') {
      const root = document.getElementById('polaris-app-shell') || document.documentElement;
      if (root && root.setAttribute) {
        root.setAttribute('data-active-pillar', target);
      }
      if (document.documentElement && document.documentElement.setAttribute) {
        document.documentElement.setAttribute('data-current-pillar', target);
      }
    }

    const payload = {
      pillarId: target,
      meta: getActivePillarMeta(),
      subroute: subroute,
      timestamp: Date.now()
    };

    // Dispatch DOM CustomEvent
    if (typeof document !== 'undefined' && typeof document.dispatchEvent === 'function') {
      try {
        const ev = new CustomEvent('pillar:changed', { detail: payload, bubbles: true });
        document.dispatchEvent(ev);
        const orbitEv = new CustomEvent('orbit:switch-pillar', { detail: payload, bubbles: true });
        document.dispatchEvent(orbitEv);
      } catch (_) {}
    }

    // Notify registered subscribers
    subscribers.forEach(sub => {
      try {
        sub(payload);
      } catch (err) {
        if (typeof console !== 'undefined') console.error('PillarRouter subscriber error:', err);
      }
    });

    // Call legacy switchMacroPillar if available to preserve backward compatibility
    const legacyTarget = target === 'nebula' ? 'tools' : target;
    if (typeof global.switchMacroPillar === 'function' && !global._inPillarRouterCall) {
      global._inPillarRouterCall = true;
      try {
        global.switchMacroPillar(legacyTarget, subroute);
      } catch (_) {}
      global._inPillarRouterCall = false;
    }

    return payload;
  }

  const router = {
    getPillars,
    getActivePillar,
    getActivePillarMeta,
    switchPillar,
    subscribe,
    normalizePillarId
  };

  global.PillarRouter = router;

  // Intercept keyboard shortcut Ctrl+J / Cmd+J
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        if (typeof global.toggleOrbitLauncher === 'function') {
          global.toggleOrbitLauncher();
        }
      }
    });
  }

})(typeof window !== 'undefined' ? window : global);
