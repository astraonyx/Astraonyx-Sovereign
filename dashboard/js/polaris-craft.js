// dashboard/js/polaris-craft.js
// Pendamping lapisan desain Polaris Craft (css/polaris-craft.css).
// 1) Menghapus emoji dekoratif di judul, tombol, label, dan menu (emoji sebagai isi tetap aman).
// 2) Menggambar "langit instance": satu bintang per slot bot di server.
// 3) Perapihan kecil: nama tema bawaan, judul dokumen.
(function () {
  'use strict';

  // ---------------------------------------------------------------- 1. emoji
  var PICT = /\p{Extended_Pictographic}\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)*/gu;
  // simbol yang dipakai sebagai tanda UI (centang, panah, tutup) — dibiarkan
  var KEEP = /^[\u00A9\u00AE\u2122\u2139\u2194-\u21AA\u2611\u2713-\u2718\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u2B05-\u2B07\u2B1B\u2B1C]/;

  // elemen "kromo" tempat emoji hanya dekorasi
  var CHROME = [
    'button', 'a.btn-polaris', '.btn-polaris', '.badge', 'label', 'legend', 'summary', 'th',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', '.nav-tab', '.tab-btn', '.card-title',
    '[class*="title"]', '[class*="-label"]', '[class*="subtab"]', '[class*="chip"]',
    '[class*="pill"]', '[class*="tab-"]', '[class*="heading"]', '.toast', '.form-label',
    'strong', '.rail-tooltip', '.empty-state p', '[class*="empty"] h4'
  ].join(',');

  // area tempat emoji adalah isi (chat, feed, papan permainan, pemilih emoji, input)
  var EXCLUDE = [
    'textarea', 'input', 'select', '[contenteditable="true"]', '[data-keep-emoji]',
    '[class*="emoji"]', '[id*="emoji"]', '[class*="reaction"]', '[class*="sticker"]',
    '[class*="bubble"]', '[class*="message"]', '[class*="chat"]', '[id*="chat"]',
    '[class*="board"]', '[class*="cell"]', '[class*="tarot"]', '[class*="post-"]',
    '[class*="caption"]', '[class*="story-"]', '[class*="tile"]', '[class*="mood"]',
    '.xox-cell', '.theme-card-option', '#pane-hermes .markdown-body'
  ].join(',');

  function keepable(m) { return KEEP.test(m); }

  function hasEmoji(str) {
    var all = str.match(PICT) || [];
    for (var i = 0; i < all.length; i++) if (!keepable(all[i])) return true;
    return false;
  }

  function stripText(str) {
    return str.replace(PICT, function (m) { return keepable(m) ? m : ''; });
  }

  function cleanElement(el) {
    if (el.nodeType !== 1) return;
    if (el.closest && el.closest(EXCLUDE)) return;
    var text = el.textContent || '';
    if (!hasEmoji(text)) return;
    // hanya emoji tanpa teks lain = ikon/isi, biarkan
    var rest = stripText(text).replace(/[\s\u00a0\u200d\ufe0f]+/g, '');
    if (!rest) return;

    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    var n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (tn) {
      if (tn.parentNode && tn.parentNode.closest && tn.parentNode.closest(EXCLUDE)) return;
      var v = tn.nodeValue;
      if (!hasEmoji(v)) return;
      var stripped = stripText(v);
      if (!/\S/.test(stripped)) {
        // simpul ini hanya emoji: kosongkan, dan buang span pembungkus agar tidak menyisakan jarak
        var p = tn.parentNode;
        tn.nodeValue = '';
        if (p && p !== el && p.tagName === 'SPAN' && !p.children.length && !p.textContent.trim()) p.remove();
      } else {
        if (/^\s*\p{Extended_Pictographic}/u.test(v)) stripped = stripped.replace(/^\s+/, '');
        tn.nodeValue = stripped;
      }
    });
  }

  function cleanTree(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.matches && root.matches(CHROME)) cleanElement(root);
    var list = root.querySelectorAll ? root.querySelectorAll(CHROME) : [];
    for (var i = 0; i < list.length; i++) cleanElement(list[i]);
  }

  var queue = [];
  var scheduled = false;
  function flush() {
    scheduled = false;
    var items = queue; queue = [];
    for (var i = 0; i < items.length; i++) cleanTree(items[i]);
  }
  function enqueue(node) {
    queue.push(node);
    if (!scheduled) { scheduled = true; (window.requestAnimationFrame || setTimeout)(flush); }
  }

  function startEmojiCleaner() {
    cleanTree(document.body);
    if (!('MutationObserver' in window)) return;
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var nd = added[j];
          if (nd.nodeType === 1) enqueue(nd);
          else if (nd.nodeType === 3 && nd.parentNode && nd.parentNode.nodeType === 1) enqueue(nd.parentNode);
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  // ------------------------------------------------------- 2. langit instance
  var SVGNS = 'http://www.w3.org/2000/svg';
  function svgEl(name, attrs) {
    var e = document.createElementNS(SVGNS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function drawSky(used, total) {
    var host = document.getElementById('ov-sky-field');
    if (!host) return;
    total = Math.max(1, Math.min(60, total || 30));
    used = Math.max(0, Math.min(total, used || 0));
    var W = 1000, H = 76, padX = 22;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': used + ' dari ' + total + ' slot instance terpakai', preserveAspectRatio: 'xMidYMid meet' });
    var pts = [];
    for (var i = 0; i < total; i++) {
      var x = padX + i * ((W - padX * 2) / Math.max(1, total - 1));
      var y = H / 2 + Math.sin(i * 0.82) * 17 + (((i * 37) % 11) - 5) * 1.6;
      pts.push([x, y]);
    }
    if (used > 1) {
      var d = pts.slice(0, used).map(function (p, idx) { return (idx ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
      svg.appendChild(svgEl('path', { d: d, class: 'sky-line' }));
    }
    pts.forEach(function (p, idx) {
      var on = idx < used;
      if (on && idx === used - 1) svg.appendChild(svgEl('circle', { cx: p[0], cy: p[1], r: 9, class: 'sky-ring' }));
      svg.appendChild(svgEl('circle', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: on ? 4.6 : 2.8, class: 'sky-dot' + (on ? ' on' : '') }));
    });
    host.innerHTML = '';
    host.appendChild(svg);

    var cap = document.getElementById('ov-sky-caption');
    if (cap) cap.textContent = used === 0 ? 'Belum ada instance. Buat bot pertama dari panel Instance di bawah.' : used + ' dari ' + total + ' slot server terpakai';
  }

  function readQuota() {
    var el = document.getElementById('overview-cluster-instances');
    var txt = el ? el.textContent : '';
    var m = /Server:\s*(\d+)\s*\/\s*(\d+)/i.exec(txt);
    if (m) return { used: +m[1], total: +m[2] };
    var n = /^\s*(\d+)/.exec(txt);
    return { used: n ? +n[1] : 0, total: 30 };
  }

  function startSky() {
    var el = document.getElementById('overview-cluster-instances');
    var q = readQuota();
    drawSky(q.used, q.total);
    if (el && 'MutationObserver' in window) {
      new MutationObserver(function () { var r = readQuota(); drawSky(r.used, r.total); })
        .observe(el, { childList: true, characterData: true, subtree: true });
    }
  }

  // ----------------------------------------------------------- 3. perapihan
  function tidy() {
    if (document.title && /Polarium Deck/i.test(document.title)) document.title = 'Astraonyx — Panel bot';
    var hero = document.getElementById('hero-active-theme-display');
    if (hero && /Polaris Classic/i.test(hero.textContent)) hero.textContent = 'Polaris';
  }
  window.addEventListener('polaris-theme-changed', tidy);


  // status cluster di Bot hub mengikuti label koneksi di topbar (tidak lagi tulisan statis)
  function mirrorStatus() {
    var src = document.getElementById('beacon-label');
    var dst = document.getElementById('overview-cluster-status');
    if (!src || !dst) return;
    function sync() {
      var t = (src.textContent || '').trim();
      dst.textContent = t || 'Offline';
      dst.classList.toggle('ov-ok', /^online$/i.test(t));
    }
    sync();
    if ('MutationObserver' in window) new MutationObserver(sync).observe(src, { childList: true, characterData: true, subtree: true });
  }

  // layar sempit: laci menu tertutup di kunjungan pertama dan menutup lagi setelah memilih halaman
  function mobileDrawer() {
    var shell = document.getElementById('polaris-app-shell');
    if (!shell || !window.matchMedia) return;
    var narrow = window.matchMedia('(max-width: 992px)');
    try {
      if (narrow.matches && localStorage.getItem('polaris_sidebar_collapsed') === null) shell.classList.add('sidebar-collapsed');
    } catch (e) { /* abaikan */ }
    document.addEventListener('click', function (ev) {
      var t = ev.target && ev.target.closest ? ev.target.closest('.subnav-links-list .nav-tab') : null;
      if (t && narrow.matches) shell.classList.add('sidebar-collapsed');
    });
  }

  function boot() { startEmojiCleaner(); startSky(); mirrorStatus(); mobileDrawer(); tidy(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
