/**
 * Polaris Components Engine — Taste Skill & UI-UX Pro Max Integration
 * Powers Spotlight, Rainbow Buttons, and PromptInput
 */

(function () {
  'use strict';

  // 1. ==================== SPOTLIGHT CARD ENGINE ====================
  function initSpotlightCard() {
    const cards = document.querySelectorAll('.spline-spotlight-card');
    cards.forEach((card) => {
      const glow = card.querySelector('.spotlight-glow');
      if (!glow) return;

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        glow.style.left = x + 'px';
        glow.style.top = y + 'px';
        glow.style.opacity = '1';
      });

      card.addEventListener('mouseleave', () => {
        glow.style.opacity = '0';
      });
    });
  }

  // 3. ==================== PROMPT INPUT (AI-CHAT-INPUT) ====================
  function initPromptInput() {
    const container = document.getElementById('hermes-prompt-outer');
    if (!container) return;

    const textarea = document.getElementById('hermes-chat-input');
    const boxCard = container.querySelector('.prompt-box-card');
    const modelChip = document.getElementById('prompt-model-chip');
    const modelNameSpan = document.getElementById('prompt-model-name');
    const modelsMenu = document.getElementById('prompt-models-menu');
    const effortChip = document.getElementById('prompt-effort-chip');
    const effortNameSpan = document.getElementById('prompt-effort-name');
    const actionBtn = document.getElementById('btn-hermes-send');
    const waveBars = container.querySelectorAll('.prompt-wave-bar');
    const tray = document.getElementById('prompt-attachment-tray');
    const fileInput = document.getElementById('prompt-file-input');
    const btnAttach = document.getElementById('prompt-attach-btn');

    let isRecording = false;
    let audioInterval = null;
    const efforts = ['Low', 'Medium', 'Max Effort'];
    let currentEffortIdx = 1;

    // Expand textarea on focus or input
    function autoResize() {
      if (!textarea) return;
      textarea.style.height = 'auto';
      const scrollHeight = Math.max(52, Math.min(textarea.scrollHeight, 150));
      textarea.style.height = scrollHeight + 'px';
    }

    if (textarea) {
      textarea.addEventListener('input', () => {
        autoResize();
        updateActionState();
      });
      textarea.addEventListener('focus', () => {
        container.style.maxWidth = '640px';
      });
      textarea.addEventListener('blur', () => {
        if (!textarea.value.trim() && !isRecording) {
          container.style.maxWidth = '580px';
        }
      });
    }

    // Effort cycle
    if (effortChip && effortNameSpan) {
      effortChip.addEventListener('click', (e) => {
        e.stopPropagation();
        currentEffortIdx = (currentEffortIdx + 1) % efforts.length;
        effortNameSpan.textContent = efforts[currentEffortIdx];
      });
    }

    // Model selection
    if (modelChip && modelsMenu) {
      modelChip.addEventListener('click', (e) => {
        e.stopPropagation();
        modelsMenu.style.display = modelsMenu.style.display === 'flex' ? 'none' : 'flex';
      });

      document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
          modelsMenu.style.display = 'none';
        }
      });

      modelsMenu.querySelectorAll('.prompt-model-option').forEach((opt) => {
        opt.addEventListener('click', () => {
          const modelName = opt.getAttribute('data-model');
          if (modelNameSpan) modelNameSpan.textContent = modelName;
          modelsMenu.querySelectorAll('.prompt-model-option').forEach(o => o.classList.remove('selected'));
          opt.classList.add('selected');
          modelsMenu.style.display = 'none';

          // Sync with inline active model label
          const activeModelBadge = document.getElementById('hermes-chat-active-model');
          if (activeModelBadge) activeModelBadge.textContent = modelName;
        });
      });
    }

    // Attachment Chooser
    if (btnAttach && fileInput && tray) {
      btnAttach.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
          tray.classList.add('has-items');
          const inner = tray.querySelector('.prompt-attachment-inner');
          files.forEach((file) => {
            const thumb = document.createElement('div');
            thumb.className = 'prompt-thumb-item';
            const url = URL.createObjectURL(file);
            thumb.innerHTML = '<img src="' + url + '" alt="' + file.name + '"><button class="prompt-thumb-remove">✕</button>';
            thumb.querySelector('.prompt-thumb-remove').addEventListener('click', (ev) => {
              ev.stopPropagation();
              thumb.remove();
              if (inner.children.length === 0) tray.classList.remove('has-items');
            });
            inner.appendChild(thumb);
          });
          updateActionState();
        }
      });
    }

    // Mic / Recording / Action Button
    function updateActionState() {
      if (!actionBtn) return;
      const hasText = textarea && textarea.value.trim().length > 0;
      const iconArrow = actionBtn.querySelector('.icon-arrow');
      const iconMic = actionBtn.querySelector('.icon-mic');
      const iconStop = actionBtn.querySelector('.icon-stop');

      if (isRecording) {
        if (iconArrow) iconArrow.style.display = 'none';
        if (iconMic) iconMic.style.display = 'none';
        if (iconStop) iconStop.style.display = 'block';
      } else if (hasText) {
        if (iconArrow) iconArrow.style.display = 'block';
        if (iconMic) iconMic.style.display = 'none';
        if (iconStop) iconStop.style.display = 'none';
      } else {
        if (iconArrow) iconArrow.style.display = 'none';
        if (iconMic) iconMic.style.display = 'block';
        if (iconStop) iconStop.style.display = 'none';
      }
    }

    function toggleRecording() {
      isRecording = !isRecording;
      const visualizer = container.querySelector('.prompt-audio-waves');

      if (isRecording) {
        if (visualizer) visualizer.style.display = 'flex';
        audioInterval = setInterval(() => {
          waveBars.forEach((bar) => {
            const h = Math.floor(Math.random() * 20) + 4;
            bar.style.height = h + 'px';
          });
        }, 80);

        // Voice recognition simulation / Web Speech API
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRec) {
          try {
            const rec = new SpeechRec();
            rec.onresult = (ev) => {
              const transcript = ev.results[0][0].transcript;
              if (textarea) {
                textarea.value = (textarea.value ? textarea.value + ' ' : '') + transcript;
                autoResize();
                updateActionState();
              }
            };
            rec.onend = () => {
              toggleRecording();
            };
            rec.start();
          } catch (err) {
            console.warn(err);
          }
        }
      } else {
        if (audioInterval) clearInterval(audioInterval);
        waveBars.forEach((bar) => (bar.style.height = '4px'));
        if (visualizer) visualizer.style.display = 'none';
      }
      updateActionState();
    }

    if (actionBtn) {
      actionBtn.addEventListener('click', (e) => {
        const hasText = textarea && textarea.value.trim().length > 0;
        if (isRecording) {
          toggleRecording();
        } else if (!hasText) {
          toggleRecording();
        }
        // If hasText, regular send event will trigger via existing handler
      });
    }

    updateActionState();
  }

  // 4. ==================== THEME SWITCHER ====================
  function initThemeSwitcher() {
    const buttons = document.querySelectorAll('.theme-pill-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-theme');
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        if (window.Kinetix && typeof window.Kinetix.setTheme === 'function') {
          window.Kinetix.setTheme(theme === 'light' ? 'solar_light' : 'polaris_classic');
        } else {
          if (theme === 'light') {
            document.documentElement.classList.add('light-theme');
            document.documentElement.classList.remove('dark-theme');
          } else {
            document.documentElement.classList.remove('light-theme');
            document.documentElement.classList.add('dark-theme');
          }
        }
      });
    });
  }

  // 5. ==================== GLOBAL SHORTCUTS & VERCEL TAB SCROLL ====================
  function initKeyboardNavigation() {
    // Ctrl/⌘+K dan "/" dimiliki omnisearch (app.js) dan Ctrl/⌘+J dimiliki launcher orbit;
    // di sini hanya pintasan angka 1-9 untuk item sidebar yang sedang terlihat.
    window.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (!/^[1-9]$/.test(e.key)) return;
      const el = document.activeElement;
      const tag = el ? el.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || (el && el.isContentEditable)) return;
      // Jangan bentrok dengan modal / omnisearch / launcher yang sedang terbuka
      if (document.querySelector('.modal-backdrop.active, .orbit-backdrop.active, #polaris-omnisearch-modal[style*="flex"]')) return;

      const items = document.querySelectorAll('#polaris-sidebar-unified .sidebar-nav-list .sidebar-nav-item');
      const btn = items[parseInt(e.key, 10) - 1];
      if (btn) {
        e.preventDefault();
        btn.click();
      }
    });
  }

  // 6. ==================== VERCEL FLOATING NAV SLIDER & BUTTON MOTION ====================
  function initVercelNavSlider() {
    const container = document.getElementById('vercel-nav-tabs');
    const hoverPill = document.getElementById('vercel-tab-hover-pill');
    const activeIndicator = document.getElementById('vercel-tab-active-indicator');
    if (!container || !hoverPill || !activeIndicator) return;

    const tabs = container.querySelectorAll('.nav-tab');

    function updateActiveIndicator(tab) {
      if (!tab) return;
      const left = tab.offsetLeft;
      const width = tab.offsetWidth;
      activeIndicator.style.transform = `translateX(${left}px)`;
      activeIndicator.style.width = `${width}px`;
      activeIndicator.style.opacity = '1';
    }

    function updateHoverPill(tab) {
      if (!tab) return;
      const left = tab.offsetLeft;
      const width = tab.offsetWidth;
      hoverPill.style.transform = `translateX(${left}px)`;
      hoverPill.style.width = `${width}px`;
      hoverPill.style.opacity = '1';
    }

    // Set initial active indicator position
    function syncActive() {
      const currentActive = container.querySelector('.nav-tab.active') || tabs[0];
      if (currentActive) updateActiveIndicator(currentActive);
    }

    // Run sync after styles and fonts load
    requestAnimationFrame(syncActive);
    setTimeout(syncActive, 200);
    setTimeout(syncActive, 800);

    tabs.forEach((tab) => {
      tab.addEventListener('mouseenter', () => {
        updateHoverPill(tab);
      });

      tab.addEventListener('click', () => {
        updateActiveIndicator(tab);
      });
    });

    container.addEventListener('mouseleave', () => {
      hoverPill.style.opacity = '0';
    });

    window.addEventListener('resize', syncActive);

    // Watch for class changes on tabs (e.g. when switched via app.js or shortcuts)
    const observer = new MutationObserver(() => {
      syncActive();
    });
    tabs.forEach((t) => observer.observe(t, { attributes: true, attributeFilter: ['class'] }));
  }

  // Universal button tactile ripple & aura bounce
  function initButtonAuraMotion() {
    document.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('.btn-polaris, .btn-rainbow');
      if (!btn) return;

      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const ripple = document.createElement('span');
      ripple.className = 'btn-aura-ripple';
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      btn.appendChild(ripple);

      setTimeout(() => ripple.remove(), 600);
    });
  }

  // 7. ==================== HERO 3D SPLINE STAGE & FULLSCREEN MODE ====================
  function initHeroSplineStage() {
    const card = document.getElementById('dashboard-hero-spline-card');
    const viewer = document.getElementById('hero-spline-viewer');
    const btnFullscreen1 = document.getElementById('btn-hero-fullscreen-toggle');
    const btnFullscreen2 = document.getElementById('btn-corner-fullscreen-toggle');
    const scenePills = document.querySelectorAll('.hero-scene-pill');

    function toggleFullscreen() {
      if (!card) return;
      const isFull = card.classList.toggle('fullscreen-stage-active');
      if (btnFullscreen1) btnFullscreen1.innerHTML = `<span>${isFull ? '✕' : '⛶'}</span> ${isFull ? 'Exit Fullscreen' : 'Fullscreen Stage'}`;
      if (btnFullscreen2) btnFullscreen2.innerHTML = `<span>${isFull ? '✕' : '⛶'}</span> ${isFull ? 'Exit' : 'Fullscreen'}`;
      document.body.style.overflow = isFull ? 'hidden' : '';
    }

    if (btnFullscreen1) btnFullscreen1.addEventListener('click', toggleFullscreen);
    if (btnFullscreen2) btnFullscreen2.addEventListener('click', toggleFullscreen);

    // Escape key exits fullscreen stage
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && card && card.classList.contains('fullscreen-stage-active')) {
        toggleFullscreen();
      }
    });

    // Scene Switcher Pills
    scenePills.forEach((pill) => {
      pill.addEventListener('click', () => {
        scenePills.forEach((p) => {
          p.classList.remove('active');
          p.style.color = '#94a3b8';
          p.style.background = 'rgba(255, 255, 255, 0.04)';
          p.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        });
        pill.classList.add('active');
        pill.style.color = '#38bdf8';
        pill.style.background = 'rgba(56, 189, 248, 0.12)';
        pill.style.borderColor = 'rgba(56, 189, 248, 0.35)';

        const sceneUrl = pill.getAttribute('data-scene');
        if (viewer && sceneUrl) {
          viewer.setAttribute('url', sceneUrl);
        }
      });
    });
  }

  // Initialize all after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initSpotlightCard();
      initPromptInput();
      initThemeSwitcher();
      initKeyboardNavigation();
      initVercelNavSlider();
      initButtonAuraMotion();
      initHeroSplineStage();
    });
  } else {
    initSpotlightCard();
    initPromptInput();
    initThemeSwitcher();
    initKeyboardNavigation();
    initVercelNavSlider();
    initButtonAuraMotion();
    initHeroSplineStage();
  }
})();
