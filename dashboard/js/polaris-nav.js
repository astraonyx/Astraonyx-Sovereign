/**
 * =========================================================================
 * POLARIS & ASTRAONYX UNIFIED NAVIGATION CONTROLLER (polaris-nav.js)
 * Architecture: Expandable Desktop Sidebar (74px -> 245px), Mobile Navs,
 * Popover Menus (Also from astraonyx, More, Create), and Multi-Pillar Mesh
 * (Polarium, Luminary, Polaris, Atomic, Sirium, Starlium, Nebula)
 * Design Tokens: Deep Obsidian Glassmorphic, CLS = 0, Spring Physics
 * =========================================================================
 */

(function () {
  'use strict';

  const PILLARS_METADATA = {
    astraonyx: {
      name: 'Astraonyx',
      icon: 'assets/brand/astraonyx-mark.svg',
      pill: 'Command Matrix',
      badgeColor: '#e2e8f0',
      defaultTab: 'astraonyx-matrix'
    },
    polaris: {
      name: 'Polaris',
      icon: 'assets/icons/hd/polaris.png',
      pill: 'Bot Hub & AI',
      badgeColor: '#00f0ff',
      defaultTab: 'overview'
    },
    polarium: {
      name: 'Polarium',
      icon: 'assets/icons/hd/polarium.png',
      pill: 'Social Suite',
      badgeColor: '#dc2743',
      defaultTab: 'home'
    },
    luminary: {
      name: 'Luminary',
      icon: 'assets/icons/hd/luminary.png',
      pill: 'Academy & Studio',
      badgeColor: '#8b5cf6',
      defaultTab: 'luminary-hub'
    },
    starlium: {
      name: 'Starlium',
      icon: 'assets/icons/hd/starlium.png',
      pill: 'Galaxy Arcade',
      badgeColor: '#10b981',
      defaultTab: 'starlium-chess'
    },
    tools: {
      name: 'Nebula',
      icon: 'assets/icons/hd/nebula.png',
      pill: 'Tools & Media',
      badgeColor: '#f59e0b',
      defaultTab: 'tools'
    },
    atomic: {
      name: 'Atomic',
      icon: 'assets/icons/hd/atomic.png',
      pill: 'Productivity',
      badgeColor: '#10b981',
      defaultTab: 'atomic-overview'
    },
    sirium: {
      name: 'Sirium',
      icon: 'assets/icons/hd/sirium.png',
      pill: 'Marketplace',
      badgeColor: '#3b82f6',
      defaultTab: 'sirium-store'
    },
    sanctum: {
      name: 'Sanctum',
      icon: 'assets/icons/hd/sanctum.png',
      pill: 'Cosmos Panel',
      badgeColor: '#e5b94f',
      defaultTab: 'sanctum-owner'
    }
  };

  function detectPillarFromEnvironment() {
    const hash = (window.location.hash || '').replace('#', '').toLowerCase();
    if (hash === 'study' || hash === 'luminary') return 'luminary';
    if (hash === 'social' || hash === 'polarium' || hash.startsWith('profile')) return 'polarium';
    if (hash === 'games' || hash === 'starlium') return 'starlium';
    if (hash === 'tools' || hash === 'nebula' || hash === 'downloader') return 'tools';
    if (hash === 'atomic') return 'atomic';
    if (hash === 'sirium') return 'sirium';
    if (hash === 'astraonyx' || hash === 'matrix') return 'astraonyx';
    if (hash === 'owner' || hash === 'sanctum') return 'sanctum';
    if (hash === 'overview' || hash === 'bot' || hash === 'hermes' || hash === 'groups') return 'polaris';

    // Check active pane in DOM
    const activePane = document.querySelector('.tab-pane.active');
    if (activePane) {
      if (activePane.id === 'pane-study') return 'luminary';
      if (activePane.id === 'pane-social') return 'polarium';
      if (activePane.id === 'pane-games') return 'starlium';
      if (activePane.id === 'pane-tools') return 'tools';
      if (activePane.id === 'pane-atomic') return 'atomic';
      if (activePane.id === 'pane-sirium') return 'sirium';
      if (activePane.id === 'pane-astraonyx') return 'astraonyx';
      if (activePane.id === 'pane-owner') return 'sanctum';
    }
    return 'polaris';
  }

  // State
  let currentPillar = detectPillarFromEnvironment();
  let activeTab = PILLARS_METADATA[currentPillar]?.defaultTab || 'home';
  let isExpanded = false;
  let isCreateOpen = false;
  let isMoreOpen = false;
  let isAstraOpen = false;
  let isConcurrencyOpen = false;
  let unreadCount = 3;

  function getAvatarUrl() {
    const cur = (window.PolarisAuth && window.PolarisAuth.getCurrentUser)
      ? window.PolarisAuth.getCurrentUser()
      : null;
    return cur?.avatar || cur?.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=Astra';
  }

  function getUsername() {
    const cur = (window.PolarisAuth && window.PolarisAuth.getCurrentUser)
      ? window.PolarisAuth.getCurrentUser()
      : null;
    return cur?.username || 'Astraonyx';
  }

  // Generate Navigation Items per Ecosystem Pillar
  function getNavItems(pillar) {
    if (pillar === 'astraonyx') {
      return [
        {
          id: 'astraonyx-matrix',
          label: 'Command Matrix',
          icon: 'assets/brand/astraonyx-mark.svg',
          action: () => {
            activeTab = 'astraonyx-matrix';
            renderNav();
          }
        },
        {
          id: 'astraonyx-nodes',
          label: 'Cluster Nodes',
          icon: 'assets/icons/scalability.png',
          action: () => {
            activeTab = 'astraonyx-nodes';
            renderNav();
          }
        },
        {
          id: 'astraonyx-telemetry',
          label: 'Telemetry',
          icon: 'assets/icons/activity.png',
          action: () => {
            activeTab = 'astraonyx-telemetry';
            renderNav();
          }
        },
        {
          id: 'astraonyx-launchpad',
          label: 'Launchpad',
          icon: 'assets/icons/home.png',
          action: () => {
            activeTab = 'astraonyx-launchpad';
            renderNav();
          }
        },
        {
          id: 'astraonyx-eventlog',
          label: 'Event Log',
          icon: 'assets/icons/reports.png',
          action: () => {
            activeTab = 'astraonyx-eventlog';
            renderNav();
          }
        },
        {
          id: 'profile',
          label: 'Profile',
          isAvatar: true,
          action: () => {
            activeTab = 'profile';
            renderNav();
          }
        }
      ];
    }

    if (pillar === 'luminary') {
      return [
        {
          id: 'luminary-hub',
          label: 'Command Hub',
          icon: 'assets/icons/home.png',
          activeIcon: 'assets/icons/home-active.png',
          action: () => {
            activeTab = 'luminary-hub';
            if (window.waygroundStudio) window.waygroundStudio.switchTab('explore');
            renderNav();
          }
        },
        {
          id: 'luminary-studio',
          label: 'Studio Canvas',
          icon: 'assets/icons/playground.png',
          action: () => {
            activeTab = 'luminary-studio';
            if (window.waygroundStudio) window.waygroundStudio.switchTab('creator');
            renderNav();
          }
        },
        {
          id: 'luminary-telemetry',
          label: 'Edge Telemetry',
          icon: 'assets/icons/scalability.png',
          action: () => {
            activeTab = 'luminary-telemetry';
            if (window.waygroundStudio) window.waygroundStudio.switchTab('arena');
            renderNav();
          }
        },
        {
          id: 'luminary-vault',
          label: 'Asset Vault',
          icon: 'assets/icons/library.png',
          action: () => {
            activeTab = 'luminary-vault';
            if (window.waygroundStudio) window.waygroundStudio.switchTab('flashcards');
            renderNav();
          }
        },
        {
          id: 'luminary-reports',
          label: 'Ecosystem Mesh',
          icon: 'assets/icons/reports.png',
          action: () => {
            activeTab = 'luminary-reports';
            if (window.waygroundStudio) window.waygroundStudio.switchTab('reports');
            renderNav();
          }
        },
        {
          id: 'luminary-projects',
          label: 'Projects & Docs',
          icon: 'assets/icons/voyagemath.png',
          action: () => {
            activeTab = 'luminary-projects';
            if (window.waygroundStudio) window.waygroundStudio.switchTab('projects');
            renderNav();
          }
        },
        {
          id: 'luminary-back',
          label: 'Feed Polarium',
          icon: 'assets/icons/polarium.png',
          action: () => {
            switchPillar('polarium');
          }
        },
        {
          id: 'profile',
          label: 'Profile',
          isAvatar: true,
          action: () => {
            activeTab = 'profile';
            if (window.loadInstagramProfile) window.loadInstagramProfile();
            renderNav();
          }
        }
      ];
    }

    if (pillar === 'polaris') {
      return [
        {
          id: 'overview',
          label: 'Bot Hub',
          icon: 'assets/icons/polaris.png',
          action: () => {
            activeTab = 'overview';
            document.querySelector('.nav-tab[data-tab="overview"]')?.click();
            renderNav();
          }
        },
        {
          id: 'hermes',
          label: 'Hermes AI',
          icon: 'assets/icons/activity.png',
          action: () => {
            activeTab = 'hermes';
            document.querySelector('.nav-tab[data-tab="hermes"]')?.click();
            renderNav();
          }
        },
        {
          id: 'groups',
          label: 'Grup & Moderasi',
          icon: 'assets/icons/users.png',
          action: () => {
            activeTab = 'groups';
            document.querySelector('.nav-tab[data-tab="groups"]')?.click();
            renderNav();
          }
        },
        {
          id: 'autoresponder',
          label: 'Auto-Responder',
          icon: 'assets/icons/messages.png',
          action: () => {
            activeTab = 'autoresponder';
            document.querySelector('.nav-tab[data-tab="autoresponder"]')?.click();
            renderNav();
          }
        },
        {
          id: 'commands',
          label: 'Commands',
          icon: 'assets/icons/playground.png',
          action: () => {
            activeTab = 'commands';
            document.querySelector('.nav-tab[data-tab="commands"]')?.click();
            renderNav();
          }
        },
        {
          id: 'story',
          label: 'Story Studio',
          icon: 'assets/icons/create.png',
          action: () => {
            activeTab = 'story';
            document.querySelector('.nav-tab[data-tab="story"]')?.click();
            renderNav();
          }
        },
        {
          id: 'deep-research',
          label: 'Deep Research',
          icon: 'assets/icons/search.png',
          action: () => {
            activeTab = 'deep-research';
            document.querySelector('.nav-tab[data-tab="deep-research"]')?.click();
            renderNav();
          }
        },
        {
          id: 'key-vault',
          label: 'Multi-Key Vault',
          icon: 'assets/icons/library.png',
          action: () => {
            activeTab = 'key-vault';
            document.querySelector('.nav-tab[data-tab="key-vault"]')?.click();
            renderNav();
          }
        },
        {
          id: 'profile',
          label: 'Profile',
          isAvatar: true,
          action: () => {
            activeTab = 'profile';
            document.querySelector('.nav-tab[data-tab="account"]')?.click();
            renderNav();
          }
        }
      ];
    }

    if (pillar === 'atomic') {
      return [
        {
          id: 'atomic-overview',
          label: 'Ringkasan',
          icon: 'assets/icons/atomic.png',
          action: () => {
            activeTab = 'atomic-overview';
            if (window.AtomicApp) window.AtomicApp.switchSection('overview');
            renderNav();
          }
        },
        {
          id: 'atomic-habits',
          label: 'Habit Tracker',
          icon: 'assets/icons/activity.png',
          action: () => {
            activeTab = 'atomic-habits';
            if (window.AtomicApp) window.AtomicApp.switchSection('habits');
            renderNav();
          }
        },
        {
          id: 'atomic-todos',
          label: 'To-Do & Tugas',
          icon: 'assets/icons/reports.png',
          action: () => {
            activeTab = 'atomic-todos';
            if (window.AtomicApp) window.AtomicApp.switchSection('todos');
            renderNav();
          }
        },
        {
          id: 'atomic-savings',
          label: 'Tabungan FX',
          icon: 'assets/icons/library.png',
          action: () => {
            activeTab = 'atomic-savings';
            if (window.AtomicApp) window.AtomicApp.switchSection('savings');
            renderNav();
          }
        },
        {
          id: 'atomic-wellness',
          label: 'Olahraga & Mood',
          icon: 'assets/icons/playground.png',
          action: () => {
            activeTab = 'atomic-wellness';
            if (window.AtomicApp) window.AtomicApp.switchSection('wellness');
            renderNav();
          }
        },
        {
          id: 'profile',
          label: 'Profile',
          isAvatar: true,
          action: () => {
            activeTab = 'profile';
            renderNav();
          }
        }
      ];
    }

    if (pillar === 'sirium') {
      return [
        {
          id: 'sirium-store',
          label: 'Storefront',
          icon: 'assets/icons/sirium.png',
          action: () => {
            activeTab = 'sirium-store';
            if (window.SiriumApp) window.SiriumApp.switchSection('storefront');
            renderNav();
          }
        },
        {
          id: 'sirium-software',
          label: 'Software & Bot',
          icon: 'assets/icons/playground.png',
          action: () => {
            activeTab = 'sirium-software';
            if (window.SiriumApp) window.SiriumApp.switchSection('software');
            renderNav();
          }
        },
        {
          id: 'sirium-assets',
          label: 'Aset Digital',
          icon: 'assets/icons/library.png',
          action: () => {
            activeTab = 'sirium-assets';
            if (window.SiriumApp) window.SiriumApp.switchSection('assets');
            renderNav();
          }
        },
        {
          id: 'sirium-cart',
          label: 'Keranjang',
          icon: 'assets/icons/bookmark.png',
          action: () => {
            activeTab = 'sirium-cart';
            if (window.SiriumApp) window.SiriumApp.switchSection('cart');
            renderNav();
          }
        },
        {
          id: 'profile',
          label: 'Profile',
          isAvatar: true,
          action: () => {
            activeTab = 'profile';
            renderNav();
          }
        }
      ];
    }

    if (pillar === 'starlium') {
      return [
        {
          id: 'starlium-chess',
          label: 'Catur Stockfish',
          icon: 'assets/icons/starlium.png',
          action: () => {
            activeTab = 'starlium-chess';
            document.querySelector('.nav-tab[data-tab="games"][data-game="chess"]')?.click();
            renderNav();
          }
        },
        {
          id: 'starlium-sudoku',
          label: 'Sudoku',
          icon: 'assets/icons/starlium.png',
          action: () => {
            activeTab = 'starlium-sudoku';
            document.querySelector('.nav-tab[data-tab="games"][data-game="sudoku"]')?.click();
            renderNav();
          }
        },
        {
          id: 'starlium-minesweeper',
          label: 'Minesweeper',
          icon: 'assets/icons/starlium.png',
          action: () => {
            activeTab = 'starlium-minesweeper';
            document.querySelector('.nav-tab[data-tab="games"][data-game="minesweeper"]')?.click();
            renderNav();
          }
        },
        {
          id: 'starlium-xox',
          label: 'Tic-Tac-Toe',
          icon: 'assets/icons/starlium.png',
          action: () => {
            activeTab = 'starlium-xox';
            document.querySelector('.nav-tab[data-tab="games"][data-game="xox"]')?.click();
            renderNav();
          }
        },
        {
          id: 'starlium-sos',
          label: 'SOS Arena',
          icon: 'assets/icons/starlium.png',
          action: () => {
            activeTab = 'starlium-sos';
            document.querySelector('.nav-tab[data-tab="games"][data-game="sos"]')?.click();
            renderNav();
          }
        },
        {
          id: 'starlium-snake',
          label: 'Galaxy Snake',
          icon: 'assets/icons/starlium.png',
          action: () => {
            activeTab = 'starlium-snake';
            document.querySelector('.nav-tab[data-tab="games"][data-game="snake"]')?.click();
            renderNav();
          }
        },
        {
          id: 'starlium-memory',
          label: 'Cosmic Memory',
          icon: 'assets/icons/starlium.png',
          action: () => {
            activeTab = 'starlium-memory';
            document.querySelector('.nav-tab[data-tab="games"][data-game="memory"]')?.click();
            renderNav();
          }
        },
        {
          id: 'starlium-dots',
          label: 'Dots & Boxes',
          icon: 'assets/icons/starlium.png',
          action: () => {
            activeTab = 'starlium-dots';
            document.querySelector('.nav-tab[data-tab="games"][data-game="dots"]')?.click();
            renderNav();
          }
        },
        {
          id: 'profile',
          label: 'Profile',
          isAvatar: true,
          action: () => {
            activeTab = 'profile';
            renderNav();
          }
        }
      ];
    }

    if (pillar === 'sanctum') {
      return [
        {
          id: 'sanctum-owner',
          label: 'Panel Owner',
          icon: 'assets/icons/settings.png',
          action: () => {
            activeTab = 'sanctum-owner';
            document.querySelector('.nav-tab[data-tab="owner"]')?.click();
            renderNav();
          }
        },
        {
          id: 'sanctum-terminal',
          label: 'Live Terminal',
          icon: 'assets/icons/playground.png',
          action: () => {
            activeTab = 'sanctum-terminal';
            document.querySelector('.nav-tab[data-tab="terminal"]')?.click();
            renderNav();
          }
        },
        {
          id: 'sanctum-storage',
          label: 'Storage & Tmp',
          icon: 'assets/icons/library.png',
          action: () => {
            activeTab = 'sanctum-storage';
            document.querySelector('.nav-tab[data-tab="storage"]')?.click();
            renderNav();
          }
        },
        {
          id: 'sanctum-analytics',
          label: 'Audit & Analytics',
          icon: 'assets/icons/reports.png',
          action: () => {
            activeTab = 'sanctum-analytics';
            document.querySelector('.nav-tab[data-tab="analytics"]')?.click();
            renderNav();
          }
        },
        {
          id: 'sanctum-account',
          label: 'Account Security',
          icon: 'assets/icons/users.png',
          action: () => {
            activeTab = 'sanctum-account';
            document.querySelector('.nav-tab[data-tab="account"]')?.click();
            renderNav();
          }
        },
        {
          id: 'profile',
          label: 'Profile',
          isAvatar: true,
          action: () => {
            activeTab = 'profile';
            renderNav();
          }
        }
      ];
    }

    // Default: POLARIUM NAVIGATION (Home, Reels, Messages, Search, Notifications, Create, Scalability, Profile)
    return [
      {
        id: 'home',
        label: 'Home',
        icon: 'assets/icons/home.png',
        activeIcon: 'assets/icons/home-active.png',
        action: () => {
          activeTab = 'home';
          if (window.switchSocialView) window.switchSocialView('ig_feed');
          renderNav();
        }
      },
      {
        id: 'reels',
        label: 'Reels',
        icon: 'assets/icons/reels.png',
        activeIcon: 'assets/icons/reels-active.png',
        action: () => {
          activeTab = 'reels';
          if (window.switchSocialView) window.switchSocialView('tiktok_reels');
          renderNav();
        }
      },
      {
        id: 'messages',
        label: 'Messages',
        icon: 'assets/icons/messages.png',
        activeIcon: 'assets/icons/messages-active.png',
        badge: unreadCount,
        action: () => {
          activeTab = 'messages';
          if (window.switchSocialView) window.switchSocialView('direct_messages');
          unreadCount = 0;
          renderNav();
        }
      },
      {
        id: 'search',
        label: 'Search',
        icon: 'assets/icons/search.png',
        activeIcon: 'assets/icons/search-active.png',
        action: () => {
          activeTab = 'search';
          const searchInput = document.getElementById('search-input') || document.querySelector('.search-input');
          if (searchInput) {
            searchInput.focus();
            if (window.showToast) window.showToast('Ketik untuk mencari di Polarium Mesh...');
          }
          renderNav();
        }
      },
      {
        id: 'notifications',
        label: 'Notifications',
        icon: 'assets/icons/notifications.png',
        activeIcon: 'assets/icons/notifications-active.png',
        action: () => {
          activeTab = 'notifications';
          toggleNotificationsDrawer();
          renderNav();
        }
      },
      {
        id: 'create',
        label: 'Create',
        icon: 'assets/icons/create.png',
        activeIcon: 'assets/icons/create-active.png',
        isCreateTrigger: true,
        action: (e) => {
          e.stopPropagation();
          isCreateOpen = !isCreateOpen;
          isMoreOpen = false;
          isAstraOpen = false;
          renderNav();
        }
      },
      {
        id: 'concurrency',
        label: 'Scalability (2.4M)',
        icon: 'assets/icons/scalability.png',
        isScalability: true,
        action: () => {
          openConcurrencyModal();
        }
      },
      {
        id: 'profile',
        label: 'Profile',
        isAvatar: true,
        action: () => {
          activeTab = 'profile';
          if (window.switchSocialView) window.switchSocialView('ig_profile');
          renderNav();
        }
      }
    ];
  }

  // Switch Ecosystem Pillar with Full Route Synchronization
  function switchPillar(newPillar, targetTab) {
    if (!PILLARS_METADATA[newPillar]) return;
    currentPillar = newPillar;
    const meta = PILLARS_METADATA[newPillar];
    activeTab = targetTab || meta.defaultTab;
    isCreateOpen = false;
    isMoreOpen = false;
    isAstraOpen = false;

    // Synchronize Pane in DOM
    const allPanes = document.querySelectorAll('.tab-pane');
    allPanes.forEach(p => p.classList.remove('active'));

    if (newPillar === 'luminary') {
      const studyPane = document.getElementById('pane-study');
      if (studyPane) studyPane.classList.add('active');
      window.location.hash = '#study';
      if (window.waygroundStudio) window.waygroundStudio.switchTab('explore');
    } else if (newPillar === 'polarium') {
      const socialPane = document.getElementById('pane-social');
      if (socialPane) socialPane.classList.add('active');
      window.location.hash = '#social';
      if (window.switchSocialView) window.switchSocialView('ig_feed');
    } else if (newPillar === 'starlium') {
      const gamesPane = document.getElementById('pane-games');
      if (gamesPane) gamesPane.classList.add('active');
      window.location.hash = '#games';
    } else if (newPillar === 'tools') {
      const toolsPane = document.getElementById('pane-tools');
      if (toolsPane) toolsPane.classList.add('active');
      window.location.hash = '#tools';
    } else if (newPillar === 'atomic') {
      const atomicPane = document.getElementById('pane-atomic');
      if (atomicPane) atomicPane.classList.add('active');
      window.location.hash = '#atomic';
    } else if (newPillar === 'sirium') {
      const siriumPane = document.getElementById('pane-sirium');
      if (siriumPane) siriumPane.classList.add('active');
      window.location.hash = '#sirium';
    } else if (newPillar === 'astraonyx') {
      const astraPane = document.getElementById('pane-astraonyx');
      if (astraPane) astraPane.classList.add('active');
      window.location.hash = '#astraonyx';
    } else if (newPillar === 'sanctum') {
      const ownerPane = document.getElementById('pane-owner');
      if (ownerPane) ownerPane.classList.add('active');
      window.location.hash = '#sanctum';
    } else {
      // Polaris Bot Hub
      const overviewPane = document.getElementById('pane-overview');
      if (overviewPane) overviewPane.classList.add('active');
      window.location.hash = '#overview';
    }

    // Call underlying App switchMacroPillar if defined
    if (typeof window.switchMacroPillar === 'function') {
      window.switchMacroPillar(newPillar, targetTab);
    }

    renderNav();
    if (window.showToast) {
      window.showToast(`Beralih ke pilar ${meta.name} (${meta.pill})`, 'info');
    }
  }

  // Notifications Drawer Toggle
  function toggleNotificationsDrawer() {
    const drawer = document.getElementById('notifications-drawer');
    if (drawer) {
      drawer.classList.toggle('active');
    } else if (window.showToast) {
      window.showToast('Memeriksa notifikasi terbaru: Semua server normal.', 'info');
    }
  }

  // Telemetry 2.4M Modal
  function openConcurrencyModal() {
    isConcurrencyOpen = true;
    let modal = document.getElementById('polaris-telemetry-modal-root');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'polaris-telemetry-modal-root';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="polaris-telemetry-modal-backdrop" onclick="window.PolarisNav.closeConcurrencyModal(event)">
        <div class="polaris-telemetry-modal" onclick="event.stopPropagation()">
          <div style="padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 38px; height: 38px; border-radius: 12px; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); display: flex; align-items: center; justify-content: center;">
                <img src="assets/icons/scalability.png" style="width: 22px; height: 22px; object-fit: contain;" alt="Telemetry">
              </div>
              <div>
                <h3 style="font-family: 'Syne', sans-serif; font-size: 1.15rem; font-weight: 800; color: #fff; margin: 0;">High-Concurrency Engine 2.4M</h3>
                <p style="font-size: 0.72rem; color: #a1a1aa; margin: 2px 0 0 0;">Astraonyx Edge Cluster Mesh Telemetry • Active Protocol v4.2</p>
              </div>
            </div>
            <button onclick="window.PolarisNav.closeConcurrencyModal()" style="background: rgba(255,255,255,0.08); border: none; color: #fff; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">✕</button>
          </div>
          
          <div style="padding: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px;">
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 16px;">
              <div style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #a1a1aa; font-weight: 700;">Simultaneous Sockets</div>
              <div style="font-size: 1.8rem; font-weight: 900; color: #34d399; margin: 6px 0 2px 0; font-family: 'JetBrains Mono', monospace;">2,418,920</div>
              <div style="font-size: 0.68rem; color: #10b981;">▲ 99.999% SLA Target</div>
            </div>

            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 16px;">
              <div style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #a1a1aa; font-weight: 700;">Edge Edge Latency</div>
              <div style="font-size: 1.8rem; font-weight: 900; color: #00f0ff; margin: 6px 0 2px 0; font-family: 'JetBrains Mono', monospace;">8.4 ms</div>
              <div style="font-size: 0.68rem; color: #38bdf8;">Jakarta / Singapore Hub</div>
            </div>

            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 16px;">
              <div style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #a1a1aa; font-weight: 700;">Throughput Speed</div>
              <div style="font-size: 1.8rem; font-weight: 900; color: #f59e0b; margin: 6px 0 2px 0; font-family: 'JetBrains Mono', monospace;">42.8 GB/s</div>
              <div style="font-size: 0.68rem; color: #fbbf24;">Zero-Copy Buffer Pool</div>
            </div>
          </div>

          <div style="padding: 16px 24px 24px 24px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 8px; height: 8px; border-radius: 9999px; background: #10b981; display: inline-block; box-shadow: 0 0 10px #10b981;"></span>
              <span style="font-size: 0.76rem; color: #e4e4e7; font-weight: 600;">Cluster Global: Operational</span>
            </div>
            <button onclick="window.PolarisNav.closeConcurrencyModal()" style="padding: 8px 18px; border-radius: 10px; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399; font-size: 0.8rem; font-weight: 700; cursor: pointer;">
              Tutup Telemetry
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function closeConcurrencyModal() {
    isConcurrencyOpen = false;
    const modal = document.getElementById('polaris-telemetry-modal-root');
    if (modal) modal.innerHTML = '';
  }

  function openSwitchAccountModal() {
    if (window.showToast) {
      window.showToast(`Akun aktif saat ini: @${getUsername()}`, 'info');
    }
  }

  function toggleAppearance() {
    const isDark = document.body.classList.contains('light-theme');
    if (isDark) {
      document.body.classList.remove('light-theme');
      if (window.showToast) window.showToast('Mode Tampilan Gelap (Obsidian) diaktifkan');
    } else {
      document.body.classList.add('light-theme');
      if (window.showToast) window.showToast('Mode Tampilan Terang diaktifkan');
    }
    renderNav();
  }

  // Render Unified Sidebar HTML
  function renderNav() {
    let sidebar = document.getElementById('polaris-sidebar-unified');
    if (!sidebar) {
      sidebar = document.createElement('aside');
      sidebar.id = 'polaris-sidebar-unified';
      sidebar.className = 'polaris-sidebar-unified';
      document.body.prepend(sidebar);

      sidebar.addEventListener('mouseenter', () => {
        isExpanded = true;
        sidebar.classList.add('is-expanded');
      });
      sidebar.addEventListener('mouseleave', () => {
        isExpanded = false;
        sidebar.classList.remove('is-expanded');
      });
    }

    sidebar.setAttribute('data-pillar', currentPillar);

    const meta = PILLARS_METADATA[currentPillar] || PILLARS_METADATA.polaris;
    const items = getNavItems(currentPillar);
    const isLightTheme = document.body.classList.contains('light-theme');

    // 1. Top Brand HTML
    let brandHtml = `
      <div class="sidebar-top-section">
        <button class="sidebar-brand-btn" id="sidebar-brand-btn" title="${meta.name} (${meta.pill})">
          <div class="sidebar-brand-icon-box">
            <img src="${meta.icon}" alt="${meta.name}">
          </div>
          <div class="sidebar-brand-text">
            <span>${meta.name}</span>
            <span class="sidebar-pillar-pill" style="background: ${meta.badgeColor}25; color: ${meta.badgeColor}; border: 1px solid ${meta.badgeColor}45;">${meta.pill}</span>
          </div>
        </button>

        <nav class="sidebar-nav-list" aria-label="Ecosystem Navigation">
    `;

    // 2. Nav Items HTML
    items.forEach((item) => {
      const isActive = activeTab === item.id;
      const isCreateItem = item.isCreateTrigger;
      const hasBadge = item.badge && item.badge > 0;

      let iconHtml = '';
      if (item.isAvatar) {
        iconHtml = `<img src="${getAvatarUrl()}" class="sidebar-avatar-img" alt="Avatar">`;
      } else {
        const iconSrc = isActive && item.activeIcon ? item.activeIcon : item.icon;
        iconHtml = `<img src="${iconSrc}" class="sidebar-icon-img" alt="${item.label}">`;
      }

      brandHtml += `
        <div class="sidebar-item-wrapper" id="item-wrapper-${item.id}">
          <button 
            type="button" 
            class="sidebar-nav-item ${isActive ? 'active' : ''} ${item.isScalability ? 'sidebar-scalability-btn' : ''}" 
            data-id="${item.id}"
            title="${item.label}"
          >
            <div class="sidebar-icon-box">
              ${iconHtml}
              ${hasBadge ? `<span class="sidebar-badge">${item.badge}</span>` : ''}
            </div>
            <span class="sidebar-label">
              ${item.label}
              ${item.isScalability ? `<span class="sidebar-scalability-pill">2.4M</span>` : ''}
            </span>
          </button>
      `;

      // Popover Create Dropdown
      if (isCreateItem && isCreateOpen) {
        brandHtml += `
          <div class="polaris-nav-popover create-menu-popover" id="create-menu-popover">
            <button class="create-menu-card" data-create-type="post">
              <div class="create-menu-meta">
                <span class="create-menu-title">Post</span>
                <span class="create-menu-desc">Foto, Carousel & Foto Live</span>
              </div>
              <div class="create-menu-icon">
                <img src="assets/icons/create.png" style="width:20px;height:20px;object-fit:contain;" alt="Post">
              </div>
            </button>

            <button class="create-menu-card" data-create-type="reels">
              <div class="create-menu-meta">
                <span class="create-menu-title">Reels</span>
                <span class="create-menu-desc">Video 9:16 & Audio</span>
              </div>
              <div class="create-menu-icon">
                <img src="assets/icons/reels.png" style="width:20px;height:20px;object-fit:contain;" alt="Reels">
              </div>
            </button>

            <button class="create-menu-card" data-create-type="story">
              <div class="create-menu-meta">
                <span class="create-menu-title">Story</span>
                <span class="create-menu-desc">Unggah, Preview & Edit</span>
              </div>
              <div class="create-menu-icon">
                <img src="assets/icons/polarium-star.png" style="width:20px;height:20px;object-fit:contain;" alt="Story">
              </div>
            </button>
          </div>
        `;
      }

      brandHtml += `</div>`;
    });

    brandHtml += `
        </nav>
      </div>
    `;

    // 3. Bottom Controls HTML (More & Also from astraonyx)
    let bottomHtml = `
      <div class="sidebar-bottom-section">
        <!-- More Menu Button & Popover -->
        <div class="sidebar-item-wrapper">
          <button type="button" class="sidebar-nav-item ${isMoreOpen ? 'active' : ''}" id="sidebar-btn-more" title="More Options">
            <div class="sidebar-icon-box">
              <img src="assets/icons/menu.png" class="sidebar-icon-img" alt="More">
            </div>
            <span class="sidebar-label">More</span>
          </button>

          ${isMoreOpen ? `
            <div class="polaris-nav-popover more-menu-popover" id="more-menu-popover">
              <button class="more-menu-btn" data-more-action="settings">
                <img src="assets/icons/settings.png" class="more-menu-icon" alt="Settings">
                <span>Settings</span>
              </button>
              <button class="more-menu-btn" data-more-action="activity">
                <img src="assets/icons/activity.png" class="more-menu-icon" alt="Activity">
                <span>Your activity</span>
              </button>
              <button class="more-menu-btn" data-more-action="saved">
                <img src="assets/icons/bookmark.png" class="more-menu-icon" alt="Saved">
                <span>Saved</span>
              </button>
              <button class="more-menu-btn" data-more-action="appearance">
                <img src="${isLightTheme ? 'assets/icons/moon.png' : 'assets/icons/sun.png'}" class="more-menu-icon" alt="Theme">
                <span>Switch appearance (${isLightTheme ? 'Dark' : 'Light'})</span>
              </button>
              <button class="more-menu-btn" data-more-action="scheduled">
                <img src="assets/icons/calendar.png" class="more-menu-icon" alt="Scheduled">
                <span>Scheduled content</span>
              </button>
              <button class="more-menu-btn" data-more-action="report">
                <img src="assets/icons/alert.png" class="more-menu-icon" alt="Report">
                <span>Report a problem</span>
              </button>
              <div class="more-menu-divider"></div>
              <button class="more-menu-btn" data-more-action="switch-account">
                <span>Switch accounts</span>
              </button>
              <button class="more-menu-btn danger" data-more-action="logout">
                <span>Log out</span>
              </button>
            </div>
          ` : ''}
        </div>

        <!-- Also from Astraonyx Button & Popover -->
        <div class="sidebar-item-wrapper">
          <button type="button" class="sidebar-nav-item ${isAstraOpen ? 'active' : ''}" id="sidebar-btn-astra" title="Also from astraonyx">
            <div class="sidebar-icon-box">
              <img src="assets/icons/cubes.png" class="sidebar-icon-img" alt="Also from astraonyx">
            </div>
            <span class="sidebar-label" style="font-weight: 700;">Also from astraonyx</span>
          </button>

          ${isAstraOpen ? `
            <div class="polaris-nav-popover astraonyx-popover" id="astraonyx-popover">
              <button class="astra-pillar-item ${currentPillar === 'luminary' ? 'active' : ''}" data-pillar="luminary">
                <img src="assets/icons/luminary.png" class="astra-pillar-icon" alt="Luminary">
                <div class="astra-pillar-meta">
                  <span class="astra-pillar-name">Luminary</span>
                  <span class="astra-pillar-desc">Creative Studio & Academy</span>
                </div>
              </button>
              <button class="astra-pillar-item ${currentPillar === 'polaris' ? 'active' : ''}" data-pillar="polaris">
                <img src="assets/icons/polaris.png" class="astra-pillar-icon" alt="Polaris">
                <div class="astra-pillar-meta">
                  <span class="astra-pillar-name">Polaris</span>
                  <span class="astra-pillar-desc">AI Workspace & Bot Hub</span>
                </div>
              </button>
              <button class="astra-pillar-item ${currentPillar === 'polarium' ? 'active' : ''}" data-pillar="polarium">
                <img src="assets/icons/polarium.png" class="astra-pillar-icon" alt="Polarium">
                <div class="astra-pillar-meta">
                  <span class="astra-pillar-name">Polarium</span>
                  <span class="astra-pillar-desc">Visual Social Network</span>
                </div>
              </button>
              <button class="astra-pillar-item ${currentPillar === 'starlium' ? 'active' : ''}" data-pillar="starlium">
                <img src="assets/icons/starlium.png" class="astra-pillar-icon" alt="Starlium">
                <div class="astra-pillar-meta">
                  <span class="astra-pillar-name">Starlium</span>
                  <span class="astra-pillar-desc">Galaxy Arcade & Spatial</span>
                </div>
              </button>
              <button class="astra-pillar-item ${currentPillar === 'tools' ? 'active' : ''}" data-pillar="tools">
                <img src="assets/icons/nebula.png" class="astra-pillar-icon" alt="Nebula">
                <div class="astra-pillar-meta">
                  <span class="astra-pillar-name">Nebula</span>
                  <span class="astra-pillar-desc">Media Downloader & Tools</span>
                </div>
              </button>
              <button class="astra-pillar-item ${currentPillar === 'atomic' ? 'active' : ''}" data-pillar="atomic">
                <img src="assets/icons/atomic.png" class="astra-pillar-icon" alt="Atomic">
                <div class="astra-pillar-meta">
                  <span class="astra-pillar-name">Atomic</span>
                  <span class="astra-pillar-desc">Produktivitas & Habit Vault</span>
                </div>
              </button>
              <button class="astra-pillar-item ${currentPillar === 'sirium' ? 'active' : ''}" data-pillar="sirium">
                <img src="assets/icons/sirium.png" class="astra-pillar-icon" alt="Sirium">
                <div class="astra-pillar-meta">
                  <span class="astra-pillar-name">Sirium</span>
                  <span class="astra-pillar-desc">Marketplace Aset Digital</span>
                </div>
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    sidebar.innerHTML = brandHtml + bottomHtml;
    attachNavEvents(sidebar, items);
    renderMobileNav();
  }

  // Attach DOM Listeners for Unified Sidebar
  function attachNavEvents(sidebar, items) {
    sidebar.querySelector('#sidebar-brand-btn')?.addEventListener('click', () => {
      const meta = PILLARS_METADATA[currentPillar];
      activeTab = meta.defaultTab;
      renderNav();
    });

    items.forEach((item) => {
      const btn = sidebar.querySelector(`.sidebar-nav-item[data-id="${item.id}"]`);
      if (btn) {
        btn.addEventListener('click', (e) => {
          if (typeof item.action === 'function') {
            item.action(e);
          }
        });
      }
    });

    sidebar.querySelectorAll('.create-menu-card').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = btn.getAttribute('data-create-type');
        isCreateOpen = false;
        renderNav();

        if (type === 'post') {
          document.getElementById('btn-polarium-create-post-top')?.click() ||
          document.getElementById('btn-create-post')?.click();
          if (window.showToast) window.showToast('Membuka pembuat Post (Foto / Carousel)...');
        } else if (type === 'reels') {
          if (window.switchSocialView) window.switchSocialView('tiktok_reels');
          if (window.showToast) window.showToast('Membuka studio Reels 9:16...');
        } else if (type === 'story') {
          document.getElementById('btn-open-create-story')?.click();
          if (window.showToast) window.showToast('Membuka Story Studio...');
        }
      });
    });

    sidebar.querySelector('#sidebar-btn-more')?.addEventListener('click', (e) => {
      e.stopPropagation();
      isMoreOpen = !isMoreOpen;
      isAstraOpen = false;
      isCreateOpen = false;
      renderNav();
    });

    sidebar.querySelectorAll('.more-menu-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.getAttribute('data-more-action');
        isMoreOpen = false;
        renderNav();

        if (action === 'settings') {
          document.querySelector('.nav-tab[data-tab="account"]')?.click();
        } else if (action === 'activity') {
          if (window.showToast) window.showToast('Menampilkan riwayat aktivitas akun...');
        } else if (action === 'saved') {
          if (window.switchSocialView) window.switchSocialView('bookmarks');
        } else if (action === 'appearance') {
          toggleAppearance();
        } else if (action === 'scheduled') {
          if (window.showToast) window.showToast('Tidak ada konten terjadwal saat ini.');
        } else if (action === 'report') {
          if (window.showToast) window.showToast('Silakan laporkan masalah melalui admin panel.');
        } else if (action === 'switch-account') {
          openSwitchAccountModal();
        } else if (action === 'logout') {
          if (window.PolarisAuth && window.PolarisAuth.logout) {
            window.PolarisAuth.logout();
          } else {
            location.reload();
          }
        }
      });
    });

    sidebar.querySelector('#sidebar-btn-astra')?.addEventListener('click', (e) => {
      e.stopPropagation();
      isAstraOpen = !isAstraOpen;
      isMoreOpen = false;
      isCreateOpen = false;
      renderNav();
    });

    sidebar.querySelectorAll('.astra-pillar-item').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetPillar = btn.getAttribute('data-pillar');
        switchPillar(targetPillar);
      });
    });
  }

  // Render Mobile Navigation
  function renderMobileNav() {
    let topNav = document.getElementById('polaris-mobile-top-nav');
    if (!topNav) {
      topNav = document.createElement('header');
      topNav.id = 'polaris-mobile-top-nav';
      topNav.className = 'polaris-mobile-top-nav';
      document.body.prepend(topNav);
    }

    const meta = PILLARS_METADATA[currentPillar] || PILLARS_METADATA.polaris;

    topNav.innerHTML = `
      <div class="mobile-brand-box">
        <span class="mobile-brand-title">${meta.name}</span>
        <button onclick="window.PolarisNav.openConcurrencyModal()" style="display:flex;align-items:center;gap:4px;padding:2px 8px;border-radius:9999px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);color:#34d399;font-size:10px;font-weight:800;cursor:pointer;">
          <img src="assets/icons/scalability.png" style="width:12px;height:12px;object-fit:contain;" alt="2.4M">
          <span>2.4M</span>
        </button>
      </div>

      <div class="mobile-actions-box">
        <button class="mobile-icon-btn" id="mobile-btn-create" title="Create">
          <img src="assets/icons/create.png" alt="Create">
        </button>
        <button class="mobile-icon-btn" id="mobile-btn-notif" title="Notifications">
          <img src="assets/icons/notifications.png" alt="Notifications">
        </button>
        <button class="mobile-icon-btn" id="mobile-btn-messages" title="Messages">
          <img src="assets/icons/messages.png" alt="Messages">
          ${unreadCount > 0 ? `<span class="sidebar-badge" style="top:-2px;right:-4px;">${unreadCount}</span>` : ''}
        </button>
      </div>
    `;

    topNav.querySelector('#mobile-btn-create')?.addEventListener('click', () => {
      document.getElementById('btn-polarium-create-post-top')?.click();
    });
    topNav.querySelector('#mobile-btn-notif')?.addEventListener('click', () => {
      toggleNotificationsDrawer();
    });
    topNav.querySelector('#mobile-btn-messages')?.addEventListener('click', () => {
      if (window.switchSocialView) window.switchSocialView('direct_messages');
    });

    let bottomNav = document.getElementById('polaris-mobile-bottom-nav');
    if (!bottomNav) {
      bottomNav = document.createElement('nav');
      bottomNav.id = 'polaris-mobile-bottom-nav';
      bottomNav.className = 'polaris-mobile-bottom-nav';
      document.body.appendChild(bottomNav);
    }

    bottomNav.innerHTML = `
      <button class="mobile-bottom-btn ${activeTab === 'home' ? 'active' : ''}" data-tab="home" title="Home">
        <img src="${activeTab === 'home' ? 'assets/icons/home-active.png' : 'assets/icons/home.png'}" alt="Home">
      </button>
      <button class="mobile-bottom-btn ${activeTab === 'reels' ? 'active' : ''}" data-tab="reels" title="Reels">
        <img src="${activeTab === 'reels' ? 'assets/icons/reels-active.png' : 'assets/icons/reels.png'}" alt="Reels">
      </button>
      <button class="mobile-bottom-btn ${activeTab === 'messages' ? 'active' : ''}" data-tab="messages" title="Messages">
        <img src="${activeTab === 'messages' ? 'assets/icons/messages-active.png' : 'assets/icons/messages.png'}" alt="Messages">
        ${unreadCount > 0 ? `<span class="sidebar-badge" style="top:2px;right:calc(50% - 18px);">${unreadCount}</span>` : ''}
      </button>
      <button class="mobile-bottom-btn ${activeTab === 'search' ? 'active' : ''}" data-tab="search" title="Search">
        <img src="${activeTab === 'search' ? 'assets/icons/search-active.png' : 'assets/icons/search.png'}" alt="Search">
      </button>
      <button class="mobile-bottom-btn ${activeTab === 'profile' ? 'active' : ''}" data-tab="profile" title="Profile">
        <img src="${getAvatarUrl()}" class="mobile-bottom-avatar" alt="Profile">
      </button>
    `;

    bottomNav.querySelectorAll('.mobile-bottom-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        activeTab = tab;
        if (tab === 'home' && window.switchSocialView) window.switchSocialView('ig_feed');
        else if (tab === 'reels' && window.switchSocialView) window.switchSocialView('tiktok_reels');
        else if (tab === 'messages' && window.switchSocialView) window.switchSocialView('direct_messages');
        else if (tab === 'profile' && window.switchSocialView) window.switchSocialView('ig_profile');
        renderNav();
      });
    });
  }

  // Outside Click Listener to Close Popovers
  document.addEventListener('click', (e) => {
    let changed = false;
    if (isCreateOpen && !e.target.closest('#create-menu-popover') && !e.target.closest('[data-id="create"]')) {
      isCreateOpen = false;
      changed = true;
    }
    if (isMoreOpen && !e.target.closest('#more-menu-popover') && !e.target.closest('#sidebar-btn-more')) {
      isMoreOpen = false;
      changed = true;
    }
    if (isAstraOpen && !e.target.closest('#astraonyx-popover') && !e.target.closest('#sidebar-btn-astra')) {
      isAstraOpen = false;
      changed = true;
    }
    if (changed) {
      renderNav();
    }
  });

  // Hash Change Listener
  window.addEventListener('hashchange', () => {
    const detected = detectPillarFromEnvironment();
    if (detected !== currentPillar) {
      currentPillar = detected;
      activeTab = PILLARS_METADATA[detected]?.defaultTab || 'home';
      renderNav();
    }
  });

  // Hook into window.switchMacroPillar to sync state seamlessly
  const originalSwitchMacroPillar = window.switchMacroPillar;
  window.switchMacroPillar = function (pillar, specificTab, specificGame) {
    if (originalSwitchMacroPillar) {
      originalSwitchMacroPillar(pillar, specificTab, specificGame);
    }
    let p = (pillar || '').toLowerCase();
    if (p === 'bot' || p === 'aquarius') p = 'polaris';
    else if (p === 'social' || p === 'gemini') p = 'polarium';
    else if (p === 'study' || p === 'sagittarius') p = 'luminary';
    else if (p === 'games' || p === 'leo') p = 'starlium';
    else if (p === 'owner' || p === 'admin') p = 'sanctum';
    else if (p === 'matrix' || p === 'sovereign') p = 'astraonyx';

    if (PILLARS_METADATA[p]) {
      currentPillar = p;
      if (specificTab) activeTab = specificTab;
      renderNav();
    }
  };

  // Expose API
  window.PolarisNav = {
    init: renderNav,
    setPillar: switchPillar,
    openConcurrencyModal,
    closeConcurrencyModal,
    setUnreadCount: (c) => {
      unreadCount = c;
      renderNav();
    }
  };

  // Initialize upon DOM readiness
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      currentPillar = detectPillarFromEnvironment();
      activeTab = PILLARS_METADATA[currentPillar]?.defaultTab || 'home';
      renderNav();
    });
  } else {
    currentPillar = detectPillarFromEnvironment();
    activeTab = PILLARS_METADATA[currentPillar]?.defaultTab || 'home';
    renderNav();
  }
})();
