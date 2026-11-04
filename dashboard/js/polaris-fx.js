// dashboard/js/polaris-fx.js — Polaris FX: lapisan interaksi & motion (pasangan css/polaris-fx.css)
//   1. toast v2 (progress, jeda saat hover, gabung duplikat, tutup manual, aria-live)
//   2. pusat notifikasi (riwayat toast + lonceng di topbar)
//   3. progres scroll, tombol "ke atas", bayangan header saat scroll
//   4. reveal bertahap saat scroll untuk kartu (termasuk yang dirender belakangan)
//   5. count-up angka statistik, spotlight kartu statistik
//   6. lembar pintasan keyboard (?)
//   7. salin cepat kode pairing
// Tidak menyentuh ID/event handler/socket yang ada. Semua mati saat prefers-reduced-motion.
(function () {
  'use strict';

  const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const ICONS = {
    success: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.3 2.4 2.4 4.6-5"/></svg>',
    error: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.4h.01"/></svg>',
    warning: '<svg viewBox="0 0 24 24"><path d="M12 3.8 21 19.5H3z"/><path d="M12 10v4.2M12 17h.01"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.2M12 7.9h.01"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    bell: '<svg viewBox="0 0 24 24"><path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15z"/><path d="M10 21a2.2 2.2 0 0 0 4 0"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="m6 14 6-6 6 6"/></svg>',
  };
  const normType = (t) => (t === 'warn' ? 'warning' : ['success', 'error', 'warning', 'info'].includes(t) ? t : 'info');

  // ============================================================== 1. TOAST V2
  const MAX_VISIBLE = 4;
  const history = [];
  let unread = 0;

  function toast(message, type, opts) {
    const container = document.getElementById('toast-container');
    let text = String(message == null ? '' : message).trim();
    // Emoji pembuka hanyalah hiasan: ikon tipe sudah mewakili. Jika pesan hanya emoji, biarkan.
    const plain = text.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, '');
    if (plain) text = plain;
    if (!container || !text) return null;
    type = normType(type);
    opts = opts || {};
    const duration = opts.duration || (type === 'error' ? 6500 : type === 'warning' ? 5200 : 3800);

    if (opts.history !== false) record(text, type);

    // Pesan identik yang masih tampil: naikkan penghitung & mulai ulang progres
    const same = [...container.querySelectorAll('.fx-toast:not(.is-leaving)')].find((n) => n.dataset.key === type + '|' + text);
    if (same) {
      const n = (parseInt(same.dataset.n || '1', 10) || 1) + 1;
      same.dataset.n = String(n);
      let badge = same.querySelector('.fx-toast-count');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'fx-toast-count';
        same.querySelector('.fx-toast-msg').appendChild(badge);
      }
      badge.textContent = '×' + n;
      restartTimer(same, duration);
      return same;
    }

    const el = document.createElement('div');
    el.className = 'toast fx-toast ' + type;
    el.dataset.key = type + '|' + text;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.style.setProperty('--fx-dur', duration + 'ms');

    const ico = document.createElement('span');
    ico.className = 'fx-toast-ico';
    ico.innerHTML = ICONS[type];
    const msg = document.createElement('div');
    msg.className = 'fx-toast-msg';
    msg.textContent = text;
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'fx-toast-x';
    x.setAttribute('aria-label', 'Tutup notifikasi');
    x.innerHTML = ICONS.close;
    const bar = document.createElement('span');
    bar.className = 'fx-toast-bar';
    el.append(ico, msg, x, bar);

    x.addEventListener('click', () => dismiss(el));
    el.addEventListener('mouseenter', () => pauseTimer(el));
    el.addEventListener('mouseleave', () => resumeTimer(el));

    container.appendChild(el);
    const live = container.querySelectorAll('.fx-toast:not(.is-leaving)');
    if (live.length > MAX_VISIBLE) dismiss(live[0]);
    restartTimer(el, duration);
    return el;
  }

  function restartTimer(el, duration) {
    clearTimeout(el._t);
    el._left = duration;
    const bar = el.querySelector('.fx-toast-bar');
    if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; bar.style.setProperty('--fx-dur', duration + 'ms'); }
    el.style.setProperty('--fx-dur', duration + 'ms');
    el._start = performance.now();
    el._t = setTimeout(() => dismiss(el), duration);
  }
  function pauseTimer(el) {
    if (el._paused) return;
    el._paused = true;
    el.classList.add('is-paused');
    clearTimeout(el._t);
    el._left = Math.max(400, (el._left || 0) - (performance.now() - el._start));
  }
  function resumeTimer(el) {
    if (!el._paused) return;
    el._paused = false;
    el.classList.remove('is-paused');
    el._start = performance.now();
    el._t = setTimeout(() => dismiss(el), el._left);
  }
  function dismiss(el) {
    if (!el || el.classList.contains('is-leaving')) return;
    clearTimeout(el._t);
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), REDUCED ? 0 : 280);
  }

  // ================================================== 2. PUSAT NOTIFIKASI
  let bell = null;
  let panel = null;
  let panelOpen = false;

  function record(text, type) {
    history.unshift({ text, type, at: Date.now() });
    if (history.length > 40) history.pop();
    if (!panelOpen) {
      unread++;
      updateBell(true);
    } else {
      renderPanel();
    }
  }

  function ago(ts) {
    const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 10) return 'baru saja';
    if (s < 60) return s + ' dtk lalu';
    const m = Math.round(s / 60);
    if (m < 60) return m + ' mnt lalu';
    return Math.round(m / 60) + ' jam lalu';
  }

  function updateBell(ring) {
    if (!bell) return;
    bell.classList.toggle('has-unread', unread > 0);
    const dot = bell.querySelector('.fx-bell-dot');
    if (dot) dot.textContent = unread > 9 ? '9+' : String(unread || '');
    if (ring && !REDUCED) {
      bell.classList.remove('is-ringing');
      void bell.offsetWidth;
      bell.classList.add('is-ringing');
    }
  }

  function renderPanel() {
    if (!panel) return;
    const list = panel.querySelector('.fx-panel-list');
    list.textContent = '';
    if (!history.length) {
      const empty = document.createElement('div');
      empty.className = 'fx-panel-empty';
      empty.innerHTML = ICONS.bell + 'Belum ada notifikasi';
      list.appendChild(empty);
      return;
    }
    history.forEach((h, i) => {
      const row = document.createElement('div');
      row.className = 'fx-panel-item ' + h.type;
      row.style.setProperty('--fx-i', Math.min(i, 8));
      const ico = document.createElement('span');
      ico.className = 'fx-toast-ico';
      ico.innerHTML = ICONS[h.type];
      const p = document.createElement('p');
      p.textContent = h.text;
      const t = document.createElement('time');
      t.textContent = ago(h.at);
      row.append(ico, p, t);
      list.appendChild(row);
    });
  }

  function openPanel() {
    if (!panel) return;
    panelOpen = true;
    unread = 0;
    updateBell(false);
    renderPanel();
    panel.classList.add('is-open');
    bell && bell.setAttribute('aria-expanded', 'true');
  }
  function closePanel() {
    if (!panel) return;
    panelOpen = false;
    panel.classList.remove('is-open');
    bell && bell.setAttribute('aria-expanded', 'false');
  }
  function togglePanel() { panelOpen ? closePanel() : openPanel(); }

  function initNotifications() {
    const anchor = $('#btn-sound-toggle');
    if (!anchor || !anchor.parentNode) return;
    bell = document.createElement('button');
    bell.type = 'button';
    bell.id = 'btn-fx-notifications';
    bell.className = 'tb-icon-btn fx-bell';
    bell.title = 'Notifikasi (Alt+N)';
    bell.setAttribute('aria-label', 'Notifikasi');
    bell.setAttribute('aria-haspopup', 'true');
    bell.setAttribute('aria-expanded', 'false');
    bell.innerHTML = ICONS.bell + '<span class="fx-bell-dot" aria-hidden="true"></span>';
    anchor.parentNode.insertBefore(bell, anchor);

    panel = document.createElement('div');
    panel.className = 'fx-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Riwayat notifikasi');
    panel.innerHTML = '<div class="fx-panel-head"><h3>Notifikasi</h3><button type="button" class="fx-panel-clear">Hapus semua</button></div><div class="fx-panel-list"></div>';
    document.body.appendChild(panel);

    bell.addEventListener('click', (e) => { e.stopPropagation(); togglePanel(); });
    panel.querySelector('.fx-panel-clear').addEventListener('click', () => { history.length = 0; renderPanel(); });
    document.addEventListener('click', (e) => {
      if (panelOpen && !panel.contains(e.target) && !bell.contains(e.target)) closePanel();
    });
    setInterval(() => { if (panelOpen) renderPanel(); }, 30000);
  }

  // ============================================ 3. PROGRES SCROLL / KE ATAS
  function initScrollUi() {
    const bar = document.createElement('div');
    bar.className = 'fx-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    const up = document.createElement('button');
    up.type = 'button';
    up.className = 'fx-totop';
    up.title = 'Kembali ke atas';
    up.setAttribute('aria-label', 'Kembali ke atas');
    up.innerHTML = '<svg class="fx-totop-ring" viewBox="0 0 42 42"><circle cx="21" cy="21" r="20"/></svg>' + ICONS.up;
    document.body.appendChild(up);
    up.addEventListener('click', () => window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }));

    const header = $('#top-bar');
    let ticking = false;
    function update() {
      ticking = false;
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const y = window.scrollY || doc.scrollTop || 0;
      const p = Math.min(1, Math.max(0, y / max));
      bar.style.setProperty('--fx-p', p.toFixed(4));
      up.style.setProperty('--fx-p', p.toFixed(4));
      bar.classList.toggle('is-on', y > 8 && max > 40);
      up.classList.toggle('is-on', y > 480);
      if (header) header.classList.toggle('fx-scrolled', y > 4);
    }
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  // ======================================================= 4. REVEAL SCROLL
  const REVEAL_SEL = '.card-luxury:not(.stagger-item), .polaris-card, .stat-card, .ov-strip > div, .ov-sky, .platform-chip-card, .feature-group-card, .lumina-preset-card';
  let io = null;

  function reveal(el) {
    el.classList.add('fx-in');
    setTimeout(() => el.classList.remove('fx-reveal', 'fx-in'), 1300);
  }

  function observeReveal(el) {
    if (!io || el.__fxSeen || el.closest('.modal-backdrop, .fx-panel, .fx-sheet')) return;
    el.__fxSeen = true;
    const sibs = el.parentElement ? [...el.parentElement.children].filter((c) => c.matches(REVEAL_SEL)) : [];
    el.style.setProperty('--fx-i', String(Math.min(Math.max(sibs.indexOf(el), 0), 8)));
    el.classList.add('fx-reveal');
    io.observe(el);
    setTimeout(() => { if (el.classList.contains('fx-reveal') && !el.classList.contains('fx-in')) reveal(el); }, 3000);
  }

  function scanReveal(root) {
    if (!io) return;
    if (root.nodeType === 1 && root.matches(REVEAL_SEL)) observeReveal(root);
    if (root.querySelectorAll) root.querySelectorAll(REVEAL_SEL).forEach(observeReveal);
  }

  // =================================================== 5. COUNT-UP & SPOTLIGHT
  const COUNT_SEL = '.stat-card > div[id], .ov-v[id], [data-fx-count]';

  function easeOutExpo(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }

  function tween(el, from, to) {
    cancelAnimationFrame(el._fxRaf);
    const t0 = performance.now();
    const dur = Math.min(1100, 380 + Math.abs(to - from) * 6);
    (function step(now) {
      const k = easeOutExpo(Math.min(1, (now - t0) / dur));
      const v = Math.round(from + (to - from) * k);
      el._fxShown = v;
      el.textContent = String(v);
      if (k < 1) el._fxRaf = requestAnimationFrame(step);
      else { el.classList.remove('fx-count-bump'); void el.offsetWidth; el.classList.add('fx-count-bump'); }
    })(t0);
  }

  function onTextChange(el) {
    if (el.children.length) return;
    const raw = el.textContent.trim();
    if (!/^\d{1,9}$/.test(raw)) { el._fxShown = undefined; return; }
    const to = parseInt(raw, 10);
    if (el._fxShown === to) return; // tulisan kita sendiri
    const from = typeof el._fxPrev === 'number' ? el._fxPrev : 0;
    el._fxPrev = to;
    if (from === to || REDUCED) { el._fxShown = to; return; }
    // Nilai awal 0 → tampil langsung bila elemen belum pernah punya angka lain
    tween(el, from, to);
  }

  function initCount() {
    document.querySelectorAll(COUNT_SEL).forEach((el) => {
      const raw = el.textContent.trim();
      if (/^\d{1,9}$/.test(raw)) { el._fxPrev = parseInt(raw, 10); el._fxShown = el._fxPrev; }
    });
  }

  function initSpotlight() {
    let raf = 0;
    document.addEventListener('mousemove', (e) => {
      if (raf) return;
      const x = e.clientX, y = e.clientY, target = e.target;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const card = target.closest && target.closest('.stat-card, .ov-strip > div');
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', x - r.left + 'px');
        card.style.setProperty('--mouse-y', y - r.top + 'px');
      });
    }, { passive: true });
  }

  // ============================================================ 6. PINTASAN
  let sheet = null;
  let sheetOpen = false;
  let lastFocus = null;
  const SHORTCUTS = [
    [['Ctrl', 'K'], 'Cari fitur, tab, dan command (Omnisearch)'],
    [['/'], 'Buka pencarian dari mana saja'],
    [['Ctrl', 'J'], 'Launcher lingkaran ekosistem Astraonyx'],
    [['1', '–', '9'], 'Buka menu sidebar ke-1 sampai ke-9'],
    [['Alt', 'B'], 'Ciutkan / lebarkan sub-navigasi'],
    [['Alt', 'N'], 'Buka pusat notifikasi'],
    [['Alt', 'T'], 'Ganti gaya tampilan (Shift untuk mundur)'],
    [['?'], 'Tampilkan lembar pintasan ini'],
    [['Esc'], 'Tutup dialog, launcher, atau pencarian'],
  ];

  function buildSheet() {
    sheet = document.createElement('div');
    sheet.className = 'fx-sheet-backdrop';
    sheet.innerHTML = '<div class="fx-sheet" role="dialog" aria-modal="true" aria-labelledby="fx-sheet-title" tabindex="-1"><h2 id="fx-sheet-title">Pintasan keyboard</h2><p>Tekan Esc untuk menutup. Di Mac, Ctrl diganti ⌘.</p><div class="fx-sheet-grid"></div><div class="fx-sheet-foot">Pintasan huruf dan angka tidak aktif saat Anda mengetik di kolom isian.</div></div>';
    const grid = sheet.querySelector('.fx-sheet-grid');
    SHORTCUTS.forEach(([keys, label]) => {
      const row = document.createElement('div');
      row.className = 'fx-sheet-row';
      const l = document.createElement('span');
      l.textContent = label;
      const k = document.createElement('span');
      k.className = 'fx-keys';
      keys.forEach((key) => { const kb = document.createElement('kbd'); kb.textContent = key; k.appendChild(kb); });
      row.append(l, k);
      grid.appendChild(row);
    });
    sheet.addEventListener('mousedown', (e) => { if (e.target === sheet) closeSheet(); });
    document.body.appendChild(sheet);
  }
  function openSheet() {
    if (!sheet) buildSheet();
    lastFocus = document.activeElement;
    sheetOpen = true;
    sheet.classList.add('is-open');
    const dlg = sheet.querySelector('.fx-sheet');
    dlg && dlg.focus({ preventScroll: true });
  }
  function closeSheet() {
    if (!sheet) return;
    sheetOpen = false;
    sheet.classList.remove('is-open');
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (_) {} }
  }

  function isTyping(el) {
    if (!el) return false;
    const tag = el.tagName ? el.tagName.toLowerCase() : '';
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
  }

  function initKeys() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (sheetOpen) { e.preventDefault(); closeSheet(); return; }
        if (panelOpen) { closePanel(); return; }
      }
      if (e.altKey && (e.key === 'n' || e.key === 'N')) { e.preventDefault(); togglePanel(); return; }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping(document.activeElement)) {
        e.preventDefault();
        sheetOpen ? closeSheet() : openSheet();
      }
    });
  }

  // ======================================================== 7. SALIN CEPAT
  function initCopy() {
    document.addEventListener('click', (e) => {
      const hit = e.target.closest && e.target.closest('[data-fx-copy], #pairing-digits, #cluster-pairing-code-display');
      if (!hit) return;
      const explicit = hit.getAttribute('data-fx-copy');
      let value = explicit || hit.textContent || '';
      if (!explicit) {
        const m = value.match(/[A-Z0-9]{4}-?[A-Z0-9]{4}/i);
        value = m ? m[0] : value.replace(/\s+/g, '').trim();
      }
      if (!value) return;
      const done = () => {
        hit.classList.remove('fx-copied'); void hit.offsetWidth; hit.classList.add('fx-copied');
        toast('Disalin ke papan klip: ' + (value.length > 28 ? value.slice(0, 28) + '…' : value), 'success', { duration: 2200 });
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(value).then(done, () => {});
    });
  }

  // =================================================================== BOOT
  function boot() {
    initNotifications();
    initScrollUi();
    initKeys();
    initCopy();
    initSpotlight();
    initCount();

    if (!REDUCED && 'IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) { io.unobserve(en.target); reveal(en.target); }
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
      scanReveal(document.body);
    }

    // Satu observer: count-up diproses sinkron di microtask (sebelum paint, tanpa kedipan nilai akhir);
    // pemindaian reveal untuk elemen baru ditunda ke frame berikutnya.
    let pendingNodes = [];
    let scheduled = false;
    const flush = () => {
      scheduled = false;
      const nodes = pendingNodes; pendingNodes = [];
      nodes.forEach(scanReveal);
    };
    new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'childList') {
          m.addedNodes.forEach((n) => {
            if (n.nodeType !== 1) return;
            if (n.matches && n.matches(COUNT_SEL)) onTextChange(n);
            pendingNodes.push(n);
          });
        }
        const t = m.target && (m.target.nodeType === 3 ? m.target.parentElement : m.target);
        if (t && t.matches && t.matches(COUNT_SEL)) onTextChange(t);
      }
      if (pendingNodes.length && !scheduled) { scheduled = true; requestAnimationFrame(flush); }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  window.PolarisFX = { toast, dismiss, openNotifications: openPanel, closeNotifications: closePanel, openShortcuts: openSheet, closeShortcuts: closeSheet };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
