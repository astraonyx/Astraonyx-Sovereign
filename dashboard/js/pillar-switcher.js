/**
 * PillarSwitcher - Bottom-Left Tactile Pillar Dock Controller
 * Apple-grade glassmorphic dock offering 1-click & Ctrl+J orbit invocation.
 * Zero em-dash compliance.
 */
(function (global) {
  'use strict';

  function initBottomPillarDock() {
    if (typeof document === 'undefined') return;

    let dock = document.getElementById('bottom-pillar-dock');
    if (!dock) {
      dock = document.createElement('button');
      dock.type = 'button';
      dock.id = 'bottom-pillar-dock';
      dock.setAttribute('role', 'button');
      dock.setAttribute('aria-label', 'Ganti Pilar Ekosistem (Ctrl+J)');
      dock.setAttribute('tabindex', '0');

      const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || '');
      const kbdText = isMac ? 'Cmd+J' : 'Ctrl+J';

      dock.innerHTML = `
        <div class="dock-icon-wrapper">
          <img class="dock-icon-img" id="dock-active-icon" src="assets/icons/hd/polaris.png" alt="Pilar Aktif">
        </div>
        <div class="dock-meta-cluster">
          <span class="dock-pillar-name" id="dock-active-name">Polaris</span>
          <div class="dock-sub-hint">
            <span>Ganti Pilar</span>
            <kbd class="dock-kbd">${kbdText}</kbd>
          </div>
        </div>
        <span class="dock-orbit-arrow" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </span>
      `;

      dock.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof global.toggleOrbitLauncher === 'function') {
          global.toggleOrbitLauncher();
        } else if (typeof global.openOrbitLauncher === 'function') {
          global.openOrbitLauncher();
        }
      });

      dock.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          dock.click();
        }
      });

      const host = document.getElementById('polaris-app-shell') || document.body;
      if (host && host.appendChild) {
        host.appendChild(dock);
      }
    }

    function updateDock(meta) {
      if (!meta) return;
      const iconEl = document.getElementById('dock-active-icon');
      const nameEl = document.getElementById('dock-active-name');
      if (iconEl && meta.icon) {
        iconEl.src = meta.icon;
        iconEl.alt = meta.name || 'Pilar Aktif';
      }
      if (nameEl && meta.name) {
        nameEl.textContent = meta.name;
      }
    }

    if (global.PillarRouter && typeof global.PillarRouter.subscribe === 'function') {
      global.PillarRouter.subscribe((evt) => {
        if (evt && evt.meta) {
          updateDock(evt.meta);
        }
      });
      // Initial render sync
      if (typeof global.PillarRouter.getActivePillarMeta === 'function') {
        updateDock(global.PillarRouter.getActivePillarMeta());
      }
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initBottomPillarDock);
    } else {
      initBottomPillarDock();
    }
  }

  global.initBottomPillarDock = initBottomPillarDock;

})(typeof window !== 'undefined' ? window : global);
