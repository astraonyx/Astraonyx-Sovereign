// dashboard/js/polaris-themes.js — Pemilih gaya tampilan (skin) Polaris
// Lima gaya: Polaris (bawaan), Minimalist, Colorful, Glassmorphism, Neobrutalism.
// Mekanisme: atribut data-skin pada <html> dan <body>; seluruh tampilan ada di css/polaris-themes.css
// yang menimpa token tema (tidak menyentuh kinetix / data-theme). Pilihan disimpan di localStorage.
(function () {
  'use strict';

  var KEY = 'polaris_skin';
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var SKINS = [
    { id: 'classic', name: 'Polaris', tag: 'Obsidian bawaan, datar dan tenang', color: '#12171f' },
    { id: 'minimalist', name: 'Minimalist', tag: 'Putih bersih, garis tipis — ala Linear & Vercel', color: '#f7f7f5' },
    { id: 'colorful', name: 'Colorful', tag: 'Penuh warna, tombol 3D — ala Duolingo & Spotify', color: '#1b1540' },
    { id: 'glassmorphism', name: 'Glassmorphism', tag: 'Kaca buram berlapis — ala visionOS & macOS', color: '#0b1020' },
    { id: 'neobrutalism', name: 'Neobrutalism', tag: 'Tebal, kontras, bayangan keras — ala Gumroad & Figma', color: '#fff3cf' }
  ];
  var BY_ID = {};
  SKINS.forEach(function (s) { BY_ID[s.id] = s; });

  function load() {
    try { var v = localStorage.getItem(KEY); return BY_ID[v] ? v : 'classic'; } catch (_) { return 'classic'; }
  }
  var current = load();

  function paint(id) {
    var html = document.documentElement;
    var body = document.body;
    [html, body].forEach(function (el) {
      if (!el) return;
      if (id === 'classic') el.removeAttribute('data-skin');
      else el.setAttribute('data-skin', id);
    });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', BY_ID[id].color);
    current = id;
    try { localStorage.setItem(KEY, id); } catch (_) {}
    syncUi();
    try { document.dispatchEvent(new CustomEvent('polaris:skin', { detail: { id: id } })); } catch (_) {}
  }

  // Pergantian dengan animasi lingkaran yang melebar dari titik klik (View Transitions API)
  function apply(id, origin, silent) {
    if (!BY_ID[id] || id === current) return;
    var canVT = document.startViewTransition && !REDUCED && origin;
    if (!canVT) { paint(id); if (!silent) announce(id); return; }
    var x = origin.x, y = origin.y;
    var r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    var t;
    try { t = document.startViewTransition(function () { paint(id); }); } catch (_) { paint(id); if (!silent) announce(id); return; }
    t.ready.then(function () {
      document.documentElement.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 700, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(function () {});
    if (!silent) announce(id);
  }

  function announce(id) {
    if (typeof window.showToast === 'function') window.showToast('Tampilan: ' + BY_ID[id].name, 'success', { history: false, duration: 2000 });
  }

  function cycle(dir) {
    var i = SKINS.findIndex(function (s) { return s.id === current; });
    var next = SKINS[(i + dir + SKINS.length) % SKINS.length].id;
    apply(next, { x: innerWidth - 60, y: 30 });
  }

  // ------------------------------------------------------------------ UI
  var pop = null;
  var btn = null;
  var open = false;

  function buildPopover() {
    pop = document.createElement('div');
    pop.className = 'tp-pop';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'Pilih gaya tampilan');
    var head = document.createElement('div');
    head.className = 'tp-head';
    head.innerHTML = '<div><h3>Tampilan</h3><p>Pilih gaya. Tersimpan otomatis di perangkat ini.</p></div><kbd>Alt T</kbd>';
    var grid = document.createElement('div');
    grid.className = 'tp-grid';
    grid.setAttribute('role', 'radiogroup');
    SKINS.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tp-card';
      b.dataset.skin = s.id;
      b.setAttribute('role', 'radio');
      b.innerHTML =
        '<span class="tp-prev" data-preview="' + s.id + '" aria-hidden="true">' +
          '<i class="tp-side"></i><i class="tp-bar"></i><i class="tp-c1"></i><i class="tp-c2"></i><i class="tp-c3"></i><i class="tp-btn"></i>' +
        '</span>' +
        '<span class="tp-meta"><b></b><small></small></span>' +
        '<svg class="tp-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12.5 4 4 8-9"/></svg>';
      b.querySelector('b').textContent = s.name;
      b.querySelector('small').textContent = s.tag;
      b.addEventListener('click', function (e) { apply(s.id, { x: e.clientX || innerWidth - 60, y: e.clientY || 30 }); });
      grid.appendChild(b);
    });
    pop.append(head, grid);
    pop.addEventListener('keydown', function (e) {
      var cards = Array.prototype.slice.call(pop.querySelectorAll('.tp-card'));
      var i = cards.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); cards[(i + 1) % cards.length].focus(); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); cards[(i - 1 + cards.length) % cards.length].focus(); }
    });
    document.body.appendChild(pop);
  }

  function syncUi() {
    if (pop) {
      pop.querySelectorAll('.tp-card').forEach(function (c) {
        var on = c.dataset.skin === current;
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-checked', on ? 'true' : 'false');
      });
    }
    var sel = document.getElementById('select-quick-theme');
    if (sel && sel.value !== current) sel.value = current;
  }

  function openPop() {
    if (!pop) buildPopover();
    open = true;
    pop.classList.add('is-open');
    btn && btn.setAttribute('aria-expanded', 'true');
    syncUi();
    var on = pop.querySelector('.tp-card.is-on');
    if (on) on.focus({ preventScroll: true });
  }
  function closePop(refocus) {
    if (!pop) return;
    open = false;
    pop.classList.remove('is-open');
    btn && btn.setAttribute('aria-expanded', 'false');
    if (refocus && btn) btn.focus({ preventScroll: true });
  }

  function init() {
    // body belum tentu sudah memegang atribut saat skrip head berjalan
    paint(current);

    btn = document.getElementById('btn-open-themes');
    if (btn) {
      btn.setAttribute('aria-haspopup', 'dialog');
      btn.setAttribute('aria-expanded', 'false');
      btn.title = 'Tampilan (Alt+T)';
      btn.addEventListener('click', function (e) { e.stopPropagation(); open ? closePop(false) : openPop(); });
    }

    // Dropdown tema cepat lama (terkunci) diganti menjadi pemilih lima gaya
    var sel = document.getElementById('select-quick-theme');
    if (sel) {
      sel.textContent = '';
      SKINS.forEach(function (s) {
        var o = document.createElement('option');
        o.value = s.id;
        o.textContent = s.name;
        sel.appendChild(o);
      });
      sel.value = current;
      sel.title = 'Ganti gaya tampilan';
      sel.addEventListener('change', function () {
        var r = sel.getBoundingClientRect();
        apply(sel.value, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
      });
    }

    document.addEventListener('click', function (e) {
      if (open && pop && !pop.contains(e.target) && !(btn && btn.contains(e.target))) closePop(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) { closePop(true); return; }
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 't' || e.key === 'T')) { e.preventDefault(); cycle(e.shiftKey ? -1 : 1); }
    });
  }

  window.PolarisThemes = { skins: SKINS, apply: function (id) { apply(id, null); }, current: function () { return current; }, cycle: cycle, open: openPop, close: closePop };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
