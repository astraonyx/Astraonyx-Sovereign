/* ====================================================================
   ECOSYSTEM ORBIT LAUNCHER (⌘J / Ctrl+J)
   ------------------------------------------------------------------
   Peluncur cepat antar-pilar: tekan Ctrl+J (atau ⌘J di Mac) untuk
   membuka overlay lingkaran dengan kotak ikon tiap pilar mengorbit
   di sekelilingnya. Klik salah satu kotak -> pindah pilar lewat
   switchMacroPillar() yang sudah ada (zero-regression, tidak
   mengubah navigasi lama sama sekali, cuma menambah jalur baru).

   Dimuat setelah js/app.js supaya window.switchMacroPillar &
   PolarisAuth sudah tersedia.
   ==================================================================== */
(function () {
  'use strict';

  // Daftar pilar persis sama dengan yang dipakai rail kiri (primary-macro-bar)
  // dan menu Also from Astraonyx resmi: nama, urutan, dan asset ikon PNG
  // mengikuti assets/icons/hd/*.png (sumber kebenaran brand, bukan warna reka-reka).
  const ORBIT_PILLARS = [
    { id: 'astraonyx', label: 'Astraonyx', title: 'Sovereign Command Matrix', icon: 'assets/brand/astraonyx-mark.svg' },
    { id: 'polaris', label: 'Polaris', title: 'Bot Hub & Hermes AI', icon: 'assets/icons/hd/polaris.png' },
    { id: 'polarium', label: 'Polarium', title: 'Social Mesh', icon: 'assets/icons/hd/polarium.png' },
    { id: 'luminary', label: 'Luminary', title: 'Academy & Project', icon: 'assets/icons/hd/luminary.png' },
    { id: 'starlium', label: 'Starlium', title: 'Galaxy Arcade', icon: 'assets/icons/hd/starlium.png' },
    { id: 'tools', label: 'Nebula', title: 'Media & Tools Hub', icon: 'assets/icons/hd/nebula.png' },
    { id: 'atomic', label: 'Atomic', title: 'Produktivitas & Vault', icon: 'assets/icons/hd/atomic.png' },
    { id: 'sirium', label: 'Sirium', title: 'Marketplace Aset', icon: 'assets/icons/hd/sirium.png' },
    {
      id: 'sanctum', label: 'Sanctum', title: 'Panel Admin (Cosmos)',
      icon: 'assets/icons/hd/sanctum.png',
      ownerOnly: true,
    },
  ];

  let isOrbitOpen = false;
  let orbitBuilt = false;

  function isCosmosUser() {
    try {
      const user = window.PolarisAuth && typeof window.PolarisAuth.getCurrentUser === 'function'
        ? window.PolarisAuth.getCurrentUser()
        : null;
      return !!(user && (user.role || '').toLowerCase() === 'cosmos');
    } catch (_) {
      return false;
    }
  }

  function buildOrbitDom() {
    if (orbitBuilt) return;
    orbitBuilt = true;

    const backdrop = document.createElement('div');
    backdrop.id = 'ecosystem-orbit-backdrop';
    backdrop.className = 'orbit-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');

    const angleStep = 360 / ORBIT_PILLARS.length;
    const tilesHtml = ORBIT_PILLARS.map((p, i) => {
      const angle = `${Math.round(i * angleStep)}deg`;
      const iconMarkup = p.iconSvg
        ? p.iconSvg
        : `<img src="${p.icon}" alt="${p.label}" loading="lazy">`;
      return `
        <button type="button" class="orbit-tile" data-pillar="${p.id}"
          style="--orbit-angle:${angle};"
          title="${p.title}">
          <span class="orbit-tile-icon">${iconMarkup}</span>
          <span class="orbit-tile-label">${p.label}</span>
        </button>`;
    }).join('');

    backdrop.innerHTML = `
      <div class="orbit-stage" role="dialog" aria-modal="true" aria-label="Astraonyx Ecosystem Orbit Launcher">
        <div class="orbit-ring"></div>
        <div class="orbit-center">
          <img src="assets/brand/astraonyx-mark.svg" alt="Astraonyx">
          <span class="orbit-center-label">Ekosistem</span>
        </div>
        <div class="orbit-tiles">${tilesHtml}</div>
        <div class="orbit-hint">
          <span class="orbit-kbd">${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+J</span>
          <span>buka/tutup</span>
          <span class="orbit-kbd">ESC</span>
          <span>tutup</span>
        </div>
      </div>`;

    document.body.appendChild(backdrop);

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeOrbitLauncher();
    });

    backdrop.querySelectorAll('.orbit-tile').forEach((tile) => {
      tile.addEventListener('click', () => {
        const pillarId = tile.getAttribute('data-pillar');
        const pillarCfg = ORBIT_PILLARS.find((p) => p.id === pillarId);
        if (pillarCfg && pillarCfg.ownerOnly && !isCosmosUser()) {
          if (typeof window.showToast === 'function') {
            window.showToast('🏛️ Sanctum adalah Panel Admin khusus Owner (Cosmos). Akses dibatasi untuk akun Anda.', 'error');
          }
          return;
        }
        if (window.Kinetix && typeof window.Kinetix.playSound === 'function') {
          window.Kinetix.playSound('click');
        }
        closeOrbitLauncher();
        if (typeof window.switchMacroPillar === 'function') {
          window.switchMacroPillar(pillarId);
        }
      });
    });
  }

  function refreshLockedState() {
    const backdrop = document.getElementById('ecosystem-orbit-backdrop');
    if (!backdrop) return;
    const cosmos = isCosmosUser();
    backdrop.querySelectorAll('.orbit-tile[data-pillar="sanctum"]').forEach((tile) => {
      tile.classList.toggle('locked', !cosmos);
    });
  }

  function openOrbitLauncher() {
    buildOrbitDom();
    refreshLockedState();
    const backdrop = document.getElementById('ecosystem-orbit-backdrop');
    if (!backdrop) return;
    isOrbitOpen = true;
    backdrop.style.display = 'flex';
    // Force reflow supaya transisi CSS .active jalan, bukan langsung snap
    // eslint-disable-next-line no-unused-expressions
    backdrop.offsetHeight;
    backdrop.classList.add('active');
    backdrop.setAttribute('aria-hidden', 'false');
    if (window.Kinetix && typeof window.Kinetix.playSound === 'function') {
      window.Kinetix.playSound('page_whoosh');
    }
  }

  function closeOrbitLauncher() {
    const backdrop = document.getElementById('ecosystem-orbit-backdrop');
    if (!backdrop) return;
    isOrbitOpen = false;
    backdrop.classList.remove('active');
    backdrop.setAttribute('aria-hidden', 'true');
    window.setTimeout(() => {
      if (!isOrbitOpen) backdrop.style.display = 'none';
    }, 260);
  }

  function toggleOrbitLauncher() {
    if (isOrbitOpen) closeOrbitLauncher();
    else openOrbitLauncher();
  }

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'j' || e.key === 'J')) {
      e.preventDefault();
      toggleOrbitLauncher();
      return;
    }
    if (isOrbitOpen && e.key === 'Escape') {
      e.preventDefault();
      closeOrbitLauncher();
    }
  });

  window.openOrbitLauncher = openOrbitLauncher;
  window.closeOrbitLauncher = closeOrbitLauncher;
  window.toggleOrbitLauncher = toggleOrbitLauncher;
})();
