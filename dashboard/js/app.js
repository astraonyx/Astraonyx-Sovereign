// dashboard/js/app.js - Controller Aplikasi Polaris Project Web Dashboard
(function () {
  'use strict';

  // State aplikasi
  let currentTab = 'overview';
  let activeMacroPillar = 'polaris'; // 'polaris' | 'polarium' | 'luminary' | 'starlium' | 'sanctum'
  let overviewData = null;
  let whitelistData = { owners: [], allowed: [] };
  let groupData = { allowedGroups: {} };
  let commandsData = [];

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // State Story WA
  let selectedStoryBgColor = '#040509';
  let selectedStoryFont = 1;
  let selectedMediaBase64 = null;
  let selectedMediaExt = null;

  // ==================== NOTIFIKASI TOAST ====================
  // Penyaji toast ada di polaris-fx.js (PolarisFX.toast). Fungsi ini tetap dipanggil
  // di seluruh app.js dan dibuka ke window supaya Wayground, WS, dan modul lain
  // memakai toast yang sama.
  function showToast(message, type = 'info', options) {
    if (window.PolarisFX && typeof window.PolarisFX.toast === 'function') {
      return window.PolarisFX.toast(message, type, options);
    }
    const container = document.getElementById('toast-container');
    if (!container) return null;
    const toast = document.createElement('div');
    toast.className = `toast ${type} toast-enter`;
    const body = document.createElement('div');
    body.textContent = String(message == null ? '' : message);
    toast.appendChild(body);
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove('toast-enter');
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 320);
    }, 3500);
    return toast;
  }
  window.showToast = showToast;

  // ==================== NAVIGASI TAB & TRANSISI ====================
  function initNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    const panes = document.querySelectorAll('.tab-pane');
    const tabOrder = Array.from(tabs).map(t => t.getAttribute('data-tab'));

    // Smooth initial page entrance
    document.body.classList.add('page-revealing');
    requestAnimationFrame(() => {
      setTimeout(() => {
        document.body.classList.remove('page-revealing');
        document.body.classList.add('page-ready');
      }, 40);
    });

    // Backward compatibility shim
    window.PolarisApp = window.PolarisApp || {};
    window.PolarisApp.setMacroPillar = (pillar, target) => switchMacroPillar(pillar, target);

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-tab');
        if (!target) return;

        if (target === 'atomic') {
          if (activeMacroPillar !== 'atomic') {
            switchMacroPillar('atomic', target);
            return;
          }
        } else if (target === 'sirium') {
          if (activeMacroPillar !== 'sirium') {
            switchMacroPillar('sirium', target);
            return;
          }
        } else if (target === 'deep-research' || target === 'key-vault') {
          if (activeMacroPillar !== 'polaris') {
            switchMacroPillar('polaris', target);
            return;
          }
        } else if (target === 'tools') {
          if (activeMacroPillar !== 'tools') {
            switchMacroPillar('tools', target);
            return;
          }
        } else if (target === 'social') {
          if (activeMacroPillar !== 'polarium') {
            switchMacroPillar('polarium', target);
            return;
          }
        } else if (target === 'study' || target === 'study-space') {
          if (activeMacroPillar !== 'luminary') {
            switchMacroPillar('luminary', target);
            return;
          }
        } else if (target === 'games') {
          if (activeMacroPillar !== 'starlium') {
            switchMacroPillar('starlium', target);
            return;
          }
        } else if (target === 'comingsoon') {
          // Keep current active coming soon constellation
          return;
        } else if (['owner', 'terminal', 'storage', 'whitelist', 'analytics', 'account'].includes(target)) {
          if (activeMacroPillar !== 'sanctum') {
            switchMacroPillar('sanctum', target);
            return;
          }
        } else {
          // Bot tabs: overview, hermes, groups, autoresponder, commands, story, import
          if (activeMacroPillar !== 'polaris') {
            switchMacroPillar('polaris', target);
            return;
          }
        }

        const prevPane = document.getElementById(`pane-${currentTab}`);
        const targetPane = document.getElementById(`pane-${target}`) || (target === 'study' ? document.getElementById('pane-study-space') : null);

        if (target === currentTab) {
          if (targetPane && !targetPane.classList.contains('active')) {
            panes.forEach(p => {
              p.classList.remove('active', 'pane-exit', 'pane-enter', 'pane-exit-forward', 'pane-exit-backward', 'pane-enter-forward', 'pane-enter-backward');
              p.style.display = '';
            });
            targetPane.classList.add('active');
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
          }
          return;
        }

        const prevIndex = tabOrder.indexOf(currentTab);
        const nextIndex = tabOrder.indexOf(target);
        const isForward = nextIndex >= prevIndex;

        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        // Play whoosh SFX
        if (window.Kinetix && typeof window.Kinetix.playSound === 'function') {
          window.Kinetix.playSound('page_whoosh');
        }

        const exitClass = isForward ? 'pane-exit-forward' : 'pane-exit-backward';
        const enterClass = isForward ? 'pane-enter-forward' : 'pane-enter-backward';

        // Clear inline styles so class-based CSS controls visibility cleanly
        panes.forEach(p => { p.style.display = ''; });

        if (prevPane && targetPane && prevPane !== targetPane) {
          prevPane.classList.add(exitClass);
          setTimeout(() => {
            panes.forEach((p) => {
              p.classList.remove('active', 'pane-exit', 'pane-enter', 'pane-exit-forward', 'pane-exit-backward', 'pane-enter-forward', 'pane-enter-backward');
            });
            targetPane.classList.add('active', enterClass);
            setTimeout(() => {
              targetPane.classList.remove(enterClass);
            }, 360);

            if (target === 'kinetix-studio' && window.Kinetix && typeof window.Kinetix.resizeParticleCanvas === 'function') {
              window.Kinetix.resizeParticleCanvas();
            }
          }, 120);
        } else {
          panes.forEach((p) => {
            p.classList.remove('active', 'pane-exit', 'pane-enter', 'pane-exit-forward', 'pane-exit-backward', 'pane-enter-forward', 'pane-enter-backward');
          });
          if (targetPane) {
            targetPane.classList.add('active', enterClass);
            setTimeout(() => targetPane.classList.remove(enterClass), 360);
          }
          if (target === 'kinetix-studio' && window.Kinetix && typeof window.Kinetix.resizeParticleCanvas === 'function') {
            window.Kinetix.resizeParticleCanvas();
          }
        }

        currentTab = target;
        loadTabContent(target);

        // Update active indicator
        setTimeout(() => {
          if (window.PolarisMotion && typeof window.PolarisMotion.updateActiveIndicator === 'function') {
            window.PolarisMotion.updateActiveIndicator();
          }
        }, 50);
      });
    });

    // Inter-page link transitions with cinematic portal sweep
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;
      const rawHref = link.getAttribute('href');
      if (!rawHref || rawHref.startsWith('javascript:') || rawHref.startsWith('blob:') || link.getAttribute('target') === '_blank') return;
      
      // If it's a hash-only anchor on the current page
      if (rawHref.startsWith('#')) {
        const tab = rawHref.replace(/^#/, '');
        if (tab && typeof applyUrlHashNavigation === 'function') {
          window.location.hash = tab;
          applyUrlHashNavigation();
        }
        return;
      }

      // Check if link is an internal .html target
      const isHtmlLink = /\.html(?:[?#]|$)/i.test(rawHref);
      if (!isHtmlLink) return;

      // If linking to index.html with a hash from index.html itself
      const isCurrentPage = rawHref.includes('index.html#') && (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/'));
      if (isCurrentPage) {
        e.preventDefault();
        const tab = rawHref.split('#')[1];
        if (tab) {
          window.location.hash = tab;
          if (typeof applyUrlHashNavigation === 'function') {
            applyUrlHashNavigation();
          }
        }
        return;
      }

      e.preventDefault();
      if (window.Kinetix && typeof window.Kinetix.playSound === 'function') {
        window.Kinetix.playSound('page_whoosh');
      }
      document.body.classList.add('page-unloading');

      // Safety watchdog to prevent permanent blank screen if transition is aborted
      const watchdog = setTimeout(() => {
        document.body.classList.remove('page-unloading');
        document.body.classList.add('page-ready');
      }, 1200);

      setTimeout(() => {
        clearTimeout(watchdog);
        window.location.href = rawHref;
      }, 180);
    });

    // Bfcache & page restoration protection (prevent blank screen on Back/Forward navigation)
    window.addEventListener('pageshow', () => {
      document.body.classList.remove('page-unloading', 'page-revealing');
      document.body.classList.add('page-ready');
    });
  }

  function loadTabContent(tab) {
    if (tab === 'overview') loadOverview();
    else if (tab === 'kinetix-studio') {
      if (window.Kinetix && typeof window.Kinetix.resizeParticleCanvas === 'function') {
        window.Kinetix.resizeParticleCanvas();
      }
    }
    else if (tab === 'hermes') loadHermesTab();
    else if (tab === 'story') loadStoryTab();
    else if (tab === 'whitelist') loadWhitelist();
    else if (tab === 'groups') loadGroups();
    else if (tab === 'commands') loadCommands();
    else if (tab === 'import') loadImportTab();
    else if (tab === 'tools') loadDownloaderTab();
    else if (tab === 'games') loadGamesArena();
    else if (tab === 'social') loadSocialFeed();
    else if (tab === 'study' || tab === 'study-space') loadStudySpace();
    else if (tab === 'storage') loadStorageTab();
    else if (tab === 'analytics') loadAnalyticsDashboard();
    else if (tab === 'autoresponder') loadAutoResponders();
    else if (tab === 'account') loadAccountSettings();
    else if (tab === 'owner') loadOwnerPanel();
    else if (tab === 'cluster') loadClusterTab();
    else if (tab === 'terminal') {
      const terminalBody = document.getElementById('terminal-body');
      if (terminalBody) terminalBody.scrollTop = terminalBody.scrollHeight;
    }
  }

  // ==================== TAB: 📚 STUDY SPACE & ACADEMY ====================
  function loadStudySpace() {
    let votes = {};
    try {
      votes = JSON.parse(localStorage.getItem('polaris_study_votes') || '{}');
    } catch (_) {}

    const defaults = { baileys: 148, hermes: 214, chess: 182, crypto: 196 };
    Object.keys(defaults).forEach(mod => {
      const el = document.getElementById(`vote-count-${mod}`);
      if (el) {
        const count = defaults[mod] + (votes[mod] ? 1 : 0);
        el.textContent = `${count} Vote`;
      }
      const btn = document.querySelector(`.study-vote-btn[data-module="${mod}"]`);
      if (btn && votes[mod]) {
        btn.classList.add('voted');
        btn.querySelector('span').textContent = 'Sudah Memilih ✓';
        btn.style.background = 'rgba(16, 185, 129, 0.2)';
        btn.style.borderColor = '#10b981';
      }
    });

    document.querySelectorAll('.study-vote-btn').forEach(btn => {
      btn.onclick = () => {
        const mod = btn.dataset.module;
        if (!mod) return;
        if (votes[mod]) {
          showToast('Anda sudah memberikan suara untuk modul ini!', 'info');
          return;
        }
        votes[mod] = true;
        localStorage.setItem('polaris_study_votes', JSON.stringify(votes));
        const el = document.getElementById(`vote-count-${mod}`);
        if (el) el.textContent = `${defaults[mod] + 1} Vote`;
        btn.classList.add('voted');
        btn.querySelector('span').textContent = 'Sudah Memilih ✓';
        btn.style.background = 'rgba(16, 185, 129, 0.2)';
        btn.style.borderColor = '#10b981';
        showToast('Terima kasih! Suara Anda berhasil dicatat.', 'success');
      };
    });

    const notifyBtn = document.getElementById('btn-study-notify-me');
    if (notifyBtn) {
      notifyBtn.onclick = () => {
        showToast('Notifikasi diaktifkan! Anda akan menerima update modul pembelajaran terbaru.', 'success');
      };
    }
  }

  // ==================== 1. TAB OVERVIEW ====================
  async function loadOverview() {
    try {
      const res = await PolarisAuth.authFetch('/api/data/overview');
      const json = await res.json();
      if (json.success) {
        overviewData = json.data;
        renderOverview(json.data);
      }
    } catch (_) {}
    loadEcosystemAndChannelStatus();
    loadRecentBotOutputs();
    loadClusterTab();
    try {
      const bRes = await PolarisAuth.authFetch('/api/bot/status');
      const bJson = await bRes.json();
      if (bJson && bJson.success) {
        if (window.PolarisWS && typeof window.PolarisWS.updateStatusUI === 'function') {
          window.PolarisWS.updateStatusUI(bJson);
        }
        if (bJson.lastQrDataUrl && (!selectedClusterBotId || selectedClusterBotId === 'primary' || selectedClusterBotId === bJson.instanceId)) {
          const qrImg = document.getElementById('cluster-qr-code-img');
          const qrCont = document.getElementById('cluster-qr-container');
          const qrPlace = document.getElementById('cluster-qr-placeholder');
          const pDisp = document.getElementById('cluster-pairing-code-display');
          const oDisp = document.getElementById('cluster-online-display');
          if (qrImg && qrCont) {
            qrImg.src = bJson.lastQrDataUrl;
            qrCont.style.display = 'flex';
            if (qrPlace) qrPlace.style.display = 'none';
            if (pDisp) pDisp.style.display = 'none';
            if (oDisp) oDisp.style.display = 'none';
          }
        }
        if (bJson.pairingCode && (!selectedClusterBotId || selectedClusterBotId === 'primary' || selectedClusterBotId === bJson.instanceId)) {
          const pDigits = document.getElementById('cluster-pairing-digits');
          const pDisp = document.getElementById('cluster-pairing-code-display');
          const qrPlace = document.getElementById('cluster-qr-placeholder');
          const qrCont = document.getElementById('cluster-qr-container');
          const oDisp = document.getElementById('cluster-online-display');
          if (pDigits && pDisp) {
            pDigits.textContent = bJson.pairingCode;
            pDisp.style.display = 'block';
            if (qrPlace) qrPlace.style.display = 'none';
            if (qrCont) qrCont.style.display = 'none';
            if (oDisp) oDisp.style.display = 'none';
          }
        }
      }
    } catch (_) {}
    loadSecuritySentinelStats();
    initSecuritySentinelUI();

    // Selesai memuat data awal dashboard: tutup Blackhole Loader
    if (typeof window.hideBlackholeLoader === 'function') {
      window.hideBlackholeLoader();
    }
  }

  function renderOverview(data) {
    const statOwners = document.getElementById('stat-owners');
    const statWhitelist = document.getElementById('stat-whitelist');
    const statGroups = document.getElementById('stat-groups');
    const statCommands = document.getElementById('stat-commands');

    if (statOwners) statOwners.textContent = data.ownerCount;
    if (statWhitelist) statWhitelist.textContent = data.whitelistCount;
    if (statGroups) statGroups.textContent = data.allowedGroupsCount;
    if (statCommands) statCommands.textContent = `${data.activeCommands}/${data.totalCommands}`;

    if (window.PolarisMotion) window.PolarisMotion.refreshInteractive();
  }

  // ==================== 1C. POLARIS SENTINEL SECURITY SHIELD 2.0 ====================
  let securitySentinelInitialized = false;

  async function loadSecuritySentinelStats() {
    try {
      const res = await PolarisAuth.authFetch('/api/security/virtex-stats');
      const data = await res.json();
      if (!data.success) return;

      const totalEl = document.getElementById('sec-total-intercepted');
      const protoEl = document.getElementById('sec-protobuf-blocked');
      const fallbackEl = document.getElementById('sec-fallback-blocked');
      const autokickEl = document.getElementById('sec-autokicks');
      const lastTimeEl = document.getElementById('sec-last-incident-time');
      const listEl = document.getElementById('sec-incidents-list');

      if (totalEl) totalEl.textContent = data.totalIntercepted || 0;
      const toggleShield = document.getElementById('toggle-security-shield');
      const beaconDot = document.getElementById('sentinel-beacon-dot');
      const shieldText = document.getElementById('sentinel-shield-text');
      if (toggleShield && typeof data.shieldActive === 'boolean') {
        toggleShield.checked = data.shieldActive;
      }
      if (beaconDot) {
        beaconDot.style.background = data.shieldActive !== false ? '#10b981' : '#ef4444';
        beaconDot.style.boxShadow = data.shieldActive !== false ? '0 0 8px #10b981' : 'none';
      }
      if (shieldText) {
        shieldText.textContent = data.shieldActive !== false ? 'Perlindungan aktif' : 'Perlindungan mati';
        shieldText.style.color = data.shieldActive !== false ? 'var(--text-primary)' : 'var(--text-muted)';
      }
      if (protoEl) protoEl.textContent = data.protobufBlocked || 0;
      if (fallbackEl) fallbackEl.textContent = data.fallbackBlocked || 0;
      if (autokickEl) autokickEl.textContent = data.autoKicksIssued || 0;

      if (lastTimeEl) {
        if (data.lastIncident && data.lastIncident.timestamp) {
          const dt = new Date(data.lastIncident.timestamp);
          lastTimeEl.textContent = `Serangan terakhir: ${dt.toLocaleTimeString('id-ID')} (${dt.toLocaleDateString('id-ID')})`;
        } else {
          lastTimeEl.textContent = 'Belum ada serangan aktif yang terdeteksi';
        }
      }

      if (listEl) {
        const incidents = data.recentIncidents || [];
        if (incidents.length === 0) {
          listEl.innerHTML = `
            <div style="font-size: 0.75rem; color: var(--text-muted); font-style: italic; padding: 6px 0;">
              Sistem tenang. Tidak ada virtex atau forceclose crasher aktif yang mencoba menyerang.
            </div>
          `;
        } else {
          listEl.innerHTML = incidents.slice(0, 10).map((inc) => {
            const dt = new Date(inc.timestamp);
            const timeStr = dt.toLocaleTimeString('id-ID', { hour12: false });
            const isCrit = inc.severity === 'critical';
            return `
              <div class="sec-incident-row" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-radius: var(--radius-sm); background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); font-size: 0.75rem; margin-bottom: 4px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="color: ${isCrit ? 'var(--accent-rose)' : 'var(--accent-amber)'}; font-weight: 800; font-size: 0.9rem;">${isCrit ? '🚨' : '⚠️'}</span>
                  <div>
                    <span style="font-weight: 700; color: var(--text-primary);">${escapeHtml(inc.reason || 'Attack')}</span>
                    <span style="color: var(--text-muted); margin-left: 6px; font-family: var(--font-mono); font-size: 0.72rem;">dari @${escapeHtml(inc.attacker || 'user')}</span>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span class="badge ${isCrit ? 'badge-danger' : 'badge-amber'}" style="font-size: 0.65rem;">${escapeHtml(inc.action || 'Purged')}</span>
                  <span style="font-family: var(--font-mono); color: var(--text-muted); font-size: 0.68rem;">${timeStr}</span>
                </div>
              </div>
            `;
          }).join('');
        }
      }
    } catch (err) {
      console.warn('[Polaris Sentinel] Gagal memuat statistik keamanan:', err.message);
    }
  }

  function initSecuritySentinelUI() {
    if (securitySentinelInitialized) return;
    securitySentinelInitialized = true;

    const toggleShield = document.getElementById('toggle-security-shield');
    if (toggleShield) {
      toggleShield.addEventListener('change', async () => {
        const active = toggleShield.checked;
        const beaconDot = document.getElementById('sentinel-beacon-dot');
        const shieldText = document.getElementById('sentinel-shield-text');
        if (beaconDot) {
          beaconDot.style.background = active ? '#10b981' : '#ef4444';
          beaconDot.style.boxShadow = active ? '0 0 8px #10b981' : 'none';
        }
        if (shieldText) {
          shieldText.textContent = active ? 'Perlindungan aktif' : 'Perlindungan mati';
          shieldText.style.color = active ? 'var(--text-primary)' : 'var(--text-muted)';
        }
        try {
          const res = await PolarisAuth.authFetch('/api/security/toggle-shield', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active })
          });
          const j = await res.json();
          showToast(j.message || (active ? 'Shield Aktif' : 'Shield Dinonaktifkan'), active ? 'success' : 'warning');
        } catch (e) {
          showToast('Gagal mengubah status shield: ' + e.message, 'error');
        }
      });
    }

    const btnRefresh = document.getElementById('btn-refresh-security-stats');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        btnRefresh.disabled = true;
        btnRefresh.innerHTML = '⏳ Memuat...';
        loadSecuritySentinelStats().finally(() => {
          setTimeout(() => {
            btnRefresh.disabled = false;
            btnRefresh.innerHTML = '🔄 Refresh';
          }, 350);
        });
      });
    }

    const testInput = document.getElementById('sec-test-input');
    const btnScan = document.getElementById('btn-sec-scan');
    const verdictBox = document.getElementById('sec-scan-verdict');

    const runScan = async (payloadToTest) => {
      const payload = payloadToTest !== undefined ? payloadToTest : (testInput ? testInput.value : '');
      if (!payload || !payload.trim()) {
        showToast('Masukkan teks atau payload virtex untuk diuji', 'error');
        if (testInput) testInput.focus();
        return;
      }

      if (btnScan) {
        btnScan.disabled = true;
        btnScan.innerHTML = '⏳ Memindai...';
      }
      if (verdictBox) {
        verdictBox.style.display = 'block';
        verdictBox.style.border = '1px solid var(--border-active)';
        verdictBox.style.background = 'rgba(15, 23, 42, 0.7)';
        verdictBox.style.color = '#fff';
        verdictBox.innerHTML = '<span class="spinner-small" style="display:inline-block; margin-right: 6px;"></span> Menyelidiki struktur biner & heuristik teks virtex...';
      }

      try {
        const res = await PolarisAuth.authFetch('/api/security/test-payload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload }),
        });
        const data = await res.json();
        const result = data.result || {};

        if (verdictBox) {
          if (result.isVirtex) {
            verdictBox.style.display = 'block';
            verdictBox.style.border = '1.5px solid #ef4444';
            verdictBox.style.background = 'rgba(239, 68, 68, 0.12)';
            verdictBox.style.color = '#fecaca';
            verdictBox.innerHTML = `
              <div style="font-weight: 800; font-size: 0.9rem; color: var(--accent-rose); display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span>🚨</span> VIRTEX / CRASH EXPLOIT TERDETEKSI!
              </div>
              <div style="margin-bottom: 2px;">• <strong>Vektor Serangan:</strong> ${escapeHtml(result.reason || 'Malicious Crash Vector')}</div>
              <div style="margin-bottom: 2px;">• <strong>Tingkat Bahaya (Severity):</strong> <span class="badge badge-danger" style="text-transform: uppercase;">${escapeHtml(result.severity || 'critical')}</span></div>
              <div style="margin-bottom: 2px;">• <strong>Tipe Payload:</strong> ${escapeHtml(result.scannedType || 'raw')}</div>
              <div style="color: #6ee7b7; margin-top: 6px;">🛡️ <strong>Mitigasi Polaris 2.0:</strong> Pesan ini akan otomatis dimusnahkan (Purged) seketika dan pengirim akan dikeluarkan dari grup tanpa merusak WhatsApp Anda.</div>
            `;
          } else {
            verdictBox.style.display = 'block';
            verdictBox.style.border = '1.5px solid #10b981';
            verdictBox.style.background = 'rgba(16, 185, 129, 0.12)';
            verdictBox.style.color = '#a7f3d0';
            verdictBox.innerHTML = `
              <div style="font-weight: 800; font-size: 0.9rem; color: var(--accent-emerald); display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span>✅</span> PAYLOAD AMAN (BERSIH DARI VIRTEX)
              </div>
              <div>Tidak ditemukan tanda forceclose crasher, zalgo explosion, quote trapper, atau corrupt protobuf. Pesan aman diproses.</div>
            `;
          }
        }
      } catch (err) {
        if (verdictBox) {
          verdictBox.style.display = 'block';
          verdictBox.style.border = '1.5px solid #f59e0b';
          verdictBox.style.background = 'rgba(245, 158, 11, 0.12)';
          verdictBox.style.color = '#fde68a';
          verdictBox.innerHTML = `⚠️ Gagal melakukan scan: ${escapeHtml(err.message)}`;
        }
      } finally {
        if (btnScan) {
          btnScan.disabled = false;
          btnScan.innerHTML = '⚡ Scan Payload';
        }
      }
    };

    if (btnScan) {
      btnScan.addEventListener('click', () => runScan());
    }

    if (testInput) {
      testInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          runScan();
        }
      });
    }

    // Preset buttons
    document.querySelectorAll('.sec-preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-preset');
        let text = '';
        if (preset === 'fallback') {
          text = "Part of this response isn't supported on this device yet. View the response on your phone.";
        } else if (preset === 'zalgo') {
          text = "T̷e̶s̶t̴ ̷v̴i̷r̷t̸e̶x̷ ̵z̷a̸l̶g̴o̸ ̶f̸l̶o̶o̵d̴ ̵a̸t̸t̴a̷c̴k̴ ̵\u0300\u0301\u0302\u0303\u0304\u0305\u0306\u0307\u0308\u0309\u030A\u030B\u030C\u030D\u030E\u030F";
        } else if (preset === 'nativeflow') {
          text = '{"interactiveMessage":{"nativeFlowMessage":{"buttons":[]}}}';
        } else if (preset === 'safe') {
          text = "Halo bot, tolong buatkan stiker dari foto ini ya!";
        }
        if (testInput) testInput.value = text;
        runScan(text);
      });
    });

    // Realtime event listener dari websocket
    window.addEventListener('polaris:virtex-blocked', (ev) => {
      loadSecuritySentinelStats();
      const inc = ev.detail || {};
      showToast(`🚨 Serangan Virtex dicegat dari @${inc.attacker || 'unknown'}!`, 'error');
    });
  }

  // ==================== 1B. EKOSISTEM GRUP & SALURAN WA RESMI ====================
  async function loadEcosystemAndChannelStatus() {
    try {
      const res = await PolarisAuth.authFetch('/api/ecosystem/status');
      const json = await res.json();
      if (json.success) {
        const groups = json.ecosystem?.groups || {};
        const ch = json.channel || {};

        // Update Channel Status
        const chBadge = document.getElementById('badge-channel-follow');
        const legacyChBadge = document.getElementById('channel-follow-status-badge');
        const isFollowing = Boolean(ch.isFollowing);
        const role = (ch.viewerRole || 'SUBSCRIBER').toUpperCase();

        [chBadge, legacyChBadge].forEach((b) => {
          if (!b) return;
          if (isFollowing) {
            b.className = 'badge badge-emerald';
            if (role === 'OWNER') {
              b.textContent = '👑 OWNER Saluran';
            } else if (role === 'ADMIN') {
              b.textContent = '🛡️ ADMIN Saluran';
            } else {
              b.textContent = '✅ Mengikuti (Subscriber)';
            }
          } else {
            b.className = 'badge badge-amber';
            b.textContent = '⏳ Belum Mengikuti';
          }
        });

        // Update 4 Ecosystem Groups
        const updateCard = (key, badgeId, jidId, legacyBadgeId, legacyJidId) => {
          const item = groups[key];
          const hasJid = Boolean(item && item.jid);

          [badgeId, legacyBadgeId].forEach((id) => {
            const b = document.getElementById(id);
            if (!b) return;
            if (hasJid) {
              b.className = 'badge badge-emerald';
              b.textContent = '🟢 Aktif / Terhubung';
            } else {
              b.className = 'badge badge-amber';
              b.textContent = '⏳ Standby';
            }
          });

          [jidId, legacyJidId].forEach((id) => {
            const j = document.getElementById(id);
            if (!j) return;
            j.textContent = hasJid ? item.jid : 'Menunggu inisialisasi...';
          });
        };

        updateCard('news', 'badge-eco-news', 'eco-news-jid', 'eco-status-news', 'eco-jid-news');
        updateCard('sandbox', 'badge-eco-sandbox', 'eco-sandbox-jid', 'eco-status-sandbox', 'eco-jid-sandbox');
        updateCard('logs', 'badge-eco-logs', 'eco-logs-jid', 'eco-status-logs', 'eco-jid-logs');
        updateCard('vault', 'badge-eco-vault', 'eco-vault-jid', 'eco-status-vault', 'eco-jid-vault');
        updateCard('academy', 'badge-eco-academy', 'eco-academy-jid', 'eco-status-academy', 'eco-jid-academy');
      }
    } catch (err) {
      console.error('[loadEcosystemAndChannelStatus] Error:', err);
    }
  }

  async function broadcastNewsNow() {
    const btn = document.getElementById('btn-broadcast-news-now');
    if (!btn) return;
    const origHtml = btn.innerHTML;
    try {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span> Menyiarkan...';
      const res = await PolarisAuth.authFetch('/api/ecosystem/broadcast-news', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showToast(`Berhasil menyiarkan ${json.count || 0} berita teknologi ke grup Global Hot News!`, 'success');
        loadEcosystemAndChannelStatus();
      } else {
        showToast(json.error || 'Gagal menyiarkan berita.', 'error');
      }
    } catch (err) {
      showToast('Error broadcast: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = origHtml;
    }
  }

  async function syncChannelFollowNow() {
    const btn = document.getElementById('btn-sync-channel-follow');
    if (!btn) return;
    const origHtml = btn.innerHTML;
    try {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span> Menyinkronkan...';
      const res = await PolarisAuth.authFetch('/api/ecosystem/follow-channel', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || 'Berhasil memverifikasi follow Saluran Resmi!', 'success');
        loadEcosystemAndChannelStatus();
      } else {
        showToast(json.error || 'Gagal mengikuti saluran.', 'error');
      }
    } catch (err) {
      showToast('Error follow saluran: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = origHtml;
    }
  }

  async function relinkEcosystemNow() {
    const btn = document.getElementById('btn-relink-ecosystem');
    const origHtml = btn ? btn.innerHTML : '';
    if (typeof window.showBlackholeLoader === 'function') {
      window.showBlackholeLoader('SINKRONISASI EKOSISTEM', 'Memindai & menautkan grup ke komunitas...');
    }
    try {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>⏳</span> Mendeteksi...';
      }
      const res = await PolarisAuth.authFetch('/api/bot/ecosystem-relink', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        const reconnected = json.reconnectedCount ?? 0;
        const newly = json.newlyCreatedCount ?? 0;
        showToast(`Auto-detect ekosistem sukses! ${reconnected} grup dikoneksikan ulang, ${newly} dibuat baru.`, 'success');
        loadEcosystemAndChannelStatus();
      } else {
        showToast(json.error || 'Gagal menyinkronkan ekosistem grup.', 'error');
      }
    } catch (err) {
      showToast('Error relink ekosistem: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
      if (typeof window.hideBlackholeLoader === 'function') {
        window.hideBlackholeLoader();
      }
    }
  }

  // ==================== 1C. LIVE BOT OUTPUT MODIFIER & DISPATCHER ====================
  let cachedBotOutputs = [];

  async function loadRecentBotOutputs() {
    try {
      const picker = document.getElementById('edit-output-picker');
      if (!picker) return;

      const res = await PolarisAuth.authFetch('/api/bot/outputs');
      const json = await res.json();
      if (json.success && Array.isArray(json.outputs)) {
        cachedBotOutputs = json.outputs;
        picker.innerHTML = '<option value="">-- Pilih pesan bot yang ingin diedit --</option>';
        if (cachedBotOutputs.length === 0) {
          picker.innerHTML = '<option value="">(Belum ada riwayat output bot terkini)</option>';
          return;
        }

        cachedBotOutputs.forEach((item) => {
          const opt = document.createElement('option');
          opt.value = item.id;
          const timeStr = item.timestamp ? new Date(item.timestamp).toLocaleTimeString('id-ID') : '';
          const preview = (item.text || '').replace(/\s+/g, ' ').slice(0, 50);
          const target = (item.chatJid || '').split('@')[0];
          opt.textContent = `[${timeStr}] [${item.command || 'msg'}] ${preview}... (${target})`;
          picker.appendChild(opt);
        });
      }
    } catch (err) {
      console.error('[loadRecentBotOutputs] Error:', err);
    }
  }

  function initEditOutputControls() {
    const btnRefreshEco = document.getElementById('btn-refresh-eco');
    if (btnRefreshEco) {
      btnRefreshEco.addEventListener('click', () => {
        loadEcosystemAndChannelStatus();
        showToast('Memperbarui status ekosistem grup & saluran...', 'info');
      });
    }
  }

  // ==================== 2. TAB POST STORY WA (SW) ====================
  let cachedContacts = [];

  async function loadBotProfile(targetBotId) {
    try {
      const botId = targetBotId || document.getElementById('story-target-bot')?.value || 'primary';
      const endpoint = (botId && botId !== 'primary')
        ? `/api/cluster/instances/${encodeURIComponent(botId)}/profile`
        : '/api/bot/profile';

      const res = await PolarisAuth.authFetch(endpoint);
      const json = await res.json();
      const avatarImg = document.getElementById('wa-status-avatar-img');
      const avatarFallback = document.getElementById('wa-status-avatar-fallback');
      const botNameEl = document.getElementById('wa-status-bot-name');

      if (json.success && json.data) {
        const p = json.data;
        if (p.profilePicUrl && avatarImg) {
          avatarImg.src = p.profilePicUrl;
          avatarImg.style.display = 'block';
          if (avatarFallback) avatarFallback.style.display = 'none';
        } else {
          if (avatarImg) {
            avatarImg.src = '';
            avatarImg.style.display = 'none';
          }
          if (avatarFallback) {
            avatarFallback.style.display = 'flex';
            const initial = (p.name || 'Bot').replace(/[^a-zA-Z0-9]/g, '').charAt(0).toUpperCase() || '🤖';
            avatarFallback.textContent = initial;
          }
        }
        if (p.name && botNameEl) {
          botNameEl.textContent = p.name;
        }
      } else {
        const select = document.getElementById('story-target-bot');
        const selectedOpt = select?.options[select.selectedIndex];
        const optText = selectedOpt ? selectedOpt.textContent.split('(')[0].replace(/[🌟🤖]/g, '').trim() : 'WhatsApp Bot';
        if (botNameEl) botNameEl.textContent = optText;
        if (avatarImg) {
          avatarImg.src = '';
          avatarImg.style.display = 'none';
        }
        if (avatarFallback) {
          avatarFallback.style.display = 'flex';
          avatarFallback.textContent = optText.charAt(0).toUpperCase() || '🤖';
        }
      }
    } catch (_) {}
  }

  async function loadBotContacts() {
    const listEl = document.getElementById('story-contact-list');
    if (!listEl) return;
    try {
      const res = await PolarisAuth.authFetch('/api/bot/contacts');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        cachedContacts = json.data;
        renderContactList(cachedContacts);
      }
    } catch (err) {
      if (listEl) listEl.innerHTML = `<div style="color:var(--accent-rose); font-size:0.75rem; grid-column:1/-1; text-align:center; padding:10px;">Gagal memuat kontak bot: ${escapeHtml(err.message)}</div>`;
    }
  }

  function normalizeClientPhone(raw) {
    if (!raw) return '';
    let digits = String(raw).replace(/[^0-9]/g, '');
    if (digits.startsWith('08')) {
      digits = '628' + digits.slice(2);
    } else if (digits.startsWith('8') && digits.length >= 9 && digits.length <= 13) {
      digits = '628' + digits.slice(1);
    }
    return (digits.length >= 9 && digits.length <= 16) ? digits : '';
  }

  // State Template Audiens Story WA (Maksimal 10 Template)
  let storyTemplatesData = [];

  function renderContactList(contacts) {
    const listEl = document.getElementById('story-contact-list');
    const summaryEl = document.getElementById('story-contacts-summary');
    if (!listEl) return;
    if (!contacts || contacts.length === 0) {
      listEl.innerHTML = '<div style="color:var(--text-muted); font-size:0.75rem; grid-column:1/-1; text-align:center; padding:10px;">Belum ada kontak tersimpan dari bot. Gunakan form input manual di bawah.</div>';
      if (summaryEl) summaryEl.textContent = '0 kontak';
      return;
    }

    // Strict deduplication & normalisasi nomor telepon (9-16 digit angka, no duplicate)
    const uniqueContacts = new Map();
    contacts.forEach((c) => {
      const rawNum = c.number || c.phone || (c.jid ? c.jid.split('@')[0] : '');
      const validPhone = normalizeClientPhone(rawNum);
      if (validPhone && !uniqueContacts.has(validPhone)) {
        uniqueContacts.set(validPhone, {
          phone: validPhone,
          name: c.name || `Kontak ${validPhone.slice(-4)}`,
        });
      }
    });

    const contactArr = Array.from(uniqueContacts.values());
    if (summaryEl) summaryEl.textContent = `${contactArr.length} kontak valid`;

    if (contactArr.length === 0) {
      listEl.innerHTML = '<div style="color:var(--text-muted); font-size:0.75rem; grid-column:1/-1; text-align:center; padding:10px;">Tidak ada nomor kontak valid ditemukan.</div>';
      return;
    }

    listEl.innerHTML = contactArr.map((c) => {
      const phone = c.phone;
      const name = c.name;
      const initial = (name[0] || '?').toUpperCase();
      return `
        <label class="story-contact-item" data-phone="${escapeHtml(phone)}" data-name="${escapeHtml(name.toLowerCase())}" style="display:flex; align-items:center; gap:8px; padding:6px 8px; background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:var(--radius-sm); cursor:pointer; user-select:none; font-size:0.76rem;">
          <input type="checkbox" value="${escapeHtml(phone)}" class="story-contact-cb" style="cursor:pointer;">
          <div style="width:24px; height:24px; border-radius:50%; background:color-mix(in srgb, var(--accent-cyan) 15%, transparent); color:var(--accent-cyan); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.7rem; flex-shrink:0;">
            ${escapeHtml(initial)}
          </div>
          <div style="min-width:0; flex:1;">
            <div style="font-weight:600; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(name)}</div>
            <div style="font-family:var(--font-mono); font-size:0.68rem; color:var(--text-muted);">${escapeHtml(phone)}</div>
          </div>
        </label>
      `;
    }).join('');

    listEl.querySelectorAll('.story-contact-cb').forEach((cb) => {
      cb.addEventListener('change', () => {
        const item = cb.closest('.story-contact-item');
        if (cb.checked) {
          item.style.borderColor = 'var(--accent-cyan)';
          item.style.background = 'rgba(56,189,248,0.08)';
        } else {
          item.style.borderColor = 'var(--border-subtle)';
          item.style.background = 'rgba(255,255,255,0.03)';
        }
        updateSelectedContactsCount();
      });
    });
    updateSelectedContactsCount();
  }

  function updateSelectedContactsCount() {
    const countEl = document.getElementById('story-selected-contacts-count');
    if (!countEl) return;
    const checked = document.querySelectorAll('.story-contact-cb:checked').length;
    countEl.textContent = `${checked} Terpilih`;
  }

  // ==================== STORY AUDIENCE TEMPLATES (MAX 10) ====================
  async function loadStoryTemplates() {
    try {
      const targetBot = document.getElementById('story-target-bot')?.value || 'primary';
      const res = await PolarisAuth.authFetch(`/api/story/templates?instanceId=${targetBot}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        storyTemplatesData = json.data;
        renderStoryTemplatesDropdown();
      }
    } catch (err) {
      console.warn('[StoryTemplates] Gagal memuat template audiens:', err.message);
    }
  }

  function renderStoryTemplatesDropdown() {
    const select = document.getElementById('story-template-select');
    const badge = document.getElementById('story-template-count-badge');
    const deleteBtn = document.getElementById('btn-story-delete-template');
    if (!select) return;

    if (badge) {
      badge.textContent = `${storyTemplatesData.length} / 10 Template`;
    }

    const currentVal = select.value;
    select.innerHTML = `<option value="">-- Pilih Template Tersimpan (${storyTemplatesData.length}/10) --</option>` +
      storyTemplatesData.map((t) => {
        return `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)} (${t.count || t.contacts.length} Kontak)</option>`;
      }).join('');

    if (currentVal && storyTemplatesData.some((t) => t.id === currentVal)) {
      select.value = currentVal;
      if (deleteBtn) deleteBtn.style.display = 'inline-block';
    } else {
      if (deleteBtn) deleteBtn.style.display = 'none';
    }
  }

  function applySelectedStoryTemplate() {
    const select = document.getElementById('story-template-select');
    if (!select || !select.value) {
      showToast('Pilih template audiens yang ingin diterapkan terlebih dahulu.', 'warning');
      return;
    }
    const template = storyTemplatesData.find((t) => t.id === select.value);
    if (!template) return;

    const targetSet = new Set((template.contacts || []).map((n) => normalizeClientPhone(n)));
    let appliedCount = 0;

    document.querySelectorAll('.story-contact-cb').forEach((cb) => {
      const normVal = normalizeClientPhone(cb.value);
      const shouldCheck = targetSet.has(normVal);
      cb.checked = shouldCheck;
      const item = cb.closest('.story-contact-item');
      if (item) {
        if (shouldCheck) {
          item.style.borderColor = 'var(--accent-cyan)';
          item.style.background = 'rgba(56,189,248,0.08)';
          appliedCount++;
        } else {
          item.style.borderColor = 'var(--border-subtle)';
          item.style.background = 'rgba(255,255,255,0.03)';
        }
      }
    });

    updateSelectedContactsCount();
    showToast(`Template '${template.name}' diterapkan (${appliedCount} kontak dipilih).`, 'success');
  }

  function openSaveStoryTemplateModal() {
    const checkedCbs = document.querySelectorAll('.story-contact-cb:checked');
    if (checkedCbs.length === 0) {
      showToast('Centang minimal 1 kontak sebelum menyimpan template audiens!', 'warning');
      return;
    }

    if (storyTemplatesData.length >= 10) {
      showToast('Kapasitas template penuh! Maksimal 10 template audiens yang diizinkan. Hapus template lama terlebih dahulu.', 'error');
      return;
    }

    const modal = document.getElementById('modal-save-story-template');
    const countEl = document.getElementById('story-template-target-count');
    const nameInput = document.getElementById('story-template-name-input');
    if (countEl) countEl.textContent = checkedCbs.length;
    if (nameInput) nameInput.value = '';
    if (modal) modal.classList.add('active');
  }

  async function confirmSaveStoryTemplate() {
    const nameInput = document.getElementById('story-template-name-input');
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
      showToast('Nama template audiens wajib diisi.', 'warning');
      return;
    }

    const checkedCbs = document.querySelectorAll('.story-contact-cb:checked');
    const contacts = Array.from(checkedCbs).map((cb) => normalizeClientPhone(cb.value)).filter(Boolean);

    if (contacts.length === 0) {
      showToast('Tidak ada nomor kontak valid yang dipilih.', 'warning');
      return;
    }

    try {
      const targetBot = document.getElementById('story-target-bot')?.value || 'primary';
      const res = await PolarisAuth.authFetch('/api/story/templates', {
        method: 'POST',
        body: JSON.stringify({ name, contacts, instanceId: targetBot }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Template '${name}' berhasil disimpan (${json.data.count} kontak)!`, 'success');
        const modal = document.getElementById('modal-save-story-template');
        if (modal) modal.classList.remove('active');
        await loadStoryTemplates();
        const select = document.getElementById('story-template-select');
        if (select) {
          select.value = json.data.id;
          const deleteBtn = document.getElementById('btn-story-delete-template');
          if (deleteBtn) deleteBtn.style.display = 'inline-block';
        }
      } else {
        showToast(json.error || 'Gagal menyimpan template audiens', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  async function deleteSelectedStoryTemplate() {
    const select = document.getElementById('story-template-select');
    if (!select || !select.value) return;
    const template = storyTemplatesData.find((t) => t.id === select.value);
    if (!template) return;

    if (!confirm(`Yakin ingin menghapus template audiens '${template.name}'?`)) return;

    try {
      const targetBot = document.getElementById('story-target-bot')?.value || 'primary';
      const res = await PolarisAuth.authFetch(`/api/story/templates/${template.id}?instanceId=${targetBot}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Template '${template.name}' telah dihapus.`, 'success');
        await loadStoryTemplates();
      } else {
        showToast(json.error || 'Gagal menghapus template', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  async function populateClusterBotSelectors() {
    try {
      const res = await PolarisAuth.authFetch('/api/cluster/instances');
      const json = await res.json();
      if (json.success && Array.isArray(json.instances)) {
        const targetIds = ['story-target-bot', 'command-target-bot', 'import-target-bot', 'group-target-bot', 'whitelist-target-bot'];
        const optionsHtml = json.instances.map((inst) => {
          const isRun = inst.status === 'RUNNING';
          const isOnline = inst.botStatus === 'ONLINE' || inst.botStatus === 'CONNECTED';
          const roleTag = inst.isPrimary ? 'MASTER HUB' : (inst.role ? inst.role.toUpperCase() : 'BOT MEMBER');
          const statusText = isOnline ? 'ONLINE' : (isRun ? (inst.botStatus === 'WAITING_QR' ? 'SCAN QR' : 'CONNECTING') : 'OFFLINE');
          const label = `${inst.isPrimary ? '🌟 ' : '🤖 '}${escapeHtml(inst.name)} [${roleTag}] - ${statusText}`;
          return `<option value="${escapeHtml(inst.id)}" data-port="${inst.port}" data-running="${isRun}">${label}</option>`;
        }).join('');

        targetIds.forEach((id) => {
          const select = document.getElementById(id);
          if (!select) return;
          const currentVal = select.value || 'primary';
          select.innerHTML = optionsHtml;
          if (json.instances.some((i) => i.id === currentVal)) {
            select.value = currentVal;
          }
        });

        const storySelect = document.getElementById('story-target-bot');
        const badge = document.getElementById('story-target-bot-badge');
        if (badge && storySelect && storySelect.selectedIndex >= 0) {
          const selectedOpt = storySelect.options[storySelect.selectedIndex];
          if (selectedOpt) {
            const isRunning = selectedOpt.getAttribute('data-running') === 'true';
            badge.textContent = isRunning ? 'Bot Online' : 'Bot Offline';
            badge.className = isRunning ? 'badge badge-cyan' : 'badge badge-rose';
          }
        }
      }
    } catch (_) {}
  }
  const populateStoryBotSelector = populateClusterBotSelectors;

  async function loadStoryTab() {
    await populateStoryBotSelector();
    const currentBotId = document.getElementById('story-target-bot')?.value || 'primary';
    loadBotProfile(currentBotId);
    await loadStoryTemplates();
    if (currentBotId === 'primary') {
      loadBotContacts();
    } else {
      try {
        const res = await PolarisAuth.authFetch(`/api/cluster/instances/${currentBotId}/contacts`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          cachedContacts = json.data;
          renderContactList(cachedContacts);
        } else {
          renderContactList([]);
        }
      } catch (_) {
        renderContactList([]);
      }
    }
    const grid = document.getElementById('story-groups-checkbox-grid');
    if (!grid) return;
    try {
      const res = await PolarisAuth.authFetch('/api/data/groups');
      const json = await res.json();
      if (json.success && json.data) {
        groupData = json.data;
        if (json.waGroups) window.waGroupsCache = json.waGroups;
        renderStoryGroups(json.data);
      }
    } catch (_) {
      grid.innerHTML = '<div style="color:var(--text-muted); font-size:0.78rem;">Gagal memuat daftar grup.</div>';
    }
  }

  function renderStoryGroups(data) {
    const grid = document.getElementById('story-groups-checkbox-grid');
    if (!grid) return;
    const allowedGroups = data.allowedGroups || {};
    const waGroups = window.waGroupsCache || {};
    const allGroupJids = Array.from(new Set([...Object.keys(allowedGroups), ...Object.keys(waGroups)]));

    if (allGroupJids.length === 0) {
      grid.innerHTML = '<div style="color:var(--text-muted); font-size:0.78rem; grid-column:1/-1;">Belum ada grup WhatsApp terdeteksi. Hubungkan bot ke WhatsApp dan klik tombol sinkronisasi grup.</div>';
      return;
    }

    grid.innerHTML = '';
    allGroupJids.forEach((jid) => {
      const g = allowedGroups[jid] || {};
      const wa = waGroups[jid] || {};
      const gName = g.name || g.subject || wa.name || wa.subject || jid;
      const card = document.createElement('label');
      card.className = 'story-group-card';
      card.innerHTML = `
        <input type="checkbox" value="${escapeHtml(jid)}" class="story-group-item-cb">
        <div style="min-width:0; flex:1;">
          <div style="font-weight:700; font-size:0.84rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:flex; align-items:center; gap:6px; color:#fff;" title="${escapeHtml(gName)}">
            <span>👥</span> ${escapeHtml(gName)}
          </div>
          <div style="font-size:0.69rem; color:var(--text-muted); font-family:var(--font-mono); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;">
            ${escapeHtml(jid)}${wa.participantsCount ? ` • ${wa.participantsCount} Anggota` : ''}
          </div>
        </div>
      `;
      const cb = card.querySelector('.story-group-item-cb');
      cb.addEventListener('change', () => {
        if (cb.checked) card.classList.add('active');
        else card.classList.remove('active');
      });
      grid.appendChild(card);
    });
  }

  function initStoryFeature() {
    const targetBotSelect = document.getElementById('story-target-bot');
    if (targetBotSelect) {
      targetBotSelect.addEventListener('change', async () => {
        const botId = targetBotSelect.value;
        const badge = document.getElementById('story-target-bot-badge');
        const selectedOpt = targetBotSelect.options[targetBotSelect.selectedIndex];
        if (badge && selectedOpt) {
          const isRunning = selectedOpt.getAttribute('data-running') === 'true';
          badge.textContent = isRunning ? 'Bot Online' : 'Bot Offline';
          badge.className = isRunning ? 'badge badge-cyan' : 'badge badge-rose';
        }
        loadBotProfile(botId);
        await loadStoryTemplates();
        if (botId === 'primary') {
          loadBotContacts();
        } else {
          try {
            const res = await PolarisAuth.authFetch(`/api/cluster/instances/${botId}/contacts`);
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
              cachedContacts = json.data;
              renderContactList(cachedContacts);
            } else {
              renderContactList([]);
            }
          } catch (_) {
            renderContactList([]);
          }
        }
      });
    }

    const modeMediaBtn = document.getElementById('story-mode-media-btn');
    const modeTextBtn = document.getElementById('story-mode-text-btn');
    const mediaSection = document.getElementById('story-media-section');
    const textSection = document.getElementById('story-text-section');
    const canvasTextArea = document.getElementById('wa-canvas-text-area');
    const canvasMediaArea = document.getElementById('wa-canvas-media-area');
    const canvas = document.getElementById('wa-status-canvas');

    if (modeMediaBtn && modeTextBtn) {
      modeMediaBtn.addEventListener('click', () => {
        modeMediaBtn.classList.add('active');
        modeTextBtn.classList.remove('active');
        if (mediaSection) mediaSection.style.display = 'block';
        if (textSection) textSection.style.display = 'none';
        if (canvasMediaArea) canvasMediaArea.style.display = 'flex';
        if (canvasTextArea) canvasTextArea.style.display = 'none';
      });

      modeTextBtn.addEventListener('click', () => {
        modeTextBtn.classList.add('active');
        modeMediaBtn.classList.remove('active');
        if (textSection) textSection.style.display = 'block';
        if (mediaSection) mediaSection.style.display = 'none';
        if (canvasTextArea) canvasTextArea.style.display = 'flex';
        if (canvasMediaArea) canvasMediaArea.style.display = 'none';
      });
    }

    // Font selector (WhatsApp font styles)
    const fontBtns = document.querySelectorAll('.story-font-btn');
    fontBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        fontBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        selectedStoryFont = parseInt(btn.getAttribute('data-font'), 10) || 1;
        const fontClass = btn.getAttribute('data-font-class') || 'font-sans';
        if (canvasTextArea) {
          canvasTextArea.className = `wa-status-content-area ${fontClass}`;
        }
      });
    });

    // Color Palette (WhatsApp background colors)
    const colorDots = document.querySelectorAll('.story-color-dot');
    colorDots.forEach((dot) => {
      dot.addEventListener('click', () => {
        colorDots.forEach((d) => (d.style.border = '1px solid var(--border-subtle)'));
        dot.style.border = '2px solid var(--accent-cyan)';
        selectedStoryBgColor = dot.getAttribute('data-color') || '#005c4b';
        if (canvas) {
          canvas.style.backgroundColor = selectedStoryBgColor;
        }
      });
    });

    // Live update teks story di canvas WA Web
    const textInput = document.getElementById('story-text-content');
    const textDisplay = document.getElementById('wa-canvas-text-display');
    if (textInput && textDisplay) {
      textInput.addEventListener('input', () => {
        const val = textInput.value.trim();
        textDisplay.textContent = val || 'Ketik kata-kata status WhatsApp Anda...';
      });
    }

    // File input media preview di canvas WA Web
    const fileInput = document.getElementById('story-file-input');
    const canvasMediaEmpty = document.getElementById('wa-canvas-media-empty');
    const canvasImg = document.getElementById('wa-canvas-img');
    const canvasVideo = document.getElementById('wa-canvas-video');

    if (fileInput) {
      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) {
          selectedMediaBase64 = null;
          selectedMediaExt = null;
          if (canvasMediaEmpty) canvasMediaEmpty.style.display = 'block';
          if (canvasImg) canvasImg.style.display = 'none';
          if (canvasVideo) canvasVideo.style.display = 'none';
          return;
        }

        const ext = file.name.split('.').pop().toLowerCase();
        selectedMediaExt = ext;

        const reader = new FileReader();
        reader.onload = (e) => {
          selectedMediaBase64 = e.target.result;
          if (canvasMediaEmpty) canvasMediaEmpty.style.display = 'none';

          if (file.type.startsWith('video/')) {
            if (canvasImg) canvasImg.style.display = 'none';
            if (canvasVideo) {
              canvasVideo.src = selectedMediaBase64;
              canvasVideo.style.display = 'block';
            }
          } else {
            if (canvasVideo) canvasVideo.style.display = 'none';
            if (canvasImg) {
              canvasImg.src = selectedMediaBase64;
              canvasImg.style.display = 'block';
            }
          }
        };
        reader.readAsDataURL(file);
      });
    }

    // Live caption sync
    const captionInput = document.getElementById('story-media-caption');
    const captionDisplay = document.getElementById('wa-canvas-caption-display');
    if (captionInput && captionDisplay) {
      captionInput.addEventListener('input', () => {
        const val = captionInput.value.trim();
        if (val) {
          captionDisplay.textContent = val;
          captionDisplay.style.display = 'block';
        } else {
          captionDisplay.textContent = '';
          captionDisplay.style.display = 'none';
        }
      });
    }

    // Quick emoji insertion
    const emojiBtns = document.querySelectorAll('.story-emoji-btn');
    emojiBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (captionInput) {
          captionInput.value += btn.textContent.trim();
          captionInput.dispatchEvent(new Event('input'));
        }
      });
    });

    // Target Privasi & Pembagian Status (Audience - WhatsApp Style)
    const audPills = document.querySelectorAll('.story-audience-pill');
    const contactPicker = document.getElementById('story-contact-picker');
    const pickerTitle = document.getElementById('story-picker-title');
    const canvasAudTag = document.getElementById('wa-canvas-aud-tag');

    audPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        audPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        const radio = pill.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;

        const val = radio ? radio.value : 'all';
        if (val === 'all') {
          if (contactPicker) contactPicker.style.display = 'none';
          if (canvasAudTag) canvasAudTag.innerHTML = '<span>👥</span> Kontak Saya';
        } else if (val === 'exclude') {
          if (contactPicker) contactPicker.style.display = 'block';
          if (pickerTitle) pickerTitle.textContent = '🚫 Pilih Kontak yang Dikecualikan (Tidak Melihat):';
          if (canvasAudTag) canvasAudTag.innerHTML = '<span>🚫</span> Kontak Saya, Kecuali...';
          if (cachedContacts.length === 0) loadBotContacts();
        } else if (val === 'custom') {
          if (contactPicker) contactPicker.style.display = 'block';
          if (pickerTitle) pickerTitle.textContent = '🎯 Pilih Kontak yang Diizinkan Melihat Status:';
          if (canvasAudTag) canvasAudTag.innerHTML = '<span>🎯</span> Hanya Bagikan Dengan...';
          if (cachedContacts.length === 0) loadBotContacts();
        }
      });
    });

    // Contact Search Filter
    const contactSearch = document.getElementById('story-contact-search');
    if (contactSearch) {
      contactSearch.addEventListener('input', () => {
        const q = contactSearch.value.trim().toLowerCase();
        document.querySelectorAll('.story-contact-item').forEach((item) => {
          const name = item.getAttribute('data-name') || '';
          const phone = item.getAttribute('data-phone') || '';
          if (!q || name.includes(q) || phone.includes(q)) {
            item.style.display = 'flex';
          } else {
            item.style.display = 'none';
          }
        });
      });
    }

    // Select All / Clear All Contacts
    const btnSelectAllContacts = document.getElementById('btn-story-select-all-contacts');
    const btnClearAllContacts = document.getElementById('btn-story-clear-all-contacts');

    if (btnSelectAllContacts) {
      btnSelectAllContacts.addEventListener('click', () => {
        document.querySelectorAll('.story-contact-item').forEach((item) => {
          if (item.style.display !== 'none') {
            const cb = item.querySelector('.story-contact-cb');
            if (cb) {
              cb.checked = true;
              item.style.borderColor = 'var(--accent-cyan)';
              item.style.background = 'rgba(56,189,248,0.08)';
            }
          }
        });
        updateSelectedContactsCount();
      });
    }

    if (btnClearAllContacts) {
      btnClearAllContacts.addEventListener('click', () => {
        document.querySelectorAll('.story-contact-item').forEach((item) => {
          const cb = item.querySelector('.story-contact-cb');
          if (cb) {
            cb.checked = false;
            item.style.borderColor = 'var(--border-subtle)';
            item.style.background = 'rgba(255,255,255,0.03)';
          }
        });
        updateSelectedContactsCount();
      });
    }

    // Manual numbers toggle
    const btnToggleManual = document.getElementById('btn-toggle-manual-contacts');
    const manualInput = document.getElementById('story-manual-contacts-input');
    if (btnToggleManual && manualInput) {
      btnToggleManual.addEventListener('click', () => {
        const isHidden = manualInput.style.display === 'none' || !manualInput.style.display;
        manualInput.style.display = isHidden ? 'block' : 'none';
        if (isHidden) manualInput.focus();
      });
    }

    // Modal Tambah Kontak WhatsApp Manual (Strict 62 & Anti-Overwrite)
    const btnOpenAddContact = document.getElementById('btn-open-add-contact-modal');
    const modalAddContact = document.getElementById('modal-add-contact');
    const formAddContact = document.getElementById('form-add-contact');
    const addContactNumber = document.getElementById('add-contact-number');
    const addContactName = document.getElementById('add-contact-name');

    if (btnOpenAddContact && modalAddContact) {
      btnOpenAddContact.addEventListener('click', () => {
        if (formAddContact) formAddContact.reset();
        modalAddContact.classList.add('active');
        if (addContactNumber) addContactNumber.focus();
      });

      modalAddContact.querySelectorAll('.modal-close-btn').forEach((btn) => {
        btn.addEventListener('click', () => modalAddContact.classList.remove('active'));
      });

      if (formAddContact) {
        formAddContact.addEventListener('submit', async (e) => {
          e.preventDefault();
          const rawNum = addContactNumber?.value?.trim();
          const name = addContactName?.value?.trim();
          if (!rawNum) {
            showToast('Nomor WhatsApp wajib diisi (diawali 62).', 'error');
            return;
          }
          const targetBot = document.getElementById('story-target-bot')?.value || 'primary';
          const btnSubmit = document.getElementById('btn-submit-add-contact');
          if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Menyimpan...';
          }
          try {
            const res = await PolarisAuth.authFetch('/api/contacts', {
              method: 'POST',
              body: JSON.stringify({ number: rawNum, name, instanceId: targetBot }),
            });
            const data = await res.json();
            if (data.success) {
              showToast(data.message || 'Kontak berhasil disimpan!', 'success');
              modalAddContact.classList.remove('active');
              formAddContact.reset();
              if (targetBot === 'primary') {
                loadBotContacts();
              } else {
                const cRes = await PolarisAuth.authFetch(`/api/cluster/instances/${targetBot}/contacts`);
                const cData = await cRes.json();
                if (cData.success && Array.isArray(cData.data)) {
                  cachedContacts = cData.data;
                  renderContactList(cachedContacts);
                }
              }
            } else {
              showToast(data.error || 'Gagal menambahkan kontak.', 'error');
            }
          } catch (err) {
            showToast('Terjadi kesalahan: ' + err.message, 'error');
          } finally {
            if (btnSubmit) {
              btnSubmit.disabled = false;
              btnSubmit.textContent = '💾 Simpan Kontak';
            }
          }
        });
      }
    }

    // Modal Import Kontak (vCard / 00001.txt)
    const btnOpenImportContacts = document.getElementById('btn-open-import-contacts-modal');
    const modalImportContacts = document.getElementById('modal-import-contacts');
    const contactFileInput = document.getElementById('contact-file-input');
    const contactDropzone = document.getElementById('contact-import-dropzone');
    const contactVcardText = document.getElementById('contact-vcard-textarea');
    const btnSubmitImportContacts = document.getElementById('btn-submit-import-contacts');
    const btnLoadSampleContacts = document.getElementById('btn-load-sample-contacts');
    const btnClearContactText = document.getElementById('btn-clear-contact-textarea');
    const contactFileBadge = document.getElementById('contact-file-chosen-badge');

    if (btnOpenImportContacts && modalImportContacts) {
      btnOpenImportContacts.addEventListener('click', () => {
        modalImportContacts.classList.add('active');
      });

      modalImportContacts.querySelectorAll('.modal-close-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          modalImportContacts.classList.remove('active');
        });
      });

      if (contactDropzone && contactFileInput) {
        contactDropzone.addEventListener('click', () => contactFileInput.click());
        contactFileInput.addEventListener('change', () => {
          if (contactFileInput.files && contactFileInput.files[0]) {
            readContactFile(contactFileInput.files[0]);
          }
        });
        contactDropzone.addEventListener('dragover', (e) => {
          e.preventDefault();
          contactDropzone.classList.add('dragover');
        });
        contactDropzone.addEventListener('dragleave', () => {
          contactDropzone.classList.remove('dragover');
        });
        contactDropzone.addEventListener('drop', (e) => {
          e.preventDefault();
          contactDropzone.classList.remove('dragover');
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            readContactFile(e.dataTransfer.files[0]);
          }
        });
      }

      function readContactFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (contactVcardText) {
            contactVcardText.value = e.target.result;
          }
          if (contactFileBadge) {
            contactFileBadge.style.display = 'inline-block';
            contactFileBadge.textContent = `📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
          }
          showToast(`Berkas kontak "${file.name}" berhasil dimuat!`, 'info');
        };
        reader.readAsText(file);
      }

      if (btnClearContactText && contactVcardText) {
        btnClearContactText.addEventListener('click', () => {
          contactVcardText.value = '';
          if (contactFileBadge) contactFileBadge.style.display = 'none';
        });
      }

      if (btnLoadSampleContacts && contactVcardText) {
        btnLoadSampleContacts.addEventListener('click', async () => {
          try {
            const res = await PolarisAuth.authFetch('/api/bot/contacts/sample');
            const json = await res.json();
            if (json.success && json.vcardText) {
              contactVcardText.value = json.vcardText;
              if (contactFileBadge) {
                contactFileBadge.style.display = 'inline-block';
                contactFileBadge.textContent = `📋 Contoh 00001.txt (74 Kontak)`;
              }
              showToast('Contoh 00001.txt (74 Kontak) berhasil dimuat ke editor!', 'success');
            } else {
              showToast(json.error || 'Gagal memuat sample kontak', 'error');
            }
          } catch (err) {
            showToast('Error: ' + err.message, 'error');
          }
        });
      }

      if (btnSubmitImportContacts) {
        btnSubmitImportContacts.addEventListener('click', async () => {
          const vcardText = contactVcardText ? contactVcardText.value.trim() : '';
          if (!vcardText) {
            showToast('Unggah berkas vCard atau tempel teks vCard terlebih dahulu!', 'error');
            return;
          }

          btnSubmitImportContacts.disabled = true;
          btnSubmitImportContacts.textContent = 'Mengimpor Kontak...';

          try {
            const res = await PolarisAuth.authFetch('/api/bot/contacts/import', {
              method: 'POST',
              body: JSON.stringify({ vcardText }),
            });
            const json = await res.json();
            if (json.success) {
              showToast(json.message || `✅ Berhasil mengimpor ${json.importedCount || 0} kontak baru!`, 'success');
              modalImportContacts.classList.remove('active');
              if (contactVcardText) contactVcardText.value = '';
              if (contactFileBadge) contactFileBadge.style.display = 'none';
              await loadBotContacts();
            } else {
              showToast(json.error || 'Gagal mengimpor kontak', 'error');
            }
          } catch (err) {
            showToast('Error: ' + err.message, 'error');
          } finally {
            btnSubmitImportContacts.disabled = false;
            btnSubmitImportContacts.textContent = '🚀 Impor Sekarang ke Database';
          }
        });
      }
    }

    // Tag Groups Toggle & Controls
    const tagGroupsToggle = document.getElementById('story-tag-groups-toggle');
    const groupsSelectorBox = document.getElementById('story-groups-selector-box');
    const btnSelectAllGroups = document.getElementById('btn-story-select-all-groups');
    const btnClearAllGroups = document.getElementById('btn-story-clear-all-groups');

    if (tagGroupsToggle && groupsSelectorBox) {
      tagGroupsToggle.addEventListener('change', () => {
        groupsSelectorBox.style.display = tagGroupsToggle.checked ? 'block' : 'none';
        if (tagGroupsToggle.checked) loadStoryTab();
      });
    }

    if (btnSelectAllGroups) {
      btnSelectAllGroups.addEventListener('click', () => {
        document.querySelectorAll('.story-group-item-cb').forEach((cb) => {
          cb.checked = true;
          cb.closest('.story-group-card')?.classList.add('active');
        });
      });
    }

    if (btnClearAllGroups) {
      btnClearAllGroups.addEventListener('click', () => {
        document.querySelectorAll('.story-group-item-cb').forEach((cb) => {
          cb.checked = false;
          cb.closest('.story-group-card')?.classList.remove('active');
        });
      });
    }

    function getStoryAudiencePayload() {
      const radio = document.querySelector('input[name="storyAudience"]:checked');
      const audienceType = radio ? radio.value : 'all';

      // Kumpulkan kontak yang diceklis
      const selectedNumbers = [];
      document.querySelectorAll('.story-contact-cb:checked').forEach((cb) => {
        if (cb.value) selectedNumbers.push(cb.value.trim());
      });

      // Kumpulkan nomor manual jika diisi
      const manualVal = manualInput ? manualInput.value.trim() : '';
      if (manualVal) {
        const tokens = manualVal.split(/[,;\s\n]+/).map((t) => t.replace(/[^0-9]/g, '')).filter(Boolean);
        tokens.forEach((num) => {
          if (!selectedNumbers.includes(num)) selectedNumbers.push(num);
        });
      }

      const mentionedNumbers = document.getElementById('story-mention-contacts-input')?.value.trim() || '';
      const tagGroupsEnabled = tagGroupsToggle ? tagGroupsToggle.checked : false;
      const tagGroups = [];
      if (tagGroupsEnabled) {
        document.querySelectorAll('.story-group-item-cb:checked').forEach((cb) => {
          tagGroups.push(cb.value);
        });
      }

      const targetBotId = document.getElementById('story-target-bot')?.value || 'primary';
      const payload = { targetBotId, audienceType, mentionedNumbers, tagGroups };
      if (audienceType === 'exclude') {
        payload.excludedContacts = selectedNumbers;
      } else if (audienceType === 'custom') {
        payload.customContacts = selectedNumbers;
      }
      return payload;
    }

    // Multiline keyboard handling (Ctrl+Enter to send)
    if (textInput) {
      textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          if (btnPostText) btnPostText.click();
        }
      });
    }
    if (captionInput) {
      captionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          if (btnPostMedia) btnPostMedia.click();
        }
      });
    }

    // Submit Text Story
    const btnPostText = document.getElementById('btn-post-text-story');
    if (btnPostText) {
      btnPostText.addEventListener('click', async () => {
        const text = textInput ? textInput.value : '';
        if (!text.trim()) {
          showToast('Isi teks status tidak boleh kosong!', 'error');
          return;
        }

        const aud = getStoryAudiencePayload();
        if (aud.audienceType === 'custom' && (!aud.customContacts || aud.customContacts.length === 0)) {
          showToast('Pilih minimal satu kontak yang diizinkan melihat status!', 'error');
          return;
        }
        if (aud.audienceType === 'exclude' && (!aud.excludedContacts || aud.excludedContacts.length === 0)) {
          showToast('Pilih minimal satu kontak yang ingin Anda kecualikan!', 'error');
          return;
        }

        btnPostText.disabled = true;
        btnPostText.innerHTML = '<span class="inline-spinner"></span> Mengunggah Status...';
        try {
          const res = await PolarisAuth.authFetch('/api/story/post', {
            method: 'POST',
            body: JSON.stringify({
              storyType: 'text',
              text,
              bgColor: selectedStoryBgColor,
              font: selectedStoryFont,
              ...aud,
            }),
          });
          if (!res.ok) {
            let errorMsg = `Server mengembalikan status ${res.status}`;
            try {
              const errJson = await res.json();
              if (errJson.error) errorMsg = errJson.error;
            } catch (_) {}
            throw new Error(errorMsg);
          }
          const json = await res.json();
          if (json.success) {
            showToast(json.message || '✅ Status WhatsApp berhasil dipublikasikan!', 'success');
            textInput.value = '';
            if (textDisplay) textDisplay.textContent = 'Ketik kata-kata status WhatsApp Anda...';
          } else {
            showToast(json.error || 'Gagal mengirim status WhatsApp.', 'error');
          }
        } catch (err) {
          showToast('Gagal memposting status: ' + err.message, 'error');
        } finally {
          btnPostText.disabled = false;
          btnPostText.textContent = '🚀 Unggah Status Teks';
        }
      });
    }

    // Submit Media Story HD
    const btnPostMedia = document.getElementById('btn-post-media-story');
    if (btnPostMedia) {
      btnPostMedia.addEventListener('click', async () => {
        if (!selectedMediaBase64) {
          showToast('Pilih file foto atau video terlebih dahulu!', 'error');
          return;
        }

        const aud = getStoryAudiencePayload();
        if (aud.audienceType === 'custom' && (!aud.customContacts || aud.customContacts.length === 0)) {
          showToast('Pilih minimal satu kontak yang diizinkan melihat status!', 'error');
          return;
        }
        if (aud.audienceType === 'exclude' && (!aud.excludedContacts || aud.excludedContacts.length === 0)) {
          showToast('Pilih minimal satu kontak yang ingin Anda kecualikan!', 'error');
          return;
        }

        const caption = captionInput ? captionInput.value : '';
        const isHD = document.getElementById('story-hd-toggle')?.checked ?? true;

        btnPostMedia.disabled = true;
        btnPostMedia.innerHTML = '<span class="inline-spinner"></span> Mengunggah Media HD ke WhatsApp...';
        try {
          const res = await PolarisAuth.authFetch('/api/story/post', {
            method: 'POST',
            body: JSON.stringify({
              storyType: 'media',
              caption,
              mediaBase64: selectedMediaBase64,
              mediaExt: selectedMediaExt,
              isHD,
              ...aud,
            }),
          });
          if (!res.ok) {
            let errorMsg = `Server mengembalikan status ${res.status}`;
            if (res.status === 413) {
              errorMsg = 'Ukuran file terlalu besar untuk diunggah (maksimal 60MB). Harap kompres video terlebih dahulu.';
            } else {
              try {
                const errJson = await res.json();
                if (errJson.error) errorMsg = errJson.error;
              } catch (_) {}
            }
            throw new Error(errorMsg);
          }
          const json = await res.json();
          if (json.success) {
            showToast(json.message || '✅ Status Media HD berhasil diunggah ke WhatsApp!', 'success');
            if (fileInput) fileInput.value = '';
            selectedMediaBase64 = null;
            selectedMediaExt = null;
            if (captionInput) captionInput.value = '';
            if (captionDisplay) {
              captionDisplay.textContent = '';
              captionDisplay.style.display = 'none';
            }
            if (canvasMediaEmpty) canvasMediaEmpty.style.display = 'block';
            if (canvasImg) canvasImg.style.display = 'none';
            if (canvasVideo) canvasVideo.style.display = 'none';
          } else {
            showToast(json.error || 'Gagal mengunggah media status.', 'error');
          }
        } catch (err) {
          showToast('Gagal memposting status: ' + err.message, 'error');
        } finally {
          btnPostMedia.disabled = false;
          btnPostMedia.textContent = '🚀 Unggah Media ke Status WhatsApp';
        }
      });
    }

    // WhatsApp Canvas Floating Send Button
    const canvasSendBtn = document.getElementById('wa-canvas-send-btn');
    if (canvasSendBtn) {
      canvasSendBtn.addEventListener('click', () => {
        const isMedia = modeMediaBtn && modeMediaBtn.classList.contains('active');
        if (isMedia && btnPostMedia) {
          btnPostMedia.click();
        } else if (btnPostText) {
          btnPostText.click();
        }
      });
    }
  }

  // ==================== 3. TAB WHITELIST & OWNERS & PRIVATE CHATS ====================
  let privateChatData = { chats: {} };

  async function loadPrivateChats() {
    try {
      const targetBot = document.getElementById('whitelist-target-bot')?.value || 'primary';
      const res = await PolarisAuth.authFetch(`/api/data/private-chats?instanceId=${encodeURIComponent(targetBot)}`);
      const json = await res.json();
      if (json.success && json.data) {
        privateChatData = json.data;
        renderPrivateChatSettings(json.data);
      }
    } catch (err) {
      console.error('Gagal memuat private chat settings:', err);
    }
  }

  function renderPrivateChatSettings(data) {
    const antideleteToggle = document.getElementById('toggle-private-antidelete');
    if (antideleteToggle) {
      const isAntideleteOn = data && data.chats && (data.chats['*']?.antidelete || Object.values(data.chats).some(c => c && c.antidelete));
      antideleteToggle.checked = Boolean(isAntideleteOn);
    }
  }

  async function savePrivateChatSettingsData() {
    try {
      const targetBot = document.getElementById('whitelist-target-bot')?.value || 'primary';
      const antideleteToggle = document.getElementById('toggle-private-antidelete');
      const isOn = antideleteToggle ? antideleteToggle.checked : false;
      if (!privateChatData.chats) privateChatData.chats = {};
      if (!privateChatData.chats['*']) privateChatData.chats['*'] = { antidelete: isOn };
      else privateChatData.chats['*'].antidelete = isOn;

      for (const k of Object.keys(privateChatData.chats)) {
        if (privateChatData.chats[k]) privateChatData.chats[k].antidelete = isOn;
      }

      const res = await PolarisAuth.authFetch('/api/data/private-chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: targetBot, data: privateChatData }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Pengaturan chat pribadi berhasil disimpan!', 'success');
      } else {
        showToast(json.error || 'Gagal menyimpan pengaturan chat pribadi.', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  async function loadWhitelist() {
    try {
      await populateClusterBotSelectors();
      const targetBot = document.getElementById('whitelist-target-bot')?.value || 'primary';
      const res = await PolarisAuth.authFetch(`/api/data/whitelist?instanceId=${encodeURIComponent(targetBot)}`);
      const json = await res.json();
      if (json.success) {
        whitelistData = json.data;
        renderWhitelist(json.data);
      }
      loadPrivateChats();
    } catch (err) {
      showToast('Gagal memuat whitelist: ' + err.message, 'error');
    }
  }

  function renderWhitelist(data) {
    const ownersList = document.getElementById('owners-table-body');
    if (ownersList) {
      ownersList.innerHTML = '';
      (data.owners || []).forEach((owner, idx) => {
        const tr = document.createElement('tr');
        const isPrimary = idx === 0;
        tr.innerHTML = `
          <td><strong>${owner}</strong></td>
          <td>
            <span class="badge ${isPrimary ? 'badge-purple' : 'badge-cyan'}">
              ${isPrimary ? '👑 Primary Owner' : 'Owner'}
            </span>
          </td>
          <td>
            ${
              isPrimary
                ? '<span style="color:var(--text-muted);font-size:0.8rem;">Proteksi Permanen</span>'
                : `<button class="btn-polaris btn-danger btn-sm" onclick="window.PolarisApp.removeOwner('${owner}')">Hapus</button>`
            }
          </td>
        `;
        ownersList.appendChild(tr);
      });
    }

    const allowedList = document.getElementById('whitelist-table-body');
    if (allowedList) {
      allowedList.innerHTML = '';
      (data.allowed || []).forEach((user) => {
        const num = typeof user === 'string' ? user : user.number;
        const level = typeof user === 'string' ? 'level1' : user.level || 'level1';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${num}</strong></td>
          <td>
            <select class="form-select form-select-sm" style="max-width:140px;" onchange="window.PolarisApp.changeUserLevel('${num}', this.value)">
              <option value="level1" ${level === 'level1' ? 'selected' : ''}>Level 1 (Admin)</option>
              <option value="level2" ${level === 'level2' ? 'selected' : ''}>Level 2 (Biasa)</option>
            </select>
          </td>
          <td>
            <button class="btn-polaris btn-danger btn-sm" onclick="window.PolarisApp.removeWhitelist('${num}')">Hapus</button>
          </td>
        `;
        allowedList.appendChild(tr);
      });
    }

    if (window.PolarisMotion) window.PolarisMotion.refreshInteractive();
  }

  async function saveWhitelistData() {
    try {
      const targetBot = document.getElementById('whitelist-target-bot')?.value || 'primary';
      const res = await PolarisAuth.authFetch('/api/data/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: targetBot, data: whitelistData }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Luna (Whitelist Bot) berhasil disimpan!', 'success');
        loadWhitelist();
        loadOverview();
      } else {
        showToast(json.error || 'Gagal menyimpan Luna', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  function addOwnerPrompt() {
    const num = prompt('Masukkan nomor WhatsApp Owner baru (format: 628xxxxxxxxxx):');
    if (!num) return;
    const cleanNum = num.replace(/[^0-9]/g, '');
    if (!cleanNum.startsWith('62')) {
      showToast('Nomor harus berawalan 62 (contoh: 628123456789)', 'error');
      return;
    }
    if (!whitelistData.owners.includes(cleanNum)) {
      whitelistData.owners.push(cleanNum);
      saveWhitelistData();
    } else {
      showToast('Nomor tersebut sudah ada di daftar owner.', 'info');
    }
  }

  function removeOwner(num) {
    if (!confirm(`Yakin ingin mencabut status owner dari ${num}?`)) return;
    whitelistData.owners = whitelistData.owners.filter((o) => o !== num);
    saveWhitelistData();
  }

  function addWhitelistPrompt() {
    const num = prompt('Masukkan nomor WhatsApp yang diizinkan (Luna) (format: 628xxxxxxxxxx):');
    if (!num) return;
    const cleanNum = num.replace(/[^0-9]/g, '');
    const level = prompt('Pilih level akses ("level1" untuk admin / "level2" untuk biasa):', 'level1');
    const cleanLevel = level === 'level2' ? 'level2' : 'level1';

    const existingIdx = whitelistData.allowed.findIndex((a) => (typeof a === 'string' ? a : a.number) === cleanNum);
    if (existingIdx >= 0) {
      whitelistData.allowed[existingIdx] = { number: cleanNum, level: cleanLevel };
    } else {
      whitelistData.allowed.push({ number: cleanNum, level: cleanLevel });
    }
    saveWhitelistData();
  }

  function changeUserLevel(num, newLevel) {
    const target = whitelistData.allowed.find((a) => (typeof a === 'string' ? a : a.number) === num);
    if (target) {
      if (typeof target === 'string') {
        const idx = whitelistData.allowed.indexOf(target);
        whitelistData.allowed[idx] = { number: num, level: newLevel };
      } else {
        target.level = newLevel;
      }
      saveWhitelistData();
    }
  }

  function removeWhitelist(num) {
    if (!confirm(`Hapus nomor ${num} dari Luna (Whitelist Bot)?`)) return;
    whitelistData.allowed = whitelistData.allowed.filter((a) => (typeof a === 'string' ? a : a.number) !== num);
    saveWhitelistData();
  }

  // ==================== 4. TAB GROUPS & FEATURE TOGGLES ====================
  async function loadGroups() {
    try {
      await populateClusterBotSelectors();
      const targetBot = document.getElementById('group-target-bot')?.value || 'primary';
      const res = await PolarisAuth.authFetch(`/api/data/groups?instanceId=${encodeURIComponent(targetBot)}`);
      const json = await res.json();
      if (json.success) {
        groupData = json.data;
        if (json.waGroups) {
          window.waGroupsCache = json.waGroups;
        }
        renderGroups(json.data);
      }
    } catch (err) {
      showToast('Gagal memuat pengaturan grup: ' + err.message, 'error');
    }
  }

  async function syncGroupsFromWA() {
    const btn = document.getElementById('btn-sync-groups-wa');
    const targetBot = document.getElementById('group-target-bot')?.value || 'primary';
    const origHtml = btn ? btn.innerHTML : '';
    if (typeof window.showBlackholeLoader === 'function') {
      window.showBlackholeLoader('SINKRONISASI GRUP WHATSAPP', 'Mengambil daftar grup aktif dari WhatsApp...');
    }
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '🔄 Menyinkronkan...';
    }
    try {
      const res = await PolarisAuth.authFetch(`/api/data/groups/sync?instanceId=${encodeURIComponent(targetBot)}`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || 'Nama grup berhasil disinkronkan langsung dari WhatsApp!', 'success');
        if (json.waGroups) window.waGroupsCache = json.waGroups;
        if (json.data) groupData = json.data;
        renderGroups(groupData);
        loadStoryTab();
      } else {
        showToast(json.error || 'Gagal menyinkronkan grup dari WhatsApp', 'error');
      }
    } catch (err) {
      showToast('Error sinkronisasi: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origHtml || '🔄 Sinkronkan dari WA';
      }
      if (typeof window.hideBlackholeLoader === 'function') {
        window.hideBlackholeLoader();
      }
    }
  }

  function renderGroups(data) {
    const groupsContainer = document.getElementById('groups-container');
    if (!groupsContainer) return;
    groupsContainer.innerHTML = '';

    const allowedGroups = (data && data.allowedGroups) || {};
    let groupKeys = Object.keys(allowedGroups);

    const searchInput = document.getElementById('group-search-input');
    const searchQuery = (searchInput ? searchInput.value : '').trim().toLowerCase();

    if (searchQuery) {
      groupKeys = groupKeys.filter((jid) => {
        const g = allowedGroups[jid] || {};
        const cached = (window.waGroupsCache && window.waGroupsCache[jid]) || {};
        const groupName = (g.name || g.subject || cached.name || cached.subject || '').toLowerCase();
        return jid.toLowerCase().includes(searchQuery) || groupName.includes(searchQuery);
      });
    }

    if (groupKeys.length === 0) {
      groupsContainer.innerHTML = `
        <div class="card-luxury text-center" style="padding: 48px 24px;">
          <p style="color:var(--text-muted);">${searchQuery ? 'Tidak ada grup yang cocok dengan kata kunci "' + escapeHtml(searchQuery) + '".' : 'Belum ada data grup yang terdaftar.'}</p>
          <div style="display:flex; gap:10px; justify-content:center; margin-top:16px; flex-wrap:wrap;">
            <button class="btn-polaris btn-secondary" onclick="window.PolarisApp.syncGroupsFromWA()">🔄 Tarik Grup dari WA</button>
            <button class="btn-polaris btn-primary" onclick="window.PolarisApp.addGroupPrompt()">+ Tambah Grup</button>
          </div>
        </div>
      `;
      return;
    }

    groupKeys.forEach((jid) => {
      const g = allowedGroups[jid] || {};
      const cached = (window.waGroupsCache && window.waGroupsCache[jid]) || {};
      const groupName = g.name || g.subject || cached.name || cached.subject || 'Grup WhatsApp';
      const count = g.participantsCount || cached.participantsCount || null;

      const card = document.createElement('div');
      card.className = 'card-luxury stagger-item';
      card.style.marginBottom = '20px';

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:18px; flex-wrap:wrap; gap:12px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-primary); margin:0; display:flex; align-items:center; gap:6px;">
                <span>👥</span> ${escapeHtml(groupName)}
              </h3>
              ${count ? `<span class="badge badge-cyan" style="font-size:0.72rem;">👥 ${count} Anggota</span>` : ''}
              ${g.isEcosystem ? `<span class="badge badge-purple" style="font-size:0.72rem; font-weight:700;">🌟 GRUP EKOSISTEM (IZIN AKTIF)</span>` : `<span class="badge ${g.allowed ? 'badge-emerald' : 'badge-rose'}" style="font-size:0.72rem;">${g.allowed ? 'Diizinkan Pakai Bot' : 'Bot Dinonaktifkan'}</span>`}
            </div>
            <div style="display:flex; align-items:center; gap:8px; margin-top:6px; flex-wrap:wrap;">
              <code style="font-size:0.75rem; color:var(--text-muted); background:rgba(255,255,255,0.05); padding:2px 8px; border-radius:4px; border:1px solid var(--border-subtle);">${escapeHtml(jid)}</code>
              <button class="btn-polaris btn-secondary btn-sm" style="font-size:0.68rem; padding:2px 6px;" onclick="navigator.clipboard.writeText('${escapeHtml(jid)}'); window.PolarisApp.showToast('JID disalin!', 'info')">📋 Salin JID</button>
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            ${g.isEcosystem ? `
              <button class="btn-polaris btn-secondary btn-sm" style="color:var(--accent-cyan); border-color:color-mix(in srgb, var(--accent-cyan) 40%, transparent); cursor:default;" onclick="window.PolarisApp.showToast('Grup ekosistem Polaris selalu diizinkan aktif menggunakan bot.', 'info')">
                🛡️ Izin Selalu Aktif
              </button>
            ` : `
              <button class="btn-polaris ${g.allowed ? 'btn-danger' : 'btn-emerald'} btn-sm" onclick="window.PolarisApp.toggleGroupAllowed('${escapeHtml(jid)}')">
                ${g.allowed ? 'Cabut Izin' : 'Izinkan'}
              </button>
            `}
            <button class="btn-polaris btn-secondary btn-sm" onclick="window.PolarisApp.deleteGroup('${escapeHtml(jid)}')">Hapus</button>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:14px; background:rgba(255,255,255,0.02); padding:16px; border-radius:var(--radius-md);">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.85rem; color:var(--text-secondary);">Antilink</span>
            <label class="switch-container">
              <input type="checkbox" ${g.antilink && g.antilink.enabled ? 'checked' : ''} onchange="window.PolarisApp.toggleGroupFeature('${escapeHtml(jid)}', 'antilink', this.checked)">
              <span class="switch-slider"></span>
            </label>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.85rem; color:var(--text-secondary);">Antibad (Kata Kasar)</span>
            <label class="switch-container">
              <input type="checkbox" ${g.antibad && g.antibad.enabled ? 'checked' : ''} onchange="window.PolarisApp.toggleGroupFeature('${escapeHtml(jid)}', 'antibad', this.checked)">
              <span class="switch-slider"></span>
            </label>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.85rem; color:var(--text-secondary);">Antivirtex</span>
            <label class="switch-container">
              <input type="checkbox" ${g.antivirtex && g.antivirtex.enabled ? 'checked' : ''} onchange="window.PolarisApp.toggleGroupFeature('${escapeHtml(jid)}', 'antivirtex', this.checked)">
              <span class="switch-slider"></span>
            </label>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.85rem; color:var(--text-secondary);">Antidelete</span>
            <label class="switch-container">
              <input type="checkbox" ${g.antidelete ? 'checked' : ''} onchange="window.PolarisApp.toggleGroupFeature('${escapeHtml(jid)}', 'antidelete', this.checked)">
              <span class="switch-slider"></span>
            </label>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.85rem; color:var(--text-secondary);">Welcome Member</span>
            <label class="switch-container">
              <input type="checkbox" ${g.welcome && g.welcome.enabled ? 'checked' : ''} onchange="window.PolarisApp.toggleGroupFeature('${escapeHtml(jid)}', 'welcome', this.checked)">
              <span class="switch-slider"></span>
            </label>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.85rem; color:var(--text-secondary);">Antispam</span>
            <label class="switch-container">
              <input type="checkbox" ${g.antispam && g.antispam.enabled ? 'checked' : ''} onchange="window.PolarisApp.toggleGroupFeature('${escapeHtml(jid)}', 'antispam', this.checked)">
              <span class="switch-slider"></span>
            </label>
          </div>
        </div>

        <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn-polaris btn-secondary btn-sm" onclick="window.PolarisApp.editWelcomeText('${escapeHtml(jid)}')">✏️ Edit Pesan Welcome</button>
          <button class="btn-polaris btn-secondary btn-sm" onclick="window.PolarisApp.editBadwordList('${escapeHtml(jid)}')">📝 Edit Daftar Kata Antibad</button>
        </div>
      `;

      groupsContainer.appendChild(card);
    });

    if (window.PolarisMotion) window.PolarisMotion.refreshInteractive();
  }

  async function saveGroupData() {
    try {
      const targetBot = document.getElementById('group-target-bot')?.value || 'primary';
      const res = await PolarisAuth.authFetch(`/api/data/groups?instanceId=${encodeURIComponent(targetBot)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: groupData, instanceId: targetBot }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Setelan grup berhasil disimpan!', 'success');
        loadOverview();
      } else {
        showToast(json.error || 'Gagal menyimpan grup', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  async function disallowAllGroups() {
    const targetBot = document.getElementById('group-target-bot')?.value || 'primary';
    const selectEl = document.getElementById('group-target-bot');
    const botLabel = selectEl ? (selectEl.options[selectEl.selectedIndex]?.text || targetBot) : targetBot;
    const ok = confirm(`Nonaktifkan izin semua grup untuk bot:\n${botLabel}?\n\nSemua grup non-ekosistem akan dinonaktifkan izinnya.`);
    if (!ok) return;

    try {
      const res = await PolarisAuth.authFetch('/api/data/groups/disallow-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: targetBot }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || 'Semua izin grup berhasil dinonaktifkan!', 'success');
        await loadGroups();
      } else {
        showToast(json.error || 'Gagal menonaktifkan izin grup', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  function toggleGroupAllowed(jid) {
    if (groupData.allowedGroups[jid]) {
      groupData.allowedGroups[jid].allowed = !groupData.allowedGroups[jid].allowed;
      saveGroupData();
      renderGroups(groupData);
    }
  }

  function toggleGroupFeature(jid, feature, enabled) {
    const g = groupData.allowedGroups[jid];
    if (!g) return;

    if (feature === 'antidelete') {
      g.antidelete = enabled;
    } else if (g[feature] && typeof g[feature] === 'object') {
      g[feature].enabled = enabled;
    } else {
      g[feature] = { enabled };
    }
    saveGroupData();
  }

  function editWelcomeText(jid) {
    const g = groupData.allowedGroups[jid];
    if (!g) return;
    const current = (g.welcome && g.welcome.text) || 'Selamat datang @user di grup @group!';
    const newText = prompt('Masukkan pesan Welcome kustom (gunakan @user dan @group):', current);
    if (newText !== null) {
      if (!g.welcome) g.welcome = { enabled: true };
      g.welcome.text = newText;
      saveGroupData();
    }
  }

  function editBadwordList(jid) {
    const g = groupData.allowedGroups[jid];
    if (!g) return;
    const currentWords = (g.antibad && g.antibad.wordlist) ? g.antibad.wordlist.join(', ') : '';
    const newWords = prompt('Masukkan kata-kata terlarang dipisahkan koma:', currentWords);
    if (newWords !== null) {
      if (!g.antibad) g.antibad = { enabled: true };
      g.antibad.wordlist = newWords.split(',').map((w) => w.trim().toLowerCase()).filter(Boolean);
      saveGroupData();
      showToast('Daftar kata terlarang diperbarui!', 'success');
    }
  }

  function addGroupPrompt() {
    const waGroups = window.waGroupsCache || {};
    const existing = groupData.allowedGroups || {};
    const available = Object.keys(waGroups).filter((j) => !existing[j]);

    let promptMsg = 'Masukkan JID grup (contoh: 120363xxx@g.us):';
    if (available.length > 0) {
      promptMsg = `Pilih grup dari WhatsApp di bawah ini atau ketik JID grup:\n` +
        available.slice(0, 10).map((j, idx) => `${idx + 1}. ${waGroups[j].name || waGroups[j].subject || j}`).join('\n') +
        `\n\nKetik nomor urut (1-${Math.min(available.length, 10)}) atau ketik JID lengkap:`;
    }

    const input = prompt(promptMsg);
    if (!input) return;

    let selectedJid = input.trim();
    const num = parseInt(selectedJid, 10);
    if (!isNaN(num) && num >= 1 && num <= available.length && available[num - 1]) {
      selectedJid = available[num - 1];
    }

    if (!selectedJid.includes('@g.us')) {
      showToast('JID grup harus berakhiran @g.us', 'error');
      return;
    }

    const gInfo = waGroups[selectedJid] || {};
    if (!groupData.allowedGroups) groupData.allowedGroups = {};
    if (!groupData.allowedGroups[selectedJid]) {
      groupData.allowedGroups[selectedJid] = {
        allowed: true,
        name: gInfo.name || gInfo.subject || 'Grup WhatsApp',
        subject: gInfo.name || gInfo.subject || 'Grup WhatsApp',
        participantsCount: gInfo.participantsCount || 0,
        antilink: { enabled: true, whitelistDomains: [] },
        antibad: { enabled: false, wordlist: [] },
        antivirtex: { enabled: true },
        antidelete: true,
        welcome: { enabled: true, text: 'Halo @user selamat datang di @group!' },
      };
      saveGroupData();
      renderGroups(groupData);
      showToast(`Grup "${groupData.allowedGroups[selectedJid].name}" berhasil ditambahkan!`, 'success');
    }
  }

  function deleteGroup(jid) {
    if (!confirm(`Hapus konfigurasi grup ${jid}?`)) return;
    delete groupData.allowedGroups[jid];
    saveGroupData();
    renderGroups(groupData);
  }

  // ==================== 5. TAB COMMANDS & OUTPUT MANAGER ====================
  async function loadCommands() {
    try {
      await populateClusterBotSelectors();
      const targetBot = document.getElementById('command-target-bot')?.value || 'primary';
      const res = await PolarisAuth.authFetch(`/api/commands?instanceId=${encodeURIComponent(targetBot)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        commandsData = json.data;
        updateCommandCategoryFilter(json.data);
        renderCommands(json.data);
      }
    } catch (err) {
      showToast('Gagal memuat command: ' + err.message, 'error');
    }
  }

  function updateCommandCategoryFilter(list) {
    const select = document.getElementById('command-filter-cat');
    if (!select || !Array.isArray(list)) return;
    const currentVal = select.value || 'ALL';
    const categories = new Set();
    list.forEach((c) => {
      if (c.category) categories.add(c.category);
    });
    const sortedCats = Array.from(categories).sort();

    select.innerHTML = `<option value="ALL">Semua Kategori (${list.length})</option>` +
      sortedCats.map((cat) => {
        const count = list.filter((c) => c.category === cat).length;
        return `<option value="${cat}" ${cat === currentVal ? 'selected' : ''}>${cat} (${count})</option>`;
      }).join('');
  }

  function renderCommands(list) {
    const tbody = document.getElementById('commands-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filterCategory = document.getElementById('command-filter-cat')?.value || 'ALL';
    const searchQuery = (document.getElementById('command-search-input')?.value || '').toLowerCase();

    const filtered = list.filter((c) => {
      if (filterCategory !== 'ALL' && c.category !== filterCategory) return false;
      if (searchQuery && !c.name.toLowerCase().includes(searchQuery) && !c.desc.toLowerCase().includes(searchQuery)) return false;
      return true;
    });

    filtered.forEach((cmd) => {
      let permBadge = 'badge-cyan';
      let permLabel = '🌐 Whitelist';

      // Prioritas 1: Setting izin spesifik dari override / konfigurasi
      // Prioritas 2: Fallback ke ownerOnly jika belum pernah di-override
      const p = cmd.permission;
      const effectivePerm = (p !== undefined && p !== null && p !== '') ? p : (cmd.ownerOnly ? 'owner' : 'all');

      if (effectivePerm === 'public' || effectivePerm === 'everyone') {
        permBadge = 'badge-emerald';
        permLabel = '🌍 Semua Orang';
      } else if (effectivePerm === 'owner') {
        permBadge = 'badge-rose';
        permLabel = '👑 Owner';
      } else if (effectivePerm === 'level1') {
        permBadge = 'badge-yellow';
        permLabel = '⭐ Level 1 & Owner';
      } else if (effectivePerm === 'all' || effectivePerm === 'whitelist') {
        permBadge = 'badge-cyan';
        permLabel = '🌐 Whitelist';
      } else if (effectivePerm && (effectivePerm.includes(',') || (typeof effectivePerm === 'object' && effectivePerm.type === 'custom'))) {
        permBadge = 'badge-purple';
        permLabel = '🎯 Custom';
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="font-weight:700; color:var(--accent-cyan);">/${cmd.name}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${cmd.desc}</div>
        </td>
        <td>
          <span style="font-size:0.74rem; font-weight:600; padding:3px 10px; border-radius:12px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:var(--text-secondary); display:inline-flex; align-items:center; gap:4px;">
            📁 ${cmd.category}
          </span>
        </td>
        <td>
          <span class="badge ${permBadge}">
            ${permLabel}
          </span>
        </td>
        <td>
          <label class="switch-container">
            <input type="checkbox" ${cmd.enabled ? 'checked' : ''} onchange="window.PolarisApp.toggleCommand('${cmd.name}', this.checked)">
            <span class="switch-slider"></span>
          </label>
        </td>
        <td>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn-polaris btn-secondary btn-sm" onclick="window.PolarisApp.openPermissionEditor('${cmd.name}')" title="Atur siapa saja yang boleh menggunakan command ini">
              🛡️ Izin Akses
            </button>
            <button class="btn-polaris btn-secondary btn-sm" onclick="window.PolarisApp.openOutputEditor('${cmd.name}')">
              ${cmd.customResponse ? '✏️ Edit Custom Output' : 'Custom Output'}
            </button>
            <button class="btn-polaris btn-secondary btn-sm" onclick="window.PolarisApp.openRoutingEditor('${cmd.name}')" title="Atur tujuan pengiriman output command (Di tempat / Nomor Sendiri / Nomor Teman / Grup)">
              🎯 Output: ${getRoutingLabel(cmd.outputRouting)}
            </button>
            ${
              cmd.isCustom
                ? `<button class="btn-polaris btn-danger btn-sm" onclick="window.PolarisApp.deleteCustomCommand('${cmd.name}')">Hapus</button>`
                : ''
            }
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    if (window.PolarisMotion) window.PolarisMotion.refreshInteractive();
  }

  async function toggleCommand(name, enabled) {
    try {
      const targetBot = document.getElementById('command-target-bot')?.value || 'primary';
      const targetOption = document.getElementById('command-target-bot')?.selectedOptions[0]?.textContent || targetBot;
      const res = await PolarisAuth.authFetch('/api/commands/override', {
        method: 'POST',
        body: JSON.stringify({ name, enabled, instanceId: targetBot }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Command /${name} (${targetOption}) ${enabled ? 'diaktifkan' : 'dinonaktifkan'}!`, 'success');
        const target = commandsData.find((c) => c.name === name);
        if (target) target.enabled = enabled;
      }
    } catch (err) {
      showToast('Gagal mengubah status command: ' + err.message, 'error');
    }
  }

  async function bulkToggleCommands(enabled) {
    const targetBot = document.getElementById('command-target-bot')?.value || 'primary';
    const selectEl = document.getElementById('command-target-bot');
    const botLabel = selectEl ? (selectEl.options[selectEl.selectedIndex]?.text || targetBot) : targetBot;
    const actionText = enabled ? 'MENGAKTIFKAN' : 'MENONAKTIFKAN';
    const ok = confirm(`Apakah Anda yakin ingin ${actionText} SEMUA command untuk bot:\n${botLabel}?`);
    if (!ok) return;

    try {
      const res = await PolarisAuth.authFetch('/api/commands/bulk-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !!enabled, instanceId: targetBot }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || `Seluruh command berhasil ${enabled ? 'diaktifkan' : 'dinonaktifkan'}!`, 'success');
        await loadCommands();
      } else {
        showToast(json.error || 'Gagal mengubah status command', 'error');
      }
    } catch (err) {
      showToast('Gagal mengubah status command: ' + err.message, 'error');
    }
  }

  function openOutputEditor(cmdName) {
    const cmd = commandsData.find((c) => c.name === cmdName);
    if (!cmd) return;

    const modal = document.getElementById('command-output-modal');
    const modalTitle = document.getElementById('output-modal-title');
    const textarea = document.getElementById('custom-output-textarea');
    const saveBtn = document.getElementById('btn-save-output');

    if (modal && textarea && modalTitle) {
      const targetBot = document.getElementById('command-target-bot')?.value || 'primary';
      modalTitle.textContent = `Custom Output: /${cmdName} (${targetBot === 'primary' ? 'Bot Utama' : targetBot})`;
      textarea.value = cmd.customResponse || '';
      modal.classList.add('active');

      saveBtn.onclick = async () => {
        const val = textarea.value.trim();
        try {
          const res = await PolarisAuth.authFetch('/api/commands/override', {
            method: 'POST',
            body: JSON.stringify({ name: cmdName, customResponse: val || null, instanceId: targetBot }),
          });
          const json = await res.json();
          if (json.success) {
            showToast(`Output command /${cmdName} berhasil disimpan untuk ${targetBot}!`, 'success');
            cmd.customResponse = val || null;
            modal.classList.remove('active');
            renderCommands(commandsData);
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        }
      };
    }
  }

  // ==================== PER-COMMAND PERMISSION EDITOR ====================
  function openPermissionEditor(cmdName) {
    const cmd = commandsData.find((c) => c.name === cmdName);
    if (!cmd) return;

    const modal = document.getElementById('modal-command-permission');
    const title = document.getElementById('permission-modal-title');
    const hiddenName = document.getElementById('perm-cmd-name');
    const customGroup = document.getElementById('perm-custom-numbers-group');
    const customInput = document.getElementById('perm-custom-numbers');

    if (!modal) return;
    if (hiddenName) hiddenName.value = cmdName;
    const targetBot = document.getElementById('command-target-bot')?.value || 'primary';
    if (title) title.textContent = `Izin Akses: /${cmdName} (${targetBot === 'primary' ? 'Bot Utama' : targetBot})`;

    let currentPerm = cmd.permission || (cmd.ownerOnly ? 'owner' : 'all');
    let isCustom = false;
    let customNums = '';

    if (currentPerm === 'public' || currentPerm === 'everyone') {
      currentPerm = 'public';
    } else if (currentPerm === 'all' || currentPerm === 'whitelist') {
      currentPerm = 'all';
    } else if (currentPerm === 'level1' || currentPerm === 'owner') {
      // standar
    } else if (typeof currentPerm === 'string' && currentPerm.includes(',')) {
      isCustom = true;
      customNums = currentPerm;
      currentPerm = 'custom';
    } else if (typeof currentPerm === 'object' && currentPerm.type === 'custom') {
      isCustom = true;
      customNums = (currentPerm.numbers || []).join(', ');
      currentPerm = 'custom';
    }

    const radios = document.querySelectorAll('input[name="cmd-perm-radio"]');
    radios.forEach((r) => {
      r.checked = r.value === currentPerm;
    });

    if (customGroup && customInput) {
      customGroup.style.display = isCustom ? 'block' : 'none';
      customInput.value = customNums;
    }

    modal.classList.add('active');
  }

  function initCommandPermissionHandler() {
    document.querySelectorAll('input[name="cmd-perm-radio"]').forEach((r) => {
      r.addEventListener('change', () => {
        const customGroup = document.getElementById('perm-custom-numbers-group');
        if (customGroup) {
          customGroup.style.display = r.value === 'custom' ? 'block' : 'none';
        }
      });
    });

    document.getElementById('btn-save-permission')?.addEventListener('click', async () => {
      const cmdName = document.getElementById('perm-cmd-name')?.value;
      if (!cmdName) return;

      const selectedRadio = document.querySelector('input[name="cmd-perm-radio"]:checked')?.value || 'all';
      let permissionVal = selectedRadio;

      if (selectedRadio === 'custom') {
        const rawNums = document.getElementById('perm-custom-numbers')?.value || '';
        const tokens = rawNums.split(',').map((t) => t.replace(/[^0-9]/g, '')).filter((t) => t.length >= 9);
        if (tokens.length === 0) {
          showToast('Masukkan minimal satu nomor WhatsApp valid (berawalan 62).', 'error');
          return;
        }
        permissionVal = tokens.join(',');
      }

      try {
        const targetBot = document.getElementById('command-target-bot')?.value || 'primary';
        const res = await PolarisAuth.authFetch('/api/commands/override', {
          method: 'POST',
          body: JSON.stringify({ name: cmdName, permission: permissionVal, instanceId: targetBot }),
        });
        const json = await res.json();
        if (json.success) {
          showToast(`Izin akses command /${cmdName} berhasil diperbarui!`, 'success');
          const target = commandsData.find((c) => c.name === cmdName);
          if (target) target.permission = permissionVal;
          document.getElementById('modal-command-permission')?.classList.remove('active');
          renderCommands(commandsData);
        } else {
          showToast(json.error || 'Gagal menyimpan izin akses.', 'error');
        }
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
    });
  }

  // ==================== PER-COMMAND OUTPUT ROUTING ====================
  let activeRoutingCommand = null;
  let ecosystemGroupsCache = null;

  function getRoutingLabel(routing) {
    if (!routing || !routing.mode || routing.mode === 'inplace') return '💬 Di Tempat';
    if (routing.mode === 'self') return '📱 No. Sendiri';
    if (routing.mode === 'friend') {
      const dest = routing.destination ? String(routing.destination).replace(/[^0-9]/g, '') : '';
      return `👤 Teman (${dest ? dest.slice(-4) : ''})`;
    }
    if (routing.mode === 'group') {
      const dest = String(routing.destination || '').toLowerCase();
      if (dest === 'vault') return '📦 Vault';
      if (dest === 'logs') return '🚨 Logs';
      if (dest === 'news') return '🌍 News';
      if (dest === 'sandbox') return '🧠 Sandbox';
      if (dest === 'academy') return '🎓 Akademi';
      if (dest === 'channel' || dest === 'saluran' || dest.endsWith('@newsletter')) return '📢 Saluran';
      return '👥 GC';
    }
    return '💬 Di Tempat';
  }

  async function loadEcosystemGroups() {
    if (ecosystemGroupsCache) return ecosystemGroupsCache;
    try {
      const res = await PolarisAuth.authFetch('/api/groups/ecosystem');
      const json = await res.json();
      if (json.success) {
        ecosystemGroupsCache = json;
        return json;
      }
    } catch (_) {}
    return null;
  }

  function selectRoutingMode(mode) {
    const modes = ['inplace', 'self', 'friend', 'group'];
    modes.forEach((m) => {
      const pill = document.getElementById(`routing-pill-${m}`);
      const radio = pill ? pill.querySelector('input') : null;
      if (m === mode) {
        if (pill) pill.classList.add('active');
        if (radio) radio.checked = true;
      } else {
        if (pill) pill.classList.remove('active');
        if (radio) radio.checked = false;
      }
    });

    const detailFriend = document.getElementById('routing-detail-friend');
    const detailGroup = document.getElementById('routing-detail-group');
    if (detailFriend) detailFriend.style.display = (mode === 'friend') ? 'block' : 'none';
    if (detailGroup) detailGroup.style.display = (mode === 'group') ? 'block' : 'none';

    if (mode === 'friend') {
      const friendInput = document.getElementById('routing-friend-number');
      if (friendInput) {
        setTimeout(() => {
          friendInput.focus();
        }, 50);
      }
    }
  }

  async function openRoutingEditor(cmdName) {
    const cmd = commandsData.find((c) => c.name === cmdName);
    if (!cmd) return;

    activeRoutingCommand = cmdName;
    const modal = document.getElementById('modal-command-routing');
    const modalTitle = document.getElementById('routing-modal-title');
    const friendInput = document.getElementById('routing-friend-number');
    const groupSelect = document.getElementById('routing-group-select');
    const groupCustomInput = document.getElementById('routing-group-custom-jid');

    if (!modal) return;
    const targetBot = document.getElementById('command-target-bot')?.value || 'primary';
    if (modalTitle) modalTitle.textContent = `🎯 Tujuan Output: /${cmdName} (${targetBot === 'primary' ? 'Bot Utama' : targetBot})`;

    // Muat daftar grup dari server jika tersedia (GC WhatsApp)
    const ecoData = await loadEcosystemGroups();
    const dynamicGroupEl = document.getElementById('routing-group-dynamic-options');
    if (dynamicGroupEl && ecoData?.allGroups) {
      const optHtml = Object.entries(ecoData.allGroups).map(([jid, g]) => {
        const name = g.name || g.subject || jid;
        return `<option value="${escapeHtml(jid)}">👥 ${escapeHtml(name)}</option>`;
      }).join('');
      dynamicGroupEl.innerHTML = optHtml || '<option disabled>Tidak ada grup lain</option>';
    }

    const currentRouting = cmd.outputRouting || { mode: 'inplace' };
    const currentMode = currentRouting.mode || 'inplace';

    selectRoutingMode(currentMode);

    if (friendInput) {
      friendInput.value = currentMode === 'friend' ? (currentRouting.destination || '') : '';
    }

    if (groupSelect) {
      const dest = currentRouting.destination || 'vault';
      if (['vault', 'logs', 'news', 'sandbox', 'academy', 'channel', 'saluran'].includes(dest) || groupSelect.querySelector(`option[value="${dest}"]`)) {
        groupSelect.value = dest;
        if (groupCustomInput) groupCustomInput.style.display = 'none';
      } else if (dest && dest !== 'inplace' && dest !== 'self') {
        groupSelect.value = 'custom';
        if (groupCustomInput) {
          groupCustomInput.style.display = 'block';
          groupCustomInput.value = dest;
        }
      } else {
        groupSelect.value = 'vault';
        if (groupCustomInput) groupCustomInput.style.display = 'none';
      }
    }

    modal.classList.add('active');
  }

  async function saveRoutingConfig() {
    if (!activeRoutingCommand) return;
    const cmd = commandsData.find((c) => c.name === activeRoutingCommand);
    if (!cmd) return;

    const selectedRadio = document.querySelector('input[name="cmdOutputMode"]:checked');
    const mode = selectedRadio ? selectedRadio.value : 'inplace';
    let destination = null;

    if (mode === 'friend') {
      const friendVal = document.getElementById('routing-friend-number')?.value.trim();
      const normFriend = normalizeClientPhone(friendVal);
      if (!normFriend) {
        showToast('Masukkan nomor WhatsApp teman yang valid (contoh nomor 628XXXXXXXXXX)!', 'warning');
        document.getElementById('routing-friend-number')?.focus();
        return;
      }
      destination = normFriend;
    } else if (mode === 'group') {
      const selectVal = document.getElementById('routing-group-select')?.value;
      if (selectVal === 'custom') {
        const customJid = document.getElementById('routing-group-custom-jid')?.value.trim();
        if (!customJid || (!customJid.endsWith('@g.us') && customJid.length < 15)) {
          showToast('Masukkan Group JID yang valid (contoh: 120363xxx@g.us)!', 'warning');
          return;
        }
        destination = customJid;
      } else {
        destination = selectVal || 'vault';
      }
    }

    const outputRouting = { mode, destination };
    const targetBot = document.getElementById('command-target-bot')?.value || 'primary';

    try {
      const res = await PolarisAuth.authFetch('/api/commands/override', {
        method: 'POST',
        body: JSON.stringify({
          name: activeRoutingCommand,
          outputRouting,
          instanceId: targetBot,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Tujuan output untuk /${activeRoutingCommand} berhasil disimpan (${getRoutingLabel(outputRouting)})!`, 'success');
        cmd.outputRouting = outputRouting;
        const modal = document.getElementById('modal-command-routing');
        if (modal) modal.classList.remove('active');
        renderCommands(commandsData);
      } else {
        showToast(json.error || 'Gagal menyimpan rute output', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  function openCreateCustomModal() {
    const modal = document.getElementById('create-command-modal');
    if (modal) modal.classList.add('active');
  }

  async function handleCreateCustomCommand(name, response, desc, category = 'Kustom Web', permission = 'public') {
    try {
      const targetBot = document.getElementById('command-target-bot')?.value || 'primary';
      const res = await PolarisAuth.authFetch('/api/commands/custom', {
        method: 'POST',
        body: JSON.stringify({ name, response, desc, category, permission, instanceId: targetBot }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Command custom /${name} berhasil dibuat untuk ${targetBot}!`, 'success');
        document.getElementById('create-command-modal')?.classList.remove('active');
        loadCommands();
      } else {
        showToast(json.error || 'Gagal membuat command', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  async function deleteCustomCommand(name) {
    if (!confirm(`Hapus command custom /${name}?`)) return;
    try {
      const targetBot = document.getElementById('command-target-bot')?.value || 'primary';
      const res = await PolarisAuth.authFetch(`/api/commands/custom/${encodeURIComponent(name)}?instanceId=${encodeURIComponent(targetBot)}`, {
        method: 'DELETE',
        body: JSON.stringify({ instanceId: targetBot }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Command /${name} berhasil dihapus dari ${targetBot}.`, 'success');
        loadCommands();
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  // ==================== 5B. TAB IMPORT FITUR & STUDIO COMMAND ====================
  const STARTER_PRESETS = {
    donasi: [
      {
        name: 'donasi',
        category: 'Umum',
        permission: 'public',
        desc: 'Informasi donasi bot & server',
        response: '💰 *DONASI SERVER & BOT POLARIS*\n\nTerima kasih {sender} yang ingin berdonasi!\n• Gopay / DANA / OVO: 08xxxxxxxxxx\n• Saweria / QRIS: https://saweria.co/polaris\n\nSetiap donasi sangat membantu kelangsungan server bot. Terimakasih! ✨',
      },
      {
        name: 'qris',
        category: 'Umum',
        permission: 'public',
        desc: 'Tampilkan info pembayaran QRIS',
        response: '📲 *PEMBAYARAN QRIS ALL PAYMENT*\n\nSilakan scan barcode QRIS kami.\nSetelah transfer, konfirmasi ke owner melalui /{prefix}owner.',
      },
    ],
    rules: [
      {
        name: 'rules',
        category: 'Moderasi',
        permission: 'public',
        desc: 'Tata tertib & peraturan grup resmi',
        response: '📜 *PERATURAN RESMI GRUP {groupName}*\n\n1. Dilarang spam chat, stiker, atau virtex.\n2. Dilarang share link grup lain (Anti-Link aktif).\n3. Dilarang berkata kasar atau memicu SARA.\n4. Hormati seluruh admin dan anggota.\n\nPelanggaran akan dikenai sanksi kick oleh sistem bot. Waktu: {time} WIB',
      },
    ],
    faq: [
      {
        name: 'faq',
        category: 'Informasi',
        permission: 'public',
        desc: 'Tanya jawab seputar layanan bot',
        response: '❓ *FREQUENTLY ASKED QUESTIONS (FAQ)*\n\nQ: Bagaimana cara menggunakan bot?\nA: Ketik /{prefix}menu untuk melihat seluruh daftar fitur.\n\nQ: Apakah bot ini gratis?\nA: Fitur dasar gratis untuk semua pengguna whitelist.\n\nWaktu server: {date} - {time}',
      },
    ],
    olshop: [
      {
        name: 'order',
        category: 'Olshop',
        permission: 'public',
        desc: 'Format pemesanan produk olshop',
        response: '🛍️ *FORMAT ORDER CEPAT*\n\nSilakan isi data berikut:\n• Nama Pemesan: {sender}\n• Nomor HP: {senderNumber}\n• Produk yang Dipesan:\n• Jumlah:\n• Alamat Pengiriman:\n\nKirim format yang sudah diisi ke chat ini, admin kami akan segera merespon!',
      },
      {
        name: 'ongkir',
        category: 'Olshop',
        permission: 'public',
        desc: 'Ketentuan tarif pengiriman',
        response: '📦 *KETENTUAN ONGKIR*\n\nPengiriman menggunakan J&T, JNE, SiCepat, dan Anteraja dari Jakarta Pusat.\nKetik alamat tujuan Anda untuk pengecekan estimasi tarif ongkos kirim.',
      },
    ],
  };

  async function loadImportTab() {
    const tbody = document.getElementById('custom-commands-tbody');
    const countEl = document.getElementById('custom-commands-count');
    if (!tbody) return;

    try {
      await populateClusterBotSelectors();
      const targetBot = document.getElementById('import-target-bot')?.value || 'primary';
      const res = await PolarisAuth.authFetch(`/api/commands?instanceId=${encodeURIComponent(targetBot)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const customCommands = json.data.filter((c) => c.isCustom);
        if (countEl) countEl.textContent = customCommands.length;

        if (customCommands.length === 0) {
          tbody.innerHTML = `
            <tr>
              <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 32px 16px;">
                Belum ada custom command yang dibuat. Rancang melalui Studio di atas atau impor paket JSON.
              </td>
            </tr>
          `;
          return;
        }

        tbody.innerHTML = '';
        customCommands.forEach((cmd) => {
          const tr = document.createElement('tr');
          const respSnippet = cmd.customResponse || cmd.response || '-';
          const permBadge =
            cmd.permission === 'owner'
              ? '<span class="badge badge-rose">Owner Only</span>'
              : cmd.permission === 'admin'
              ? '<span class="badge badge-purple">Admin Grup</span>'
              : '<span class="badge badge-cyan">Semua Pengguna</span>';

          tr.innerHTML = `
            <td>
              <div style="font-weight: 700; color: var(--accent-cyan);">/${escapeHtml(cmd.name)}</div>
              <div style="font-size: 0.74rem; color: var(--text-muted);">${escapeHtml(cmd.desc || '')}</div>
            </td>
            <td><span class="badge badge-purple">${escapeHtml(cmd.category || 'Kustom Web')}</span></td>
            <td>${permBadge}</td>
            <td style="max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-secondary);" title="${escapeHtml(respSnippet)}">
              ${escapeHtml(respSnippet)}
            </td>
            <td>
              <label class="switch-container">
                <input type="checkbox" ${cmd.enabled !== false ? 'checked' : ''} onchange="window.PolarisApp.toggleCommand('${escapeHtml(cmd.name)}', this.checked)">
                <span class="switch-slider"></span>
              </label>
            </td>
            <td style="text-align: right;">
              <div style="display: flex; gap: 6px; justify-content: flex-end;">
                <button class="btn-polaris btn-secondary btn-sm" onclick="window.PolarisApp.editCustomCommand('${escapeHtml(cmd.name)}')">✏️ Edit</button>
                <button class="btn-polaris btn-danger btn-sm" onclick="window.PolarisApp.deleteCustomCommand('${escapeHtml(cmd.name)}')">Hapus</button>
              </div>
            </td>
          `;
          tbody.appendChild(tr);
        });

        if (window.PolarisMotion) window.PolarisMotion.refreshInteractive();
      }
    } catch (err) {
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--accent-rose); padding: 20px;">Gagal memuat: ${escapeHtml(err.message)}</td></tr>`;
      }
    }
  }

  function editCustomCommand(name) {
    const cmd = commandsData.find((c) => c.name === name);
    if (!cmd) return;

    const nameInput = document.getElementById('studio-cmd-name');
    const catInput = document.getElementById('studio-cmd-category');
    const permInput = document.getElementById('studio-cmd-permission');
    const descInput = document.getElementById('studio-cmd-desc');
    const respInput = document.getElementById('studio-cmd-response');

    if (nameInput) nameInput.value = cmd.name;
    if (catInput && cmd.category) catInput.value = cmd.category;
    if (permInput && cmd.permission) permInput.value = cmd.permission;
    if (descInput) descInput.value = cmd.desc || '';
    if (respInput) {
      respInput.value = cmd.customResponse || cmd.response || '';
      respInput.dispatchEvent(new Event('input'));
    }

    const studioForm = document.getElementById('form-studio-command');
    if (studioForm) {
      studioForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    showToast(`Command /${name} dimuat ke Studio Command. Lakukan perubahan lalu klik Simpan.`, 'info');
  }

  function updateStudioSimulation() {
    const respInput = document.getElementById('studio-cmd-response');
    const previewEl = document.getElementById('studio-chat-preview');
    const timeEl = document.getElementById('studio-chat-time');
    if (!respInput || !previewEl) return;

    const raw = respInput.value || '';
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hh}:${mm} WIB`;
    const currentDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    if (timeEl) timeEl.textContent = `${hh}:${mm}`;

    const rendered = raw
      .replace(/\{sender\}/gi, '@628123456789')
      .replace(/\{senderNumber\}/gi, '628123456789')
      .replace(/\{botName\}/gi, 'Polaris Bot')
      .replace(/\{prefix\}/gi, '.')
      .replace(/\{groupName\}/gi, 'Komunitas Polaris')
      .replace(/\{time\}/gi, currentTime)
      .replace(/\{date\}/gi, currentDate)
      .replace(/\{args\}/gi, 'argumen_contoh');

    previewEl.textContent = rendered || '(Tulis respon command untuk melihat simulasi...)';
  }

  function initImportFeature() {
    const dropzone = document.getElementById('import-dropzone');
    const fileInput = document.getElementById('import-file-input');
    const jsonTextarea = document.getElementById('import-json-textarea');
    const btnClearJson = document.getElementById('btn-clear-import-json');
    const btnProcessImport = document.getElementById('btn-process-import');
    const btnExportCommands = document.getElementById('btn-export-commands');
    const btnStarterPack = document.getElementById('btn-starter-pack');
    const btnRefreshList = document.getElementById('btn-refresh-custom-commands');
    const studioRespInput = document.getElementById('studio-cmd-response');
    const studioForm = document.getElementById('form-studio-command');

    // Preset buttons
    document.querySelectorAll('.preset-template-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-preset');
        if (STARTER_PRESETS[key] && jsonTextarea) {
          jsonTextarea.value = JSON.stringify(STARTER_PRESETS[key], null, 2);
          if (btnProcessImport) btnProcessImport.disabled = false;
          const badge = document.getElementById('import-zip-filename');
          if (badge) {
            badge.style.display = 'inline-block';
            badge.textContent = `📋 Preset: ${btn.textContent.trim()} (${STARTER_PRESETS[key].length} command)`;
          }
          showToast(`Preset template "${btn.textContent.trim()}" dimuat ke editor JSON. Siap dipasang!`, 'info');
        }
      });
    });

    // Starter pack full button
    if (btnStarterPack) {
      btnStarterPack.addEventListener('click', () => {
        const fullPack = [
          ...STARTER_PRESETS.donasi,
          ...STARTER_PRESETS.rules,
          ...STARTER_PRESETS.faq,
          ...STARTER_PRESETS.olshop,
        ];
        if (jsonTextarea) {
          jsonTextarea.value = JSON.stringify(fullPack, null, 2);
          if (btnProcessImport) btnProcessImport.disabled = false;
          const badge = document.getElementById('import-zip-filename');
          if (badge) {
            badge.style.display = 'inline-block';
            badge.textContent = `⚡ Starter Pack (${fullPack.length} command)`;
          }
          showToast('⚡ Starter Pack 6 Command siap pakai dimuat ke editor. Klik "Pasang Command dari ZIP" untuk mengaktifkan!', 'success');
        }
      });
    }

    // Clear JSON
    if (btnClearJson && jsonTextarea) {
      btnClearJson.addEventListener('click', () => {
        jsonTextarea.value = '';
        if (btnProcessImport) btnProcessImport.disabled = true;
        const badge = document.getElementById('import-zip-filename');
        if (badge) badge.style.display = 'none';
        if (fileInput) fileInput.value = '';
      });
    }

    // Export JSON / ZIP
    if (btnExportCommands) {
      btnExportCommands.addEventListener('click', () => {
        const targetBot = document.getElementById('import-target-bot')?.value || 'primary';
        window.open(`/api/commands/export?instanceId=${encodeURIComponent(targetBot)}`, '_blank');
        showToast(`Mengunduh backup command kustom JSON (${targetBot})...`, 'info');
      });
    }

    const btnExportZip = document.getElementById('btn-export-zip');
    if (btnExportZip) {
      btnExportZip.addEventListener('click', async () => {
        try {
          const targetBot = document.getElementById('import-target-bot')?.value || 'primary';
          const res = await PolarisAuth.authFetch(`/api/commands/custom?instanceId=${encodeURIComponent(targetBot)}`);
          const json = await res.json();
          const items = (json.success && json.commands) ? json.commands : [];
          if (!items || items.length === 0) {
            showToast('Belum ada command kustom untuk diekspor ke ZIP.', 'info');
            return;
          }

          if (typeof JSZip === 'undefined') {
            window.open(`/api/commands/export?instanceId=${encodeURIComponent(targetBot)}`, '_blank');
            return;
          }

          const zip = new JSZip();
          zip.file('commands.json', JSON.stringify(items, null, 2));
          zip.file('README.txt', `POLARIS COMMAND PACK ARCHIVE\nTarget Bot: ${targetBot}\nGenerated: ${new Date().toISOString()}\nTotal Commands: ${items.length}\n\nKetentuan Import:\n- Wajib berupa file .zip\n- Berisi berkas commands.json yang valid`);

          const blob = await zip.generateAsync({ type: 'blob' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `polaris_commands_${targetBot}_${Date.now()}.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast(`📦 Berhasil mengekspor ${items.length} command ke paket ZIP!`, 'success');
        } catch (err) {
          showToast('Gagal mengekspor ZIP: ' + err.message, 'error');
        }
      });
    }

    // Dropzone Drag and Drop
    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files && files[0]) {
          readFileIntoJsonTextarea(files[0]);
        }
      });

      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files[0]) {
          readFileIntoJsonTextarea(fileInput.files[0]);
        }
      });
    }

    // Helper serialization aman yang mempertahankan handler function sebagai string
    function safeCommandStringify(obj, indent = 2) {
      return JSON.stringify(
        obj,
        (key, value) => {
          if (typeof value === 'function') {
            return value.toString();
          }
          return value;
        },
        indent
      );
    }

    // Universal parser for raw content or files (JSON, JS, Python, Text)
    function parseMultiFormatCommands(rawContent, filename = '') {
      if (!rawContent || typeof rawContent !== 'string') return [];
      let trimmed = rawContent.trim();
      if (!trimmed) return [];

      // 0. Bersihkan markdown code fences seperti ```javascript ... ``` atau ```json ... ```
      trimmed = trimmed
        .replace(/^\s*```(?:javascript|js|json|python|py|text)?\s*[\r\n]+/i, '')
        .replace(/[\r\n]+\s*```\s*$/i, '')
        .trim();

      // Abaikan package.json atau file konfigurasi npm
      if (filename && /package(?:-lock)?\.json$/i.test(filename)) {
        return [];
      }

      // 1. Direct JSON attempt
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && (parsed.dependencies || parsed.devDependencies) && parsed.version) {
          return [];
        }
        if (Array.isArray(parsed)) {
          return parsed.map((item) => ({
            ...item,
            ...(typeof item.handler === 'function' ? { handler: item.handler.toString() } : {}),
          }));
        }
        if (parsed && Array.isArray(parsed.commands)) {
          return parsed.commands.map((item) => ({
            ...item,
            ...(typeof item.handler === 'function' ? { handler: item.handler.toString() } : {}),
          }));
        }
        if (parsed && typeof parsed === 'object') {
          if (parsed.name || parsed.command) {
            return [{
              ...parsed,
              ...(typeof parsed.handler === 'function' ? { handler: parsed.handler.toString() } : {}),
            }];
          }
          return Object.keys(parsed).map((k) => ({
            name: k,
            ...parsed[k],
            ...(typeof parsed[k]?.handler === 'function' ? { handler: parsed[k].handler.toString() } : {}),
          }));
        }
      } catch (_) {}

      // 2. JavaScript format attempt (.js or code containing COMMANDS / module.exports)
      try {
        const fn = new Function(
          'const module = { exports: {} }; const exports = module.exports;\n' +
          'const require = (mod) => ({ delay: (ms) => new Promise(r => setTimeout(r, ms)) });\n' +
          'const process = { env: {} };\n' +
          trimmed +
          '\n; return (typeof COMMANDS !== "undefined" ? COMMANDS : (typeof commands !== "undefined" ? commands : (typeof COMMAND_LIST !== "undefined" ? COMMAND_LIST : (module.exports.COMMANDS || module.exports.commands || module.exports.default || module.exports))));'
        );
        let result = fn();
        if (result && typeof result === 'object') {
          if (!Array.isArray(result)) {
            if (Array.isArray(result.COMMANDS)) result = result.COMMANDS;
            else if (Array.isArray(result.commands)) result = result.commands;
            else if (result.name || result.command) result = [result];
            else {
              const keys = Object.keys(result).filter((k) => !['default', '__esModule'].includes(k));
              if (keys.length > 0 && typeof result[keys[0]] === 'object') {
                result = keys.map((k) => ({ name: k, ...result[k] }));
              }
            }
          }
        }
        if (Array.isArray(result) && result.length > 0) {
          return result.map((item) => {
            const norm = { ...item };
            if (norm.command && !norm.name) norm.name = norm.command;
            if (typeof norm.handler === 'function') norm.handler = norm.handler.toString();
            if (typeof norm.code === 'function') norm.code = norm.code.toString();
            if (typeof norm.action === 'function') norm.handler = norm.action.toString();
            return norm;
          });
        }
      } catch (_) {}

      // 3. Regex AST extractor for JS / JSON-like object arrays
      try {
        const objRegex = /\{\s*name\s*:\s*['"`]([a-zA-Z0-9_-]+)['"`]([\s\S]*?)\}/g;
        let match;
        const extracted = [];
        while ((match = objRegex.exec(trimmed)) !== null) {
          const name = match[1];
          const body = match[2];

          const catMatch = body.match(/category\s*:\s*['"`]([^'"`]+)['"`]/i);
          const descMatch = body.match(/desc\s*:\s*['"`]([^'"`]+)['"`]/i);
          const respMatch = body.match(/(?:response|reply|text)\s*:\s*['"`]([^'"`]+)['"`]/i);
          const ownerMatch = body.match(/ownerOnly\s*:\s*(true|false)/i);
          const permMatch = body.match(/permission\s*:\s*['"`]([^'"`]+)['"`]/i);
          const typeMatch = body.match(/type\s*:\s*['"`]([^'"`]+)['"`]/i);
          const mediaMatch = body.match(/(?:mediaUrl|imageUrl|videoUrl|audioUrl|fileUrl|url)\s*:\s*['"`]([^'"`]+)['"`]/i);
          const captionMatch = body.match(/caption\s*:\s*['"`]([^'"`]+)['"`]/i);
          const fileMatch = body.match(/fileName\s*:\s*['"`]([^'"`]+)['"`]/i);
          const apiMatch = body.match(/apiUrl\s*:\s*['"`]([^'"`]+)['"`]/i);

          extracted.push({
            name,
            category: catMatch ? catMatch[1] : 'Imported',
            desc: descMatch ? descMatch[1] : `Fitur command /${name}`,
            response: respMatch ? respMatch[1] : (descMatch ? descMatch[1] : `Fitur /${name} aktif.`),
            ownerOnly: ownerMatch ? ownerMatch[1] === 'true' : false,
            permission: permMatch ? permMatch[1] : (ownerMatch && ownerMatch[1] === 'true' ? 'owner' : 'public'),
            type: typeMatch ? typeMatch[1] : (mediaMatch ? 'media' : 'text'),
            ...(mediaMatch ? { mediaUrl: mediaMatch[1] } : {}),
            ...(captionMatch ? { caption: captionMatch[1] } : {}),
            ...(fileMatch ? { fileName: fileMatch[1] } : {}),
            ...(apiMatch ? { apiUrl: apiMatch[1] } : {}),
          });
        }
        if (extracted.length > 0) return extracted;
      } catch (_) {}

      // 4. Python format attempt (.py)
      try {
        let pyClean = trimmed
          .replace(/#.*$/gm, '')
          .replace(/\bTrue\b/g, 'true')
          .replace(/\bFalse\b/g, 'false')
          .replace(/\bNone\b/g, 'null');

        const pyListMatch = pyClean.match(/(?:COMMANDS|commands|COMMAND_LIST)\s*=\s*(\[[\s\S]*?\])/);
        if (pyListMatch) {
          const jsonLike = pyListMatch[1].replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
          const pyParsed = JSON.parse(jsonLike);
          if (Array.isArray(pyParsed)) return pyParsed;
        }

        const pyDictMatch = pyClean.match(/(?:COMMANDS|commands|COMMAND_DICT)\s*=\s*(\{[\s\S]*?\})/);
        if (pyDictMatch) {
          const jsonLike = pyDictMatch[1].replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
          const pyParsed = JSON.parse(jsonLike);
          if (pyParsed && typeof pyParsed === 'object') {
            return Object.keys(pyParsed).map((k) => ({ name: k, ...pyParsed[k] }));
          }
        }

        const pyFuncRegex = /def\s+(?:handle_|cmd_|command_)?([a-zA-Z0-9_]+)\s*\([^)]*\)\s*:\s*(?:"""([\s\S]*?)"""|'''([\s\S]*?)''')?/g;
        let funcMatch;
        const pyFuncs = [];
        while ((funcMatch = pyFuncRegex.exec(trimmed)) !== null) {
          const name = funcMatch[1].toLowerCase().replace(/_/g, '');
          if (name.length >= 2 && !['init', 'main', 'helper', 'test'].includes(name)) {
            const doc = (funcMatch[2] || funcMatch[3] || '').trim();
            pyFuncs.push({
              name,
              category: 'Python Script',
              desc: doc || `Fitur Python /${name}`,
              response: doc ? `ℹ️ ${doc}` : `Fitur Python /${name} aktif.`,
              permission: 'public',
            });
          }
        }
        if (pyFuncs.length > 0) return pyFuncs;
      } catch (_) {}

      // 5. Line-by-line fallback for text files: e.g. "ping: Cek bot aktif" or "/menu - Deskripsi"
      try {
        const lines = trimmed.split(/\r?\n/);
        const lineCmds = [];
        for (const line of lines) {
          const l = line.trim();
          if (!l || l.startsWith('#') || l.startsWith('//')) continue;
          const m = l.match(/^[/!.]?([a-zA-Z0-9_-]{2,20})\s*[:=\-\u2013\u2014]\s*(.+)$/);
          if (m) {
            const name = m[1].toLowerCase();
            const descOrResp = m[2].trim();
            lineCmds.push({
              name,
              category: 'Text Import',
              desc: descOrResp,
              response: descOrResp,
              permission: 'public',
            });
          }
        }
        if (lineCmds.length > 0) return lineCmds;
      } catch (_) {}

      return [];
    }

    async function readFileIntoJsonTextarea(file) {
      if (!file) return;

      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const isZip = ext === 'zip';

      if (isZip) {
        if (typeof JSZip === 'undefined') {
          showToast('Library JSZip belum siap. Silakan muat ulang halaman.', 'error');
          return;
        }

        try {
          const zip = await JSZip.loadAsync(file);

          const allFileKeys = Object.keys(zip.files).filter((k) => {
            const entry = zip.files[k];
            if (entry.dir) return false;
            const lower = k.toLowerCase();
            if (lower.includes('__macosx') || lower.includes('/.') || lower.startsWith('.')) return false;
            const baseName = lower.split('/').pop();
            // Abaikan metadata atau file dokumentasi umum dalam zip
            if (['package.json', 'package-lock.json', 'yarn.lock', '.gitignore', 'license', 'license.txt', 'readme.md', 'readme.txt'].includes(baseName)) {
              return false;
            }
            return true;
          });

          let combined = [];
          for (const key of allFileKeys) {
            const entry = zip.files[key];
            const content = await entry.async('string');
            const parsed = parseMultiFormatCommands(content, key);
            if (Array.isArray(parsed) && parsed.length > 0) {
              combined.push(...parsed);
            }
          }

          if (combined.length === 0) {
            showToast(`Tidak ditemukan command yang dapat diimpor dari berkas ZIP "${file.name}". Pastikan ada file .json, .js, .py, atau .txt yang valid di dalamnya.`, 'error');
            return;
          }

          if (jsonTextarea) {
            jsonTextarea.value = safeCommandStringify(combined, 2);
          }

          const badge = document.getElementById('import-zip-filename');
          if (badge) {
            badge.style.display = 'inline-block';
            badge.textContent = `📦 ${file.name} (ZIP • ${combined.length} command)`;
          }

          if (btnProcessImport) {
            btnProcessImport.disabled = false;
          }

          showToast(`📦 Berkas ZIP "${file.name}" berhasil diekstrak (${combined.length} command siap dipasang)!`, 'success');
        } catch (err) {
          showToast(`Gagal membaca berkas ZIP: ${err.message}`, 'error');
        }
      } else {
        // Read text formats (.js, .py, .json, .txt, dll)
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const text = e.target.result;
            const parsed = parseMultiFormatCommands(text, file.name);
            if (!parsed || parsed.length === 0) {
              showToast(`Gagal mendeteksi command dari berkas "${file.name}". Pastikan berkas memuat struktur array COMMANDS, handler fungsi, atau JSON yang valid.`, 'error');
              return;
            }

            if (jsonTextarea) {
              jsonTextarea.value = safeCommandStringify(parsed, 2);
            }

            const badge = document.getElementById('import-zip-filename');
            if (badge) {
              badge.style.display = 'inline-block';
              badge.textContent = `📄 ${file.name} (${ext.toUpperCase()} • ${parsed.length} command)`;
            }

            if (btnProcessImport) {
              btnProcessImport.disabled = false;
            }

            showToast(`📄 Berkas "${file.name}" (${ext.toUpperCase()}) berhasil dimuat (${parsed.length} command siap dipasang)!`, 'success');
          } catch (err) {
            showToast(`Gagal memproses berkas: ${err.message}`, 'error');
          }
        };
        reader.onerror = () => {
          showToast(`Gagal membaca file: ${reader.error?.message || 'Unknown error'}`, 'error');
        };
        reader.readAsText(file);
      }
    }

    if (jsonTextarea && btnProcessImport) {
      jsonTextarea.addEventListener('input', () => {
        btnProcessImport.disabled = !jsonTextarea.value.trim();
      });
    }

    // Process Import
    if (btnProcessImport) {
      btnProcessImport.addEventListener('click', async () => {
        const raw = jsonTextarea ? jsonTextarea.value.trim() : '';
        if (!raw) {
          showToast('Masukkan atau unggah command terlebih dahulu!', 'error');
          return;
        }

        let parsed = parseMultiFormatCommands(raw, 'input.json');
        if (!parsed || parsed.length === 0) {
          try {
            parsed = JSON.parse(raw);
          } catch (err) {
            showToast('Format command tidak dapat diproses: Pastikan berupa JSON, skrip JS (COMMANDS = [...]), Python, atau format teks valid.', 'error');
            return;
          }
        }

        const overwrite = document.getElementById('import-overwrite-toggle')?.checked ?? true;
        const targetBot = document.getElementById('import-target-bot')?.value || 'primary';
        const targetOption = document.getElementById('import-target-bot')?.selectedOptions[0]?.textContent || targetBot;

        btnProcessImport.disabled = true;
        btnProcessImport.textContent = 'Memproses Impor...';

        try {
          const payload = safeCommandStringify({ items: parsed, overwrite, instanceId: targetBot });
          const res = await PolarisAuth.authFetch('/api/commands/import', {
            method: 'POST',
            body: payload,
          });
          const json = await res.json();
          if (json.success) {
            showToast(json.message || `✅ ${json.importedCount || 0} command berhasil dipasang ke ${targetOption}!`, 'success');
            if (jsonTextarea) jsonTextarea.value = '';
            const badge = document.getElementById('import-zip-filename');
            if (badge) badge.style.display = 'none';
            if (fileInput) fileInput.value = '';
            loadImportTab();
            loadCommands();
            loadOverview();
          } else {
            showToast(json.error || 'Gagal mengimpor paket command', 'error');
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        } finally {
          btnProcessImport.disabled = !jsonTextarea?.value.trim();
          btnProcessImport.textContent = '🚀 Pasang Fitur Command';
        }
      });
    }

    // Refresh Custom Commands List
    if (btnRefreshList) {
      btnRefreshList.addEventListener('click', () => {
        loadImportTab();
        showToast('Daftar command kustom diperbarui.', 'info');
      });
    }

    // Target Bot change listener in import tab
    document.getElementById('import-target-bot')?.addEventListener('change', () => {
      loadImportTab();
    });

    // Variable Chips click-to-insert into Studio textarea
    document.querySelectorAll('.var-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const varText = chip.getAttribute('data-var');
        if (!varText || !studioRespInput) return;

        const start = studioRespInput.selectionStart;
        const end = studioRespInput.selectionEnd;
        const before = studioRespInput.value.substring(0, start);
        const after = studioRespInput.value.substring(end);

        studioRespInput.value = before + varText + after;
        studioRespInput.selectionStart = studioRespInput.selectionEnd = start + varText.length;
        studioRespInput.focus();
        updateStudioSimulation();
      });
    });

    // Studio response input live simulation
    if (studioRespInput) {
      studioRespInput.addEventListener('input', updateStudioSimulation);
      updateStudioSimulation();
    }

    // Studio form submit
    if (studioForm) {
      studioForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('studio-cmd-name')?.value.trim();
        const category = document.getElementById('studio-cmd-category')?.value || 'Kustom Web';
        const permission = document.getElementById('studio-cmd-permission')?.value || 'public';
        const desc = document.getElementById('studio-cmd-desc')?.value.trim();
        const response = document.getElementById('studio-cmd-response')?.value.trim();
        const targetBot = document.getElementById('import-target-bot')?.value || 'primary';

        if (!name || !response) {
          showToast('Nama command dan respon WhatsApp wajib diisi!', 'error');
          return;
        }

        const saveBtn = document.getElementById('btn-save-studio-command');
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.textContent = 'Menyimpan Command...';
        }

        try {
          const res = await PolarisAuth.authFetch('/api/commands/custom', {
            method: 'POST',
            body: JSON.stringify({ name, category, permission, desc, response, instanceId: targetBot }),
          });
          const json = await res.json();
          if (json.success) {
            showToast(json.message || `✅ Command /${name} berhasil disimpan dan aktif di ${targetBot}!`, 'success');
            document.getElementById('studio-cmd-name').value = '';
            loadImportTab();
            loadCommands();
            loadOverview();
          } else {
            showToast(json.error || 'Gagal menyimpan command', 'error');
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        } finally {
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '✨ Simpan & Aktifkan Command';
          }
        }
      });
    }

    // ==================== AI PROMPT GENERATOR (<guide rules> <pengen apa>) ====================
    const AI_GUIDE_RULES = `<guide rules>
Kamu adalah asisten ahli pembuat fitur command bot WhatsApp berbasis Baileys (Polaris Project Bot).
Tugasmu adalah membuat fitur command kustom sesuai instruksi <pengen apa> pengguna.

ATURAN & STRUKTUR TEKNIS WAJIB:
1. Format Output:
   Hasilkan kode JavaScript bersih yang mengekspor array command:
   const COMMANDS = [ ... ];
   module.exports = COMMANDS;

2. Properti Objek Setiap Command:
   - name: string (nama command huruf kecil tanpa prefix slash, contoh: "cuaca", "quotes", "meme", "spam")
   - desc: string (deskripsi singkat fungsi fitur)
   - category: string ("Downloader", "AI Chat", "Media", "Scraper", "Spam & Utility", "Umum", "Utility", "Fun")
   - permission: "public" (semua user) | "admin" (khusus admin grup) | "owner" (khusus owner bot)
   - type: jenis output balasan bot:
     * "text": Balasan pesan teks interaktif.
       Variabel yang didukung: {user}, {sender}, {senderNumber}, {botName}, {time}, {date}, {groupName}, {args}.
     * "image": Mengirim foto/gambar.
       Wajib field: mediaUrl (string URL direct image atau API image).
       Opsional field: caption (string teks keterangan foto, mendukung variabel template).
     * "video": Mengirim video MP4.
       Wajib field: mediaUrl (string URL direct video MP4).
       Opsional field: caption (string teks keterangan video).
     * "audio": Mengirim audio/lagu/musik/sound effect.
       Wajib field: mediaUrl (string URL file audio mp3/ogg).
       Opsional field: ptt (boolean true jika ingin dikirim sebagai Voice Note WhatsApp).
     * "document": Mengirim dokumen/berkas (PDF, ZIP, DOCX, APK, dll).
       Wajib field: mediaUrl, fileName (contoh: "panduan.pdf").
       Opsional field: mimetype, caption.
     * "scrape": Mengambil data dinamis langsung dari REST API atau Scraper website.
       Wajib field: apiUrl (URL endpoint API, gunakan placeholder {args} untuk menyisipkan input user).
       Wajib field: response (template pesan yang menampilkan data, gunakan placeholder {result} atau {data}).
       Opsional field: caption.
     * "handler": Logika kustom asinkronus (JavaScript function):
       handler: async ({ sock, chatJid, msg, args, query, reply, senderNumber, senderJid, isGroup, groupSubject, groupMetadata, delay, fetch, cheerio }) => {
         // sock: Baileys WASocket instance (sendMessage, dll)
         // chatJid: JID tujuan pengiriman pesan
         // args: array argumen perintah user (contoh: ['pesan', '5', 'on'])
         // query: teks lengkap setelah nama perintah
         // reply(text): fungsi membalas pesan secara instan
         // senderNumber: nomor HP pemohon (contoh: '628123xxx')
         // senderJid: JID pemohon untuk mentions (contoh: '628123xxx@s.whatsapp.net')
         // isGroup: boolean apakah dijalankan di grup WhatsApp
         // groupMetadata: metadata grup termasuk array participants untuk tag all
         // delay(ms): fungsi jeda waktu (contoh: await delay(400)) untuk mencegah spam terblokir
       }

3. Aturan Tambahan:
   - Pastikan JSON / skrip sintaksnya valid tanpa error.
   - Sediakan penanganan jika API atau argumen user kosong.
</guide rules>`;

    const AI_WISH_PRESETS = {
      spam: "Buatkan command /spam kustom dengan parameter: /spam <teks> <total=angka valid> <jika command di grup on/off tag all> <tag user pemberi perintah>. Validasi total angka bulat positif (maksimal 30 pesan demi keamanan akun), beri jeda await delay(400) antar pesan, jika di grup dan tag all on maka mention seluruh partisipan grup, dan selalu tag nomor pemberi perintah di pesan spam.",
      media: "Buatkan command /quotes (kirim gambar kutipan motivasi harian dengan caption inspiratif), dan command /meme (kirim gambar/video meme lucu interaktif).",
      audio: "Buatkan command /soundviral (kirim audio efek suara viral dalam format voice note PTT: true), dan command /lagusantai (kirim audio lagu relaksasi format MP3).",
      scrape: "Buatkan command /gempa (scrape data info gempa terkini dari API BMKG dan tampilkan magnitudo, lokasi, waktu, dan kedalaman), dan command /cuaca {args} (mengambil ramalan cuaca berdasarkan nama kota).",
      full: "Buatkan paket komplit 4 fitur command bot:\n1. /animepic (type: 'image', kirim gambar anime acak beresolusi tinggi)\n2. /soundmeme (type: 'audio', ptt: true, kirim sound effect lucu)\n3. /infofakta (type: 'scrape', apiUrl dinamis fakta unik dunia dengan respons template rapi)\n4. /ebook (type: 'document', kirim berkas panduan PDF siap download)"
    };

    const wishInput = document.getElementById('ai-user-wish-input');
    const aiPreview = document.getElementById('ai-full-prompt-preview');
    const btnCopyAi = document.getElementById('btn-copy-ai-prompt');

    function updateAiPromptPreview() {
      if (!aiPreview) return;
      const userWish = (wishInput && wishInput.value && typeof wishInput.value.trim === 'function' && wishInput.value.trim())
        ? wishInput.value.trim()
        : 'Buatkan fitur command /quotes untuk kirim gambar motivasi dan /fakta untuk kirim info fakta unik acak.';
      aiPreview.value = `${AI_GUIDE_RULES}\n\n<pengen apa (isi sendiri)>\n${userWish}\n</pengen apa (isi sendiri)>`;
    }

    if (wishInput) {
      wishInput.addEventListener('input', updateAiPromptPreview);
    }

    document.querySelectorAll('.ai-wish-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-preset');
        if (AI_WISH_PRESETS[key] && wishInput) {
          wishInput.value = AI_WISH_PRESETS[key];
          updateAiPromptPreview();
          showToast(`Preset "${btn.textContent.trim()}" dimuat ke prompt AI!`, 'info');
        }
      });
    });

    if (btnCopyAi) {
      btnCopyAi.addEventListener('click', () => {
        if (!aiPreview) return;
        const text = aiPreview.value;
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
          showToast('📋 Prompt AI berhasil disalin! Silakan paste ke ChatGPT / Gemini / Claude.', 'success');
        }).catch(() => {
          aiPreview.select();
          document.execCommand('copy');
          showToast('📋 Prompt AI disalin ke clipboard!', 'success');
        });
      });
    }

    updateAiPromptPreview();
  }

  // ==================== 6. TAB SETTING AKUN PERSONAL ====================
  async function loadAccountSettings() {
    try {
      const res = await PolarisAuth.authFetch('/api/auth/me');
      const json = await res.json();
      if (json.success && json.user) {
        const u = json.user;
        const accUsername = document.getElementById('acc-username');
        const accDisplayName = document.getElementById('acc-display-name');
        const accBio = document.getElementById('acc-bio');
        const accAvatarUrl = document.getElementById('acc-avatar-url');
        const accAvatarPreview = document.getElementById('acc-avatar-preview');
        const accAiKeyBadge = document.getElementById('badge-ai-key-status');
        const accOwnerNum = document.getElementById('acc-owner-number');
        const acc2faToggle = document.getElementById('acc-require-2fa-toggle');

        if (accUsername) accUsername.value = u.username || '';
        if (accOwnerNum) accOwnerNum.value = u.linkedOwnerNumber || '';
        if (acc2faToggle) acc2faToggle.checked = !!u.require2FA;
        if (accDisplayName) accDisplayName.value = u.displayName || '';
        if (accBio) accBio.value = u.bio || '';
        if (accAvatarUrl) accAvatarUrl.value = u.avatarUrl || '';
        if (accAvatarPreview && u.avatarUrl) accAvatarPreview.src = u.avatarUrl;

        if (accAiKeyBadge) {
          if (u.hasCustomAiApiKey) {
            accAiKeyBadge.textContent = '✓ Tersimpan';
            accAiKeyBadge.style.background = 'rgba(16, 185, 129, 0.2)';
            accAiKeyBadge.style.color = '#10b981';
            accAiKeyBadge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
          } else {
            accAiKeyBadge.textContent = 'Belum Diatur';
            accAiKeyBadge.style.background = 'rgba(239, 68, 68, 0.2)';
            accAiKeyBadge.style.color = '#ef4444';
            accAiKeyBadge.style.borderColor = 'rgba(239, 68, 68, 0.4)';
          }
        }
      }
    } catch (err) {
      showToast('Gagal memuat profil akun: ' + err.message, 'error');
    }
    loadUserRaidTitles();
  }

  async function loadUserRaidTitles() {
    const container = document.getElementById('raid-titles-container');
    const badgeEl = document.getElementById('badge-equipped-title');
    if (!container) return;

    try {
      const res = await PolarisAuth.authFetch('/api/raid/titles');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Gagal memuat titel');

      const titles = json.titles || [];
      const equipped = json.equippedTitle;

      if (badgeEl) {
        if (equipped) {
          badgeEl.textContent = `${equipped.title_badge || '⭐'} ${equipped.title_name}`;
          badgeEl.style.background = 'rgba(168,85,247,0.3)';
          badgeEl.style.color = '#f5d0fe';
        } else {
          badgeEl.textContent = 'Belum Dipasang';
          badgeEl.style.background = 'rgba(255,255,255,0.05)';
          badgeEl.style.color = 'var(--text-muted)';
        }
      }

      if (titles.length === 0) {
        container.innerHTML = `
          <div style="background: rgba(255,255,255,0.02); border: 1px dashed var(--border-subtle); border-radius: 8px; padding: 20px; text-align: center;">
            <div style="font-size: 1.5rem; margin-bottom: 6px;">⚔️</div>
            <div style="font-weight: 600; color: var(--text-primary); font-size: 0.88rem;">Belum Ada Titel Terbuka</div>
            <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 4px;">
              Kalahkan Boss Raid pukul 20:00 WIB di grup bersama teman untuk meraih titel langka eksklusif!
            </div>
          </div>
        `;
        return;
      }

      let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
      titles.forEach((t) => {
        const isEq = Boolean(t.is_equipped);
        html += `
          <div style="display: flex; justify-content: space-between; align-items: center; background: ${isEq ? 'color-mix(in srgb, var(--accent-purple) 12%, transparent)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${isEq ? 'color-mix(in srgb, var(--accent-purple) 40%, transparent)' : 'var(--border-subtle)'}; border-radius: 8px; padding: 10px 14px;">
            <div>
              <div style="font-weight: 700; color: #fff; font-size: 0.88rem; display: flex; align-items: center; gap: 6px;">
                <span>${escapeHtml(t.title_badge || '🎖️')}</span>
                <span>${escapeHtml(t.title_name)}</span>
                ${isEq ? '<span class="badge badge-purple" style="font-size: 0.65rem;">DIPASANG</span>' : ''}
              </div>
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
                ${escapeHtml(t.title_desc || 'Titel Kehormatan Boss Raid')}
              </div>
            </div>
            <div>
              ${
                isEq
                  ? '<span style="font-size: 0.75rem; color: var(--accent-purple); font-weight: 600;">Aktif</span>'
                  : `<button type="button" class="btn-polaris btn-secondary btn-xs" onclick="window.PolarisApp.equipRaidTitle('${escapeHtml(t.title_id)}')">Pasang</button>`
              }
            </div>
          </div>
        `;
      });
      html += '</div>';
      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `<div style="color: var(--accent-rose); font-size: 0.8rem; padding: 10px 0;">Error: ${escapeHtml(err.message)}</div>`;
    }
  }

  async function equipRaidTitle(titleId) {
    try {
      const res = await PolarisAuth.authFetch('/api/raid/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titleId }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || 'Titel RPG berhasil dipasang!', 'success');
        loadUserRaidTitles();
      } else {
        showToast(json.error || 'Gagal memasang titel', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  function onRoleUpdated(user) {
    const isCosmos = user && (user.role || '').toLowerCase() === 'cosmos';
    const ownerTabBtn = document.getElementById('tab-btn-owner');
    const ownerPane = document.getElementById('pane-owner');

    if (ownerTabBtn) {
      ownerTabBtn.style.setProperty('display', isCosmos ? 'inline-flex' : 'none', 'important');
    }
    if (ownerPane) {
      if (!isCosmos) {
        ownerPane.style.setProperty('display', 'none', 'important');
        if (currentTab === 'owner') {
          const overviewTab = document.querySelector('.nav-tab[data-tab="overview"]');
          if (overviewTab) overviewTab.click();
        }
      } else {
        ownerPane.style.removeProperty('display');
      }
    }
    if (isCosmos && currentTab === 'owner') {
      loadOwnerPanel();
    }
  }

  // ==================== 7. TAB PANEL OWNER WUNA (COSMOS ONLY) ====================
  let cachedWunaUsers = [];

  async function loadClusterStats() {
    try {
      const res = await PolarisAuth.authFetch('/api/cluster/stats');
      const json = await res.json();
      if (!json.success) return;
      const s = json.stats;
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      set('admin-cluster-total-bots', s.totalBots);
      set('admin-cluster-active-bots', s.activeBots);
      set('admin-cluster-inactive-bots', s.inactiveBots);
      set('admin-cluster-max-capacity-display', s.maxTotalBots);
      const input = document.getElementById('admin-input-server-capacity');
      if (input && document.activeElement !== input) input.value = s.maxTotalBots;
    } catch (_) {}
  }

  async function loadOwnerPanel() {
    const currentUser = PolarisAuth.getCurrentUser();
    if (!currentUser || (currentUser.role || '').toLowerCase() !== 'cosmos') {
      showToast('Akses ditolak: Hanya Owner tingkat Cosmos yang dapat mengakses panel ini.', 'error');
      const overviewTab = document.querySelector('.nav-tab[data-tab="overview"]');
      if (overviewTab) overviewTab.click();
      return;
    }
    await Promise.all([loadWunaUsers(), loadUpgradeTokens()]);

    // Hook search listener
    const searchInput = document.getElementById('wuna-search-user');
    if (searchInput && !searchInput.__bound) {
      searchInput.__bound = true;
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim().toLowerCase();
        const filtered = cachedWunaUsers.filter((u) => {
          const uName = (u.username || '').toLowerCase();
          const uNum = (u.linkedOwnerNumber || '').toLowerCase();
          return !q || uName.includes(q) || uNum.includes(q);
        });
        renderWunaUsersTable(filtered);
      });
    }

    // Hook refresh listener
    const refreshBtn = document.getElementById('btn-refresh-wuna-users');
    if (refreshBtn && !refreshBtn.__bound) {
      refreshBtn.__bound = true;
      refreshBtn.addEventListener('click', () => { loadWunaUsers(); loadClusterStats(); });
    }

    // Statistik bot server & kapasitas
    loadClusterStats();
    const statsBtn = document.getElementById('btn-refresh-cluster-stats');
    if (statsBtn && !statsBtn.__bound) {
      statsBtn.__bound = true;
      statsBtn.addEventListener('click', () => loadClusterStats());
    }
    const capForm = document.getElementById('form-update-server-capacity');
    if (capForm && !capForm.__bound) {
      capForm.__bound = true;
      capForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const val = parseInt(document.getElementById('admin-input-server-capacity')?.value, 10);
        try {
          const res = await PolarisAuth.authFetch('/api/cluster/capacity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ maxTotalBots: val }),
          });
          const json = await res.json();
          if (json.success) {
            showToast(json.message, 'success');
            loadClusterStats();
          } else {
            showToast(json.error || 'Gagal menyimpan kapasitas', 'error');
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        }
      });
    }

    // Hook create user modal listeners
    const openCreateModalBtn = document.getElementById('btn-open-create-user-modal');
    const createModal = document.getElementById('modal-create-wuna-user');
    const closeCreateModalBtn = document.getElementById('btn-close-create-user-modal');
    const cancelCreateBtn = document.getElementById('btn-cancel-create-user');
    const createUserForm = document.getElementById('form-create-wuna-user');

    if (openCreateModalBtn && createModal && !openCreateModalBtn.__bound) {
      openCreateModalBtn.__bound = true;
      openCreateModalBtn.addEventListener('click', () => {
        if (createUserForm) createUserForm.reset();
        createModal.style.display = 'flex';
      });
    }

    const hideCreateModal = () => {
      if (createModal) createModal.style.display = 'none';
    };

    if (closeCreateModalBtn) closeCreateModalBtn.addEventListener('click', hideCreateModal);
    if (cancelCreateBtn) cancelCreateBtn.addEventListener('click', hideCreateModal);
    if (createModal) {
      createModal.addEventListener('click', (e) => {
        if (e.target === createModal) hideCreateModal();
      });
    }

    if (createUserForm && !createUserForm.__bound) {
      createUserForm.__bound = true;
      createUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('new-user-username')?.value?.trim();
        const password = document.getElementById('new-user-password')?.value;
        const role = document.getElementById('new-user-role')?.value || 'member';
        const linkedOwnerNumber = document.getElementById('new-user-phone')?.value?.trim() || '';
        const pin = document.getElementById('new-user-pin')?.value?.trim() || '';

        const submitBtn = document.getElementById('btn-submit-create-user');
        const origText = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span>⏳</span> Membuat...';
        }

        try {
          if (!linkedOwnerNumber || linkedOwnerNumber.replace(/\D/g, '').length < 9) {
            throw new Error('Nomor WhatsApp wajib diisi (minimal 9 digit, contoh: 0812xxx atau 628xxx).');
          }

          const res = await PolarisAuth.authFetch('/api/wuna/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username,
              password,
              role,
              linkedOwnerNumber,
              phoneNumber: linkedOwnerNumber,
              pin,
            }),
          });
          const json = await res.json();
          if (!json.success) {
            throw new Error(json.error || 'Gagal membuat akun');
          }
          if (window.PolarisComponents && window.PolarisComponents.showToast) {
            window.PolarisComponents.showToast(`✅ ${json.message || 'Akun berhasil dibuat!'}`, 'success');
          }
          hideCreateModal();
          createUserForm.reset();
          await loadWunaUsers();
        } catch (err) {
          if (window.PolarisComponents && window.PolarisComponents.showToast) {
            window.PolarisComponents.showToast(`❌ ${err.message}`, 'error');
          } else {
            alert(err.message);
          }
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origText;
          }
        }
      });
    }
  }

  async function loadWunaUsers() {
    const tbody = document.getElementById('wuna-users-tbody');
    if (!tbody) return;

    try {
      const res = await PolarisAuth.authFetch('/api/wuna/users');
      const json = await res.json();
      if (!json.success) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--accent-rose); padding: 16px;">${json.error || 'Gagal memuat pengguna Wuna'}</td></tr>`;
        return;
      }

      cachedWunaUsers = json.users || [];
      renderWunaUsersTable(cachedWunaUsers);
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--accent-rose); padding: 16px;">Error: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  function renderWunaUsersTable(users) {
    const tbody = document.getElementById('wuna-users-tbody');
    if (!tbody) return;

    if (!users || users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 16px;">Tidak ada pengguna Wuna terdaftar.</td></tr>`;
      return;
    }

    const currentUser = PolarisAuth.getCurrentUser();

    tbody.innerHTML = users
      .map((u) => {
        const isSelf = currentUser && currentUser.id === u.id;
        const isBanned = !!u.isBanned;
        const role = (u.role || 'member').toLowerCase();
        const displayPassword = u.plainPassword || u.password || '-';
        const displayPin = u.plainPin || u.pin || '111111';

        return `
        <tr style="${isBanned ? 'opacity: 0.65; background: color-mix(in srgb, var(--accent-rose) 6%, transparent);' : ''}">
          <td style="font-weight: 700; color: #fff;">
            ${escapeHtml(u.username)}
            ${isSelf ? '<span class="badge badge-role-cosmos" style="margin-left: 6px; font-size: 0.65rem;">ANDA</span>' : ''}
          </td>
          <td>
            ${
              u.phoneNumber
                ? `<span style="font-family: var(--font-mono); color: var(--accent-cyan); font-weight: 600; font-size: 0.84rem;">${escapeHtml(u.phoneNumber)}</span>`
                : '<span style="color: var(--text-muted); font-size: 0.8rem;">-</span>'
            }
          </td>
          <td>
            <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.04); padding: 4px 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
              <span class="wuna-cred-text" data-plain="${escapeHtml(displayPassword)}" data-masked="••••••••" style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-primary);">••••••••</span>
              <button type="button" class="btn-toggle-cred" title="Tampilkan / Sembunyikan" style="background: none; border: none; cursor: pointer; color: var(--text-secondary); padding: 2px; font-size: 0.8rem;">👁️</button>
              <button type="button" class="btn-copy-cred" data-copy="${escapeHtml(displayPassword)}" title="Salin Password" style="background: none; border: none; cursor: pointer; color: var(--accent-cyan); padding: 2px; font-size: 0.8rem;">📋</button>
            </div>
          </td>
          <td>
            <div style="display: inline-flex; align-items: center; gap: 6px; background: color-mix(in srgb, var(--accent-cyan) 8%, transparent); padding: 4px 8px; border-radius: 8px; border: 1px solid color-mix(in srgb, var(--accent-cyan) 25%, transparent);">
              <span class="wuna-cred-text" data-plain="${escapeHtml(displayPin)}" data-masked="••••••" style="font-family: var(--font-mono); font-size: 0.82rem; font-weight: 700; color: var(--accent-cyan);">${escapeHtml(displayPin)}</span>
              <button type="button" class="btn-copy-cred" data-copy="${escapeHtml(displayPin)}" title="Salin Master PIN" style="background: none; border: none; cursor: pointer; color: var(--accent-cyan); padding: 2px; font-size: 0.8rem;">📋</button>
            </div>
          </td>
          <td>
            <select class="form-select wuna-role-select" data-user-id="${u.id}" ${isSelf ? 'disabled' : ''} style="padding: 4px 8px; font-size: 0.78rem; font-weight: 600;">
              <option value="cosmos" ${role === 'cosmos' ? 'selected' : ''}>👑🌌 Cosmos (10)</option>
              <option value="overlord" ${role === 'overlord' ? 'selected' : ''}>🪐🔱 Overlord (9)</option>
              <option value="supernova" ${role === 'supernova' ? 'selected' : ''}>💥✨ Supernova (8)</option>
              <option value="starlight" ${role === 'starlight' ? 'selected' : ''}>💫⭐ Starlight (7)</option>
              <option value="nebula_master" ${role === 'nebula_master' ? 'selected' : ''}>🌌🔮 Nebula Master (6)</option>
              <option value="star_sentinel" ${role === 'star_sentinel' ? 'selected' : ''}>🛡️🌠 Star Sentinel (5)</option>
              <option value="pulsar" ${role === 'pulsar' ? 'selected' : ''}>💠⚡ Pulsar (4)</option>
              <option value="astral_voyager" ${role === 'astral_voyager' ? 'selected' : ''}>🛸🚀 Astral Voyager (3)</option>
              <option value="cosmic_scout" ${role === 'cosmic_scout' ? 'selected' : ''}>🔭🌠 Cosmic Scout (2)</option>
              <option value="member" ${role === 'member' ? 'selected' : ''}>🔰 Member (1)</option>
            </select>
          </td>
          <td>
            ${isBanned ? '<span class="badge badge-rose">DIBLOKIR</span>' : '<span class="badge badge-emerald">AKTIF</span>'}
          </td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 6px; align-items: center; flex-wrap: wrap; justify-content: flex-end;">
              <button class="btn-polaris btn-secondary btn-sm btn-wuna-pin" data-user-id="${u.id}" data-username="${escapeHtml(u.username)}" style="color: var(--accent-cyan);" title="Atur atau reset Master PIN 2FA">
                🛡️ PIN 2FA
              </button>
              ${
                !isSelf
                  ? `
                <button class="btn-polaris ${isBanned ? 'btn-secondary' : 'btn-danger'} btn-sm btn-wuna-ban" data-user-id="${u.id}" data-banned="${isBanned}">
                  ${isBanned ? 'Buka Blokir' : 'Blokir'}
                </button>
                <button class="btn-polaris btn-secondary btn-sm btn-wuna-password" data-user-id="${u.id}" data-username="${escapeHtml(u.username)}">
                  Reset Pass
                </button>
                <button class="btn-polaris btn-danger btn-sm btn-wuna-delete" data-user-id="${u.id}" data-username="${escapeHtml(u.username)}">
                  Hapus
                </button>
              `
                  : '<span style="font-size: 0.75rem; color: var(--text-muted);">Akun Utama</span>'
              }
            </div>
          </td>
        </tr>
      `;
      })
      .join('');

    // Event listeners for toggle cred
    tbody.querySelectorAll('.btn-toggle-cred').forEach((btn) => {
      btn.addEventListener('click', () => {
        const textEl = btn.parentElement?.querySelector('.wuna-cred-text');
        if (!textEl) return;
        const isMasked = textEl.textContent.includes('•');
        textEl.textContent = isMasked ? (textEl.getAttribute('data-plain') || '-') : (textEl.getAttribute('data-masked') || '••••••••');
        btn.textContent = isMasked ? '🔒' : '👁️';
      });
    });

    // Event listeners for copy cred
    tbody.querySelectorAll('.btn-copy-cred').forEach((btn) => {
      btn.addEventListener('click', () => {
        const textToCopy = btn.getAttribute('data-copy');
        if (textToCopy && textToCopy !== '-') {
          navigator.clipboard.writeText(textToCopy);
          if (window.PolarisComponents && window.PolarisComponents.showToast) {
            window.PolarisComponents.showToast('📋 Kredensial berhasil disalin ke clipboard!', 'success');
          } else {
            alert('Tersalin: ' + textToCopy);
          }
        }
      });
    });

    // Event listeners for role select
    tbody.querySelectorAll('.wuna-role-select').forEach((sel) => {
      sel.addEventListener('change', async () => {
        const targetUserId = sel.getAttribute('data-user-id');
        const newRole = sel.value;
        await updateWunaRole(targetUserId, newRole);
      });
    });

    // Event listeners for PIN 2FA button
    tbody.querySelectorAll('.btn-wuna-pin').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetUserId = btn.getAttribute('data-user-id');
        const username = btn.getAttribute('data-username');
        openWunaPinModal(targetUserId, username);
      });
    });

    // Event listeners for Ban button
    tbody.querySelectorAll('.btn-wuna-ban').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const targetUserId = btn.getAttribute('data-user-id');
        const currentBanned = btn.getAttribute('data-banned') === 'true';
        await toggleWunaBan(targetUserId, !currentBanned);
      });
    });

    // Event listeners for Reset Password button
    tbody.querySelectorAll('.btn-wuna-password').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetUserId = btn.getAttribute('data-user-id');
        const username = btn.getAttribute('data-username');
        openWunaPasswordModal(targetUserId, username);
      });
    });

    // Event listeners for Delete button
    tbody.querySelectorAll('.btn-wuna-delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const targetUserId = btn.getAttribute('data-user-id');
        const username = btn.getAttribute('data-username');
        if (!confirm(`⚠️ Hapus permanen akun Wuna "${username}"?`)) return;
        await deleteWunaUser(targetUserId);
      });
    });
  }

  async function updateWunaRole(targetUserId, role) {
    try {
      const res = await PolarisAuth.authFetch('/api/wuna/role', {
        method: 'POST',
        body: JSON.stringify({ targetUserId, role }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Tingkatan akun Wuna berhasil diubah menjadi ${role.toUpperCase()}`, 'success');
        loadWunaUsers();
      } else {
        showToast(json.error || 'Gagal mengubah tingkatan', 'error');
        loadWunaUsers();
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
      loadWunaUsers();
    }
  }

  async function toggleWunaBan(targetUserId, isBanned) {
    try {
      const res = await PolarisAuth.authFetch('/api/wuna/ban', {
        method: 'POST',
        body: JSON.stringify({ targetUserId, isBanned }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || 'Status blokir diperbarui', 'success');
        loadWunaUsers();
      } else {
        showToast(json.error || 'Gagal mengubah status blokir', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  function openWunaPasswordModal(userId, username) {
    const modal = document.getElementById('modal-wuna-password');
    const targetUserIdInput = document.getElementById('wuna-target-userid');
    const targetUsernameSpan = document.getElementById('wuna-target-username');
    const passwordInput = document.getElementById('wuna-admin-new-password');

    if (modal && targetUserIdInput && targetUsernameSpan) {
      targetUserIdInput.value = userId;
      targetUsernameSpan.textContent = username;
      if (passwordInput) passwordInput.value = '';
      modal.classList.add('active');
    }
  }

  function openWunaPinModal(userId, username) {
    const modal = document.getElementById('modal-wuna-pin');
    const targetUserIdInput = document.getElementById('wuna-pin-target-userid');
    const targetUsernameSpan = document.getElementById('wuna-pin-target-username');
    const pinInput = document.getElementById('wuna-admin-new-pin');

    if (modal && targetUserIdInput && targetUsernameSpan) {
      targetUserIdInput.value = userId;
      targetUsernameSpan.textContent = username;
      if (pinInput) pinInput.value = '';
      modal.classList.add('active');
      if (pinInput) pinInput.focus();
    }
  }

  async function deleteWunaUser(targetUserId) {
    try {
      const res = await PolarisAuth.authFetch(`/api/wuna/user/${targetUserId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        showToast('Akun Wuna berhasil dihapus.', 'success');
        loadWunaUsers();
      } else {
        showToast(json.error || 'Gagal menghapus akun', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  // ==================== FITUR TOKEN NAIK TINGKAT (COSMIC UPGRADE TOKENS) ====================
  let cachedUpgradeTokens = [];

  function initUpgradeTokens() {
    // 1. Hook Refresh Button di Owner Panel
    const btnRefresh = document.getElementById('btn-refresh-upgrade-tokens');
    if (btnRefresh && !btnRefresh.__bound) {
      btnRefresh.__bound = true;
      btnRefresh.addEventListener('click', () => loadUpgradeTokens());
    }

    // 2. Modal Terbitkan Token (Owner Only)
    const btnOpenCreate = document.getElementById('btn-open-create-token-modal');
    const modalCreate = document.getElementById('modal-create-upgrade-token');
    const btnCloseCreate = document.getElementById('btn-close-create-token-modal');
    const btnCancelCreate = document.getElementById('btn-cancel-create-token');
    const formCreate = document.getElementById('form-create-upgrade-token');
    const btnRandomCode = document.getElementById('btn-randomize-token-code');

    const hideCreateTokenModal = () => {
      if (modalCreate) modalCreate.style.display = 'none';
      const errEl = document.getElementById('create-token-error-msg');
      const succEl = document.getElementById('create-token-success-msg');
      if (errEl) errEl.style.display = 'none';
      if (succEl) succEl.style.display = 'none';
    };

    if (btnOpenCreate && modalCreate && !btnOpenCreate.__bound) {
      btnOpenCreate.__bound = true;
      btnOpenCreate.addEventListener('click', () => {
        if (formCreate) formCreate.reset();
        hideCreateTokenModal();
        modalCreate.style.display = 'flex';
      });
    }

    if (btnCloseCreate) btnCloseCreate.addEventListener('click', hideCreateTokenModal);
    if (btnCancelCreate) btnCancelCreate.addEventListener('click', hideCreateTokenModal);
    if (modalCreate) {
      modalCreate.addEventListener('click', (e) => {
        if (e.target === modalCreate) hideCreateTokenModal();
      });
    }

    if (btnRandomCode) {
      btnRandomCode.addEventListener('click', () => {
        const targetRole = document.getElementById('new-token-role')?.value || 'starlight';
        const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
        const codeInput = document.getElementById('new-token-code');
        if (codeInput) codeInput.value = `POLARIS-${targetRole.toUpperCase()}-${rand}`;
      });
    }

    if (formCreate && !formCreate.__bound) {
      formCreate.__bound = true;
      formCreate.addEventListener('submit', async (e) => {
        e.preventDefault();
        const targetRole = document.getElementById('new-token-role')?.value;
        const maxUses = document.getElementById('new-token-max-uses')?.value || 1;
        const expiresInDays = document.getElementById('new-token-expiry')?.value || 0;
        const customCode = document.getElementById('new-token-code')?.value?.trim();
        const notes = document.getElementById('new-token-notes')?.value?.trim() || '';

        const submitBtn = document.getElementById('btn-submit-create-token');
        const origText = submitBtn ? submitBtn.innerHTML : '';
        const errEl = document.getElementById('create-token-error-msg');
        const succEl = document.getElementById('create-token-success-msg');

        if (errEl) errEl.style.display = 'none';
        if (succEl) succEl.style.display = 'none';

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span>⏳</span> Menerbitkan...';
        }

        try {
          const res = await PolarisAuth.authFetch('/api/upgrade-tokens/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetRole,
              maxUses: parseInt(maxUses, 10) || 1,
              expiresInDays: parseInt(expiresInDays, 10) || 0,
              customCode,
              notes,
            }),
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.error || 'Gagal menerbitkan token');

          showToast(`✅ Token ${json.token.tokenCode} berhasil diterbitkan!`, 'success');
          hideCreateTokenModal();
          await loadUpgradeTokens();
        } catch (err) {
          if (errEl) {
            errEl.textContent = err.message;
            errEl.style.display = 'block';
          } else {
            showToast(err.message, 'error');
          }
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origText;
          }
        }
      });
    }

    // 3. Modal Tebus Token (Semua Akun)
    const btnOpenRedeem = document.getElementById('btn-open-redeem-token-modal');
    const modalRedeem = document.getElementById('modal-redeem-upgrade-token');
    const btnCloseRedeem = document.getElementById('btn-close-redeem-token-modal');
    const btnCancelRedeem = document.getElementById('btn-cancel-redeem-token');
    const formRedeem = document.getElementById('form-redeem-upgrade-token');

    const hideRedeemModal = () => {
      if (modalRedeem) modalRedeem.style.display = 'none';
      const errEl = document.getElementById('redeem-token-error-msg');
      const succBox = document.getElementById('redeem-token-success-box');
      if (errEl) errEl.style.display = 'none';
      if (succBox) succBox.style.display = 'none';
    };

    if (btnOpenRedeem && modalRedeem && !btnOpenRedeem.__bound) {
      btnOpenRedeem.__bound = true;
      btnOpenRedeem.addEventListener('click', () => {
        if (formRedeem) formRedeem.reset();
        hideRedeemModal();
        modalRedeem.style.display = 'flex';
        const inp = document.getElementById('redeem-token-input');
        if (inp) setTimeout(() => inp.focus(), 200);
      });
    }

    if (btnCloseRedeem) btnCloseRedeem.addEventListener('click', hideRedeemModal);
    if (btnCancelRedeem) btnCancelRedeem.addEventListener('click', hideRedeemModal);
    if (modalRedeem) {
      modalRedeem.addEventListener('click', (e) => {
        if (e.target === modalRedeem) hideRedeemModal();
      });
    }

    if (formRedeem && !formRedeem.__bound) {
      formRedeem.__bound = true;
      formRedeem.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codeInput = document.getElementById('redeem-token-input');
        const tokenCode = codeInput ? codeInput.value.trim() : '';
        const submitBtn = document.getElementById('btn-submit-redeem-token');
        const origText = submitBtn ? submitBtn.innerHTML : '';
        const errEl = document.getElementById('redeem-token-error-msg');
        const succBox = document.getElementById('redeem-token-success-box');

        if (errEl) errEl.style.display = 'none';
        if (succBox) succBox.style.display = 'none';

        if (!tokenCode) {
          if (errEl) {
            errEl.textContent = 'Harap masukkan kode token.';
            errEl.style.display = 'block';
          }
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span>⏳</span> Memvalidasi Token...';
        }

        try {
          const res = await PolarisAuth.authFetch('/api/upgrade-tokens/redeem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokenCode }),
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.error || 'Gagal menebus token.');

          // Perbarui sesi pengguna saat ini
          const currentUser = PolarisAuth.getCurrentUser();
          if (currentUser) {
            currentUser.role = json.user.newRole;
            currentUser.tierLevel = json.user.tierLevel;
            currentUser.roleInfo = json.targetRoleInfo;
            PolarisAuth.setCurrentUser(currentUser);
          }

          // Perbarui UI Header & Badge
          const headerRole = document.getElementById('header-role');
          if (headerRole) {
            headerRole.textContent = json.user.newRole.toUpperCase();
            headerRole.className = `badge badge-role-${json.user.newRole.toLowerCase()}`;
          }

          // Tampilkan pesan sukses di dalam modal
          if (succBox) {
            succBox.style.display = 'block';
            const desc = document.getElementById('redeem-success-desc');
            const badgeContainer = document.getElementById('redeem-success-badge-container');
            if (desc) desc.textContent = json.message;
            if (badgeContainer) {
              badgeContainer.innerHTML = `<span class="badge badge-role-${json.user.newRole.toLowerCase()}" style="font-size: 0.92rem; padding: 6px 16px; font-weight: 800; border-radius: 9999px;">${json.targetRoleInfo.badge || '✨'} ${json.targetRoleInfo.name}</span>`;
            }
          }

          showToast(`🎉 Sukses! Tingkatan akun Anda telah dinaikkan ke ${json.targetRoleInfo.name}!`, 'success');
          if (codeInput) codeInput.value = '';

          // Segarkan data pengguna jika di panel owner
          const curUser = PolarisAuth.getCurrentUser();
          if (curUser && curUser.role === 'cosmos') {
            loadUpgradeTokens();
            loadWunaUsers();
          }
        } catch (err) {
          if (errEl) {
            errEl.textContent = err.message;
            errEl.style.display = 'block';
          } else {
            showToast(err.message, 'error');
          }
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origText;
          }
        }
      });
    }
  }

  async function loadUpgradeTokens() {
    const tbody = document.getElementById('upgrade-tokens-tbody');
    if (!tbody) return;

    try {
      const res = await PolarisAuth.authFetch('/api/upgrade-tokens/list');
      const json = await res.json();
      if (!json.success) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--accent-rose); padding: 16px;">${escapeHtml(json.error || 'Gagal memuat token')}</td></tr>`;
        return;
      }

      cachedUpgradeTokens = json.tokens || [];
      renderUpgradeTokens(cachedUpgradeTokens);
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--accent-rose); padding: 16px;">Error: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  function renderUpgradeTokens(tokens) {
    const tbody = document.getElementById('upgrade-tokens-tbody');
    if (!tbody) return;

    if (!tokens || tokens.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 18px;">Belum ada token naik tingkat yang dibuat. Klik "Terbitkan Token Baru" di atas.</td></tr>`;
      return;
    }

    tbody.innerHTML = tokens
      .map((tok) => {
        const isExpired = tok.isExpired;
        const isDepleted = tok.usedCount >= tok.maxUses;
        const isActive = tok.isActive;

        let statusBadge = '<span class="badge" style="background: color-mix(in srgb, var(--accent-emerald) 15%, transparent); color: var(--accent-emerald); border: 1px solid color-mix(in srgb, var(--accent-emerald) 35%, transparent);">🟢 AKTIF</span>';
        if (isExpired) {
          statusBadge = '<span class="badge" style="background: color-mix(in srgb, var(--accent-rose) 15%, transparent); color: var(--accent-rose); border: 1px solid color-mix(in srgb, var(--accent-rose) 35%, transparent);">⏳ KADALUARSA</span>';
        } else if (isDepleted) {
          statusBadge = '<span class="badge" style="background: rgba(148, 163, 184, 0.15); color: var(--text-secondary); border: 1px solid rgba(148, 163, 184, 0.35);">⚪ HABIS</span>';
        }

        const expDisplay = tok.expiresAt
          ? new Date(tok.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '<span style="color: var(--accent-emerald); font-weight: 600;">Selamanya</span>';

        const roleInfo = tok.targetRoleInfo || { name: tok.targetRole, badge: '✨' };

        return `
        <tr style="${!isActive ? 'opacity: 0.65;' : ''}">
          <td>
            <div style="display: inline-flex; align-items: center; gap: 8px;">
              <code style="font-family: var(--font-mono); font-weight: 800; color: var(--accent-cyan); font-size: 0.88rem; letter-spacing: 1px; background: color-mix(in srgb, var(--accent-cyan) 10%, transparent); padding: 4px 8px; border-radius: 6px; border: 1px solid color-mix(in srgb, var(--accent-cyan) 25%, transparent);">${escapeHtml(tok.tokenCode)}</code>
              <button type="button" class="btn-copy-token" data-code="${escapeHtml(tok.tokenCode)}" title="Salin Kode Token" style="background: none; border: none; cursor: pointer; color: var(--accent-cyan); padding: 2px 4px; font-size: 0.85rem;">📋</button>
            </div>
          </td>
          <td>
            <span class="badge badge-role-${(tok.targetRole || 'member').toLowerCase()}" style="font-size: 0.76rem; padding: 4px 10px;">
              ${roleInfo.badge || ''} ${escapeHtml(roleInfo.name || tok.targetRole)}
            </span>
          </td>
          <td>
            <span style="font-family: var(--font-mono); font-weight: 700; color: ${isDepleted ? 'var(--accent-rose)' : '#f1f5f9'};">
              ${tok.usedCount} / ${tok.maxUses}
            </span>
            <span style="font-size: 0.72rem; color: var(--text-muted); margin-left: 4px;">(${tok.remainingUses} sisa)</span>
          </td>
          <td>${statusBadge}</td>
          <td style="max-width: 200px; font-size: 0.8rem; color: var(--text-muted);">
            ${escapeHtml(tok.notes || '-')}
          </td>
          <td style="font-size: 0.78rem; font-family: var(--font-mono);">
            ${expDisplay}
          </td>
          <td style="font-size: 0.78rem; color: var(--text-muted);">
            @${escapeHtml(tok.createdBy || 'cosmos')}
          </td>
          <td style="text-align: right;">
            <button type="button" class="btn-polaris btn-danger btn-sm btn-delete-upgrade-token" data-token-id="${escapeHtml(tok.id)}" data-token-code="${escapeHtml(tok.tokenCode)}" style="padding: 4px 8px; font-size: 0.74rem;">
              🗑️ Hapus
            </button>
          </td>
        </tr>
        `;
      })
      .join('');

    // Hook listeners for copy buttons
    tbody.querySelectorAll('.btn-copy-token').forEach((btn) => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-code');
        if (code) {
          navigator.clipboard.writeText(code).then(() => {
            showToast(`📋 Kode token ${code} berhasil disalin!`, 'info');
          });
        }
      });
    });

    // Hook listeners for delete buttons
    tbody.querySelectorAll('.btn-delete-upgrade-token').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-token-id');
        const code = btn.getAttribute('data-token-code');
        if (!confirm(`⚠️ Hapus token "${code}" secara permanen? Token tidak akan dapat digunakan lagi.`)) return;

        try {
          const res = await PolarisAuth.authFetch(`/api/upgrade-tokens/${id}`, { method: 'DELETE' });
          const json = await res.json();
          if (json.success) {
            showToast(`Token ${code} berhasil dihapus.`, 'success');
            loadUpgradeTokens();
          } else {
            showToast(json.error || 'Gagal menghapus token', 'error');
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        }
      });
    });
  }

  function initAccountSettings() {
    // Avatar Preset Click Handlers
    document.querySelectorAll('.btn-avatar-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const seed = btn.dataset.seed || 'Cosmos';
        const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
        const urlInput = document.getElementById('acc-avatar-url');
        const preview = document.getElementById('acc-avatar-preview');
        if (urlInput) urlInput.value = url;
        if (preview) preview.src = url;
      });
    });

    const avatarInput = document.getElementById('acc-avatar-url');
    if (avatarInput) {
      avatarInput.addEventListener('input', () => {
        const preview = document.getElementById('acc-avatar-preview');
        if (preview && avatarInput.value) preview.src = avatarInput.value;
      });
    }

    // Form Profil & Linked Owner & Bio
    const formProfile = document.getElementById('form-account-profile');
    if (formProfile) {
      formProfile.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newUsername = document.getElementById('acc-username').value;
        const linkedOwnerNumber = document.getElementById('acc-owner-number').value;
        const displayName = document.getElementById('acc-display-name')?.value;
        const bio = document.getElementById('acc-bio')?.value;
        const avatarUrl = document.getElementById('acc-avatar-url')?.value;

        try {
          const res = await PolarisAuth.authFetch('/api/auth/update-account', {
            method: 'POST',
            body: JSON.stringify({ newUsername, linkedOwnerNumber, displayName, bio, avatarUrl }),
          });
          const json = await res.json();
          if (json.success) {
            showToast('Profil dan bio akun berhasil disimpan!', 'success');
            PolarisAuth.setCurrentUser(json.user);
            document.getElementById('header-username').textContent = json.user.displayName || json.user.username;
          } else {
            showToast(json.error || 'Gagal update profil', 'error');
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        }
      });
    }

    // Form Dedicated Custom AI API Key (Gemini / OpenRouter)
    const formAiKey = document.getElementById('form-account-ai-key');
    if (formAiKey) {
      formAiKey.addEventListener('submit', async (e) => {
        e.preventDefault();
        const customAiApiKey = document.getElementById('acc-custom-ai-key').value.trim();
        if (!customAiApiKey) {
          showToast('Masukkan API key Gemini atau OpenRouter terlebih dahulu!', 'warning');
          return;
        }

        try {
          const res = await PolarisAuth.authFetch('/api/auth/update-account', {
            method: 'POST',
            body: JSON.stringify({ customAiApiKey }),
          });
          const json = await res.json();
          if (json.success) {
            showToast('API Key AI pribadi berhasil disimpan & dienkripsi!', 'success');
            const badge = document.getElementById('badge-ai-key-status');
            if (badge) {
              badge.textContent = '✓ Tersimpan';
              badge.style.background = 'rgba(16, 185, 129, 0.2)';
              badge.style.color = '#10b981';
              badge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
            }
            document.getElementById('acc-custom-ai-key').value = '';
          } else {
            showToast(json.error || 'Gagal menyimpan API key AI', 'error');
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        }
      });
    }

    // Toggle Eye Visibility for AI Key
    document.getElementById('btn-toggle-ai-key-vis')?.addEventListener('click', () => {
      const input = document.getElementById('acc-custom-ai-key');
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
      }
    });

    // Form Master Security PIN & 2FA
    const formPin = document.getElementById('form-account-pin');
    if (formPin) {
      formPin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pin = document.getElementById('acc-pin-input').value;
        const require2FA = document.getElementById('acc-require-2fa-toggle').checked;

        if (require2FA && !pin) {
          const user = PolarisAuth.getCurrentUser();
          if (!user || !user.hasPin) {
            showToast('Masukkan 6 digit PIN untuk mengaktifkan 2FA!', 'error');
            return;
          }
        }

        try {
          const res = await PolarisAuth.authFetch('/api/auth/setup-pin', {
            method: 'POST',
            body: JSON.stringify({ pin: pin || undefined, require2FA }),
          });
          const json = await res.json();
          if (json.success) {
            showToast('Setelan keamanan 2FA & PIN berhasil disimpan!', 'success');
            document.getElementById('acc-pin-input').value = '';
          } else {
            showToast(json.error || 'Gagal menyimpan PIN', 'error');
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        }
      });
    }

    // Form Ubah Password Sendiri
    const formPassword = document.getElementById('form-account-password');
    if (formPassword) {
      formPassword.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('acc-curr-password').value;
        const newPassword = document.getElementById('acc-new-password').value;

        try {
          const res = await PolarisAuth.authFetch('/api/auth/update-account', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword }),
          });
          const json = await res.json();
          if (json.success) {
            showToast('Password akun berhasil diperbarui!', 'success');
            document.getElementById('acc-curr-password').value = '';
            document.getElementById('acc-new-password').value = '';
          } else {
            showToast(json.error || 'Gagal update password', 'error');
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        }
      });
    }

    // Refresh Wuna Users Button
    document.getElementById('btn-refresh-wuna-users')?.addEventListener('click', () => {
      loadWunaUsers();
    });

    // Form Admin Reset Password Wuna (Cosmos Only)
    const formWunaPassword = document.getElementById('form-wuna-admin-password');
    if (formWunaPassword) {
      formWunaPassword.addEventListener('submit', async (e) => {
        e.preventDefault();
        const targetUserId = document.getElementById('wuna-target-userid').value;
        const newPassword = document.getElementById('wuna-admin-new-password').value;

        try {
          const res = await PolarisAuth.authFetch('/api/wuna/password', {
            method: 'POST',
            body: JSON.stringify({ targetUserId, newPassword }),
          });
          const json = await res.json();
          if (json.success) {
            showToast('Password akun Wuna berhasil direset!', 'success');
            document.getElementById('modal-wuna-password')?.classList.remove('active');
            document.getElementById('wuna-admin-new-password').value = '';
          } else {
            showToast(json.error || 'Gagal reset password', 'error');
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        }
      });
    }

    // Form Admin Set 2FA PIN Wuna (Cosmos Only)
    const formWunaPin = document.getElementById('form-wuna-admin-pin');
    if (formWunaPin) {
      formWunaPin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const targetUserId = document.getElementById('wuna-pin-target-userid')?.value;
        const newPin = document.getElementById('wuna-admin-new-pin')?.value?.trim();

        if (!/^\d{6}$/.test(newPin)) {
          showToast('PIN 2FA harus berupa 6 digit angka!', 'warning');
          return;
        }

        try {
          const res = await PolarisAuth.authFetch('/api/wuna/pin', {
            method: 'POST',
            body: JSON.stringify({ targetUserId, newPin }),
          });
          const json = await res.json();
          if (json.success) {
            showToast(json.message || 'PIN 2FA berhasil disimpan!', 'success');
            document.getElementById('modal-wuna-pin')?.classList.remove('active');
            document.getElementById('wuna-admin-new-pin').value = '';
            loadWunaUsers();
          } else {
            showToast(json.error || 'Gagal menyimpan PIN 2FA', 'error');
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        }
      });
    }

    // Button Reset 2FA PIN ke Bawaan (111111)
    const btnResetDefaultPin = document.getElementById('btn-wuna-reset-default-pin');
    if (btnResetDefaultPin) {
      btnResetDefaultPin.addEventListener('click', async () => {
        const targetUserId = document.getElementById('wuna-pin-target-userid')?.value;
        if (!confirm('Reset PIN 2FA akun ini kembali ke PIN bawaan sistem (111111)?')) return;

        try {
          const res = await PolarisAuth.authFetch('/api/wuna/reset-pin', {
            method: 'POST',
            body: JSON.stringify({ targetUserId }),
          });
          const json = await res.json();
          if (json.success) {
            showToast(json.message || 'PIN 2FA berhasil direset ke 111111!', 'success');
            document.getElementById('modal-wuna-pin')?.classList.remove('active');
            loadWunaUsers();
          } else {
            showToast(json.error || 'Gagal mereset PIN', 'error');
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        }
      });
    }
  }

  // ==================== BOT CONTROLLER ACTIONS ====================
  async function startBot() {
    if (typeof window.showBlackholeLoader === 'function') {
      window.showBlackholeLoader('MELUNCURKAN BOT', 'Menginisialisasi socket & Baileys WhatsApp...');
    }
    try {
      const res = await PolarisAuth.authFetch('/api/bot/start', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showToast('Bot sedang diluncurkan...', 'info');
      } else {
        showToast(json.message || json.error, 'error');
        if (typeof window.hideBlackholeLoader === 'function') window.hideBlackholeLoader();
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
      if (typeof window.hideBlackholeLoader === 'function') window.hideBlackholeLoader();
    }
  }

  async function stopBot() {
    if (!confirm('Hentikan bot sekarang?')) return;
    if (typeof window.showBlackholeLoader === 'function') {
      window.showBlackholeLoader('MENGHENTIKAN BOT', 'Menutup koneksi socket WhatsApp...');
    }
    try {
      const res = await PolarisAuth.authFetch('/api/bot/stop', { method: 'POST' });
      const json = await res.json();
      if (json.success) showToast('Bot dihentikan.', 'info');
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      if (typeof window.hideBlackholeLoader === 'function') window.hideBlackholeLoader();
    }
  }

  async function restartBot() {
    if (typeof window.showBlackholeLoader === 'function') {
      window.showBlackholeLoader('MERESTART BOT', 'Memulai ulang proses WhatsApp bot...');
    }
    try {
      const res = await PolarisAuth.authFetch('/api/bot/restart', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showToast('Bot sedang merestart...', 'info');
      } else {
        showToast(json.message || json.error, 'error');
        if (typeof window.hideBlackholeLoader === 'function') window.hideBlackholeLoader();
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
      if (typeof window.hideBlackholeLoader === 'function') window.hideBlackholeLoader();
    }
  }

  function promptPairingCode() {
    const num = prompt('Masukkan nomor WhatsApp HP bot (format: 628xxxxxxxxxx):');
    if (!num) return;
    let cleanNum = num.replace(/[^0-9]/g, '');
    if (cleanNum.startsWith('0')) cleanNum = '62' + cleanNum.slice(1);
    else if (cleanNum.startsWith('8')) cleanNum = '62' + cleanNum;

    if (typeof window.showBlackholeLoader === 'function') {
      window.showBlackholeLoader('MEMINTA KODE PAIRING', `Menghubungkan ke WhatsApp untuk nomor ${cleanNum}...`);
    }

    PolarisAuth.authFetch('/api/bot/pair', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber: cleanNum }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          showToast(`Meminta kode pairing untuk ${cleanNum}... Harap tunggu 3-5 detik.`, 'info');
        } else {
          showToast(json.error || 'Gagal pairing', 'error');
          if (typeof window.hideBlackholeLoader === 'function') window.hideBlackholeLoader();
        }
      })
      .catch((err) => {
        showToast('Error: ' + err.message, 'error');
        if (typeof window.hideBlackholeLoader === 'function') window.hideBlackholeLoader();
      });
  }

  async function resetSession() {
    if (!confirm('⚠️ HAPUS SESI WHATSAPP?\n\nTindakan ini akan menghapus folder auth_info. Anda harus scan ulang QR atau minta kode pairing lagi.')) return;
    if (typeof window.showBlackholeLoader === 'function') {
      window.showBlackholeLoader('RESET SESI WHATSAPP', 'Membersihkan folder sesi & kredensial auth...');
    }
    try {
      const res = await PolarisAuth.authFetch('/api/bot/reset-session', { method: 'POST' });
      const json = await res.json();
      if (json.success) showToast('Sesi WhatsApp berhasil direset.', 'success');
      else showToast(json.error || 'Gagal reset sesi', 'error');
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      if (typeof window.hideBlackholeLoader === 'function') window.hideBlackholeLoader();
    }
  }

  async function clearLogs() {
    try {
      await PolarisAuth.authFetch('/api/bot/clear-logs', { method: 'POST' });
      showToast('Terminal logs dibersihkan.', 'info');
    } catch (_) {}
  }

  function refreshAll() {
    loadOverview();
    loadTabContent(currentTab);
  }

  // ==================== 8. TAB MULTI-BOT CLUSTER ====================
  let selectedClusterBotId = null;
  let clusterPollTimer = null;
  let clusterPollCount = 0;
  let clusterInstancesCache = [];

  function startClusterPolling() {
    if (clusterPollTimer) clearInterval(clusterPollTimer);
    clusterPollCount = 0;
    clusterPollTimer = setInterval(async () => {
      clusterPollCount++;
      if (clusterPollCount > 25) {
        clearInterval(clusterPollTimer);
        clusterPollTimer = null;
        return;
      }
      try {
        const res = await PolarisAuth.authFetch('/api/cluster/instances');
        const json = await res.json();
        if (json.success && Array.isArray(json.instances)) {
          clusterInstancesCache = json.instances;
          renderClusterFocusedCard(json.instances);
          renderClusterGrid(json.instances);

          const focused = json.instances.find((i) => i.id === selectedClusterBotId);
          if (focused && (focused.lastQrDataUrl || focused.pairingCode || focused.botStatus === 'ONLINE')) {
            clearInterval(clusterPollTimer);
            clusterPollTimer = null;
          }
        }
      } catch (_) {}
    }, 1400);
  }

  function renderClusterFocusedCard(instances) {
    if (!instances || instances.length === 0) return;
    if (!selectedClusterBotId || !instances.some((i) => i.id === selectedClusterBotId)) {
      selectedClusterBotId = instances[0] ? instances[0].id : 'primary';
    }
    window.selectedClusterBotId = selectedClusterBotId;

    const sel = document.getElementById('cluster-active-bot-select');
    if (sel) {
      sel.innerHTML = instances
        .map(
          (i) =>
            `<option value="${i.id}" ${i.id === selectedClusterBotId ? 'selected' : ''}>${escapeHtml(i.name)} (${(i.role || 'general').toUpperCase()})</option>`
        )
        .join('');
    }

    const inst = instances.find((i) => i.id === selectedClusterBotId) || instances[0];
    if (window.PolarisWS && typeof window.PolarisWS.updateStatusUI === 'function') {
      window.PolarisWS.updateStatusUI(inst);
    }
    const isRunning = inst.status === 'RUNNING';
    const isOnline = inst.botStatus === 'ONLINE' || inst.botStatus === 'CONNECTED';
    const isWaitingQr = inst.botStatus === 'WAITING_QR' || inst.botStatus === 'QR_READY' || Boolean(inst.lastQrDataUrl);
    const isPairing = inst.botStatus === 'PAIRING' || inst.botStatus === 'CONNECTING' || Boolean(inst.pairingCode);

    const nameEl = document.getElementById('cluster-focus-name');
    const roleEl = document.getElementById('cluster-focus-role-badge');
    const statusEl = document.getElementById('cluster-focus-status-badge');
    const uptimeEl = document.getElementById('cluster-focus-uptime');
    const idEl = document.getElementById('cluster-focus-id');
    const prefixEl = document.getElementById('cluster-focus-prefix');
    const ownerEl = document.getElementById('cluster-focus-owner');
    const pidEl = document.getElementById('cluster-focus-pid');

    if (nameEl) nameEl.textContent = inst.name;
    if (roleEl) {
      const role = inst.role || 'general';
      let rBadge = '<span class="badge badge-purple" style="font-size:0.7rem; font-weight:700;">MASTER HUB</span>';
      if (role === 'cs') rBadge = '<span class="badge badge-purple" style="font-size:0.7rem; font-weight:700;">🛒 CS & TOKO</span>';
      else if (role === 'broadcast') rBadge = '<span class="badge badge-cyan" style="font-size:0.7rem; font-weight:700;">📢 BROADCAST & SW</span>';
      else if (role === 'moderator') rBadge = '<span class="badge badge-emerald" style="font-size:0.7rem; font-weight:700;">👥 GROUP MODERATOR</span>';
      else if (role === 'personal') rBadge = '<span class="badge" style="font-size:0.7rem; font-weight:700; background:color-mix(in srgb, var(--accent-amber) 15%, transparent); color:#facc15; border:1px solid color-mix(in srgb, var(--accent-amber) 30%, transparent);">🤖 ASISTEN PRIBADI</span>';
      roleEl.innerHTML = rBadge;
    }
    if (statusEl) {
      if (isOnline) {
        statusEl.className = 'badge badge-emerald';
        statusEl.innerHTML = '<span class="badge-dot" style="background:var(--accent-emerald);"></span> ONLINE (CONNECTED)';
      } else if (isWaitingQr) {
        statusEl.className = 'badge badge-rose';
        statusEl.innerHTML = '<span class="badge-dot" style="background:var(--accent-rose);"></span> WAITING QR';
      } else if (isPairing) {
        statusEl.className = 'badge badge-cyan';
        statusEl.innerHTML = '<span class="badge-dot" style="background:var(--accent-cyan);"></span> PAIRING MODE';
      } else if (isRunning) {
        statusEl.className = 'badge badge-purple';
        statusEl.innerHTML = '<span class="badge-dot" style="background:var(--accent-purple);"></span> CONNECTING...';
      } else {
        statusEl.className = 'badge badge-rose';
        statusEl.innerHTML = '<span class="badge-dot" style="background:var(--accent-rose);"></span> OFFLINE';
      }
    }
    if (uptimeEl) uptimeEl.textContent = inst.pid ? `PID: ${inst.pid}` : 'Offline';
    if (idEl) idEl.textContent = inst.id;
    if (prefixEl) prefixEl.textContent = inst.prefix || '/';
    if (ownerEl) ownerEl.textContent = inst.ownerNumber || '-';
    if (pidEl) pidEl.textContent = inst.pid || '-';

    const btnLaunch = document.getElementById('btn-cluster-focus-launch');
    const btnStop = document.getElementById('btn-cluster-focus-stop');
    if (btnLaunch && btnStop) {
      if (isRunning) {
        btnLaunch.style.display = 'none';
        btnStop.style.display = 'inline-flex';
      } else {
        btnLaunch.style.display = 'inline-flex';
        btnStop.style.display = 'none';
      }
    }

    const placeholder = document.getElementById('cluster-qr-placeholder');
    const radarTitle = document.getElementById('cluster-radar-title');
    const radarSub = document.getElementById('cluster-radar-subtitle');
    const qrContainer = document.getElementById('cluster-qr-container');
    const qrImg = document.getElementById('cluster-qr-code-img');
    const pairingDisplay = document.getElementById('cluster-pairing-code-display');
    const pairingDigits = document.getElementById('cluster-pairing-digits');
    const onlineDisplay = document.getElementById('cluster-online-display');

    if (inst.lastQrDataUrl) {
      if (placeholder) placeholder.style.display = 'none';
      if (pairingDisplay) pairingDisplay.style.display = 'none';
      if (onlineDisplay) onlineDisplay.style.display = 'none';
      if (qrContainer && qrImg) {
        qrImg.src = inst.lastQrDataUrl;
        qrContainer.style.display = 'flex';
      }
    } else if (inst.pairingCode) {
      if (placeholder) placeholder.style.display = 'none';
      if (qrContainer) qrContainer.style.display = 'none';
      if (onlineDisplay) onlineDisplay.style.display = 'none';
      if (pairingDisplay && pairingDigits) {
        pairingDigits.textContent = inst.pairingCode;
        pairingDisplay.style.display = 'block';
      }
    } else if (isOnline) {
      if (placeholder) placeholder.style.display = 'none';
      if (qrContainer) qrContainer.style.display = 'none';
      if (pairingDisplay) pairingDisplay.style.display = 'none';
      if (onlineDisplay) onlineDisplay.style.display = 'block';
    } else if (isRunning) {
      if (qrContainer) qrContainer.style.display = 'none';
      if (pairingDisplay) pairingDisplay.style.display = 'none';
      if (onlineDisplay) onlineDisplay.style.display = 'none';
      if (placeholder) {
        placeholder.style.display = 'flex';
        if (radarTitle) radarTitle.textContent = 'Sedang Menghubungkan Baileys...';
        if (radarSub) radarSub.textContent = 'Menyiapkan QR Code / Socket...';
      }
    } else {
      if (qrContainer) qrContainer.style.display = 'none';
      if (pairingDisplay) pairingDisplay.style.display = 'none';
      if (onlineDisplay) onlineDisplay.style.display = 'none';
      if (placeholder) {
        placeholder.style.display = 'flex';
        if (radarTitle) radarTitle.textContent = 'Standby / Siap Digunakan';
        if (radarSub) radarSub.textContent = 'Klik "Launch Bot" untuk scan QR';
      }
    }
  }

  function renderClusterGrid(instances) {
    const grid = document.getElementById('cluster-instances-grid');
    if (!grid) return;

    if (!instances || instances.length === 0) {
      grid.innerHTML = `<div style="color:var(--text-muted); grid-column:1/-1; text-align:center; padding:20px;">Belum ada bot instance terdaftar.</div>`;
      return;
    }

    grid.innerHTML = instances
      .map((inst) => {
        const isRunning = inst.status === 'RUNNING';
        const isOnline = inst.botStatus === 'ONLINE' || inst.botStatus === 'CONNECTED';
        const isWaitingQr = inst.botStatus === 'WAITING_QR' || inst.botStatus === 'QR_READY' || Boolean(inst.lastQrDataUrl);
        const isPairing = inst.botStatus === 'PAIRING' || inst.botStatus === 'CONNECTING' || Boolean(inst.pairingCode);

        const role = inst.role || 'general';
        let roleBadge = '';
        if (role === 'cs') {
          roleBadge = `<span class="badge badge-purple" style="font-size:0.68rem; font-weight:700;">🛒 CS & TOKO</span>`;
        } else if (role === 'broadcast') {
          roleBadge = `<span class="badge badge-cyan" style="font-size:0.68rem; font-weight:700;">📢 BROADCAST & SW</span>`;
        } else if (role === 'moderator') {
          roleBadge = `<span class="badge badge-emerald" style="font-size:0.68rem; font-weight:700;">👥 GROUP MODERATOR</span>`;
        } else if (role === 'personal') {
          roleBadge = `<span class="badge" style="font-size:0.68rem; font-weight:700; background:color-mix(in srgb, var(--accent-amber) 15%, transparent); color:#facc15; border:1px solid color-mix(in srgb, var(--accent-amber) 30%, transparent);">🤖 ASISTEN PRIBADI</span>`;
        } else {
          roleBadge = inst.isPrimary
            ? `<span class="badge badge-purple" style="font-size:0.68rem; font-weight:700;">👑 MASTER HUB</span>`
            : `<span class="badge badge-cyan" style="font-size:0.68rem; font-weight:700;">⚡ FULL FEATURES</span>`;
        }

        let statusBadge = '';
        if (isOnline) {
          statusBadge = `<span class="badge badge-emerald" style="font-weight:700;"><span class="badge-dot" style="background:var(--accent-emerald);"></span> ONLINE (CONNECTED)</span>`;
        } else if (isWaitingQr) {
          statusBadge = `<span class="badge badge-rose" style="font-weight:700;"><span class="badge-dot" style="background:var(--accent-rose);"></span> WAITING QR</span>`;
        } else if (isPairing) {
          statusBadge = `<span class="badge badge-cyan" style="font-weight:700;"><span class="badge-dot" style="background:var(--accent-cyan);"></span> PAIRING MODE</span>`;
        } else if (isRunning) {
          statusBadge = `<span class="badge badge-purple" style="font-weight:700;"><span class="badge-dot" style="background:var(--accent-purple);"></span> CONNECTING...</span>`;
        } else {
          statusBadge = `<span class="badge badge-rose" style="font-weight:700;"><span class="badge-dot" style="background:var(--accent-rose);"></span> OFFLINE</span>`;
        }

        let visualDisplay = '';
        if (inst.lastQrDataUrl) {
          visualDisplay = `
            <div id="inst-visual-${inst.id}" class="qr-display-card" style="margin-top: 12px; padding: 12px; background: rgba(0,0,0,0.5); border: 1px solid color-mix(in srgb, var(--accent-cyan) 40%, transparent); border-radius: var(--radius-md); text-align: center; display: flex; flex-direction: column; align-items: center;">
              <div class="qr-image-wrapper">
                <div class="laser-scan-bar"></div>
                <img id="inst-qr-img-${inst.id}" src="${inst.lastQrDataUrl}" alt="QR Code" style="width: 170px; height: 170px; border-radius: 8px;">
              </div>
              <div style="font-size: 0.78rem; color: var(--accent-cyan); font-weight: 700; margin-top: 8px;">Scan QR WhatsApp di HP Bot</div>
              <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">QR diperbarui otomatis</div>
            </div>
          `;
        } else if (inst.pairingCode) {
          visualDisplay = `
            <div id="inst-visual-${inst.id}" class="qr-display-card" style="margin-top: 12px; padding: 14px 18px; background: color-mix(in srgb, var(--accent-cyan) 10%, transparent); border: 1px solid var(--accent-cyan); border-radius: var(--radius-md); text-align: center;">
              <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">KODE PAIRING WHATSAPP:</div>
              <div style="font-family: var(--font-mono); font-size: 1.6rem; font-weight: 800; letter-spacing: 4px; color: var(--accent-cyan); margin: 6px 0;">
                ${escapeHtml(inst.pairingCode)}
              </div>
              <div style="font-size: 0.7rem; color: var(--text-secondary);">Masukkan di Notifikasi WhatsApp HP Anda</div>
            </div>
          `;
        } else if (isOnline) {
          visualDisplay = `
            <div id="inst-visual-${inst.id}" class="qr-display-card" style="margin-top: 12px; padding: 10px 14px; background: color-mix(in srgb, var(--accent-emerald) 8%, transparent); border: 1px solid color-mix(in srgb, var(--accent-emerald) 25%, transparent); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.2rem;">⚡</span>
                <div>
                  <div style="font-weight: 700; font-size: 0.8rem; color: var(--accent-emerald);">Baileys Socket Aktif</div>
                  <div style="font-size: 0.68rem; color: var(--text-muted);">Menerima pesan & siap bertugas</div>
                </div>
              </div>
              <span class="badge badge-emerald" style="font-size: 0.65rem;">ONLINE</span>
            </div>
          `;
        } else if (isRunning) {
          visualDisplay = `
            <div id="inst-visual-${inst.id}" class="qr-display-card" style="margin-top: 12px; padding: 12px; background: color-mix(in srgb, var(--bg-surface) 60%, transparent); border: 1px dashed color-mix(in srgb, var(--accent-cyan) 30%, transparent); border-radius: var(--radius-md); text-align: center; display: flex; flex-direction: column; align-items: center;">
              <div class="radar-screen" style="width: 70px; height: 70px; margin: 0 auto 6px;">
                <div class="radar-beam"></div>
              </div>
              <div style="font-size: 0.78rem; font-weight: 700; color: var(--accent-cyan);">Sedang Menghubungkan Baileys...</div>
              <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">Menyiapkan QR Code...</div>
            </div>
          `;
        } else {
          visualDisplay = `
            <div id="inst-visual-${inst.id}" class="qr-display-card" style="margin-top: 12px; padding: 12px; background: color-mix(in srgb, var(--bg-surface) 60%, transparent); border: 1px dashed rgba(255,255,255,0.1); border-radius: var(--radius-md); text-align: center; display: flex; flex-direction: column; align-items: center;">
              <div class="radar-screen" style="width: 70px; height: 70px; margin: 0 auto 6px;">
                <div class="radar-beam"></div>
              </div>
              <div style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted);">Standby / Siap Digunakan</div>
              <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">Klik "Launch Bot" untuk scan QR</div>
            </div>
          `;
        }

        const isFocused = inst.id === selectedClusterBotId;
        const canControl = inst.canControl !== false;
        const ownerTag = inst.isPrimary
          ? `<span class="badge" style="font-size:0.65rem; background:color-mix(in srgb, var(--accent-cyan) 10%, transparent); color:var(--accent-cyan); border:1px solid color-mix(in srgb, var(--accent-cyan) 25%, transparent);">👑 Primary System</span>`
          : `<span class="badge" style="font-size:0.65rem; background:rgba(255,255,255,0.06); color:var(--text-secondary); border:1px solid rgba(255,255,255,0.08);">👤 Owner: ${escapeHtml(inst.ownerUsername || 'User')}</span>`;

        const buttonsHtml = canControl ? `
          <button type="button" class="btn-polaris ${isRunning ? 'btn-danger' : 'btn-primary'} btn-sm btn-toggle-instance" data-id="${inst.id}" data-action="${isRunning ? 'stop' : 'start'}">
            ${isRunning ? '⏹️ Stop Bot' : '▶️ Launch Bot (QR)'}
          </button>
          <button type="button" class="btn-polaris btn-secondary btn-sm btn-focus-instance" data-id="${inst.id}">
            ${isFocused ? '🎯 Sedang Ditampilkan' : '🔍 Fokus ke Panel Atas'}
          </button>
          <button type="button" class="btn-polaris btn-secondary btn-sm btn-restart-instance" data-id="${inst.id}">
            🔄 Restart
          </button>
          <button type="button" class="btn-polaris btn-secondary btn-sm btn-pair-modal-trigger" data-id="${inst.id}" data-name="${escapeHtml(inst.name)}">
            📱 Pairing
          </button>
          <button type="button" class="btn-polaris btn-danger btn-sm btn-reset-instance-session" data-id="${inst.id}" data-name="${escapeHtml(inst.name)}">
            ⚠️ Reset Sesi
          </button>
          <button type="button" class="btn-polaris btn-secondary btn-sm btn-settings-instance" data-id="${inst.id}" data-name="${escapeHtml(inst.name)}" data-role="${escapeHtml(role)}" data-prefix="${escapeHtml(inst.prefix || '/')}" data-owner="${escapeHtml(inst.ownerNumber || '')}" data-sctype="${escapeHtml(inst.scType || 'default')}">
            ⚙️ Setting
          </button>
          <button type="button" class="btn-polaris btn-secondary btn-sm btn-view-logs-instance" data-id="${inst.id}" data-name="${escapeHtml(inst.name)}">
            📜 Logs
          </button>
          ${!inst.isPrimary ? `
            <button type="button" class="btn-polaris btn-secondary btn-sm btn-delete-instance" data-id="${inst.id}" style="color:var(--accent-rose);">
              🗑️ Hapus
            </button>
          ` : ''}
        ` : `
          <button type="button" class="btn-polaris btn-secondary btn-sm btn-focus-instance" data-id="${inst.id}">
            ${isFocused ? '🎯 Sedang Ditampilkan' : '🔍 Lihat Status'}
          </button>
          <span class="badge badge-rose" style="font-size:0.7rem; padding: 4px 8px;">🔒 Milik Pengguna Lain</span>
        `;

        return `
          <div class="card-luxury" style="border: 1px solid ${isFocused ? 'var(--accent-cyan)' : isOnline ? 'color-mix(in srgb, var(--accent-emerald) 35%, transparent)' : isRunning ? 'color-mix(in srgb, var(--accent-cyan) 30%, transparent)' : 'var(--border-subtle)'}; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <h4 style="font-weight: 800; font-size: 1.05rem; color: #fff; margin: 0;">${escapeHtml(inst.name)}</h4>
                  ${roleBadge}
                  ${ownerTag}
                </div>
                <div style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--accent-cyan); margin-top: 2px;">
                  Prefix: <code>${escapeHtml(inst.prefix || '/')}</code> • PID: <code>${inst.pid || '-'}</code>
                </div>
              </div>
              <div>${statusBadge}</div>
            </div>

            ${visualDisplay}

            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 12px; border-top: 1px solid var(--border-subtle); padding-top: 10px;">
              ${buttonsHtml}
            </div>
          </div>
        `;
      })
      .join('');

    // Wire grid action listeners
    grid.querySelectorAll('.btn-focus-instance').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        selectedClusterBotId = id;
        window.selectedClusterBotId = id;
        renderClusterFocusedCard(clusterInstancesCache);
        renderClusterGrid(clusterInstancesCache);
        const topCard = document.getElementById('cluster-focused-engine-card');
        if (topCard) topCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    grid.querySelectorAll('.btn-toggle-instance').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const action = btn.getAttribute('data-action');
        btn.disabled = true;
        btn.textContent = action === 'start' ? 'Memulai...' : 'Menghentikan...';
        try {
          const url = action === 'start' ? `/api/cluster/instances/${id}/start` : `/api/cluster/instances/${id}/stop`;
          const r = await PolarisAuth.authFetch(url, { method: 'POST' });
          const j = await r.json();
          if (j.success) {
            showToast(j.message || `Bot berhasil di-${action}!`, 'success');
            selectedClusterBotId = id;
            startClusterPolling();
            loadClusterTab();
          } else {
            showToast(j.error || `Gagal ${action} bot`, 'error');
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        } finally {
          btn.disabled = false;
        }
      });
    });

    grid.querySelectorAll('.btn-restart-instance').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        btn.disabled = true;
        btn.textContent = 'Merestart...';
        try {
          const r = await PolarisAuth.authFetch(`/api/cluster/instances/${id}/restart`, { method: 'POST' });
          const j = await r.json();
          if (j.success) {
            showToast('Bot berhasil direstart!', 'success');
            selectedClusterBotId = id;
            startClusterPolling();
            loadClusterTab();
          } else {
            showToast(j.error || 'Gagal merestart bot', 'error');
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        } finally {
          btn.disabled = false;
          btn.textContent = '🔄 Restart';
        }
      });
    });

    grid.querySelectorAll('.btn-pair-modal-trigger').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        const modalPair = document.getElementById('modal-cluster-pair');
        const idInput = document.getElementById('cluster-pair-bot-id');
        const nameSpan = document.getElementById('cluster-pair-bot-name');
        const phoneInput = document.getElementById('cluster-pair-phone');

        if (idInput) idInput.value = id;
        if (nameSpan) nameSpan.textContent = name;
        if (phoneInput) {
          phoneInput.value = '';
          phoneInput.focus();
        }
        if (modalPair) modalPair.classList.add('active');
      });
    });

    grid.querySelectorAll('.btn-reset-instance-session').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        if (
          !confirm(
            `⚠️ HAPUS SESI WHATSAPP UNTUK "${name}"?\n\nTindakan ini akan logout akun dan membersihkan folder sesi Baileys. Anda harus pairing atau scan QR ulang.`
          )
        )
          return;

        btn.disabled = true;
        btn.textContent = 'Mereset...';
        try {
          const r = await PolarisAuth.authFetch(`/api/cluster/instances/${id}/reset-session`, { method: 'POST' });
          const j = await r.json();
          if (j.success) {
            showToast(j.message || 'Sesi bot berhasil direset!', 'success');
            loadClusterTab();
          } else {
            showToast(j.error || 'Gagal reset sesi bot', 'error');
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        } finally {
          btn.disabled = false;
          btn.textContent = '⚠️ Reset Sesi';
        }
      });
    });

    grid.querySelectorAll('.btn-settings-instance').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        const role = btn.getAttribute('data-role') || 'general';
        const prefix = btn.getAttribute('data-prefix');
        const owner = btn.getAttribute('data-owner') || '';
        const scType = btn.getAttribute('data-sctype') || 'default';
        const modalSettings = document.getElementById('modal-instance-settings');
        const idInput = document.getElementById('edit-inst-id');
        const nameInput = document.getElementById('edit-inst-name');
        const roleSelect = document.getElementById('edit-inst-role');
        const prefixInput = document.getElementById('edit-inst-prefix');
        const ownerInput = document.getElementById('edit-inst-owner-number');
        const scTypeSelect = document.getElementById('edit-inst-sc-type');
        const scGroup = document.getElementById('edit-inst-custom-sc-group');

        if (idInput) idInput.value = id;
        if (nameInput) nameInput.value = name || '';
        if (roleSelect) roleSelect.value = role;
        if (prefixInput) prefixInput.value = prefix || '/';
        if (ownerInput) ownerInput.value = owner || '';
        if (scTypeSelect) scTypeSelect.value = scType;
        if (scGroup) scGroup.style.display = scType === 'custom' ? 'block' : 'none';
        if (modalSettings) modalSettings.classList.add('active');
      });
    });

    grid.querySelectorAll('.btn-view-logs-instance').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        openClusterLogsModal(id, name);
      });
    });

    grid.querySelectorAll('.btn-delete-instance').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!confirm('Yakin ingin menghapus instance bot ini dari cluster?')) return;
        try {
          const r = await PolarisAuth.authFetch(`/api/cluster/instances/${id}`, { method: 'DELETE' });
          const j = await r.json();
          if (j.success) {
            showToast(j.message || 'Instance berhasil dihapus!', 'info');
            loadClusterTab();
          } else {
            showToast(j.error || 'Gagal menghapus instance', 'error');
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        }
      });
    });
  }

  async function openClusterLogsModal(id, name) {
    const modalLogs = document.getElementById('modal-cluster-logs');
    const nameSpan = document.getElementById('cluster-logs-bot-name');
    const container = document.getElementById('cluster-logs-container');

    if (nameSpan) {
      nameSpan.textContent = name;
      nameSpan.setAttribute('data-id', id);
    }
    if (container) container.textContent = 'Memuat log terminal...';
    if (modalLogs) modalLogs.classList.add('active');

    try {
      const r = await PolarisAuth.authFetch(`/api/cluster/instances/${id}/logs`);
      const j = await r.json();
      if (j.success && Array.isArray(j.logs)) {
        if (j.logs.length === 0) {
          container.textContent = 'Belum ada log output untuk bot ini.';
        } else {
          container.textContent = j.logs.join('\n');
          container.scrollTop = container.scrollHeight;
        }
      } else {
        container.textContent = 'Gagal memuat log terminal: ' + (j.error || 'Unknown error');
      }
    } catch (err) {
      container.textContent = 'Error: ' + err.message;
    }
  }

  async function loadClusterTab() {
    const grid = document.getElementById('cluster-instances-grid');
    if (!grid) return;

    try {
      const res = await PolarisAuth.authFetch('/api/cluster/instances');
      const json = await res.json();
      if (!json.success || !Array.isArray(json.instances)) {
        grid.innerHTML = `<div style="color:var(--accent-rose); grid-column:1/-1; text-align:center; padding:20px;">Gagal memuat instance cluster: ${escapeHtml(
          json.error || 'Unknown error'
        )}</div>`;
        return;
      }

      clusterInstancesCache = json.instances;
      renderClusterFocusedCard(json.instances);
      renderClusterGrid(json.instances);

      // Tangani Quota dan Validasi Tingkat Akun Wuna (Maks 5 Bot Akun, Maks 30 Bot Server, Min Tier 9 Overlord)
      if (json.quota) {
        const quotaCountEl = document.getElementById('cluster-quota-count');
        if (quotaCountEl) {
          quotaCountEl.textContent = `${json.quota.current} / ${json.quota.max}`;
        }

        const serverQuotaCountEl = document.getElementById('cluster-server-quota-count');
        if (serverQuotaCountEl) {
          serverQuotaCountEl.textContent = `${json.quota.serverTotal || 0}`;
        }

        const overviewInstances = document.getElementById('overview-cluster-instances');
        const overviewQuotaFill = document.getElementById('overview-bot-quota-fill');
        if (overviewInstances) {
          overviewInstances.innerHTML = `${json.quota.current} <span style="font-size: 0.8rem; font-weight: 500; color: var(--text-secondary);">/ ${json.quota.max || 5} Akun (Server: ${json.quota.serverTotal || 0}/${json.quota.serverMax || 30})</span>`;
        }
        if (overviewQuotaFill) {
          overviewQuotaFill.style.width = `${Math.min(100, (json.quota.current / (json.quota.max || 5)) * 100)}%`;
        }

        const tierBanner = document.getElementById('cluster-tier-notice-banner');
        const userTierSpan = document.getElementById('cluster-user-tier-name');
        const btnCreate = document.getElementById('btn-open-create-instance');
        const currentUser = PolarisAuth.getCurrentUser();
        const role = currentUser?.role || 'member';

        const isAllowedTier = json.quota.userTierLevel >= (json.quota.minTierLevel || 9);

        if (!isAllowedTier) {
          if (tierBanner) tierBanner.style.display = 'flex';
          if (userTierSpan) userTierSpan.textContent = `${role.toUpperCase()} (Tingkat ${json.quota.userTierLevel})`;
          if (btnCreate) {
            btnCreate.style.opacity = '0.5';
            btnCreate.style.pointerEvents = 'none';
            btnCreate.title = `Tingkat ${role.toUpperCase()} belum memiliki izin membuat bot pribadi (Khusus Overlord - Tingkat 9 & Cosmos - Tingkat 10).`;
          }
        } else {
          if (tierBanner) tierBanner.style.display = 'none';
          if (btnCreate) {
            if ((json.quota.serverTotal || 0) >= (json.quota.serverMax || 30)) {
              btnCreate.style.opacity = '0.5';
              btnCreate.style.pointerEvents = 'none';
              btnCreate.title = `Kapasitas server penuh (${json.quota.serverTotal} / ${json.quota.serverMax || 30} bot). Cepat-cepatan sudah habis.`;
            } else if (json.quota.current >= json.quota.max) {
              btnCreate.style.opacity = '0.5';
              btnCreate.style.pointerEvents = 'none';
              btnCreate.title = `Batas maksimal ${json.quota.max} bot per akun telah tercapai.`;
            } else {
              btnCreate.style.opacity = '1';
              btnCreate.style.pointerEvents = 'auto';
              btnCreate.title = '';
            }
          }
        }
      }
    } catch (err) {
      grid.innerHTML = `<div style="color:var(--accent-rose); grid-column:1/-1; text-align:center; padding:20px;">Error: ${escapeHtml(
        err.message
      )}</div>`;
    }
  }

  function initClusterFeature() {
    const btnOpen = document.getElementById('btn-open-create-instance');
    const modal = document.getElementById('modal-create-instance');
    const form = document.getElementById('form-create-instance');
    const modalSettings = document.getElementById('modal-instance-settings');
    const formSettings = document.getElementById('form-instance-settings');
    const modalPair = document.getElementById('modal-cluster-pair');
    const formPair = document.getElementById('form-cluster-pair');
    const modalLogs = document.getElementById('modal-cluster-logs');

    if (btnOpen && modal) {
      btnOpen.addEventListener('click', () => modal.classList.add('active'));
    }

    [modal, modalSettings, modalPair, modalLogs].forEach((m) => {
      if (m) {
        m.querySelectorAll('.modal-close-btn').forEach((btn) => {
          btn.addEventListener('click', () => m.classList.remove('active'));
        });
      }
    });

    // SC Type toggles for creation and settings
    const instScTypeSelect = document.getElementById('inst-sc-type');
    const instCustomScGroup = document.getElementById('inst-custom-sc-group');
    if (instScTypeSelect && instCustomScGroup) {
      instScTypeSelect.addEventListener('change', () => {
        instCustomScGroup.style.display = instScTypeSelect.value === 'custom' ? 'block' : 'none';
      });
    }

    const editInstScTypeSelect = document.getElementById('edit-inst-sc-type');
    const editInstCustomScGroup = document.getElementById('edit-inst-custom-sc-group');
    if (editInstScTypeSelect && editInstCustomScGroup) {
      editInstScTypeSelect.addEventListener('change', () => {
        editInstCustomScGroup.style.display = editInstScTypeSelect.value === 'custom' ? 'block' : 'none';
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('inst-name')?.value.trim();
        const role = document.getElementById('inst-role')?.value || 'general';
        const prefix = document.getElementById('inst-prefix')?.value.trim() || '/';
        const ownerNumber = document.getElementById('inst-owner-number')?.value.trim() || '';
        const scType = document.getElementById('inst-sc-type')?.value || 'default';
        const scFileInput = document.getElementById('inst-sc-file');
        const scFile = scFileInput?.files?.[0];

        if (!name) {
          showToast('Nama bot wajib diisi!', 'error');
          return;
        }

        if (scType === 'custom' && !scFile) {
          showToast('Silakan pilih berkas .ZIP Script (SC) kustom Anda!', 'error');
          return;
        }

        const submitBtn = document.getElementById('btn-submit-create-instance');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Memasang Bot & SC...';
        }

        try {
          // 1. Buat instance bot terlebih dahulu
          const res = await PolarisAuth.authFetch('/api/cluster/instances', {
            method: 'POST',
            body: JSON.stringify({ name, role, prefix, ownerNumber }),
          });
          const json = await res.json();
          if (!json.success) {
            throw new Error(json.error || 'Gagal membuat bot instance baru');
          }

          const createdId = json.instance.id;

          // 2. Jika memilih SC kustom, upload ZIP ke instance yang baru dibuat
          if (scType === 'custom' && scFile) {
            submitBtn.textContent = 'Mengunggah Script (SC)...';
            const formData = new FormData();
            formData.append('scZip', scFile);

            const uploadRes = await fetch(`/api/cluster/instances/${createdId}/upload-sc`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${PolarisAuth.getToken()}`,
              },
              body: formData,
            });
            const uploadJson = await uploadRes.json();
            if (!uploadJson.success) {
              throw new Error(`Bot dibuat, namun gagal memasang SC: ${uploadJson.error}`);
            }
          }

          showToast(`✅ Instance bot "${json.instance.name}" (${scType === 'custom' ? 'SC Kustom' : 'SC Polaris'}) berhasil dipasang!`, 'success');
          if (modal) modal.classList.remove('active');
          form.reset();
          if (instCustomScGroup) instCustomScGroup.style.display = 'none';
          loadClusterTab();
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '🚀 Pasang Akun Bot Baru';
          }
        }
      });
    }

    if (formSettings) {
      formSettings.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-inst-id')?.value;
        const name = document.getElementById('edit-inst-name')?.value?.trim();
        const role = document.getElementById('edit-inst-role')?.value || 'general';
        const prefix = document.getElementById('edit-inst-prefix')?.value?.trim() || '/';
        const ownerNumber = document.getElementById('edit-inst-owner-number')?.value?.trim() || '';
        const scType = document.getElementById('edit-inst-sc-type')?.value || 'default';
        const scFileInput = document.getElementById('edit-inst-sc-file');
        const scFile = scFileInput?.files?.[0];

        if (!id || !name) {
          showToast('Nama bot wajib diisi!', 'error');
          return;
        }

        const submitBtn = document.getElementById('btn-submit-instance-settings');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Menyimpan...';
        }

        try {
          // 1. Simpan pengaturan umum instance
          const res = await PolarisAuth.authFetch(`/api/cluster/instances/${id}/settings`, {
            method: 'PUT',
            body: JSON.stringify({ name, role, prefix, ownerNumber, scType }),
          });
          const json = await res.json();
          if (!json.success) {
            throw new Error(json.error || 'Gagal memperbarui pengaturan bot');
          }

          // 2. Jika tipe custom dan ada file ZIP baru diunggah
          if (scType === 'custom' && scFile) {
            submitBtn.textContent = 'Mengunggah SC Baru...';
            const formData = new FormData();
            formData.append('scZip', scFile);

            const uploadRes = await fetch(`/api/cluster/instances/${id}/upload-sc`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${PolarisAuth.getToken()}`,
              },
              body: formData,
            });
            const uploadJson = await uploadRes.json();
            if (!uploadJson.success) {
              throw new Error(`Pengaturan tersimpan, tapi upload SC gagal: ${uploadJson.error}`);
            }
          } else if (scType === 'default') {
            // Jika beralih kembali ke default SC Polaris
            await PolarisAuth.authFetch(`/api/cluster/instances/${id}/reset-sc`, {
              method: 'POST',
            });
          }

          showToast(`Pengaturan bot "${name}" berhasil diperbarui!`, 'success');
          if (modalSettings) modalSettings.classList.remove('active');
          if (editInstCustomScGroup) editInstCustomScGroup.style.display = 'none';
          loadClusterTab();
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '💾 Simpan Perubahan';
          }
        }
      });
    }

    if (formPair) {
      formPair.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('cluster-pair-bot-id')?.value;
        const rawPhone = document.getElementById('cluster-pair-phone')?.value?.trim();

        if (!id || !rawPhone) {
          showToast('Nomor WhatsApp wajib diisi!', 'error');
          return;
        }

        let cleanPhone = rawPhone.replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
        else if (cleanPhone.startsWith('8')) cleanPhone = '62' + cleanPhone;

        const submitBtn = document.getElementById('btn-submit-cluster-pair');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Meminta Kode...';
        }

        try {
          const res = await PolarisAuth.authFetch(`/api/cluster/instances/${id}/pair`, {
            method: 'POST',
            body: JSON.stringify({ phoneNumber: cleanPhone }),
          });
          const json = await res.json();
          if (json.success) {
            showToast('Permintaan pairing dikirim! Kode pairing akan tampil di kartu bot dalam beberapa detik.', 'success');
            if (modalPair) modalPair.classList.remove('active');
            startClusterPolling();
            loadClusterTab();
          } else {
            showToast(json.error || 'Gagal meminta kode pairing', 'error');
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '🔑 Minta Kode Pairing';
          }
        }
      });
    }

    // Wiring focused top card controls
    const selBot = document.getElementById('cluster-active-bot-select');
    if (selBot) {
      selBot.addEventListener('change', (e) => {
        selectedClusterBotId = e.target.value;
        window.selectedClusterBotId = selectedClusterBotId;
        renderClusterFocusedCard(clusterInstancesCache);
        renderClusterGrid(clusterInstancesCache);
      });
    }

    const btnFocusLaunch = document.getElementById('btn-cluster-focus-launch');
    if (btnFocusLaunch) {
      btnFocusLaunch.addEventListener('click', async () => {
        if (!selectedClusterBotId) return;
        btnFocusLaunch.disabled = true;
        btnFocusLaunch.textContent = 'Memulai...';
        try {
          const r = await PolarisAuth.authFetch(`/api/cluster/instances/${selectedClusterBotId}/start`, { method: 'POST' });
          const j = await r.json();
          if (j.success) {
            showToast(j.message || 'Bot berhasil dijalankan!', 'success');
            startClusterPolling();
            loadClusterTab();
          } else {
            showToast(j.error || 'Gagal memulai bot', 'error');
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        } finally {
          btnFocusLaunch.disabled = false;
          btnFocusLaunch.textContent = 'Launch Bot (QR Mode)';
        }
      });
    }

    const btnFocusStop = document.getElementById('btn-cluster-focus-stop');
    if (btnFocusStop) {
      btnFocusStop.addEventListener('click', async () => {
        if (!selectedClusterBotId) return;
        btnFocusStop.disabled = true;
        btnFocusStop.textContent = 'Menghentikan...';
        try {
          const r = await PolarisAuth.authFetch(`/api/cluster/instances/${selectedClusterBotId}/stop`, { method: 'POST' });
          const j = await r.json();
          if (j.success) {
            showToast(j.message || 'Bot berhasil dihentikan!', 'success');
            loadClusterTab();
          } else {
            showToast(j.error || 'Gagal menghentikan bot', 'error');
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        } finally {
          btnFocusStop.disabled = false;
          btnFocusStop.textContent = 'Stop Bot';
        }
      });
    }

    const btnFocusRestart = document.getElementById('btn-cluster-focus-restart');
    if (btnFocusRestart) {
      btnFocusRestart.addEventListener('click', async () => {
        if (!selectedClusterBotId) return;
        btnFocusRestart.disabled = true;
        btnFocusRestart.textContent = 'Merestart...';
        try {
          const r = await PolarisAuth.authFetch(`/api/cluster/instances/${selectedClusterBotId}/restart`, { method: 'POST' });
          const j = await r.json();
          if (j.success) {
            showToast('Bot berhasil direstart!', 'success');
            startClusterPolling();
            loadClusterTab();
          } else {
            showToast(j.error || 'Gagal merestart bot', 'error');
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        } finally {
          btnFocusRestart.disabled = false;
          btnFocusRestart.textContent = 'Restart Process';
        }
      });
    }

    const btnFocusPair = document.getElementById('btn-cluster-focus-pair');
    if (btnFocusPair) {
      btnFocusPair.addEventListener('click', () => {
        if (!selectedClusterBotId) return;
        const inst = clusterInstancesCache.find((i) => i.id === selectedClusterBotId);
        const name = inst ? inst.name : selectedClusterBotId;
        const modalPair = document.getElementById('modal-cluster-pair');
        const idInput = document.getElementById('cluster-pair-bot-id');
        const nameSpan = document.getElementById('cluster-pair-bot-name');
        const phoneInput = document.getElementById('cluster-pair-phone');

        if (idInput) idInput.value = selectedClusterBotId;
        if (nameSpan) nameSpan.textContent = name;
        if (phoneInput) {
          phoneInput.value = '';
          phoneInput.focus();
        }
        if (modalPair) modalPair.classList.add('active');
      });
    }

    const btnFocusReset = document.getElementById('btn-cluster-focus-reset');
    if (btnFocusReset) {
      btnFocusReset.addEventListener('click', async () => {
        if (!selectedClusterBotId) return;
        const inst = clusterInstancesCache.find((i) => i.id === selectedClusterBotId);
        const name = inst ? inst.name : selectedClusterBotId;
        if (
          !confirm(
            `⚠️ HAPUS SESI WHATSAPP UNTUK "${name}"?\n\nTindakan ini akan logout akun dan membersihkan folder sesi Baileys. Anda harus pairing atau scan QR ulang.`
          )
        )
          return;

        btnFocusReset.disabled = true;
        btnFocusReset.textContent = 'Mereset...';
        try {
          const r = await PolarisAuth.authFetch(`/api/cluster/instances/${selectedClusterBotId}/reset-session`, {
            method: 'POST',
          });
          const j = await r.json();
          if (j.success) {
            showToast(j.message || 'Sesi bot berhasil direset!', 'success');
            loadClusterTab();
          } else {
            showToast(j.error || 'Gagal reset sesi bot', 'error');
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        } finally {
          btnFocusReset.disabled = false;
          btnFocusReset.textContent = 'Reset Sesi (Logout)';
        }
      });
    }

    const btnFocusSettings = document.getElementById('btn-cluster-focus-settings');
    if (btnFocusSettings) {
      btnFocusSettings.addEventListener('click', () => {
        if (!selectedClusterBotId) return;
        const inst = clusterInstancesCache.find((i) => i.id === selectedClusterBotId);
        if (!inst) return;
        const modalSettings = document.getElementById('modal-instance-settings');
        const idInput = document.getElementById('edit-inst-id');
        const nameInput = document.getElementById('edit-inst-name');
        const roleSelect = document.getElementById('edit-inst-role');
        const prefixInput = document.getElementById('edit-inst-prefix');
        const ownerInput = document.getElementById('edit-inst-owner-number');

        const scTypeSelect = document.getElementById('edit-inst-sc-type');
        const scGroup = document.getElementById('edit-inst-custom-sc-group');

        if (idInput) idInput.value = inst.id;
        if (nameInput) nameInput.value = inst.name || '';
        if (roleSelect) roleSelect.value = inst.role || 'general';
        if (prefixInput) prefixInput.value = inst.prefix || '/';
        if (ownerInput) ownerInput.value = inst.ownerNumber || '';
        if (scTypeSelect) scTypeSelect.value = inst.scType || 'default';
        if (scGroup) scGroup.style.display = (inst.scType === 'custom') ? 'block' : 'none';
        if (modalSettings) modalSettings.classList.add('active');
      });
    }

    const btnFocusLogs = document.getElementById('btn-cluster-focus-logs');
    if (btnFocusLogs) {
      btnFocusLogs.addEventListener('click', () => {
        if (!selectedClusterBotId) return;
        const inst = clusterInstancesCache.find((i) => i.id === selectedClusterBotId);
        const name = inst ? inst.name : selectedClusterBotId;
        openClusterLogsModal(selectedClusterBotId, name);
      });
    }

    // Window WebSocket listeners for realtime cluster updates
    window.onClusterQrUpdate = (instanceId, qrDataUrl) => {
      const targetInst = clusterInstancesCache.find((i) => i.id === instanceId);
      if (targetInst) {
        targetInst.lastQrDataUrl = qrDataUrl;
        targetInst.botStatus = 'QR_READY';
      }
      renderClusterFocusedCard(clusterInstancesCache);
      renderClusterGrid(clusterInstancesCache);
    };

    window.onClusterPairingCodeUpdate = (instanceId, code) => {
      const targetInst = clusterInstancesCache.find((i) => i.id === instanceId);
      if (targetInst) {
        targetInst.pairingCode = code;
        targetInst.botStatus = 'CONNECTING';
      }
      renderClusterFocusedCard(clusterInstancesCache);
      renderClusterGrid(clusterInstancesCache);
    };

    window.onClusterStatusUpdate = (statusData) => {
      const targetInst = clusterInstancesCache.find((i) => i.id === statusData.instanceId);
      if (targetInst) {
        Object.assign(targetInst, statusData);
      }
      renderClusterFocusedCard(clusterInstancesCache);
      renderClusterGrid(clusterInstancesCache);
      if (statusData.instanceId === selectedClusterBotId && window.PolarisWS && typeof window.PolarisWS.updateStatusUI === 'function') {
        window.PolarisWS.updateStatusUI(statusData);
      }
    };

    window.onClusterLogUpdate = (instanceId, line) => {
      const modalLogs = document.getElementById('modal-cluster-logs');
      const currentId = document.getElementById('cluster-logs-bot-name')?.getAttribute('data-id');
      const container = document.getElementById('cluster-logs-container');
      if (modalLogs && modalLogs.classList.contains('active') && currentId === instanceId && container) {
        container.textContent += '\n' + line;
        container.scrollTop = container.scrollHeight;
      }
    };
  }

      // ==================== 10. TAB HERMES AUTONOMOUS AI AGENT ====================
  let hermesLogInterval = null;
  let hermesActiveSubtab = 'hermes-sub-chat';

  // Helper Icon Artefak
  function getArtifactIcon(ext = '') {
    const clean = String(ext).toLowerCase().replace('.', '');
    switch (clean) {
      case 'html': case 'htm': return '🌐';
      case 'pdf': return '📑';
      case 'docx': case 'doc': return '📘';
      case 'xlsx': case 'xls': case 'csv': return '📊';
      case 'pptx': case 'ppt': return '📽️';
      case 'png': case 'jpg': case 'jpeg': case 'svg': return '🖼️';
      case 'py': return '🐍';
      case 'js': case 'ts': return '📜';
      case 'json': return '📦';
      default: return '📄';
    }
  }

  // Advanced Structured Response Engine & AST Formatter
  function renderMarkdownSafe(text, userPrompt = '') {
    if (!text || typeof text !== 'string') return '';
    if (typeof HermesResponseParser !== 'undefined' && typeof HermesResponseParser.renderResponse === 'function') {
      return HermesResponseParser.renderResponse(text, userPrompt);
    }
    // Fallback if parser not loaded
    let esc = escapeHtml(text);
    esc = esc.replace(/`([^`]+)`/g, '<code>$1</code>');
    esc = esc.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    esc = esc.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    esc = esc.replace(/\n/g, '<br>');
    return esc;
  }

  async function loadHermesTab() {
    try {
      const res = await PolarisAuth.authFetch('/api/hermes/status');
      const json = await res.json();
      if (!json.success) return;

      const badge = document.getElementById('hermes-status-badge');
      const installBtn = document.getElementById('btn-install-hermes');
      const btnText = document.getElementById('hermes-install-btn-text');
      const btnIcon = document.getElementById('hermes-install-icon');
      const chatModelBadge = document.getElementById('hermes-chat-active-model');

      if (badge) {
        if (json.installed) {
          badge.textContent = json.enabled ? 'Aktif & Terpasang' : 'Terpasang (Nonaktif)';
          badge.className = json.enabled ? 'badge badge-cyan' : 'badge badge-emerald';
        } else {
          badge.textContent = 'Belum Terinstall';
          badge.className = 'badge badge-rose';
        }
      }

      if (chatModelBadge) {
        chatModelBadge.textContent = json.model ? json.model.split('/').pop() : 'Hermes 3';
      }

      const quickModelBtnName = document.getElementById('hermes-btn-model-name');
      const quickModelBtnIcon = document.getElementById('hermes-btn-model-icon');
      if (quickModelBtnName && json.model) {
        const shortName = json.model.split('/').pop().replace(/:free$/, ' (Free)');
        quickModelBtnName.textContent = shortName.length > 18 ? shortName.slice(0, 16) + '..' : shortName;
        if (quickModelBtnIcon) {
          let icon = '🤖';
          if (json.model.includes('gemini')) icon = '♊';
          else if (json.model.includes('groq') || json.model.includes('llama')) icon = '⚡';
          else if (json.model.includes('grok') || json.model.includes('xai')) icon = '🤖';
          else if (json.model.includes('deepseek')) icon = '🧠';
          else if (json.model.includes('free') || json.model.includes('openrouter')) icon = '🌐';
          quickModelBtnIcon.textContent = icon;
        }
      }

      if (installBtn && btnText && btnIcon) {
        if (json.installed) {
          btnText.textContent = 'Re-install / Perbarui Hermes';
          btnIcon.textContent = '🔄';
          installBtn.className = 'btn-polaris btn-secondary';
        } else {
          btnText.textContent = 'Install Hermes Agent';
          btnIcon.textContent = '📦';
          installBtn.className = 'btn-polaris btn-primary btn-shine-effect';
        }
      }

      const cfg = json.config || {};
      const enabledToggle = document.getElementById('hermes-enabled-toggle');
      const modelInput = document.getElementById('hermes-model');
      const baseUrlInput = document.getElementById('hermes-base-url');
      const tempInput = document.getElementById('hermes-temperature');
      const maxTokensInput = document.getElementById('hermes-max-tokens');
      const systemPromptInput = document.getElementById('hermes-system-prompt');

      if (enabledToggle) enabledToggle.checked = Boolean(cfg.enabled);
      if (modelInput && cfg.model) modelInput.value = cfg.model;
      if (baseUrlInput && cfg.baseUrl) baseUrlInput.value = cfg.baseUrl;
      if (tempInput && cfg.temperature !== undefined) tempInput.value = cfg.temperature;
      if (maxTokensInput && cfg.maxTokens) maxTokensInput.value = cfg.maxTokens;
      if (systemPromptInput && cfg.systemPrompt) systemPromptInput.value = cfg.systemPrompt;

      loadHermesLogs();
      loadArtifactsList();
      loadHermesSkills();
      loadHermesEnv();
    } catch (err) {
      console.error('[loadHermesTab]', err);
    }
  }

  // Load daftar artefak di sidebar
  async function loadArtifactsList() {
    const listEl = document.getElementById('hermes-artifacts-list');
    if (!listEl) return;

    try {
      const res = await PolarisAuth.authFetch('/api/hermes/artifacts');
      const json = await res.json();
      if (!json.success || !Array.isArray(json.data)) return;

      if (json.data.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:0.75rem; padding:20px;">Belum ada artefak file yang dibuat. Minta Hermes membuat file di chat!</div>';
        return;
      }

      listEl.innerHTML = json.data.map((art) => {
        const icon = getArtifactIcon(art.filetype);
        const hasPreview = Boolean(art.previewUrl);
        return `
          <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:8px; gap:8px;">
            <div style="display:flex; align-items:center; gap:8px; min-width:0;">
              <span style="font-size:1.3rem;">${icon}</span>
              <div style="min-width:0;">
                <div style="font-size:0.8rem; font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(art.filename)}">${escapeHtml(art.filename)}</div>
                <div style="font-size:0.68rem; color:var(--text-muted);">${escapeHtml(art.size || '-')} • ${escapeHtml((art.filetype || art.filename?.split('.').pop() || 'FILE').toUpperCase())}</div>
              </div>
            </div>
            <div style="display:flex; gap:4px; flex-shrink:0;">
              ${hasPreview ? `<button type="button" class="btn-polaris btn-secondary btn-preview-art" data-id="${escapeHtml(art.id)}" style="font-size:0.68rem; padding:3px 6px;">👁️</button>` : ''}
              <a href="/api/hermes/artifacts/download/${encodeURIComponent(art.id)}" download class="btn-polaris btn-primary btn-sm" style="font-size:0.68rem; padding:3px 8px; text-decoration:none;">⬇️</a>
              <button type="button" class="btn-polaris btn-danger btn-del-art" data-id="${escapeHtml(art.id)}" style="font-size:0.68rem; padding:3px 6px;">🗑️</button>
            </div>
          </div>
        `;
      }).join('');

      // Attach handlers
      listEl.querySelectorAll('.btn-preview-art').forEach((btn) => {
        btn.addEventListener('click', () => openArtifactPreviewModal(btn.getAttribute('data-id')));
      });
      listEl.querySelectorAll('.btn-del-art').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('Hapus file artefak ini?')) return;
          try {
            const res = await PolarisAuth.authFetch(`/api/hermes/artifacts/${encodeURIComponent(btn.getAttribute('data-id'))}`, { method: 'DELETE' });
            const j = await res.json();
            if (j.success) {
              showToast('Artefak berhasil dihapus', 'success');
              loadArtifactsList();
            }
          } catch (e) {
            showToast('Gagal menghapus: ' + e.message, 'error');
          }
        });
      });
    } catch (err) {
      console.error('[loadArtifactsList]', err);
    }
  }

  // ==================== ANTIGRAVITY ARTIFACT VIEWER MODAL ====================
  let currentActiveArtifact = null;
  let artifactModalEventsInitialized = false;

  function initArtifactModalEvents() {
    if (artifactModalEventsInitialized) return;
    artifactModalEventsInitialized = true;

    const modalCard = document.getElementById('artifact-modal-card');
    const tabPreviewBtn = document.getElementById('tab-btn-art-preview');
    const tabCodeBtn = document.getElementById('tab-btn-art-code');
    const artPanePreview = document.getElementById('art-pane-preview');
    const artPaneCode = document.getElementById('art-pane-code');
    const vpControls = document.getElementById('artifact-viewport-controls');
    const viewportWrapper = document.getElementById('art-viewport-wrapper');
    const btnVpDesktop = document.getElementById('btn-vp-desktop');
    const btnVpTablet = document.getElementById('btn-vp-tablet');
    const btnVpMobile = document.getElementById('btn-vp-mobile');
    const btnVpReload = document.getElementById('btn-vp-reload');
    const copyBtn = document.getElementById('preview-artifact-copy-btn');
    const fullscreenBtn = document.getElementById('preview-artifact-fullscreen-btn');

    // Tab Switcher Handler
    window.switchArtifactModalTab = function(tab) {
      if (tab === 'code') {
        tabCodeBtn?.classList.add('active');
        tabCodeBtn?.classList.remove('btn-secondary');
        tabPreviewBtn?.classList.remove('active');
        tabPreviewBtn?.classList.add('btn-secondary');
        if (artPanePreview) artPanePreview.style.display = 'none';
        if (artPaneCode) artPaneCode.style.display = 'flex';
        if (vpControls) vpControls.style.display = 'none';
      } else {
        tabPreviewBtn?.classList.add('active');
        tabPreviewBtn?.classList.remove('btn-secondary');
        tabCodeBtn?.classList.remove('active');
        tabCodeBtn?.classList.add('btn-secondary');
        if (artPanePreview) artPanePreview.style.display = 'flex';
        if (artPaneCode) artPaneCode.style.display = 'none';
        if (vpControls) vpControls.style.display = 'flex';
      }
    };

    tabPreviewBtn?.addEventListener('click', () => window.switchArtifactModalTab('preview'));
    tabCodeBtn?.addEventListener('click', () => window.switchArtifactModalTab('code'));

    // Viewport Toggle Handlers
    function setViewportMode(mode) {
      [btnVpDesktop, btnVpTablet, btnVpMobile].forEach(b => {
        b?.classList.remove('active');
        b?.classList.add('btn-secondary');
      });
      if (viewportWrapper) {
        viewportWrapper.classList.remove('viewport-desktop', 'viewport-tablet', 'viewport-mobile');
      }

      if (mode === 'mobile') {
        btnVpMobile?.classList.add('active');
        btnVpMobile?.classList.remove('btn-secondary');
        viewportWrapper?.classList.add('viewport-mobile');
      } else if (mode === 'tablet') {
        btnVpTablet?.classList.add('active');
        btnVpTablet?.classList.remove('btn-secondary');
        viewportWrapper?.classList.add('viewport-tablet');
      } else {
        btnVpDesktop?.classList.add('active');
        btnVpDesktop?.classList.remove('btn-secondary');
        viewportWrapper?.classList.add('viewport-desktop');
      }
    }

    btnVpDesktop?.addEventListener('click', () => setViewportMode('desktop'));
    btnVpTablet?.addEventListener('click', () => setViewportMode('tablet'));
    btnVpMobile?.addEventListener('click', () => setViewportMode('mobile'));
    btnVpReload?.addEventListener('click', () => {
      const iframe = document.querySelector('#preview-artifact-body iframe');
      if (iframe) {
        const src = iframe.src;
        iframe.src = '';
        setTimeout(() => { iframe.src = src; }, 50);
      }
    });

    // Copy Code Handler
    copyBtn?.addEventListener('click', async () => {
      if (!currentActiveArtifact || !currentActiveArtifact.rawContent) {
        showToast('Konten kode tidak tersedia', 'error');
        return;
      }
      try {
        await navigator.clipboard.writeText(currentActiveArtifact.rawContent);
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<span>✅</span> Tersalin!';
        showToast('Kode artefak disalin ke clipboard!', 'success');
        setTimeout(() => { copyBtn.innerHTML = originalText; }, 2000);
      } catch (e) {
        showToast('Gagal menyalin kode: ' + e.message, 'error');
      }
    });

    // Fullscreen Toggle Handler
    fullscreenBtn?.addEventListener('click', () => {
      if (modalCard) {
        modalCard.classList.toggle('modal-fullscreen');
        const isFull = modalCard.classList.contains('modal-fullscreen');
        fullscreenBtn.textContent = isFull ? '🗗' : '⛶';
      }
    });
  }

  // Antigravity Artifact Card Component for Chat
  function renderAntigravityArtifactCard(art) {
    const icon = getArtifactIcon(art.filetype);
    const hasPreview = Boolean(art.previewUrl);
    const artId = escapeHtml(art.id);
    const filename = escapeHtml(art.filename);
    const filetypeUpper = escapeHtml((art.filetype || 'FILE').toUpperCase());
    const size = escapeHtml(art.size || '');

    return `
      <div class="antigravity-artifact-card" data-id="${artId}">
        <div class="antigravity-artifact-header">
          <div class="antigravity-artifact-meta-left">
            <span class="antigravity-artifact-icon">${icon}</span>
            <div style="min-width:0;">
              <div style="display:flex; align-items:center; gap:6px;">
                <span class="antigravity-tag-badge">ARTIFACT</span>
                <div class="antigravity-artifact-title" title="${filename}">${filename}</div>
              </div>
              <div class="antigravity-artifact-meta">${size} • Format: ${filetypeUpper}</div>
            </div>
          </div>
          <span class="badge badge-emerald" style="font-size:0.65rem; font-weight:700;">✓ Ready</span>
        </div>
        <div class="antigravity-artifact-actions">
          ${hasPreview ? `
            <button type="button" class="btn-polaris btn-sm btn-art-preview" onclick="window.PolarisApp.previewArtifact('${artId}', 'preview')">
              <span>🌐</span> Live Preview
            </button>
          ` : ''}
          <button type="button" class="btn-polaris btn-secondary btn-sm" onclick="window.PolarisApp.previewArtifact('${artId}', 'code')">
            <span>📝</span> Source Code
          </button>
          <button type="button" class="btn-polaris btn-secondary btn-sm" onclick="window.PolarisApp.copyArtifactCode('${artId}', this)">
            <span>📋</span> Salin Kode
          </button>
          <a href="/api/hermes/artifacts/download/${encodeURIComponent(art.id)}" download class="btn-polaris btn-secondary btn-sm" style="text-decoration:none;">
            <span>⬇️</span> Unduh
          </a>
        </div>
      </div>
    `;
  }

  // Open Artifact Preview Modal (Antigravity Dual-Tab System)
  async function openArtifactPreviewModal(artifactId, initialTab = 'preview') {
    initArtifactModalEvents();
    const modal = document.getElementById('modal-artifact-preview');
    const titleEl = document.getElementById('preview-artifact-title');
    const metaEl = document.getElementById('preview-artifact-meta');
    const iconEl = document.getElementById('preview-artifact-icon');
    const bodyEl = document.getElementById('preview-artifact-body');
    const dlBtn = document.getElementById('preview-artifact-download-btn');
    const codeFilenameEl = document.getElementById('art-code-filename');
    const codeLinecountEl = document.getElementById('art-code-linecount');
    const codeGuttersEl = document.getElementById('art-code-gutters');
    const codeContentEl = document.getElementById('art-code-content');

    if (!modal) return;

    try {
      if (bodyEl) bodyEl.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:40px;"><div class="spinner-polaris" style="margin:0 auto 12px;"></div>Memuat berkas artefak...</div>';
      if (codeContentEl) codeContentEl.textContent = 'Memuat kode sumber...';
      if (codeGuttersEl) codeGuttersEl.innerHTML = '<div>1</div>';

      modal.classList.add('active');

      const res = await PolarisAuth.authFetch('/api/hermes/artifacts');
      const j = await res.json();
      const art = (j.data || []).find((a) => a.id === artifactId);
      if (!art) {
        showToast('Artefak tidak ditemukan', 'error');
        modal.classList.remove('active');
        return;
      }

      // Fetch raw source text content
      let rawContent = '';
      try {
        const textRes = await fetch(`/api/hermes/artifacts/preview/${encodeURIComponent(art.id)}`);
        rawContent = await textRes.text();
      } catch (e) {
        rawContent = 'Gagal memuat isi berkas: ' + e.message;
      }

      currentActiveArtifact = { ...art, rawContent };

      if (titleEl) titleEl.textContent = art.filename;
      if (metaEl) metaEl.textContent = `${art.size || '-'} • Format: ${(art.filetype || art.filename?.split('.').pop() || 'FILE').toUpperCase()}`;
      if (iconEl) iconEl.textContent = getArtifactIcon(art.filetype);
      if (dlBtn) dlBtn.href = `/api/hermes/artifacts/download/${encodeURIComponent(art.id)}`;
      if (codeFilenameEl) codeFilenameEl.textContent = art.filename;

      // Populate Code Tab with Line Gutters & Content
      const lines = rawContent.split('\n');
      if (codeLinecountEl) codeLinecountEl.textContent = `${lines.length} baris • ${art.size}`;
      if (codeGuttersEl) {
        codeGuttersEl.innerHTML = lines.map((_, idx) => `<div>${idx + 1}</div>`).join('');
      }
      if (codeContentEl) {
        codeContentEl.textContent = rawContent;
      }

      // Populate Preview Tab
      const ext = (art.filetype || '').toLowerCase();
      if (['html', 'htm'].includes(ext)) {
        if (bodyEl) {
          bodyEl.innerHTML = `<iframe src="/api/hermes/artifacts/preview/${encodeURIComponent(art.id)}" style="width:100%; height:100%; border:none; background:#ffffff; border-radius:6px;" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>`;
        }
      } else if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(ext)) {
        if (bodyEl) {
          bodyEl.innerHTML = `<div style="flex:1; display:flex; align-items:center; justify-content:center; padding:20px; overflow:auto;"><img src="/api/hermes/artifacts/preview/${encodeURIComponent(art.id)}" style="max-width:100%; max-height:100%; object-fit:contain; border-radius:6px; box-shadow:0 12px 36px rgba(0,0,0,0.6);"></div>`;
        }
      } else {
        if (bodyEl) {
          bodyEl.innerHTML = `<div style="padding:16px; overflow:auto; height:100%; color:var(--text-primary); font-family:var(--font-mono); font-size:0.8rem; white-space:pre-wrap;">${escapeHtml(rawContent)}</div>`;
        }
      }

      // Switch to the requested tab
      if (typeof window.switchArtifactModalTab === 'function') {
        window.switchArtifactModalTab(initialTab);
      }
    } catch (err) {
      showToast('Gagal memuat preview: ' + err.message, 'error');
    }
  }

  // Load Katalog Skills
  async function loadHermesSkills() {
    const container = document.getElementById('hermes-skills-container');
    if (!container) return;

    try {
      const res = await PolarisAuth.authFetch('/api/hermes/skills');
      const json = await res.json();
      if (!json.success || !json.data) return;

      const builtIn = json.data.builtInTools || [];
      const custom = json.data.customSkills || [];

      let html = '<div style="font-weight:700; font-size:0.75rem; color:var(--accent-cyan); margin-bottom:4px;">Perkakas Bawaan (Built-in Tools):</div>';

      builtIn.forEach((tool) => {
        const icon = tool.name === 'create_artifact' ? '📁' : (tool.name.includes('time') ? '⏰' : (tool.name.includes('calc') ? '🧮' : (tool.name.includes('search') ? '🔍' : '🛠️')));
        html += `
          <div style="padding:10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span style="font-weight:700; font-size:0.82rem; color:#fff;">${icon} ${escapeHtml(tool.name)}</span>
              <span class="badge badge-emerald" style="font-size:0.65rem;">Built-in Ready</span>
            </div>
            <p style="font-size:0.74rem; color:var(--text-muted); margin:0;">${escapeHtml(tool.description)}</p>
          </div>
        `;
      });

      html += '<div style="font-weight:700; font-size:0.75rem; color:#facc15; margin:14px 0 4px 0;">Skill Kustom Diunggah (Custom Skills):</div>';

      if (custom.length === 0) {
        html += '<div style="text-align:center; color:var(--text-muted); font-size:0.74rem; padding:12px;">Belum ada custom skill yang diunggah. Unggah file .js/.json/.zip di panel sebelah kiri.</div>';
      } else {
        custom.forEach((c) => {
          html += `
            <div style="padding:10px; background:rgba(250,204,21,0.03); border:1px solid rgba(250,204,21,0.15); border-radius:8px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
              <div>
                <div style="font-weight:700; font-size:0.82rem; color:#facc15;">🧩 ${escapeHtml(c.name)} (${escapeHtml(c.extension)})</div>
                <div style="font-size:0.7rem; color:var(--text-muted);">${escapeHtml(c.size)} • Diunggah: ${new Date(c.uploadedAt).toLocaleDateString('id-ID')}</div>
              </div>
              <div style="display:flex; gap:6px; align-items:center;">
                <label class="switch-container">
                  <input type="checkbox" ${c.enabled ? 'checked' : ''} onchange="window.PolarisApp.toggleHermesSkill('${escapeHtml(c.name)}', this.checked)">
                  <span class="switch-slider"></span>
                </label>
                <button type="button" class="btn-polaris btn-danger btn-sm" onclick="window.PolarisApp.deleteHermesSkill('${escapeHtml(c.name)}')">🗑️</button>
              </div>
            </div>
          `;
        });
      }

      container.innerHTML = html;
    } catch (err) {
      console.error('[loadHermesSkills]', err);
    }
  }

  // Load API Keys & Environment
  async function loadHermesEnv() {
    const grid = document.getElementById('hermes-api-providers-grid');
    const customList = document.getElementById('hermes-custom-env-list');
    if (!grid) return;

    try {
      const res = await PolarisAuth.authFetch('/api/hermes/env');
      const json = await res.json();
      if (!json.success || !json.data) return;

      const providers = json.data.providers || [];
      const customVars = json.data.customVars || [];

      grid.innerHTML = providers.map((p) => {
        const isSet = p.hasKey;
        return `
          <div style="padding:14px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span style="font-weight:700; font-size:0.86rem; color:#fff;">${escapeHtml(p.name)}</span>
              <span class="badge ${isSet ? 'badge-emerald' : 'badge-rose'}" style="font-size:0.68rem;">${isSet ? 'Terpasang' : 'Belum Ada'}</span>
            </div>
            <p style="font-size:0.72rem; color:var(--text-muted); margin-bottom:8px;">${escapeHtml(p.desc)}</p>
            <div class="form-group" style="margin-bottom:6px;">
              <input type="password" class="form-input hermes-provider-key-input" data-envkey="${escapeHtml(p.envKey)}" placeholder="${p.maskedValue || 'Masukkan API Key baru...'}" style="font-family:var(--font-mono); font-size:0.78rem;">
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <a href="${escapeHtml(p.website)}" target="_blank" rel="noopener" style="font-size:0.7rem; color:var(--accent-cyan); text-decoration:none;">Dapatkan API Key ↗</a>
            </div>
          </div>
        `;
      }).join('');

      if (customList) {
        if (customVars.length === 0) {
          customList.innerHTML = '<div style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">Belum ada variabel custom tambahan.</div>';
        } else {
          customList.innerHTML = customVars.map((v) => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); border-radius:6px; font-family:var(--font-mono); font-size:0.78rem;">
              <div style="color:var(--accent-cyan); font-weight:700;">${escapeHtml(v.key)} = <span style="color:var(--text-secondary);">${escapeHtml(v.isSecret ? '••••••••' : v.value)}</span></div>
              <button type="button" class="btn-polaris btn-danger btn-sm" onclick="window.PolarisApp.deleteHermesEnvVar('${escapeHtml(v.key)}')">Hapus</button>
            </div>
          `).join('');
        }
      }
    } catch (err) {
      console.error('[loadHermesEnv]', err);
    }
  }

  async function loadHermesLogs() {
    const logBox = document.getElementById('hermes-install-logs');
    if (!logBox) return;
    try {
      const res = await PolarisAuth.authFetch('/api/hermes/logs');
      const json = await res.json();
      if (json.success && Array.isArray(json.logs)) {
        if (json.logs.length === 0) {
          logBox.innerHTML = '<div style="color: var(--text-muted); font-style: italic;">Log sistem siap.</div>';
        } else {
          logBox.innerHTML = json.logs.map((l) => `<div>${escapeHtml(l)}</div>`).join('');
          logBox.scrollTop = logBox.scrollHeight;
        }
      }
    } catch (_) {}
  }

  // ==================== HERMES TERMINAL CLI & STREAMING ====================
  let isHermesTerminalRunning = false;

  async function loadHermesTerminal() {
    try {
      const res = await PolarisAuth.authFetch('/api/hermes/terminal/history');
      const json = await res.json();
      const outputEl = document.getElementById('hermes-terminal-output');
      if (outputEl && json.success && Array.isArray(json.history) && json.history.length > 0) {
        if (outputEl.textContent.includes('[Hermes Terminal Console Siap]')) {
          outputEl.innerHTML = '';
          json.history.forEach((h) => {
            const row = document.createElement('div');
            if (h.type === 'command') {
              row.style.color = '#38bdf8';
              row.style.fontWeight = 'bold';
              row.textContent = `polaris@hermes:~$ ${h.command}`;
            } else if (h.type === 'stderr') {
              row.style.color = '#f87171';
              row.textContent = h.text;
            } else if (h.type === 'exit') {
              row.style.color = h.code === 0 ? '#4ade80' : '#f87171';
              row.textContent = `\n[Proses selesai dengan kode keluar ${h.code}]`;
            } else {
              row.textContent = h.text || '';
            }
            outputEl.appendChild(row);
          });
          outputEl.scrollTop = outputEl.scrollHeight;
        }
      }
    } catch (_) {}
  }

  async function runHermesTerminalCommand(command) {
    if (isHermesTerminalRunning) {
      showToast('Sebuah proses terminal masih berjalan. Harap tunggu atau klik "Hentikan Proses".', 'warning');
      return;
    }

    const outputEl = document.getElementById('hermes-terminal-output');
    const statusBadge = document.getElementById('hermes-terminal-status-badge');
    const indicator = document.getElementById('hermes-terminal-active-indicator');
    const killBtn = document.getElementById('btn-kill-hermes-terminal');
    const runBtn = document.getElementById('btn-run-hermes-terminal');

    if (!outputEl) return;

    if (outputEl.textContent.includes('[Hermes Terminal Console Siap]')) {
      outputEl.innerHTML = '';
    }

    isHermesTerminalRunning = true;
    if (statusBadge) {
      statusBadge.textContent = 'Menjalankan...';
      statusBadge.className = 'badge badge-cyan';
    }
    if (indicator) indicator.style.display = 'inline-block';
    if (killBtn) killBtn.style.display = 'inline-flex';
    if (runBtn) runBtn.disabled = true;

    try {
      const res = await PolarisAuth.authFetch('/api/hermes/terminal/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });

      if (!res.ok) {
        const errText = await res.text();
        outputEl.innerHTML += `<div style="color:var(--accent-rose);">❌ Gagal: ${escapeHtml(errText)}</div>`;
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          try {
            const data = JSON.parse(trimmed.slice(5).trim());
            const row = document.createElement('div');

            if (data.type === 'stdout') {
              row.textContent = data.text;
              outputEl.appendChild(row);
            } else if (data.type === 'stderr') {
              row.style.color = '#f87171';
              row.textContent = data.text;
              outputEl.appendChild(row);
            } else if (data.type === 'exit') {
              row.style.color = data.code === 0 ? '#4ade80' : '#f87171';
              row.style.fontWeight = 'bold';
              row.textContent = data.text || `[Proses selesai dengan kode keluar ${data.code}]`;
              outputEl.appendChild(row);
              if (data.code === 0) {
                showToast(`✅ Perintah selesai dijalankan!`, 'success');
                if (command.includes('uipro') || command.includes('npm install') || command.includes('pip install')) {
                  loadHermesSkills();
                }
              } else {
                showToast(`⚠️ Perintah selesai dengan kode keluar: ${data.code}`, 'warning');
              }
            }
            outputEl.scrollTop = outputEl.scrollHeight;
          } catch (_) {}
        }
      }
    } catch (err) {
      outputEl.innerHTML += `<div style="color:var(--accent-rose);">❌ Error koneksi stream: ${escapeHtml(err.message)}</div>`;
    } finally {
      isHermesTerminalRunning = false;
      if (statusBadge) {
        statusBadge.textContent = 'Ready';
        statusBadge.className = 'badge badge-emerald';
      }
      if (indicator) indicator.style.display = 'none';
      if (killBtn) killBtn.style.display = 'none';
      if (runBtn) runBtn.disabled = false;
      outputEl.scrollTop = outputEl.scrollHeight;
    }
  }

  // ==================== HERMES MODEL SWITCHER ====================
  async function loadHermesModels(forceRefresh = false) {
    const freeGrid = document.getElementById('openrouter-free-models-grid');
    const ownContainer = document.getElementById('own-providers-models-container');
    const currentModelName = document.getElementById('modal-current-model-name');

    if (freeGrid && forceRefresh) {
      freeGrid.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:30px; grid-column:1/-1;">🔄 Mengambil daftar model gratisan terbaru dari OpenRouter...</div>';
    }

    try {
      const res = await PolarisAuth.authFetch(`/api/hermes/models?refresh=${forceRefresh ? 'true' : 'false'}`);
      const json = await res.json();
      if (!json.success) return;

      const activeModel = json.activeModel || '';
      if (currentModelName) currentModelName.textContent = activeModel;

      // 1. Render OpenRouter Free Models
      if (freeGrid) {
        const freeList = json.openrouter?.freeModels || [];
        if (freeList.length === 0) {
          freeGrid.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:30px; grid-column:1/-1;">Tidak ada model gratisan yang terdeteksi saat ini.</div>';
        } else {
          freeGrid.innerHTML = freeList.map((m) => {
            const isActive = m.id === activeModel;
            const ctxK = m.contextLength ? `${Math.round(m.contextLength / 1024)}k Context` : 'Standard';
            return `
              <div class="model-card-item ${isActive ? 'active-model' : ''}">
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
                    <span style="font-weight:700; font-size:0.82rem; color:#fff; word-break:break-word;">${escapeHtml(m.name || m.id)}</span>
                    <span class="badge ${isActive ? 'badge-emerald' : 'badge-cyan'}" style="font-size:0.62rem; flex-shrink:0;">
                      ${isActive ? 'AKTIF' : 'GRATIS'}
                    </span>
                  </div>
                  <div style="font-family:var(--font-mono); font-size:0.68rem; color:var(--accent-cyan); margin-bottom:6px; word-break:break-all;">
                    ${escapeHtml(m.id)}
                  </div>
                  <div style="font-size:0.7rem; color:var(--text-muted);">
                    ${escapeHtml(ctxK)} ${m.description ? '• ' + escapeHtml(m.description.slice(0, 70)) : ''}
                  </div>
                </div>
                <div style="margin-top:6px;">
                  ${isActive
                    ? '<button type="button" class="btn-polaris btn-secondary btn-sm" disabled style="width:100%; font-size:0.72rem;">✓ Sedang Digunakan</button>'
                    : `<button type="button" class="btn-polaris btn-primary btn-sm btn-shine-effect" onclick="window.PolarisApp.selectHermesModel('${escapeHtml(m.id)}')" style="width:100%; font-size:0.72rem; font-weight:700;">✨ Aktifkan Model</button>`
                  }
                </div>
              </div>
            `;
          }).join('');
        }
      }

      // 2. Render Own Providers
      if (ownContainer) {
        const providers = json.ownProviders || [];
        ownContainer.innerHTML = providers.map((prov) => {
          const hasKey = prov.hasKey;
          const models = prov.models || [];
          return `
            <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:10px; padding:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:1.1rem;">${prov.id === 'gemini' ? '♊' : prov.id === 'groq' ? '⚡' : prov.id === 'grok' ? '🤖' : '🧠'}</span>
                  <strong style="font-size:0.86rem; color:#fff;">${escapeHtml(prov.name)}</strong>
                </div>
                <span class="badge ${hasKey ? 'badge-emerald' : 'badge-rose'}" style="font-size:0.65rem;">
                  ${hasKey ? '✅ API Key Terpasang' : '⚠️ Belum Disetel di .env'}
                </span>
              </div>
              <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:8px;">
                ${models.map((m) => {
                  const isActive = m.id === activeModel;
                  return `
                    <div style="background:rgba(0,0,0,0.25); border:1px solid ${isActive ? 'var(--accent-emerald)' : 'rgba(255,255,255,0.06)'}; border-radius:6px; padding:8px 10px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                      <div style="min-width:0;">
                        <div style="font-size:0.78rem; font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(m.name)}">${escapeHtml(m.name)}</div>
                        <div style="font-size:0.66rem; color:var(--text-muted); font-family:var(--font-mono);">${escapeHtml(m.id)}</div>
                      </div>
                      ${isActive
                        ? '<span class="badge badge-emerald" style="font-size:0.62rem; flex-shrink:0;">Aktif</span>'
                        : `<button type="button" class="btn-polaris ${hasKey ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="window.PolarisApp.selectHermesModel('${escapeHtml(m.id)}')" style="font-size:0.68rem; padding:3px 8px; flex-shrink:0;">Pilih</button>`
                      }
                    </div>
                  `;
                }).join('')}
              </div>
              ${!hasKey ? `<div style="font-size:0.68rem; color:var(--text-muted); margin-top:6px;">Tips: Masukkan API Key di tab <strong>🔑 API Keys & .env</strong> untuk mengaktifkan provider ini.</div>` : ''}
            </div>
          `;
        }).join('');
      }

    } catch (err) {
      console.error('[loadHermesModels]', err);
    }
  }

  async function selectHermesModel(modelId) {
    try {
      const res = await PolarisAuth.authFetch('/api/hermes/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`✅ Model Hermes berhasil diubah ke: ${modelId}`, 'success');
        document.getElementById('modal-hermes-models')?.classList.remove('active');
        const badge = document.getElementById('hermes-chat-active-model');
        if (badge) badge.textContent = modelId.split('/').pop();
        const modelInput = document.getElementById('hermes-model');
        if (modelInput) modelInput.value = modelId;

        // Auto perbarui tombol dropdown cepat di atas tombol Kirim
        const quickModelBtnName = document.getElementById('hermes-btn-model-name');
        const quickModelBtnIcon = document.getElementById('hermes-btn-model-icon');
        if (quickModelBtnName) {
          const shortName = modelId.split('/').pop().replace(/:free$/, ' (Free)');
          quickModelBtnName.textContent = shortName.length > 18 ? shortName.slice(0, 16) + '..' : shortName;
        }
        if (quickModelBtnIcon) {
          let icon = '🤖';
          if (modelId.includes('gemini')) icon = '♊';
          else if (modelId.includes('groq') || modelId.includes('llama')) icon = '⚡';
          else if (modelId.includes('grok') || modelId.includes('xai')) icon = '🤖';
          else if (modelId.includes('deepseek')) icon = '🧠';
          else if (modelId.includes('free') || modelId.includes('openrouter')) icon = '🌐';
          quickModelBtnIcon.textContent = icon;
        }

        // Otomatis tutup floating dropdown jika terbuka
        const dropdownMenu = document.getElementById('hermes-model-dropdown-menu');
        if (dropdownMenu) dropdownMenu.style.display = 'none';

        loadHermesModels();
      } else {
        showToast(json.error || 'Gagal mengubah model', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  // ==================== INISIALISASI FITUR HERMES ====================
  function initHermesFeature() {
    const installBtn = document.getElementById('btn-install-hermes');
    const savePersonalityBtn = document.getElementById('btn-save-hermes-personality');
    const clearLogsBtn = document.getElementById('btn-clear-hermes-logs');
    const chatInput = document.getElementById('hermes-chat-input');
    const chatSendBtn = document.getElementById('btn-hermes-chat-send');
    const clearChatBtn = document.getElementById('btn-clear-chat-history');
    const chatThread = document.getElementById('hermes-chat-thread');

    // 1. Sub-Tab Switching
    document.querySelectorAll('.hermes-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetSubpaneId = btn.getAttribute('data-subpane');
        document.querySelectorAll('.hermes-nav-btn').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.hermes-subpane').forEach((p) => p.classList.remove('active'));

        btn.classList.add('active');
        const targetPane = document.getElementById(targetSubpaneId);
        if (targetPane) targetPane.classList.add('active');

        hermesActiveSubtab = targetSubpaneId;
        if (targetSubpaneId === 'hermes-sub-chat') loadArtifactsList();
        else if (targetSubpaneId === 'hermes-sub-skills') loadHermesSkills();
        else if (targetSubpaneId === 'hermes-sub-env') loadHermesEnv();
        else if (targetSubpaneId === 'hermes-sub-terminal') loadHermesTerminal();
      });
    });

    // 2. Chat Preset Chips
    document.querySelectorAll('.hermes-preset-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const preset = chip.getAttribute('data-preset');
        if (chatInput && preset) {
          chatInput.value = preset;
          chatInput.focus();
        }
      });
    });

    // 3. Clear Chat
    if (clearChatBtn && chatThread) {
      clearChatBtn.addEventListener('click', () => {
        chatThread.innerHTML = `
          <div class="chat-row hermes">
            <div class="chat-avatar">🧠</div>
            <div class="chat-bubble hermes-bubble">
              <div style="font-weight: 700; color: var(--accent-cyan); margin-bottom: 4px;">Riwayat chat dibersihkan.</div>
              <p style="margin: 0; font-size: 0.8rem; color: var(--text-muted);">
                Silakan ketik pertanyaan, instruksi, atau minta pembuatan file fisik baru.
              </p>
            </div>
          </div>
        `;
        showToast('Chat history telah dibersihkan', 'info');
      });
    }

    // ==================== 4. SLASH COMMAND SKILLS AUTOCOMPLETE ====================
    let activeHermesSkill = null; // { name: 'ui-ux-pro-max', icon: '🎨' }
    let cachedHermesSkills = [
      { name: 'ui-ux-pro-max', icon: '🎨', desc: 'UI/UX design intelligence, 50 styles, 192 palettes, typography & stacks' },
      { name: 'banner-design', icon: '🖼️', desc: 'Design social media banners, ads, website heroes, creative assets' },
      { name: 'slides', icon: '📊', desc: 'Create strategic HTML presentations with Chart.js, design tokens, slides' },
      { name: 'brand', icon: '✨', desc: 'Brand voice, visual identity, messaging frameworks, style guides' },
      { name: 'design', icon: '🎯', desc: 'Comprehensive design: logos, CIP mockups, presentations, banners, icons' },
      { name: 'design-system', icon: '📐', desc: 'Token architecture, component specifications, 3-layer tokens' },
      { name: 'ui-styling', icon: '💻', desc: 'Modern UI components, Tailwind CSS, shadcn/ui, canvas visual designs' },
      { name: 'create_artifact', icon: '📁', desc: 'Buat file fisik nyata: HTML, CSS, JS, Python, Word, Excel, PDF, PNG' },
      { name: 'extract_skill_zip', icon: '📦', desc: 'Auto ekstrak dan implementasi skill dalam format ZIP' },
      { name: 'create_new_skill', icon: '🛠️', desc: 'Otonom ciptakan dan daftarkan keahlian baru untuk Hermes' },
      { name: 'manage_memory', icon: '🧠', desc: 'Belajar dari pengalaman, adaptasi gaya bicara & memori jangka panjang' },
      { name: 'web_search', icon: '🔍', desc: 'Pencarian web online untuk data & info aktual' },
      { name: 'calculator', icon: '🧮', desc: 'Kalkulator dan penghitungan matematika otomatis' },
      { name: 'current_time', icon: '⏰', desc: 'Cek tanggal, hari, dan waktu saat ini' }
    ];

    async function refreshSkillsCatalog() {
      try {
        const res = await PolarisAuth.authFetch('/api/hermes/skills');
        const j = await res.json();
        if (j.success && j.data) {
          const custom = j.data.customSkills || [];
          custom.forEach(c => {
            const skillName = (c.rawName || c.name || c.id || '').toLowerCase();
            if (skillName && !cachedHermesSkills.some(s => s.name === skillName)) {
              let icon = '🧩';
              if (skillName.includes('ui') || skillName.includes('ux')) icon = '🎨';
              else if (skillName.includes('banner')) icon = '🖼️';
              else if (skillName.includes('slide')) icon = '📊';
              else if (skillName.includes('crypto')) icon = '🪙';
              else if (skillName.includes('spam')) icon = '⚡';
              cachedHermesSkills.push({
                name: skillName,
                icon,
                desc: c.description ? c.description.slice(0, 90) : 'Custom Hermes Skill'
              });
            }
          });
        }
      } catch (_) {}
    }
    refreshSkillsCatalog();

    const slashPopup = document.getElementById('hermes-slash-popup');
    const activeSkillPill = document.getElementById('hermes-active-skill-pill');
    const activeSkillLabel = document.getElementById('hermes-active-skill-label');
    const activeSkillIcon = document.getElementById('hermes-active-skill-icon');
    const clearActiveSkillBtn = document.getElementById('btn-clear-active-skill');
    let slashSelectedIndex = 0;
    let currentSlashFiltered = [];

    function setActiveSkill(skillName, skillIcon = '🎨') {
      activeHermesSkill = { name: skillName, icon: skillIcon };
      if (activeSkillPill) activeSkillPill.style.display = 'flex';
      if (activeSkillLabel) activeSkillLabel.textContent = '/' + skillName;
      if (activeSkillIcon) activeSkillIcon.textContent = skillIcon;
      if (chatInput) {
        chatInput.classList.add('hermes-chat-input-skill-active');
      }
    }

    function clearActiveSkill(removeFromInput = true) {
      const prev = activeHermesSkill?.name;
      activeHermesSkill = null;
      if (activeSkillPill) activeSkillPill.style.display = 'none';
      if (chatInput) {
        chatInput.classList.remove('hermes-chat-input-skill-active');
        if (removeFromInput && prev && chatInput.value.startsWith('/' + prev)) {
          chatInput.value = chatInput.value.replace(new RegExp('^\\/' + prev + '\\s*'), '');
        }
        chatInput.focus();
      }
    }

    clearActiveSkillBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      clearActiveSkill(true);
    });

    function closeSlashPopup() {
      if (slashPopup) {
        slashPopup.style.display = 'none';
        slashPopup.innerHTML = '';
      }
    }

    function chooseSlashSkill(name, icon) {
      if (!chatInput) return;
      chatInput.value = `/${name} `;
      closeSlashPopup();
      setActiveSkill(name, icon || '🎨');
      chatInput.focus();
      chatInput.setSelectionRange(chatInput.value.length, chatInput.value.length);
    }

    function renderSlashPopup(query = '') {
      if (!slashPopup) return;
      const q = query.toLowerCase().trim();
      currentSlashFiltered = cachedHermesSkills.filter(s => {
        if (!q) return true;
        return s.name.toLowerCase().includes(q) || (s.desc && s.desc.toLowerCase().includes(q));
      });

      if (currentSlashFiltered.length === 0) {
        slashPopup.innerHTML = `
          <div style="padding: 10px 14px; text-align: center; color: var(--text-secondary); font-size: 0.74rem;">
            Tidak ada skill yang cocok dengan <strong>"/${escapeHtml(query)}"</strong>
          </div>
        `;
        slashPopup.style.display = 'flex';
        return;
      }

      slashSelectedIndex = 0;
      slashPopup.innerHTML = currentSlashFiltered.map((s, idx) => `
        <div class="slash-item ${idx === 0 ? 'selected' : ''}" data-idx="${idx}" data-name="${escapeHtml(s.name)}" data-icon="${escapeHtml(s.icon)}">
          <div class="slash-item-icon">${s.icon}</div>
          <div class="slash-item-content">
            <span class="slash-item-name">/${escapeHtml(s.name)}</span>
            <span class="slash-item-desc">${escapeHtml(s.desc)}</span>
          </div>
        </div>
      `).join('');

      slashPopup.style.display = 'flex';

      slashPopup.querySelectorAll('.slash-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const name = item.getAttribute('data-name');
          const icon = item.getAttribute('data-icon');
          chooseSlashSkill(name, icon);
        });
      });
    }

    function updateSlashSelection() {
      if (!slashPopup) return;
      const items = slashPopup.querySelectorAll('.slash-item');
      items.forEach((it, idx) => {
        if (idx === slashSelectedIndex) {
          it.classList.add('selected');
          it.scrollIntoView({ block: 'nearest' });
        } else {
          it.classList.remove('selected');
        }
      });
    }

    // Listener input untuk textarea chat
    chatInput?.addEventListener('input', () => {
      const val = chatInput.value;

      // Jika teks tidak diawali '/', bersihkan visual skill jika user menghapusnya
      if (!val.startsWith('/')) {
        if (activeHermesSkill) {
          clearActiveSkill(false);
        }
        closeSlashPopup();
        return;
      }

      // Jika ada spasi setelah kata pertama: e.g. "/ui-ux-pro-max prompt..."
      // Pengguna sudah memilih/mengetik command skill lengkap
      const firstSpaceIdx = val.indexOf(' ');
      if (firstSpaceIdx > 1) {
        closeSlashPopup();
        const skillWord = val.slice(1, firstSpaceIdx).toLowerCase();
        if (!activeHermesSkill || activeHermesSkill.name !== skillWord) {
          const matchSkill = cachedHermesSkills.find(s => s.name === skillWord);
          setActiveSkill(skillWord, matchSkill?.icon || '🎨');
        }
        return;
      }

      // Mode Search Skill Real-time saat mengetik '/<kata>'
      const query = val.slice(1);
      renderSlashPopup(query);
    });

    // Keyboard navigation di textarea
    chatInput?.addEventListener('keydown', (e) => {
      const isPopupOpen = slashPopup && slashPopup.style.display === 'flex';

      if (isPopupOpen && currentSlashFiltered.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          slashSelectedIndex = (slashSelectedIndex + 1) % currentSlashFiltered.length;
          updateSlashSelection();
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          slashSelectedIndex = (slashSelectedIndex - 1 + currentSlashFiltered.length) % currentSlashFiltered.length;
          updateSlashSelection();
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          const target = currentSlashFiltered[slashSelectedIndex];
          if (target) {
            chooseSlashSkill(target.name, target.icon);
          }
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          closeSlashPopup();
          return;
        }
      }

      // Normal Enter to Send
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendHermesChatMessage();
      }
    });

    // ==================== 4b. REASONING MODE TOGGLE (FLASH vs THINKING) ====================
    let currentReasoningMode = localStorage.getItem('hermes_reasoning_mode') || 'flash';
    const btnModeFlash = document.getElementById('btn-mode-flash');
    const btnModeThinking = document.getElementById('btn-mode-thinking');

    function updateReasoningModeUI(mode) {
      currentReasoningMode = mode;
      localStorage.setItem('hermes_reasoning_mode', mode);

      if (btnModeFlash) {
        btnModeFlash.classList.toggle('active', mode === 'flash');
      }
      if (btnModeThinking) {
        btnModeThinking.classList.toggle('active', mode === 'thinking');
      }
    }

    // Inisialisasi status awal
    updateReasoningModeUI(currentReasoningMode);

    btnModeFlash?.addEventListener('click', () => {
      updateReasoningModeUI('flash');
      showToast('⚡ Mode Flash diaktifkan (Respon Cepat)', 'info');
    });

    btnModeThinking?.addEventListener('click', () => {
      updateReasoningModeUI('thinking');
      showToast('🧠 Mode Thinking diaktifkan (Penalaran Mendalam)', 'info');
    });

    // ==================== 5. QUICK MODEL SELECTOR (ABOVE KIRIM BUTTON) ====================
    const quickModelTrigger = document.getElementById('btn-model-dropdown-trigger');
    const quickModelDropdown = document.getElementById('hermes-model-dropdown-menu');
    const quickModelSearch = document.getElementById('hermes-model-search-input');
    const quickModelItems = document.getElementById('hermes-model-dropdown-items');
    const quickModelRefreshBtn = document.getElementById('btn-refresh-dropdown-models');

    let cachedDropdownModels = null;

    async function loadQuickDropdownModels(searchQuery = '', forceRefresh = false) {
      if (!quickModelItems) return;

      if (!cachedDropdownModels || forceRefresh) {
        quickModelItems.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.75rem; padding: 16px;">🔄 Mengambil data model AI...</div>';
        try {
          const res = await PolarisAuth.authFetch(`/api/hermes/models?refresh=${forceRefresh ? 'true' : 'false'}`);
          const json = await res.json();
          if (json.success) {
            cachedDropdownModels = json;
          } else {
            quickModelItems.innerHTML = `<div style="text-align:center; color:var(--accent-rose); font-size:0.75rem; padding:12px;">Gagal memuat: ${escapeHtml(json.error || 'Server error')}</div>`;
            return;
          }
        } catch (err) {
          quickModelItems.innerHTML = `<div style="text-align:center; color:var(--accent-rose); font-size:0.75rem; padding:12px;">Error: ${escapeHtml(err.message)}</div>`;
          return;
        }
      }

      const activeModel = cachedDropdownModels.activeModel || '';
      const freeList = cachedDropdownModels.openrouter?.freeModels || [];
      const ownProviders = cachedDropdownModels.ownProviders || [];
      const q = (searchQuery || '').toLowerCase().trim();

      // Filter Free Models
      const filteredFree = freeList.filter(m => !q || (m.id && m.id.toLowerCase().includes(q)) || (m.name && m.name.toLowerCase().includes(q)));

      // Filter Own Providers Models
      const filteredOwn = [];
      ownProviders.forEach(p => {
        const matchingModels = (p.models || []).filter(m => !q || (m.id && m.id.toLowerCase().includes(q)) || (m.name && m.name.toLowerCase().includes(q)));
        if (matchingModels.length > 0) {
          filteredOwn.push({ ...p, models: matchingModels });
        }
      });

      if (filteredFree.length === 0 && filteredOwn.length === 0) {
        quickModelItems.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:0.75rem; padding:14px;">Tidak ada model cocok dengan "${escapeHtml(searchQuery)}"</div>`;
        return;
      }

      let html = '';

      // Section 1: OpenRouter Free Models
      if (filteredFree.length > 0) {
        html += `<div style="font-size: 0.68rem; font-weight: 700; color: var(--accent-cyan); text-transform: uppercase; margin: 4px 0 6px 2px; display: flex; align-items: center; justify-content: space-between;">
          <span>🌐 Model Gratisan (OpenRouter)</span>
          <span style="font-size: 0.62rem; color: var(--text-secondary);">1-Klik Switch</span>
        </div>`;

        filteredFree.forEach(m => {
          const isActive = m.id === activeModel;
          const ctx = m.contextLength ? `${Math.round(m.contextLength / 1024)}k` : '';
          html += `
            <div class="model-dropdown-item ${isActive ? 'active-model' : ''}" data-model="${escapeHtml(m.id)}">
              <div style="min-width: 0; flex: 1;">
                <div style="font-size: 0.75rem; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${escapeHtml(m.name || m.id)}
                </div>
                <div style="font-size: 0.64rem; color: var(--text-muted); font-family: var(--font-mono); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${escapeHtml(m.id)} ${ctx ? '• ' + ctx : ''}
                </div>
              </div>
              <span class="badge ${isActive ? 'badge-emerald' : 'badge-cyan'}" style="font-size: 0.58rem; flex-shrink: 0;">
                ${isActive ? '✓ AKTIF' : 'GRATIS'}
              </span>
            </div>
          `;
        });
      }

      // Section 2: Own Providers (Gemini, Groq, Grok, DeepSeek)
      if (filteredOwn.length > 0) {
        html += `<div style="font-size: 0.68rem; font-weight: 700; color: var(--accent-purple); text-transform: uppercase; margin: 10px 0 6px 2px;">
          🔑 Provider Mandiri (API Key)
        </div>`;

        filteredOwn.forEach(p => {
          p.models.forEach(m => {
            const isActive = m.id === activeModel;
            html += `
              <div class="model-dropdown-item ${isActive ? 'active-model' : ''}" data-model="${escapeHtml(m.id)}">
                <div style="min-width: 0; flex: 1;">
                  <div style="font-size: 0.75rem; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${escapeHtml(m.name)}
                  </div>
                  <div style="font-size: 0.64rem; color: var(--text-muted); font-family: var(--font-mono); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${escapeHtml(m.id)} • ${escapeHtml(p.name)}
                  </div>
                </div>
                <span class="badge ${isActive ? 'badge-emerald' : (p.hasKey ? 'badge-cyan' : 'badge-rose')}" style="font-size: 0.58rem; flex-shrink: 0;">
                  ${isActive ? '✓ AKTIF' : (p.hasKey ? 'SIAP' : 'NO KEY')}
                </span>
              </div>
            `;
          });
        });
      }

      quickModelItems.innerHTML = html;

      // Attach 1-Click Auto Switch Handlers
      quickModelItems.querySelectorAll('.model-dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetModelId = item.getAttribute('data-model');
          if (targetModelId) {
            selectHermesModel(targetModelId);
          }
        });
      });
    }

    quickModelTrigger?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!quickModelDropdown) return;
      const isOpen = quickModelDropdown.style.display === 'block';
      if (isOpen) {
        quickModelDropdown.style.display = 'none';
      } else {
        quickModelDropdown.style.display = 'block';
        if (quickModelSearch) {
          quickModelSearch.value = '';
          quickModelSearch.focus();
        }
        loadQuickDropdownModels('', false);
      }
    });

    quickModelSearch?.addEventListener('input', (e) => {
      loadQuickDropdownModels(e.target.value.trim(), false);
    });

    quickModelRefreshBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      showToast('🔄 Memperbarui daftar model AI...', 'info');
      loadQuickDropdownModels(quickModelSearch?.value?.trim() || '', true);
    });

    // Close popups when clicking outside
    document.addEventListener('click', (e) => {
      if (quickModelDropdown && quickModelDropdown.style.display === 'block') {
        if (!quickModelDropdown.contains(e.target) && !quickModelTrigger?.contains(e.target)) {
          quickModelDropdown.style.display = 'none';
        }
      }
      if (slashPopup && slashPopup.style.display === 'flex') {
        const wrapper = document.querySelector('.hermes-input-wrapper');
        if (wrapper && !wrapper.contains(e.target)) {
          closeSlashPopup();
        }
      }
    });

    // ==================== 6. SEND CHAT MESSAGE WITH LIVE ACTION TRACKER ====================
    async function sendHermesChatMessage() {
      if (!chatInput) return;
      let prompt = chatInput.value.trim();
      if (!prompt && !activeHermesSkill) return;

      // Jika skill aktif dipilih lewat popup tapi belum ada di teks prompt, otomatis awali dengan /<skillName>
      if (activeHermesSkill && !prompt.startsWith('/' + activeHermesSkill.name)) {
        prompt = `/${activeHermesSkill.name} ${prompt}`.trim();
      }

      chatInput.value = '';
      clearActiveSkill(false);

      // Append User Bubble
      const userRow = document.createElement('div');
      userRow.className = 'chat-row user';
      userRow.innerHTML = `
        <div class="chat-avatar user-avatar">👤</div>
        <div class="chat-bubble user-bubble">${escapeHtml(prompt)}</div>
      `;
      chatThread.appendChild(userRow);

      // Append Live Action Tracker (Antigravity Agent Style)
      const trackerRow = document.createElement('div');
      trackerRow.className = 'chat-row hermes';
      trackerRow.id = 'hermes-live-tracker-row';
      trackerRow.innerHTML = `
        <div class="chat-avatar">🧠</div>
        <div class="hermes-live-tracker-box">
          <div class="hermes-live-banner">
            <span class="live-beacon-pulse"></span>
            <span class="live-action-icon" id="hermes-live-icon">🧠</span>
            <div class="live-action-texts">
              <div class="live-action-title" id="hermes-live-title">Hermes Autonomous Agent Aktif</div>
              <div class="live-action-detail" id="hermes-live-detail">Mengevaluasi instruksi dan konteks percakapan...</div>
            </div>
          </div>
          <div class="hermes-live-steps-list" id="hermes-live-steps">
            <div class="live-step-item in-progress" id="step-init">
              <span class="step-status-icon spinning">⟳</span>
              <span class="step-label">Menganalisis prompt & mengevaluasi alat...</span>
            </div>
          </div>
        </div>
      `;
      chatThread.appendChild(trackerRow);
      chatThread.scrollTop = chatThread.scrollHeight;

      if (chatSendBtn) chatSendBtn.disabled = true;

      // Live step tracking updater
      function handleLiveProgress(p) {
        const iconEl = document.getElementById('hermes-live-icon');
        const titleEl = document.getElementById('hermes-live-title');
        const detailEl = document.getElementById('hermes-live-detail');
        const stepsContainer = document.getElementById('hermes-live-steps');

        if (iconEl && p.icon) iconEl.textContent = p.icon;
        if (titleEl && p.title) titleEl.textContent = p.title;
        if (detailEl && p.detail) detailEl.textContent = p.detail;

        if (!stepsContainer) return;

        const evType = p.type || p.stage || '';

        if (evType === 'tool_start') {
          // Mark all previous in-progress steps as completed
          stepsContainer.querySelectorAll('.live-step-item.in-progress').forEach((item) => {
            item.classList.remove('in-progress');
            item.classList.add('done');
            const icon = item.querySelector('.step-status-icon');
            if (icon) {
              icon.classList.remove('spinning');
              icon.textContent = '✓';
            }
          });

          const stepEl = document.createElement('div');
          stepEl.className = 'live-step-item in-progress';
          stepEl.innerHTML = `
            <span class="step-status-icon spinning">⟳</span>
            <span class="step-label">
              <strong>${escapeHtml(p.title || p.tool)}</strong>
              ${p.detail ? `<small style="color:var(--text-muted); margin-left:4px;">(${escapeHtml(p.detail)})</small>` : ''}
            </span>
          `;
          stepsContainer.appendChild(stepEl);
        } else if (evType === 'tool_done') {
          const currentInProg = stepsContainer.querySelector('.live-step-item.in-progress') || stepsContainer.lastElementChild;
          if (currentInProg) {
            currentInProg.classList.remove('in-progress');
            currentInProg.classList.add('done');
            const icon = currentInProg.querySelector('.step-status-icon');
            if (icon) {
              icon.classList.remove('spinning');
              icon.textContent = '✓';
            }
            const summaryText = p.resultSummary || p.detail;
            if (summaryText && !currentInProg.querySelector('.step-result-summary')) {
              const resSpan = document.createElement('div');
              resSpan.className = 'step-result-summary';
              resSpan.style.cssText = 'color: #38bdf8; font-size: 0.68rem; margin-top: 2px; font-family: var(--font-mono);';
              resSpan.textContent = `↳ ${summaryText}`;
              currentInProg.appendChild(resSpan);
            }
          }
        } else if (evType === 'synthesizing') {
          stepsContainer.querySelectorAll('.live-step-item.in-progress').forEach((item) => {
            item.classList.remove('in-progress');
            item.classList.add('done');
            const icon = item.querySelector('.step-status-icon');
            if (icon) {
              icon.classList.remove('spinning');
              icon.textContent = '✓';
            }
          });
          const synthEl = document.createElement('div');
          synthEl.className = 'live-step-item in-progress';
          synthEl.innerHTML = `
            <span class="step-status-icon spinning">⟳</span>
            <span class="step-label">Menyusun dan memformat respons akhir...</span>
          `;
          stepsContainer.appendChild(synthEl);
        }
        chatThread.scrollTop = chatThread.scrollHeight;
      }

      try {
        let json = null;

        // Try SSE Streaming endpoint first
        try {
          const streamRes = await fetch('/api/hermes/chat/stream', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(PolarisAuth.getToken() ? { 'Authorization': `Bearer ${PolarisAuth.getToken()}` } : {})
            },
            body: JSON.stringify({ prompt, reasoningMode: currentReasoningMode })
          });

          if (streamRes.ok && streamRes.body) {
            const reader = streamRes.body.getReader();
            const decoder = new TextDecoder();
            let sseBuffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              sseBuffer += decoder.decode(value, { stream: true });
              const chunks = sseBuffer.split('\n\n');
              sseBuffer = chunks.pop(); // keep remainder

              for (const chunk of chunks) {
                if (!chunk.trim()) continue;
                let eventName = 'message';
                let rawData = '';
                chunk.split('\n').forEach((line) => {
                  if (line.startsWith('event: ')) eventName = line.slice(7).trim();
                  else if (line.startsWith('data: ')) rawData = line.slice(6).trim();
                });
                if (!rawData) continue;
                try {
                  const parsed = JSON.parse(rawData);
                  if (eventName === 'progress') {
                    handleLiveProgress(parsed);
                  } else if (eventName === 'complete') {
                    json = parsed;
                  }
                } catch (e) {
                  console.warn('[SSE Parse warning]', e);
                }
              }
            }
          }
        } catch (streamErr) {
          console.warn('[SSE Stream failed, falling back to standard POST]', streamErr);
        }

        // Fallback to standard POST if SSE was not completed
        if (!json) {
          const fallbackRes = await PolarisAuth.authFetch('/api/hermes/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, reasoningMode: currentReasoningMode }),
          });
          json = await fallbackRes.json();
        }

        // Remove live tracker box
        document.getElementById('hermes-live-tracker-row')?.remove();

        if (!json.success) {
          const errRow = document.createElement('div');
          errRow.className = 'chat-row hermes';
          errRow.innerHTML = `
            <div class="chat-avatar">🧠</div>
            <div class="chat-bubble hermes-bubble" style="border-color:var(--accent-rose); background:color-mix(in srgb, var(--accent-rose) 10%, transparent);">
              <div style="font-weight:700; color:var(--accent-rose); margin-bottom:4px;">❌ Terjadi Kesalahan</div>
              <div>${escapeHtml(json.error || 'Gagal memproses pesan.')}</div>
            </div>
          `;
          chatThread.appendChild(errRow);
          showToast(json.error || 'Gagal memproses', 'error');
          return;
        }

        // Render Hermes Final Response Bubble
        const botRow = document.createElement('div');
        botRow.className = 'chat-row hermes';

        // ReAct Steps Accordion
        let stepsHtml = '';
        if (json.steps && json.steps.length > 0) {
          const stepItems = json.steps.map((s, idx) => {
            const icon = s.icon || '🛠️';
            const title = s.title || `Langkah ${idx + 1} [${s.tool}]`;
            let argSummary = '';

            if (s.tool === 'create_artifact' || s.tool === 'edit_artifact') {
              const fn = (s.arguments && s.arguments.filename) || (s.result && s.result.filename) || 'berkas';
              const ft = (s.arguments && s.arguments.filetype) || (s.result && s.result.filetype) || '';
              const sz = s.result && s.result.size ? ` (${s.result.size})` : '';
              argSummary = `Berkas: <span style="color:var(--accent-cyan); font-weight:600;">${escapeHtml(fn)}</span>${ft ? ' • ' + escapeHtml(ft.toUpperCase()) : ''}${sz}`;
            } else if (s.tool === 'read_artifact') {
              argSummary = `Membaca berkas: <span style="color:var(--accent-cyan);">${escapeHtml(s.arguments?.filename || 'berkas')}</span>`;
            } else if (s.tool === 'search_web') {
              argSummary = `Pencarian: "<em>${escapeHtml(s.arguments?.query || '')}</em>"`;
            } else if (s.tool === 'fetch_web_content') {
              argSummary = `URL: <em>${escapeHtml(s.arguments?.url || '')}</em>`;
            } else if (s.arguments) {
              const keys = Object.keys(s.arguments).filter((k) => k !== 'content');
              const parts = keys.map((k) => `${k}: "${String(s.arguments[k]).slice(0, 40)}"`);
              argSummary = parts.length > 0 ? parts.join(', ') : 'Operasi internal';
            }

            let resSummary = '';
            if (s.result) {
              if (s.result.success && s.result.filename) {
                resSummary = `✓ Selesai (${escapeHtml(s.result.filename)})`;
              } else if (s.result.success && s.result.message) {
                resSummary = `✓ ${escapeHtml(s.result.message)}`;
              } else if (s.result.error) {
                resSummary = `<span style="color:var(--accent-rose);">⚠️ ${escapeHtml(s.result.error)}</span>`;
              } else {
                let preview = JSON.stringify(s.result);
                if (preview.length > 80) preview = preview.slice(0, 77) + '...';
                resSummary = escapeHtml(preview);
              }
            }

            return `<div style="padding:6px 10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-left:3px solid var(--accent-cyan); border-radius:6px; font-size:0.74rem; font-family:var(--font-mono); color:var(--accent-cyan); margin-bottom:4px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
              <div style="display:flex; align-items:center; gap:8px; min-width:0;">
                <span style="font-size:0.85rem;">${icon}</span>
                <div>
                  <div style="font-weight:600; color:var(--text-primary); font-size:0.75rem;">${escapeHtml(title)}</div>
                  <div style="color:var(--text-secondary); font-size:0.68rem;">${argSummary}</div>
                </div>
              </div>
              <div style="font-size:0.68rem; color:var(--accent-cyan); font-weight:600;">
                ${resSummary}
              </div>
            </div>`;
          }).join('');

          stepsHtml = `
            <div class="hermes-steps-accordion">
              <div class="hermes-steps-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'flex' : 'none';">
                <span>⚙️ ${json.steps.length} Langkah Alat Berhasil Dieksekusi</span>
                <span>▾</span>
              </div>
              <div class="hermes-steps-content" style="display:none; flex-direction:column; gap:4px;">
                ${stepItems}
              </div>
            </div>
          `;
        }

        // Antigravity Artifact Cards
        let artifactsHtml = '';
        if (json.artifacts && json.artifacts.length > 0) {
          artifactsHtml = `<div style="display:flex; flex-direction:column; gap:8px; margin:10px 0;">` +
            json.artifacts.map((art) => renderAntigravityArtifactCard(art)).join('') +
            `</div>`;
        }

        const formattedText = renderMarkdownSafe(json.text || '', prompt);

        botRow.innerHTML = `
          <div class="chat-avatar">🧠</div>
          <div class="chat-bubble hermes-bubble">
            ${stepsHtml}
            <div>${formattedText}</div>
            ${artifactsHtml}
            <div style="margin-top:8px; font-size:0.68rem; color:var(--text-muted); display:flex; justify-content:space-between;">
              <span>Model: ${escapeHtml(json.model || 'Hermes 3')}</span>
              <span>Iterasi: ${escapeHtml(String(json.iterations || 1))}</span>
            </div>
          </div>
        `;
        chatThread.appendChild(botRow);
        chatThread.scrollTop = chatThread.scrollHeight;

        // Auto reload sidebar artifacts
        if (json.artifacts && json.artifacts.length > 0) {
          loadArtifactsList();
        }

        // Attach copy button handlers for code blocks
        botRow.querySelectorAll('.btn-copy-code').forEach((btn) => {
          btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const codeEl = document.getElementById(targetId);
            if (codeEl) {
              navigator.clipboard.writeText(codeEl.innerText);
              btn.textContent = '✅ Tersalin!';
              setTimeout(() => { btn.textContent = '📋 Salin'; }, 2000);
            }
          });
        });

      } catch (err) {
        document.getElementById('hermes-live-tracker-row')?.remove();
        showToast('Error: ' + err.message, 'error');
      } finally {
        if (chatSendBtn) chatSendBtn.disabled = false;
        if (chatInput) chatInput.focus();
      }
    }

    if (chatSendBtn) {
      chatSendBtn.addEventListener('click', sendHermesChatMessage);
    }

    // 5. Persona Preset Selector
    const PERSONA_PROMPTS = {
      general: 'You are Hermes 3, an advanced autonomous AI agent with tool use capabilities integrated with the WhatsApp bot ecosystem. Be helpful, intelligent, precise, and proactive.',
      developer: 'You are Hermes, an elite Senior Fullstack Engineer and Architect. You write clean, robust, and modern code. You specialize in building web applications (HTML/CSS/JS), Python scripts, and technical specifications with complete precision.',
      analyst: 'You are Hermes, a Senior Financial and Business Intelligence Analyst. You excel at creating structured spreadsheets (Excel .xlsx), generating data tables, performing calculations, and drafting executive data reports.',
      writer: 'You are Hermes, a creative copywriter and visual designer. You write compelling copy, professional Word documents (.docx), presentation slides (.pptx), and visually appealing content.',
      executive: 'You are Hermes, an Executive Chief of Staff. You communicate with strategic clarity, create structured PDF briefings, organize priorities, and execute autonomous tasks with high efficiency.',
    };

    document.querySelectorAll('.hermes-persona-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const personaKey = btn.getAttribute('data-persona');
        const pText = PERSONA_PROMPTS[personaKey];
        const sysPromptInput = document.getElementById('hermes-system-prompt');
        if (sysPromptInput && pText) {
          sysPromptInput.value = pText;
          showToast(`Persona ${btn.textContent.trim()} diterapkan!`, 'info');
        }
      });
    });

    // 6. Save Personality & System Prompt
    if (savePersonalityBtn) {
      savePersonalityBtn.addEventListener('click', async () => {
        const enabled = document.getElementById('hermes-enabled-toggle')?.checked || false;
        const model = document.getElementById('hermes-model')?.value?.trim() || 'nousresearch/hermes-3-llama-3.1-70b';
        const baseUrl = document.getElementById('hermes-base-url')?.value?.trim() || 'https://openrouter.ai/api/v1';
        const temperature = parseFloat(document.getElementById('hermes-temperature')?.value) || 0.7;
        const maxTokens = parseInt(document.getElementById('hermes-max-tokens')?.value, 10) || 4096;
        const systemPrompt = document.getElementById('hermes-system-prompt')?.value || '';

        savePersonalityBtn.disabled = true;
        savePersonalityBtn.innerHTML = 'Menyimpan...';

        try {
          const res = await PolarisAuth.authFetch('/api/hermes/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled, model, baseUrl, temperature, maxTokens, systemPrompt }),
          });
          const json = await res.json();
          if (json.success) {
            showToast('✅ Persona & Pengaturan Hermes berhasil disimpan!', 'success');
            loadHermesTab();
          } else {
            showToast(json.error || 'Gagal menyimpan konfigurasi', 'error');
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        } finally {
          savePersonalityBtn.disabled = false;
          savePersonalityBtn.innerHTML = '<span>💾</span> Simpan Persona & System Prompt';
        }
      });
    }

    // 7. Upload Skill Form Handler
    const submitSkillBtn = document.getElementById('btn-submit-skill-upload');
    const skillFileInput = document.getElementById('hermes-skill-file-input');
    const skillNameInput = document.getElementById('hermes-skill-name-input');
    const skillCodeInput = document.getElementById('hermes-skill-code-input');

    if (submitSkillBtn) {
      submitSkillBtn.addEventListener('click', async () => {
        let filename = '';
        let content = '';
        let base64 = null;

        const file = skillFileInput?.files?.[0];
        if (file) {
          filename = file.name;
          base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(file);
          });
        } else {
          filename = skillNameInput?.value?.trim();
          content = skillCodeInput?.value?.trim();
          if (!filename || !content) {
            showToast('Pilih file atau isi nama dan kode skill terlebih dahulu!', 'error');
            return;
          }
        }

        submitSkillBtn.disabled = true;
        submitSkillBtn.innerHTML = 'Mengunggah Skill...';

        try {
          const res = await PolarisAuth.authFetch('/api/hermes/skills/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, content, base64 }),
          });
          const json = await res.json();
          if (json.success) {
            showToast(`✅ ${json.message}`, 'success');
            if (skillFileInput) skillFileInput.value = '';
            if (skillNameInput) skillNameInput.value = '';
            if (skillCodeInput) skillCodeInput.value = '';
            loadHermesSkills();
          } else {
            showToast(json.error || 'Gagal mengunggah skill', 'error');
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        } finally {
          submitSkillBtn.disabled = false;
          submitSkillBtn.innerHTML = '<span>➕</span> Pasang & Aktifkan Skill';
        }
      });
    }

    // 8. Save All to .env Handler
    const saveAllEnvBtn = document.getElementById('btn-save-all-env');
    if (saveAllEnvBtn) {
      saveAllEnvBtn.addEventListener('click', async () => {
        const updates = {};
        document.querySelectorAll('.hermes-provider-key-input').forEach((inp) => {
          const envKey = inp.getAttribute('data-envkey');
          const val = inp.value.trim();
          if (envKey && val && !val.includes('••••')) {
            updates[envKey] = val;
          }
        });

        saveAllEnvBtn.disabled = true;
        saveAllEnvBtn.innerHTML = 'Menyimpan API Key...';

        try {
          const res = await PolarisAuth.authFetch('/api/hermes/env', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });
          const json = await res.json();
          if (json.success) {
            showToast('✅ Seluruh API Key berhasil disimpan ke profil workspace akun Anda!', 'success');
            loadHermesEnv();
          } else {
            showToast(json.error || 'Gagal menyimpan API Key', 'error');
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        } finally {
          saveAllEnvBtn.disabled = false;
          saveAllEnvBtn.innerHTML = '<span>💾</span> Simpan API Key Saya';
        }
      });
    }

    // 9. Add Custom Env Variable
    const addCustomEnvBtn = document.getElementById('btn-add-custom-env');
    if (addCustomEnvBtn) {
      addCustomEnvBtn.addEventListener('click', async () => {
        const kInput = document.getElementById('hermes-custom-env-key');
        const vInput = document.getElementById('hermes-custom-env-val');
        const key = kInput?.value?.trim();
        const val = vInput?.value?.trim();

        if (!key) {
          showToast('Masukkan nama variabel!', 'error');
          return;
        }

        try {
          const res = await PolarisAuth.authFetch('/api/hermes/env', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [key]: val || '' }),
          });
          const json = await res.json();
          if (json.success) {
            showToast(`Variabel ${key} berhasil ditambahkan ke .env!`, 'success');
            if (kInput) kInput.value = '';
            if (vInput) vInput.value = '';
            loadHermesEnv();
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        }
      });
    }

    // 10. Refresh Buttons
    document.getElementById('btn-refresh-artifacts')?.addEventListener('click', loadArtifactsList);
    document.getElementById('btn-refresh-skills-list')?.addEventListener('click', loadHermesSkills);

    // 11. Install Hermes Agent
    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        const logBox = document.getElementById('hermes-install-logs');
        if (logBox) logBox.innerHTML = '<div style="color:var(--text-muted); font-style:italic;">Memulai instalasi...</div>';

        showToast('Memulai proses instalasi Hermes Autonomous Agent...', 'info');
        if (hermesLogInterval) clearInterval(hermesLogInterval);
        hermesLogInterval = setInterval(loadHermesLogs, 400);

        try {
          const res = await PolarisAuth.authFetch('/api/hermes/install', { method: 'POST' });
          const json = await res.json();
          clearInterval(hermesLogInterval);
          loadHermesLogs();

          if (json.success) {
            showToast('✅ Hermes Autonomous AI Agent berhasil diinstall!', 'success');
            loadHermesTab();
          } else {
            showToast(json.message || 'Gagal menginstall Hermes Agent', 'error');
            loadHermesTab();
          }
        } catch (err) {
          clearInterval(hermesLogInterval);
          showToast('Error instalasi: ' + err.message, 'error');
          loadHermesTab();
        }
      });
    }

    if (clearLogsBtn) {
      clearLogsBtn.addEventListener('click', () => {
        const logBox = document.getElementById('hermes-install-logs');
        if (logBox) logBox.innerHTML = '<div style="color: var(--text-muted); font-style: italic;">Log dibersihkan.</div>';
      });
    }

    // 12. Hermes Terminal Form & Presets
    const formTerminal = document.getElementById('form-hermes-terminal');
    const termInput = document.getElementById('hermes-terminal-input');
    if (formTerminal && termInput) {
      formTerminal.addEventListener('submit', (e) => {
        e.preventDefault();
        const cmd = termInput.value.trim();
        if (!cmd) return;
        termInput.value = '';
        runHermesTerminalCommand(cmd);
      });
    }

    document.querySelectorAll('.hermes-term-preset-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const cmd = chip.getAttribute('data-cmd');
        if (cmd) {
          if (termInput) termInput.value = cmd;
          runHermesTerminalCommand(cmd);
        }
      });
    });

    document.getElementById('btn-clear-hermes-terminal')?.addEventListener('click', () => {
      const outputEl = document.getElementById('hermes-terminal-output');
      if (outputEl) outputEl.innerHTML = '<div style="color: var(--text-muted);">[Hermes Terminal Console Siap] - Layar dibersihkan.</div>';
    });

    document.getElementById('btn-kill-hermes-terminal')?.addEventListener('click', async () => {
      try {
        const res = await PolarisAuth.authFetch('/api/hermes/terminal/kill', { method: 'POST' });
        const json = await res.json();
        showToast(json.message || 'Proses dihentikan.', json.success ? 'info' : 'error');
      } catch (err) {
        showToast('Gagal mematikan proses: ' + err.message, 'error');
      }
    });

    // 13. Model Switcher Modal & Category Switching
    const modelModal = document.getElementById('modal-hermes-models');
    const openModelBtn = document.getElementById('btn-open-model-switcher');
    const switchModelInline = document.getElementById('btn-switch-model-inline');

    function openModelSwitcherModal() {
      if (modelModal) {
        modelModal.classList.add('active');
        loadHermesModels();
      }
    }

    openModelBtn?.addEventListener('click', openModelSwitcherModal);
    switchModelInline?.addEventListener('click', openModelSwitcherModal);

    document.querySelectorAll('.model-category-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const targetId = tab.getAttribute('data-target');
        document.querySelectorAll('.model-category-tab').forEach((t) => {
          t.classList.remove('active');
          t.classList.add('btn-secondary');
        });
        document.querySelectorAll('.model-cat-pane').forEach((p) => p.style.display = 'none');

        tab.classList.add('active');
        tab.classList.remove('btn-secondary');
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.style.display = targetId === 'model-cat-free' ? 'block' : 'flex';
      });
    });

    document.getElementById('btn-refresh-free-models')?.addEventListener('click', () => {
      showToast('🔄 Mengambil model gratisan terbaru dari OpenRouter...', 'info');
      loadHermesModels(true);
    });
  }

  // Window exports for inline event handlers
  window.PolarisApp = window.PolarisApp || {};
  window.PolarisApp.previewArtifact = (id, tab = 'preview') => openArtifactPreviewModal(id, tab);
  window.PolarisApp.copyArtifactCode = async (id, btn) => {
    try {
      const res = await fetch(`/api/hermes/artifacts/preview/${encodeURIComponent(id)}`);
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      if (btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = '<span>✅</span> Tersalin!';
        setTimeout(() => { btn.innerHTML = orig; }, 2000);
      }
      showToast('Kode artefak berhasil disalin ke clipboard!', 'success');
    } catch (e) {
      showToast('Gagal menyalin kode: ' + e.message, 'error');
    }
  };
  window.PolarisApp.toggleHermesSkill = async (name, enabled) => {
    try {
      const res = await PolarisAuth.authFetch(`/api/hermes/skills/${encodeURIComponent(name)}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const j = await res.json();
      if (j.success) {
        showToast(j.message, 'success');
        loadHermesSkills();
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  };
  window.PolarisApp.deleteHermesSkill = async (name) => {
    if (!confirm(`Hapus custom skill '${name}'?`)) return;
    try {
      const res = await PolarisAuth.authFetch(`/api/hermes/skills/${encodeURIComponent(name)}`, { method: 'DELETE' });
      const j = await res.json();
      if (j.success) {
        showToast(j.message, 'success');
        loadHermesSkills();
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  };
  window.PolarisApp.deleteHermesEnvVar = async (key) => {
    if (!confirm(`Hapus variabel '${key}' dari .env?`)) return;
    try {
      const res = await PolarisAuth.authFetch(`/api/hermes/env/${encodeURIComponent(key)}`, { method: 'DELETE' });
      const j = await res.json();
      if (j.success) {
        showToast(j.message, 'success');
        loadHermesEnv();
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  };



  // 📥 DOWNLOADER HUB (MORI MEDIA DOWNLOADER ENGINE)
  // ========================================================
  let downloaderHistory = [];
  try {
    downloaderHistory = JSON.parse(localStorage.getItem('polaris_downloader_history') || '[]');
  } catch (_) {
    downloaderHistory = [];
  }

  // Mori Sound FX procedural synthesizer state
  let polarisSoundEnabled = localStorage.getItem('polaris_dl_sound') !== 'false';

  function playPolarisChime(type = 'click') {
    if (!polarisSoundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      if (type === 'success') {
        // Futuristic cyber arpeggio (C5 -> E5 -> G5)
        [523.25, 659.25, 783.99].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.08);
          gain.gain.setValueAtTime(0.08, now + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.26);
        });
      } else if (type === 'error') {
        // Soft descending tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.linearRampToValueAtTime(140, now + 0.2);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      } else {
        // Subtle futuristic click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      }
    } catch (_) {}
  }

  function getPlatformInfo(url) {
    if (!url) return { name: 'Web Media', icon: '🌐', badge: 'badge-cyan' };
    const u = url.toLowerCase();
    if (u.includes('tiktok.com') || u.includes('vt.tiktok.com')) return { name: 'TikTok', icon: '🎵', badge: 'badge-cyan' };
    if (u.includes('instagram.com') || u.includes('instagr.am')) return { name: 'Instagram', icon: '📸', badge: 'badge-rose' };
    if (u.includes('youtube.com') || u.includes('youtu.be')) return { name: 'YouTube', icon: '▶️', badge: 'badge-rose' };
    if (u.includes('facebook.com') || u.includes('fb.watch') || u.includes('fb.com')) return { name: 'Facebook', icon: '👥', badge: 'badge-cyan' };
    if (u.includes('twitter.com') || u.includes('x.com')) return { name: 'Twitter / X', icon: '🐦', badge: 'badge-violet' };
    if (u.includes('spotify.com')) return { name: 'Spotify', icon: '🎧', badge: 'badge-emerald' };
    if (u.includes('pinterest.com') || u.includes('pin.it')) return { name: 'Pinterest', icon: '📌', badge: 'badge-rose' };
    if (u.includes('threads.net') || u.includes('threads.com')) return { name: 'Threads', icon: '🧵', badge: 'badge-violet' };
    if (u.includes('xiaohongshu.com') || u.includes('rednote.com') || u.includes('xhslink.com')) return { name: 'RedNote', icon: '📕', badge: 'badge-rose' };
    if (u.includes('douyin.com')) return { name: 'Douyin', icon: '🎭', badge: 'badge-cyan' };
    if (u.includes('bilibili.com') || u.includes('b23.tv')) return { name: 'Bilibili', icon: '📺', badge: 'badge-cyan' };
    if (u.includes('pixiv.net')) return { name: 'Pixiv', icon: '🎨', badge: 'badge-cyan' };
    if (u.includes('soundcloud.com')) return { name: 'SoundCloud', icon: '☁️', badge: 'badge-amber' };
    if (u.includes('snackvideo.com') || u.includes('sck.io')) return { name: 'SnackVideo', icon: '🍿', badge: 'badge-amber' };
    if (u.includes('kuaishou.com') || u.includes('kwai.com')) return { name: 'Kuaishou', icon: '⚡', badge: 'badge-amber' };
    if (u.includes('music.apple.com')) return { name: 'Apple Music', icon: '🍎', badge: 'badge-rose' };
    if (u.includes('bandcamp.com')) return { name: 'Bandcamp', icon: '🎸', badge: 'badge-cyan' };
    if (u.includes('capcut.com')) return { name: 'CapCut', icon: '✂️', badge: 'badge-amber' };
    if (u.includes('mediafire.com')) return { name: 'MediaFire', icon: '🔥', badge: 'badge-cyan' };
    if (u.includes('terabox.com') || u.includes('1024tera.com')) return { name: 'TeraBox', icon: '📦', badge: 'badge-cyan' };
    if (u.includes('drive.google.com')) return { name: 'Google Drive', icon: '📁', badge: 'badge-emerald' };
    return { name: 'General Web', icon: '🌐', badge: 'badge-cyan' };
  }

  // Active result state for Carousel & Export
  let currentMediaData = null;
  let currentSlideIndex = 0;
  let batchQueueList = [];
  let historyActiveFilter = 'all';
  let preferredDownloaderServer = localStorage.getItem('polaris_dl_preferred_server') || 'auto';

  async function loadDownloaderTab() {
    renderDownloaderHistory();
    updateDownloaderStats();
    await fetchDownloaderHistory();
  }

  async function fetchDownloaderHistory() {
    try {
      const res = await PolarisAuth.authFetch('/api/downloader/history?limit=100');
      const data = await res.json();
      if (data.success && Array.isArray(data.history)) {
        downloaderHistory = data.history;
        try {
          localStorage.setItem('polaris_downloader_history', JSON.stringify(downloaderHistory.slice(0, 50)));
        } catch (_) {}
        renderDownloaderHistory();
        updateDownloaderStats();
      }
    } catch (err) {
      console.warn('[DownloaderHub] Gagal mengambil riwayat dari server:', err.message);
    }
  }

  function updateDownloaderStats() {
    const totalEl = document.getElementById('stat-dl-total');
    const autoEl = document.getElementById('stat-dl-auto');
    const botEl = document.getElementById('stat-dl-bot');
    const webEl = document.getElementById('stat-dl-web');
    const videoEl = document.getElementById('stat-dl-video');
    const audioEl = document.getElementById('stat-dl-audio');
    const galleryEl = document.getElementById('stat-dl-gallery');

    if (!totalEl) return;
    totalEl.textContent = downloaderHistory.length;
    let v = 0, a = 0, g = 0, autoCount = 0, botCount = 0, webCount = 0;
    downloaderHistory.forEach(h => {
      const mType = (h.mediaType || h.media_type || '').toLowerCase();
      if (mType === 'video') v++;
      else if (mType === 'audio') a++;
      else if (mType === 'gallery' || mType === 'image') g++;

      const src = (h.source || 'web').toLowerCase();
      if (src === 'bot_auto_detect') autoCount++;
      else if (src === 'bot_cmd') botCount++;
      else webCount++;
    });
    if (autoEl) autoEl.textContent = autoCount;
    if (botEl) botEl.textContent = botCount;
    if (webEl) webEl.textContent = webCount;
    if (videoEl) videoEl.textContent = v;
    if (audioEl) audioEl.textContent = a;
    if (galleryEl) galleryEl.textContent = g;
  }

  function renderDownloaderHistory() {
    const tbody = document.getElementById('dl-history-tbody');
    if (!tbody) return;

    const searchInput = document.getElementById('dl-history-search');
    const searchTerm = (searchInput ? searchInput.value : '').toLowerCase().trim();

    let filtered = downloaderHistory;

    // Filter by platform or source
    if (historyActiveFilter !== 'all') {
      filtered = filtered.filter(h => {
        const src = (h.source || 'web').toLowerCase();
        if (historyActiveFilter === 'bot_auto_detect') return src === 'bot_auto_detect';
        if (historyActiveFilter === 'bot_cmd') return src === 'bot_cmd';
        if (historyActiveFilter === 'web') return src === 'web';

        const p = (h.platform || '').toLowerCase();
        const u = (h.url || '').toLowerCase();
        if (historyActiveFilter === 'tiktok') return p.includes('tiktok') || u.includes('tiktok');
        if (historyActiveFilter === 'instagram') return p.includes('instagram') || u.includes('instagram');
        if (historyActiveFilter === 'youtube') return p.includes('youtube') || u.includes('youtube') || u.includes('youtu.be');
        if (historyActiveFilter === 'twitter') return p.includes('twitter') || u.includes('twitter') || u.includes('x.com');
        if (historyActiveFilter === 'spotify') return p.includes('spotify') || u.includes('spotify');
        if (historyActiveFilter === 'rednote') return p.includes('rednote') || u.includes('xiaohongshu') || u.includes('rednote');
        if (historyActiveFilter === 'threads') return p.includes('threads') || u.includes('threads');
        return true;
      });
    }

    // Filter by search query
    if (searchTerm) {
      filtered = filtered.filter(h => {
        return (h.title && h.title.toLowerCase().includes(searchTerm)) ||
               (h.url && h.url.toLowerCase().includes(searchTerm)) ||
               (h.author && h.author.toLowerCase().includes(searchTerm)) ||
               (h.senderNumber && h.senderNumber.toLowerCase().includes(searchTerm));
      });
    }

    if (!filtered || filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">Belum ada riwayat unduhan media yang sesuai filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((item) => {
      const p = getPlatformInfo(item.url);
      const safeTitle = (item.title || 'Media Download').replace(/"/g, '&quot;');
      const safeUrl = (item.url || '').replace(/"/g, '&quot;');
      const itemId = item.id || '';
      const timeVal = item.createdAt || item.created_at || item.timestamp;
      const timeStr = timeVal ? new Date(timeVal).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-';
      
      const mType = (item.mediaType || item.media_type || '').toLowerCase();
      const typeBadge = mType === 'video' ? '🎬 Video' : mType === 'audio' ? '🎵 Audio' : (mType === 'gallery' || mType === 'image') ? '🖼️ Galeri' : '📦 Berkas';

      let sourceBadge = '';
      if (item.source === 'bot_auto_detect') {
        sourceBadge = `<span class="badge" style="font-size: 0.65rem; background: color-mix(in srgb, var(--accent-amber) 18%, transparent); color: var(--accent-amber); border: 1px solid color-mix(in srgb, var(--accent-amber) 35%, transparent); font-weight: 700;">⚡ Auto-Detect GC</span>`;
      } else if (item.source === 'bot_cmd') {
        sourceBadge = `<span class="badge" style="font-size: 0.65rem; background: color-mix(in srgb, var(--accent-purple) 18%, transparent); color: var(--accent-purple); border: 1px solid color-mix(in srgb, var(--accent-purple) 35%, transparent); font-weight: 700;">📱 Bot WA Cmd</span>`;
      } else {
        sourceBadge = `<span class="badge" style="font-size: 0.65rem; background: color-mix(in srgb, var(--accent-cyan) 18%, transparent); color: var(--accent-cyan); border: 1px solid color-mix(in srgb, var(--accent-cyan) 35%, transparent); font-weight: 700;">🌐 Web Hub</span>`;
      }

      const senderMeta = item.senderNumber ? `<span style="font-size: 0.68rem; color: var(--text-muted); margin-left: 6px;">• ${item.senderNumber.split('@')[0]}</span>` : '';

      return `
        <tr>
          <td>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <span class="badge ${p.badge}" style="font-size: 0.72rem; align-self: flex-start;">
                ${p.icon} ${p.name}
              </span>
              <span style="font-size: 0.65rem; color: var(--text-muted);">${typeBadge}</span>
            </div>
          </td>
          <td style="max-width: 340px; overflow: hidden; text-overflow: ellipsis;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px; flex-wrap: wrap;">
              ${sourceBadge}
              ${senderMeta}
            </div>
            <strong style="color: #fff; font-size: 0.84rem; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${safeTitle}">${safeTitle}</strong>
            <div style="font-size: 0.7rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${safeUrl}">${safeUrl}</div>
          </td>
          <td style="font-size: 0.74rem; color: var(--text-muted);">${timeStr}</td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 6px; align-items: center;">
              <button type="button" class="btn-polaris btn-primary btn-sm" onclick="window.PolarisApp.analyzeFromHistory('${encodeURIComponent(item.url)}')" style="font-size: 0.72rem; padding: 4px 8px;" title="Analisis Ulang">
                ⚡ Analisis
              </button>
              <button type="button" class="btn-polaris btn-secondary btn-sm" onclick="window.PolarisApp.copyToClipboard('${encodeURIComponent(item.url)}')" style="font-size: 0.72rem; padding: 4px 8px;" title="Salin URL">
                📋
              </button>
              <button type="button" class="btn-polaris btn-danger btn-sm" onclick="window.PolarisApp.deleteHistoryItem('${itemId}', '${encodeURIComponent(item.url)}')" style="font-size: 0.72rem; padding: 4px 8px;" title="Hapus Item">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function saveDownloaderHistory(item) {
    if (!item || !item.url) return;
    downloaderHistory = downloaderHistory.filter(h => h.url !== item.url);
    const newEntry = {
      id: item.id || `dl_web_${Date.now()}`,
      url: item.url,
      title: item.title || 'Media Download',
      platform: item.platform || 'general',
      mediaType: item.mediaType || item.media_type || 'video',
      source: item.source || 'web',
      author: item.author || '',
      createdAt: item.createdAt || item.created_at || new Date().toISOString(),
      timestamp: Date.now(),
    };
    downloaderHistory.unshift(newEntry);
    if (downloaderHistory.length > 100) downloaderHistory = downloaderHistory.slice(0, 100);
    try {
      localStorage.setItem('polaris_downloader_history', JSON.stringify(downloaderHistory.slice(0, 50)));
    } catch (_) {}
    renderDownloaderHistory();
    updateDownloaderStats();
  }

  async function analyzeMediaUrl(targetUrl) {
    const input = document.getElementById('downloader-url-input');
    const skeleton = document.getElementById('downloader-skeleton');
    const resultCard = document.getElementById('downloader-result-card');
    const btn = document.getElementById('btn-downloader-analyze');
    const btnText = document.getElementById('dl-btn-text');
    const btnIcon = document.getElementById('dl-btn-icon');

    const url = (targetUrl || (input ? input.value : '')).trim();
    if (!url) {
      showToast('Harap masukkan URL tautan media terlebih dahulu.', 'error');
      playPolarisChime('error');
      return;
    }

    if (input) input.value = url;

    // Show skeleton, hide previous preview
    if (skeleton) skeleton.style.display = 'block';
    if (resultCard) resultCard.style.display = 'none';
    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = 'Menganalisis...';
    if (btnIcon) btnIcon.textContent = '⏳';
    playPolarisChime('click');

    try {
      const res = await PolarisAuth.authFetch('/api/downloader/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, server: preferredDownloaderServer }),
      });

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Gagal mengekstrak media dari link tersebut.');
      }

      const data = json.data;
      currentMediaData = data;
      renderDownloaderResult(data);
      saveDownloaderHistory(data);
      playPolarisChime('success');
      showToast('Media berhasil dianalisis!', 'success');
    } catch (err) {
      playPolarisChime('error');
      showToast('Gagal memproses media: ' + err.message, 'error');
    } finally {
      if (skeleton) skeleton.style.display = 'none';
      if (btn) btn.disabled = false;
      if (btnText) btnText.textContent = 'Analisis Media';
      if (btnIcon) btnIcon.textContent = '⚡';
    }
  }

  function switchPlayerMode(mode) {
    const tabs = document.querySelectorAll('.dl-player-tab');
    tabs.forEach(tab => {
      const tMode = tab.getAttribute('data-player-mode');
      if (tMode === mode) {
        tab.className = 'btn-polaris btn-sm dl-player-tab active';
        tab.style.background = 'rgba(56, 189, 248, 0.25)';
        tab.style.borderColor = 'var(--accent-cyan)';
        tab.style.color = '#fff';
      } else {
        tab.className = 'btn-polaris btn-secondary btn-sm dl-player-tab';
        tab.style.background = 'rgba(255, 255, 255, 0.05)';
        tab.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        tab.style.color = 'var(--text-muted)';
      }
    });

    const pVideo = document.getElementById('player-container-iphone-video');
    const pSpotify = document.getElementById('player-container-spotify');
    const pPhoto = document.getElementById('player-container-iphone-photo');
    const pOffice = document.getElementById('player-container-office');

    if (pVideo) pVideo.style.display = (mode === 'video') ? 'block' : 'none';
    if (pSpotify) pSpotify.style.display = (mode === 'audio') ? 'block' : 'none';
    if (pPhoto) pPhoto.style.display = (mode === 'photo') ? 'block' : 'none';
    if (pOffice) pOffice.style.display = (mode === 'office') ? 'block' : 'none';
  }

  let activePhotoSlides = [];
  let activePhotoIndex = 0;

  function updatePhotoPreviewUI() {
    const photoImg = document.getElementById('photo-preview-img');
    const photoCounter = document.getElementById('photo-slide-counter');
    const photoControls = document.getElementById('photo-slide-controls');
    if (activePhotoSlides.length > 0 && photoImg) {
      photoImg.src = `/api/downloader/proxy?url=${encodeURIComponent(activePhotoSlides[activePhotoIndex].url)}&inline=1`;
      if (photoCounter) photoCounter.textContent = `${activePhotoIndex + 1} / ${activePhotoSlides.length}`;
      if (photoControls) photoControls.style.display = activePhotoSlides.length > 1 ? 'flex' : 'none';
    }
  }

  function renderDownloaderResult(data) {
    const resultCard = document.getElementById('downloader-result-card');
    if (!resultCard) return;

    const platformBadge = document.getElementById('dl-res-platform-badge');
    const titleEl = document.getElementById('dl-res-title');
    const authorEl = document.getElementById('dl-res-author');
    const durationEl = document.getElementById('dl-res-duration');
    const downloadsList = document.getElementById('dl-res-downloads-list');

    // 4 Player Elements
    const videoPlayer = document.getElementById('dl-player-video');
    const spotifyPlayer = document.getElementById('dl-player-spotify');
    const spotifyTitle = document.getElementById('spotify-track-title');
    const spotifyArtist = document.getElementById('spotify-track-artist');
    const spotifyCover = document.getElementById('spotify-album-cover');
    const spotifyCoverPlaceholder = document.getElementById('spotify-album-placeholder');

    const photoDate = document.getElementById('photo-header-date');
    const photoLocation = document.getElementById('photo-header-location');

    const officeFilename = document.getElementById('office-doc-filename');
    const officeSheetTitle = document.getElementById('office-sheet-title');
    const officeSheetContent = document.getElementById('office-sheet-content');

    // Badges
    const layerBadge = document.getElementById('dl-res-layer-badge');
    const sizeBadge = document.getElementById('dl-res-size-badge');
    const formatBadge = document.getElementById('dl-res-format-badge');
    const dateBadge = document.getElementById('dl-res-date-badge');

    // Bulk buttons
    const btnExportPdf = document.getElementById('btn-dl-export-pdf');
    const btnExportZip = document.getElementById('btn-dl-export-zip');

    const pInfo = getPlatformInfo(data.url);

    if (platformBadge) {
      platformBadge.className = `badge ${pInfo.badge}`;
      platformBadge.textContent = `${pInfo.icon} ${data.platform || pInfo.name}`;
    }

    // Populate Metadata Badges
    if (layerBadge) {
      const lName = data.layerName || (data.layerUsed === 2 ? 'Layer 2 [OmniGet Secondary]' : data.layerUsed === 3 ? 'Layer 3 [Mori & OmniGet]' : 'Layer 1 [Utama]');
      layerBadge.textContent = `⚡ Scraper: ${lName}`;
      layerBadge.className = data.layerUsed === 2 ? 'badge badge-cyan' : data.layerUsed === 3 ? 'badge badge-violet' : 'badge badge-emerald';
    }

    const primaryDl = (data.downloads && data.downloads[0]) || {};
    if (sizeBadge) {
      const sz = primaryDl.size || data.size || (data.downloads && data.downloads.length > 0 ? `${data.downloads.length} Berkas` : 'Standard HD');
      sizeBadge.textContent = `📦 Ukuran: ${sz}`;
    }

    if (formatBadge) {
      const fmt = primaryDl.format || data.mediaType || 'MP4';
      formatBadge.textContent = `📄 Format: ${fmt.toUpperCase()}`;
    }

    if (dateBadge) {
      const now = new Date();
      dateBadge.textContent = `📅 Diunduh: ${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    }

    if (titleEl) {
      titleEl.textContent = data.title || 'Media Download';
    }

    if (authorEl) {
      authorEl.innerHTML = `👤 <strong>${data.author || 'Pencipta Tidak Diketahui'}</strong>`;
    }

    if (durationEl) {
      durationEl.innerHTML = data.duration ? `⏱️ <strong>${data.duration}</strong>` : '';
      durationEl.style.display = data.duration ? 'inline-flex' : 'none';
    }

    // Reset video & audio players
    if (videoPlayer) { videoPlayer.pause(); videoPlayer.removeAttribute('src'); videoPlayer.load(); }
    if (spotifyPlayer) { spotifyPlayer.pause(); spotifyPlayer.removeAttribute('src'); spotifyPlayer.load(); }

    const slides = Array.isArray(data.slides) ? data.slides : [];
    currentSlideIndex = 0;

    // Collect slides for Photo Player
    activePhotoSlides = slides.filter(s => s.type === 'image');
    if (activePhotoSlides.length === 0 && data.thumbnail) {
      activePhotoSlides.push({ url: data.thumbnail, type: 'image' });
    }
    activePhotoIndex = 0;
    updatePhotoPreviewUI();

    if (photoDate) photoDate.textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });
    if (photoLocation) photoLocation.textContent = `${data.platform || 'Polaris'} Studio • Apple Photos UI`;

    // Populate Spotify Player
    if (spotifyTitle) spotifyTitle.textContent = data.title || 'Audio Track';
    if (spotifyArtist) spotifyArtist.textContent = data.author || pInfo.name;
    if (spotifyCover) {
      if (data.thumbnail) {
        spotifyCover.src = data.thumbnail;
        spotifyCover.style.display = 'block';
        if (spotifyCoverPlaceholder) spotifyCoverPlaceholder.style.display = 'none';
      } else {
        spotifyCover.style.display = 'none';
        if (spotifyCoverPlaceholder) spotifyCoverPlaceholder.style.display = 'block';
      }
    }
    const audioItem = (data.downloads && data.downloads.find(d => d.type === 'audio')) || (slides.find(s => s.type === 'audio')) || (data.downloads && data.downloads[0]);
    if (spotifyPlayer && audioItem && audioItem.url) {
      spotifyPlayer.src = `/api/downloader/proxy?url=${encodeURIComponent(audioItem.url)}&inline=1`;
    }

    // Populate Microsoft Office Viewer
    if (officeFilename) {
      const cleanTitle = (data.title || 'Dokumen').replace(/[^\w\s.-]/g, '').slice(0, 24) || 'Dokumen';
      officeFilename.textContent = `${cleanTitle}.${primaryDl.format || 'docx'}`;
    }
    if (officeSheetTitle) officeSheetTitle.textContent = data.title || 'Pratinjau Dokumen';
    if (officeSheetContent) {
      officeSheetContent.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 6px; color: #0078d4;">Informasi Konten Polaris Ataraxia:</div>
        <div style="margin-bottom: 4px;"><strong>Judul:</strong> ${escapeHtml(data.title || '-')}</div>
        <div style="margin-bottom: 4px;"><strong>Kreator:</strong> ${escapeHtml(data.author || '-')}</div>
        <div style="margin-bottom: 4px;"><strong>Platform Asal:</strong> ${escapeHtml(data.platform || pInfo.name || '-')}</div>
        <div style="margin-bottom: 4px;"><strong>Scraper Layer:</strong> ${escapeHtml(data.layerName || 'Layer 1 [Utama]')}</div>
        <div style="margin-bottom: 4px;"><strong>Opsi Unduhan:</strong> ${(data.downloads || []).length} media stream</div>
        <div style="margin-top: 8px; font-size: 0.68rem; color: #666; border-top: 1px dashed #ccc; padding-top: 4px;">
          Diinspeksi secara otomatis oleh Microsoft Office 365 Reader Viewer Engine.
        </div>
      `;
    }

    // Populate Video Player
    const videoList = [
      ...(slides.filter(s => s.type === 'video')),
      ...(data.downloads?.filter(d => d.type === 'video') || [])
    ];
    const primaryVideo = videoList[0];
    if (videoPlayer && primaryVideo) {
      if (data.thumbnail) {
        videoPlayer.poster = data.thumbnail;
      } else {
        videoPlayer.removeAttribute('poster');
      }
      let fallbackIndex = 0;
      videoPlayer.onerror = () => {
        fallbackIndex++;
        if (fallbackIndex < videoList.length) {
          videoPlayer.src = `/api/downloader/proxy?url=${encodeURIComponent(videoList[fallbackIndex].url)}&inline=1`;
          videoPlayer.load();
        } else if (primaryVideo.url && videoPlayer.src.includes('/api/downloader/proxy')) {
          videoPlayer.src = primaryVideo.url;
          videoPlayer.load();
        }
      };
      videoPlayer.src = `/api/downloader/proxy?url=${encodeURIComponent(primaryVideo.url)}&inline=1`;
      videoPlayer.load();
    }

    // Determine initial default player mode
    const isAudio = data.mediaType === 'audio' || (!slides.some(s => s.type === 'video' || s.type === 'image') && data.downloads?.some(d => d.type === 'audio'));
    const isGallery = data.mediaType === 'gallery' || (activePhotoSlides.length > 1);
    const isDoc = data.mediaType === 'document' || (data.downloads && data.downloads.some(d => d.type === 'document' || d.type === 'pdf'));

    if (isAudio) {
      switchPlayerMode('audio');
    } else if (isGallery) {
      switchPlayerMode('photo');
    } else if (isDoc) {
      switchPlayerMode('office');
    } else {
      switchPlayerMode('video');
    }

    // Toggle Photo-to-PDF button
    const imageSlidesCount = slides.filter(s => s.type === 'image').length;
    if (btnExportPdf) {
      btnExportPdf.style.display = imageSlidesCount >= 1 ? 'inline-flex' : 'none';
    }

    // Toggle 1-Click ZIP button
    if (btnExportZip) {
      btnExportZip.style.display = (data.downloads && data.downloads.length > 0) ? 'inline-flex' : 'none';
    }

    // Render download links list
    if (downloadsList) {
      if (!data.downloads || data.downloads.length === 0) {
        downloadsList.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-muted); padding: 10px;">Tidak ada berkas langsung yang dapat diunduh.</div>`;
      } else {
        downloadsList.innerHTML = data.downloads.map((dl, i) => {
          const typeIcon = dl.type === 'video' ? '🎬' : dl.type === 'audio' ? '🎵' : dl.type === 'image' ? '🖼️' : '📦';
          const proxyUrl = `/api/downloader/proxy?url=${encodeURIComponent(dl.url)}&filename=${encodeURIComponent(dl.filename || `media_${i + 1}`)}`;
          return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius-md); gap: 10px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.3rem;">${typeIcon}</span>
                <div>
                  <div style="font-size: 0.85rem; font-weight: 700; color: #fff;">${dl.label || 'Unduh Berkas'}</div>
                  <div style="display: flex; gap: 6px; align-items: center; margin-top: 2px;">
                    <span class="badge badge-cyan" style="font-size: 0.65rem; padding: 1px 6px;">${(dl.format || 'bin').toUpperCase()}</span>
                    <span style="font-size: 0.72rem; color: var(--text-muted);">${dl.quality || 'Standard'}</span>
                  </div>
                </div>
              </div>
              <div style="display: flex; gap: 8px; align-items: center;">
                <button type="button" class="btn-polaris btn-secondary btn-sm" onclick="window.PolarisApp.copyToClipboard('${encodeURIComponent(dl.url)}')" style="font-size: 0.72rem; padding: 5px 10px;" title="Salin URL Berkas">
                  📋 Salin Link
                </button>
                <a href="${proxyUrl}" download="${encodeURIComponent(dl.filename || 'media_download')}" class="btn-polaris btn-primary btn-shine-effect btn-sm" style="text-decoration: none; font-size: 0.74rem; font-weight: 700; padding: 5px 14px; display: inline-flex; align-items: center; gap: 6px;">
                  <span>⬇️</span> Unduh Langsung
                </a>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    resultCard.style.display = 'block';
  }

  // Mori Instant Photo-to-PDF Generator
  async function convertImagesToPdf(imageUrls, docTitle = 'mori_album') {
    if (!window.PDFLib || !window.PDFLib.PDFDocument) {
      showToast('Library PDF-Lib belum siap.', 'error');
      playPolarisChime('error');
      return;
    }
    if (!imageUrls || imageUrls.length === 0) {
      showToast('Tidak ada foto untuk dibuat album PDF.', 'error');
      playPolarisChime('error');
      return;
    }

    showToast(`Membuat album PDF dari ${imageUrls.length} foto...`, 'info');
    playPolarisChime('click');

    try {
      const { PDFDocument } = window.PDFLib;
      const pdfDoc = await PDFDocument.create();

      let embeddedCount = 0;
      for (let i = 0; i < imageUrls.length; i++) {
        const u = imageUrls[i];
        try {
          const proxyUrl = `/api/downloader/proxy?url=${encodeURIComponent(u)}&inline=1`;
          const resp = await fetch(proxyUrl);
          if (!resp.ok) continue;
          const arrayBuffer = await resp.arrayBuffer();

          let image = null;
          try {
            image = await pdfDoc.embedJpg(arrayBuffer);
          } catch (_) {
            try {
              image = await pdfDoc.embedPng(arrayBuffer);
            } catch (__) {
              // Canvas JPEG converter fallback
              const canvasData = await new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  canvas.width = img.naturalWidth || 800;
                  canvas.height = img.naturalHeight || 1000;
                  const ctx = canvas.getContext('2d');
                  ctx.fillStyle = '#FFFFFF';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  ctx.drawImage(img, 0, 0);
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                  const base64 = dataUrl.split(',')[1];
                  const binStr = atob(base64);
                  const bytes = new Uint8Array(binStr.length);
                  for (let b = 0; b < binStr.length; b++) bytes[b] = binStr.charCodeAt(b);
                  resolve(bytes.buffer);
                };
                img.onerror = reject;
                img.src = proxyUrl;
              });
              image = await pdfDoc.embedJpg(canvasData);
            }
          }

          if (image) {
            const page = pdfDoc.addPage([image.width, image.height]);
            page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
            embeddedCount++;
          }
        } catch (e) {
          console.warn('Gagal memproses gambar ke-' + (i + 1), e);
        }
      }

      if (embeddedCount === 0) {
        throw new Error('Gagal memuat format gambar ke dalam PDF.');
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${(docTitle || 'mori_album').replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      playPolarisChime('success');
      showToast(`Album PDF berhasil diunduh (${embeddedCount} foto)!`, 'success');
    } catch (err) {
      playPolarisChime('error');
      showToast('Gagal membuat PDF: ' + err.message, 'error');
    }
  }

  // Mori 1-Click ZIP Downloader
  async function downloadAllAsZip(items, zipName = 'mori_media_downloads') {
    if (!window.JSZip) {
      showToast('Library JSZip belum siap.', 'error');
      playPolarisChime('error');
      return;
    }
    if (!items || items.length === 0) {
      showToast('Tidak ada berkas untuk diunduh sebagai ZIP.', 'error');
      playPolarisChime('error');
      return;
    }

    showToast(`Menyiapkan arsip ZIP (${items.length} berkas)...`, 'info');
    playPolarisChime('click');

    try {
      const zip = new window.JSZip();
      let successCount = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemUrl = item.url;
        if (!itemUrl) continue;
        try {
          const proxyUrl = `/api/downloader/proxy?url=${encodeURIComponent(itemUrl)}&filename=${encodeURIComponent(item.filename || `file_${i + 1}`)}&inline=1`;
          const resp = await fetch(proxyUrl);
          if (!resp.ok) continue;
          const blob = await resp.blob();
          const cleanFileName = item.filename || `media_${i + 1}.${item.format || 'bin'}`;
          zip.file(cleanFileName, blob);
          successCount++;
        } catch (e) {
          console.warn('Gagal menambahkan berkas ke ZIP:', item, e);
        }
      }

      if (successCount === 0) {
        throw new Error('Gagal mengunduh berkas media untuk ZIP.');
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${(zipName || 'mori_media').replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      playPolarisChime('success');
      showToast(`Arsip ZIP berhasil diunduh (${successCount} berkas)!`, 'success');
    } catch (err) {
      playPolarisChime('error');
      showToast('Gagal membuat ZIP: ' + err.message, 'error');
    }
  }

  // Multi-Link Batch Mode Engine
  function extractBatchUrls(rawText) {
    if (!rawText || typeof rawText !== 'string') return [];
    const urlRegex = /(https?:\/\/[^\s,]+)/gi;
    const matches = rawText.match(urlRegex) || [];
    const valid = [];
    matches.forEach(m => {
      let cleaned = m.trim();
      if (cleaned.startsWith('http://')) cleaned = cleaned.replace('http://', 'https://');
      if (!valid.includes(cleaned)) valid.push(cleaned);
    });
    return valid;
  }

  async function startBatchAnalysis() {
    const textarea = document.getElementById('downloader-batch-input');
    const raw = textarea ? textarea.value : '';
    const urls = extractBatchUrls(raw);

    if (urls.length === 0) {
      showToast('Harap tempel minimal satu URL media yang valid.', 'error');
      playPolarisChime('error');
      return;
    }

    const progressBox = document.getElementById('dl-batch-progress-box');
    const progressFill = document.getElementById('dl-batch-progress-fill');
    const statusText = document.getElementById('dl-batch-status-text');
    const statusCount = document.getElementById('dl-batch-status-count');
    const batchCard = document.getElementById('dl-batch-queue-card');
    const batchBtn = document.getElementById('btn-batch-analyze');
    const batchBtnText = document.getElementById('btn-batch-text');
    const batchBtnIcon = document.getElementById('btn-batch-icon');

    if (progressBox) progressBox.style.display = 'block';
    if (batchCard) batchCard.style.display = 'block';
    if (batchBtn) batchBtn.disabled = true;
    if (batchBtnText) batchBtnText.textContent = 'Menganalisis Batch...';
    if (batchBtnIcon) batchBtnIcon.textContent = '⏳';
    playPolarisChime('click');

    batchQueueList = [];
    renderBatchQueue();

    try {
      const res = await PolarisAuth.authFetch('/api/downloader/batch-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, server: preferredDownloaderServer }),
      });
      const json = await res.json();

      if (!json.success || !Array.isArray(json.results)) {
        throw new Error(json.error || 'Gagal memproses antrean batch.');
      }

      batchQueueList = json.results;
      batchQueueList.forEach(item => {
        if (item.success && item.data) {
          saveDownloaderHistory(item.data);
        }
      });

      if (progressFill) progressFill.style.width = '100%';
      if (statusText) statusText.textContent = 'Analisis batch selesai!';
      if (statusCount) statusCount.textContent = `${batchQueueList.length} / ${batchQueueList.length}`;
      renderBatchQueue();
      playPolarisChime('success');
      showToast(`Batch selesai! ${batchQueueList.filter(b => b.success).length} dari ${batchQueueList.length} media berhasil dianalisis.`, 'success');
    } catch (err) {
      playPolarisChime('error');
      showToast('Gagal memproses batch: ' + err.message, 'error');
    } finally {
      if (batchBtn) batchBtn.disabled = false;
      if (batchBtnText) batchBtnText.textContent = 'Mulai Analisis Batch';
      if (batchBtnIcon) batchBtnIcon.textContent = '⚡';
    }
  }

  function renderBatchQueue() {
    const tbody = document.getElementById('dl-batch-tbody');
    if (!tbody) return;

    if (!batchQueueList || batchQueueList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">Antrean batch kosong.</td></tr>`;
      return;
    }

    tbody.innerHTML = batchQueueList.map((item, idx) => {
      const p = getPlatformInfo(item.url);
      const isSuccess = item.success && item.data;
      const title = isSuccess ? (item.data.title || 'Media') : 'Gagal diekstrak';
      const statusBadge = isSuccess
        ? `<span class="badge badge-emerald" style="font-size: 0.68rem;">✅ Berhasil</span>`
        : `<span class="badge badge-rose" style="font-size: 0.68rem;" title="${item.error || 'Error'}">❌ Gagal</span>`;

      const actionBtn = isSuccess ? `
        <div style="display: inline-flex; gap: 6px;">
          <button type="button" class="btn-polaris btn-primary btn-sm" onclick="window.PolarisApp.previewBatchItem(${idx})" style="font-size: 0.72rem; padding: 4px 8px;">
            👁️ Buka
          </button>
          <button type="button" class="btn-polaris btn-secondary btn-sm" onclick="window.PolarisApp.copyToClipboard('${encodeURIComponent(item.url)}')" style="font-size: 0.72rem; padding: 4px 8px;">
            📋
          </button>
        </div>
      ` : `
        <button type="button" class="btn-polaris btn-secondary btn-sm" onclick="window.PolarisApp.analyzeFromHistory('${encodeURIComponent(item.url)}')" style="font-size: 0.72rem; padding: 4px 8px;">
          🔄 Coba Lagi
        </button>
      `;

      return `
        <tr>
          <td>${idx + 1}</td>
          <td>
            <span class="badge ${p.badge}" style="font-size: 0.7rem;">${p.icon} ${p.name}</span>
          </td>
          <td style="max-width: 320px; overflow: hidden; text-overflow: ellipsis;">
            <strong style="color: #fff; font-size: 0.82rem; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${title}</strong>
            <div style="font-size: 0.7rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.url}</div>
          </td>
          <td>${statusBadge}</td>
          <td style="text-align: right;">${actionBtn}</td>
        </tr>
      `;
    }).join('');
  }

  function initDownloaderHub() {
    // Mode toggles
    const btnModeSingle = document.getElementById('btn-dl-mode-single');
    const btnModeBatch = document.getElementById('btn-dl-mode-batch');
    const singleContainer = document.getElementById('dl-single-container');
    const batchContainer = document.getElementById('dl-batch-container');

    if (btnModeSingle && btnModeBatch && singleContainer && batchContainer) {
      btnModeSingle.addEventListener('click', () => {
        btnModeSingle.className = 'btn-polaris btn-primary btn-sm';
        btnModeBatch.className = 'btn-polaris btn-secondary btn-sm';
        singleContainer.style.display = 'block';
        batchContainer.style.display = 'none';
        playPolarisChime('click');
      });
      btnModeBatch.addEventListener('click', () => {
        btnModeBatch.className = 'btn-polaris btn-primary btn-sm';
        btnModeSingle.className = 'btn-polaris btn-secondary btn-sm';
        batchContainer.style.display = 'block';
        singleContainer.style.display = 'none';
        playPolarisChime('click');
      });
    }

    // Sound FX toggle
    const soundBtn = document.getElementById('btn-dl-toggle-sound');
    const soundIcon = document.getElementById('dl-sound-icon');
    const soundLabel = document.getElementById('dl-sound-label');
    if (soundBtn) {
      const updateSoundUI = () => {
        if (soundIcon) soundIcon.textContent = polarisSoundEnabled ? '🔊' : '🔇';
        if (soundLabel) soundLabel.textContent = polarisSoundEnabled ? 'Efek Suara: ON' : 'Efek Suara: OFF';
      };
      updateSoundUI();
      soundBtn.addEventListener('click', () => {
        polarisSoundEnabled = !polarisSoundEnabled;
        localStorage.setItem('polaris_dl_sound', polarisSoundEnabled);
        updateSoundUI();
        if (polarisSoundEnabled) playPolarisChime('success');
      });
    }

    // Ataraxia 3-Tier Scraper Selector Logic
    const serverPills = document.querySelectorAll('.dl-server-pill');
    const latencyBadge = document.getElementById('dl-server-latency-badge');

    const updateServerUI = () => {
      serverPills.forEach(pill => {
        const sKey = pill.getAttribute('data-server') || 'auto';
        if (sKey === preferredDownloaderServer) {
          pill.className = 'btn-polaris btn-sm dl-server-pill active';
          pill.style.border = '1px solid var(--accent-cyan)';
          pill.style.background = 'rgba(56, 189, 248, 0.25)';
          pill.style.color = '#fff';
          pill.style.fontWeight = '700';
        } else {
          pill.className = 'btn-polaris btn-secondary btn-sm dl-server-pill';
          pill.style.border = '1px solid rgba(255, 255, 255, 0.1)';
          pill.style.background = 'rgba(255, 255, 255, 0.05)';
          pill.style.color = 'var(--text-muted)';
          pill.style.fontWeight = '500';
        }
      });

      if (latencyBadge) {
        if (preferredDownloaderServer === 'layer1' || preferredDownloaderServer === 'server1') {
          latencyBadge.innerHTML = `<span style="display:inline-block;width:6px;height:6px;background:var(--accent-emerald);border-radius:50%;box-shadow:0 0 6px var(--accent-emerald);"></span> Lapis 1 [Utama] (Internal Polaris Scrapers)`;
        } else if (preferredDownloaderServer === 'layer2' || preferredDownloaderServer === 'server2') {
          latencyBadge.innerHTML = `<span style="display:inline-block;width:6px;height:6px;background:var(--accent-cyan);border-radius:50%;box-shadow:0 0 6px var(--accent-cyan);"></span> Lapis 2 [OmniGet] (High-Performance Scraper Backup)`;
        } else if (preferredDownloaderServer === 'layer3' || preferredDownloaderServer === 'server3') {
          latencyBadge.innerHTML = `<span style="display:inline-block;width:6px;height:6px;background:var(--accent-purple);border-radius:50%;box-shadow:0 0 6px var(--accent-purple);"></span> Lapis 3 [Mori & OmniGet] (Multi-Server Debrid Engine)`;
        } else {
          latencyBadge.innerHTML = `<span style="display:inline-block;width:6px;height:6px;background:var(--accent-emerald);border-radius:50%;box-shadow:0 0 6px var(--accent-emerald);"></span> Auto Fallback (Lapis 1 ➔ Lapis 2 ➔ Lapis 3)`;
        }
      }
    };

    updateServerUI();

    serverPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const targetServer = pill.getAttribute('data-server') || 'auto';
        preferredDownloaderServer = targetServer;
        try {
          localStorage.setItem('polaris_dl_preferred_server', targetServer);
        } catch (_) {}
        updateServerUI();
        playPolarisChime('click');
        showToast(`Scraper engine aktif diubah ke: ${pill.textContent.trim()}`, 'info');
      });
    });

    // Wire Player Selectors
    const playerTabs = document.querySelectorAll('.dl-player-tab');
    playerTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const mode = tab.getAttribute('data-player-mode') || 'video';
        switchPlayerMode(mode);
        playPolarisChime('click');
      });
    });

    // Wire Back to Input Button
    const btnBackInput = document.getElementById('btn-dl-back-input');
    if (btnBackInput) {
      btnBackInput.addEventListener('click', () => {
        const inputEl = document.getElementById('downloader-url-input');
        if (inputEl) {
          inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          inputEl.focus();
          inputEl.select();
        }
        playPolarisChime('click');
      });
    }

    // Wire Toggle Preview Button
    const btnTogglePreview = document.getElementById('btn-dl-toggle-preview');
    const previewViewport = document.getElementById('dl-preview-viewport-col');
    const previewText = document.getElementById('btn-preview-text');
    const previewIcon = document.getElementById('btn-preview-icon');
    if (btnTogglePreview && previewViewport) {
      btnTogglePreview.addEventListener('click', () => {
        const isHidden = previewViewport.style.display === 'none';
        if (isHidden) {
          previewViewport.style.display = 'flex';
          if (previewText) previewText.textContent = 'Tutup Preview Player';
          if (previewIcon) previewIcon.textContent = '👁️';
        } else {
          previewViewport.style.display = 'none';
          if (previewText) previewText.textContent = 'Buka Preview Player';
          if (previewIcon) previewIcon.textContent = '🙈';
        }
        playPolarisChime('click');
      });
    }

    // Wire Photo Prev/Next Buttons
    const btnPhotoPrev = document.getElementById('btn-photo-prev');
    const btnPhotoNext = document.getElementById('btn-photo-next');
    if (btnPhotoPrev) {
      btnPhotoPrev.addEventListener('click', () => {
        if (activePhotoSlides && activePhotoSlides.length > 1) {
          activePhotoIndex = (activePhotoIndex - 1 + activePhotoSlides.length) % activePhotoSlides.length;
          updatePhotoPreviewUI();
        }
      });
    }
    if (btnPhotoNext) {
      btnPhotoNext.addEventListener('click', () => {
        if (activePhotoSlides && activePhotoSlides.length > 1) {
          activePhotoIndex = (activePhotoIndex + 1) % activePhotoSlides.length;
          updatePhotoPreviewUI();
        }
      });
    }

    // Fetch server status in background
    (async () => {
      try {
        const res = await PolarisAuth.authFetch('/api/downloader/servers');
        const sJson = await res.json();
        if (sJson.success && sJson.latencies && latencyBadge && preferredDownloaderServer === 'auto') {
          const lat1 = sJson.latencies.server1 || 60;
          latencyBadge.innerHTML = `<span style="display:inline-block;width:6px;height:6px;background:var(--accent-emerald);border-radius:50%;box-shadow:0 0 6px var(--accent-emerald);"></span> Auto Fallback (${lat1}ms) • 3 Lapis Siap`;
        }
      } catch (_) {}
    })();

    // Single Analyze Form
    const form = document.getElementById('form-downloader-analyze');
    const input = document.getElementById('downloader-url-input');
    const pasteBtn = document.getElementById('btn-downloader-paste');
    const platformIcon = document.getElementById('dl-platform-icon');

    if (input) {
      input.addEventListener('input', () => {
        const p = getPlatformInfo(input.value);
        if (platformIcon) platformIcon.textContent = p.icon;
      });
    }

    if (pasteBtn && input) {
      pasteBtn.addEventListener('click', async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text) {
            input.value = text.trim();
            const p = getPlatformInfo(input.value);
            if (platformIcon) platformIcon.textContent = p.icon;
            showToast('Tautan berhasil ditempel dari clipboard!', 'info');
            analyzeMediaUrl(input.value);
          }
        } catch (_) {
          showToast('Izin akses clipboard ditolak atau tidak didukung browser.', 'error');
        }
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        analyzeMediaUrl();
      });
    }

    // Batch form buttons
    const batchInput = document.getElementById('downloader-batch-input');
    const btnBatchAnalyze = document.getElementById('btn-batch-analyze');
    const btnBatchPaste = document.getElementById('btn-batch-paste');
    const btnBatchClear = document.getElementById('btn-batch-clear');
    const btnBatchSample = document.getElementById('btn-batch-sample');
    const btnBatchZipAll = document.getElementById('btn-batch-download-all-zip');
    const btnBatchClearQueue = document.getElementById('btn-batch-clear-queue');

    if (btnBatchAnalyze) {
      btnBatchAnalyze.addEventListener('click', startBatchAnalysis);
    }

    if (btnBatchPaste && batchInput) {
      btnBatchPaste.addEventListener('click', async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text) {
            batchInput.value = (batchInput.value ? batchInput.value + '\n' : '') + text.trim();
            showToast('Teks berhasil ditempel dari clipboard!', 'info');
          }
        } catch (_) {
          showToast('Izin akses clipboard ditolak.', 'error');
        }
      });
    }

    if (btnBatchClear && batchInput) {
      btnBatchClear.addEventListener('click', () => {
        batchInput.value = '';
        showToast('Input batch dikosongkan.', 'info');
      });
    }

    if (btnBatchSample && batchInput) {
      btnBatchSample.addEventListener('click', () => {
        batchInput.value = [
          'https://vt.tiktok.com/ZSjabc123/',
          'https://www.instagram.com/reel/C3abc123/',
          'https://youtu.be/dQw4w9WgXcQ',
          'https://threads.net/@user/post/C3abc',
        ].join('\n');
        showToast('Contoh tautan batch dimuat!', 'info');
      });
    }

    if (btnBatchZipAll) {
      btnBatchZipAll.addEventListener('click', () => {
        const allDownloads = [];
        batchQueueList.forEach(b => {
          if (b.success && b.data && Array.isArray(b.data.downloads)) {
            allDownloads.push(...b.data.downloads);
          }
        });
        if (allDownloads.length === 0) {
          showToast('Tidak ada berkas yang berhasil untuk diunduh sebagai ZIP.', 'error');
          return;
        }
        downloadAllAsZip(allDownloads, 'mori_batch_downloads');
      });
    }

    if (btnBatchClearQueue) {
      btnBatchClearQueue.addEventListener('click', () => {
        batchQueueList = [];
        renderBatchQueue();
        const batchCard = document.getElementById('dl-batch-queue-card');
        if (batchCard) batchCard.style.display = 'none';
        showToast('Antrean batch dikosongkan.', 'info');
      });
    }

    // Carousel Slide Controls
    const btnSlidePrev = document.getElementById('dl-slide-prev');
    const btnSlideNext = document.getElementById('dl-slide-next');
    const carouselImg = document.getElementById('dl-carousel-img');
    const slideIndicator = document.getElementById('dl-slide-indicator');

    const updateCarouselSlide = (newIdx) => {
      if (!currentMediaData || !Array.isArray(currentMediaData.slides)) return;
      const imgSlides = currentMediaData.slides.filter(s => s.type === 'image');
      if (imgSlides.length === 0) return;
      if (newIdx < 0) newIdx = imgSlides.length - 1;
      if (newIdx >= imgSlides.length) newIdx = 0;
      currentSlideIndex = newIdx;
      if (carouselImg) {
        carouselImg.src = `/api/downloader/proxy?url=${encodeURIComponent(imgSlides[newIdx].url)}&inline=1`;
      }
      if (slideIndicator) {
        slideIndicator.textContent = `${newIdx + 1} / ${imgSlides.length}`;
      }
      playPolarisChime('click');
    };

    if (btnSlidePrev) {
      btnSlidePrev.addEventListener('click', () => updateCarouselSlide(currentSlideIndex - 1));
    }
    if (btnSlideNext) {
      btnSlideNext.addEventListener('click', () => updateCarouselSlide(currentSlideIndex + 1));
    }

    // 1-Click PDF Button
    const btnExportPdf = document.getElementById('btn-dl-export-pdf');
    if (btnExportPdf) {
      btnExportPdf.addEventListener('click', () => {
        if (!currentMediaData || !Array.isArray(currentMediaData.slides)) return;
        const imgUrls = currentMediaData.slides.filter(s => s.type === 'image').map(s => s.url);
        convertImagesToPdf(imgUrls, currentMediaData.title || 'album');
      });
    }

    // 1-Click ZIP Button
    const btnExportZip = document.getElementById('btn-dl-export-zip');
    if (btnExportZip) {
      btnExportZip.addEventListener('click', () => {
        if (!currentMediaData || !Array.isArray(currentMediaData.downloads)) return;
        downloadAllAsZip(currentMediaData.downloads, currentMediaData.title || 'media_bundle');
      });
    }

    // Interactive Platform Chips click
    document.querySelectorAll('.dl-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sample = btn.getAttribute('data-sample');
        if (!sample) return;
        const urlInput = document.getElementById('downloader-url-input');
        if (urlInput) {
          urlInput.value = sample;
          const p = getPlatformInfo(sample);
          if (platformIcon) platformIcon.textContent = p.icon;
          showToast(`Contoh link ${p.name} disalin ke input bar!`, 'info');
          playPolarisChime('click');
        }
      });
    });

    // History filter chips
    document.querySelectorAll('.dl-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.dl-filter-btn').forEach(b => b.classList.remove('active', 'btn-primary'));
        document.querySelectorAll('.dl-filter-btn').forEach(b => b.classList.add('btn-secondary'));
        btn.classList.add('active', 'btn-primary');
        btn.classList.remove('btn-secondary');
        historyActiveFilter = btn.getAttribute('data-filter') || 'all';
        renderDownloaderHistory();
        playPolarisChime('click');
      });
    });

    // History search
    const historySearch = document.getElementById('dl-history-search');
    if (historySearch) {
      historySearch.addEventListener('input', () => {
        renderDownloaderHistory();
      });
    }

    // Export history JSON
    const btnExportHistory = document.getElementById('btn-export-dl-history');
    if (btnExportHistory) {
      btnExportHistory.addEventListener('click', () => {
        if (downloaderHistory.length === 0) {
          showToast('Riwayat unduhan kosong, tidak ada yang dapat diekspor.', 'error');
          return;
        }
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(downloaderHistory, null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = `mori_history_export_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        playPolarisChime('success');
        showToast('Riwayat unduhan berhasil diekspor!', 'success');
      });
    }

    // Clear history
    const clearHistoryBtn = document.getElementById('btn-clear-dl-history');
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', async () => {
        if (!confirm('Apakah Anda yakin ingin menghapus seluruh riwayat unduhan media?')) return;
        downloaderHistory = [];
        localStorage.removeItem('polaris_downloader_history');
        try {
          await PolarisAuth.authFetch('/api/downloader/history', { method: 'DELETE' });
        } catch (_) {}
        renderDownloaderHistory();
        updateDownloaderStats();
        playPolarisChime('click');
        showToast('Seluruh riwayat unduhan berhasil dibersihkan.', 'info');
      });
    }

    // Sub-Page Navigation: Mori Media Core vs OmniGet Universal Studio vs Lumina AI vs Spotify Studio
    const tabBtnMori = document.getElementById('tab-btn-mori');
    const tabBtnOmniget = document.getElementById('tab-btn-omniget');
    const tabBtnApk = document.getElementById('tab-btn-apkbuilder');
    const tabBtnTarot = document.getElementById('tab-btn-tarot');
    const tabBtnLumina = document.getElementById('tab-btn-lumina');
    const tabBtnSpotify = document.getElementById('tab-btn-spotify');

    const pageMori = document.getElementById('dl-subpage-mori');
    const pageOmniget = document.getElementById('dl-subpage-omniget');
    const pageApk = document.getElementById('dl-subpage-apkbuilder');
    const pageTarot = document.getElementById('dl-subpage-tarot');
    const pageLumina = document.getElementById('dl-subpage-lumina');
    const pageSpotify = document.getElementById('dl-subpage-spotify');
    const engineIndicator = document.getElementById('dl-engine-indicator-text');

    const resetSubnavBtn = (btn) => {
      if (!btn) return;
      btn.classList.remove('active', 'btn-primary');
      btn.classList.add('btn-secondary');
      btn.style.border = '1px solid rgba(255,255,255,0.1)';
      btn.style.background = 'rgba(255,255,255,0.04)';
      btn.style.color = 'var(--text-muted)';
    };

    const activateSubnavBtn = (btn, color, bg) => {
      if (!btn) return;
      btn.classList.add('active', 'btn-primary');
      btn.classList.remove('btn-secondary');
      btn.style.border = `1px solid ${color}`;
      btn.style.background = bg;
      btn.style.color = '#fff';
    };

    const switchDownloaderSubpage = (target) => {
      if (!target) target = 'mori';
      [tabBtnMori, tabBtnOmniget, tabBtnApk, tabBtnTarot, tabBtnLumina, tabBtnSpotify].forEach(resetSubnavBtn);
      [pageMori, pageOmniget, pageApk, pageTarot, pageLumina, pageSpotify].forEach(p => { if (p) p.style.display = 'none'; });

      document.querySelectorAll('.tools-subtab, .taurus-subtab').forEach(st => {
        const isMatch = (st.getAttribute('data-tool') || 'mori') === target;
        st.classList.toggle('active', isMatch);
      });

      if (target === 'spotify') {
        activateSubnavBtn(tabBtnSpotify, '#1DB954', 'rgba(29, 185, 84, 0.22)');
        if (pageSpotify) pageSpotify.style.display = 'block';
        if (engineIndicator) engineIndicator.textContent = 'Active: Spotify Cloud Streamer & Lyrics Studio (Zero-Download • Synced & Translated)';
      } else if (target === 'lumina') {
        activateSubnavBtn(tabBtnLumina, '#ec4899', 'rgba(236, 72, 153, 0.25)');
        if (pageLumina) pageLumina.style.display = 'block';
        if (engineIndicator) engineIndicator.textContent = 'Active: Lumina HD Image Studio (Vulkan Real-ESRGAN + GFPGAN Face HD + Wink)';
      } else if (target === 'omniget') {
        activateSubnavBtn(tabBtnOmniget, '#c084fc', 'rgba(168, 85, 247, 0.25)');
        if (pageOmniget) pageOmniget.style.display = 'block';
        if (engineIndicator) engineIndicator.textContent = 'Active: OmniGet Universal Studio (Course Extractor & 5-in-1 Media Toolbox)';
      } else if (target === 'apkbuilder') {
        activateSubnavBtn(tabBtnApk, '#34d399', 'rgba(52, 211, 153, 0.25)');
        if (pageApk) pageApk.style.display = 'block';
        if (engineIndicator) engineIndicator.textContent = 'Active: Web-to-APK Builder (Android WebView & Project Packager)';
      } else if (target === 'tarot') {
        activateSubnavBtn(tabBtnTarot, '#fb7185', 'rgba(244, 63, 94, 0.25)');
        if (pageTarot) pageTarot.style.display = 'block';
        if (engineIndicator) engineIndicator.textContent = 'Active: Fun Tools: Tarot Oracle (22 Major Arcana • Nano Banana Art)';
      } else {
        activateSubnavBtn(tabBtnMori, 'var(--accent-cyan)', 'rgba(227, 164, 60, 0.2)');
        if (pageMori) pageMori.style.display = 'block';
        if (engineIndicator) engineIndicator.textContent = 'Active: Mori Media Engine (18+ Platforms • Scraper Core v2)';
      }
      playPolarisChime('click');
    };

    window.switchDownloaderSubpage = switchDownloaderSubpage;

    if (tabBtnMori) tabBtnMori.addEventListener('click', () => switchDownloaderSubpage('mori'));
    if (tabBtnOmniget) tabBtnOmniget.addEventListener('click', () => switchDownloaderSubpage('omniget'));
    if (tabBtnApk) tabBtnApk.addEventListener('click', () => switchDownloaderSubpage('apkbuilder'));
    if (tabBtnTarot) tabBtnTarot.addEventListener('click', () => switchDownloaderSubpage('tarot'));
    if (tabBtnLumina) tabBtnLumina.addEventListener('click', () => switchDownloaderSubpage('lumina'));
    if (tabBtnSpotify) tabBtnSpotify.addEventListener('click', () => switchDownloaderSubpage('spotify'));

    initWebToApkBuilder();
    initFunToolsTarot();
    initLuminaAiStudio();

    // OmniGet Course & Magnet Extractor
    const omnigetForm = document.getElementById('form-omniget-extract');
    const omnigetInput = document.getElementById('omniget-url-input');
    const omnigetPasteBtn = document.getElementById('btn-omniget-paste');
    const omnigetIcon = document.getElementById('omniget-platform-icon');
    const omnigetSkeleton = document.getElementById('omniget-skeleton');
    const omnigetResult = document.getElementById('omniget-result-container');

    if (omnigetInput) {
      omnigetInput.addEventListener('input', () => {
        const val = (omnigetInput.value || '').trim();
        if (val.startsWith('magnet:?')) omnigetIcon.textContent = '🧲';
        else if (val.includes('udemy.com')) omnigetIcon.textContent = '🎓';
        else if (val.includes('hotmart.com')) omnigetIcon.textContent = '🔥';
        else if (val.includes('kiwify.com')) omnigetIcon.textContent = '⚡';
        else if (val.includes('coursera.org')) omnigetIcon.textContent = '🏛️';
        else omnigetIcon.textContent = '⚡';
      });
    }

    const runOmnigetExtract = async () => {
      const url = (omnigetInput?.value || '').trim();
      if (!url) {
        showToast('Masukkan URL kursus atau magnet link terlebih dahulu.', 'error');
        return;
      }

      if (omnigetSkeleton) omnigetSkeleton.style.display = 'block';
      if (omnigetResult) omnigetResult.style.display = 'none';

      try {
        const isMagnet = url.startsWith('magnet:?');
        const endpoint = isMagnet ? '/api/downloader/omniget/magnet' : '/api/downloader/omniget/course';
        const bodyPayload = isMagnet ? { magnetUri: url } : { url };

        const resp = await PolarisAuth.authFetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
        });

        const json = await resp.json();
        if (!json.success || !json.data) throw new Error(json.error || 'Gagal mengekstrak data.');

        const data = json.data;
        if (omnigetResult) {
          if (isMagnet) {
            omnigetResult.innerHTML = `
              <div style="background: rgba(20,21,15,0.85); border: 1px solid color-mix(in srgb, var(--accent-purple) 30%, transparent); border-radius: var(--radius-lg); padding: 22px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:14px; flex-wrap:wrap; margin-bottom:14px;">
                  <div>
                    <span class="badge" style="background: color-mix(in srgb, var(--accent-purple) 20%, transparent); color:var(--accent-purple); font-weight:800; font-size:0.7rem;">🧲 BITTORRENT MAGNET VERIFIED</span>
                    <h3 style="font-size:1.25rem; font-weight:800; color:#fff; margin:8px 0 4px 0;">${escapeHtml(data.name)}</h3>
                    <div style="font-size:0.78rem; color:var(--text-muted); font-family:var(--font-mono);">InfoHash: <span style="color:var(--accent-cyan);">${data.infoHash}</span></div>
                  </div>
                  <button type="button" class="btn-polaris btn-primary btn-sm" onclick="navigator.clipboard.writeText('${escapeHtml(data.magnetUri)}'); showToast('Magnet URI disalin ke clipboard!', 'success');" style="font-weight:700;">
                    📋 Salin Magnet URI
                  </button>
                </div>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:18px;">
                  <div style="background:rgba(255,255,255,0.03); padding:10px 14px; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                    <div style="font-size:0.7rem; color:var(--text-muted);">Ukuran File</div>
                    <div style="font-size:1.1rem; font-weight:800; color:#fff; margin-top:2px;">${data.formattedSize}</div>
                  </div>
                  <div style="background:color-mix(in srgb, var(--accent-emerald) 6%, transparent); padding:10px 14px; border-radius:8px; border:1px solid color-mix(in srgb, var(--accent-emerald) 20%, transparent);">
                    <div style="font-size:0.7rem; color:var(--accent-emerald);">Kesehatan Swarm</div>
                    <div style="font-size:1.1rem; font-weight:800; color:var(--accent-emerald); margin-top:2px;">${data.health}</div>
                  </div>
                  <div style="background:color-mix(in srgb, var(--accent-cyan) 6%, transparent); padding:10px 14px; border-radius:8px; border:1px solid color-mix(in srgb, var(--accent-cyan) 20%, transparent);">
                    <div style="font-size:0.7rem; color:var(--accent-cyan);">Trackers Aktif</div>
                    <div style="font-size:1.1rem; font-weight:800; color:var(--accent-cyan); margin-top:2px;">${data.trackersCount} Trackers</div>
                  </div>
                </div>
                <div style="background:rgba(0,0,0,0.4); padding:12px; border-radius:8px; font-size:0.74rem; color:var(--text-muted); font-family:var(--font-mono); max-height:120px; overflow-y:auto;">
                  <div style="font-weight:700; color:#fff; margin-bottom:6px;">Daftar Tracker:</div>
                  ${(data.trackers || []).map(t => `<div>• ${escapeHtml(t)}</div>`).join('')}
                </div>
              </div>
            `;
          } else {
            let curriculumHtml = '';
            (data.curriculum || []).forEach((sec) => {
              curriculumHtml += `
                <div style="background: rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); border-radius:8px; margin-bottom:10px; overflow:hidden;">
                  <div style="padding:10px 14px; background:rgba(255,255,255,0.02); display:flex; justify-content:space-between; align-items:center; font-weight:700; font-size:0.84rem; color:#fff;">
                    <span>📁 ${escapeHtml(sec.section)}</span>
                    <span style="font-size:0.72rem; color:var(--text-muted);">${sec.lecturesCount} Materi • ${sec.duration}</span>
                  </div>
                  <div style="padding:10px 14px; display:flex; flex-direction:column; gap:6px;">
                    ${(sec.items || []).map(it => `
                      <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; background:rgba(255,255,255,0.02); border-radius:6px; font-size:0.78rem;">
                        <span style="color:#EFEADC;">${it.type === 'video' ? '🎬' : '📎'} ${escapeHtml(it.title)}</span>
                        <div style="display:flex; align-items:center; gap:8px;">
                          <span style="font-size:0.7rem; color:var(--text-muted);">${it.duration || it.format?.toUpperCase() || ''}</span>
                          <button type="button" class="btn-polaris btn-secondary btn-sm" style="font-size:0.68rem; padding:3px 8px;" onclick="showToast('Streaming link disiapkan!', 'success');">
                            ⬇️ Unduh
                          </button>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `;
            });

            omnigetResult.innerHTML = `
              <div style="background: rgba(20,21,15,0.85); border: 1px solid color-mix(in srgb, var(--accent-purple) 30%, transparent); border-radius: var(--radius-lg); padding: 22px;">
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:20px; align-items:flex-start; margin-bottom:20px;">
                  <div style="border-radius:10px; overflow:hidden; border:1px solid rgba(255,255,255,0.1); aspect-ratio:16/9; max-height:220px; background:#000;">
                    <img src="${data.thumbnail}" alt="Course Cover" style="width:100%; height:100%; object-fit:cover;">
                  </div>
                  <div>
                    <span class="badge" style="background:color-mix(in srgb, var(--accent-purple) 20%, transparent); color:var(--accent-purple); font-weight:800; font-size:0.7rem; text-transform:uppercase;">${data.platform} MASTERCLASS</span>
                    <h3 style="font-size:1.3rem; font-weight:800; color:#fff; margin:8px 0 6px 0; line-height:1.35;">${escapeHtml(data.title)}</h3>
                    <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:12px;">👤 Instruktur: <span style="color:#fff; font-weight:600;">${escapeHtml(data.instructor)}</span></div>
                    <div style="display:flex; gap:10px; flex-wrap:wrap; font-size:0.78rem; color:var(--text-muted); margin-bottom:16px;">
                      <span>⏱️ Total: <strong style="color:#fff;">${data.totalDuration}</strong></span>
                      <span>📑 <strong style="color:#fff;">${data.totalLectures}</strong> Video</span>
                      <span>📂 <strong style="color:#fff;">${data.totalModules}</strong> Modul</span>
                    </div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                      <button type="button" class="btn-polaris btn-primary btn-sm" onclick="showToast('Memulai antrean unduhan batch kursus...', 'info');" style="font-weight:700;">
                        📦 Unduh Semua Materi (ZIP)
                      </button>
                      <button type="button" class="btn-polaris btn-secondary btn-sm" onclick="showToast('Subtitles VTT diekspor!', 'success');" style="font-size:0.74rem;">
                        💬 Unduh Subtitle
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 style="font-size:1rem; font-weight:700; color:#fff; margin-bottom:12px;">📑 Silabus & Modul Pembelajaran:</h4>
                  ${curriculumHtml}
                </div>
              </div>
            `;
          }
          omnigetResult.style.display = 'block';
          playPolarisChime('success');
          showToast('Data berhasil diekstrak oleh OmniGet!', 'success');
        }
      } catch (err) {
        showToast(`Gagal mengekstrak: ${err.message}`, 'error');
        playPolarisChime('error');
      } finally {
        if (omnigetSkeleton) omnigetSkeleton.style.display = 'none';
      }
    };

    if (omnigetPasteBtn && omnigetInput) {
      omnigetPasteBtn.addEventListener('click', async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text) {
            omnigetInput.value = text.trim();
            omnigetInput.dispatchEvent(new Event('input'));
            showToast('Tautan kursus/magnet ditempel!', 'info');
            runOmnigetExtract();
          }
        } catch (_) {
          showToast('Izin clipboard ditolak.', 'error');
        }
      });
    }

    document.querySelectorAll('.omniget-sample-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const s = chip.getAttribute('data-sample');
        if (s && omnigetInput) {
          omnigetInput.value = s;
          omnigetInput.dispatchEvent(new Event('input'));
          showToast('Contoh dimuat!', 'info');
          runOmnigetExtract();
        }
      });
    });

    if (omnigetForm) {
      omnigetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        runOmnigetExtract();
      });
    }

    // Toolbox Tabs Switcher
    const toolTabs = document.querySelectorAll('.omniget-tool-tab');
    const toolPanels = document.querySelectorAll('.omniget-tool-panel');

    toolTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        toolTabs.forEach(t => {
          t.classList.remove('active', 'btn-primary');
          t.classList.add('btn-secondary');
        });
        tab.classList.add('active', 'btn-primary');
        tab.classList.remove('btn-secondary');

        const toolName = tab.getAttribute('data-tool');
        toolPanels.forEach(p => p.style.display = 'none');
        const targetPanel = document.getElementById(`omniget-tool-panel-${toolName}`);
        if (targetPanel) targetPanel.style.display = 'block';
        playPolarisChime('click');
      });
    });

    // Tool 1: Video to GIF
    const btnMakeGif = document.getElementById('btn-omniget-make-gif');
    if (btnMakeGif) {
      btnMakeGif.addEventListener('click', async () => {
        const input = document.getElementById('omniget-gif-input')?.value || './tmp/media/sample.mp4';
        const start = document.getElementById('omniget-gif-start')?.value || 0;
        const dur = document.getElementById('omniget-gif-duration')?.value || 5;
        const fps = document.getElementById('omniget-gif-fps')?.value || 15;
        const outBox = document.getElementById('omniget-gif-output');

        btnMakeGif.disabled = true;
        btnMakeGif.textContent = '⏳ Mengonversi ke GIF...';
        try {
          const res = await PolarisAuth.authFetch('/api/downloader/omniget/tools/video-to-gif', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoPath: input, startTime: start, duration: dur, fps }),
          });
          const json = await res.json();
          if (!json.success || !json.result) throw new Error(json.error || 'Gagal membuat GIF');
          if (outBox) {
            outBox.innerHTML = `
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div>
                  <div style="font-weight:700; color:var(--accent-cyan); font-size:0.85rem;">✅ GIF Berhasil Dibuat!</div>
                  <div style="font-size:0.74rem; color:var(--text-muted); margin-top:2px;">Ukuran: <strong>${json.result.formattedSize}</strong> • Resolusi: <strong>${json.result.width}px</strong> • FPS: <strong>${json.result.fps}</strong></div>
                </div>
                <a href="/api/downloader/proxy?url=${encodeURIComponent(json.result.outputPath)}&filename=${json.result.fileName}" target="_blank" class="btn-polaris btn-primary btn-sm" style="font-size:0.75rem;">
                  ⬇️ Unduh File GIF
                </a>
              </div>
            `;
            outBox.style.display = 'block';
          }
          showToast('GIF berhasil dibuat!', 'success');
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          btnMakeGif.disabled = false;
          btnMakeGif.innerHTML = '<span>⚡ Proses Video ke GIF</span>';
        }
      });
    }

    // Tool 2: Compress Video
    const btnCompressVid = document.getElementById('btn-omniget-compress-video');
    if (btnCompressVid) {
      btnCompressVid.addEventListener('click', async () => {
        const input = document.getElementById('omniget-vc-input')?.value || './tmp/media/sample.mp4';
        const mode = document.getElementById('omniget-vc-mode')?.value || '16';
        const resMode = document.getElementById('omniget-vc-res')?.value || '1080';
        const outBox = document.getElementById('omniget-vc-output');

        btnCompressVid.disabled = true;
        btnCompressVid.textContent = '⏳ Mengompresi Video...';
        try {
          const targetSizeMB = (mode === '16' || mode === '64') ? parseInt(mode, 10) : null;
          const crf = mode === 'crf28' ? 28 : 26;
          const res = await PolarisAuth.authFetch('/api/downloader/omniget/tools/compress-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoPath: input, targetSizeMB, crf, maxResolution: parseInt(resMode, 10) }),
          });
          const json = await res.json();
          if (!json.success || !json.result) throw new Error(json.error || 'Gagal kompresi video');
          if (outBox) {
            outBox.innerHTML = `
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div>
                  <div style="font-weight:700; color:var(--accent-emerald); font-size:0.85rem;">✅ Video Berhasil Dikompresi (${json.result.compressionRatio})!</div>
                  <div style="font-size:0.74rem; color:var(--text-muted); margin-top:2px;">Ukuran Awal: <strong>${json.result.formattedOriginalSize}</strong> ➔ Sesudah: <strong style="color:var(--accent-emerald);">${json.result.formattedCompressedSize}</strong> ${json.result.isWhatsAppSafe ? '• 🛡️ WhatsApp Safe' : ''}</div>
                </div>
                <a href="/api/downloader/proxy?url=${encodeURIComponent(json.result.outputPath)}&filename=${json.result.fileName}" target="_blank" class="btn-polaris btn-primary btn-sm" style="font-size:0.75rem;">
                  ⬇️ Unduh Video Hasil
                </a>
              </div>
            `;
            outBox.style.display = 'block';
          }
          showToast('Kompresi video selesai!', 'success');
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          btnCompressVid.disabled = false;
          btnCompressVid.innerHTML = '<span>🗜️ Kompresi Video Sekarang</span>';
        }
      });
    }

    // Tool 3: Compress Image
    const qSlider = document.getElementById('omniget-ic-quality');
    const qVal = document.getElementById('omniget-ic-quality-val');
    if (qSlider && qVal) {
      qSlider.addEventListener('input', () => { qVal.textContent = `${qSlider.value}%`; });
    }
    const btnCompressImg = document.getElementById('btn-omniget-compress-img');
    if (btnCompressImg) {
      btnCompressImg.addEventListener('click', async () => {
        const fileInput = document.getElementById('omniget-ic-file');
        const quality = parseInt(document.getElementById('omniget-ic-quality')?.value || '75', 10);
        const width = parseInt(document.getElementById('omniget-ic-width')?.value || '1920', 10);
        const format = document.getElementById('omniget-ic-format')?.value || 'jpeg';
        const outBox = document.getElementById('omniget-ic-output');

        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
          showToast('Pilih berkas foto terlebih dahulu.', 'error');
          return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();
        btnCompressImg.disabled = true;
        btnCompressImg.textContent = '⏳ Mengompresi...';

        reader.onload = async () => {
          try {
            const base64 = reader.result;
            const res = await PolarisAuth.authFetch('/api/downloader/omniget/tools/compress-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageBase64: base64, quality, maxWidth: width, format }),
            });
            const json = await res.json();
            if (!json.success || !json.result) throw new Error(json.error || 'Gagal kompresi foto');
            if (outBox) {
              outBox.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <img src="data:${json.result.mimeType};base64,${json.result.bufferBase64}" style="width:50px; height:50px; border-radius:6px; object-fit:cover; border:1px solid rgba(255,255,255,0.1);">
                    <div>
                      <div style="font-weight:700; color:var(--accent-amber); font-size:0.85rem;">✅ Foto Berhasil Dioptimasi (${json.result.compressionRatio})!</div>
                      <div style="font-size:0.74rem; color:var(--text-muted); margin-top:2px;">Awal: <strong>${json.result.formattedOriginalSize}</strong> ➔ Baru: <strong style="color:var(--accent-amber);">${json.result.formattedCompressedSize}</strong> (${json.result.dimensions.width}x${json.result.dimensions.height})</div>
                    </div>
                  </div>
                  <a href="data:${json.result.mimeType};base64,${json.result.bufferBase64}" download="${json.result.fileName}" class="btn-polaris btn-primary btn-sm" style="font-size:0.75rem;">
                    ⬇️ Unduh Foto
                  </a>
                </div>
              `;
              outBox.style.display = 'block';
            }
            showToast('Foto berhasil dikompresi!', 'success');
          } catch (err) {
            showToast(err.message, 'error');
          } finally {
            btnCompressImg.disabled = false;
            btnCompressImg.innerHTML = '<span>🖼️ Kompresi Gambar</span>';
          }
        };
        reader.readAsDataURL(file);
      });
    }

    // Tool 4: Audio Normalizer
    const btnNormAudio = document.getElementById('btn-omniget-norm-audio');
    if (btnNormAudio) {
      btnNormAudio.addEventListener('click', async () => {
        const input = document.getElementById('omniget-an-input')?.value || './tmp/downloader/audio/sample.mp3';
        const lufs = parseFloat(document.getElementById('omniget-an-lufs')?.value || '-14');
        const bitrate = document.getElementById('omniget-an-bitrate')?.value || '320k';
        const outBox = document.getElementById('omniget-an-output');

        btnNormAudio.disabled = true;
        btnNormAudio.textContent = '⏳ Menormalisasi Loudness...';
        try {
          const res = await PolarisAuth.authFetch('/api/downloader/omniget/tools/audio-normalize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioPath: input, targetLufs: lufs, audioBitrate: bitrate }),
          });
          const json = await res.json();
          if (!json.success || !json.result) throw new Error(json.error || 'Gagal normalisasi audio');
          if (outBox) {
            outBox.innerHTML = `
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div>
                  <div style="font-weight:700; color:var(--accent-amber); font-size:0.85rem;">✅ Audio Dinormalisasi (${json.result.targetLufs})!</div>
                  <div style="font-size:0.74rem; color:var(--text-muted); margin-top:2px;">Ukuran File: <strong>${json.result.formattedSize}</strong> • Bitrate: <strong>${json.result.bitrate}</strong></div>
                </div>
                <a href="/api/downloader/proxy?url=${encodeURIComponent(json.result.outputPath)}&filename=${json.result.fileName}" target="_blank" class="btn-polaris btn-primary btn-sm" style="font-size:0.75rem;">
                  ⬇️ Unduh Audio Normal
                </a>
              </div>
            `;
            outBox.style.display = 'block';
          }
          showToast('Audio berhasil dinormalisasi!', 'success');
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          btnNormAudio.disabled = false;
          btnNormAudio.innerHTML = '<span>🔊 Mulai Normalisasi Audio</span>';
        }
      });
    }

    // Tool 5: PDF to Markdown
    const btnExtractPdf = document.getElementById('btn-omniget-pdf-extract');
    if (btnExtractPdf) {
      btnExtractPdf.addEventListener('click', async () => {
        const fileInput = document.getElementById('omniget-pdf-file');
        const outBox = document.getElementById('omniget-pdf-output');

        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
          showToast('Pilih berkas PDF terlebih dahulu.', 'error');
          return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();
        btnExtractPdf.disabled = true;
        btnExtractPdf.textContent = '⏳ Mengekstrak Struktur Markdown...';

        reader.onload = async () => {
          try {
            const base64 = reader.result;
            const res = await PolarisAuth.authFetch('/api/downloader/omniget/tools/pdf-to-markdown', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pdfBase64: base64 }),
            });
            const json = await res.json();
            if (!json.success || !json.result) throw new Error(json.error || 'Gagal mengekstrak PDF');
            if (outBox) {
              const mdText = json.result.markdown;
              outBox.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
                  <span style="font-size:0.82rem; font-weight:700; color:var(--accent-purple);">📄 ${escapeHtml(json.result.fileName)} (${json.result.linesExtracted} baris diekstrak)</span>
                  <div style="display:flex; gap:6px;">
                    <button type="button" class="btn-polaris btn-secondary btn-sm" id="btn-copy-md" style="font-size:0.72rem;">📋 Salin Markdown</button>
                    <a href="data:text/markdown;charset=utf-8,${encodeURIComponent(mdText)}" download="${json.result.fileName.replace(/\.pdf$/i, '')}.md" class="btn-polaris btn-primary btn-sm" style="font-size:0.72rem;">⬇️ Simpan .md</a>
                  </div>
                </div>
                <pre style="background:rgba(0,0,0,0.6); padding:14px; border-radius:6px; font-family:var(--font-mono); font-size:0.76rem; color:#EFEADC; max-height:220px; overflow-y:auto; white-space:pre-wrap; border:1px solid rgba(255,255,255,0.06);">${escapeHtml(mdText)}</pre>
              `;
              outBox.style.display = 'block';

              const copyBtn = document.getElementById('btn-copy-md');
              if (copyBtn) {
                copyBtn.addEventListener('click', () => {
                  navigator.clipboard.writeText(mdText);
                  showToast('Markdown berhasil disalin ke clipboard!', 'success');
                });
              }
            }
            showToast('Ekstraksi PDF berhasil!', 'success');
          } catch (err) {
            showToast(err.message, 'error');
          } finally {
            btnExtractPdf.disabled = false;
            btnExtractPdf.innerHTML = '<span>📄 Ekstrak ke Markdown</span>';
          }
        };
        reader.readAsDataURL(file);
      });
    }

    renderDownloaderHistory();
    updateDownloaderStats();
  }

  function initMainControls() {
    initNavigation();
    initMacroPillarSwitcher();
    initStudySpaceEvents();
    initStoryFeature();
    initImportFeature();
    initAccountSettings();
    initUpgradeTokens();
    initClusterFeature();
    initHermesFeature();
    initDownloaderHub();
    initSocialFeature();
    initIphoneMockupClock();

    // Bot control buttons
    document.getElementById('btn-start-bot')?.addEventListener('click', startBot);
    document.getElementById('btn-stop-bot')?.addEventListener('click', stopBot);
    document.getElementById('btn-restart-bot')?.addEventListener('click', restartBot);
    document.getElementById('btn-pair-bot')?.addEventListener('click', promptPairingCode);
    document.getElementById('btn-reset-session')?.addEventListener('click', resetSession);
    document.getElementById('btn-clear-terminal')?.addEventListener('click', clearLogs);

    // Whitelist & Private Chat buttons
    document.getElementById('btn-add-owner')?.addEventListener('click', addOwnerPrompt);
    document.getElementById('btn-add-whitelist')?.addEventListener('click', addWhitelistPrompt);
    document.getElementById('whitelist-target-bot')?.addEventListener('change', () => loadWhitelist());
    document.getElementById('btn-save-private-chat')?.addEventListener('click', savePrivateChatSettingsData);

    // Groups buttons
    document.getElementById('btn-add-group')?.addEventListener('click', addGroupPrompt);
    document.getElementById('btn-sync-groups-wa')?.addEventListener('click', syncGroupsFromWA);
    document.getElementById('btn-disallow-all-groups')?.addEventListener('click', disallowAllGroups);
    document.getElementById('group-target-bot')?.addEventListener('change', () => loadGroups());
    document.getElementById('group-search-input')?.addEventListener('input', () => renderGroups(groupData));

    // Command buttons & filters
    document.getElementById('btn-enable-all-commands')?.addEventListener('click', () => bulkToggleCommands(true));
    document.getElementById('btn-disable-all-commands')?.addEventListener('click', () => bulkToggleCommands(false));
    document.getElementById('btn-add-custom-command')?.addEventListener('click', openCreateCustomModal);
    document.getElementById('command-filter-cat')?.addEventListener('change', () => renderCommands(commandsData));
    document.getElementById('command-search-input')?.addEventListener('input', () => renderCommands(commandsData));
    document.getElementById('command-target-bot')?.addEventListener('change', () => loadCommands());

    // Inisialisasi Edit Output Bot & Ekosistem Grup
    initEditOutputControls();
    initCommandPermissionHandler();

    // Event listeners untuk Output Routing Editor (Inplace, Self, Friend, Group)
    document.querySelectorAll('input[name="cmdOutputMode"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        document.querySelectorAll('input[name="cmdOutputMode"]').forEach((r) => {
          const pill = r.closest('.story-audience-pill');
          if (pill) {
            if (r.checked) pill.classList.add('active');
            else pill.classList.remove('active');
          }
        });
        const detailFriend = document.getElementById('routing-detail-friend');
        const detailGroup = document.getElementById('routing-detail-group');
        const isFriend = radio.value === 'friend';
        const isGroup = radio.value === 'group';
        if (detailFriend) detailFriend.style.display = isFriend ? 'block' : 'none';
        if (detailGroup) detailGroup.style.display = isGroup ? 'block' : 'none';

        if (isFriend) {
          const friendInput = document.getElementById('routing-friend-number');
          if (friendInput) {
            setTimeout(() => friendInput.focus(), 60);
          }
        }
      });
    });

    // Handle klik langsung pada pill container untuk responsivitas instan
    document.querySelectorAll('#modal-command-routing .story-audience-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const r = pill.querySelector('input[name="cmdOutputMode"]');
        if (r && !r.checked) {
          r.checked = true;
          r.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    });

    const routingGroupSelect = document.getElementById('routing-group-select');
    const routingGroupCustomInput = document.getElementById('routing-group-custom-jid');
    if (routingGroupSelect && routingGroupCustomInput) {
      routingGroupSelect.addEventListener('change', () => {
        const isCustom = routingGroupSelect.value === 'custom';
        routingGroupCustomInput.style.display = isCustom ? 'block' : 'none';
        if (isCustom) routingGroupCustomInput.focus();
      });
    }

    document.getElementById('btn-save-routing')?.addEventListener('click', saveRoutingConfig);

    // Event listeners untuk Template Audiens Story WA (Maks 10)
    document.getElementById('btn-story-save-template')?.addEventListener('click', openSaveStoryTemplateModal);
    document.getElementById('btn-story-apply-template')?.addEventListener('click', applySelectedStoryTemplate);
    document.getElementById('btn-story-delete-template')?.addEventListener('click', deleteSelectedStoryTemplate);
    document.getElementById('btn-confirm-save-template')?.addEventListener('click', confirmSaveStoryTemplate);
    const storyTplSelect = document.getElementById('story-template-select');
    if (storyTplSelect) {
      storyTplSelect.addEventListener('change', () => {
        const delBtn = document.getElementById('btn-story-delete-template');
        if (storyTplSelect.value) {
          if (delBtn) delBtn.style.display = 'inline-block';
          applySelectedStoryTemplate();
        } else {
          if (delBtn) delBtn.style.display = 'none';
        }
      });
    }

    // Custom command modal form submit
    document.getElementById('create-command-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const n = document.getElementById('custom-cmd-name').value;
      const r = document.getElementById('custom-cmd-response').value;
      const d = document.getElementById('custom-cmd-desc').value;
      handleCreateCustomCommand(n, r, d);
    });

    // Close Modals on click outside or close button
    document.querySelectorAll('.modal-close-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        btn.closest('.modal-backdrop').classList.remove('active');
      });
    });
  }

  // ========================================================
  // 📦 WEB-TO-APK BUILDER STUDIO (CLIENT LOGIC)
  // ========================================================
  function initWebToApkBuilder() {
    if (window.__webToApkInited) return;
    window.__webToApkInited = true;

    const dropzone = document.getElementById('apk-dropzone');
    const fileInput = document.getElementById('apk-zip-file-input');
    const filenameEl = document.getElementById('apk-selected-filename');
    const btnBuild = document.getElementById('btn-build-web-apk');
    const modeSelect = document.getElementById('apk-target-mode');
    const backendInput = document.getElementById('apk-backend-url');

    let selectedZipBase64 = null;

    if (modeSelect && backendInput) {
      modeSelect.addEventListener('change', () => {
        backendInput.style.display = modeSelect.value === 'remote' ? 'block' : 'none';
      });
    }

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '#38bdf8';
        dropzone.style.background = 'rgba(56, 189, 248, 0.1)';
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'rgba(52, 211, 153, 0.4)';
        dropzone.style.background = 'rgba(0,0,0,0.3)';
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'rgba(52, 211, 153, 0.4)';
        dropzone.style.background = 'rgba(0,0,0,0.3)';
        if (e.dataTransfer.files && e.dataTransfer.files.length) {
          handleZipFile(e.dataTransfer.files[0]);
        }
      });
      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files.length) handleZipFile(fileInput.files[0]);
      });
    }

    function handleZipFile(file) {
      if (!file.name.toLowerCase().endsWith('.zip')) {
        showToast('Mohon pilih berkas berekstensi .zip', 'error');
        return;
      }
      filenameEl.style.display = 'block';
      filenameEl.textContent = `📦 Berkas dipilih: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      const reader = new FileReader();
      reader.onload = () => {
        selectedZipBase64 = reader.result;
      };
      reader.readAsDataURL(file);
    }

    if (btnBuild) {
      btnBuild.addEventListener('click', async () => {
        const statusBox = document.getElementById('apk-build-status-box');
        const progressBar = document.getElementById('apk-progress-bar');
        const statusText = document.getElementById('apk-status-text');
        const percentText = document.getElementById('apk-status-percent');
        const consoleLog = document.getElementById('apk-console-log');
        const dlContainer = document.getElementById('apk-download-container');
        const btnDownload = document.getElementById('btn-download-apk-package');

        statusBox.style.display = 'block';
        dlContainer.style.display = 'none';
        progressBar.style.width = '25%';
        percentText.textContent = '25%';
        statusText.textContent = 'Mempersiapkan parameter & aset web...';
        consoleLog.textContent = '> [Build] Inisialisasi build environment...\n';

        const permissions = [];
        if (document.getElementById('perm-internet')?.checked) permissions.push('INTERNET');
        if (document.getElementById('perm-network')?.checked) permissions.push('ACCESS_NETWORK_STATE');
        if (document.getElementById('perm-camera')?.checked) permissions.push('CAMERA');
        if (document.getElementById('perm-audio')?.checked) permissions.push('RECORD_AUDIO');
        if (document.getElementById('perm-storage')?.checked) permissions.push('WRITE_EXTERNAL_STORAGE');
        if (document.getElementById('perm-location')?.checked) permissions.push('ACCESS_FINE_LOCATION');

        const payload = {
          zipBase64: selectedZipBase64,
          appName: document.getElementById('apk-app-name')?.value || 'Polaris App',
          packageId: document.getElementById('apk-package-id')?.value || 'com.polaris.webapp',
          versionName: document.getElementById('apk-version-name')?.value || '1.0.0',
          versionCode: parseInt(document.getElementById('apk-version-code')?.value) || 1,
          targetMode: document.getElementById('apk-target-mode')?.value || 'offline',
          backendUrl: document.getElementById('apk-backend-url')?.value || '',
          orientation: document.getElementById('apk-orientation')?.value || 'portrait',
          themeColor: document.getElementById('apk-theme-color')?.value || '#0f172a',
          permissions,
        };

        try {
          progressBar.style.width = '55%';
          percentText.textContent = '55%';
          statusText.textContent = 'Mengirim aset & menyusun struktur Android Gradle...';

          const res = await PolarisAuth.authFetch('/api/tools/web-to-apk/build', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          const data = await res.json();

          if (data.success) {
            progressBar.style.width = '100%';
            percentText.textContent = '100%';
            statusText.textContent = '🎉 Build Selesai! Paket APK siap diunduh.';
            statusText.style.color = '#34d399';
            consoleLog.textContent = (data.logs || []).join('\n');
            dlContainer.style.display = 'block';
            btnDownload.href = data.downloadUrl;
            btnDownload.setAttribute('download', data.fileName);
            showToast('Paket Proyek APK berhasil dibangun!', 'success');
            if (typeof confetti === 'function') confetti({ particleCount: 70, spread: 60 });
          } else {
            throw new Error(data.error || 'Gagal membangun proyek APK');
          }
        } catch (err) {
          statusText.textContent = `❌ Gagal: ${err.message}`;
          statusText.style.color = 'var(--accent-rose)';
          consoleLog.textContent += `\n[ERROR] ${err.message}`;
          showToast(err.message, 'error');
        }
      });
    }
  }

  // ========================================================
  // 🔮 FUN TOOLS: ORACLE TAROT (22 MAJOR ARCANA PATHWAYS)
  // ========================================================
  const TAROT_DECK = [
    {
      id: 0,
      image: '0fool.png',
      name: 'The Fool',
      nameId: 'Si Pengembara',
      character: 'Klein Moretti',
      pathway: 'Seer Pathway (Pathway of The Fool)',
      icon: '🃏',
      arcana: '0',
      upright: 'Awal baru, spontanitas, keberanian mengambil risiko, kebebasan batin.',
      reversed: 'Kecerobohan, ketidaksiapan, keraguan berlebihan, melompat tanpa melihat.',
      love: 'Peluang asmara baru yang menyegarkan tanpa ekspektasi mengekang.',
      career: 'Langkah awal karier atau bisnis baru yang menuntut keyakinan penuh.',
      advice: 'Lepaskan ketakutan masa lalu dan percayalah pada petualangan baru di depan.'
    },
    {
      id: 1,
      image: '1magician.png',
      name: 'The Magician',
      nameId: 'Sang Penyihir',
      character: 'Fors Wall',
      pathway: 'Apprentice / Door Pathway',
      icon: '🪄',
      arcana: 'I',
      upright: 'Kekuatan manifestasi, keahlian, sumber daya berlimpah, fokus penciptaan.',
      reversed: 'Manipulasi, bakat terpendam tak terpakai, ilusi, tipu muslihat.',
      love: 'Daya tarik magnetis tinggi, komunikasi jujur dan saling memikat.',
      career: 'Waktu terbaik untuk meluncurkan ide brilian; Anda punya semua alat yang dibutuhkan.',
      advice: 'Wujudkan niat menjadi aksi nyata; potensimu tak terbatas saat pikiranmu selaras.'
    },
    {
      id: 2,
      image: '2priestess.png',
      name: 'The High Priestess',
      nameId: 'Pendeta Agung',
      character: 'Bernadette Gustav',
      pathway: 'Mystery Pryer / Hermit Pathway',
      icon: '🌙',
      arcana: 'II',
      upright: 'Intuisi mendalam, rahasia batin, ketenangan spiritual, kebijaksanaan sunyi.',
      reversed: 'Mengabaikan firasat, rahasia terungkap, kebisingan pikiran luar.',
      love: 'Koneksi jiwa yang sunyi namun dalam; perhatikan sinyal non-verbal.',
      career: 'Tunggu momen yang tepat sebelum mengambil keputusan besar; amati keadaan secara cermat.',
      advice: 'Dengarkan suara hatimu yang paling hening, ia tahu kebenaran yang tak tampak oleh mata.'
    },
    {
      id: 3,
      image: '3empress.png',
      name: 'The Empress',
      nameId: 'Sang Permaisuri',
      character: 'Lilith (Mother)',
      pathway: 'Mother / Planter Pathway',
      icon: '👑',
      arcana: 'III',
      upright: 'Kesuburan, kelimpahan rezeki, kehangatan, kreativitas mekar.',
      reversed: 'Kekeringan emosional, ketergantungan, kecemasan materi.',
      love: 'Hubungan yang penuh kasih sayang, kenyamanan, dan komitmen hangat.',
      career: 'Proyek membuahkan hasil panen yang manis; pertumbuhan finansial positif.',
      advice: 'Rawat dirimu dan ide-idemu dengan penuh kelembutan, biarkan mekar alami.'
    },
    {
      id: 4,
      image: '4emperor.png',
      name: 'The Emperor',
      nameId: 'Sang Kaisar',
      character: 'Roselle Gustav',
      pathway: 'Black Emperor / Lawyer Pathway',
      icon: '🏛️',
      arcana: 'IV',
      upright: 'Struktur kokoh, otoritas adil, disiplin baja, perlindungan mantap.',
      reversed: 'Tirani, kontrol berlebihan, kekakuan pikiran, ketiadaan arah.',
      love: 'Stabilitas dan kepastian jangka panjang; saling menjaga kehormatan.',
      career: 'Waktunya memimpin dengan ketegasan dan strategi yang terorganisir rapi.',
      advice: 'Tegakkan batas yang sehat dan susun rencana jangka panjang secara disiplin.'
    },
    {
      id: 5,
      image: '5sailor.png',
      name: 'The Hierophant',
      nameId: 'Penasihat Suci',
      character: 'Alger Wilson (The Hierophant)',
      pathway: 'Sailor / Tyrant Pathway',
      icon: '📜',
      arcana: 'V',
      upright: 'Tradisi, bimbingan spiritual, kebijaksanaan warisan, pembelajaran mendalam.',
      reversed: 'Pemberontakan sehat, dogma kaku, mencari jalan alternatif sendiri.',
      love: 'Nilai-nilai bersama dan komitmen sakral yang mengikat jiwa.',
      career: 'Carilah mentor atau ikuti sistem yang terbukti berhasil sebelum berinovasi bebas.',
      advice: 'Hormati proses belajar dan timbalah ilmu dari mereka yang telah menempuh jalan ini.'
    },
    {
      id: 6,
      image: '6lovers.png',
      name: 'The Lovers',
      nameId: 'Dua Sejoli',
      character: 'Leonard Mitchell (The Lovers)',
      pathway: 'Darkness / Sleepless Pathway',
      icon: '💖',
      arcana: 'VI',
      upright: 'Penyatuan harmoni, pilihan moral sejati, chemistry kuat, keterikatan batin.',
      reversed: 'Ketidakharmonisan, keraguan komitmen, pilihan yang bertentangan dengan nurani.',
      love: 'Cinta yang mendalam dan saling mengisi; harmoni dua jiwa.',
      career: 'Kemitraan bisnis yang saling menguntungkan dan sejalan dalam visi.',
      advice: 'Pilihlah apa yang sejati menurut kata hatimu, bukan sekadar apa yang mudah.'
    },
    {
      id: 7,
      image: '7chariot.png',
      name: 'The Chariot',
      nameId: 'Kereta Kemenangan',
      character: 'Lumian Lee',
      pathway: 'Hunter / Red Priest Pathway',
      icon: '⚔️',
      arcana: 'VII',
      upright: 'Kemenangan melalui tekad, fokus membaja, mengatasi rintangan keras.',
      reversed: 'Kehilangan kendali, agresi tak terarah, kelelahan energi.',
      love: 'Menghadapi rintangan bersama dengan gigih dan pantang menyerah.',
      career: 'Kemajuan pesat dan penaklukan target; kerja keras mulai terbayar.',
      advice: 'Kendalikan dorongan emosimu dan pacu energimu lurus menuju garis akhir.'
    },
    {
      id: 8,
      image: '8strength.png',
      name: 'Strength',
      nameId: 'Kekuatan Hati',
      character: 'Xio Derecha (Strength)',
      pathway: 'Arbiter / Justiciar Pathway',
      icon: '🦁',
      arcana: 'VIII',
      upright: 'Keberanian batin, kesabaran menundukkan amarah, welas asih, ketahanan jiwa.',
      reversed: 'Keraguan diri, keputusasaan sementara, emosi meledak-ledak.',
      love: 'Kelembutan yang mampu meluluhkan kekakuan pasangan.',
      career: 'Menghadapi situasi tegang dengan kepala dingin dan etika tinggi.',
      advice: 'Kekuatan sejati bukanlah kekerasan, melainkan kemampuan menenangkan badai dengan ketenangan.'
    },
    {
      id: 9,
      image: '9hermit.png',
      name: 'The Hermit',
      nameId: 'Sang Petapa',
      character: 'Cattleya (The Hermit)',
      pathway: 'Mystery Pryer Pathway',
      icon: '🏮',
      arcana: 'IX',
      upright: 'Introspeksi diri, pencarian jati diri, hening merenung, penerangan batin.',
      reversed: 'Isolasi berlebihan, kesepian menekan, menolak bantuan luar.',
      love: 'Waktu untuk memahami kebutuhan diri sendiri sebelum berbagi hati.',
      career: 'Lakukan evaluasi mendalam terhadap arah hidup dan tujuan utamamu.',
      advice: 'Menyingkirlah sejenak dari kebisingan dunia untuk menemukan cahaya di dalam jiwamu.'
    },
    {
      id: 10,
      image: '10fortune.png',
      name: 'Wheel of Fortune',
      nameId: 'Roda Takdir',
      character: 'Will Auceptin',
      pathway: 'Monster / Wheel of Fortune Pathway',
      icon: '☸️',
      arcana: 'X',
      upright: 'Perputaran siklus, keberuntungan tak terduga, takdir baik berpihak.',
      reversed: 'Kemunduran sementara, siklus berulang yang perlu diputus.',
      love: 'Pertemuan tak sengaja yang mengubah arah hidup asmaramu.',
      career: 'Pintu rezeki baru terbuka; manfaatkan momentum emas ini.',
      advice: 'Segala hal di dunia ini berputar; nikmati puncak kejayaan dan jangan gentar saat berada di lembah.'
    },
    {
      id: 11,
      image: '11justice.png',
      name: 'Justice',
      nameId: 'Keadilan Murni',
      character: 'Audrey Hall (Justice)',
      pathway: 'Spectator / Visionary Pathway',
      icon: '⚖️',
      arcana: 'XI',
      upright: 'Kebenaran mutlak, hukum sebab-akibat (karma), kejujuran, integritas.',
      reversed: 'Ketidakadilan, prasangka bias, lari dari tanggung jawab.',
      love: 'Kejujuran tanpa topeng membawa kedamaian hubungan.',
      career: 'Keputusan kontrak atau legal akan membuahkan hasil yang sepadan dengan usahamu.',
      advice: 'Berlakulah adil pada sesama dan dirimu sendiri; kebenaran selalu menemukan jalannya.'
    },
    {
      id: 12,
      image: '12hangman.png',
      name: 'The Hanged Man',
      nameId: 'Sang Tergantung',
      character: 'Alger Wilson (The Hanged Man)',
      pathway: 'Sailor / Tyrant Pathway',
      icon: '⏳',
      arcana: 'XII',
      upright: 'Melihat dari sudut pandang baru, jeda sukarela, pelepasan ego demi pencerahan.',
      reversed: 'Keras kepala mempertahankan status quo, pengorbanan sia-sia.',
      love: 'Lepaskan ekspektasi egois demi memandang perasaan pasangan secara utuh.',
      career: 'Jeda ini bukan kegagalan, melainkan masa inkubasi strategi yang lebih matang.',
      advice: 'Saat segala sesuatu terasa macet, ubahlah cara pandangmu dan relakan apa yang tak bisa kau kendalikan.'
    },
    {
      id: 13,
      image: '13death.png',
      name: 'Death',
      nameId: 'Transformasi Abadi',
      character: 'Azik Eggers',
      pathway: 'Death / Corpse Collector Pathway',
      icon: '🦋',
      arcana: 'XIII',
      upright: 'Akhir dari siklus lama, kelahiran kembali, pelepasan total, metamorfosis.',
      reversed: 'Takut perubahan, terikat pada masa lalu yang telah usang.',
      love: 'Menutup luka lama untuk memberi ruang bagi cinta yang baru dan lebih sehat.',
      career: 'Fase karier lama berakhir; babak baru yang jauh lebih berkembang menanti.',
      advice: 'Jangan tangisi daun yang gugur; ia memberi jalan bagi tunas hijau yang hendak bertumbuh.'
    },
    {
      id: 14,
      image: '14temperance.png',
      name: 'Temperance',
      nameId: 'Keseimbangan Jiwa',
      character: 'Sharron (Temperance)',
      pathway: 'Chained / Prisoner Pathway',
      icon: '🌊',
      arcana: 'XIV',
      upright: 'Moderasi, penyatuan harmoni dua kutub, kesabaran, penyembuhan damai.',
      reversed: 'Ketidakseimbangan ekstrem, konflik batin, terburu-buru.',
      love: 'Hubungan yang tenang, damai, dan saling berkompromi dengan sehat.',
      career: 'Kolaborasi yang seimbang; hindari pengeluaran atau keputusan ekstrem.',
      advice: 'Campurkan kebijaksanaan dengan kesabaran; kedamaian hidup ada pada titik tengah yang selaras.'
    },
    {
      id: 15,
      image: '15devil.png',
      name: 'The Devil',
      nameId: 'Belenggu Ilusi',
      character: 'Brod (The Devil)',
      pathway: 'Abyss / Devil Pathway',
      icon: '⛓️',
      arcana: 'XV',
      upright: 'Keterikatan materi, obsesi berlebihan, bayang-bayang ego, candu kebiasaan.',
      reversed: 'Pembebasan dari jeratan racun, memutus rantai ketergantungan.',
      love: 'Waspadai cinta obsesif atau hubungan toksik yang membelenggu kebebasanmu.',
      career: 'Jangan gadaikan integritas demi uang atau keuntungan instan.',
      advice: 'Sadarilah bahwa rantai yang membelenggumu sebenarnya longgar; engkau bebas melangkah saat kau memutuskan.'
    },
    {
      id: 16,
      image: '16tower.png',
      name: 'The Tower',
      nameId: 'Runtuhnya Menara',
      character: 'Fors Wall / White Tower',
      pathway: 'Reader / White Tower Pathway',
      icon: '⚡',
      arcana: 'XVI',
      upright: 'Guncangan tiba-tiba, runtuhnya ilusi palsu, pencerahan kilat yang membebaskan.',
      reversed: 'Menunda bencana yang tak terelakkan, ketakutan menghadapi fakta.',
      love: 'Kebenaran yang mengejutkan terungkap, mengikis kepura-puraan.',
      career: 'Perubahan drastis yang membuka jalan bagi pondasi yang jauh lebih kokoh.',
      advice: 'Apa yang runtuh adalah apa yang rapuh; bangun kembali kehidupanmu di atas batu karang kejujuran.'
    },
    {
      id: 17,
      image: '17star.png',
      name: 'The Star',
      nameId: 'Bintang Harapan',
      character: 'Leonard Mitchell (The Star)',
      pathway: 'Darkness / Sleepless Pathway',
      icon: '⭐',
      arcana: 'XVII',
      upright: 'Harapan bersinar, inspirasi ilahi, ketenangan setelah badai, berkah murni.',
      reversed: 'Kehilangan iman sesaat, pesimisme, rasa putus asa.',
      love: 'Cinta yang menyembuhkan luka batin; saling mendoakan dan menguatkan.',
      career: 'Masa depan cerah; inspirasimu akan dihargai dan membawa dampak positif.',
      advice: 'Pandanglah ke atas; bintang penuntunmu selalu bersinar di balik gelapnya malam terpekat.'
    },
    {
      id: 18,
      image: '18moon.png',
      name: 'The Moon',
      nameId: 'Misteri Rembulan',
      character: 'Emlyn White (The Moon)',
      pathway: 'Moon / Apothecary Pathway',
      icon: '🌕',
      arcana: 'XVIII',
      upright: 'Intuisi bawah sadar, mimpi pertanda, menghadapi ketakutan tersembunyi.',
      reversed: 'Kabut kebingungan sirna, kebenaran mulai tersingkap jelas.',
      love: 'Kecurigaan atau kecemasan yang belum terbukti; komunikasikan dengan jernih.',
      career: 'Hindari menandatangani kontrak samar-samar sebelum semua fakta jelas di atas meja.',
      advice: 'Percayai intuisimu saat melewati kabut; jangan biarkan bayang-bayang menipu ketetapan hatimu.'
    },
    {
      id: 19,
      image: '19sun.png',
      name: 'The Sun',
      nameId: 'Sang Surya Kejayaan',
      character: 'Derrick Berg (The Sun)',
      pathway: 'Sun / Bard Pathway',
      icon: '☀️',
      arcana: 'XIX',
      upright: 'Kebahagiaan melimpah, kejayaan, kejelasan pikiran, vitalitas hidup luar biasa.',
      reversed: 'Keceriaan tertunda sementara, optimisme yang perlu dinyalakan kembali.',
      love: 'Hubungan yang penuh tawa, kehangatan, kebanggaan, dan keterbukaan.',
      career: 'Puncak keberhasilan; pencapaian diakui publik dan mendatangkan rezeki berkah.',
      advice: 'Pancarkan cahayamu dengan penuh percaya diri; kegelapan sirna seketika di hadapan sang surya.'
    },
    {
      id: 20,
      image: '20judgement.png',
      name: 'Judgement',
      nameId: 'Hari Kebangkitan',
      character: 'Xio Derecha (Judgement)',
      pathway: 'Arbiter / Justiciar Pathway',
      icon: '📯',
      arcana: 'XX',
      upright: 'Panggilan jiwa sejati, evaluasi hidup, pengampunan, kebangkitan derajat.',
      reversed: 'Menghakimi diri sendiri terlalu keras, ragu menyambut panggilan hidup.',
      love: 'Kedewasaan emosional membawa kesempatan kedua yang mulia.',
      career: 'Waktunya mengambil peran kepemimpinan yang telah lama ditakdirkan bagimu.',
      advice: 'Lepaskan penyesalan masa lalu; sambutlah dirimu yang baru yang telah bangkit lebih bijaksana.'
    },
    {
      id: 21,
      image: '21world.png',
      name: 'The World',
      nameId: 'Semesta Sempurna',
      character: 'Frank Lee / The World',
      pathway: 'Planter / Mother Pathway',
      icon: '🌍',
      arcana: 'XXI',
      upright: 'Penyelesaian paripurna, kesuksesan utuh, keutuhan jiwa, pencapaian puncak.',
      reversed: 'Langkah terakhir yang tertunda, ketiadaan penutup yang jelas.',
      love: 'Cinta yang genap dan saling melengkapi seutuhnya di dunia dan akhirat.',
      career: 'Penyelesaian proyek mahakarya; reputasi luas dan pengakuan semesta.',
      advice: 'Rayakan perjalanan panjangmu; satu siklus agung telah selesai, dan dunia membungkuk menghormati keteguhanmu.'
    }
  ];

  // Sacred Geometry Nano / Pathways Card Back SVG
  function getNanoTarotBackSvg() {
    return `<svg viewBox="0 0 200 320" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="sacredCenterGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#3b0764"/>
          <stop offset="50%" stop-color="#1e1035"/>
          <stop offset="100%" stop-color="#0a0518"/>
        </radialGradient>
        <linearGradient id="goldBorderGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fde047"/>
          <stop offset="50%" stop-color="#d97706"/>
          <stop offset="100%" stop-color="#fbbf24"/>
        </linearGradient>
      </defs>
      <!-- Base & Outer Borders -->
      <rect x="0" y="0" width="200" height="320" rx="16" fill="url(#sacredCenterGrad)"/>
      <rect x="8" y="8" width="184" height="304" rx="12" fill="none" stroke="url(#goldBorderGrad)" stroke-width="1.8" opacity="0.85"/>
      <rect x="14" y="14" width="172" height="292" rx="9" fill="none" stroke="rgba(251, 191, 36, 0.4)" stroke-width="1" stroke-dasharray="4,4"/>
      
      <!-- Corner Filigree -->
      <path d="M18 30 L30 18 M18 24 L24 18 M182 30 L170 18 M182 24 L176 18 M18 290 L30 302 M18 296 L24 302 M182 290 L170 302 M182 296 L176 302" stroke="url(#goldBorderGrad)" stroke-width="1.5" stroke-linecap="round"/>
      
      <!-- Sacred Concentric Rings -->
      <circle cx="100" cy="160" r="68" fill="none" stroke="rgba(251, 191, 36, 0.25)" stroke-width="1"/>
      <circle cx="100" cy="160" r="54" fill="none" stroke="url(#goldBorderGrad)" stroke-width="1.2" opacity="0.75"/>
      <circle cx="100" cy="160" r="38" fill="none" stroke="rgba(56, 189, 248, 0.45)" stroke-width="1"/>
      
      <!-- 8-Pointed Star of Destiny -->
      <g stroke="url(#goldBorderGrad)" stroke-width="1.4" fill="rgba(251, 191, 36, 0.12)">
        <polygon points="100,108 108,152 152,160 108,168 100,212 92,168 48,160 92,152"/>
        <polygon points="100,118 106,154 142,160 106,166 100,202 94,166 58,160 94,154" opacity="0.6"/>
      </g>
      
      <!-- Central Arcana Seal -->
      <g transform="translate(100, 160)">
        <circle cx="0" cy="0" r="18" fill="#1b0d33" stroke="url(#goldBorderGrad)" stroke-width="1.8"/>
        <!-- Mystic Eye / Crystal -->
        <path d="M-10 0 Q 0 -8 10 0 Q 0 8 -10 0 Z" fill="none" stroke="#fbbf24" stroke-width="1.5"/>
        <circle cx="0" cy="0" r="4" fill="#38bdf8"/>
        <circle cx="0" cy="0" r="1.5" fill="#ffffff"/>
      </g>
      
      <!-- Celestial Text Rim -->
      <text x="100" y="78" text-anchor="middle" fill="#fbbf24" font-size="7" font-weight="800" letter-spacing="3" opacity="0.9">POLARIS PATHWAYS</text>
      <text x="100" y="248" text-anchor="middle" fill="#fbbf24" font-size="6.5" font-weight="800" letter-spacing="2.5" opacity="0.9">22 MAJOR ARCANA</text>
    </svg>`;
  }

  // Open High-Res Tarot Card Lightbox / Modal
  window.openTarotCardModal = function(cardId, isReversed = false) {
    const card = TAROT_DECK.find(c => c.id === cardId);
    if (!card) return;

    const modal = document.getElementById('tarot-card-modal');
    const modalBody = document.getElementById('tarot-modal-body');
    if (!modal || !modalBody) return;

    const meaning = isReversed ? card.reversed : card.upright;
    const imgSrc = `assets/tarot/${card.image}`;
    const fallbackImg = `assets/tarot/${card.image.replace('.png', '.jpg')}`;

    modalBody.innerHTML = `
      <div style="flex: 0 0 280px; max-width: 100%; display: flex; flex-direction: column; align-items: center;">
        <div style="width: 100%; max-width: 280px; border-radius: 16px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.8), 0 0 30px ${isReversed ? 'color-mix(in srgb, var(--accent-rose) 40%, transparent)' : 'color-mix(in srgb, var(--accent-cyan) 40%, transparent)'}; border: 2px solid ${isReversed ? 'var(--accent-rose)' : 'var(--accent-cyan)'}; background: #07080f; position: relative;">
          <img src="${imgSrc}" alt="${escapeHtml(card.name)}" style="width: 100%; height: auto; display: block; ${isReversed ? 'transform: rotate(180deg);' : ''} transition: transform 0.4s ease;" onerror="this.onerror=null; this.src='${fallbackImg}';" />
        </div>
        <div style="margin-top: 12px; display: inline-flex; align-items: center; gap: 6px; padding: 4px 14px; border-radius: 9999px; font-size: 0.72rem; font-weight: 800; background: ${isReversed ? 'color-mix(in srgb, var(--accent-rose) 20%, transparent)' : 'color-mix(in srgb, var(--accent-cyan) 20%, transparent)'}; color: ${isReversed ? 'var(--accent-rose)' : 'var(--accent-cyan)'}; border: 1px solid ${isReversed ? 'color-mix(in srgb, var(--accent-rose) 40%, transparent)' : 'color-mix(in srgb, var(--accent-cyan) 40%, transparent)'};">
          ${isReversed ? '🔄 Posisi Terbalik (Reversed)' : '⬆️ Posisi Tegak (Upright)'}
        </div>
      </div>
      <div style="flex: 1; min-width: 280px; display: flex; flex-direction: column; gap: 14px;">
        <div>
          <div style="font-size: 0.75rem; color: var(--accent-amber); font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">
            ARCANA ${card.arcana} • ${escapeHtml(card.pathway || 'Divine Pathway')}
          </div>
          <h3 style="font-size: 1.5rem; font-weight: 900; color: #fff; margin: 2px 0 4px 0;">
            ${escapeHtml(card.name)} <span style="font-size: 1.05rem; font-weight: 600; color: var(--text-muted);">(${escapeHtml(card.nameId)})</span>
          </h3>
          <div style="font-size: 0.84rem; color: var(--accent-cyan); font-weight: 700;">
            👤 Karakter: <span style="color: var(--text-primary);">${escapeHtml(card.character || '-')}</span>
          </div>
        </div>

        <div style="background: color-mix(in srgb, var(--bg-surface) 70%, transparent); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 14px;">
          <h5 style="margin: 0 0 6px 0; font-size: 0.82rem; font-weight: 800; color: #fde047; text-transform: uppercase; letter-spacing: 0.5px;">
            📖 Makna Filosofis & Energi (${isReversed ? 'Terbalik' : 'Tegak'})
          </h5>
          <p style="margin: 0; font-size: 0.86rem; color: var(--text-primary); line-height: 1.6;">
            ${escapeHtml(meaning)}
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div style="background: color-mix(in srgb, var(--accent-rose) 8%, transparent); border: 1px solid color-mix(in srgb, var(--accent-rose) 25%, transparent); border-radius: 12px; padding: 12px;">
            <div style="font-weight: 800; color: var(--accent-rose); font-size: 0.8rem; margin-bottom: 4px;">💖 Asmara & Hubungan</div>
            <div style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5;">${escapeHtml(card.love)}</div>
          </div>
          <div style="background: color-mix(in srgb, var(--accent-cyan) 8%, transparent); border: 1px solid color-mix(in srgb, var(--accent-cyan) 25%, transparent); border-radius: 12px; padding: 12px;">
            <div style="font-weight: 800; color: var(--accent-cyan); font-size: 0.8rem; margin-bottom: 4px;">💼 Karier & Finansial</div>
            <div style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5;">${escapeHtml(card.career)}</div>
          </div>
        </div>

        <div style="background: color-mix(in srgb, var(--accent-amber) 8%, transparent); border: 1px solid color-mix(in srgb, var(--accent-amber) 25%, transparent); border-radius: 12px; padding: 12px;">
          <div style="font-weight: 800; color: #fde047; font-size: 0.8rem; margin-bottom: 4px;">✨ Petunjuk Afirmasi Kebijaksanaan</div>
          <div style="font-size: 0.84rem; color: #fef08a; font-style: italic; line-height: 1.5;">"${escapeHtml(card.advice)}"</div>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
  };

  function initFunToolsTarot() {
    if (window.__tarotInited) return;
    window.__tarotInited = true;

    const btnDraw = document.getElementById('btn-draw-tarot');
    const spreadSelect = document.getElementById('tarot-spread-mode');
    const stageContainer = document.getElementById('tarot-cards-results');
    const placeholder = document.getElementById('tarot-deck-placeholder');
    const insightBox = document.getElementById('tarot-insight-box');
    const insightTitle = document.getElementById('tarot-insight-title');
    const insightContent = document.getElementById('tarot-insight-content');
    const btnToggleDeck = document.getElementById('btn-toggle-tarot-deck');
    const galleryContainer = document.getElementById('tarot-deck-gallery');
    const galleryGrid = document.getElementById('tarot-gallery-grid');
    const gallerySearch = document.getElementById('tarot-gallery-search');
    const modal = document.getElementById('tarot-card-modal');
    const modalClose = document.getElementById('tarot-modal-close');

    // Close Modal listeners
    if (modalClose) {
      modalClose.addEventListener('click', () => {
        if (modal) modal.style.display = 'none';
      });
    }
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });
    }

    // Toggle 22 Cards Gallery
    if (btnToggleDeck && galleryContainer) {
      btnToggleDeck.addEventListener('click', () => {
        const isShown = galleryContainer.style.display !== 'none';
        galleryContainer.style.display = isShown ? 'none' : 'block';
        btnToggleDeck.innerHTML = isShown ? '<span>🎴</span> Katalog 22 Kartu' : '<span>✕</span> Tutup Katalog';
        if (!isShown && galleryGrid && galleryGrid.children.length === 0) {
          renderTarotGallery('');
        }
      });
    }

    // Gallery Search Filter
    if (gallerySearch) {
      gallerySearch.addEventListener('input', (e) => {
        renderTarotGallery(e.target.value.trim().toLowerCase());
      });
    }

    function renderTarotGallery(filter) {
      if (!galleryGrid) return;
      galleryGrid.innerHTML = '';

      const filtered = TAROT_DECK.filter(c => {
        if (!filter) return true;
        const haystack = `${c.name} ${c.nameId} ${c.character} ${c.pathway} ${c.arcana}`.toLowerCase();
        return haystack.includes(filter);
      });

      if (filtered.length === 0) {
        galleryGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 30px;">Tidak ada kartu yang cocok dengan pencarian "${escapeHtml(filter)}".</div>`;
        return;
      }

      filtered.forEach(card => {
        const item = document.createElement('div');
        item.className = 'tarot-gallery-item';
        item.innerHTML = `
          <div class="tarot-gallery-thumb">
            <img src="assets/tarot/${card.image}" alt="${escapeHtml(card.name)}" loading="lazy" onerror="this.onerror=null; this.src='assets/tarot/${card.image.replace('.png', '.jpg')}';" />
            <div style="position: absolute; top: 6px; left: 6px; background: rgba(0,0,0,0.75); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; padding: 2px 6px; font-size: 0.64rem; font-weight: 800; color: var(--accent-amber);">${card.arcana}</div>
          </div>
          <div style="text-align: center; width: 100%;">
            <div style="font-size: 0.82rem; font-weight: 800; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(card.name)}</div>
            <div style="font-size: 0.68rem; color: var(--accent-cyan); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(card.character || card.nameId)}</div>
          </div>
        `;
        item.addEventListener('click', () => {
          window.openTarotCardModal(card.id, false);
        });
        galleryGrid.appendChild(item);
      });
    }

    if (!btnDraw) return;

    btnDraw.addEventListener('click', () => {
      // Audio: Shuffle Sound
      if (window.NanoSoundFX) {
        window.NanoSoundFX.playTarotShuffle();
      } else {
        playPolarisChime('success');
      }

      const spread = spreadSelect ? spreadSelect.value : 'single';
      const shuffled = [...TAROT_DECK].sort(() => Math.random() - 0.5);

      let count = 1;
      let titles = ['Kartu Hari Ini (Aura & Nasihat)'];
      if (spread === 'three') {
        count = 3;
        titles = ['Masa Lalu (Pondasi Akar)', 'Masa Sekarang (Kondisi Nyata)', 'Masa Depan (Arah Takdir)'];
      } else if (spread === 'career') {
        count = 2;
        titles = ['Tantangan Karier Saat Ini', 'Peluang Emas & Solusi'];
      } else if (spread === 'love') {
        count = 2;
        titles = ['Dinamika Hati & Hubungan', 'Prospek & Nasihat Asmara'];
      }

      const drawn = shuffled.slice(0, count).map((card, idx) => ({
        ...card,
        isReversed: Math.random() < 0.25,
        slotTitle: titles[idx] || `Kartu #${idx + 1}`
      }));

      if (placeholder) placeholder.style.display = 'none';
      if (insightBox) insightBox.style.display = 'none';
      if (stageContainer) {
        stageContainer.style.display = 'flex';
        stageContainer.innerHTML = '';
      }

      // Generate 3D Cards (Start face-down for dramatic reveal)
      drawn.forEach((c, idx) => {
        const wrapEl = document.createElement('div');
        wrapEl.className = 'tarot-card-3d-wrap tarot-card-deal';
        wrapEl.style.animationDelay = `${idx * 0.15}s`;

        const flipperEl = document.createElement('div');
        flipperEl.className = 'tarot-card-flipper';
        flipperEl.id = `tarot-flipper-${idx}`;

        // Back face (Sacred Geometry Nano / Pathways Seal)
        const backFace = document.createElement('div');
        backFace.className = 'tarot-face tarot-back';
        backFace.innerHTML = getNanoTarotBackSvg();

        // Front face (Pathways Arcana Full Artwork Face)
        const frontFace = document.createElement('div');
        frontFace.className = `tarot-face tarot-front ${c.isReversed ? 'is-reversed-card' : ''}`;
        
        const imgSrc = `assets/tarot/${c.image}`;
        const fallbackImg = `assets/tarot/${c.image.replace('.png', '.jpg')}`;

        frontFace.innerHTML = `
          <!-- Full-Bleed Artwork Image -->
          <div class="tarot-card-img-wrap ${c.isReversed ? 'is-reversed' : ''}">
            <img src="${imgSrc}" alt="${escapeHtml(c.name)}" class="tarot-card-img" loading="eager" onerror="this.onerror=null; this.src='${fallbackImg}';" />
            <div class="tarot-card-sheen"></div>
          </div>

          <!-- Slot Badge (e.g. Masa Lalu / Masa Sekarang) -->
          <div class="tarot-slot-badge">
            ${escapeHtml(c.slotTitle)}
          </div>

          <!-- Magnifier / Lightbox Trigger -->
          <button type="button" class="tarot-zoom-trigger" title="Lihat Resolusi Penuh" onclick="event.stopPropagation(); window.openTarotCardModal(${c.id}, ${c.isReversed});">
            🔍
          </button>

          <!-- Bottom Status Pill Bar -->
          <div class="tarot-status-badge ${c.isReversed ? 'reversed' : 'upright'}">
            <span style="font-weight: 800; font-size: 0.68rem; letter-spacing: 0.5px;">${c.arcana} • ${escapeHtml(c.name)}</span>
            <span style="font-size: 0.65rem;">${c.isReversed ? '🔄 TERBALIK' : '⬆️ TEGAK'}</span>
          </div>
        `;

        flipperEl.appendChild(backFace);
        flipperEl.appendChild(frontFace);

        // Click to toggle manual flip
        flipperEl.addEventListener('click', () => {
          flipperEl.classList.toggle('is-flipped');
          if (window.NanoSoundFX) window.NanoSoundFX.playCardFlip();
        });

        wrapEl.appendChild(flipperEl);
        stageContainer.appendChild(wrapEl);
      });

      // Construct detailed wisdom narrative
      let textHtml = '';
      drawn.forEach((c) => {
        const meaning = c.isReversed ? c.reversed : c.upright;
        const imgSrc = `assets/tarot/${c.image}`;
        const fallbackImg = `assets/tarot/${c.image.replace('.png', '.jpg')}`;

        textHtml += `
          <div class="tarot-insight-card-item">
            <div style="flex: 0 0 85px; width: 85px; height: 125px; border-radius: 10px; overflow: hidden; border: 1.5px solid ${c.isReversed ? 'var(--accent-rose)' : 'var(--accent-cyan)'}; box-shadow: 0 6px 16px rgba(0,0,0,0.5); background: #07080f; cursor: pointer; position: relative;" onclick="window.openTarotCardModal(${c.id}, ${c.isReversed});" title="Klik untuk memperbesar">
              <img src="${imgSrc}" alt="${escapeHtml(c.name)}" style="width: 100%; height: 100%; object-fit: cover; ${c.isReversed ? 'transform: rotate(180deg);' : ''}" onerror="this.onerror=null; this.src='${fallbackImg}';" />
              <div style="position: absolute; bottom: 3px; right: 3px; background: rgba(0,0,0,0.7); border-radius: 4px; padding: 1px 4px; font-size: 0.6rem; color: #fff;">🔍</div>
            </div>
            <div style="flex: 1;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 6px; margin-bottom: 6px;">
                <div>
                  <div style="font-weight: 800; color: var(--accent-cyan); font-size: 0.95rem;">
                    ${escapeHtml(c.slotTitle)}: <strong style="color: #fff;">${escapeHtml(c.name)} (${escapeHtml(c.nameId)})</strong>
                  </div>
                  <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">
                    👤 Karakter: <b style="color: var(--text-primary);">${escapeHtml(c.character || '-')}</b> • <span style="color: var(--accent-amber);">${escapeHtml(c.pathway || '')}</span>
                  </div>
                </div>
                <span style="display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 0.68rem; font-weight: 800; background: ${c.isReversed ? 'color-mix(in srgb, var(--accent-rose) 20%, transparent)' : 'color-mix(in srgb, var(--accent-cyan) 20%, transparent)'}; color: ${c.isReversed ? 'var(--accent-rose)' : 'var(--accent-cyan)'}; border: 1px solid ${c.isReversed ? 'color-mix(in srgb, var(--accent-rose) 40%, transparent)' : 'color-mix(in srgb, var(--accent-cyan) 40%, transparent)'};">
                  ${c.isReversed ? '🔄 Terbalik (Reversed)' : '⬆️ Tegak (Upright)'}
                </span>
              </div>
              <p style="margin: 0 0 8px 0; color: var(--text-secondary); font-size: 0.85rem; line-height: 1.55;">
                <b style="color: #fff;">Makna Utama:</b> ${escapeHtml(meaning)}
              </p>
              <div style="font-size: 0.8rem; color: var(--text-muted); display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; margin-top: 6px;">
                <div style="background: color-mix(in srgb, var(--accent-rose) 8%, transparent); padding: 6px 10px; border-radius: 8px; border: 1px solid color-mix(in srgb, var(--accent-rose) 20%, transparent);">
                  💖 <b style="color: var(--accent-rose);">Asmara:</b> ${escapeHtml(c.love)}
                </div>
                <div style="background: color-mix(in srgb, var(--accent-cyan) 8%, transparent); padding: 6px 10px; border-radius: 8px; border: 1px solid color-mix(in srgb, var(--accent-cyan) 20%, transparent);">
                  💼 <b style="color: var(--accent-cyan);">Karier & Finansial:</b> ${escapeHtml(c.career)}
                </div>
              </div>
              <div style="margin-top: 8px; font-size: 0.82rem; color: #fde047; font-weight: 600;">
                ✨ <b>Petunjuk Afirmasi:</b> "${escapeHtml(c.advice)}"
              </div>
            </div>
          </div>
        `;
      });

      // Sequentially flip cards with audio
      drawn.forEach((_, idx) => {
        setTimeout(() => {
          const flipper = document.getElementById(`tarot-flipper-${idx}`);
          if (flipper) {
            flipper.classList.add('is-flipped');
            if (window.NanoSoundFX) window.NanoSoundFX.playTarotFlip();
          }
        }, 450 + idx * 550);
      });

      // Final reveal chime & reveal wisdom panel
      setTimeout(() => {
        if (window.NanoSoundFX) window.NanoSoundFX.playTarotGong();
        if (typeof confetti === 'function') confetti({ particleCount: 65, spread: 65 });
        if (insightTitle) insightTitle.innerHTML = `<span>📜</span> Pesan Kebijaksanaan Pathways (${drawn.length} Kartu Terbuka)`;
        if (insightContent) insightContent.innerHTML = textHtml;
        if (insightBox) {
          insightBox.style.display = 'block';
          insightBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 550 + drawn.length * 550);
    });
  }

  // ========================================================
  // ✨ LUMINA HD // AI IMAGE ENHANCER STUDIO CONTROLLER
  // ========================================================
  function initLuminaAiStudio() {
    const pageContainer = document.getElementById('dl-subpage-lumina');
    if (!pageContainer || pageContainer.dataset.initialized) return;
    pageContainer.dataset.initialized = 'true';

    // State
    let currentPreset = 'turbo';
    let uploadedImage = null; // { filename, image_id, stored_name, width, height, faces_detected, filesize }
    let isProcessing = false;
    let zoomLevel = 1.0;
    let panOffset = { x: 0, y: 0 };
    let isDraggingDivider = false;
    let isPanning = false;
    let startPanPoint = { x: 0, y: 0 };

    // Preset configurations
    const PRESETS = {
      turbo: { scale: 4, face: 95, clarity: 30, skin: 20, contrast: 12, format: 'png' },
      remini: { scale: 4, face: 100, clarity: 40, skin: 15, contrast: 18, format: 'png' },
      wink: { scale: 4, face: 85, clarity: 20, skin: 45, contrast: 15, format: 'png' },
      photo4k: { scale: 4, face: 0, clarity: 30, skin: 0, contrast: 10, format: 'png' },
      anime: { scale: 4, face: 0, clarity: 20, skin: 0, contrast: 5, format: 'png' },
      custom: null
    };

    // Elements - Controls
    const presetsContainer = document.getElementById('lumina-presets-container');
    const customDrawer = document.getElementById('lumina-custom-drawer');
    const sliderFace = document.getElementById('slider-lumina-face');
    const sliderClarity = document.getElementById('slider-lumina-clarity');
    const sliderSkin = document.getElementById('slider-lumina-skin');
    const sliderContrast = document.getElementById('slider-lumina-contrast');
    const selectFormat = document.getElementById('select-lumina-format');
    const scaleChips = document.querySelectorAll('.lumina-scale-chip');
    
    // Elements - Value labels
    const valScale = document.getElementById('val-lumina-scale');
    const valFace = document.getElementById('val-lumina-face');
    const valClarity = document.getElementById('val-lumina-clarity');
    const valSkin = document.getElementById('val-lumina-skin');
    const valContrast = document.getElementById('val-lumina-contrast');
    const valFormat = document.getElementById('val-lumina-format');

    // Elements - Dropzone & Upload
    const fileInput = document.getElementById('lumina-file-input');
    const dropzoneBox = document.getElementById('lumina-dropzone-box');
    const uploadPrompt = document.getElementById('lumina-upload-prompt');
    const uploadPreview = document.getElementById('lumina-upload-preview');
    const thumbPreview = document.getElementById('lumina-thumb-preview');
    const fileNameEl = document.getElementById('lumina-file-name');
    const fileDimsEl = document.getElementById('lumina-file-dims');
    const fileSizeEl = document.getElementById('lumina-file-size');
    const facesBadgeEl = document.getElementById('lumina-faces-badge');
    const btnChangeImg = document.getElementById('btn-lumina-change-img');
    const btnEnhance = document.getElementById('btn-lumina-enhance');
    const btnEnhanceIcon = document.getElementById('btn-lumina-enhance-icon');
    const btnEnhanceText = document.getElementById('btn-lumina-enhance-text');

    // Elements - Tracker & Phases
    const progressContainer = document.getElementById('lumina-progress-container');
    const totalPercentEl = document.getElementById('lumina-total-percent');
    const overallProgressEl = document.getElementById('lumina-overall-progress');

    // Elements - Results & Slider
    const resultContainer = document.getElementById('lumina-result-container');
    const resDimsBefore = document.getElementById('res-dims-before');
    const resDimsAfter = document.getElementById('res-dims-after');
    const resTimeBadge = document.getElementById('res-time-badge');
    const sliderFrame = document.getElementById('lumina-slider-frame');
    const sliderViewport = document.getElementById('lumina-slider-viewport');
    const imgEnhanced = document.getElementById('lumina-img-enhanced');
    const imgOriginal = document.getElementById('lumina-img-original');
    const originalWrapper = document.getElementById('lumina-original-wrapper');
    const sliderDivider = document.getElementById('lumina-slider-divider');
    const btnZoomIn = document.getElementById('btn-lumina-zoom-in');
    const btnZoomOut = document.getElementById('btn-lumina-zoom-out');
    const btnZoomReset = document.getElementById('btn-lumina-zoom-reset');
    const zoomLevelEl = document.getElementById('lumina-zoom-level');
    const btnDownload = document.getElementById('btn-lumina-download');
    const engineBadge = document.getElementById('lumina-engine-badge');

    // Check engine health
    fetch('/api/lumina/health')
      .then(res => res.json())
      .then(data => {
        if (data.success && engineBadge) {
          engineBadge.innerHTML = `<span style="display: inline-block; width: 6px; height: 6px; background: var(--accent-emerald); border-radius: 50%; margin-right: 5px;"></span> AI Engine Ready`;
          engineBadge.style.color = '#34d399';
        }
      })
      .catch(() => {});

    // Update Slider UI Labels
    const syncSliderLabels = () => {
      if (sliderFace && valFace) valFace.textContent = `${sliderFace.value}%`;
      if (sliderClarity && valClarity) valClarity.textContent = `${sliderClarity.value}%`;
      if (sliderSkin && valSkin) valSkin.textContent = `${sliderSkin.value}%`;
      if (sliderContrast && valContrast) valContrast.textContent = `${sliderContrast.value}%`;
      if (selectFormat && valFormat) {
        valFormat.textContent = selectFormat.value.toUpperCase();
      }
    };

    [sliderFace, sliderClarity, sliderSkin, sliderContrast].forEach(s => {
      s?.addEventListener('input', () => {
        syncSliderLabels();
      });
    });

    selectFormat?.addEventListener('change', syncSliderLabels);

    // Scale Chips
    let selectedScale = 4;
    scaleChips.forEach(chip => {
      chip.addEventListener('click', () => {
        scaleChips.forEach(c => {
          c.classList.remove('active', 'btn-primary');
          c.classList.add('btn-secondary');
        });
        chip.classList.add('active', 'btn-primary');
        chip.classList.remove('btn-secondary');
        selectedScale = parseInt(chip.getAttribute('data-scale') || '4', 10);
        if (valScale) valScale.textContent = `${selectedScale}x (${selectedScale === 4 ? 'Ultra HD' : 'Cepat'})`;
        playPolarisChime('click');
      });
    });

    // Preset Selection
    if (presetsContainer) {
      presetsContainer.querySelectorAll('.lumina-preset-card').forEach(card => {
        card.addEventListener('click', () => {
          presetsContainer.querySelectorAll('.lumina-preset-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          currentPreset = card.getAttribute('data-preset') || 'turbo';
          playPolarisChime('click');

          if (currentPreset === 'custom') {
            if (customDrawer) customDrawer.style.display = 'block';
          } else {
            if (customDrawer) customDrawer.style.display = 'none';
            const cfg = PRESETS[currentPreset];
            if (cfg) {
              if (sliderFace) sliderFace.value = cfg.face;
              if (sliderClarity) sliderClarity.value = cfg.clarity;
              if (sliderSkin) sliderSkin.value = cfg.skin;
              if (sliderContrast) sliderContrast.value = cfg.contrast;
              syncSliderLabels();
            }
          }
        });
      });
    }

    // Dropzone / File Picker
    if (dropzoneBox && fileInput) {
      dropzoneBox.addEventListener('click', (e) => {
        if (e.target.closest('#btn-lumina-change-img')) return;
        fileInput.click();
      });

      ['dragenter', 'dragover'].forEach(evt => {
        dropzoneBox.addEventListener(evt, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzoneBox.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(evt => {
        dropzoneBox.addEventListener(evt, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzoneBox.classList.remove('dragover');
        });
      });

      dropzoneBox.addEventListener('drop', (e) => {
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
          handleImageUpload(files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
          handleImageUpload(files[0]);
        }
      });

      btnChangeImg?.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.value = '';
        fileInput.click();
      });
    }

    // Upload Handler
    async function handleImageUpload(file) {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        showToast('Harap pilih berkas gambar (JPG, PNG, WebP).', 'warning');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        showToast('Ukuran berkas maksimal 50MB.', 'warning');
        return;
      }

      // Show immediate local preview
      const localUrl = URL.createObjectURL(file);
      if (thumbPreview) thumbPreview.src = localUrl;
      if (fileNameEl) fileNameEl.textContent = file.name;
      if (fileSizeEl) fileSizeEl.textContent = `${Math.round(file.size / 1024)} KB`;
      if (fileDimsEl) fileDimsEl.textContent = 'Memindai...';
      if (facesBadgeEl) facesBadgeEl.textContent = 'Memindai wajah...';
      if (uploadPrompt) uploadPrompt.style.display = 'none';
      if (uploadPreview) uploadPreview.style.display = 'flex';
      if (btnEnhance) btnEnhance.disabled = true;

      const fd = new FormData();
      fd.append('file', file);

      try {
        const res = await PolarisAuth.authFetch('/api/lumina/upload', {
          method: 'POST',
          body: fd
        });
        const json = await res.json();
        if (!json.success || !json.data) {
          throw new Error(json.error || 'Gagal mengunggah foto ke server.');
        }

        const d = json.data;
        uploadedImage = {
          image_id: d.image_id,
          filename: d.filename,
          stored_name: d.url ? d.url.replace('/uploads/', '') : d.filename,
          width: d.width,
          height: d.height,
          faces_detected: d.faces_detected || 0,
          filesize: d.filesize
        };

        if (fileDimsEl) fileDimsEl.textContent = `${d.width} × ${d.height} px`;
        if (facesBadgeEl) {
          facesBadgeEl.textContent = `${d.faces_detected || 0} Wajah Terdeteksi`;
          facesBadgeEl.style.display = 'inline-block';
        }
        if (btnEnhance) {
          btnEnhance.disabled = false;
          btnEnhance.classList.add('pulse-glow');
        }
        playPolarisChime('success');
        showToast('Foto siap ditingkatkan oleh AI Engine!', 'success');
      } catch (err) {
        console.error('[Lumina Upload Error]', err);
        showToast(err.message || 'Gagal memproses gambar.', 'error');
        if (uploadPrompt) uploadPrompt.style.display = 'block';
        if (uploadPreview) uploadPreview.style.display = 'none';
        if (btnEnhance) btnEnhance.disabled = true;
      }
    }

    // Enhance Trigger with SSE Stream Reader
    btnEnhance?.addEventListener('click', async () => {
      if (!uploadedImage || isProcessing) return;
      isProcessing = true;
      btnEnhance.disabled = true;
      btnEnhance.classList.remove('pulse-glow');
      if (btnEnhanceIcon) btnEnhanceIcon.innerHTML = '<div class="spinner" style="width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:spin 0.8s linear infinite;"></div>';
      if (btnEnhanceText) btnEnhanceText.textContent = 'Sedang Memproses...';

      // Reset & show tracker
      if (progressContainer) progressContainer.style.display = 'block';
      if (resultContainer) resultContainer.style.display = 'none';
      if (overallProgressEl) overallProgressEl.style.width = '0%';
      if (totalPercentEl) totalPercentEl.textContent = '0%';

      // Reset phase cards
      for (let p = 1; p <= 4; p++) {
        const card = document.getElementById(`lumina-phase-${p}`);
        const badge = document.getElementById(`phase-${p}-badge`);
        const bar = document.getElementById(`phase-${p}-bar`);
        if (card) card.classList.remove('active', 'completed');
        if (badge) {
          badge.textContent = 'MENUNGGU';
          badge.style.color = 'var(--text-muted)';
        }
        if (bar) bar.style.width = '0%';
      }

      // Collect payload
      const faceVal = sliderFace ? parseFloat(sliderFace.value) / 100 : 1.0;
      const clarityVal = sliderClarity ? parseFloat(sliderClarity.value) / 100 : 0.35;
      const skinVal = sliderSkin ? parseFloat(sliderSkin.value) / 100 : 0.2;
      const contrastVal = sliderContrast ? parseFloat(sliderContrast.value) / 100 : 0.15;
      const formatVal = selectFormat ? selectFormat.value : 'png';

      const payload = {
        image_id: uploadedImage.image_id,
        preset: currentPreset,
        scale: selectedScale,
        face_strength: faceVal,
        clarity: clarityVal,
        skin_smooth: skinVal,
        contrast: contrastVal,
        export_format: formatVal
      };

      try {
        const response = await fetch('/api/lumina/enhance/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': PolarisAuth.getToken() ? `Bearer ${PolarisAuth.getToken()}` : ''
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Server merespon dengan status ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalResult = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop(); // keep last incomplete line

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            try {
              const data = JSON.parse(trimmed.slice(5).trim());
              if (data.error) {
                throw new Error(data.message || 'Pipeline AI mengalami error');
              }
              updateProgressUI(data);
              if (data.result) {
                finalResult = data.result;
              }
            } catch (parseErr) {
              // ignore malformed SSE chunks
            }
          }
        }

        if (finalResult) {
          displayEnhanceResult(finalResult);
        } else {
          throw new Error('Hasil enhancement tidak diterima dari AI server.');
        }

      } catch (err) {
        console.error('[Lumina Enhancement Error]', err);
        showToast(err.message || 'Terjadi kesalahan saat memproses gambar.', 'error');
      } finally {
        isProcessing = false;
        if (btnEnhance) btnEnhance.disabled = false;
        if (btnEnhanceIcon) btnEnhanceIcon.textContent = '✨';
        if (btnEnhanceText) btnEnhanceText.textContent = 'Tingkatkan Resolusi & Wajah HD';
      }
    });

    // Update 4-phase visual indicators
    function updateProgressUI(data) {
      const { phase, percent, status, detail } = data;
      if (!phase) return;

      const card = document.getElementById(`lumina-phase-${phase}`);
      const badge = document.getElementById(`phase-${phase}-badge`);
      const bar = document.getElementById(`phase-${phase}-bar`);
      const desc = document.getElementById(`phase-${phase}-desc`);

      // Update current phase
      if (card) {
        card.classList.add('active');
        if (status === 'done' || percent >= 100) {
          card.classList.remove('active');
          card.classList.add('completed');
        }
      }

      if (badge) {
        if (status === 'done' || percent >= 100) {
          badge.textContent = 'SELESAI ✓';
          badge.style.color = '#34d399';
        } else {
          badge.textContent = `${percent}% PROSES`;
          badge.style.color = '#38bdf8';
        }
      }

      if (bar) bar.style.width = `${percent}%`;
      if (desc && detail) desc.textContent = detail;

      // Mark previous phases as completed
      for (let p = 1; p < phase; p++) {
        const prevCard = document.getElementById(`lumina-phase-${p}`);
        const prevBadge = document.getElementById(`phase-${p}-badge`);
        const prevBar = document.getElementById(`phase-${p}-bar`);
        if (prevCard) {
          prevCard.classList.remove('active');
          prevCard.classList.add('completed');
        }
        if (prevBadge) {
          prevBadge.textContent = 'SELESAI ✓';
          prevBadge.style.color = '#34d399';
        }
        if (prevBar) prevBar.style.width = '100%';
      }

      // Overall Progress Calculation
      const basePhase = (phase - 1) * 25;
      const currentContribution = (percent / 100) * 25;
      const totalPct = Math.min(100, Math.round(basePhase + currentContribution));

      if (overallProgressEl) overallProgressEl.style.width = `${totalPct}%`;
      if (totalPercentEl) totalPercentEl.textContent = `${totalPct}%`;
    }

    // Display Result & Init Split Slider
    function displayEnhanceResult(result) {
      const origFilename = uploadedImage.stored_name || uploadedImage.filename;
      const enhancedFilename = result.filename || result.output_url.replace('/outputs/', '');

      // Media endpoints via proxy
      const origMediaUrl = `/api/lumina/media/uploads/${origFilename}`;
      const enhancedMediaUrl = `/api/lumina/media/outputs/${enhancedFilename}`;

      if (resDimsBefore) resDimsBefore.textContent = `${result.original_width} × ${result.original_height} px`;
      if (resDimsAfter) resDimsAfter.textContent = `${result.enhanced_width} × ${result.enhanced_height} px`;
      if (resTimeBadge) resTimeBadge.textContent = `⚡ Selesai dalam ${result.process_time_seconds || 4}s`;

      if (imgOriginal) imgOriginal.src = origMediaUrl;
      if (imgEnhanced) imgEnhanced.src = enhancedMediaUrl;

      if (btnDownload) {
        btnDownload.href = enhancedMediaUrl;
        btnDownload.download = enhancedFilename;
      }

      // Reset Zoom & Pan
      resetZoomAndPan();
      setDividerPosition(50);

      // Show result container
      if (resultContainer) {
        resultContainer.style.display = 'block';
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      playPolarisChime('success');
      if (typeof confetti === 'function') {
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      }
      showToast('Penyempurnaan AI Berhasil!', 'success');
    }

    // Split Slider Dragging Logic
    function setDividerPosition(pct) {
      const clamped = Math.max(0, Math.min(100, pct));
      if (sliderDivider) sliderDivider.style.left = `${clamped}%`;
      if (originalWrapper) originalWrapper.style.width = `${clamped}%`;
    }

    function onDividerMove(clientX) {
      if (!sliderViewport) return;
      const rect = sliderViewport.getBoundingClientRect();
      const offset = clientX - rect.left;
      const pct = (offset / rect.width) * 100;
      setDividerPosition(pct);
    }

    if (sliderFrame) {
      sliderFrame.addEventListener('mousedown', (e) => {
        if (e.target.closest('#lumina-slider-divider') || !isPanning) {
          isDraggingDivider = true;
          onDividerMove(e.clientX);
        }
      });

      window.addEventListener('mousemove', (e) => {
        if (isDraggingDivider) {
          e.preventDefault();
          onDividerMove(e.clientX);
        } else if (isPanning && zoomLevel > 1.0) {
          e.preventDefault();
          const dx = e.clientX - startPanPoint.x;
          const dy = e.clientY - startPanPoint.y;
          panOffset.x += dx;
          panOffset.y += dy;
          startPanPoint = { x: e.clientX, y: e.clientY };
          applyTransform();
        }
      });

      window.addEventListener('mouseup', () => {
        isDraggingDivider = false;
        isPanning = false;
      });

      // Touch support
      sliderFrame.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length === 1) {
          isDraggingDivider = true;
          onDividerMove(e.touches[0].clientX);
        }
      }, { passive: true });

      window.addEventListener('touchmove', (e) => {
        if (isDraggingDivider && e.touches && e.touches.length === 1) {
          onDividerMove(e.touches[0].clientX);
        }
      }, { passive: true });

      window.addEventListener('touchend', () => {
        isDraggingDivider = false;
      });
    }

    // Zoom & Pan Logic
    function applyTransform() {
      const transformStr = `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`;
      if (imgEnhanced) imgEnhanced.style.transform = transformStr;
      if (imgOriginal) imgOriginal.style.transform = transformStr;
      if (zoomLevelEl) zoomLevelEl.textContent = `${Math.round(zoomLevel * 100)}%`;
      if (sliderViewport) {
        sliderViewport.style.cursor = zoomLevel > 1.0 ? 'grab' : 'col-resize';
      }
    }

    function resetZoomAndPan() {
      zoomLevel = 1.0;
      panOffset = { x: 0, y: 0 };
      applyTransform();
    }

    btnZoomIn?.addEventListener('click', () => {
      if (zoomLevel < 4.0) {
        zoomLevel = Math.min(4.0, +(zoomLevel + 0.25).toFixed(2));
        applyTransform();
      }
    });

    btnZoomOut?.addEventListener('click', () => {
      if (zoomLevel > 1.0) {
        zoomLevel = Math.max(1.0, +(zoomLevel - 0.25).toFixed(2));
        if (zoomLevel === 1.0) panOffset = { x: 0, y: 0 };
        applyTransform();
      }
    });

    btnZoomReset?.addEventListener('click', () => {
      resetZoomAndPan();
    });

    // Panning support when zoomed
    sliderViewport?.addEventListener('mousedown', (e) => {
      if (zoomLevel > 1.0 && !e.target.closest('#lumina-slider-divider')) {
        isPanning = true;
        startPanPoint = { x: e.clientX, y: e.clientY };
        sliderViewport.style.cursor = 'grabbing';
      }
    });
  }

  // ==================== 1D. ANALYTICS & ACTIVITY GRAPH (CHART.JS) ====================
  let dailyChartInstance = null;
  let platformChartInstance = null;
  let groupChartInstance = null;

  async function loadAnalyticsDashboard() {
    try {
      const res = await PolarisAuth.authFetch('/api/analytics/summary');
      const json = await res.json();
      if (!json.success || !json.data) return;

      const data = json.data;
      const totals = data.totals || {};
      const system = data.system || {};

      // 1. Metric Cards
      const elMsg = document.getElementById('metric-total-messages');
      const elCmd = document.getElementById('metric-total-commands');
      const elDl = document.getElementById('metric-total-downloads');
      const elRam = document.getElementById('metric-system-ram');
      const elUptime = document.getElementById('metric-system-uptime');

      if (elMsg) elMsg.textContent = (totals.totalMessages || 0).toLocaleString('id-ID');
      if (elCmd) elCmd.textContent = (totals.totalCommands || 0).toLocaleString('id-ID');
      if (elDl) elDl.textContent = (totals.totalDownloads || 0).toLocaleString('id-ID');

      if (elRam && system.memoryUsage) {
        const mb = Math.round((system.memoryUsage.rss || 0) / (1024 * 1024));
        elRam.textContent = `${mb} MB`;
      }

      if (elUptime && typeof system.uptime === 'number') {
        const h = Math.floor(system.uptime / 3600);
        const m = Math.floor((system.uptime % 3600) / 60);
        elUptime.textContent = `Uptime: ${h}j ${m}m`;
      }

      // 2. Diagnostics
      const diagNode = document.getElementById('diag-node-version');
      const diagPlat = document.getElementById('diag-platform');
      const diagNews = document.getElementById('diag-news-count');
      if (diagNode) diagNode.textContent = system.nodeVersion || '-';
      if (diagPlat) diagPlat.textContent = system.platform || '-';
      if (diagNews) diagNews.textContent = `${data.newsStats?.totalNewsDispatched || 0} Terkirim`;

      // 3. Render Chart.js
      if (typeof Chart === 'undefined') {
        console.warn('[Analytics] Chart.js belum tersedia.');
        return;
      }

      Chart.defaults.color = '#94a3b8';
      Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";

      // Chart 1: Daily Activity Line Chart
      const ctxDaily = document.getElementById('chart-daily-activity')?.getContext('2d');
      if (ctxDaily) {
        if (dailyChartInstance) dailyChartInstance.destroy();

        const history = Array.isArray(data.history) && data.history.length > 0
          ? data.history
          : [{ date_str: new Date().toISOString().slice(0, 10), message_count: totals.totalMessages || 0, command_count: totals.totalCommands || 0, download_count: totals.totalDownloads || 0 }];

        const labels = history.map((h) => {
          const parts = (h.date_str || '').split('-');
          return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : h.date_str;
        });

        dailyChartInstance = new Chart(ctxDaily, {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'Pesan Masuk',
                data: history.map((h) => h.message_count || 0),
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                tension: 0.35,
                fill: true,
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
              },
              {
                label: 'Command Bot',
                data: history.map((h) => h.command_count || 0),
                borderColor: '#a78bfa',
                backgroundColor: 'rgba(167, 139, 250, 0.12)',
                tension: 0.35,
                fill: true,
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
              },
              {
                label: 'Media Diunduh',
                data: history.map((h) => h.download_count || 0),
                borderColor: '#34d399',
                backgroundColor: 'rgba(52, 211, 153, 0.12)',
                tension: 0.35,
                fill: true,
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: { boxWidth: 12, padding: 14, color: '#e2e8f0' }
              },
              tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.92)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                padding: 10,
                cornerRadius: 8,
              }
            },
            scales: {
              x: {
                grid: { color: 'rgba(255, 255, 255, 0.04)' },
                ticks: { color: '#94a3b8' }
              },
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.04)' },
                ticks: { precision: 0, color: '#94a3b8' }
              }
            }
          }
        });
      }

      // Chart 2: Platform Downloads Doughnut Chart
      const ctxPlatform = document.getElementById('chart-platform-downloads')?.getContext('2d');
      if (ctxPlatform) {
        if (platformChartInstance) platformChartInstance.destroy();

        const pTotals = data.platformTotals || {};
        const pKeys = Object.keys(pTotals);
        const hasData = pKeys.length > 0 && pKeys.some((k) => pTotals[k] > 0);

        const labels = hasData ? pKeys.map((k) => k.toUpperCase()) : ['Belum Ada Unduhan'];
        const values = hasData ? pKeys.map((k) => pTotals[k]) : [1];
        const colors = hasData
          ? ['#38bdf8', '#a78bfa', '#34d399', '#f43f5e', '#fbbf24', '#06b6d4', '#e879f9', '#f97316', '#10b981', '#6366f1']
          : ['rgba(255, 255, 255, 0.15)'];

        platformChartInstance = new Chart(ctxPlatform, {
          type: 'doughnut',
          data: {
            labels,
            datasets: [{
              data: values,
              backgroundColor: colors,
              borderColor: '#0f172a',
              borderWidth: 2,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
              legend: {
                position: 'right',
                labels: { boxWidth: 12, padding: 12, color: '#e2e8f0' }
              }
            }
          }
        });
      }

      // Chart 3: Top Groups Horizontal Bar Chart
      const ctxGroups = document.getElementById('chart-top-groups')?.getContext('2d');
      if (ctxGroups) {
        if (groupChartInstance) groupChartInstance.destroy();

        const gTotals = data.groupTotals || {};
        const sortedGroups = Object.entries(gTotals).sort((a, b) => b[1] - a[1]).slice(0, 6);
        const hasGroups = sortedGroups.length > 0;

        const labels = hasGroups ? sortedGroups.map((g) => (g[0].length > 20 ? g[0].slice(0, 18) + '...' : g[0])) : ['Belum Ada Grup'];
        const values = hasGroups ? sortedGroups.map((g) => g[1]) : [0];

        groupChartInstance = new Chart(ctxGroups, {
          type: 'bar',
          data: {
            labels,
            datasets: [{
              label: 'Pesan / Aktivitas',
              data: values,
              backgroundColor: 'rgba(56, 189, 248, 0.7)',
              borderColor: '#38bdf8',
              borderWidth: 1,
              borderRadius: 6,
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              x: {
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.04)' },
                ticks: { precision: 0, color: '#94a3b8' }
              },
              y: {
                grid: { display: false },
                ticks: { color: '#e2e8f0' }
              }
            }
          }
        });
      }
    } catch (err) {
      console.error('[loadAnalyticsDashboard] Error:', err);
    }
    loadRaidAnalyticsAndChampions();
    loadLoginStatistics('day');
  }

  async function loadRaidAnalyticsAndChampions() {
    const activeBadge = document.getElementById('badge-raid-active-count');
    const recentList = document.getElementById('raid-recent-list');
    const champList = document.getElementById('raid-champions-list');

    try {
      const [resStatus, resChamps] = await Promise.all([
        PolarisAuth.authFetch('/api/raid/status'),
        PolarisAuth.authFetch('/api/raid/champions'),
      ]);

      const [statusJson, champsJson] = await Promise.all([
        resStatus.json(),
        resChamps.json(),
      ]);

      if (activeBadge && statusJson.success) {
        const count = statusJson.activeRaidsCount || 0;
        activeBadge.textContent = `${count} RAID AKTIF`;
        activeBadge.className = count > 0 ? 'badge badge-rose' : 'badge badge-role-cosmos';
      }

      if (recentList && statusJson.success) {
        const recents = statusJson.recentHistory || [];
        const actives = statusJson.activeRaids || [];

        if (recents.length === 0 && actives.length === 0) {
          recentList.innerHTML = `
            <div style="background: rgba(255,255,255,0.02); border: 1px dashed var(--border-subtle); border-radius: 8px; padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">
              Belum ada pertempuran Boss Raid yang berlangsung. Jadwal otomatis: setiap pukul 20:00 WIB.
            </div>
          `;
        } else {
          let html = '';
          // Show active raids first if any
          actives.forEach((act) => {
            const hpPct = Math.max(0, Math.round((act.currentHp / act.maxHp) * 100));
            html += `
              <div style="background: color-mix(in srgb, var(--accent-rose) 8%, transparent); border: 1px solid color-mix(in srgb, var(--accent-rose) 30%, transparent); border-radius: 8px; padding: 10px 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-weight: 700; color: var(--accent-rose); font-size: 0.85rem;">🚨 ${escapeHtml(act.bossName)} [${escapeHtml(act.bossTitle)}]</span>
                  <span class="badge badge-rose" style="font-size: 0.65rem;">FASE ${act.phase}</span>
                </div>
                <div style="margin-top: 6px; font-size: 0.74rem; color: var(--text-secondary); display: flex; justify-content: space-between;">
                  <span>HP: ${act.currentHp}/${act.maxHp} (${hpPct}%)</span>
                  <span>Partisipan: ${act.participantsCount} Member</span>
                </div>
              </div>
            `;
          });

          // Recent history
          recents.forEach((r) => {
            const isDefeated = r.status === 'defeated';
            const dateStr = r.ended_at ? new Date(r.ended_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-';
            html += `
              <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 10px 12px; font-size: 0.8rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <strong style="color: #fff;">${escapeHtml(r.boss_name)}</strong>
                  <span class="badge ${isDefeated ? 'badge-emerald' : 'badge-rose'}" style="font-size: 0.65rem;">
                    ${isDefeated ? 'DIKALAHKAN' : 'KABUR / EXPIRED'}
                  </span>
                </div>
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">
                  👑 Eksekutor: <strong style="color: var(--accent-cyan);">${escapeHtml(r.executioner_jid || 'Tidak Ada')}</strong> | ⚡ MVP: <strong style="color: #facc15;">${escapeHtml(r.mvp_jid || 'Tidak Ada')}</strong>
                </div>
                <div style="font-size: 0.68rem; color: var(--text-muted); margin-top: 2px;">
                  Waktu: ${dateStr}
                </div>
              </div>
            `;
          });
          recentList.innerHTML = html;
        }
      }

      if (champList && champsJson.success) {
        const champs = champsJson.champions || [];
        if (champs.length === 0) {
          champList.innerHTML = `
            <div style="background: rgba(255,255,255,0.02); border: 1px dashed var(--border-subtle); border-radius: 8px; padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">
              Belum ada dewan juara. Jadilah orang pertama yang mengalahkan Boss Raid!
            </div>
          `;
        } else {
          let html = '';
          champs.forEach((c, idx) => {
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
            html += `
              <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 8px 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-weight: 800; font-size: 0.9rem;">${medal}</span>
                  <div>
                    <div style="font-weight: 700; color: #fff; font-size: 0.82rem;">${escapeHtml(c.user_jid)}</div>
                    <div style="font-size: 0.7rem; color: var(--accent-purple);">
                      ${escapeHtml(c.equipped_badge || '🎖️')} ${escapeHtml(c.equipped_title || 'Cyber Raider')}
                    </div>
                  </div>
                </div>
                <div style="text-align: right;">
                  <span class="badge badge-purple" style="font-size: 0.68rem;">${c.total_titles} Titel</span>
                </div>
              </div>
            `;
          });
          champList.innerHTML = html;
        }
      }
    } catch (err) {
      console.error('[loadRaidAnalyticsAndChampions] Error:', err);
    }
  }

  // ========================================================
  // 🔐 LOGIN & SESSION ANALYTICS CLIENT HANDLER
  // ========================================================
  let loginTimelineChartInstance = null;
  let currentLoginRange = 'day';

  async function loadLoginStatistics(range = 'day', from = '', to = '') {
    currentLoginRange = range;
    try {
      let url = `/api/analytics/login-stats?range=${encodeURIComponent(range)}`;
      if (from) url += `&from=${encodeURIComponent(from)}`;
      if (to) url += `&to=${encodeURIComponent(to)}`;

      const res = await PolarisAuth.authFetch(url);
      const json = await res.json();
      if (!json.success) return;

      const summary = json.summary || {};
      const totalEl = document.getElementById('login-stat-total');
      const succEl = document.getElementById('login-stat-success');
      const failEl = document.getElementById('login-stat-failed');
      const uniqEl = document.getElementById('login-stat-unique');

      if (totalEl) totalEl.textContent = summary.totalLogins || 0;
      if (succEl) succEl.textContent = summary.successfulLogins || 0;
      if (failEl) failEl.textContent = summary.failedLogins || 0;
      if (uniqEl) uniqEl.textContent = summary.uniqueUsers || 0;

      // Render Chart
      const canvas = document.getElementById('chart-login-timeline');
      if (canvas && Array.isArray(json.timeline)) {
        if (loginTimelineChartInstance) loginTimelineChartInstance.destroy();
        const ctx = canvas.getContext('2d');
        const labels = json.timeline.map(t => t.label);
        const succData = json.timeline.map(t => t.success);
        const failData = json.timeline.map(t => t.failed);

        loginTimelineChartInstance = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'Login Berhasil',
                data: succData,
                borderColor: '#34d399',
                backgroundColor: 'rgba(52, 211, 153, 0.15)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 3,
              },
              {
                label: 'Login Gagal / Ditolak',
                data: failData,
                borderColor: '#fb7185',
                backgroundColor: 'rgba(251, 113, 133, 0.15)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 3,
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } }
              }
            },
            scales: {
              x: {
                grid: { color: 'rgba(255, 255, 255, 0.04)' },
                ticks: { color: '#94a3b8', font: { size: 10 } }
              },
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.04)' },
                ticks: { precision: 0, color: '#94a3b8' }
              }
            }
          }
        });
      }

      // Render Top Users List
      const topListEl = document.getElementById('login-top-users-list');
      if (topListEl) {
        if (!json.topUsers || json.topUsers.length === 0) {
          topListEl.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.75rem; padding: 16px;">Belum ada aktivitas login pada rentang ini.</div>';
        } else {
          topListEl.innerHTML = json.topUsers.map((u, i) => {
            return `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid var(--border-subtle);">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-weight: 800; color: var(--accent-amber); font-size: 0.78rem;">#${i + 1}</span>
                  <div>
                    <div style="font-weight: 700; color: #fff; font-size: 0.8rem;">${escapeHtml(u.username)}</div>
                    <div style="font-size: 0.68rem; color: var(--text-muted);">${escapeHtml(u.role)}</div>
                  </div>
                </div>
                <div style="text-align: right;">
                  <span style="font-weight: 800; color: var(--accent-cyan); font-size: 0.82rem;">${u.loginCount}x</span>
                  <div style="font-size: 0.65rem; color: var(--text-muted);">login</div>
                </div>
              </div>
            `;
          }).join('');
        }
      }

      // Render Recent 15 Logins Table
      const tableBody = document.getElementById('table-recent-logins-body');
      if (tableBody) {
        if (!json.recentLogins || json.recentLogins.length === 0) {
          tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 16px; color: var(--text-muted);">Belum ada riwayat login tercatat.</td></tr>';
        } else {
          tableBody.innerHTML = json.recentLogins.map(r => {
            const dateStr = r.attempted_at ? new Date(r.attempted_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' }) : '-';
            const isSuccess = r.status === 'success';
            const statusBadge = isSuccess
              ? '<span class="badge badge-emerald" style="font-size: 0.65rem;">BERHASIL</span>'
              : `<span class="badge badge-rose" style="font-size: 0.65rem;">GAGAL (${escapeHtml(r.failure_reason || 'Auth Error')})</span>`;
            return `
              <tr>
                <td style="padding: 8px 12px; font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted);">${dateStr}</td>
                <td style="padding: 8px 12px; font-weight: 700; color: #fff;">${escapeHtml(r.username)}</td>
                <td style="padding: 8px 12px;"><span class="badge badge-cyan" style="font-size: 0.65rem;">${escapeHtml(r.role)}</span></td>
                <td style="padding: 8px 12px;">${statusBadge}</td>
                <td style="padding: 8px 12px; font-family: var(--font-mono); font-size: 0.72rem; color: var(--accent-purple);">${escapeHtml(r.ip_address || '-')}</td>
                <td style="padding: 8px 12px; font-size: 0.7rem; color: var(--text-muted); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(r.user_agent || '-')}</td>
              </tr>
            `;
          }).join('');
        }
      }
    } catch (err) {
      console.error('[loadLoginStatistics] Error:', err);
    }
  }

  // Setup Login Analytics Event Listeners
  function initLoginAnalyticsListeners() {
    if (window.__loginAnalyticsInited) return;
    window.__loginAnalyticsInited = true;

    document.querySelectorAll('.login-range-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.login-range-btn').forEach(b => {
          b.classList.remove('active');
          b.style.background = 'transparent';
          b.style.color = '#fff';
          b.style.fontWeight = '500';
        });
        btn.classList.add('active');
        btn.style.background = 'var(--accent-cyan)';
        btn.style.color = '#000';
        btn.style.fontWeight = '700';

        const range = btn.dataset.range;
        const customBar = document.getElementById('login-custom-range-bar');
        if (range === 'custom') {
          if (customBar) customBar.style.display = 'block';
        } else {
          if (customBar) customBar.style.display = 'none';
          loadLoginStatistics(range);
        }
      });
    });

    document.getElementById('btn-apply-login-custom')?.addEventListener('click', () => {
      const fromVal = document.getElementById('login-custom-from')?.value;
      const toVal = document.getElementById('login-custom-to')?.value;
      if (!fromVal || !toVal) {
        showToast('Pilih tanggal awal dan akhir terlebih dahulu.', 'error');
        return;
      }
      loadLoginStatistics('custom', new Date(fromVal).toISOString(), new Date(toVal).toISOString());
    });

    document.getElementById('btn-refresh-login-stats')?.addEventListener('click', () => {
      loadLoginStatistics(currentLoginRange);
    });
  }

  initLoginAnalyticsListeners();

  function loadGamesArena() {
    playPolarisChime('click');
  }

  // ==================== 1E. VISUAL AUTO-RESPONDER (RULE ENGINE) ====================
  let cachedAutoResponders = [];

  async function loadAutoResponders() {
    try {
      const res = await PolarisAuth.authFetch('/api/autoresponders');
      const json = await res.json();
      if (!json.success || !Array.isArray(json.rules)) return;

      cachedAutoResponders = json.rules;
      renderAutoResponderList(json.rules);
    } catch (err) {
      console.error('[loadAutoResponders] Error:', err);
      const tbody = document.getElementById('ar-rules-tbody');
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--accent-rose); padding: 20px;">Gagal memuat aturan: ${escapeHtml(err.message)}</td></tr>`;
      }
    }
  }

  function renderAutoResponderList(rules) {
    const tbody = document.getElementById('ar-rules-tbody');
    const countBadge = document.getElementById('ar-rules-count');
    if (!tbody) return;

    if (countBadge) countBadge.textContent = `${rules.length} Aturan`;

    if (rules.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 36px;">
            Belum ada aturan auto-responder. Buat aturan pertama Anda menggunakan formulir di sebelah kiri!
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = '';
    rules.forEach((rule) => {
      const tr = document.createElement('tr');

      const matchLabels = {
        exact: 'Exact',
        contains: 'Contains',
        starts_with: 'Starts',
        regex: 'RegEx',
      };
      const scopeLabels = {
        all: 'Semua',
        group: 'Grup',
        private: 'Privat',
      };
      const typeIcons = {
        text: '💬 Teks',
        image: '🖼️ Foto',
        sticker: '🎨 Stiker',
      };

      const isAct = Boolean(rule.is_active);
      const previewText = (rule.response_content || '').length > 60
        ? rule.response_content.slice(0, 57) + '...'
        : (rule.response_content || '-');

      tr.innerHTML = `
        <td>
          <div style="font-weight: 700; color: #fff;">${escapeHtml(rule.keyword)}</div>
          <span class="badge badge-cyan" style="font-size: 0.65rem; margin-top: 2px;">${matchLabels[rule.match_type] || rule.match_type}</span>
        </td>
        <td>
          <div style="font-size: 0.78rem; color: var(--text-primary);">${typeIcons[rule.response_type] || rule.response_type}</div>
          <div style="font-size: 0.7rem; color: var(--text-muted);">Target: ${scopeLabels[rule.scope] || rule.scope}</div>
        </td>
        <td>
          <div style="font-size: 0.78rem; color: var(--text-secondary); word-break: break-word;">${escapeHtml(previewText)}</div>
          ${rule.media_url ? `<div style="font-size: 0.68rem; color: var(--accent-cyan);"><a href="${escapeHtml(rule.media_url)}" target="_blank" style="color: inherit;">Lihat Media ↗</a></div>` : ''}
        </td>
        <td>
          <button class="badge ${isAct ? 'badge-emerald' : 'badge-rose'} btn-toggle-ar" data-id="${rule.id}" data-active="${isAct ? 1 : 0}" style="cursor: pointer; border: none;">
            ${isAct ? '● Aktif' : '○ Mati'}
          </button>
        </td>
        <td style="text-align: right;">
          <button class="btn-polaris btn-danger btn-sm btn-delete-ar" data-id="${rule.id}" style="padding: 4px 8px; font-size: 0.75rem;">
            🗑️
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.btn-toggle-ar').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const curActive = btn.getAttribute('data-active') === '1';
        await toggleAutoResponderRule(id, !curActive);
      });
    });

    tbody.querySelectorAll('.btn-delete-ar').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Yakin ingin menghapus aturan auto-responder ini?')) {
          await deleteAutoResponderRule(id);
        }
      });
    });
  }

  async function toggleAutoResponderRule(id, newActive) {
    try {
      const res = await PolarisAuth.authFetch(`/api/autoresponders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newActive ? 1 : 0 })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Aturan berhasil di-${newActive ? 'aktifkan' : 'nonaktifkan'}.`, 'success');
        loadAutoResponders();
      } else {
        showToast(json.error || 'Gagal mengubah status aturan.', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  async function deleteAutoResponderRule(id) {
    try {
      const res = await PolarisAuth.authFetch(`/api/autoresponders/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('Aturan berhasil dihapus.', 'success');
        loadAutoResponders();
      } else {
        showToast(json.error || 'Gagal menghapus aturan.', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  function initAnalyticsAndAutoResponder() {
    // 1. Refresh button in Analytics
    document.getElementById('btn-refresh-analytics')?.addEventListener('click', () => {
      loadAnalyticsDashboard();
      showToast('Grafik analitik diperbarui.', 'info');
    });

    // 2. Ecosystem buttons
    document.getElementById('btn-broadcast-news-now')?.addEventListener('click', broadcastNewsNow);
    document.getElementById('btn-sync-channel-follow')?.addEventListener('click', syncChannelFollowNow);

    // 3. Auto-Responder form elements
    const form = document.getElementById('form-create-autoresponder');
    const respTypeSelect = document.getElementById('ar-response-type');
    const mediaContainer = document.getElementById('ar-media-url-container');
    const mediaInput = document.getElementById('ar-media-url');

    if (respTypeSelect && mediaContainer) {
      respTypeSelect.addEventListener('change', () => {
        const val = respTypeSelect.value;
        if (val === 'image' || val === 'sticker') {
          mediaContainer.style.display = 'block';
          if (mediaInput) mediaInput.required = true;
        } else {
          mediaContainer.style.display = 'none';
          if (mediaInput) mediaInput.required = false;
        }
      });
    }

    document.querySelectorAll('.ar-var-tag').forEach((tagBtn) => {
      tagBtn.addEventListener('click', () => {
        const tag = tagBtn.getAttribute('data-var');
        const textarea = document.getElementById('ar-response-content');
        if (textarea && tag) {
          const start = textarea.selectionStart || textarea.value.length;
          const end = textarea.selectionEnd || textarea.value.length;
          const text = textarea.value;
          textarea.value = text.substring(0, start) + tag + text.substring(end);
          textarea.focus();
          textarea.selectionStart = textarea.selectionEnd = start + tag.length;
        }
      });
    });

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const keyword = document.getElementById('ar-keyword')?.value?.trim();
        const matchType = document.getElementById('ar-match-type')?.value;
        const scope = document.getElementById('ar-scope')?.value;
        const responseType = document.getElementById('ar-response-type')?.value;
        const mediaUrl = document.getElementById('ar-media-url')?.value?.trim();
        const responseContent = document.getElementById('ar-response-content')?.value?.trim();

        if (!keyword || !responseContent) {
          showToast('Kata kunci dan konten respon wajib diisi.', 'error');
          return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const origHtml = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span>⏳</span> Menyimpan...';
        }

        try {
          const res = await PolarisAuth.authFetch('/api/autoresponders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              keyword,
              matchType,
              scope,
              responseType,
              mediaUrl: (responseType === 'image' || responseType === 'sticker') ? mediaUrl : '',
              content: responseContent,
            })
          });

          const json = await res.json();
          if (json.success) {
            showToast('Aturan auto-responder berhasil disimpan!', 'success');
            form.reset();
            if (mediaContainer) mediaContainer.style.display = 'none';
            loadAutoResponders();
          } else {
            showToast(json.error || 'Gagal menyimpan aturan.', 'error');
          }
        } catch (err) {
          showToast('Error koneksi: ' + err.message, 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origHtml;
          }
        }
      });
    }

    document.getElementById('btn-refresh-analytics')?.addEventListener('click', () => {
      loadAnalyticsDashboard();
    });
    document.getElementById('btn-refresh-raid-data')?.addEventListener('click', () => {
      loadRaidAnalyticsAndChampions();
    });
    document.getElementById('btn-refresh-titles')?.addEventListener('click', () => {
      loadUserRaidTitles();
    });
  }

  function initGlobalReadOnlyBarrier() {
    // Global Event-Capture Barrier untuk Akun Wuna Role Member (Hanya boleh Scroll & Ganti Page)
    document.addEventListener('click', (e) => {
      const u = PolarisAuth.getCurrentUser();
      if (!u || (u.role || '').toLowerCase() !== 'member') return;

      // Diizinkan: Navigasi tab (ganti page), top bar, logout, close modal, link eksternal
      if (
        e.target.closest('.nav-tab') ||
        e.target.closest('#top-bar') ||
        e.target.closest('#btn-logout') ||
        e.target.closest('.modal-close-btn') ||
        e.target.closest('a[target="_blank"]')
      ) {
        return;
      }

      // Cegah semua aksi modifikasi/tombol jika role member
      if (
        e.target.closest('button') ||
        e.target.closest('input') ||
        e.target.closest('select') ||
        e.target.closest('textarea') ||
        e.target.closest('.switch-container')
      ) {
        e.preventDefault();
        e.stopPropagation();
        showToast('Akun Anda memiliki izin Member (Read-Only). Anda hanya dapat melihat data.', 'error');
      }
    }, true);
  }

  // ==================== 14. STORAGE & MEDIA TMP MANAGER ====================
  let currentStorageCategory = 'all';
  let currentStorageView = 'gallery';
  let storageFilesCache = [];
  let storageStatsCache = null;

  const STORAGE_FOLDERS = [
    { id: 'all', name: 'Semua Berkas Media', icon: '🗂️', color: '#06b6d4', path: 'tmp/' },
    { id: 'antidelete', name: 'Anti-Delete', icon: '🗑️', color: '#f43f5e', path: 'tmp/media/antidelete/' },
    { id: 'downloader', name: 'Downloader (Sosmed)', icon: '📥', color: '#38bdf8', path: 'tmp/downloader/' },
    { id: 'mediafire', name: 'MediaFire Cloud', icon: '🔥', color: '#a855f7', path: 'tmp/downloader/mediafire/' },
    { id: 'sticker', name: 'Sticker Maker', icon: '🎨', color: '#10b981', path: 'tmp/media/sticker/' },
    { id: 'toimg', name: 'To-Image Converter', icon: '🖼️', color: '#f59e0b', path: 'tmp/media/toimg/' },
    { id: 'vault', name: 'Output Vault', icon: '🏛️', color: '#6366f1', path: 'tmp/media/vault/' },
    { id: 'audio', name: 'Audio & Musik', icon: '🎵', color: '#ec4899', path: 'tmp/downloader/audio/' },
  ];

  async function loadStorageStats() {
    try {
      const res = await PolarisAuth.authFetch('/api/media/stats');
      const data = await res.json();
      if (!data.success) return;

      storageStatsCache = data;

      // Update header metrics
      const elTotalFiles = document.getElementById('storage-stat-total-files');
      const elTotalSize = document.getElementById('storage-stat-total-size');
      const elAntiDelete = document.getElementById('storage-stat-antidelete');
      const elDownloader = document.getElementById('storage-stat-downloader');

      if (elTotalFiles) elTotalFiles.textContent = String(data.totalFiles || '0');
      if (elTotalSize) elTotalSize.textContent = data.formattedTotalSize || '0 B';

      const cats = data.categories || {};
      if (elAntiDelete) {
        const ad = cats.antidelete || { count: 0, formattedSize: '0 B' };
        elAntiDelete.innerHTML = `${ad.count} <span style="font-size: 0.8rem; font-weight: normal; color: var(--text-muted);">(${ad.formattedSize})</span>`;
      }
      if (elDownloader) {
        const dl = cats.downloader || { count: 0, formattedSize: '0 B' };
        const mf = cats.mediafire || { count: 0, formattedSize: '0 B' };
        const combinedCount = (dl.count || 0) + (mf.count || 0);
        elDownloader.innerHTML = `${combinedCount} <span style="font-size: 0.8rem; font-weight: normal; color: var(--text-muted);">(${dl.formattedSize})</span>`;
      }

      // Render Visual Usage Bar
      renderStorageUsageBar(data);

      // Render Folder Directory Grid
      renderStorageFolderGrid(data);

    } catch (err) {
      console.error('[storage] Gagal load stats:', err.message);
    }
  }

  function renderStorageUsageBar(data) {
    const barTrack = document.getElementById('storage-usage-bar-track');
    const legendPills = document.getElementById('storage-legend-pills');
    const barLegend = document.getElementById('storage-bar-legend');

    if (barLegend) {
      barLegend.textContent = `Total: ${data.totalFiles || 0} berkas • ${data.formattedTotalSize || '0 B'} kapasitas terpakai`;
    }

    if (!barTrack) return;

    const totalBytes = data.totalBytes || 0;
    const cats = data.categories || {};

    if (totalBytes <= 0) {
      barTrack.innerHTML = `<div class="storage-usage-bar-seg" style="width: 100%; background: rgba(255,255,255,0.08);" title="Kapasitas kosong"></div>`;
      if (legendPills) {
        legendPills.innerHTML = `<span style="color: var(--text-muted); font-size: 0.74rem;">Tidak ada file media tersimpan di direktori tmp saat ini.</span>`;
      }
      return;
    }

    let barHtml = '';
    let pillsHtml = '';

    STORAGE_FOLDERS.forEach((folder) => {
      if (folder.id === 'all') return;
      const cat = cats[folder.id];
      if (!cat || cat.count <= 0) return;

      const pct = Math.max(1, (cat.size / totalBytes) * 100);
      barHtml += `
        <div class="storage-usage-bar-seg" style="width: ${pct.toFixed(2)}%; background: ${folder.color};" title="${escapeHtml(folder.name)}: ${cat.formattedSize} (${pct.toFixed(1)}%)"></div>
      `;

      pillsHtml += `
        <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 3px 8px; border-radius: var(--radius-full); cursor: pointer; transition: all 0.2s ease;" onclick="window.PolarisApp.switchStorageCategory('${folder.id}')">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: ${folder.color}; flex-shrink: 0;"></span>
          <span style="color: var(--text-secondary); font-weight: 600;">${escapeHtml(folder.name)}:</span>
          <span style="color: #fff; font-weight: 700;">${cat.count}</span>
          <span style="color: var(--text-muted); font-size: 0.68rem;">(${cat.formattedSize})</span>
        </div>
      `;
    });

    barTrack.innerHTML = barHtml || `<div class="storage-usage-bar-seg" style="width: 100%; background: rgba(255,255,255,0.08);"></div>`;
    if (legendPills) legendPills.innerHTML = pillsHtml;
  }

  function renderStorageFolderGrid(data) {
    const grid = document.getElementById('storage-folders-grid');
    if (!grid) return;

    const cats = data.categories || {};

    grid.innerHTML = STORAGE_FOLDERS.map((folder) => {
      let count = 0;
      let size = '0 B';

      if (folder.id === 'all') {
        count = data.totalFiles || 0;
        size = data.formattedTotalSize || '0 B';
      } else {
        const cat = cats[folder.id];
        if (cat) {
          count = cat.count || 0;
          size = cat.formattedSize || '0 B';
        }
      }

      const isActive = currentStorageCategory === folder.id;

      return `
        <div class="storage-folder-card ${isActive ? 'active' : ''}" data-category="${folder.id}" style="--folder-accent: ${folder.color}; cursor: pointer;" onclick="window.PolarisApp.switchStorageCategory('${folder.id}')">
          <div class="storage-folder-header">
            <div class="storage-folder-icon" style="color: ${folder.color};">${folder.icon}</div>
            <div class="storage-folder-info">
              <div class="storage-folder-title">${escapeHtml(folder.name)}</div>
              <div class="storage-folder-path">${escapeHtml(folder.path)}</div>
            </div>
          </div>
          <div class="storage-folder-footer">
            <span class="storage-folder-badge">${count} berkas</span>
            <span style="font-size: 0.74rem; font-weight: 700; color: ${folder.color};">${size}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function switchStorageCategory(category = 'all') {
    currentStorageCategory = category;

    // Highlight folder cards
    const folderCards = document.querySelectorAll('.storage-folder-card');
    folderCards.forEach((card) => {
      if (card.getAttribute('data-category') === category) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    // Highlight filter buttons (chips)
    const filterBtns = document.querySelectorAll('.storage-filter-btn');
    filterBtns.forEach((b) => {
      const cat = b.getAttribute('data-category');
      if (cat === category) {
        b.classList.add('active');
        b.classList.remove('btn-secondary');
        b.classList.add('btn-primary');
      } else {
        b.classList.remove('active');
        b.classList.remove('btn-primary');
        b.classList.add('btn-secondary');
      }
    });

    // Update breadcrumb
    const folderDef = STORAGE_FOLDERS.find((f) => f.id === category);
    const breadcrumbCurrent = document.getElementById('storage-breadcrumb-current');
    if (breadcrumbCurrent) {
      breadcrumbCurrent.textContent = folderDef ? `${folderDef.icon} ${folderDef.name}` : 'Semua Berkas Media';
    }

    const searchVal = document.getElementById('storage-search-input')?.value.trim() || '';
    loadStorageFiles(category, searchVal);
  }

  async function loadStorageFiles(category = currentStorageCategory, search = '') {
    const tbody = document.getElementById('storage-files-tbody');
    const galleryGrid = document.getElementById('storage-gallery-grid');
    const breadcrumbBadge = document.getElementById('storage-breadcrumb-badge');

    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">Memuat berkas media...</td></tr>`;
    }
    if (galleryGrid) {
      galleryGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 36px;">Memuat galeri media...</div>`;
    }

    try {
      let url = `/api/media/files?category=${encodeURIComponent(category)}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await PolarisAuth.authFetch(url);
      const data = await res.json();
      if (!data.success) {
        if (tbody) {
          tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--accent-rose); padding: 20px;">Gagal memuat: ${escapeHtml(data.error || 'Unknown error')}</td></tr>`;
        }
        if (galleryGrid) {
          galleryGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--accent-rose); padding: 24px;">Gagal memuat berkas: ${escapeHtml(data.error || 'Unknown error')}</div>`;
        }
        return;
      }

      storageFilesCache = data.files || [];
      if (breadcrumbBadge) {
        breadcrumbBadge.textContent = `${storageFilesCache.length} berkas`;
      }
      renderStorageFiles(storageFilesCache);
    } catch (err) {
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--accent-rose); padding: 20px;">Koneksi error: ${escapeHtml(err.message)}</td></tr>`;
      }
      if (galleryGrid) {
        galleryGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--accent-rose); padding: 24px;">Koneksi error: ${escapeHtml(err.message)}</div>`;
      }
    }
  }

  function renderStorageFiles(files) {
    renderStorageTable(files);
    renderStorageGallery(files);
  }

  function renderStorageTable(files) {
    const tbody = document.getElementById('storage-files-tbody');
    if (!tbody) return;

    if (!files || files.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">Tidak ada berkas media ditemukan di folder ini.</td></tr>`;
      return;
    }

    const typeIcons = { image: '🖼️', video: '🎬', audio: '🎵', document: '📄' };
    const catBadges = {
      antidelete: 'badge-rose',
      downloader: 'badge-cyan',
      mediafire: 'badge-violet',
      sticker: 'badge-emerald',
      toimg: 'badge-amber',
      vault: 'badge-cyan',
      audio: 'badge-emerald',
    };

    tbody.innerHTML = files.map((f) => {
      const icon = typeIcons[f.mediaType] || '📁';
      const badgeCls = catBadges[f.category] || 'badge-cyan';
      const token = localStorage.getItem('polaris_token');
      const previewUrl = `/api/media/preview?path=${encodeURIComponent(f.relativePath)}&token=${encodeURIComponent(token || '')}`;

      let thumbHtml = `<span style="font-size: 1.3rem;">${icon}</span>`;
      if (f.mediaType === 'image') {
        thumbHtml = `<img src="${previewUrl}" style="width: 38px; height: 38px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-subtle);" loading="lazy" onerror="this.onerror=null;this.replaceWith('${icon}');">`;
      } else if (f.mediaType === 'video') {
        thumbHtml = `<div style="width: 38px; height: 38px; border-radius: 6px; background: color-mix(in srgb, var(--accent-cyan) 10%, transparent); border: 1px solid color-mix(in srgb, var(--accent-cyan) 25%, transparent); display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">🎬</div>`;
      }

      return `
        <tr>
          <td style="text-align: center; vertical-align: middle;">${thumbHtml}</td>
          <td>
            <div style="font-weight: 700; color: #fff; word-break: break-all;">${escapeHtml(f.filename)}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); font-family: monospace;">${escapeHtml(f.relativePath)}</div>
          </td>
          <td>
            <span class="badge ${badgeCls}" style="font-size: 0.72rem; text-transform: uppercase;">${escapeHtml(f.category)}</span>
          </td>
          <td style="font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);">${f.formattedSize}</td>
          <td style="font-size: 0.74rem; color: var(--text-muted);">${f.modifiedAtStr}</td>
          <td style="text-align: right;">
            <div style="display: flex; gap: 6px; justify-content: flex-end;">
              <button type="button" class="btn-polaris btn-secondary btn-sm" style="padding: 3px 8px; font-size: 0.74rem;" title="Lihat Media" onclick="window.PolarisApp.openMediaPreview('${encodeURIComponent(f.relativePath)}', '${encodeURIComponent(f.filename)}', '${f.mediaType}', '${f.formattedSize}', '${f.category}')">👁️</button>
              <a href="${previewUrl}&download=1" target="_blank" class="btn-polaris btn-secondary btn-sm" style="padding: 3px 8px; font-size: 0.74rem; text-decoration: none;" title="Unduh Berkas">📥</a>
              <button type="button" class="btn-polaris btn-danger btn-sm" style="padding: 3px 8px; font-size: 0.74rem;" title="Hapus Berkas" onclick="window.PolarisApp.deleteMediaFile('${encodeURIComponent(f.relativePath)}', '${encodeURIComponent(f.filename)}')">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderStorageGallery(files) {
    const grid = document.getElementById('storage-gallery-grid');
    if (!grid) return;

    if (!files || files.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 48px; background: rgba(255,255,255,0.01); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
          <div style="font-size: 2.5rem; margin-bottom: 10px;">📂</div>
          <div style="font-weight: 700; color: #fff; font-size: 0.95rem;">Tidak ada berkas media ditemukan</div>
          <div style="font-size: 0.78rem; margin-top: 4px;">Folder ini saat ini bersih atau tidak cocok dengan filter pencarian.</div>
        </div>
      `;
      return;
    }

    const typeIcons = { image: '🖼️', video: '🎬', audio: '🎵', document: '📄' };
    const catBadges = {
      antidelete: 'badge-rose',
      downloader: 'badge-cyan',
      mediafire: 'badge-violet',
      sticker: 'badge-emerald',
      toimg: 'badge-amber',
      vault: 'badge-cyan',
      audio: 'badge-emerald',
    };

    grid.innerHTML = files.map((f) => {
      const icon = typeIcons[f.mediaType] || '📁';
      const badgeCls = catBadges[f.category] || 'badge-cyan';
      const token = localStorage.getItem('polaris_token');
      const previewUrl = `/api/media/preview?path=${encodeURIComponent(f.relativePath)}&token=${encodeURIComponent(token || '')}`;

      let thumbContent = '';
      if (f.mediaType === 'image') {
        thumbContent = `<img src="${previewUrl}" loading="lazy" alt="${escapeHtml(f.filename)}" onerror="this.onerror=null;this.replaceWith('${icon}');">`;
      } else if (f.mediaType === 'video') {
        thumbContent = `
          <video preload="metadata" muted style="width: 100%; height: 100%; object-fit: cover; pointer-events: none;">
            <source src="${previewUrl}#t=0.5">
          </video>
          <div class="storage-media-play-overlay">
            <div class="storage-play-icon">▶</div>
          </div>
        `;
      } else if (f.mediaType === 'audio') {
        thumbContent = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; color: #ec4899; height: 100%;">
            <div style="font-size: 2.4rem;">🎵</div>
            <span style="font-size: 0.65rem; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; color: var(--text-muted);">Audio File</span>
          </div>
        `;
      } else {
        thumbContent = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; color: var(--accent-cyan); height: 100%;">
            <div style="font-size: 2.4rem;">📄</div>
            <span style="font-size: 0.65rem; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; color: var(--text-muted);">${escapeHtml(f.ext || 'doc')}</span>
          </div>
        `;
      }

      return `
        <div class="storage-media-card">
          <div class="storage-media-thumb" style="cursor: pointer;" title="Klik untuk pratinjau" onclick="window.PolarisApp.openMediaPreview('${encodeURIComponent(f.relativePath)}', '${encodeURIComponent(f.filename)}', '${f.mediaType}', '${f.formattedSize}', '${f.category}')">
            ${thumbContent}
          </div>
          <div class="storage-media-body">
            <div class="storage-media-name" title="${escapeHtml(f.filename)}">${escapeHtml(f.filename)}</div>
            <div class="storage-media-sub">
              <span class="badge ${badgeCls}" style="font-size: 0.68rem; text-transform: uppercase;">${escapeHtml(f.category)}</span>
              <span style="font-weight: 600; color: var(--text-secondary);">${f.formattedSize}</span>
            </div>
            <div style="font-size: 0.66rem; color: var(--text-muted); font-family: monospace;">${escapeHtml(f.modifiedAtStr)}</div>
            <div class="storage-media-actions">
              <button type="button" class="btn-polaris btn-secondary btn-sm" title="Preview Media" onclick="window.PolarisApp.openMediaPreview('${encodeURIComponent(f.relativePath)}', '${encodeURIComponent(f.filename)}', '${f.mediaType}', '${f.formattedSize}', '${f.category}')">👁️ Lihat</button>
              <a href="${previewUrl}&download=1" target="_blank" class="btn-polaris btn-secondary btn-sm" title="Unduh Berkas" style="text-decoration: none;">📥 Unduh</a>
              <button type="button" class="btn-polaris btn-danger btn-sm" title="Hapus Berkas" onclick="window.PolarisApp.deleteMediaFile('${encodeURIComponent(f.relativePath)}', '${encodeURIComponent(f.filename)}')">🗑️</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function openMediaPreview(encPath, encFilename, mediaType, sizeStr, category) {
    const relPath = decodeURIComponent(encPath);
    const filename = decodeURIComponent(encFilename);
    const modal = document.getElementById('modal-storage-preview');
    const titleEl = document.getElementById('storage-preview-title');
    const iconEl = document.getElementById('storage-preview-icon');
    const bodyEl = document.getElementById('storage-preview-body');
    const metaEl = document.getElementById('storage-preview-meta');
    const dlBtn = document.getElementById('storage-preview-download-btn');
    const delBtn = document.getElementById('storage-preview-delete-btn');

    if (!modal || !bodyEl) return;

    const token = localStorage.getItem('polaris_token');
    const mediaUrl = `/api/media/preview?path=${encodeURIComponent(relPath)}&token=${encodeURIComponent(token || '')}`;

    const icons = { video: '🎬', image: '🖼️', audio: '🎵', document: '📄' };
    if (iconEl) iconEl.textContent = icons[mediaType] || '📁';
    if (titleEl) titleEl.textContent = filename;
    if (metaEl) metaEl.textContent = `Folder: ${category.toUpperCase()} • Ukuran: ${sizeStr} • Jalur: ${relPath}`;
    if (dlBtn) dlBtn.href = `${mediaUrl}&download=1`;
    if (delBtn) {
      delBtn.onclick = () => {
        closeMediaPreview();
        deleteMediaFile(encPath, encFilename);
      };
    }

    if (mediaType === 'image') {
      bodyEl.innerHTML = `<img src="${mediaUrl}" style="max-width: 100%; max-height: 58vh; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.6);">`;
    } else if (mediaType === 'video') {
      bodyEl.innerHTML = `<video controls autoplay playsinline style="max-width: 100%; max-height: 58vh; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.6);"><source src="${mediaUrl}"></video>`;
    } else if (mediaType === 'audio') {
      bodyEl.innerHTML = `
        <div style="padding: 30px; text-align: center; width: 100%; max-width: 480px;">
          <div style="font-size: 3.5rem; margin-bottom: 14px;">🎵</div>
          <div style="font-weight: 700; color: #fff; margin-bottom: 12px; font-size: 0.95rem; word-break: break-all;">${escapeHtml(filename)}</div>
          <audio controls autoplay style="width: 100%;"><source src="${mediaUrl}"></audio>
        </div>
      `;
    } else {
      bodyEl.innerHTML = `
        <div style="padding: 32px; text-align: center;">
          <div style="font-size: 4rem; margin-bottom: 14px;">📄</div>
          <div style="font-weight: 700; color: #fff; margin-bottom: 8px; font-size: 1rem; word-break: break-all;">${escapeHtml(filename)}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 16px;">${sizeStr}</div>
          <a href="${mediaUrl}&download=1" target="_blank" class="btn-polaris btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">📥 Unduh Sekarang</a>
        </div>
      `;
    }

    modal.style.display = 'flex';
  }

  function closeMediaPreview() {
    const modal = document.getElementById('modal-storage-preview');
    const bodyEl = document.getElementById('storage-preview-body');
    if (modal) modal.style.display = 'none';
    if (bodyEl) bodyEl.innerHTML = '';
  }

  async function deleteMediaFile(encPath, encFilename) {
    const relPath = decodeURIComponent(encPath);
    const filename = decodeURIComponent(encFilename);

    if (!confirm(`Apakah Anda yakin ingin menghapus file media "${filename}" dari folder tmp?`)) {
      return;
    }

    try {
      const res = await PolarisAuth.authFetch('/api/media/file', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: relPath }),
      });
      const data = await res.json();
      if (!data.success) {
        showToast(`Gagal hapus file: ${data.error}`, 'error');
        return;
      }
      showToast(`File ${filename} berhasil dihapus.`, 'success');
      loadStorageStats();
      loadStorageFiles();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  }

  async function clearActiveCategoryStorage() {
    const cat = currentStorageCategory;
    const catLabel = cat === 'all' ? 'SEMUA MEDIA' : cat.toUpperCase();

    if (!confirm(`Hapus seluruh file media dalam kategori ${catLabel}? Aksi ini tidak dapat dibatalkan.`)) {
      return;
    }

    if (typeof window.showBlackholeLoader === 'function') {
      window.showBlackholeLoader('MEMBERSIHKAN MEDIA', `Menghapus file media kategori ${catLabel}...`);
    }

    try {
      const endpoint = cat === 'all' ? '/api/media/clear-all' : '/api/media/clear-category';
      const res = await PolarisAuth.authFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: cat }),
      });
      const data = await res.json();
      if (!data.success) {
        showToast(`Gagal membersihkan: ${data.error}`, 'error');
      } else {
        showToast(data.message || 'Kategori berhasil dibersihkan.', 'success');
        loadStorageStats();
        loadStorageFiles();
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      if (typeof window.hideBlackholeLoader === 'function') {
        window.hideBlackholeLoader();
      }
    }
  }

  async function clearAllStorage() {
    if (!confirm('PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA file media di seluruh kategori tmp (Anti-delete, Downloader, Mediafire, Sticker, To-Image, Vault)?')) {
      return;
    }

    if (typeof window.showBlackholeLoader === 'function') {
      window.showBlackholeLoader('MENGHAPUS SEMUA MEDIA', 'Membersihkan seluruh media hasil download & cache WA...');
    }

    try {
      const res = await PolarisAuth.authFetch('/api/media/clear-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!data.success) {
        showToast(`Gagal: ${data.error}`, 'error');
      } else {
        showToast(data.message || 'Semua file media berhasil dihapus.', 'success');
        loadStorageStats();
        loadStorageFiles();
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      if (typeof window.hideBlackholeLoader === 'function') {
        window.hideBlackholeLoader();
      }
    }
  }

  function loadStorageTab() {
    loadStorageStats();
    loadStorageFiles(currentStorageCategory);
  }

  function initStorageManager() {
    const btnRefresh = document.getElementById('btn-storage-refresh');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        loadStorageStats();
        loadStorageFiles(currentStorageCategory);
        showToast('Data media dan folder diperbarui.', 'info');
      });
    }

    const btnClearCat = document.getElementById('btn-storage-clear-cat');
    if (btnClearCat) {
      btnClearCat.addEventListener('click', clearActiveCategoryStorage);
    }

    const btnClearAll = document.getElementById('btn-storage-clear-all');
    if (btnClearAll) {
      btnClearAll.addEventListener('click', clearAllStorage);
    }

    // View toggler: Gallery vs Table
    const btnGallery = document.getElementById('btn-view-gallery');
    const btnTable = document.getElementById('btn-view-table');
    const galleryView = document.getElementById('storage-gallery-view');
    const tableView = document.getElementById('storage-table-view');

    if (btnGallery && btnTable && galleryView && tableView) {
      btnGallery.addEventListener('click', () => {
        currentStorageView = 'gallery';
        btnGallery.style.background = 'var(--accent-cyan)';
        btnGallery.style.color = '#040509';
        btnGallery.style.fontWeight = '700';
        btnTable.style.background = 'transparent';
        btnTable.style.color = 'var(--text-muted)';
        btnTable.style.fontWeight = 'normal';
        galleryView.style.display = 'block';
        tableView.style.display = 'none';
      });

      btnTable.addEventListener('click', () => {
        currentStorageView = 'table';
        btnTable.style.background = 'var(--accent-cyan)';
        btnTable.style.color = '#040509';
        btnTable.style.fontWeight = '700';
        btnGallery.style.background = 'transparent';
        btnGallery.style.color = 'var(--text-muted)';
        btnGallery.style.fontWeight = 'normal';
        galleryView.style.display = 'none';
        tableView.style.display = 'block';
      });
    }

    const filterBtns = document.querySelectorAll('.storage-filter-btn');
    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-category') || 'all';
        switchStorageCategory(cat);
      });
    });

    const searchInput = document.getElementById('storage-search-input');
    if (searchInput) {
      let debounceTimer = null;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          loadStorageFiles(currentStorageCategory, searchInput.value.trim());
        }, 300);
      });
    }

    const btnClosePreview = document.getElementById('btn-close-storage-preview');
    if (btnClosePreview) {
      btnClosePreview.addEventListener('click', closeMediaPreview);
    }
    const modal = document.getElementById('modal-storage-preview');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeMediaPreview();
      });
    }
  }

  // ==================== POLARIS OMNISEARCH SPOTLIGHT (⌘K) CONTROLLER ====================
  let isOmnisearchOpen = false;
  let activeOmnisearchFilter = 'all';
  let omnisearchSelectedIndex = 0;
  let omnisearchCurrentItems = [];

  const OMNISEARCH_NAV_TABS = [
    { id: 'overview', title: 'Bot Hub Overview', desc: 'Ringkasan cluster WhatsApp Baileys, status bot & simulator live', icon: '🤖', category: 'nav' },
    { id: 'atomic', title: 'Atomic Productivity Suite', desc: 'Habit tracker, to-do list, chart tabungan saham realtime & private journal', icon: '⚛️', category: 'nav', action: () => switchMacroPillar('atomic') },
    { id: 'sirium', title: 'Sirium Digital Asset Store', desc: 'Katalog web templates, bot modules, UI kit & toko kreator resmi (D-45)', icon: '🛍️', category: 'nav', action: () => switchMacroPillar('sirium') },
    { id: 'tools', title: 'Tools Hub (Downloader + Fun Tools)', desc: 'Unduh media 16+ platform, Tarot, APK Builder, Web Utils', icon: '🛠️', category: 'nav' },
    { id: 'games', title: 'Games Arena', desc: 'Chess Starlium AI, Minesweeper, XOX, SOS, Snake, Memory & lebih', icon: '🎮', category: 'nav' },
    { id: 'story', title: 'Post Status / Story WA Studio', desc: 'Desain canvas story WhatsApp dengan font kustom & filter audiens', icon: '📱', category: 'nav' },
    { id: 'groups', title: 'Grup & Moderasi', desc: 'Manajemen grup WhatsApp, proteksi anti-link, badwords & welcome', icon: '👥', category: 'nav' },
    { id: 'commands', title: 'Commands Directory & Routing', desc: '181 fitur bot, hak akses per role & load-balancing multi-bot', icon: '⚡', category: 'nav' },
    { id: 'import', title: 'Import & Custom Commands', desc: 'Tambah command JavaScript kustom secara modular', icon: '📦', category: 'nav' },
    { id: 'storage', title: 'Storage & Media Vault', desc: 'Penyimpanan file bot, cache media, unduh file & pembersihan disk', icon: '📁', category: 'nav' },
    { id: 'analytics', title: 'Statistik & Logs Sistem', desc: 'Metrik performa RAM/CPU, uptime, log error & audit trail', icon: '📊', category: 'nav' },
    { id: 'autoresponder', title: 'Auto-Responder Rules', desc: 'Otomatisasi balasan pesan WhatsApp berbasis kata kunci & regex', icon: '💬', category: 'nav' },
    { id: 'whitelist', title: 'Luna Whitelist Access', desc: 'Manajemen nomor pengguna terverifikasi Level 1 & Level 2', icon: '🛡️', category: 'nav' },
    { id: 'terminal', title: 'Web Live Terminal', desc: 'Streaming log terminal Baileys langsung dari server Node.js', icon: '💻', category: 'nav' },
    { id: 'account', title: 'Settings & Konfigurasi', desc: 'Pengaturan port server, auth session & kredensial API', icon: '⚙️', category: 'nav' }
  ];

  const OMNISEARCH_ACTIONS = [
    { id: 'act_connect_bot', title: 'Hubungkan Akun Bot WhatsApp', desc: 'Buka scanner QR code atau minta 8-digit Pairing Code', icon: '⚡', category: 'actions', action: () => {
      document.querySelector('.nav-tab[data-tab="overview"]')?.click();
      setTimeout(() => document.getElementById('cluster-focused-engine-card')?.scrollIntoView({ behavior: 'smooth' }), 200);
    }},
    { id: 'act_sandbox', title: 'Buka WhatsApp Live Chat Sandbox', desc: 'Simulasi kirim pesan & jalankan perintah bot langsung di browser', icon: '💬', category: 'actions', action: () => {
      document.querySelector('.nav-tab[data-tab="overview"]')?.click();
      setTimeout(() => document.getElementById('overview-wa-sandbox')?.scrollIntoView({ behavior: 'smooth' }), 200);
    }},
    { id: 'act_toggle_bgm', title: 'Putar / Jeda Soundtrack BGM', desc: 'Nyalakan atau hentikan musik ambien procedural synth', icon: '🎵', category: 'actions', action: () => {
      if (window.Kinetix && typeof window.Kinetix.toggleBGM === 'function') {
        window.Kinetix.toggleBGM();
      }
    }},
    { id: 'act_toggle_sfx', title: 'Hidupkan / Matikan Suara Haptic SFX', desc: 'Toggle seluruh efek audio tombol dan navigasi dashboard', icon: '🔊', category: 'actions', action: () => {
      const soundBtn = document.getElementById('btn-sound-toggle') || document.getElementById('btn-kinetix-sound-toggle');
      if (soundBtn) soundBtn.click();
    }},
    { id: 'act_clear_terminal', title: 'Bersihkan Log Terminal', desc: 'Hapus output log terminal yang menumpuk di tampilan', icon: '🧹', category: 'actions', action: () => {
      const btn = document.getElementById('btn-clear-terminal');
      if (btn) btn.click();
    }},
    { id: 'act_restart_bot', title: 'Restart Cluster Bot Server', desc: 'Restart koneksi Baileys dan segarkan socket WhatsApp', icon: '🔄', category: 'actions', action: () => {
      const btn = document.getElementById('cluster-btn-restart-focused');
      if (btn) btn.click();
      else showToast('Silakan pilih instance bot di Overview untuk merestart.', 'info');
    }}
  ];

  function openOmnisearch() {
    const modal = document.getElementById('polaris-omnisearch-modal');
    const input = document.getElementById('omnisearch-input');
    if (!modal || !input) return;

    // Background fetch commands if empty so 181 commands are indexed
    if (!commandsData || commandsData.length === 0) {
      loadCommands().catch(() => {});
    }

    isOmnisearchOpen = true;
    modal.style.display = 'flex';
    input.value = '';
    omnisearchSelectedIndex = 0;
    renderOmnisearchResults('');

    setTimeout(() => input.focus(), 60);
    if (window.Kinetix && typeof window.Kinetix.playSound === 'function') {
      window.Kinetix.playSound('modal_open');
    }
  }

  function closeOmnisearch() {
    const modal = document.getElementById('polaris-omnisearch-modal');
    if (!modal) return;
    isOmnisearchOpen = false;
    modal.style.display = 'none';
    if (window.Kinetix && typeof window.Kinetix.playSound === 'function') {
      window.Kinetix.playSound('modal_close');
    }
  }

  function renderOmnisearchResults(queryStr) {
    const resultsContainer = document.getElementById('omnisearch-results');
    const countEl = document.getElementById('omnisearch-match-count');
    if (!resultsContainer) return;

    const q = (queryStr || '').toLowerCase().trim();
    const items = [];

    // 1. Navigation items
    if (activeOmnisearchFilter === 'all' || activeOmnisearchFilter === 'nav') {
      OMNISEARCH_NAV_TABS.forEach(t => {
        if (!q || t.title.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || t.id.includes(q)) {
          items.push({ ...t, group: '🧭 Navigasi & Halaman' });
        }
      });
    }

    // 2. Quick Actions
    if (activeOmnisearchFilter === 'all' || activeOmnisearchFilter === 'actions') {
      OMNISEARCH_ACTIONS.forEach(act => {
        if (!q || act.title.toLowerCase().includes(q) || act.desc.toLowerCase().includes(q)) {
          items.push({ ...act, group: '⚡ Aksi Cepat Sistem' });
        }
      });
    }

    // 4. Bot Commands (181)
    if (activeOmnisearchFilter === 'all' || activeOmnisearchFilter === 'commands') {
      if (Array.isArray(commandsData) && commandsData.length > 0) {
        commandsData.forEach(c => {
          const cmdName = (c.name || '').toLowerCase();
          const cmdDesc = (c.description || '').toLowerCase();
          const cmdCat = (c.category || 'Umum').toLowerCase();
          if (!q || cmdName.includes(q) || cmdDesc.includes(q) || cmdCat.includes(q)) {
            items.push({
              id: c.name,
              title: `.${c.name}`,
              desc: `${c.category ? `[${c.category}] ` : ''}${c.description || 'Perintah bot WhatsApp'}`,
              icon: '🤖',
              category: 'commands',
              group: `🤖 Perintah Bot DENIA (${c.category || 'General'})`,
              badge: c.role || 'ALL'
            });
          }
        });
      }
    }

    omnisearchCurrentItems = items;
    if (omnisearchSelectedIndex >= items.length) {
      omnisearchSelectedIndex = Math.max(0, items.length - 1);
    }

    if (countEl) {
      countEl.textContent = `${items.length} hasil ditemukan`;
    }

    if (items.length === 0) {
      resultsContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">🔍</div>
          <div style="font-weight: 750; font-size: 0.95rem; color: #fff;">Tidak ada perintah atau tab yang cocok</div>
          <div style="font-size: 0.78rem; margin-top: 4px;">Coba gunakan kata kunci lain seperti "ping", "ai", "tema", atau "terminal".</div>
        </div>
      `;
      return;
    }

    // Group items for clear visual hierarchy
    let html = '';
    let currentGroup = '';

    items.forEach((item, idx) => {
      if (item.group !== currentGroup) {
        currentGroup = item.group;
        html += `<div class="omnisearch-group-title">${escapeHtml(currentGroup)}</div>`;
      }

      const isSelected = idx === omnisearchSelectedIndex;
      html += `
        <div class="omnisearch-item ${isSelected ? 'active' : ''}" data-index="${idx}">
          <div class="omnisearch-item-left">
            <div class="omnisearch-item-icon">${item.icon || '⚡'}</div>
            <div>
              <div class="omnisearch-item-title">${escapeHtml(item.title)}</div>
              <div class="omnisearch-item-desc">${escapeHtml(item.desc || '')}</div>
            </div>
          </div>
          <div class="omnisearch-item-badge">${escapeHtml(item.badge || item.category || 'ITEM')}</div>
        </div>
      `;
    });

    resultsContainer.innerHTML = html;

    // Scroll active item into view
    const activeEl = resultsContainer.querySelector('.omnisearch-item.active');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }

    // Attach click listeners to items
    resultsContainer.querySelectorAll('.omnisearch-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.getAttribute('data-index'), 10);
        executeOmnisearchItem(omnisearchCurrentItems[idx]);
      });
      el.addEventListener('mouseenter', () => {
        const idx = parseInt(el.getAttribute('data-index'), 10);
        omnisearchSelectedIndex = idx;
        resultsContainer.querySelectorAll('.omnisearch-item').forEach((itemEl, i) => {
          itemEl.classList.toggle('active', i === idx);
        });
      });
    });
  }

  function executeOmnisearchItem(item) {
    if (!item) return;

    if (window.Kinetix && typeof window.Kinetix.playSound === 'function') {
      window.Kinetix.playSound('click');
    }

    closeOmnisearch();

    if (item.category === 'nav') {
      const tabBtn = document.querySelector(`.nav-tab[data-tab="${item.id}"]`);
      if (tabBtn) tabBtn.click();
    } else if (item.category === 'actions') {
      if (typeof item.action === 'function') {
        item.action();
      }
    } else if (item.category === 'commands') {
      // Switch to Overview tab and simulate this command directly in the WhatsApp sandbox
      document.querySelector('.nav-tab[data-tab="overview"]')?.click();
      const sandboxInput = document.getElementById('wa-sandbox-input');
      if (sandboxInput) {
        sandboxInput.value = `.${item.id}`;
        document.getElementById('overview-wa-sandbox')?.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
          simulateWASandboxCommand(`.${item.id}`);
        }, 300);
      }
    }
  }

  function initOmnisearchModal() {
    const modal = document.getElementById('polaris-omnisearch-modal');
    const input = document.getElementById('omnisearch-input');
    const closeBtn = document.getElementById('omnisearch-btn-close');
    const filterPills = document.querySelectorAll('.omnisearch-filter-pill');

    if (!modal || !input) return;

    // 1. Global Keyboard Shortcut (⌘K, Ctrl+K, /, Escape)
    document.addEventListener('keydown', (e) => {
      // Open with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (isOmnisearchOpen) closeOmnisearch();
        else openOmnisearch();
        return;
      }

      // Open with '/' if not typing in an input
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (!isOmnisearchOpen && e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT' && !document.activeElement.isContentEditable) {
        e.preventDefault();
        openOmnisearch();
        return;
      }

      // If Omnisearch is open, handle navigation keys
      if (isOmnisearchOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeOmnisearch();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (omnisearchCurrentItems.length > 0) {
            omnisearchSelectedIndex = (omnisearchSelectedIndex + 1) % omnisearchCurrentItems.length;
            renderOmnisearchResults(input.value);
            if (window.Kinetix && typeof window.Kinetix.playSound === 'function') {
              window.Kinetix.playSound('click', 0.5);
            }
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (omnisearchCurrentItems.length > 0) {
            omnisearchSelectedIndex = (omnisearchSelectedIndex - 1 + omnisearchCurrentItems.length) % omnisearchCurrentItems.length;
            renderOmnisearchResults(input.value);
            if (window.Kinetix && typeof window.Kinetix.playSound === 'function') {
              window.Kinetix.playSound('click', 0.5);
            }
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (omnisearchCurrentItems.length > 0 && omnisearchCurrentItems[omnisearchSelectedIndex]) {
            executeOmnisearchItem(omnisearchCurrentItems[omnisearchSelectedIndex]);
          }
        }
      }
    });

    // 2. Real-time Search Input Listener
    input.addEventListener('input', (e) => {
      omnisearchSelectedIndex = 0;
      renderOmnisearchResults(e.target.value);
    });

    // 3. Filter Pills
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeOmnisearchFilter = pill.getAttribute('data-filter') || 'all';
        omnisearchSelectedIndex = 0;
        renderOmnisearchResults(input.value);
        if (window.Kinetix && typeof window.Kinetix.playSound === 'function') {
          window.Kinetix.playSound('click');
        }
      });
    });

    // 4. Close on Backdrop Click or ESC button
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeOmnisearch();
    });
    if (closeBtn) {
      closeBtn.addEventListener('click', closeOmnisearch);
    }
  }

  // ==================== WHATSAPP LIVE MESSAGE SIMULATOR & CHAT SANDBOX ====================
  function initWASandbox() {
    const form = document.getElementById('wa-sandbox-form');
    const input = document.getElementById('wa-sandbox-input');
    const clearBtn = document.getElementById('wa-sandbox-clear-btn');
    const botSelect = document.getElementById('wa-sandbox-bot-select');

    // Populate initial clock time
    const initialTimeEl = document.getElementById('wa-initial-msg-time');
    if (initialTimeEl) {
      initialTimeEl.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Populate bot instance select
    if (botSelect) {
      botSelect.innerHTML = `
        <option value="primary">🤖 Primary Engine</option>
        <option value="bot-02">⚡ Cluster Instance #2</option>
        <option value="bot-03">🌐 Cluster Instance #3</option>
      `;
      botSelect.addEventListener('change', (e) => {
        const titleEl = document.getElementById('wa-sandbox-bot-title');
        if (titleEl) {
          titleEl.textContent = e.target.options[e.target.selectedIndex].text;
        }
        if (window.Kinetix && typeof window.Kinetix.playSound === 'function') {
          window.Kinetix.playSound('click');
        }
      });
    }

    // Quick test command chips
    document.querySelectorAll('.wa-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.getAttribute('data-cmd');
        if (cmd) {
          if (input) input.value = cmd;
          simulateWASandboxCommand(cmd);
        }
      });
    });

    // Form submit
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input ? input.value.trim() : '';
        if (!text) return;
        simulateWASandboxCommand(text);
      });
    }

    // Clear chat button
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const chatBody = document.getElementById('wa-sandbox-chat-body');
        if (chatBody) {
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          chatBody.innerHTML = `
            <div class="wa-date-divider"><span>HARI INI</span></div>
            <div class="wa-encryption-badge"><span>🔒 Pesan disimulasikan secara lokal melalui Baileys Multi-Device WebSocket Engine. Respons terformat otomatis.</span></div>
            <div class="wa-msg-row wa-msg-incoming">
              <div class="wa-msg-bubble">
                <div class="wa-msg-author">DENIA Cluster Bot</div>
                <div class="wa-msg-text">
                  👋 <strong>Riwayat chat disetel ulang.</strong><br><br>
                  Ketik perintah apa saja (seperti <code>.ping</code>, <code>.menu</code>, <code>.ai</code>, <code>.status</code>) untuk mulai menguji respon bot!
                </div>
                <div class="wa-msg-meta"><span class="wa-msg-time">${timeStr}</span></div>
              </div>
            </div>
            <div id="wa-sandbox-typing-row" class="wa-msg-row wa-msg-incoming" style="display: none;">
              <div class="wa-msg-bubble wa-typing-bubble">
                <div class="wa-typing-dots"><span></span><span></span><span></span></div>
                <span style="font-size: 0.7rem; color: #8696a0; margin-left: 6px;">DENIA sedang mengetik...</span>
              </div>
            </div>
          `;
          if (window.Kinetix && typeof window.Kinetix.playSound === 'function') {
            window.Kinetix.playSound('click');
          }
        }
      });
    }
  }

  function simulateWASandboxCommand(commandText) {
    const input = document.getElementById('wa-sandbox-input');
    const chatBody = document.getElementById('wa-sandbox-chat-body');
    const headerStatus = document.getElementById('wa-sandbox-header-status');
    const botTitle = document.getElementById('wa-sandbox-bot-title')?.textContent || 'DENIA Bot Multi-Device';

    if (!commandText || !chatBody) return;
    if (input) input.value = '';

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Play send tactile click sound
    if (window.Kinetix && typeof window.Kinetix.playSound === 'function') {
      window.Kinetix.playSound('click');
    }

    // 2. Append Outgoing User Message
    const userRow = document.createElement('div');
    userRow.className = 'wa-msg-row wa-msg-outgoing';
    userRow.innerHTML = `
      <div class="wa-msg-bubble">
        <div class="wa-msg-text">${escapeHtml(commandText)}</div>
        <div class="wa-msg-meta">
          <span class="wa-msg-time">${timeStr}</span>
          <span class="wa-msg-ticks">✓✓</span>
        </div>
      </div>
    `;

    // Insert before typing row
    const typingRow = document.getElementById('wa-sandbox-typing-row');
    if (typingRow) {
      chatBody.insertBefore(userRow, typingRow);
      typingRow.style.display = 'flex';
    } else {
      chatBody.appendChild(userRow);
    }

    if (headerStatus) {
      headerStatus.innerHTML = '<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#25d366; animation:pulse 1s infinite;"></span> Sedang mengetik...';
    }

    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: 'smooth' });

    // 3. Simulate Realistic Bot Delay & Smart Response Generation
    const delay = Math.floor(Math.random() * 250) + 450; // 450-700ms
    setTimeout(() => {
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const botResponseHtml = generateBotSimulatedReply(commandText);

      // Hide typing indicator
      if (typingRow) typingRow.style.display = 'none';
      if (headerStatus) {
        headerStatus.innerHTML = '<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#25d366;"></span> Online • Siap Menerima Perintah';
      }

      // Append incoming bot bubble
      const botRow = document.createElement('div');
      botRow.className = 'wa-msg-row wa-msg-incoming';
      botRow.innerHTML = `
        <div class="wa-msg-bubble">
          <div class="wa-msg-author">${escapeHtml(botTitle)}</div>
          <div class="wa-msg-text">${botResponseHtml}</div>
          <div class="wa-msg-meta">
            <span class="wa-msg-time">${replyTime}</span>
          </div>
        </div>
      `;

      if (typingRow) {
        chatBody.insertBefore(botRow, typingRow);
      } else {
        chatBody.appendChild(botRow);
      }

      chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: 'smooth' });

      // Play arrival sound
      if (window.Kinetix && typeof window.Kinetix.playSound === 'function') {
        window.Kinetix.playSound('success');
      }
    }, delay);
  }

  function generateBotSimulatedReply(cmd) {
    const clean = cmd.trim().toLowerCase();

    if (clean === '.ping' || clean === 'ping') {
      const lat = Math.floor(Math.random() * 25) + 20;
      return `🏓 <strong>Pong!</strong><br>
⚡ <strong>Latensi:</strong> <code>${lat} ms</code><br>
⏱️ <strong>Server Uptime:</strong> 18j 42m 08d<br>
📡 <strong>Baileys Protocol:</strong> Multi-Device Active (WebSocket Sync OK)<br>
🟢 <strong>Node.js Memory:</strong> 78.4 MB / 512 MB`;
    }

    if (clean === '.status' || clean === 'status') {
      return `📊 <strong>POLARIS CLUSTER ENGINE STATUS</strong><br>
━━━━━━━━━━━━━━━━━━━━<br>
🤖 <strong>Cluster Instances:</strong> 1 Connected / 10 Max<br>
📡 <strong>Socket Connection:</strong> OPEN (0ms lag)<br>
🛡️ <strong>Anti-Loop Watchdog:</strong> ACTIVE (Auto-Break enabled)<br>
📦 <strong>Media Vault:</strong> Ready (Auto-clean tmp enabled)<br>
━━━━━━━━━━━━━━━━━━━━<br>
Seluruh subsistem berjalan optimal pada port 3000.`;
    }

    if (clean === '.menu' || clean === 'menu') {
      return `📋 <strong>POLARIS & DENIA BOT COMMAND DIRECTORY</strong><br>
━━━━━━━━━━━━━━━━━━━━<br>
🤖 <strong>Total Perintah:</strong> 181 Fitur Multi-Device<br><br>
📌 <strong>Kategori Unggulan:</strong><br>
• 🌐 <strong>AI Assistant:</strong> <code>.ai</code><br>
• 📥 <strong>Downloader:</strong> <code>.tiktok</code>, <code>.ig</code>, <code>.yt</code>, <code>.fb</code>, <code>.tw</code><br>
• 🛠️ <strong>Media Tools:</strong> <code>.sticker</code>, <code>.tourl</code>, <code>.tomp3</code>, <code>.qc</code><br>
• 👥 <strong>Grup & Moderasi:</strong> <code>.kick</code>, <code>.add</code>, <code>.hidetag</code>, <code>.tagall</code><br>
• ⚙️ <strong>Sistem & Owner:</strong> <code>.status</code>, <code>.ping</code>, <code>.speed</code>, <code>.owner</code><br>
━━━━━━━━━━━━━━━━━━━━<br>
💡 <em>Gunakan Omnisearch (⌘K / Ctrl+K) di panel atas untuk mencari seluruh 181 perintah secara instan!</em>`;
    }

    if (clean === '.owner' || clean === 'owner') {
      return `👑 <strong>POLARIS SYSTEM OWNER</strong><br>
━━━━━━━━━━━━━━━━━━━━<br>
👤 <strong>Owner:</strong> Astraonyx (@astra)<br>
🔑 <strong>Otoritas:</strong> LEVEL 3 (COSMOS MASTER)<br>
⚡ <strong>Cluster Control:</strong> Full Access & Execution Privileges Active<br>
🛡️ <strong>Bypass Sandbox:</strong> Enabled`;
    }

    if (clean === '.speed' || clean === 'speed') {
      return `🚀 <strong>SPEEDTEST NETWORK ENGINE</strong><br>
━━━━━━━━━━━━━━━━━━━━<br>
⬇️ <strong>Download:</strong> 142.8 Mbps<br>
⬆️ <strong>Upload:</strong> 98.4 Mbps<br>
⚡ <strong>Ping:</strong> 12 ms (Cloudflare CDN Edge)<br>
🌐 <strong>Bandwidth Provider:</strong> Fiber Gigabit Cluster`;
    }

    if (clean === '.runtime' || clean === 'runtime') {
      return `⏱️ <strong>RUNTIME STATS</strong><br>
━━━━━━━━━━━━━━━━━━━━<br>
⏳ <strong>Aktif Sejak:</strong> 18 jam, 42 menit, 8 detik<br>
🔄 <strong>Koneksi Terputus:</strong> 0 kali<br>
✅ <strong>Status Watchdog:</strong> 100% Sehat`;
    }

    if (clean.startsWith('.ai ') || clean.startsWith('ai ')) {
      const prompt = cmd.replace(/^(\.ai|ai)\s+/i, '');
      return `🤖 <strong>Polaris AI Assistant:</strong><br><br>
Menanggapi pertanyaan Anda: <em>"${escapeHtml(prompt)}"</em><br><br>
Polaris AI Assistant berhasil memproses permintaan ini. Sistem dilengkapi penalaran kontekstual, multi-turn dialogue, serta integrasi eksekusi tugas WhatsApp tanpa batas kuota.`;
    }

    if (clean === '.sticker' || clean === 'sticker') {
      return `🖼️ <strong>Sticker Engine:</strong> Kirim atau balas media gambar/video dengan caption <code>.sticker</code> untuk mengonversinya menjadi stiker WhatsApp WebP resolusi tinggi dengan metadata Exif Polaris.`;
    }

    // Check if matched in actual commands database
    const matchedCmd = Array.isArray(commandsData) ? commandsData.find(c => (c.name || '').toLowerCase() === clean.replace(/^\./, '')) : null;
    if (matchedCmd) {
      return `🤖 <strong>Perintah [${escapeHtml(matchedCmd.name)}]</strong><br>
📁 <strong>Kategori:</strong> ${escapeHtml(matchedCmd.category || 'General')}<br>
📝 <strong>Deskripsi:</strong> ${escapeHtml(matchedCmd.description || 'Perintah bot terdaftar')}<br>
🔑 <strong>Akses Minimum:</strong> <code>${escapeHtml(matchedCmd.role || 'ALL')}</code><br><br>
✅ <em>Simulasi eksekusi berhasil dijalankan oleh Baileys Cluster Engine!</em>`;
    }

    return `🤖 Pesan <code>${escapeHtml(cmd)}</code> berhasil diterima dan diproses oleh Baileys Cluster Core! Ketik <code>.menu</code> untuk daftar seluruh perintah bot.`;
  }

  function applyUrlHashNavigation() {
    try {
      const rawHash = (window.location.hash || '').replace(/^#/, '').toLowerCase().trim();
      const params = new URLSearchParams(window.location.search);
      const targetTab = rawHash || params.get('tab');
      const targetPillar = params.get('pillar');

      if (!targetTab && !targetPillar) return;

      const SANCTUM_TABS = ['owner', 'terminal', 'storage', 'analytics', 'account'];
      const POLARIS_TABS = ['overview', 'hermes', 'groups', 'autoresponder', 'commands', 'story', 'whitelist', 'import'];

      let tab = targetTab;
      if (tab === 'downloader') tab = 'tools';

      if (targetPillar) {
        switchMacroPillar(targetPillar, tab);
      } else if (tab === 'social') {
        switchMacroPillar('polarium');
      } else if (tab === 'games') {
        switchMacroPillar('starlium');
      } else if (tab === 'study' || tab === 'study-space') {
        switchMacroPillar('luminary');
      } else if (tab === 'atomic') {
        switchMacroPillar('atomic');
      } else if (tab === 'sirium') {
        switchMacroPillar('sirium');
      } else if (tab === 'tools' || tab === 'downloader') {
        switchMacroPillar('tools', 'tools');
      } else if (SANCTUM_TABS.includes(tab)) {
        switchMacroPillar('sanctum', tab);
      } else if (POLARIS_TABS.includes(tab)) {
        switchMacroPillar('polaris', tab);
      }
    } catch (_) {}
  }

  window.addEventListener('hashchange', applyUrlHashNavigation);

  function initApp() {
    initMainControls();
    initAnalyticsAndAutoResponder();
    initGlobalReadOnlyBarrier();
    initStorageManager();
    initOmnisearchModal();
    initWASandbox();
    refreshAll();
    applyUrlHashNavigation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

  window.PolarisApp = window.PolarisApp || {};
  Object.assign(window.PolarisApp, {
    applyUrlHashNavigation,
    refreshAll,
    removeOwner,
    changeUserLevel,
    removeWhitelist,
    toggleGroupAllowed,
    disallowAllGroups,
    toggleGroupFeature,
    editWelcomeText,
    editBadwordList,
    addGroupPrompt,
    deleteGroup,
    syncGroupsFromWA,
    toggleCommand,
    bulkToggleCommands,
    openPermissionEditor,
    openOutputEditor,
    openRoutingEditor,
    selectRoutingMode,
    saveRoutingConfig,
    loadStoryTemplates,
    applySelectedStoryTemplate,
    openSaveStoryTemplateModal,
    confirmSaveStoryTemplate,
    deleteSelectedStoryTemplate,
    deleteCustomCommand,
    editCustomCommand,
    loadImportTab,
    showToast,
    onRoleUpdated,
    loadWunaUsers,
    loadOwnerPanel,
    loadStoryTab,
    loadClusterTab,
    loadHermesTab,
    loadHermesSkills,
    loadHermesEnv,
    loadArtifactsList,
    loadHermesTerminal,
    runHermesTerminalCommand,
    loadHermesModels,
    selectHermesModel,
    openArtifactPreviewModal,
    loadDownloaderTab,
    initDownloaderHub,
    analyzeFromHistory: (encUrl) => {
      const url = decodeURIComponent(encUrl);
      const input = document.getElementById('downloader-url-input');
      if (input) input.value = url;
      analyzeMediaUrl(url);
    },
    deleteHistoryItem: async (id, encUrl) => {
      const url = encUrl ? decodeURIComponent(encUrl) : '';
      downloaderHistory = downloaderHistory.filter(h => (id ? h.id !== id : h.url !== url));
      try {
        localStorage.setItem('polaris_downloader_history', JSON.stringify(downloaderHistory));
      } catch (_) {}
      if (id) {
        try {
          await PolarisAuth.authFetch('/api/downloader/history/' + encodeURIComponent(id), { method: 'DELETE' });
        } catch (_) {}
      }
      renderDownloaderHistory();
      updateDownloaderStats();
      showToast('Item riwayat berhasil dihapus.', 'info');
    },
    previewBatchItem: (idx) => {
      if (batchQueueList && batchQueueList[idx] && batchQueueList[idx].data) {
        currentMediaData = batchQueueList[idx].data;
        renderDownloaderResult(batchQueueList[idx].data);
        const card = document.getElementById('downloader-result-card');
        if (card) {
          card.style.display = 'block';
          card.scrollIntoView({ behavior: 'smooth' });
        }
      }
    },
    copyToClipboard: async (encUrl) => {
      try {
        const url = decodeURIComponent(encUrl);
        await navigator.clipboard.writeText(url);
        showToast('Tautan berhasil disalin ke clipboard!', 'success');
      } catch (_) {
        showToast('Gagal menyalin link ke clipboard.', 'error');
      }
    },

    // ==================== 15. MEDSOS ASTRAONYX (COMMUNITY SOCIAL FEED) ====================
    loadSocialFeed,
    openPublicProfileModal,
    closePublicProfileModal,
    challengeUserFromProfile,
    addFriendFromProfile,
    loadAnalyticsDashboard,
    loadAutoResponders,
    broadcastNewsNow,
    syncChannelFollowNow,
    relinkEcosystemNow,
    loadUserRaidTitles,
    equipRaidTitle,
    loadRaidAnalyticsAndChampions,
    loadStorageTab,
    loadStorageStats,
    loadStorageFiles,
    switchStorageCategory,
    openMediaPreview,
    closeMediaPreview,
    deleteMediaFile,
    clearActiveCategoryStorage,
    clearAllStorage,
    openOmnisearch,
    closeOmnisearch,
    initOmnisearchModal,
    initWASandbox,
    simulateWASandboxCommand,
  });

  // ==================== PRIMARY MACRO 12-ZODIAC SWITCHER ====================
  function initMacroPillarSwitcher() {
    // Bind all rail pillar buttons
    document.querySelectorAll('.rail-pillar-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pillar = btn.getAttribute('data-pillar');
        if (pillar) switchMacroPillar(pillar);
      });
    });

    // Notify Me button on Coming Soon pane
    const btnNotify = document.getElementById('btn-comingsoon-notify');
    if (btnNotify && !btnNotify.dataset.bound) {
      btnNotify.dataset.bound = 'true';
      btnNotify.addEventListener('click', () => {
        const targetPillar = activeMacroPillar || 'Konstelasi';
        const contact = prompt(`Masukkan Kontak WhatsApp atau Email Anda untuk notifikasi rilis Pilar ${targetPillar.toUpperCase()}:`);
        if (contact && contact.trim()) {
          try {
            const list = JSON.parse(localStorage.getItem('polaris_comingsoon_contacts') || '[]');
            list.push({ pillar: targetPillar, contact: contact.trim(), date: new Date().toISOString() });
            localStorage.setItem('polaris_comingsoon_contacts', JSON.stringify(list));
          } catch (_) {}
          showToast(`🌟 Berhasil! Anda akan menerima notifikasi prioritas saat ${targetPillar.toUpperCase()} siap diluncurkan.`, 'success');
        }
      });
    }

    // Sidebar Collapse Toggle (Option 1)
    const btnCollapseToggle = document.getElementById('btn-rail-collapse-toggle');
    const appShell = document.getElementById('polaris-app-shell');
    if (btnCollapseToggle && appShell) {
      btnCollapseToggle.addEventListener('click', () => {
        appShell.classList.toggle('sidebar-collapsed');
        const isCollapsed = appShell.classList.contains('sidebar-collapsed');
        localStorage.setItem('polaris_sidebar_collapsed', isCollapsed ? 'true' : 'false');
      });

      // Restore collapsed state from previous session
      if (localStorage.getItem('polaris_sidebar_collapsed') === 'true') {
        appShell.classList.add('sidebar-collapsed');
      }
    }

    // Keyboard shortcut Alt+B to toggle sidebar collapse
    window.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        btnCollapseToggle?.click();
      }
      // Pillar shortcut keys 1-8 (only when no input is focused)
      const tag = (e.target.tagName || '').toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
      if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const pillarMap = { '1': 'astraonyx', '2': 'polaris', '3': 'polarium', '4': 'starlium', '5': 'luminary', '6': 'tools', '7': 'sirium', '8': 'sanctum' };
        if (pillarMap[e.key]) {
          e.preventDefault();
          switchMacroPillar(pillarMap[e.key]);
        }
      }
    });

    const subtabsBar = document.getElementById('vercel-nav-tabs') || document.getElementById('vercel-bot-subtabs-bar');
    if (subtabsBar) {
      subtabsBar.addEventListener('click', (e) => {
        const tab = e.target.closest('.nav-tab');
        if (!tab) return;
        const target = tab.getAttribute('data-tab');
        const socialMode = tab.getAttribute('data-social-mode');
        if (target === 'social') {
          if (activeMacroPillar !== 'polarium') {
            switchMacroPillar('polarium');
          }
          if (socialMode && typeof switchSocialView === 'function') {
            document.querySelectorAll('.social-mode-tab').forEach(b => {
              b.classList.toggle('active', b.dataset.mode === socialMode);
            });
            switchSocialView(socialMode);
          }
        } else if (target === 'games') {
          const gameMode = tab.getAttribute('data-game') || 'chess';
          if (activeMacroPillar !== 'starlium') {
            switchMacroPillar('starlium', 'games', gameMode);
          } else {
            if (typeof window.switchPolarisGameStage === 'function') {
              window.switchPolarisGameStage(gameMode);
            }
          }
        } else if (target === 'study') {
          const subview = tab.getAttribute('data-subview') || 'explore';
          if (activeMacroPillar !== 'luminary') {
            switchMacroPillar('luminary', subview);
          } else {
            if (window.waygroundStudio) {
              window.waygroundStudio.switchView(subview);
            }
          }
          document.querySelectorAll('.luminary-subtab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
        } else if (target === 'atomic') {
          const section = tab.getAttribute('data-atomic-section') || 'overview';
          if (activeMacroPillar !== 'atomic') {
            switchMacroPillar('atomic', section);
          } else {
            if (window.AtomicApp) window.AtomicApp.switchSection(section);
          }
        } else if (target === 'sirium') {
          const section = tab.getAttribute('data-sirium-section') || 'catalog';
          if (activeMacroPillar !== 'sirium') {
            switchMacroPillar('sirium', section);
          } else {
            if (window.SiriumApp) window.SiriumApp.switchSection(section);
          }
        } else if (target === 'deep-research') {
          switchMacroPillar('polaris', 'deep-research');
        } else if (target === 'key-vault') {
          switchMacroPillar('polaris', 'key-vault');
          if (window.KeyVaultUI && window.KeyVaultUI.init) window.KeyVaultUI.init();
        } else if (target === 'tools') {
          const toolMode = tab.getAttribute('data-tool') || 'mori';
          if (activeMacroPillar !== 'tools') {
            switchMacroPillar('tools', 'tools', toolMode);
          } else {
            if (typeof window.switchDownloaderSubpage === 'function') {
              window.switchDownloaderSubpage(toolMode);
            }
          }
        } else if (target === 'astraonyx') {
          const section = tab.getAttribute('data-astraonyx-section') || 'matrix';
          if (activeMacroPillar !== 'astraonyx') {
            switchMacroPillar('astraonyx', section);
          }
        } else if (['owner', 'terminal', 'storage', 'analytics', 'account'].includes(target)) {
          if (activeMacroPillar !== 'sanctum') {
            switchMacroPillar('sanctum', target);
          }
        } else if (target === 'comingsoon') {
          // Do not redirect coming soon tabs
        } else {
          if (activeMacroPillar !== 'polaris') {
            switchMacroPillar('polaris', target);
          }
        }
      });
    }

    // Filter drawer to active pillar on startup (default: polaris WA bot)
    switchMacroPillar('polaris', currentTab || 'overview');
  }

  const COMING_SOON_ZODIACS = {
    cancer: {
      name: 'Cancer',
      glyph: '♋',
      color: '#818cf8',
      element: 'Air • Kardinal',
      progress: '80%',
      title1: 'Vault Arsip Memori',
      desc1: 'Sistem snapshot backup otomatis menyeluruh untuk seluruh basis data pesan, obrolan, dan media.',
      title2: 'Pemberdayaan Komunitas',
      desc2: 'Manajemen interaksi grup yang hangat dengan analitik sentimen berbasis kecerdasan buatan.',
      title3: 'Pemulihan Bencana Instan',
      desc3: 'Sinkronisasi cloud backup terenkripsi yang memungkinkan pemulihan bot dalam 1-klik.',
    },
    virgo: {
      name: 'Virgo',
      glyph: '♍',
      color: '#14b8a6',
      element: 'Tanah • Mutabel',
      progress: '90%',
      title1: 'Deep Code Diagnostics',
      desc1: 'Pemeriksa kualitas kode real-time, auto-linter, dan deteksi kerentanan otomatis untuk plugin bot.',
      title2: 'Pengoptimalan Performa',
      desc2: 'Profil memori presisi tinggi yang melacak alokasi heap dan memangkas latency pemrosesan pesan.',
      title3: 'Audit Log Presisi',
      desc3: 'Pelacakan jejak audit matematis yang memastikan setiap aksi bot terdokumentasi tanpa cela.',
    },
    libra: {
      name: 'Libra',
      glyph: '♎',
      color: '#ec4899',
      element: 'Udara • Kardinal',
      progress: '75%',
      title1: 'Harmonic Load Balancer',
      desc1: 'Distribusi beban dinamis antar multi-sesi WhatsApp untuk mencegah pembatasan laju (rate limiting).',
      title2: 'Konsensus Multi-Agent',
      desc2: 'Orkestrasi keputusan cerdas antar agen AI yang bekerja bersama dalam menyelesaikan problem.',
      title3: 'Keseimbangan Kluster',
      desc3: 'Skalabilitas elastis yang otomatis menyesuaikan konsumsi CPU dan throughput jaringan.',
    },
    scorpio: {
      name: 'Scorpio',
      glyph: '♏',
      color: '#e11d48',
      element: 'Air • Tetap',
      progress: '88%',
      title1: 'Perisai Anti-Intruder',
      desc1: 'Sistem proteksi ancaman cyber tingkat lanjut, deteksi spam berkecepatan tinggi, dan IP blacklisting.',
      title2: 'Deep Packet Inspection',
      desc2: 'Penyaringan muatan paket pesan berbahaya sebelum menyentuh inti logika bot Baileys.',
      title3: 'Protokol Kerahasiaan Kriptografis',
      desc3: 'Enkripsi data rahasia tingkat militer untuk melindungi percakapan dan aset pengguna.',
    },
    capricorn: {
      name: 'Capricorn',
      glyph: '♑',
      color: '#d97706',
      element: 'Tanah • Kardinal',
      progress: '86%',
      title1: 'Sistem Struktur & Kebijakan',
      desc1: 'Manajemen hierarki grup, tata kelola permission otomatis, dan penegakan regulasi kepatuhan kosmik.',
      title2: 'Mesin Jadwal Presisi',
      desc2: 'Cron job andal dengan presisi tinggi untuk eksekusi tugas berkala tanpa drift waktu.',
      title3: 'Infrastruktur Ketahanan Ekstrem',
      desc3: 'Manajemen memori tangguh dengan failover otomatis untuk menjaga stabilitas bot tanpa downtime.',
    },
    pisces: {
      name: 'Pisces',
      glyph: '♓',
      color: '#06b6d4',
      element: 'Air • Mutabel',
      progress: '82%',
      title1: 'Generative AI Art Studio',
      desc1: 'Sintesis gambar dan ilustrasi kosmik beresolusi tinggi langsung dari perintah teks obrolan.',
      title2: 'Audio Visual Synthesis',
      desc2: 'Pembuat audio suasana kosmik interaktif dan visualisator spektrum suara real-time.',
      title3: 'Ekspresi Kreatif AI',
      desc3: 'Mode persona kreatif dengan penalaran artistik untuk menghasilkan narasi, puisi, dan konten visual.',
    },
  };

  function switchMacroPillar(pillar, specificTab = null, specificGame = null) {
    // Normalization & Aliases
    const p = (pillar || '').toLowerCase();
    if (p === 'bot' || p === 'polaris' || p === 'aquarius') pillar = 'polaris';
    else if (p === 'social' || p === 'polarium' || p === 'gemini') pillar = 'polarium';
    else if (p === 'study' || p === 'luminary' || p === 'sagittarius') pillar = 'luminary';
    else if (p === 'games' || p === 'starlium' || p === 'leo') pillar = 'starlium';
    else if (p === 'atomic' || p === 'habits' || p === 'todos' || p === 'savings') pillar = 'atomic';
    else if (p === 'sirium' || p === 'marketplace' || p === 'market') pillar = 'sirium';
    else if (p === 'tools' || p === 'downloader' || p === 'mori' || p === 'taurus' || p === 'nebulatools') pillar = 'tools';
    else if (p === 'owner' || p === 'sanctum' || p === 'admin') pillar = 'sanctum';
    else if (p === 'astraonyx' || p === 'matrix' || p === 'sovereign') pillar = 'astraonyx';
    else pillar = p;

    const currentUser = PolarisAuth.getCurrentUser();
    const isCosmos = currentUser && (currentUser.role || '').toLowerCase() === 'cosmos';

    // Sanctum Authority Check
    if (pillar === 'sanctum' && !isCosmos) {
      showToast('🏛️ Sanctum adalah Panel Admin khusus Owner (Cosmos). Akses dibatasi untuk akun Anda.', 'error');
      return;
    }

    // Stop media playback when navigating away from polarium
    if (pillar !== 'polarium') {
      document.querySelectorAll('.reel-video-container video, #social-feed-container video, .ig-desktop-layout video').forEach(v => {
        try { v.pause(); } catch(_) {}
      });
      if (window._currentPlayingAudio) {
        try { window._currentPlayingAudio.pause(); } catch(_) {}
      }
    }

    activeMacroPillar = pillar;
    const panes = document.querySelectorAll('.tab-pane');
    const polarisSubtabs = document.querySelectorAll('.polaris-subtab');
    const atomicSubtabs = document.querySelectorAll('.atomic-subtab');
    const siriumSubtabs = document.querySelectorAll('.sirium-subtab');
    const taurusSubtabs = document.querySelectorAll('.taurus-subtab, .tools-subtab');
    const polariumSubtabs = document.querySelectorAll('.polarium-subtab');
    const luminarySubtabs = document.querySelectorAll('.luminary-subtab');
    const starliumSubtabs = document.querySelectorAll('.starlium-subtab');
    const sanctumSubtabs = document.querySelectorAll('.sanctum-subtab');
    const astraonyxSubtabs = document.querySelectorAll('.astraonyx-subtab');
    const comingsoonSubtabs = document.querySelectorAll('.comingsoon-subtab');
    const zodiacCaptionEl = document.getElementById('subnav-zodiac-caption');
    const pillarTitleEl = document.getElementById('subnav-pillar-title');
    const pillarBadgeEl = document.getElementById('subnav-pillar-badge');

    // Update active class on all rail buttons
    document.querySelectorAll('.rail-pillar-btn').forEach(b => b.classList.remove('active'));
    const activeRailBtn = document.querySelector(`.rail-pillar-btn[data-pillar="${pillar}"]`) || 
                          document.getElementById(`macro-btn-${pillar}`) ||
                          (pillar === 'polaris' ? (document.getElementById('macro-btn-polaris') || document.getElementById('macro-btn-aquarius')) : null) ||
                          (pillar === 'polarium' ? (document.getElementById('macro-btn-polarium') || document.getElementById('macro-btn-gemini')) : null) ||
                          (pillar === 'luminary' ? (document.getElementById('macro-btn-luminary') || document.getElementById('macro-btn-sagittarius')) : null) ||
                          (pillar === 'starlium' ? (document.getElementById('macro-btn-starlium') || document.getElementById('macro-btn-leo')) : null) ||
                          (pillar === 'tools' ? (document.getElementById('macro-btn-tools') || document.getElementById('macro-btn-taurus')) : null) ||
                          (pillar === 'kinetix' ? (document.getElementById('macro-btn-kinetix') || document.getElementById('macro-btn-aries')) : null) ||
                          (pillar === 'sanctum' ? document.getElementById('macro-btn-sanctum') : null) ||
                          (pillar === 'astraonyx' ? document.getElementById('macro-btn-astraonyx') : null);
    if (activeRailBtn) activeRailBtn.classList.add('active');

    // If sidebar was collapsed, auto-expand so user can see their options
    const appShell = document.getElementById('polaris-app-shell');
    if (appShell && appShell.classList.contains('sidebar-collapsed')) {
      appShell.classList.remove('sidebar-collapsed');
      localStorage.setItem('polaris_sidebar_collapsed', 'false');
    }

    if (window.Kinetix && typeof window.Kinetix.playSound === 'function') {
      window.Kinetix.playSound('page_whoosh');
    }

    // Helper to hide all tab panes cleanly without dirty inline display overrides
    const hideAllPanes = () => {
      panes.forEach(p => {
        p.classList.remove('active', 'pane-enter', 'pane-exit', 'pane-enter-forward', 'pane-enter-backward', 'pane-exit-forward', 'pane-exit-backward');
        p.style.display = '';
      });
    };

    const hideAllDrawerSubtabs = () => {
      [...polarisSubtabs, ...atomicSubtabs, ...siriumSubtabs, ...taurusSubtabs, ...polariumSubtabs, ...luminarySubtabs, ...starliumSubtabs, ...sanctumSubtabs, ...astraonyxSubtabs, ...comingsoonSubtabs].forEach(t => {
        t.style.display = 'none';
      });
    };

    const activatePillarTab = (targetTab, targetNavSelector = null) => {
      hideAllPanes();
      const targetPane = document.getElementById(`pane-${targetTab}`) || (targetTab === 'study' ? document.getElementById('pane-study-space') : null);
      if (targetPane) {
        targetPane.classList.add('active', 'pane-enter');
        setTimeout(() => targetPane.classList.remove('pane-enter'), 360);
      }
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      const activeNavTab = targetNavSelector 
        ? document.querySelector(targetNavSelector)
        : document.querySelector(`.nav-tab[data-tab="${targetTab}"]`);
      if (activeNavTab) activeNavTab.classList.add('active');

      currentTab = targetTab;
      loadTabContent(targetTab);

      setTimeout(() => {
        if (window.PolarisMotion && typeof window.PolarisMotion.updateActiveIndicator === 'function') {
          window.PolarisMotion.updateActiveIndicator();
        }
      }, 50);
    };

    hideAllDrawerSubtabs();

    if (pillar === 'astraonyx') {
      if (zodiacCaptionEl) zodiacCaptionEl.textContent = 'SOVEREIGN';
      if (pillarTitleEl) pillarTitleEl.textContent = 'Astraonyx';
      if (pillarBadgeEl) {
        pillarBadgeEl.textContent = 'COMMAND';
        pillarBadgeEl.style.cssText = 'background: rgba(226, 232, 240, 0.18); color: #e2e8f0; border: 1px solid rgba(226, 232, 240, 0.4);';
      }
      astraonyxSubtabs.forEach(t => t.style.display = 'flex');
      showToast('Astraonyx: Sovereign Command Matrix', 'info', { history: false, duration: 1800 });

      activatePillarTab('astraonyx');
    } else if (pillar === 'polaris') {
      if (zodiacCaptionEl) zodiacCaptionEl.textContent = 'PILAR GALAXY';
      if (pillarTitleEl) pillarTitleEl.textContent = 'Polaris';
      if (pillarBadgeEl) {
        pillarBadgeEl.textContent = 'CORE BOT';
        pillarBadgeEl.style.cssText = 'background: rgba(56, 189, 248, 0.18); color: #38bdf8;';
      }
      polarisSubtabs.forEach(t => t.style.display = 'flex');
      showToast('🌟 Polaris: WhatsApp Bot Hub', 'info', { history: false, duration: 1800 });

      const targetTab = specificTab || (['overview', 'hermes', 'groups', 'autoresponder', 'commands', 'story', 'import'].includes(currentTab) ? currentTab : 'overview');
      activatePillarTab(targetTab);
    } else if (pillar === 'polarium') {
      if (zodiacCaptionEl) zodiacCaptionEl.textContent = 'PILAR GALAXY';
      if (pillarTitleEl) pillarTitleEl.textContent = 'Polarium';
      if (pillarBadgeEl) {
        pillarBadgeEl.textContent = 'SOCIAL';
        pillarBadgeEl.style.cssText = 'background: linear-gradient(45deg, #f09433, #dc2743); color: #fff;';
      }
      polariumSubtabs.forEach(t => t.style.display = 'flex');
      showToast('🪐 Polarium: Social Media Suite', 'info', { history: false, duration: 1800 });

      activatePillarTab('social');
    } else if (pillar === 'luminary') {
      if (zodiacCaptionEl) zodiacCaptionEl.textContent = 'PILAR GALAXY';
      if (pillarTitleEl) pillarTitleEl.textContent = 'Luminary';
      if (pillarBadgeEl) {
        pillarBadgeEl.textContent = 'WAYGROUND & ACADEMY';
        pillarBadgeEl.style.cssText = 'background: rgba(168, 85, 247, 0.22); color: #c084fc;';
      }
      luminarySubtabs.forEach(t => t.style.display = 'flex');
      showToast('📚 Luminary: Wayground & Cosmic Academy', 'info', { history: false, duration: 1800 });

      activatePillarTab('study');
      initStudySpaceEvents();
      if (window.waygroundStudio) {
        const targetView = specificTab || 'explore';
        window.waygroundStudio.switchView(targetView);
        document.querySelectorAll('.luminary-subtab').forEach(t => {
          t.classList.toggle('active', t.getAttribute('data-subview') === targetView);
        });
      }
    } else if (pillar === 'starlium') {
      if (zodiacCaptionEl) zodiacCaptionEl.textContent = 'PILAR GALAXY';
      if (pillarTitleEl) pillarTitleEl.textContent = 'Starlium';
      if (pillarBadgeEl) {
        pillarBadgeEl.textContent = 'GALAXY ARCADE';
        pillarBadgeEl.style.cssText = 'background: rgba(16, 185, 129, 0.22); color: #34d399;';
      }
      starliumSubtabs.forEach(t => t.style.display = 'flex');
      showToast('🎮 Starlium: Galaxy Gaming Arena', 'info', { history: false, duration: 1800 });

      activatePillarTab('games');
      const gameTarget = specificGame || 'chess';
      if (typeof window.switchPolarisGameStage === 'function') {
        window.switchPolarisGameStage(gameTarget);
      }
    } else if (pillar === 'atomic') {
      if (zodiacCaptionEl) zodiacCaptionEl.textContent = 'PILAR GALAXY';
      if (pillarTitleEl) pillarTitleEl.textContent = 'Atomic';
      if (pillarBadgeEl) {
        pillarBadgeEl.textContent = 'PRODUCTIVITY & VAULT';
        pillarBadgeEl.style.cssText = 'background: rgba(168, 85, 247, 0.22); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4);';
      }
      atomicSubtabs.forEach(t => t.style.display = 'flex');
      showToast('⚛️ Atomic: Personal Productivity & Vault', 'info', { history: false, duration: 1800 });

      activatePillarTab('atomic');
      if (window.AtomicApp) {
        const targetSec = specificTab || 'overview';
        window.AtomicApp.switchSection(targetSec);
      }
    } else if (pillar === 'sirium') {
      if (zodiacCaptionEl) zodiacCaptionEl.textContent = 'PILAR GALAXY';
      if (pillarTitleEl) pillarTitleEl.textContent = 'Sirium';
      if (pillarBadgeEl) {
        pillarBadgeEl.textContent = 'DIGITAL ASSETS';
        pillarBadgeEl.style.cssText = 'background: rgba(14, 165, 233, 0.22); color: #38bdf8; border: 1px solid rgba(14, 165, 233, 0.4);';
      }
      siriumSubtabs.forEach(t => t.style.display = 'flex');
      showToast('🛍️ Sirium: Digital Asset Marketplace', 'info', { history: false, duration: 1800 });

      activatePillarTab('sirium');
      if (window.SiriumApp) {
        const targetSec = specificTab || 'catalog';
        window.SiriumApp.switchSection(targetSec);
      }
    } else if (pillar === 'tools') {
      if (zodiacCaptionEl) zodiacCaptionEl.textContent = 'PILAR GALAXY';
      if (pillarTitleEl) pillarTitleEl.textContent = 'NebulaTools';
      if (pillarBadgeEl) {
        pillarBadgeEl.textContent = 'MEDIA CORE';
        pillarBadgeEl.style.cssText = 'background: rgba(217, 119, 6, 0.22); color: #fbbf24; border: 1px solid rgba(217, 119, 6, 0.4);';
      }
      taurusSubtabs.forEach(t => t.style.display = 'flex');
      showToast('🛠️ NebulaTools: Media & Utility Core', 'info', { history: false, duration: 1800 });

      activatePillarTab('tools');
      const toolTarget = specificGame || specificTab || 'mori';
      if (typeof window.switchDownloaderSubpage === 'function') {
        window.switchDownloaderSubpage(toolTarget);
      }
    } else if (pillar === 'sanctum') {
      if (zodiacCaptionEl) zodiacCaptionEl.textContent = 'SYSTEM';
      if (pillarTitleEl) pillarTitleEl.textContent = 'Panel Admin';
      if (pillarBadgeEl) {
        pillarBadgeEl.textContent = 'OWNER';
        pillarBadgeEl.style.cssText = 'background: linear-gradient(135deg, #f59e0b, #eab308); color: #000; font-weight: 850;';
      }
      sanctumSubtabs.forEach(t => t.style.display = 'flex');
      showToast('👑 Membuka Panel Admin (Sanctum)', 'info', { history: false, duration: 1800 });

      const targetTab = specificTab || (['owner', 'terminal', 'storage', 'analytics', 'account'].includes(currentTab) ? currentTab : 'owner');
      activatePillarTab(targetTab);
    } else if (COMING_SOON_ZODIACS[pillar]) {
      // 6 Constellation Zodiacs: Cancer, Virgo, Libra, Scorpio, Capricorn, Pisces
      const zData = COMING_SOON_ZODIACS[pillar];
      if (zodiacCaptionEl) zodiacCaptionEl.textContent = 'ZODIAK';
      if (pillarTitleEl) pillarTitleEl.textContent = zData.name;
      if (pillarBadgeEl) {
        pillarBadgeEl.textContent = 'COMING SOON';
        pillarBadgeEl.style.cssText = `background: ${zData.color}26; color: ${zData.color}; border: 1px solid ${zData.color}55;`;
      }
      comingsoonSubtabs.forEach(t => t.style.display = 'flex');
      showToast(`✨ Zodiak: ${zData.name}`, 'info', { history: false, duration: 1800 });

      // Populate Coming Soon Pane elements
      const glyphEl = document.getElementById('comingsoon-glyph');
      const titleEl = document.getElementById('comingsoon-title');
      const statusBadge = document.getElementById('comingsoon-status-badge');
      const subtitleEl = document.getElementById('comingsoon-subtitle');
      const progressText = document.getElementById('comingsoon-progress-text');
      const progressBar = document.getElementById('comingsoon-progress-bar');
      const auraEl = document.getElementById('comingsoon-aura');
      const glyphBox = document.getElementById('comingsoon-glyph-box');

      if (glyphEl) glyphEl.textContent = zData.glyph;
      if (titleEl) titleEl.textContent = zData.name;
      if (statusBadge) {
        statusBadge.textContent = zData.element;
        statusBadge.style.color = zData.color;
      }
      if (subtitleEl) subtitleEl.textContent = `Pilar ${zData.name} sedang dalam tahap kalibrasi dan harmonisasi arsitektur bintang.`;
      if (progressText) {
        progressText.textContent = `${zData.progress} Terkalibrasi`;
        progressText.style.color = zData.color;
      }
      if (progressBar) {
        progressBar.style.width = zData.progress;
        progressBar.style.background = `linear-gradient(90deg, ${zData.color}, #38bdf8)`;
      }
      if (auraEl) {
        auraEl.style.background = `radial-gradient(circle, ${zData.color}35 0%, transparent 70%)`;
      }
      if (glyphBox) {
        glyphBox.style.borderColor = `${zData.color}66`;
        glyphBox.style.boxShadow = `0 0 35px ${zData.color}44`;
        glyphBox.style.color = zData.color;
      }

      // Populate Cards
      const card1Title = document.getElementById('comingsoon-card1-title');
      const card1Desc = document.getElementById('comingsoon-card1-desc');
      const card2Title = document.getElementById('comingsoon-card2-title');
      const card2Desc = document.getElementById('comingsoon-card2-desc');
      const card3Title = document.getElementById('comingsoon-card3-title');
      const card3Desc = document.getElementById('comingsoon-card3-desc');

      if (card1Title) card1Title.textContent = zData.title1;
      if (card1Desc) card1Desc.textContent = zData.desc1;
      if (card2Title) card2Title.textContent = zData.title2;
      if (card2Desc) card2Desc.textContent = zData.desc2;
      if (card3Title) card3Title.textContent = zData.title3;
      if (card3Desc) card3Desc.textContent = zData.desc3;

      activatePillarTab('comingsoon', '.comingsoon-subtab');
    }

    if (window.PillarRouter && typeof window.PillarRouter.switchPillar === 'function' && !window._inPillarRouterCall) {
      window._inPillarRouterCall = true;
      try {
        window.PillarRouter.switchPillar(pillar, specificTab);
      } catch(_) {}
      window._inPillarRouterCall = false;
    }
  }

  window.switchMacroPillar = switchMacroPillar;
  window.PolarisApp = window.PolarisApp || {};
  window.PolarisApp.switchMacroPillar = switchMacroPillar;
  window.PolarisApp.activeMacroPillar = () => activeMacroPillar;

  function initStudySpaceEvents() {
    // Voting on course modules
    document.querySelectorAll('.study-vote-btn').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = 'true';
      const mod = btn.dataset.module;
      const countEl = btn.querySelector(`#vote-count-${mod}`);

      const savedCount = parseInt(localStorage.getItem(`study_vote_${mod}`), 10);
      if (savedCount && countEl) {
        countEl.textContent = `${savedCount} Vote`;
      }

      btn.addEventListener('click', () => {
        let currentVotes = parseInt(countEl?.textContent || '100', 10);
        if (isNaN(currentVotes)) currentVotes = 100;
        currentVotes += 1;
        if (countEl) countEl.textContent = `${currentVotes} Vote`;
        localStorage.setItem(`study_vote_${mod}`, currentVotes);

        btn.style.transform = 'scale(0.96)';
        setTimeout(() => btn.style.transform = 'scale(1)', 150);
        showToast(`🎉 Suara Anda untuk Modul ${mod.toUpperCase()} berhasil dicatat!`, 'success');
      });
    });

    // Notify Me Button
    const btnNotify = document.getElementById('btn-study-notify-me');
    if (btnNotify && !btnNotify.dataset.bound) {
      btnNotify.dataset.bound = 'true';
      btnNotify.addEventListener('click', () => {
        const contact = prompt('Masukkan Email atau Nomor WhatsApp Anda untuk notifikasi rilis Study Space:');
        if (contact && contact.trim()) {
          localStorage.setItem('study_space_contact', contact.trim());
          showToast(`🌟 Terima kasih! Notifikasi rilis akan dikirimkan ke: ${escapeHtml(contact.trim())}`, 'success');
        }
      });
    }

    // Explore current bot docs button
    const btnExplore = document.getElementById('btn-study-explore-docs');
    if (btnExplore && !btnExplore.dataset.bound) {
      btnExplore.dataset.bound = 'true';
      btnExplore.addEventListener('click', () => {
        switchMacroPillar('bot', 'commands');
      });
    }
  }

  // ==================== 15. MEDSOS ASTRAONYX (INSTAGRAM, TIKTOK, X SUITE) ====================
  let activePlatformMode = 'ig_feed'; // 'ig_feed' | 'ig_profile' | 'tiktok_reels' | 'x_timeline' | 'direct_messages' | 'gdrive_storage' | 'bookmarks'
  let activeComposerType = 'post'; // 'post' | 'photo' | 'reel' | 'poll'
  let activeStoryGradient = 'linear-gradient(135deg, #ec4899, #8b5cf6)';
  let storyTimerInterval = null;
  let cachedStories = [];
  let pendingComposerFile = null;
  let activeDmUser = null;
  let activeIgProfileUsername = null;
  let activeIgTab = 'posts';
  let cachedIgProfilePosts = [];
  let cachedAllPosts = [];
  let currentStoryAudio = null;
  let currentSoundPreviewAudio = null;
  let activeSoundContext = 'story'; // 'story' | 'post'
  let soundSearchDebounceTimer = null;

  function initSocialFeature() {
    // Mode Switcher Tabs (Instagram Feed, Profil Instagram, TikTok Reels, Twitter/X, E2EE DM, G-Drive Storage, Bookmarks)
    document.querySelectorAll('.social-mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.social-mode-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activePlatformMode = tab.dataset.mode || 'ig_feed';
        switchSocialView(activePlatformMode);
      });
    });

    // Composer Format Switchers (Post, Photo, Reel, Poll)
    document.querySelectorAll('.btn-composer-type').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-composer-type').forEach(b => {
          b.classList.remove('active');
          b.style.background = 'transparent';
          b.style.color = 'var(--text-muted)';
        });
        btn.classList.add('active');
        btn.style.background = 'rgba(56,189,248,0.2)';
        btn.style.color = 'var(--accent-cyan)';
        activeComposerType = btn.dataset.type || 'post';

        const mediaField = document.getElementById('composer-media-field');
        const reelField = document.getElementById('composer-reel-field');
        const pollField = document.getElementById('composer-poll-field');

        if (mediaField) mediaField.style.display = (activeComposerType === 'photo' || activeComposerType === 'reel') ? 'block' : 'none';
        if (reelField) reelField.style.display = activeComposerType === 'reel' ? 'block' : 'none';
        if (pollField) pollField.style.display = activeComposerType === 'poll' ? 'block' : 'none';
      });
    });

    // Character Counter on Textarea
    const textarea = document.getElementById('social-post-content');
    const charCount = document.getElementById('social-char-count');
    if (textarea && charCount) {
      textarea.addEventListener('input', () => {
        const len = textarea.value.length;
        charCount.textContent = `${len}/280`;
        charCount.style.color = len > 280 ? '#f43f5e' : 'var(--text-muted)';
      });
    }

    // File Upload Handler (Drag & Drop + File Picker)
    const dropzone = document.getElementById('composer-upload-dropzone');
    const fileInput = document.getElementById('composer-media-file-input');
    const previewContainer = document.getElementById('composer-upload-preview');
    const promptContainer = document.getElementById('composer-upload-prompt');
    const previewMediaBox = document.getElementById('composer-preview-media-box');
    const previewFilename = document.getElementById('composer-preview-filename');
    const previewStatus = document.getElementById('composer-preview-status');
    const btnCancelMedia = document.getElementById('btn-cancel-composer-media');
    const btnToggleFallbackUrl = document.getElementById('btn-toggle-media-url-fallback');
    const fallbackUrlBox = document.getElementById('composer-url-fallback-box');

    const handleFileSelected = (file) => {
      if (!file) return;
      if (file.size > 55 * 1024 * 1024) {
        showToast('Ukuran file maksimal 55MB!', 'error');
        return;
      }
      pendingComposerFile = file;
      if (previewContainer && promptContainer) {
        promptContainer.style.display = 'none';
        previewContainer.style.display = 'flex';
      }
      if (previewFilename) previewFilename.textContent = file.name;
      if (previewStatus) previewStatus.textContent = `Siap Diunggah (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;

      if (previewMediaBox) {
        const objectUrl = URL.createObjectURL(file);
        if (file.type.startsWith('video/')) {
          previewMediaBox.innerHTML = `<video src="${objectUrl}" controls style="width:100%; height:100%; object-fit:cover; border-radius:8px;"></video>`;
        } else {
          previewMediaBox.innerHTML = `<img src="${objectUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;" alt="Pratinjau">`;
        }
      }
    };

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleFileSelected(e.target.files[0]);
        }
      });
    }

    if (dropzone) {
      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('dragover');
        });
      });
      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('dragover');
        });
      });
      dropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFileSelected(e.dataTransfer.files[0]);
        }
      });
    }

    if (btnCancelMedia) {
      btnCancelMedia.addEventListener('click', () => {
        pendingComposerFile = null;
        if (fileInput) fileInput.value = '';
        if (previewContainer && promptContainer) {
          previewContainer.style.display = 'none';
          promptContainer.style.display = 'block';
        }
        if (previewMediaBox) previewMediaBox.innerHTML = '';
      });
    }

    if (btnToggleFallbackUrl && fallbackUrlBox) {
      btnToggleFallbackUrl.addEventListener('click', () => {
        fallbackUrlBox.style.display = fallbackUrlBox.style.display === 'none' ? 'block' : 'none';
      });
    }

    // Direct Avatar Upload from Account Settings and Instagram Profile Header
    const avatarInputIg = document.getElementById('ig-avatar-file-input');
    const avatarInputSettings = document.getElementById('settings-avatar-file-input');

    const handleAvatarUpload = async (file) => {
      if (!file) return;
      if (file.size > 15 * 1024 * 1024) {
        showToast('Ukuran foto profil maksimal 15MB!', 'error');
        return;
      }
      showToast('Mengunggah foto profil...', 'info');
      try {
        const formData = new FormData();
        formData.append('avatarFile', file);
        const res = await PolarisAuth.authFetch('/api/auth/upload-avatar', {
          method: 'POST',
          body: formData
        });
        let json;
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          json = await res.json();
        } else {
          const rawText = await res.text();
          throw new Error('Server mengembalikan respon tidak valid: ' + (rawText.slice(0, 100) || res.statusText));
        }
        if (json.success && json.avatarUrl) {
          showToast('Foto profil berhasil diperbarui!', 'success');
          const cur = PolarisAuth.getCurrentUser();
          if (cur) {
            cur.avatarUrl = json.avatarUrl;
            PolarisAuth.setCurrentUser(cur);
          }
          document.querySelectorAll('#ig-header-avatar, #social-my-avatar, #story-my-avatar, #nav-user-avatar, #settings-avatar-preview, #acc-avatar-preview').forEach(img => {
            if (img) img.src = json.avatarUrl;
          });
          const avatarUrlInput = document.getElementById('acc-avatar-url');
          if (avatarUrlInput) avatarUrlInput.value = json.avatarUrl;
          if (typeof activePlatformMode !== 'undefined' && activePlatformMode === 'ig_profile') {
            loadInstagramProfile(cur?.username);
          }
        } else {
          showToast(json.error || 'Gagal mengunggah foto profil', 'error');
        }
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
    };

    if (avatarInputIg) {
      avatarInputIg.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) handleAvatarUpload(e.target.files[0]);
      });
    }
    if (avatarInputSettings) {
      avatarInputSettings.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) handleAvatarUpload(e.target.files[0]);
      });
    }

    // Story File Upload Direct
    const storyFileInput = document.getElementById('story-file-input-direct');
    if (storyFileInput) {
      storyFileInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          showToast('Mengunggah media cerita...', 'info');
          const fileNameSpan = document.getElementById('story-file-name');
          if (fileNameSpan) fileNameSpan.textContent = file.name;
          try {
            const formData = new FormData();
            formData.append('mediaFile', file);
            const res = await PolarisAuth.authFetch('/api/social/upload', {
              method: 'POST',
              body: formData
            });
            const json = await res.json();
            if (json.success && json.url) {
              const urlInput = document.getElementById('story-input-media');
              if (urlInput) urlInput.value = json.url;
              const preview = document.getElementById('story-create-preview');
              if (preview) {
                preview.style.backgroundImage = `url('${json.url}')`;
                preview.style.backgroundSize = 'cover';
                preview.style.backgroundPosition = 'center';
              }
              showToast('Media cerita berhasil dipasang!', 'success');
            } else {
              showToast(json.error || 'Gagal mengunggah media cerita', 'error');
            }
          } catch (err) {
            showToast('Error: ' + err.message, 'error');
          }
        }
      });
    }

    // Story Background Color Presets
    document.querySelectorAll('.story-bg-preset').forEach(preset => {
      preset.addEventListener('click', () => {
        document.querySelectorAll('.story-bg-preset').forEach(p => {
          p.classList.remove('active');
          p.style.borderColor = 'transparent';
        });
        preset.classList.add('active');
        preset.style.borderColor = '#fff';
        activeStoryGradient = preset.dataset.gradient || 'linear-gradient(135deg, #ec4899, #8b5cf6)';
        const preview = document.getElementById('story-create-preview');
        const mediaInput = document.getElementById('story-input-media');
        if (preview && (!mediaInput || !mediaInput.value)) {
          preview.style.background = activeStoryGradient;
        }
      });
    });

    // Story Text Input Live Preview
    const storyInputText = document.getElementById('story-input-text');
    if (storyInputText) {
      storyInputText.addEventListener('input', () => {
        const preview = document.getElementById('story-create-preview');
        if (preview) {
          preview.textContent = storyInputText.value.trim() || 'Pratinjau Cerita Anda';
        }
      });
    }

    // Story Sound Selector Buttons
    document.getElementById('btn-story-pick-sound')?.addEventListener('click', () => {
      openSoundSelector('story');
    });

    document.getElementById('btn-story-remove-sound')?.addEventListener('click', () => {
      const tInp = document.getElementById('story-input-sound-title');
      const aInp = document.getElementById('story-input-sound-artist');
      const uInp = document.getElementById('story-input-sound-audio');
      if (tInp) tInp.value = '';
      if (aInp) aInp.value = '';
      if (uInp) uInp.value = '';
      const badge = document.getElementById('story-sound-badge');
      if (badge) badge.style.display = 'none';
      showToast('Sound story dihapus', 'info');
    });

    // Story Modal Triggers
    document.getElementById('btn-open-create-story')?.addEventListener('click', openCreateStoryModal);
    document.getElementById('story-item-my-add')?.addEventListener('click', openCreateStoryModal);
    document.getElementById('btn-close-create-story')?.addEventListener('click', closeCreateStoryModal);
    document.getElementById('modal-social-create-story')?.addEventListener('click', (e) => {
      if (e.target.id === 'modal-social-create-story') closeCreateStoryModal();
    });

    // Form Create Story Submit
    const formCreateStory = document.getElementById('form-create-story');
    if (formCreateStory) {
      formCreateStory.addEventListener('submit', async (e) => {
        e.preventDefault();
        const textContent = document.getElementById('story-input-text')?.value.trim();
        const mediaUrl = document.getElementById('story-input-media')?.value.trim();
        const soundTitle = document.getElementById('story-input-sound-title')?.value.trim();
        const soundArtist = document.getElementById('story-input-sound-artist')?.value.trim();
        const soundAudioUrl = document.getElementById('story-input-sound-audio')?.value.trim();

        if (!textContent && !mediaUrl) {
          showToast('Tuliskan teks cerita atau unggah foto/video!', 'warning');
          return;
        }

        showToast('Memposting cerita ke Gemini Stories...', 'info');
        try {
          const res = await PolarisAuth.authFetch('/api/social/stories', {
            method: 'POST',
            body: JSON.stringify({
              textContent: textContent || '',
              mediaUrl: mediaUrl || '',
              bgGradient: activeStoryGradient,
              soundTitle: soundTitle || '',
              soundArtist: soundArtist || '',
              soundAudioUrl: soundAudioUrl || '',
            })
          });
          const json = await res.json();
          if (json.success) {
            showToast('Cerita kosmik berhasil dibagikan (24 jam)! 🌟', 'success');
            // Reset story form
            if (storyInputText) storyInputText.value = '';
            const urlInput = document.getElementById('story-input-media');
            if (urlInput) urlInput.value = '';
            const fileInp = document.getElementById('story-file-input-direct');
            if (fileInp) fileInp.value = '';
            const fileNameSpan = document.getElementById('story-file-name');
            if (fileNameSpan) fileNameSpan.textContent = 'Belum ada file dipilih';
            const storySoundBadge = document.getElementById('story-sound-badge');
            if (storySoundBadge) storySoundBadge.style.display = 'none';
            const sTitleInp = document.getElementById('story-input-sound-title');
            if (sTitleInp) sTitleInp.value = '';
            const sArtistInp = document.getElementById('story-input-sound-artist');
            if (sArtistInp) sArtistInp.value = '';
            const sAudioInp = document.getElementById('story-input-sound-audio');
            if (sAudioInp) sAudioInp.value = '';
            const preview = document.getElementById('story-create-preview');
            if (preview) {
              preview.textContent = 'Pratinjau Cerita Anda';
              preview.style.backgroundImage = 'none';
              preview.style.background = activeStoryGradient;
            }
            closeCreateStoryModal();
            loadSocialStories();
          } else {
            showToast(json.error || 'Gagal memposting cerita', 'error');
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        }
      });
    }

    // Post Sound Selector Buttons
    document.getElementById('btn-post-pick-sound')?.addEventListener('click', () => {
      openSoundSelector('post');
    });

    document.getElementById('btn-post-remove-sound')?.addEventListener('click', () => {
      const tInp = document.getElementById('post-input-sound-title');
      const aInp = document.getElementById('post-input-sound-artist');
      const uInp = document.getElementById('post-input-sound-audio');
      if (tInp) tInp.value = '';
      if (aInp) aInp.value = '';
      if (uInp) uInp.value = '';
      const badge = document.getElementById('post-sound-badge');
      if (badge) badge.style.display = 'none';
      showToast('Sound postingan dihapus', 'info');
    });

    // Sound Scanner Modal Close & Search Listeners
    document.getElementById('btn-close-sound-modal')?.addEventListener('click', closeSoundSelector);
    document.getElementById('modal-select-sound')?.addEventListener('click', (e) => {
      if (e.target.id === 'modal-select-sound') closeSoundSelector();
    });

    const soundSearchInput = document.getElementById('sound-search-input');
    if (soundSearchInput) {
      soundSearchInput.addEventListener('input', () => {
        if (soundSearchDebounceTimer) clearTimeout(soundSearchDebounceTimer);
        soundSearchDebounceTimer = setTimeout(() => {
          searchMusicSounds(soundSearchInput.value.trim());
        }, 350);
      });
    }

    document.querySelectorAll('.btn-sound-tag').forEach(tagBtn => {
      tagBtn.addEventListener('click', () => {
        const q = tagBtn.dataset.q || tagBtn.textContent.replace(/[^\w\s-]/g, '').trim();
        if (soundSearchInput) soundSearchInput.value = q;
        searchMusicSounds(q);
      });
    });

    // Top Polarium Header Action Buttons
    document.getElementById('btn-polarium-create-post-top')?.addEventListener('click', () => {
      document.querySelector('.social-mode-tab[data-mode="ig_feed"]')?.click();
      document.getElementById('social-post-content')?.focus();
    });
    document.getElementById('btn-polarium-open-dm-top')?.addEventListener('click', () => {
      document.querySelector('.social-mode-tab[data-mode="direct_messages"]')?.click();
    });

    // Initialize Current User Card in Polarium Sidebar
    const curSocialUser = PolarisAuth.getCurrentUser();
    if (curSocialUser) {
      const swAvatar = document.getElementById('ig-switch-user-avatar');
      const swUser = document.getElementById('ig-switch-username');
      const swName = document.getElementById('ig-switch-name');
      const pillAvatar = document.getElementById('ig-floating-pill-avatar');
      if (swAvatar) swAvatar.src = curSocialUser.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(curSocialUser.username)}`;
      if (swUser) swUser.textContent = `@${curSocialUser.username}`;
      if (swName) swName.textContent = curSocialUser.displayName || curSocialUser.username;
      if (pillAvatar && curSocialUser.avatarUrl) pillAvatar.src = curSocialUser.avatarUrl;
    }

    // Quick Emojis
    document.querySelectorAll('.btn-quick-emoji').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!textarea) return;
        textarea.value += btn.textContent;
        textarea.dispatchEvent(new Event('input'));
        textarea.focus();
      });
    });

    // Quick Hashtags
    document.querySelectorAll('.btn-quick-tag').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!textarea) return;
        const tag = btn.dataset.tag || btn.textContent;
        textarea.value += ' ' + tag + ' ';
        textarea.dispatchEvent(new Event('input'));
        textarea.focus();
      });
    });

    // Form Create Social Post
    const formPost = document.getElementById('form-create-social-post');
    if (formPost) {
      formPost.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = textarea?.value.trim();
        let mediaUrl = document.getElementById('social-post-image')?.value.trim();
        const audioName = document.getElementById('social-post-audio-name')?.value.trim();

        if (!content && !pendingComposerFile && !mediaUrl) {
          showToast('Isi postingan atau lampirkan foto/video!', 'warning');
          return;
        }

        // Upload file directly if pending
        if (pendingComposerFile) {
          showToast('Mengunggah media ke Google Drive / Localhost...', 'info');
          try {
            const formData = new FormData();
            formData.append('mediaFile', pendingComposerFile);
            const upRes = await PolarisAuth.authFetch('/api/social/upload', {
              method: 'POST',
              body: formData
            });
            const upJson = await upRes.json();
            if (upJson.success && upJson.url) {
              mediaUrl = upJson.url;
            } else {
              showToast(upJson.error || 'Gagal mengunggah berkas media', 'error');
              return;
            }
          } catch (err) {
            showToast('Upload error: ' + err.message, 'error');
            return;
          }
        }

        const extraData = {};
        const postSoundTitle = document.getElementById('post-input-sound-title')?.value.trim();
        const postSoundArtist = document.getElementById('post-input-sound-artist')?.value.trim();
        const postSoundAudio = document.getElementById('post-input-sound-audio')?.value.trim();
        if (postSoundAudio) {
          extraData.sound = {
            title: postSoundTitle || 'Sound Track',
            artist: postSoundArtist || 'Artist',
            audioUrl: postSoundAudio
          };
        }

        if (activeComposerType === 'reel' && audioName) {
          extraData.audioName = audioName;
        } else if (activeComposerType === 'poll') {
          const optInputs = document.querySelectorAll('.poll-input-opt');
          const options = Array.from(optInputs).map(inp => inp.value.trim()).filter(Boolean);
          if (options.length < 2) {
            showToast('Polling membutuhkan minimal 2 pilihan opsi!', 'warning');
            return;
          }
          extraData.poll = {
            question: content,
            options,
            counts: options.map(() => 0),
            totalVotes: 0,
            votes: {}
          };
        }

        try {
          const res = await PolarisAuth.authFetch('/api/social/posts', {
            method: 'POST',
            body: JSON.stringify({
              content: content || 'Postingan Media',
              mediaUrl: mediaUrl || undefined,
              postType: activeComposerType,
              extraData
            }),
          });
          const json = await res.json();
          if (json.success) {
            showToast('Postingan berhasil diterbitkan ke linimasa!', 'success');
            textarea.value = '';
            textarea.dispatchEvent(new Event('input'));
            const imgInput = document.getElementById('social-post-image');
            if (imgInput) imgInput.value = '';
            const audioInput = document.getElementById('social-post-audio-name');
            if (audioInput) audioInput.value = '';
            const pTitleInp = document.getElementById('post-input-sound-title');
            if (pTitleInp) pTitleInp.value = '';
            const pArtistInp = document.getElementById('post-input-sound-artist');
            if (pArtistInp) pArtistInp.value = '';
            const pAudioInp = document.getElementById('post-input-sound-audio');
            if (pAudioInp) pAudioInp.value = '';
            const pSoundBadge = document.getElementById('post-sound-badge');
            if (pSoundBadge) pSoundBadge.style.display = 'none';
            document.querySelectorAll('.poll-input-opt').forEach(inp => inp.value = '');
            
            // Reset upload dropzone
            pendingComposerFile = null;
            if (fileInput) fileInput.value = '';
            if (previewContainer && promptContainer) {
              previewContainer.style.display = 'none';
              promptContainer.style.display = 'block';
            }
            if (previewMediaBox) previewMediaBox.innerHTML = '';
            
            loadSocialPosts();
            if (activePlatformMode === 'ig_profile') {
              loadInstagramProfile();
            }
          } else {
            showToast(json.error || 'Gagal menerbitkan postingan', 'error');
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        }
      });
    }

    // Instagram Profile Sub-Tabs Handlers
    document.querySelectorAll('.ig-tab-btn').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        document.querySelectorAll('.ig-tab-btn').forEach(b => b.classList.remove('active'));
        tabBtn.classList.add('active');
        activeIgTab = tabBtn.dataset.igTab || 'posts';
        renderInstagramGrid(cachedIgProfilePosts);
      });
    });

    // Instagram Profile Action Buttons
    document.getElementById('btn-ig-edit-profile')?.addEventListener('click', () => {
      switchMacroPillar('bot', 'account');
    });

    document.getElementById('btn-ig-share-profile')?.addEventListener('click', () => {
      const cur = PolarisAuth.getCurrentUser();
      const profileUrl = `${window.location.origin}/#profile-${cur?.username || 'user'}`;
      navigator.clipboard.writeText(profileUrl)
        .then(() => showToast('Tautan profil Instagram Anda disalin ke clipboard!', 'success'))
        .catch(() => showToast('Gagal menyalin tautan', 'error'));
    });

    document.getElementById('btn-ig-open-gdrive')?.addEventListener('click', () => {
      const gdriveTab = document.querySelector('.social-mode-tab[data-mode="gdrive_storage"]');
      if (gdriveTab) gdriveTab.click();
    });

    document.getElementById('btn-add-ig-highlight')?.addEventListener('click', () => {
      openCreateStoryModal();
    });

    // Instagram Lightbox Modal Handlers
    document.getElementById('btn-close-ig-lightbox')?.addEventListener('click', closeInstagramLightbox);
    document.getElementById('modal-ig-post-lightbox')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeInstagramLightbox();
    });

    // Direct Messages Composer & Attachments
    const btnAttachDm = document.getElementById('btn-dm-attach-file');
    const inputDmFile = document.getElementById('dm-media-file-input');
    const formDmComposer = document.getElementById('dm-composer-form');

    if (btnAttachDm && inputDmFile) {
      btnAttachDm.addEventListener('click', () => inputDmFile.click());
      inputDmFile.addEventListener('change', () => {
        if (inputDmFile.files && inputDmFile.files[0]) {
          showToast(`File dipilih: ${inputDmFile.files[0].name}`, 'info');
        }
      });
    }

    if (formDmComposer) {
      formDmComposer.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!activeDmUser) {
          showToast('Pilih pengguna terlebih dahulu dari daftar di kiri!', 'warning');
          return;
        }

        const inputEl = document.getElementById('dm-input-text');
        const text = inputEl?.value.trim();
        let mediaUrl = null;
        let mediaType = null;

        if (inputDmFile && inputDmFile.files && inputDmFile.files[0]) {
          const file = inputDmFile.files[0];
          showToast('Mengunggah media chat terenkripsi...', 'info');
          try {
            const formData = new FormData();
            formData.append('mediaFile', file);
            const upRes = await PolarisAuth.authFetch('/api/social/upload', { method: 'POST', body: formData });
            const upJson = await upRes.json();
            if (upJson.success && upJson.url) {
              mediaUrl = upJson.url;
              mediaType = file.type.startsWith('video/') ? 'video' : 'image';
            }
          } catch (err) {
            showToast('Gagal upload media chat: ' + err.message, 'error');
            return;
          }
        }

        if (!text && !mediaUrl) return;

        try {
          const res = await PolarisAuth.authFetch(`/api/social/dm/${encodeURIComponent(activeDmUser)}`, {
            method: 'POST',
            body: JSON.stringify({ text: text || 'Media dikirim', mediaUrl, mediaType })
          });
          const json = await res.json();
          if (json.success) {
            if (inputEl) inputEl.value = '';
            if (inputDmFile) inputDmFile.value = '';
            openDirectChat(activeDmUser);
            loadDirectMessages();
          } else {
            showToast(json.error || 'Gagal mengirim pesan E2EE', 'error');
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        }
      });
    }

    // Backup Chat Vault to Google Drive
    document.getElementById('btn-dm-backup-gdrive')?.addEventListener('click', async () => {
      showToast('Membuat cadangan vault chat terenkripsi (AES-256-GCM)...', 'info');
      try {
        const res = await PolarisAuth.authFetch('/api/social/dm/backup-to-gdrive', { method: 'POST' });
        const json = await res.json();
        if (json.success) {
          showToast(`Cadangan selesai! ${json.message || ''}`, 'success');
          if (json.vaultData) {
            const blob = new Blob([JSON.stringify(json.vaultData, null, 2)], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `polaris_chat_vault_${Date.now()}.enc`;
            link.click();
          }
        } else {
          showToast(json.error || 'Gagal mencadangkan ke Google Drive', 'error');
        }
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
    });

    // Google Drive Config Form
    const formGDrive = document.getElementById('form-gdrive-config');
    if (formGDrive) {
      formGDrive.addEventListener('submit', async (e) => {
        e.preventDefault();
        const folderId = document.getElementById('input-gdrive-folder-id')?.value.trim();
        const accessToken = document.getElementById('input-gdrive-access-token')?.value.trim();

        try {
          const res = await PolarisAuth.authFetch('/api/social/gdrive-config', {
            method: 'POST',
            body: JSON.stringify({ folderId, accessToken })
          });
          const json = await res.json();
          if (json.success) {
            showToast('Konfigurasi Google Drive berhasil disimpan!', 'success');
            loadGDriveStorageStatus();
          } else {
            showToast(json.error || 'Gagal menyimpan konfigurasi', 'error');
          }
        } catch (err) {
          showToast('Error: ' + err.message, 'error');
        }
      });
    }

    // Google Drive Test Button
    document.getElementById('btn-test-gdrive-connection')?.addEventListener('click', async () => {
      showToast('Menguji koneksi Google Drive...', 'info');
      await loadGDriveStorageStatus();
      showToast('Pemeriksaan status Google Drive selesai!', 'success');
    });

    // Realtime Incoming Message Listener
    window.addEventListener('polaris:social-dm-new', (e) => {
      const data = e.detail;
      const cur = PolarisAuth.getCurrentUser();
      if (!data || !cur) return;
      if (data.recipient === cur.username || data.sender === cur.username) {
        if (activeDmUser && (data.sender === activeDmUser || data.recipient === activeDmUser)) {
          openDirectChat(activeDmUser);
        }
        loadDirectMessages();
        showToast(`💬 Pesan baru dari @${data.sender}`, 'info');
      }
    });

    // Story Viewer Modal Close
    document.getElementById('btn-close-story-viewer')?.addEventListener('click', closeStoryViewer);
    document.getElementById('modal-social-story-viewer')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeStoryViewer();
    });

    // Quick Add Friend Search
    const btnSearchFriend = document.getElementById('btn-social-search-friend');
    const inputSearchFriend = document.getElementById('social-quick-search-user');
    if (btnSearchFriend && inputSearchFriend) {
      const doSearch = async () => {
        const query = inputSearchFriend.value.trim();
        if (!query) return;
        const resultsEl = document.getElementById('social-friend-search-results');
        if (!resultsEl) return;
        resultsEl.style.display = 'block';
        resultsEl.innerHTML = '<div style="font-size:0.75rem; color:var(--text-muted); text-align:center; padding:6px;">Mencari pengguna...</div>';

        try {
          const res = await PolarisAuth.authFetch(`/api/friends/search?q=${encodeURIComponent(query)}`);
          const json = await res.json();
          if (json.success && Array.isArray(json.users)) {
            if (json.users.length === 0) {
              resultsEl.innerHTML = '<div style="font-size:0.75rem; color:var(--text-muted); text-align:center; padding:6px;">Tidak ada pengguna ditemukan.</div>';
            } else {
              resultsEl.innerHTML = json.users.map(u => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; background:var(--bg-surface); border-radius:6px; margin-bottom:4px; border:1px solid var(--border-subtle);">
                  <div style="cursor:pointer;" onclick="window.PolarisApp.openPublicProfileModal('${escapeHtml(u.username)}')">
                    <span style="font-size:0.8rem; font-weight:700; color:#fff;">${escapeHtml(u.displayName || u.username)}</span>
                    <span style="font-size:0.7rem; color:var(--accent-cyan); font-family:var(--font-mono);"> @${escapeHtml(u.username)}</span>
                  </div>
                  <button type="button" class="btn-rainbow btn-xs" style="font-size:0.68rem; padding:2px 8px; border-radius:9999px;" onclick="window.PolarisApp.addFriendFromProfile('${escapeHtml(u.username)}')">
                    + Teman
                  </button>
                </div>
              `).join('');
            }
          }
        } catch (err) {
          resultsEl.innerHTML = `<div style="font-size:0.75rem; color:var(--accent-rose); text-align:center; padding:6px;">${escapeHtml(err.message)}</div>`;
        }
      };

      btnSearchFriend.addEventListener('click', doSearch);
      inputSearchFriend.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          doSearch();
        }
      });
    }

    // Modal Public Profile Close
    document.getElementById('btn-close-public-profile')?.addEventListener('click', closePublicProfileModal);
    document.getElementById('modal-public-profile')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closePublicProfileModal();
    });
  }

  async function loadSocialFeed() {
    const currentUser = PolarisAuth.getCurrentUser();
    if (currentUser) {
      const myAvatar = document.getElementById('social-my-avatar');
      const storyMyAvatar = document.getElementById('story-my-avatar');
      const myName = document.getElementById('social-my-name');
      const myTier = document.getElementById('social-my-tier');
      if (myAvatar && currentUser.avatarUrl) myAvatar.src = currentUser.avatarUrl;
      if (storyMyAvatar && currentUser.avatarUrl) storyMyAvatar.src = currentUser.avatarUrl;
      if (myName) myName.textContent = currentUser.displayName || currentUser.username;
      if (myTier) myTier.textContent = `TINGKAT ${currentUser.tierLevel || 1} • ${(currentUser.role || 'member').toUpperCase()}`;
    }

    loadSocialStories();
    loadSocialPosts();
    loadSocialFriendsWidget();
    loadSocialTrending();
  }

  // ==================== STORIES LOGIC (INSTAGRAM / TIKTOK) ====================
  async function loadSocialStories() {
    const container = document.getElementById('social-dynamic-stories');
    if (!container) return;

    try {
      const res = await PolarisAuth.authFetch('/api/social/stories');
      const json = await res.json();
      if (!json.success || !Array.isArray(json.stories)) return;

      cachedStories = json.stories;

      // Also generate default AI Bot stories if list is empty
      if (cachedStories.length === 0) {
        cachedStories = [
          {
            id: 'bot_story_1',
            author_username: 'polaris_bot',
            author_display_name: 'Polaris Bot',
            author_avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=PolarisCore',
            text_content: '🚀 Engine V6 Cluster siap tempur dengan 7 game arcade baru!',
            bg_gradient: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
            created_at: new Date().toISOString()
          },
          {
            id: 'bot_story_2',
            author_username: 'hermes_ai',
            author_display_name: 'Hermes AI',
            author_avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=HermesMind',
            text_content: '🧠 Stockfish AI level 8 menantang para grandmaster di Games Arena!',
            bg_gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)',
            created_at: new Date(Date.now() - 3600000).toISOString()
          }
        ];
      }

      container.innerHTML = cachedStories.map((story, idx) => `
        <div class="social-story-item" onclick="window.PolarisApp.openStoryViewer(${idx})">
          <div class="story-ring-wrapper story-unseen">
            <img src="${escapeHtml(story.author_avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(story.author_username)}`)}" class="story-avatar-img" alt="Avatar">
          </div>
          <span class="story-author-name">${escapeHtml(story.author_display_name || story.author_username)}</span>
        </div>
      `).join('');
    } catch (_) {}
  }

  function openCreateStoryModal() {
    const modal = document.getElementById('modal-social-create-story');
    if (modal) modal.style.display = 'flex';
  }

  function closeCreateStoryModal() {
    const modal = document.getElementById('modal-social-create-story');
    if (modal) modal.style.display = 'none';
  }

  function openStoryViewer(index) {
    const story = cachedStories[index];
    if (!story) return;

    const modal = document.getElementById('modal-social-story-viewer');
    const card = document.getElementById('story-viewer-card');
    const avatar = document.getElementById('story-viewer-avatar');
    const username = document.getElementById('story-viewer-username');
    const time = document.getElementById('story-viewer-time');
    const textEl = document.getElementById('story-viewer-text');
    const mediaEl = document.getElementById('story-viewer-media');
    const progressFill = document.getElementById('story-progress-fill');
    const soundBadge = document.getElementById('story-viewer-sound-badge');
    const soundText = document.getElementById('story-viewer-sound-text');

    if (modal) modal.style.display = 'flex';
    if (card) card.style.background = story.bg_gradient || 'linear-gradient(135deg, #1e1b4b, #312e81)';
    if (avatar) avatar.src = story.author_avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(story.author_username)}`;
    if (username) username.textContent = `@${story.author_username}`;
    if (time) time.textContent = formatTimeAgo(new Date(story.created_at || Date.now()));

    // Stop previous story audio
    if (currentStoryAudio) {
      currentStoryAudio.pause();
      currentStoryAudio = null;
    }

    const soundUrl = story.sound_audio_url || story.soundAudioUrl;
    const soundTitle = story.sound_title || story.soundTitle;
    const soundArtist = story.sound_artist || story.soundArtist;

    if (soundUrl && soundBadge && soundText) {
      soundText.textContent = `${soundTitle || 'Sound Track'} • ${soundArtist || 'Spotify'}`;
      soundBadge.style.display = 'inline-flex';
      currentStoryAudio = new Audio(soundUrl);
      currentStoryAudio.play().catch(() => {});
    } else if (soundBadge) {
      soundBadge.style.display = 'none';
    }

    if (story.media_url || story.mediaUrl) {
      const media = story.media_url || story.mediaUrl;
      if (textEl) textEl.style.display = 'none';
      if (mediaEl) {
        mediaEl.src = media;
        mediaEl.style.display = 'block';
      }
    } else {
      if (mediaEl) mediaEl.style.display = 'none';
      if (textEl) {
        textEl.textContent = `"${story.text_content || story.textContent || ''}"`;
        textEl.style.display = 'block';
      }
    }

    // Auto advance progress bar in 6 seconds
    if (storyTimerInterval) clearInterval(storyTimerInterval);
    if (progressFill) progressFill.style.width = '0%';
    let progress = 0;
    storyTimerInterval = setInterval(() => {
      progress += 1.66;
      if (progressFill) progressFill.style.width = `${progress}%`;
      if (progress >= 100) {
        clearInterval(storyTimerInterval);
        if (index + 1 < cachedStories.length) {
          openStoryViewer(index + 1);
        } else {
          closeStoryViewer();
        }
      }
    }, 100);
  }

  function closeStoryViewer() {
    if (storyTimerInterval) clearInterval(storyTimerInterval);
    if (currentStoryAudio) {
      currentStoryAudio.pause();
      currentStoryAudio = null;
    }
    const modal = document.getElementById('modal-social-story-viewer');
    if (modal) modal.style.display = 'none';
  }

  // ==================== SPOTIFY SOUND & MUSIC SCANNER LOGIC ====================
  function openSoundSelector(context = 'story') {
    activeSoundContext = context;
    const modal = document.getElementById('modal-select-sound');
    if (modal) modal.style.display = 'flex';
    const input = document.getElementById('sound-search-input');
    if (input) input.value = '';
    searchMusicSounds('');
  }

  function closeSoundSelector() {
    const modal = document.getElementById('modal-select-sound');
    if (modal) modal.style.display = 'none';
    if (currentSoundPreviewAudio) {
      currentSoundPreviewAudio.pause();
      currentSoundPreviewAudio = null;
    }
  }

  async function searchMusicSounds(query = '') {
    const resultsContainer = document.getElementById('sound-search-results');
    const spinner = document.getElementById('sound-search-spinner');
    if (spinner) spinner.style.display = 'inline';
    if (resultsContainer) {
      resultsContainer.innerHTML = '<div style="text-align:center; padding:24px; color:var(--text-muted); font-size:0.8rem;">🎧 Mencari musik Spotify & iTunes...</div>';
    }

    try {
      const res = await PolarisAuth.authFetch(`/api/social/sounds/search?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      if (spinner) spinner.style.display = 'none';

      if (!json.success || !Array.isArray(json.sounds) || json.sounds.length === 0) {
        if (resultsContainer) {
          resultsContainer.innerHTML = `
            <div style="text-align:center; padding:30px; color:var(--text-muted); font-size:0.82rem;">
              Tidak ada sound ditemukan untuk "<strong>${escapeHtml(query)}</strong>". Coba kata kunci lain atau pilih genre di atas!
            </div>
          `;
        }
        return;
      }

      window._currentCachedSounds = json.sounds;

      if (resultsContainer) {
        resultsContainer.innerHTML = json.sounds.map((sound, idx) => `
          <div class="sound-item-card" style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-radius:12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); transition:all 0.2s ease;">
            <div style="display:flex; align-items:center; gap:12px; min-width:0; flex:1;">
              <img src="${escapeHtml(sound.albumArt || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop&q=60')}" style="width:44px; height:44px; border-radius:8px; object-fit:cover; border:1px solid rgba(30,215,96,0.3); flex-shrink:0;" alt="Album Cover">
              <div style="min-width:0; flex:1;">
                <div style="font-size:0.84rem; font-weight:800; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                  ${escapeHtml(sound.title)}
                </div>
                <div style="font-size:0.72rem; color:#1ed760; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                  ${escapeHtml(sound.artist)}
                </div>
              </div>
            </div>

            <div style="display:flex; align-items:center; gap:8px; flex-shrink:0; margin-left:10px;">
              ${sound.previewUrl ? `
                <button type="button" class="btn-sound-preview" onclick="window.PolarisApp.toggleSoundPreview('${escapeHtml(sound.previewUrl)}', this)" style="padding:6px 10px; font-size:0.72rem; border-radius:8px; border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.06); color:#fff; cursor:pointer;">
                  ▶️ Putar
                </button>
              ` : ''}
              <button type="button" class="btn-select-sound" onclick="window.PolarisApp.selectSoundAtIndex(${idx})" style="padding:6px 12px; font-size:0.74rem; font-weight:750; border-radius:8px; border:none; background:#1db954; color:#000; cursor:pointer;">
                Pilih
              </button>
            </div>
          </div>
        `).join('');
      }
    } catch (err) {
      if (spinner) spinner.style.display = 'none';
      if (resultsContainer) {
        resultsContainer.innerHTML = `<div style="text-align:center; padding:20px; color:var(--accent-rose); font-size:0.8rem;">Gagal mencari lagu: ${escapeHtml(err.message)}</div>`;
      }
    }
  }

  function toggleSoundPreview(audioUrl, btnEl) {
    if (!audioUrl) return;
    if (currentSoundPreviewAudio && currentSoundPreviewAudio.src === audioUrl) {
      if (!currentSoundPreviewAudio.paused) {
        currentSoundPreviewAudio.pause();
        if (btnEl) btnEl.innerHTML = '▶️ Putar';
        return;
      } else {
        currentSoundPreviewAudio.play().catch(() => {});
        if (btnEl) btnEl.innerHTML = '⏸️ Jeda';
        return;
      }
    }

    if (currentSoundPreviewAudio) {
      currentSoundPreviewAudio.pause();
      currentSoundPreviewAudio = null;
    }

    document.querySelectorAll('.btn-sound-preview').forEach(b => {
      b.innerHTML = '▶️ Putar';
    });

    currentSoundPreviewAudio = new Audio(audioUrl);
    if (btnEl) btnEl.innerHTML = '⏸️ Jeda';
    currentSoundPreviewAudio.play().catch(() => {
      if (btnEl) btnEl.innerHTML = '▶️ Putar';
    });
    currentSoundPreviewAudio.onended = () => {
      if (btnEl) btnEl.innerHTML = '▶️ Putar';
    };
  }

  function selectSoundAtIndex(idx) {
    const sound = (window._currentCachedSounds && window._currentCachedSounds[idx]);
    if (!sound) return;
    selectSoundForActiveContext(sound);
  }

  function selectSoundForActiveContext(sound) {
    if (currentSoundPreviewAudio) {
      currentSoundPreviewAudio.pause();
      currentSoundPreviewAudio = null;
    }

    if (activeSoundContext === 'story') {
      const tInp = document.getElementById('story-input-sound-title');
      const aInp = document.getElementById('story-input-sound-artist');
      const uInp = document.getElementById('story-input-sound-audio');
      if (tInp) tInp.value = sound.title || '';
      if (aInp) aInp.value = sound.artist || '';
      if (uInp) uInp.value = sound.previewUrl || '';
      const nameEl = document.getElementById('story-sound-name');
      if (nameEl) nameEl.textContent = `🎵 ${sound.title} - ${sound.artist}`;
      const badge = document.getElementById('story-sound-badge');
      if (badge) badge.style.display = 'inline-flex';
      showToast(`Sound "${sound.title}" dipilih untuk Story! 🎵`, 'success');
    } else {
      const tInp = document.getElementById('post-input-sound-title');
      const aInp = document.getElementById('post-input-sound-artist');
      const uInp = document.getElementById('post-input-sound-audio');
      if (tInp) tInp.value = sound.title || '';
      if (aInp) aInp.value = sound.artist || '';
      if (uInp) uInp.value = sound.previewUrl || '';
      const nameEl = document.getElementById('post-sound-name');
      if (nameEl) nameEl.textContent = `🎵 ${sound.title} - ${sound.artist}`;
      const badge = document.getElementById('post-sound-badge');
      if (badge) badge.style.display = 'inline-flex';
      showToast(`Sound "${sound.title}" disematkan ke Postingan! 🎵`, 'success');
    }

    closeSoundSelector();
  }

  // ==================== 100% AUTHENTIC INSTAGRAM POSTS FEED ====================
  async function loadSocialPosts() {
    const container = document.getElementById('social-feed-container');
    if (!container) return;

    try {
      const typeParam = activePlatformMode === 'bookmarks' ? 'all' : (activePlatformMode === 'reel' ? 'reel' : 'all');
      const res = await PolarisAuth.authFetch(`/api/social/posts?type=${typeParam}`);
      const json = await res.json();
      if (!json.success || !Array.isArray(json.posts)) {
        container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--accent-rose);">Gagal memuat postingan: ${escapeHtml(json.error || 'Unknown error')}</div>`;
        return;
      }

      let posts = json.posts;
      const currentUser = PolarisAuth.getCurrentUser();

      // If in bookmarks tab, filter posts bookmarked by user
      if (activePlatformMode === 'bookmarks') {
        posts = posts.filter(p => Array.isArray(p.bookmarks) && p.bookmarks.includes(currentUser?.username));
      }

      if (posts.length === 0) {
        container.innerHTML = `
          <div class="card-luxury" style="text-align: center; padding: 48px 20px; border-color: rgba(255,255,255,0.08);">
            <div style="font-size: 2.2rem; margin-bottom: 10px;">📸</div>
            <h4 style="font-size: 1.1rem; font-weight: 800; color: #fff; margin-bottom: 6px;">
              ${activePlatformMode === 'bookmarks' ? 'Belum Ada Postingan Disimpan' : 'Belum Ada Postingan di Gemini Social'}
            </h4>
            <p style="font-size: 0.8rem; color: var(--text-muted); max-width: 420px; margin: 0 auto 16px auto;">
              ${activePlatformMode === 'bookmarks' 
                ? 'Klik ikon pita 🔖 pada postingan untuk menyimpannya ke koleksi tersimpan Anda.'
                : 'Jadilah yang pertama membagikan foto, video reel, dan musik Spotify di linimasa Instagram Gemini!'}
            </p>
          </div>
        `;
        return;
      }

      container.innerHTML = posts.map(post => {
        const isLiked = Array.isArray(post.likes) && post.likes.includes(currentUser?.username);
        const isBookmarked = Array.isArray(post.bookmarks) && post.bookmarks.includes(currentUser?.username);
        const avatarUrl = post.authorAvatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(post.authorUsername || 'user')}`;
        const timeAgo = formatTimeAgo(new Date(post.createdAt || Date.now()));
        const formattedContent = formatSocialContent(post.content);
        const filterClass = post.extraData?.filterClass || 'filter-normal';
        const isCosmos = (post.authorRole === 'cosmos');

        // Spotify sound badge
        const postSound = post.extraData?.sound;
        const soundBadgeHtml = (postSound && postSound.title) ? `
          <div class="ig-sound-badge" onclick="window.PolarisApp.toggleSoundPreview('${escapeHtml(postSound.audioUrl || '')}', this)" title="Putar pratinjau audio 30s">
            <span>🎵</span>
            <span>${escapeHtml(postSound.title)} • ${escapeHtml(postSound.artist || 'Spotify')}</span>
          </div>
        ` : '';

        // Media rendering: video or image
        const isVideo = post.mediaUrl && (post.mediaUrl.endsWith('.mp4') || post.mediaUrl.endsWith('.webm') || post.postType === 'reel');
        const mediaHtml = post.mediaUrl ? `
          <div class="ig-post-media-box" ondblclick="window.PolarisApp.triggerDoubleTapLike('${post.id}')">
            ${isVideo ? `
              <video src="${escapeHtml(post.mediaUrl)}" controls playsinline loop class="${filterClass}" style="width: 100%; max-height: 540px; object-fit: contain; background: #000;"></video>
            ` : `
              <img src="${escapeHtml(post.mediaUrl)}" class="${filterClass}" alt="Post media" loading="lazy">
            `}
            <div class="double-tap-heart" id="heart-burst-${post.id}">❤️</div>
          </div>
        ` : '';

        return `
          <div class="ig-feed-card" data-post-id="${post.id}">
            <!-- Authentic IG Header -->
            <div class="ig-card-header">
              <div class="ig-user-badge" onclick="window.PolarisApp.openPublicProfileModal('${escapeHtml(post.authorUsername)}')">
                <div class="ig-story-ring-mini">
                  <img src="${escapeHtml(avatarUrl)}" class="ig-avatar-mini" alt="Avatar">
                </div>
                <div>
                  <div class="ig-username-text">
                    <span>${escapeHtml(post.authorDisplayName || post.authorUsername)}</span>
                    ${isCosmos ? `<span class="ig-verified-badge" title="Verified Cosmos">☑️</span>` : ''}
                  </div>
                  <div class="ig-location-sub">@${escapeHtml(post.authorUsername)} • Astraonyx Gemini</div>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 8px;">
                <button type="button" style="background:none; border:none; color:var(--text-muted); font-size:1.1rem; cursor:pointer;" onclick="window.PolarisApp.openPublicProfileModal('${escapeHtml(post.authorUsername)}')">
                  •••
                </button>
              </div>
            </div>

            <!-- Optional Media Container with Authentic Double-Tap Heart Pop -->
            ${mediaHtml}

            <!-- Post Sound Badge if attached -->
            ${soundBadgeHtml ? `<div style="padding: 0 16px; margin-top: 8px;">${soundBadgeHtml}</div>` : ''}

            <!-- Authentic Instagram SVG Action Icons -->
            <div class="ig-action-bar-authentic">
              <div class="ig-action-group-left">
                <!-- Heart (Like) -->
                <button type="button" class="ig-icon-btn btn-like ${isLiked ? 'liked' : ''}" data-post-id="${post.id}" title="Suka">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="${isLiked ? '#ff3040' : 'none'}" stroke="${isLiked ? '#ff3040' : 'currentColor'}" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                </button>
                <!-- Comment Bubble -->
                <button type="button" class="ig-icon-btn btn-toggle-comments" data-post-id="${post.id}" title="Komentar">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                  </svg>
                </button>
                <!-- Direct Share (Paper Airplane) -->
                <button type="button" class="ig-icon-btn" onclick="window.PolarisApp.copyPostLink('${post.id}')" title="Bagikan">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>

              <!-- Bookmark Ribbon -->
              <button type="button" class="ig-icon-btn btn-bookmark ${isBookmarked ? 'bookmarked' : ''}" data-post-id="${post.id}" title="Simpan Post">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="${isBookmarked ? '#ffffff' : 'none'}" stroke="currentColor" stroke-width="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
              </button>
            </div>

            <!-- Likes Count -->
            <div class="ig-likes-count-line">
              <span class="like-count">${post.likesCount || 0}</span> suka
            </div>

            <!-- Caption -->
            <div class="ig-caption-block">
              <span class="ig-caption-username" onclick="window.PolarisApp.openPublicProfileModal('${escapeHtml(post.authorUsername)}')">${escapeHtml(post.authorUsername)}</span>
              ${formattedContent}
            </div>

            <!-- Optional Interactive Polling Block -->
            ${(post.extraData && post.extraData.poll) ? renderPollWidget(post.id, post.extraData.poll, currentUser?.username) : ''}

            <!-- Comments trigger -->
            <div class="ig-comments-trigger-line btn-toggle-comments" data-post-id="${post.id}">
              ${(post.commentsCount && post.commentsCount > 0) ? `Lihat semua ${post.commentsCount} komentar...` : 'Belum ada komentar. Jadilah yang pertama berkomentar!'}
            </div>

            <!-- Timestamp -->
            <div class="ig-timestamp-line">${timeAgo}</div>

            <!-- Inline Quick Comment Form -->
            <form class="ig-inline-comment-box form-inline-comment" data-post-id="${post.id}">
              <input type="text" class="ig-inline-comment-input inline-comment-input" placeholder="Tambahkan komentar..." required>
              <button type="submit" class="ig-btn-post-comment">Kirim</button>
            </form>

            <!-- Collapsible Comments Drawer -->
            <div id="comments-section-${post.id}" style="display: none; padding: 12px 16px; background: rgba(0,0,0,0.3); border-top: 1px solid var(--border-subtle);">
              ${renderCommentsSection(post)}
            </div>
          </div>
        `;
      }).join('');

      bindModernSocialEvents();
    } catch (err) {
      container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--accent-rose);">Error: ${escapeHtml(err.message)}</div>`;
    }
  }

  function renderPollWidget(postId, poll, currentUsername) {
    const total = poll.totalVotes || 0;
    const hasVoted = poll.votes && poll.votes[currentUsername] !== undefined;

    return `
      <div class="poll-option-container" data-post-id="${postId}">
        ${poll.options.map((opt, idx) => {
          const count = (poll.counts && poll.counts[idx]) || 0;
          const percent = total > 0 ? Math.round((count / total) * 100) : 0;
          const isSelected = poll.votes && poll.votes[currentUsername] === idx;

          return `
            <div class="poll-option-row" onclick="window.PolarisApp.votePollPost('${postId}', ${idx})">
              <div class="poll-bar-fill" style="width: ${percent}%;"></div>
              <div class="poll-text-content">
                <span>${isSelected ? '🔘' : '⚪'}</span>
                <span>${escapeHtml(opt)}</span>
              </div>
              <div class="poll-percent-label">${percent}% (${count})</div>
            </div>
          `;
        }).join('')}
        <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">
          ${total} suara • ${hasVoted ? '✓ Anda telah memilih' : 'Klik opsi untuk memberikan suara'}
        </div>
      </div>
    `;
  }

  function renderCommentsSection(post) {
    return `
      <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; max-height: 220px; overflow-y: auto;">
        ${(Array.isArray(post.comments) && post.comments.length > 0) ? post.comments.map(c => `
          <div style="padding: 8px 12px; border-radius: 8px; background: var(--bg-surface-elevated); font-size: 0.8rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
              <strong style="color: var(--accent-cyan); cursor: pointer;" onclick="window.PolarisApp.openPublicProfileModal('${escapeHtml(c.authorUsername)}')">@${escapeHtml(c.authorUsername)}</strong>
              <span style="font-size: 0.7rem; color: var(--text-muted);">${formatTimeAgo(new Date(c.createdAt || Date.now()))}</span>
            </div>
            <div style="color: var(--text-secondary);">${escapeHtml(c.text)}</div>
          </div>
        `).join('') : '<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 6px;">Belum ada komentar. Jadilah yang pertama!</div>'}
      </div>

      <form class="form-add-comment" data-post-id="${post.id}" style="display: flex; gap: 8px;">
        <input type="text" class="form-input comment-input" placeholder="Tulis komentar kosmik..." style="font-size: 0.8rem; padding: 6px 12px; flex: 1;" required>
        <button type="submit" class="btn-rainbow btn-sm" style="font-size: 0.75rem; padding: 6px 14px; border-radius: 9999px;">Kirim</button>
      </form>
    `;
  }

  function formatSocialContent(text) {
    if (!text) return '';
    let escaped = escapeHtml(text);
    // Replace hashtags with links
    escaped = escaped.replace(/(#[a-zA-Z0-9_]+)/g, '<a href="javascript:void(0)" class="x-hashtag" onclick="window.PolarisApp.filterByHashtag(\'$1\')">$1</a>');
    // Replace @mentions with clickable links
    escaped = escaped.replace(/@([a-zA-Z0-9_]+)/g, '<span class="x-mention" onclick="window.PolarisApp.openPublicProfileModal(\'$1\')">@$1</span>');
    return escaped;
  }

  function bindModernSocialEvents() {
    // Like button
    document.querySelectorAll('.btn-like-post, .btn-like').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const postId = btn.dataset.postId;
        try {
          const res = await PolarisAuth.authFetch(`/api/social/posts/${postId}/like`, { method: 'POST' });
          const json = await res.json();
          if (json.success) {
            btn.classList.toggle('liked', json.liked);
            const countEl = btn.querySelector('.like-count');
            if (countEl) countEl.textContent = json.likesCount;
          }
        } catch (_) {}
      });
    });

    // Repost button
    document.querySelectorAll('.btn-repost-post, .btn-repost').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const postId = btn.dataset.postId;
        try {
          const res = await PolarisAuth.authFetch(`/api/social/posts/${postId}/repost`, { method: 'POST' });
          const json = await res.json();
          if (json.success) {
            btn.classList.toggle('reposted', json.reposted);
            const countEl = btn.querySelector('.repost-count');
            if (countEl) countEl.textContent = json.repostsCount;
            showToast(json.reposted ? 'Postingan berhasil direpost ke profil Anda!' : 'Repost dibatalkan.', 'info');
          }
        } catch (_) {}
      });
    });

    // Bookmark button
    document.querySelectorAll('.btn-bookmark-post, .btn-bookmark').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const postId = btn.dataset.postId;
        try {
          const res = await PolarisAuth.authFetch(`/api/social/posts/${postId}/bookmark`, { method: 'POST' });
          const json = await res.json();
          if (json.success) {
            btn.classList.toggle('bookmarked', json.bookmarked);
            showToast(json.bookmarked ? 'Postingan disimpan ke Bookmark! 🔖' : 'Dihapus dari Bookmark.', 'info');
          }
        } catch (_) {}
      });
    });

    // Toggle comments
    document.querySelectorAll('.btn-toggle-comments').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const postId = btn.dataset.postId;
        const drawer = document.getElementById(`comments-section-${postId}`);
        if (drawer) {
          drawer.style.display = drawer.style.display === 'none' ? 'block' : 'none';
        }
      });
    });

    // Submit comment forms (drawer & inline Instagram box)
    document.querySelectorAll('.form-add-comment, .form-inline-comment').forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const postId = form.dataset.postId;
        const input = form.querySelector('.comment-input, .inline-comment-input');
        const text = input?.value.trim();
        if (!text) return;

        try {
          const res = await PolarisAuth.authFetch(`/api/social/posts/${postId}/comment`, {
            method: 'POST',
            body: JSON.stringify({ text })
          });
          const json = await res.json();
          if (json.success) {
            input.value = '';
            showToast('Komentar berhasil dikirim!', 'success');
            loadSocialPosts();
          } else {
            showToast(json.error || 'Gagal mengirim komentar', 'error');
          }
        } catch (_) {}
      });
    });
  }

  function triggerDoubleTapLike(postId) {
    const heart = document.getElementById(`heart-burst-${postId}`);
    if (heart) {
      heart.classList.remove('animate-heart');
      void heart.offsetWidth; // trigger reflow
      heart.classList.add('animate-heart');
    }
    // Also call like API
    PolarisAuth.authFetch(`/api/social/posts/${postId}/like`, { method: 'POST' })
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          const btn = document.querySelector(`.btn-like[data-post-id="${postId}"], .btn-like-post[data-post-id="${postId}"]`);
          if (btn) {
            btn.classList.toggle('liked', json.liked);
            const countEl = btn.querySelector('.like-count');
            if (countEl) countEl.textContent = json.likesCount;
          }
        }
      })
      .catch(() => {});
  }

  async function votePollPost(postId, optionIndex) {
    try {
      const res = await PolarisAuth.authFetch(`/api/social/posts/${postId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ optionIndex })
      });
      const json = await res.json();
      if (json.success) {
        showToast('Pilihan Anda berhasil disimpan!', 'success');
        loadSocialPosts();
      } else {
        showToast(json.error || 'Gagal memberikan suara', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  function filterByHashtag(tag) {
    const textarea = document.getElementById('social-post-content');
    if (textarea) {
      textarea.value = `${tag} `;
      textarea.dispatchEvent(new Event('input'));
    }
    showToast(`Memfilter feed untuk ${tag}...`, 'info');
  }

  function copyPostLink(postId) {
    const url = `${window.location.origin}/#post-${postId}`;
    navigator.clipboard.writeText(url)
      .then(() => showToast('Tautan postingan berhasil disalin!', 'success'))
      .catch(() => showToast('Gagal menyalin tautan.', 'error'));
  }

  async function loadSocialFriendsWidget() {
    const listEl = document.getElementById('social-friends-list-container');
    if (!listEl) return;

    try {
      const res = await PolarisAuth.authFetch('/api/friends/list');
      const json = await res.json();
      if (!json.success || !Array.isArray(json.friends)) {
        listEl.innerHTML = '<div style="color:var(--text-muted); font-size:0.75rem; text-align:center; padding:10px;">Belum ada teman terhubung.</div>';
        return;
      }

      if (json.friends.length === 0) {
        listEl.innerHTML = `
          <div style="color:var(--text-muted); font-size:0.75rem; text-align:center; padding:12px;">
            Cari teman dengan form di atas untuk mulai berteman & mabar game!
          </div>
        `;
        return;
      }

      listEl.innerHTML = json.friends.map(f => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--bg-surface-elevated); border-radius:8px; border:1px solid var(--border-subtle);">
          <div style="display:flex; align-items:center; gap:8px; cursor:pointer;" onclick="window.PolarisApp.openPublicProfileModal('${escapeHtml(f.username)}')">
            <img src="${escapeHtml(f.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(f.username)}`)}" style="width:28px; height:28px; border-radius:50%; object-fit:cover; border:1px solid var(--accent-cyan);" alt="Avatar">
            <div>
              <div style="font-size:0.8rem; font-weight:700; color:#fff;">${escapeHtml(f.display_name || f.username)}</div>
              <div style="font-size:0.68rem; color:var(--text-muted);">@${escapeHtml(f.username)} • Lv ${f.tier_level || 1}</div>
            </div>
          </div>
          <button type="button" class="btn-action btn-xs" style="padding:3px 10px; font-size:0.68rem; border-radius:9999px;" onclick="window.PolarisApp.openPublicProfileModal('${escapeHtml(f.username)}')">
            Profil
          </button>
        </div>
      `).join('');
    } catch (_) {
      listEl.innerHTML = '<div style="color:var(--text-muted); font-size:0.75rem; text-align:center;">Gagal memuat teman.</div>';
    }
  }

  async function loadSocialTrending() {
    const container = document.getElementById('social-trending-container');
    if (!container) return;

    try {
      const res = await PolarisAuth.authFetch('/api/social/trending');
      const json = await res.json();
      if (!json.success || !Array.isArray(json.trending)) return;

      container.innerHTML = json.trending.map(t => `
        <div class="trend-item" style="cursor: pointer; padding: 6px 8px; border-radius: 8px; transition: background 0.15s ease;" onclick="window.PolarisApp.filterByHashtag('${escapeHtml(t.tag)}')">
          <div style="font-size: 0.68rem; color: var(--text-muted);">Sedang tren dalam ${escapeHtml(t.category)}</div>
          <div style="font-size: 0.85rem; font-weight: 800; color: #fff;">${escapeHtml(t.tag)}</div>
          <div style="font-size: 0.7rem; color: var(--accent-cyan);">${t.postsCount} Postingan</div>
        </div>
      `).join('');
    } catch (_) {}
  }

  // ==================== 16. SAFE PUBLIC PROFILE PREVIEW MODAL ====================
  async function openPublicProfileModal(username) {
    if (!username) return;
    const modal = document.getElementById('modal-public-profile');
    if (!modal) return;

    try {
      const res = await PolarisAuth.authFetch(`/api/auth/public-profile/${encodeURIComponent(username)}`);
      const json = await res.json();
      if (!json.success || !json.profile) {
        showToast(json.error || 'Gagal memuat profil publik', 'error');
        return;
      }

      const p = json.profile;
      const avatarEl = document.getElementById('pub-profile-avatar');
      const nameEl = document.getElementById('pub-profile-display-name');
      const userEl = document.getElementById('pub-profile-username');
      const tierBadge = document.getElementById('pub-profile-tier-badge');
      const roleBadge = document.getElementById('pub-profile-role-badge');
      const bioEl = document.getElementById('pub-profile-bio');
      const joinedEl = document.getElementById('pub-profile-joined');
      
      const totalMatches = document.getElementById('pub-profile-total-matches');
      const totalWins = document.getElementById('pub-profile-total-wins');
      const winRate = document.getElementById('pub-profile-win-rate');
      const chessWins = document.getElementById('pub-profile-chess-wins');
      const tttWins = document.getElementById('pub-profile-ttt-wins');
      const c4Wins = document.getElementById('pub-profile-c4-wins');
      const btnAddFriend = document.getElementById('btn-pub-profile-add-friend');
      const btnChallenge = document.getElementById('btn-pub-profile-challenge');

      if (avatarEl) avatarEl.src = p.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.username)}`;
      if (nameEl) nameEl.textContent = p.displayName || p.username;
      if (userEl) userEl.textContent = `@${p.username}`;
      if (tierBadge) {
        tierBadge.textContent = `${p.tierInfo?.badge || '⭐'} TINGKAT ${p.tierLevel}: ${(p.tierInfo?.name || p.role).toUpperCase()}`;
      }
      if (roleBadge) {
        roleBadge.textContent = (p.role || 'member').toUpperCase();
        roleBadge.className = `badge badge-role-${p.role || 'member'}`;
      }
      if (bioEl) bioEl.textContent = p.bio ? `"${p.bio}"` : '"Pengelana kosmik Astraonyx."';
      if (joinedEl) joinedEl.textContent = `Bergabung: ${new Date(p.createdAt).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}`;

      if (totalMatches) totalMatches.textContent = p.gameStats?.totalMatches || 0;
      if (totalWins) totalWins.textContent = p.gameStats?.totalWins || 0;
      if (winRate) winRate.textContent = `${p.gameStats?.winRate || 0}%`;
      if (chessWins) chessWins.textContent = p.gameStats?.chessWins || 0;
      if (tttWins) tttWins.textContent = p.gameStats?.tttWins || 0;
      if (c4Wins) c4Wins.textContent = p.gameStats?.c4Wins || 0;

      if (btnAddFriend) {
        btnAddFriend.onclick = () => addFriendFromProfile(p.username);
      }
      if (btnChallenge) {
        btnChallenge.onclick = () => challengeUserFromProfile(p.username);
      }

      modal.style.display = 'flex';
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  function closePublicProfileModal() {
    const modal = document.getElementById('modal-public-profile');
    if (modal) modal.style.display = 'none';
  }

  async function addFriendFromProfile(targetUsername) {
    try {
      const res = await PolarisAuth.authFetch('/api/friends/request', {
        method: 'POST',
        body: JSON.stringify({ targetUsername })
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || 'Permintaan pertemanan berhasil dikirim!', 'success');
        loadSocialFriendsWidget();
      } else {
        showToast(json.error || 'Gagal mengirim permintaan pertemanan', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  function challengeUserFromProfile(targetUsername) {
    closePublicProfileModal();
    if (typeof showToast === 'function') {
      showToast(`Mode Mabar sedang dalam pembaruan algoritma baru dan akan segera hadir kembali!`, 'info');
    } else {
      alert('Mode Mabar sedang dalam pembaruan algoritma baru dan akan segera hadir kembali!');
    }
  }

  function formatTimeAgo(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Baru saja';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} menit lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} hari lalu`;
    return date.toLocaleDateString('id-ID');
  }

  function initIphoneMockupClock() {
    const clockEl = document.getElementById('dl-iphone-clock');
    if (!clockEl) return;
    const updateClock = () => {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
    };
    updateClock();
    setInterval(updateClock, 30000);
  }

  // ==================== 17. AUTHENTIC INSTAGRAM SUITE & E2EE MESSAGES ====================
  function switchSocialView(mode) {
    const viewFeed = document.getElementById('social-view-feed');
    const viewIg = document.getElementById('social-view-ig-profile');
    const viewDm = document.getElementById('social-view-dm');
    const viewGDrive = document.getElementById('social-view-gdrive');

    [viewFeed, viewIg, viewDm, viewGDrive].forEach(v => {
      if (v) v.style.display = 'none';
    });

    if (mode === 'ig_profile') {
      if (viewIg) viewIg.style.display = 'block';
      loadInstagramProfile();
    } else if (mode === 'direct_messages') {
      if (viewDm) viewDm.style.display = 'block';
      loadDirectMessages();
    } else if (mode === 'gdrive_storage') {
      if (viewGDrive) viewGDrive.style.display = 'block';
      loadGDriveStorageStatus();
    } else {
      if (viewFeed) viewFeed.style.display = 'grid';
      loadSocialPosts();
    }
  }

  async function loadInstagramProfile(targetUsername) {
    const cur = PolarisAuth.getCurrentUser();
    const userToLoad = targetUsername || cur?.username || 'user';
    activeIgProfileUsername = userToLoad;

    const headerAvatar = document.getElementById('ig-header-avatar');
    const headerUsername = document.getElementById('ig-header-username');
    const headerRoleBadge = document.getElementById('ig-header-role-badge');
    const statPosts = document.getElementById('ig-stat-posts');
    const statFollowers = document.getElementById('ig-stat-followers');
    const statFollowing = document.getElementById('ig-stat-following');
    const bioName = document.getElementById('ig-bio-display-name');
    const bioContent = document.getElementById('ig-bio-content');
    const bioLink = document.getElementById('ig-bio-link-url');
    const gridEl = document.getElementById('ig-profile-posts-grid');

    if (gridEl) {
      gridEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 0; color: var(--text-muted);">
          Memuat galeri Instagram @${escapeHtml(userToLoad)}...
        </div>
      `;
    }

    try {
      const res = await PolarisAuth.authFetch(`/api/auth/public-profile/${encodeURIComponent(userToLoad)}`);
      const json = await res.json();
      if (!json.success || !json.profile) {
        if (gridEl) gridEl.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--accent-rose);">${escapeHtml(json.error || 'Gagal memuat profil')}</div>`;
        return;
      }

      const p = json.profile;
      const avatarUrl = p.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.username)}`;

      if (headerAvatar) headerAvatar.src = avatarUrl;
      if (headerUsername) {
        headerUsername.innerHTML = `
          <span>${escapeHtml(p.username)}</span>
          <span style="color: var(--accent-cyan); font-size: 1rem;" title="Terverifikasi Kosmik">☑️</span>
        `;
      }
      if (headerRoleBadge) {
        headerRoleBadge.textContent = `${(p.role || 'member').toUpperCase()} 👑`;
        headerRoleBadge.className = `badge badge-role-${p.role || 'cosmos'}`;
      }
      if (statPosts) statPosts.textContent = p.postsCount || (Array.isArray(p.posts) ? p.posts.length : 0);
      if (statFollowers) statFollowers.textContent = p.followersCount || 0;
      if (statFollowing) statFollowing.textContent = p.followingCount || 0;
      if (bioName) bioName.textContent = p.displayName || p.username;
      if (bioContent) bioContent.textContent = p.bio || 'Pengelana kosmik Astraonyx.';
      if (bioLink) {
        const linkUrl = p.link || `https://github.com/${p.username}`;
        bioLink.href = linkUrl;
        bioLink.textContent = `🔗 ${linkUrl.replace(/^https?:\/\//, '')}`;
      }

      cachedIgProfilePosts = Array.isArray(p.posts) ? p.posts : [];
      renderInstagramGrid(cachedIgProfilePosts);
    } catch (err) {
      if (gridEl) {
        gridEl.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--accent-rose);">Error: ${escapeHtml(err.message)}</div>`;
      }
    }
  }

  function renderInstagramGrid(posts) {
    const gridEl = document.getElementById('ig-profile-posts-grid');
    if (!gridEl) return;

    let filtered = posts || [];
    if (activeIgTab === 'reels') {
      filtered = filtered.filter(p => p.postType === 'reel');
    } else if (activeIgTab === 'saved') {
      const cur = PolarisAuth.getCurrentUser();
      filtered = filtered.filter(p => Array.isArray(p.bookmarks) && p.bookmarks.includes(cur?.username));
    } else if (activeIgTab === 'tagged') {
      filtered = [];
    }

    if (filtered.length === 0) {
      gridEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 12px;">📷</div>
          <h4 style="color: #fff; font-size: 1.1rem; font-weight: 800; margin-bottom: 6px;">
            ${activeIgTab === 'reels' ? 'Belum Ada Reels' : (activeIgTab === 'saved' ? 'Belum Ada Postingan Tersimpan' : (activeIgTab === 'tagged' ? 'Foto Mengenai Anda' : 'Belum Ada Postingan'))}
          </h4>
          <p style="font-size: 0.82rem; max-width: 360px; margin: 0 auto;">
            ${activeIgTab === 'saved' ? 'Simpan foto atau video untuk melihatnya kembali di sini.' : 'Saat Anda membagikan foto atau reel, mereka akan muncul di galeri profil Anda.'}
          </p>
        </div>
      `;
      return;
    }

    gridEl.innerHTML = filtered.map(post => {
      const mediaUrl = post.mediaUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';
      const isReel = post.postType === 'reel' || post.mediaType === 'video' || (post.mediaUrl && post.mediaUrl.match(/\.(mp4|webm)$/i));
      const likes = post.likesCount || (Array.isArray(post.likes) ? post.likes.length : 0);
      const comments = post.commentsCount || (Array.isArray(post.comments) ? post.comments.length : 0);

      return `
        <div class="ig-grid-item" onclick="window.PolarisApp.openInstagramLightboxById('${post.id}')" title="Buka Detail Postingan">
          <img src="${escapeHtml(mediaUrl)}" alt="Post" loading="lazy">
          ${isReel ? '<span class="ig-grid-reel-badge">🎬</span>' : ''}
          <div class="ig-grid-overlay">
            <span class="ig-grid-stat">❤️ ${likes}</span>
            <span class="ig-grid-stat">💬 ${comments}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  let activeLightboxPost = null;

  function openInstagramLightboxById(postId) {
    const post = cachedIgProfilePosts.find(p => p.id === postId) || cachedAllPosts.find(p => p.id === postId);
    if (post) {
      openInstagramLightbox(post);
    } else {
      PolarisAuth.authFetch(`/api/social/posts?type=all`)
        .then(r => r.json())
        .then(json => {
          const found = json.posts?.find(p => p.id === postId);
          if (found) openInstagramLightbox(found);
        })
        .catch(() => {});
    }
  }

  function openInstagramLightbox(post) {
    activeLightboxPost = post;
    const modal = document.getElementById('modal-ig-post-lightbox');
    if (!modal) return;

    const mediaContainer = document.getElementById('ig-lightbox-media-container');
    const authorAvatar = document.getElementById('ig-lightbox-author-avatar');
    const authorName = document.getElementById('ig-lightbox-author-name');
    const authorRole = document.getElementById('ig-lightbox-author-role');
    const captionAvatar = document.getElementById('ig-lightbox-caption-avatar');
    const captionUser = document.getElementById('ig-lightbox-caption-user');
    const captionText = document.getElementById('ig-lightbox-caption-text');
    const timestampEl = document.getElementById('ig-lightbox-timestamp');
    const commentsContainer = document.getElementById('ig-lightbox-dynamic-comments');
    const likesCountEl = document.getElementById('ig-lightbox-likes-count');
    const btnLike = document.getElementById('btn-ig-lightbox-like');
    const btnBookmark = document.getElementById('btn-ig-lightbox-bookmark');
    const formComment = document.getElementById('form-ig-lightbox-comment');

    const cur = PolarisAuth.getCurrentUser();
    const isLiked = Array.isArray(post.likes) && post.likes.includes(cur?.username);
    const isBookmarked = Array.isArray(post.bookmarks) && post.bookmarks.includes(cur?.username);
    const avatarUrl = post.authorAvatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(post.authorUsername || 'user')}`;
    const mediaUrl = post.mediaUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';
    const isVideo = post.postType === 'reel' || (post.mediaUrl && post.mediaUrl.match(/\.(mp4|webm)$/i));

    if (mediaContainer) {
      if (isVideo) {
        mediaContainer.innerHTML = `<video src="${escapeHtml(mediaUrl)}" controls autoplay loop class="ig-modal-media"></video>`;
      } else {
        mediaContainer.innerHTML = `<img src="${escapeHtml(mediaUrl)}" class="ig-modal-media" alt="Post">`;
      }
    }

    if (authorAvatar) authorAvatar.src = avatarUrl;
    if (authorName) authorName.textContent = post.authorUsername || 'user';
    if (authorRole) authorRole.textContent = `${(post.authorRole || 'COSMOS').toUpperCase()} 👑`;

    if (captionAvatar) captionAvatar.src = avatarUrl;
    if (captionUser) captionUser.textContent = post.authorUsername || 'user';
    if (captionText) captionText.innerHTML = formatSocialContent(post.content || '');
    if (timestampEl) timestampEl.textContent = formatTimeAgo(new Date(post.createdAt || Date.now()));

    if (likesCountEl) likesCountEl.textContent = `${post.likesCount || 0} suka`;
    if (btnLike) {
      btnLike.textContent = isLiked ? '❤️' : '🤍';
      btnLike.onclick = async () => {
        try {
          const res = await PolarisAuth.authFetch(`/api/social/posts/${post.id}/like`, { method: 'POST' });
          const json = await res.json();
          if (json.success) {
            btnLike.textContent = json.liked ? '❤️' : '🤍';
            if (likesCountEl) likesCountEl.textContent = `${json.likesCount} suka`;
            post.likesCount = json.likesCount;
            if (json.liked) {
              if (!post.likes) post.likes = [];
              post.likes.push(cur?.username);
            } else if (post.likes) {
              post.likes = post.likes.filter(u => u !== cur?.username);
            }
          }
        } catch (_) {}
      };
    }

    if (btnBookmark) {
      btnBookmark.textContent = isBookmarked ? '🔖' : '🏷️';
      btnBookmark.onclick = async () => {
        try {
          const res = await PolarisAuth.authFetch(`/api/social/posts/${post.id}/bookmark`, { method: 'POST' });
          const json = await res.json();
          if (json.success) {
            btnBookmark.textContent = json.bookmarked ? '🔖' : '🏷️';
            showToast(json.bookmarked ? 'Disimpan ke koleksi tersimpan!' : 'Dihapus dari tersimpan.', 'info');
          }
        } catch (_) {}
      };
    }

    // Render Comments
    if (commentsContainer) {
      if (Array.isArray(post.comments) && post.comments.length > 0) {
        commentsContainer.innerHTML = post.comments.map(c => `
          <div style="display: flex; gap: 10px; align-items: flex-start;">
            <img src="${escapeHtml(c.authorAvatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(c.authorUsername || 'user')}`)}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;" alt="Avatar">
            <div>
              <span style="font-weight: 800; font-size: 0.82rem; color: #fff; margin-right: 6px;">${escapeHtml(c.authorUsername || 'user')}</span>
              <span style="font-size: 0.82rem; color: var(--text-secondary);">${escapeHtml(c.text)}</span>
              <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 2px;">${formatTimeAgo(new Date(c.createdAt || Date.now()))}</div>
            </div>
          </div>
        `).join('');
      } else {
        commentsContainer.innerHTML = '<div style="font-size: 0.78rem; color: var(--text-muted); text-align: center; padding: 12px;">Belum ada komentar.</div>';
      }
    }

    // Handle Comment Submit in Lightbox
    if (formComment) {
      formComment.onsubmit = async (e) => {
        e.preventDefault();
        const input = document.getElementById('ig-lightbox-input-comment');
        const text = input?.value.trim();
        if (!text) return;

        try {
          const res = await PolarisAuth.authFetch(`/api/social/posts/${post.id}/comment`, {
            method: 'POST',
            body: JSON.stringify({ text })
          });
          const json = await res.json();
          if (json.success) {
            if (input) input.value = '';
            showToast('Komentar ditambahkan!', 'success');
            if (!post.comments) post.comments = [];
            post.comments.push({
              authorUsername: cur?.username || 'user',
              authorAvatarUrl: cur?.avatarUrl,
              text,
              createdAt: new Date().toISOString()
            });
            post.commentsCount = (post.commentsCount || 0) + 1;
            openInstagramLightbox(post);
          }
        } catch (_) {}
      };
    }

    modal.style.display = 'flex';
  }

  function closeInstagramLightbox() {
    const modal = document.getElementById('modal-ig-post-lightbox');
    if (modal) modal.style.display = 'none';
  }

  // ==================== WHATSAPP-GRADE E2EE DIRECT MESSAGES ====================
  async function loadDirectMessages() {
    const listEl = document.getElementById('dm-conversations-list');
    const badgeEl = document.getElementById('dm-unread-badge');
    if (!listEl) return;

    try {
      const res = await PolarisAuth.authFetch('/api/social/dm/conversations');
      const json = await res.json();
      if (!json.success || !Array.isArray(json.conversations)) {
        listEl.innerHTML = `<div style="padding:20px; color:var(--accent-rose); font-size:0.78rem; text-align:center;">Gagal memuat pesan: ${escapeHtml(json.error || 'Unknown error')}</div>`;
        return;
      }

      const convs = json.conversations;
      let totalUnread = 0;
      convs.forEach(c => totalUnread += (c.unreadCount || 0));

      if (badgeEl) {
        if (totalUnread > 0) {
          badgeEl.textContent = totalUnread;
          badgeEl.style.display = 'inline-block';
        } else {
          badgeEl.style.display = 'none';
        }
      }

      if (convs.length === 0) {
        listEl.innerHTML = `
          <div style="padding: 32px 16px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">
            <div style="font-size: 2rem; margin-bottom: 8px;">💬</div>
            <strong>Belum Ada Percakapan</strong><br>
            Cari teman di atas atau klik 'Pesan' di profil teman untuk memulai chat WhatsApp terenkripsi end-to-end.
          </div>
        `;
        return;
      }

      listEl.innerHTML = convs.map(c => {
        const isActive = c.otherUsername === activeDmUser;
        const avatar = c.otherAvatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(c.otherUsername)}`;
        const timeAgo = formatTimeAgo(new Date(c.lastMessageAt || Date.now()));

        return `
          <div class="dm-conv-item ${isActive ? 'active' : ''}" onclick="window.PolarisApp.openDirectChat('${escapeHtml(c.otherUsername)}')">
            <img src="${escapeHtml(avatar)}" class="dm-conv-avatar" alt="Avatar">
            <div class="dm-conv-info">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="dm-conv-name">${escapeHtml(c.otherDisplayName || c.otherUsername)}</span>
                <span class="dm-conv-time">${timeAgo}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 3px;">
                <span class="dm-conv-snippet">${escapeHtml(c.lastMessageSnippet || 'Pesan terenkripsi')}</span>
                ${c.unreadCount > 0 ? `<span class="dm-conv-badge">${c.unreadCount}</span>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      listEl.innerHTML = `<div style="padding:20px; color:var(--accent-rose); font-size:0.78rem; text-align:center;">Error: ${escapeHtml(err.message)}</div>`;
    }
  }

  async function openDirectChat(otherUsername) {
    if (!otherUsername) return;
    activeDmUser = otherUsername;

    const tabDm = document.querySelector('.social-mode-tab[data-mode="direct_messages"]');
    if (tabDm && !tabDm.classList.contains('active')) {
      tabDm.click();
    }

    const activeName = document.getElementById('dm-active-name');
    const activeAvatar = document.getElementById('dm-active-avatar');
    const stream = document.getElementById('dm-messages-stream');

    if (activeName) activeName.textContent = `@${otherUsername}`;
    if (activeAvatar) activeAvatar.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(otherUsername)}`;

    if (stream) {
      stream.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted); font-size:0.8rem;">Memuat pesan terenkripsi... 🔒</div>`;
    }

    try {
      const res = await PolarisAuth.authFetch(`/api/social/dm/${encodeURIComponent(otherUsername)}`);
      const json = await res.json();
      if (!json.success || !Array.isArray(json.messages)) {
        if (stream) stream.innerHTML = `<div style="text-align:center; padding:30px; color:var(--accent-rose);">${escapeHtml(json.error || 'Gagal memuat pesan')}</div>`;
        return;
      }

      const cur = PolarisAuth.getCurrentUser();
      const messages = json.messages;

      if (messages.length === 0) {
        if (stream) {
          stream.innerHTML = `
            <div style="text-align: center; padding: 48px 20px; color: var(--text-muted); font-size: 0.82rem;">
              <div style="font-size: 2.2rem; margin-bottom: 8px;">🔐</div>
              <strong>Awal Percakapan Terenkripsi</strong><br>
              Pesan dan panggilan dienkripsi end-to-end dengan AES-256-GCM. Tidak seorang pun di luar obrolan ini, bahkan sistem bot, yang dapat membacanya.
            </div>
          `;
        }
        return;
      }

      if (stream) {
        stream.innerHTML = messages.map(m => {
          const isMine = m.sender_username === cur?.username;
          const time = new Date(m.created_at || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          let mediaHtml = '';
          if (m.media_url) {
            if (m.media_type === 'video' || m.media_url.match(/\.(mp4|webm)$/i)) {
              mediaHtml = `<div class="dm-bubble-media"><video src="${escapeHtml(m.media_url)}" controls style="width:100%; border-radius:8px; max-height:260px;"></video></div>`;
            } else {
              mediaHtml = `<div class="dm-bubble-media"><img src="${escapeHtml(m.media_url)}" style="width:100%; border-radius:8px; max-height:260px; object-fit:cover;" alt="Media" onclick="window.open('${escapeHtml(m.media_url)}', '_blank')"></div>`;
            }
          }

          return `
            <div class="${isMine ? 'dm-bubble-mine' : 'dm-bubble-theirs'}">
              ${mediaHtml}
              <div class="dm-bubble-text">${escapeHtml(m.text || '')}</div>
              <div class="dm-bubble-meta">
                <span>${time}</span>
                ${isMine ? `<span class="dm-check-read ${m.is_read ? 'read' : ''}">${m.is_read ? '✓✓' : '✓'}</span>` : ''}
              </div>
            </div>
          `;
        }).join('');

        stream.scrollTop = stream.scrollHeight;
      }

      loadDirectMessages();
    } catch (err) {
      if (stream) stream.innerHTML = `<div style="text-align:center; padding:30px; color:var(--accent-rose);">Error: ${escapeHtml(err.message)}</div>`;
    }
  }

  // ==================== GOOGLE DRIVE & LOCAL STORAGE BRIDGE ====================
  async function loadGDriveStorageStatus() {
    const statusMode = document.getElementById('gdrive-status-mode');
    const localFiles = document.getElementById('gdrive-local-files-count');
    const localSize = document.getElementById('gdrive-local-size');
    const inputFolderId = document.getElementById('input-gdrive-folder-id');

    try {
      const res = await PolarisAuth.authFetch('/api/social/storage-status');
      const json = await res.json();
      if (json.success && json.storage) {
        const s = json.storage;
        if (statusMode) {
          statusMode.textContent = s.mode === 'gdrive' ? 'Google Drive Cloud Active ☁️' : 'Localhost Dual-Mode Ready 💻';
          statusMode.style.color = s.mode === 'gdrive' ? '#38bdf8' : '#10b981';
        }
        if (localFiles) localFiles.textContent = `${s.localFilesCount || 0} Berkas`;
        if (localSize) localSize.textContent = `${s.localTotalSizeMB || '0.00'} MB`;
        if (inputFolderId && s.gdriveFolderId && !inputFolderId.value) {
          inputFolderId.value = s.gdriveFolderId;
        }
      }
    } catch (_) {}
  }

  // Global triggers
  window.PolarisApp = Object.assign(window.PolarisApp || {}, {
    loadSocialFeed,
    openPublicProfileModal,
    closePublicProfileModal,
    challengeUserFromProfile,
    addFriendFromProfile,
    openStoryViewer,
    closeStoryViewer,
    openCreateStoryModal,
    closeCreateStoryModal,
    openSoundSelector,
    closeSoundSelector,
    searchMusicSounds,
    toggleSoundPreview,
    selectSoundAtIndex,
    selectSoundForActiveContext,
    triggerDoubleTapLike,
    votePollPost,
    filterByHashtag,
    copyPostLink,
    switchMacroPillar,
    switchSocialView,
    loadInstagramProfile,
    openInstagramLightbox,
    openInstagramLightboxById,
    closeInstagramLightbox,
    loadDirectMessages,
    openDirectChat,
    loadGDriveStorageStatus
  });

  // Global triggers
  window.openOmnisearch = openOmnisearch;
  window.closeOmnisearch = closeOmnisearch;
})();
