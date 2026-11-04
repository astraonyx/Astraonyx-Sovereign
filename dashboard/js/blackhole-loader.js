// dashboard/js/blackhole-loader.js — loader ringan Polaris
// Menggantikan animasi warp 3,2 detik. Hanya tanda rasi + garis kemajuan.
// API lama tetap ada: showBlackholeLoader / hideBlackholeLoader / showPolarisLoader / hidePolarisLoader
(function () {
  'use strict';

  var MARK =
    '<svg class="polaris-mark" viewBox="0 0 64 64" aria-hidden="true">' +
    '<path class="pm-line" d="M9 13 18 21 27 25 35 30 53 26 55 42 36 46 35 30"/>' +
    '<circle class="pm-star" cx="18" cy="21" r="1.8"/><circle class="pm-star" cx="27" cy="25" r="1.8"/>' +
    '<circle class="pm-star" cx="35" cy="30" r="2.2"/><circle class="pm-star" cx="53" cy="26" r="2.6"/>' +
    '<circle class="pm-star" cx="55" cy="42" r="2.2"/><circle class="pm-star" cx="36" cy="46" r="1.8"/>' +
    '<circle class="pm-ring" cx="9" cy="13" r="6.5"/><circle class="pm-polaris" cx="9" cy="13" r="3.4"/></svg>';

  var root = null;
  var msg = null;
  var hidden = false;
  var dynamic = false;
  var fallbackTimer = null;

  function sentence(s) {
    if (!s) return '';
    s = String(s).trim();
    // judul lama ditulis KAPITAL semua; ubah ke kalimat biasa
    if (s === s.toUpperCase() && /[A-Z]/.test(s)) s = (s.charAt(0) + s.slice(1).toLowerCase()).replace(/whatsapp/gi, 'WhatsApp');
    return s;
  }

  function build() {
    root = document.getElementById('polaris-loader');
    if (!root) return false;
    if (!root.querySelector('.pl-box')) {
      root.innerHTML = '<div class="pl-box">' + MARK + '<div class="pl-msg" aria-live="polite"></div><div class="pl-bar"><i></i></div></div>';
    }
    root.removeAttribute('aria-hidden');
    root.setAttribute('role', 'status');
    msg = root.querySelector('.pl-msg');
    return true;
  }

  function hide() {
    if (!root || hidden) return;
    hidden = true;
    clearTimeout(fallbackTimer);
    root.classList.add('loader-hidden');
    setTimeout(function () { if (hidden && root) root.style.display = 'none'; }, 280);
  }

  function show(title, subtitle) {
    if (!root && !build()) return;
    dynamic = true;
    hidden = false;
    var t = sentence(title);
    msg.innerHTML = '';
    msg.appendChild(document.createTextNode(t));
    if (subtitle) {
      var sm = document.createElement('small');
      sm.textContent = subtitle;
      msg.appendChild(sm);
    }
    root.style.display = '';
    void root.offsetHeight;
    root.classList.remove('loader-hidden');
    // pengaman: jangan menahan layar lebih dari 20 detik
    clearTimeout(fallbackTimer);
    fallbackTimer = setTimeout(hide, 20000);
  }

  window.showBlackholeLoader = show;
  window.hideBlackholeLoader = hide;
  window.showPolarisLoader = show;
  window.hidePolarisLoader = hide;

  function boot() {
    if (!build()) return;
    var started = performance.now();
    function done() {
      if (dynamic) return;
      var wait = Math.max(0, 350 - (performance.now() - started));
      setTimeout(function () { if (!dynamic) hide(); }, wait);
    }
    if (document.readyState === 'complete') done();
    else window.addEventListener('load', done, { once: true });
    // jika sumber daya luar lambat, jangan tahan layar lebih dari 2 detik
    fallbackTimer = setTimeout(function () { if (!dynamic) hide(); }, 2000);
    root.addEventListener('click', function () { if (!dynamic) hide(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
