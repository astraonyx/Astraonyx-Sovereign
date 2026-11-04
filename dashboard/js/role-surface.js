/**
 * RoleSurface - Contextual First-Action CTA Surface
 * Renders role-specific prompt actions based on user tier.
 * Zero em-dash compliance.
 */
(function (global) {
  'use strict';

  const TIER_CONFIGS = {
    sentinel: {
      tierBadge: 'Tingkat Sentinel',
      badgeClass: 'badge-sentinel',
      title: 'Audit Diagnostik Node',
      description: 'Jalankan verifikasi integritas status bot, periksa koneksi QR Baileys, dan pastikan node runtime stabil.',
      ctaLabel: 'Mulai Diagnostik Cepat',
      action: () => {
        if (typeof global.checkHealth === 'function') {
          global.checkHealth();
        } else if (global.PillarRouter && typeof global.PillarRouter.switchPillar === 'function') {
          global.PillarRouter.switchPillar('polaris', 'overview');
        }
      }
    },
    supernova: {
      tierBadge: 'Tingkat Supernova',
      badgeClass: 'badge-supernova',
      title: 'Deploy Tugas Otomasi',
      description: 'Orkestrasikan aturan auto-responder, sinkronisasi kontak grup, atau deploy alur kerja AI.',
      ctaLabel: 'Buka Command Dispatch',
      action: () => {
        if (global.PillarRouter && typeof global.PillarRouter.switchPillar === 'function') {
          global.PillarRouter.switchPillar('polaris', 'commands');
        }
      }
    },
    cosmos: {
      tierBadge: 'Tingkat Sovereign Cosmos',
      badgeClass: 'badge-cosmos',
      title: 'Sovereign Root Console',
      description: 'Akses kendali penuh sistem kernel, audit ledger aktivitas, dan manajemen akses enkripsi.',
      ctaLabel: 'Akses Kernel Command',
      action: () => {
        if (global.PillarRouter && typeof global.PillarRouter.switchPillar === 'function') {
          global.PillarRouter.switchPillar('sanctum', 'terminal');
        }
      }
    }
  };

  function getTierConfig(rawRole) {
    const role = String(rawRole || '').toLowerCase();
    if (role.includes('cosmos') || role.includes('overlord') || role.includes('owner') || role.includes('admin')) {
      return TIER_CONFIGS.cosmos;
    }
    if (role.includes('supernova') || role.includes('nebula') || role.includes('vip') || role.includes('pro')) {
      return TIER_CONFIGS.supernova;
    }
    return TIER_CONFIGS.sentinel;
  }

  function renderRoleSurface(targetContainerId = 'role-action-surface') {
    if (typeof document === 'undefined') return;

    const user = (global.PolarisAuth && typeof global.PolarisAuth.getCurrentUser === 'function')
      ? global.PolarisAuth.getCurrentUser()
      : null;
    const role = user ? user.role : 'moon_sentinel';
    const config = getTierConfig(role);

    let container = document.getElementById(targetContainerId);
    if (!container) {
      container = document.createElement('div');
      container.id = targetContainerId;
      container.className = 'role-surface-wrapper';
      const anchor = document.getElementById('pane-overview') ||
        (typeof document.querySelector === 'function' ? document.querySelector('.tab-pane.active') : null);
      if (anchor && anchor.prepend) {
        anchor.prepend(container);
      }
    }

    container.innerHTML = `
      <div class="role-action-card">
        <div class="role-action-meta">
          <span class="role-tier-pill ${config.badgeClass}">${config.tierBadge}</span>
          <h3 class="role-action-title">${config.title}</h3>
          <p class="role-action-desc">${config.description}</p>
        </div>
        <div class="role-action-controls">
          <button type="button" class="role-primary-cta-btn" id="btn-role-primary-action">
            <span>${config.ctaLabel}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      </div>
    `;

    const ctaBtn = typeof container.querySelector === 'function'
      ? container.querySelector('#btn-role-primary-action')
      : null;
    if (ctaBtn) {
      ctaBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof config.action === 'function') {
          config.action();
        }
      });
    }
  }

  function initRoleSurface() {
    if (typeof document === 'undefined') return;
    renderRoleSurface();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initRoleSurface);
    } else {
      initRoleSurface();
    }
  }

  const surface = {
    getTierConfig,
    renderRoleSurface,
    initRoleSurface
  };

  global.RoleSurface = surface;

})(typeof window !== 'undefined' ? window : global);
