/**
 * PillarRailEngine - Dynamic Sub-Navigation Rail for 9 Sovereign Pillars
 * Manages contextual secondary navigation with Apple fluid motion physics.
 * Zero em-dash compliance.
 */
(function (global) {
  'use strict';

  // Sub-routes registry for all 9 sovereign pillars
  const SUBROUTES_REGISTRY = {
    astraonyx: [
      { id: 'matrix', label: 'Command Matrix', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>' },
      { id: 'nodes', label: 'Cluster Nodes', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M16.95 7.05l2.83-2.83"></path><path d="M1 12h4M19 12h4M4.22 19.78l2.83-2.83"></path></svg>' },
      { id: 'telemetry', label: 'Telemetry', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>' },
      { id: 'launchpad', label: 'Launchpad', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path></svg>' },
      { id: 'eventlog', label: 'Event Log', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>' }
    ],
    polaris: [
      { id: 'overview', label: 'Bot Hub', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>' },
      { id: 'hermes', label: 'Hermes AI', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/></svg>' },
      { id: 'groups', label: 'Grup & Moderasi', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>' },
      { id: 'autoresponder', label: 'Auto-Responder', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>' },
      { id: 'commands', label: 'Commands', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>' },
      { id: 'story', label: 'Story Studio', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>' },
      { id: 'whitelist', label: 'Whitelist & Akses', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>' },
      { id: 'deep-research', label: 'Deep Research', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>' },
      { id: 'key-vault', label: 'Multi-Key Vault', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>' }
    ],
    polarium: [
      { id: 'ig_feed', label: 'Instagram Feed', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path></svg>' },
      { id: 'tiktok_reels', label: 'TikTok Reels', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>' },
      { id: 'x_timeline', label: 'X Timeline', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4l11.733 16h4.267l-11.733 -16z"></path><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"></path></svg>' },
      { id: 'direct_messages', label: 'Direct Messages', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>' },
      { id: 'gdrive_storage', label: 'Drive Media', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>' }
    ],
    luminary: [
      { id: 'explore', label: 'Katalog Kuis', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>' },
      { id: 'arena', label: 'Arena Kuis', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>' },
      { id: 'flashcards', label: 'Flashcards 3D', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line></svg>' },
      { id: 'creator', label: 'AI Studio', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>' },
      { id: 'reports', label: 'Laporan & Skor', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"></path><path d="M12 20V4"></path><path d="M6 20v-6"></path></svg>' },
      { id: 'academy', label: 'Polymath Lab', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path></svg>' },
      { id: 'projects', label: 'Project & Docs', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>' }
    ],
    atomic: [
      { id: 'overview', label: 'Ringkasan', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>' },
      { id: 'habits', label: 'Habit Tracker', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>' },
      { id: 'todos', label: 'To-Do & Tugas', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"></rect><polyline points="7 12 10 15 17 8"></polyline></svg>' },
      { id: 'savings', label: 'Tabungan Saham', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>' },
      { id: 'wellness', label: 'Olahraga & Mood', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>' },
      { id: 'journal', label: 'Private Journal', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>' }
    ],
    nebula: [
      { id: 'mori', label: 'Mori Media Core', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>' },
      { id: 'omniget', label: 'OmniGet Studio', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="8 12 12 16 16 12"></polyline></svg>' },
      { id: 'apkbuilder', label: 'APK Builder', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline></svg>' },
      { id: 'tarot', label: 'Tarot 22 Arcana', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>' },
      { id: 'lumina', label: 'Lumina AI 4K', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>' },
      { id: 'spotify', label: 'Spotify Studio', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 11.5c3-1 6-1 8 0M7 14.5c3.5-1 7.5-1 10 0"></path></svg>' }
    ],
    starlium: [
      { id: 'chess', label: 'Catur Stockfish', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="4"/><path d="M5.5 21h13a2 2 0 0 0 2-2v-1a5 5 0 0 0-5-5H8.5a5 5 0 0 0-5 5v1a2 2 0 0 0 2 2z"/></svg>' },
      { id: 'sudoku', label: 'Sudoku Master', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18"/></svg>' },
      { id: 'minesweeper', label: 'Minesweeper', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 2v2M12 20v2"/></svg>' },
      { id: 'xox', label: 'Tic-Tac-Toe', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>' },
      { id: 'sos', label: 'SOS Arena', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/></svg>' },
      { id: 'snake', label: 'Galaxy Snake', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 0 0-4 4c0 3 4 5 4 8a4 4 0 0 1-4 4H3"/></svg>' },
      { id: 'memory', label: 'Cosmic Memory', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/></svg>' },
      { id: 'dots', label: 'Dots & Boxes', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/></svg>' }
    ],
    sirium: [
      { id: 'catalog', label: 'Katalog Aset', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>' },
      { id: 'stores', label: 'Toko & Kreator', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>' },
      { id: 'sell', label: 'Buka Toko / Jual', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>' },
      { id: 'contact', label: 'Hubungi Penjual', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>' }
    ],
    sanctum: [
      { id: 'owner', label: 'Panel Owner', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>' },
      { id: 'terminal', label: 'Live Terminal', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>' },
      { id: 'storage', label: 'Storage & Tmp', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>' },
      { id: 'analytics', label: 'Statistik & Audit', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line></svg>' },
      { id: 'account', label: 'Pengaturan Akun', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>' }
    ]
  };

  let activeSubrouteId = null;

  function getSubroutesRegistry() {
    return SUBROUTES_REGISTRY;
  }

  function renderSubnav(pillarId, targetSubrouteId = null) {
    if (typeof document === 'undefined') return;

    const normId = (global.PillarRouter && typeof global.PillarRouter.normalizePillarId === 'function')
      ? global.PillarRouter.normalizePillarId(pillarId)
      : pillarId;
    const routes = SUBROUTES_REGISTRY[normId] || SUBROUTES_REGISTRY.polaris;
    const meta = (global.PillarRouter && global.PillarRouter.getActivePillarMeta)
      ? global.PillarRouter.getActivePillarMeta()
      : { name: normId, badge: 'Sovereign' };

    const drawer = document.getElementById('pillar-subnav-rail') || document.getElementById('polaris-subnav-drawer');
    if (!drawer) return;

    // Determine initial active subroute
    activeSubrouteId = targetSubrouteId || routes[0].id;

    // Header markup
    const headerHtml = `
      <div class="pillar-subnav-header">
        <span class="pillar-zodiac-caption">PILAR GALAXY</span>
        <div class="pillar-subnav-title-row">
          <span class="pillar-title-text" id="pillar-subnav-name">${meta.name}</span>
          <span class="pillar-badge-pill" id="pillar-subnav-badge">${meta.badge || 'Core'}</span>
        </div>
      </div>
    `;

    // Items markup
    const itemsHtml = routes.map((item) => {
      const isActive = item.id === activeSubrouteId ? 'active' : '';
      return `
        <button type="button" class="subrail-item-btn ${isActive}" data-subroute="${item.id}" data-pillar="${normId}">
          <span class="subrail-item-icon">${item.iconSvg || ''}</span>
          <span class="subrail-item-label">${item.label}</span>
        </button>
      `;
    }).join('');

    drawer.innerHTML = `
      ${headerHtml}
      <div class="pillar-subnav-items" id="pillar-subnav-items">
        ${itemsHtml}
      </div>
    `;

    // Attach click listeners to rail buttons
    drawer.querySelectorAll('.subrail-item-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const routeId = btn.getAttribute('data-subroute');
        selectSubroute(normId, routeId);
      });
    });

    // Also trigger initial subroute selection
    selectSubroute(normId, activeSubrouteId, false);
  }

  function selectSubroute(pillarId, subrouteId, triggerFeedback = true) {
    activeSubrouteId = subrouteId;

    if (typeof document !== 'undefined') {
      const drawer = document.getElementById('pillar-subnav-rail') || document.getElementById('polaris-subnav-drawer');
      if (drawer) {
        drawer.querySelectorAll('.subrail-item-btn').forEach((b) => {
          b.classList.toggle('active', b.getAttribute('data-subroute') === subrouteId);
        });
      }

      // Dispatch subroute event
      const ev = new CustomEvent('subroute:changed', {
        detail: { pillarId, subrouteId, timestamp: Date.now() },
        bubbles: true
      });
      document.dispatchEvent(ev);
    }

    if (triggerFeedback && global.Kinetix && typeof global.Kinetix.playSound === 'function') {
      global.Kinetix.playSound('tab_switch');
    }

    // Call legacy tab switch if Polaris pillar is active to preserve Baileys/Polaris views
    if (pillarId === 'polaris' && typeof global.switchTab === 'function') {
      try {
        global.switchTab(subrouteId);
      } catch (_) {}
    }
  }

  function initPillarRail() {
    if (typeof document === 'undefined') return;

    if (global.PillarRouter && typeof global.PillarRouter.subscribe === 'function') {
      global.PillarRouter.subscribe((evt) => {
        if (evt && evt.pillarId) {
          renderSubnav(evt.pillarId, evt.subroute);
        }
      });
      const active = global.PillarRouter.getActivePillar();
      renderSubnav(active);
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initPillarRail);
    } else {
      initPillarRail();
    }
  }

  const engine = {
    getSubroutesRegistry,
    renderSubnav,
    selectSubroute
  };

  global.PillarRailEngine = engine;

})(typeof window !== 'undefined' ? window : global);
