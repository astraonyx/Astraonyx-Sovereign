// dashboard/js/polaris-motion.js — Polaris Motion Engine (PME) Hardware-Accelerated Physics & Interactive Cursor
(function () {
  'use strict';

  // 1. HARDWARE-ACCELERATED ULTRA-SMOOTH CURSOR & FOLLOWER
  let cursor = document.getElementById('polaris-cursor');
  let follower = document.getElementById('polaris-cursor-follower');

  function ensureCursorElements() {
    if (!cursor) cursor = document.getElementById('polaris-cursor');
    if (!follower) follower = document.getElementById('polaris-cursor-follower');
    if (!cursor && document.body) {
      cursor = document.createElement('div');
      cursor.id = 'polaris-cursor';
      document.body.appendChild(cursor);
    }
    if (!follower && document.body) {
      follower = document.createElement('div');
      follower.id = 'polaris-cursor-follower';
      document.body.appendChild(follower);
    }
  }

  let mouseX = -100;
  let mouseY = -100;
  let followerX = -100;
  let followerY = -100;
  let isMouseInside = false;
  let rafId = null;

  function onMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!isMouseInside || followerX < 0) {
      isMouseInside = true;
      followerX = mouseX;
      followerY = mouseY;
      if (cursor) cursor.style.opacity = '1';
      if (follower) follower.style.opacity = '0.65';
    }
    if (cursor) {
      cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
    }
  }

  function onScrollOrWheel(e) {
    if (e && typeof e.clientX === 'number' && typeof e.clientY === 'number') {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }
    if (isMouseInside) {
      if (cursor) {
        cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
      }
      if (follower) {
        followerX = mouseX;
        followerY = mouseY;
        follower.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
      }
    }
  }

  function onMouseLeave() {
    isMouseInside = false;
    document.body.classList.remove('cursor-active');
    if (cursor) cursor.style.opacity = '0';
    if (follower) follower.style.opacity = '0';
  }

  function onMouseEnter(e) {
    isMouseInside = true;
    mouseX = e.clientX;
    mouseY = e.clientY;
    followerX = mouseX;
    followerY = mouseY;
    if (cursor) {
      cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
      cursor.style.opacity = '1';
    }
    if (follower) {
      follower.style.transform = `translate3d(${followerX}px, ${followerY}px, 0) translate(-50%, -50%)`;
      follower.style.opacity = '0.65';
    }
  }

  // RAF loop with smooth lerp physics for follower (60-120fps GPU compositor)
  function renderCursorFollower() {
    if (isMouseInside && follower) {
      const dx = mouseX - followerX;
      const dy = mouseY - followerY;
      if (Math.abs(dx) < 0.25 && Math.abs(dy) < 0.25) {
        followerX = mouseX;
        followerY = mouseY;
      } else {
        followerX += dx * 0.18;
        followerY += dy * 0.18;
      }
      follower.style.transform = `translate3d(${Math.round(followerX * 10) / 10}px, ${Math.round(followerY * 10) / 10}px, 0) translate(-50%, -50%)`;
    }
    rafId = requestAnimationFrame(renderCursorFollower);
  }

  function setupCursorListeners() {
    ensureCursorElements();
  }

  // Event delegation: always accurate, never gets stuck on element unmount
  document.addEventListener('mouseover', (e) => {
    if (e.target && e.target.closest('button, a, input, select, textarea, .nav-tab, .switch-container, .theme-card-option, .clickable, [role="button"], .ax-btn, .ax-tab, .ax-rail__item, .ax-pillar-link, .ax-pill, .ax-row--interactive')) {
      document.body.classList.add('cursor-active');
    } else {
      document.body.classList.remove('cursor-active');
    }
  }, { passive: true });

  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('scroll', onScrollOrWheel, { passive: true });
  window.addEventListener('wheel', onScrollOrWheel, { passive: true });
  document.addEventListener('mouseleave', onMouseLeave);
  document.addEventListener('mouseenter', onMouseEnter);
  window.addEventListener('blur', onMouseLeave);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) onMouseLeave();
  });

  // 2. MAGNETIC BUTTONS
  function initMagneticButtons() {
    const magneticBtns = document.querySelectorAll('.magnetic-btn');
    magneticBtns.forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.22}px, ${y * 0.22}px)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translate(0px, 0px)';
      });
    });
  }

  // 3. 3D CARD TILT INTERACTION
  function init3DCardTilt() {
    const cards = document.querySelectorAll('.tilt-card');
    cards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        if (rect.height > 380 || rect.width > 650) {
          card.style.transform = 'none';
          return;
        }
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = Math.max(-2.5, Math.min(2.5, ((y - centerY) / centerY) * -2.5));
        const rotateY = Math.max(-2.5, Math.min(2.5, ((x - centerX) / centerX) * 2.5));
        card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.008, 1.008, 1.008)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      });
    });
  }

  // 4. BUTTON RIPPLE EFFECT & PROCEDURAL HAPTIC AUDIO
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-polaris, .nav-tab, .ax-btn, .ax-tab, .ax-pillar-link, .ax-rail__tile, .ax-pill');
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'ripple-wave';
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);

      // Audio haptic feedback via procedural synthesis
      if (window.nanoSound && !window.nanoSound.isMuted) {
        if (btn.classList.contains('ax-btn--primary') || btn.classList.contains('btn-polaris')) {
          window.nanoSound.laser?.(800, 400, 0.08);
        } else {
          window.nanoSound.btnClick?.();
        }
      }
    }
  });

  // 5. TEXT SCRAMBLE HACKER EFFECT
  function scrambleText(element, finalString, duration = 800) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    const length = finalString.length;
    const startTime = Date.now();
    function update() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const revealedCount = Math.floor(progress * length);
      let output = '';
      for (let i = 0; i < length; i++) {
        if (i < revealedCount) output += finalString[i];
        else output += chars[Math.floor(Math.random() * chars.length)];
      }
      element.textContent = output;
      if (progress < 1) requestAnimationFrame(update);
    }
    update();
  }

  // 6. CANVAS STARFIELD BACKGROUND
  function initStarfield() {
    const canvas = document.getElementById('starfield-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });
    const numStars = Math.min(Math.floor((width * height) / 10000), 120);
    const stars = [];
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.4 + 0.3,
        alpha: Math.random() * 0.8 + 0.2,
        speed: Math.random() * 0.25 + 0.05,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
      });
    }
    function animateStars() {
      ctx.clearRect(0, 0, width, height);
      for (const s of stars) {
        s.y -= s.speed;
        if (s.y < 0) { s.y = height; s.x = Math.random() * width; }
        s.alpha += Math.sin(Date.now() * s.twinkleSpeed) * 0.01;
        s.alpha = Math.max(0.1, Math.min(0.9, s.alpha));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(186, 230, 253, ${s.alpha})`;
        ctx.fill();
      }
      requestAnimationFrame(animateStars);
    }
    animateStars();
  }

  // 7. CARD SPOTLIGHT TRACKER
  function initCardSpotlight() {
    document.addEventListener('mousemove', (e) => {
      const card = e.target.closest('.card-luxury, .feature-group-card, .platform-chip-card, .spotlight-card, .ax-panel, .ax-card, .ax-stat, .ax-pillar-link, .ax-home-hero, .ax-table-wrap');
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  }

  // 8. FLUID SLIDING TAB TRACKER
  function initSlidingTabs() {
    const navBar = document.getElementById('vercel-nav-tabs');
    const hoverPill = document.getElementById('vercel-tab-hover-pill');
    const activeIndicator = document.getElementById('vercel-tab-active-indicator');
    if (!navBar) return;
    function updateActiveIndicator() {
      const activeTab = navBar.querySelector('.nav-tab.active');
      if (!activeTab || !activeIndicator) return;
      const navRect = navBar.getBoundingClientRect();
      const tabRect = activeTab.getBoundingClientRect();
      if (tabRect.width === 0) {
        requestAnimationFrame(() => {
          const r2 = activeTab.getBoundingClientRect();
          const n2 = navBar.getBoundingClientRect();
          if (r2.width > 0) {
            activeIndicator.style.width = `${r2.width}px`;
            activeIndicator.style.transform = `translateX(${r2.left - n2.left + navBar.scrollLeft}px)`;
          }
        });
        return;
      }
      const left = tabRect.left - navRect.left + navBar.scrollLeft;
      const width = tabRect.width;
      activeIndicator.style.width = `${width}px`;
      activeIndicator.style.transform = `translateX(${left}px)`;
    }

    // Expose for external tab changers
    window.PolarisMotion = window.PolarisMotion || {};
    window.PolarisMotion.updateActiveIndicator = updateActiveIndicator;

    const tabs = navBar.querySelectorAll('.nav-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('mouseenter', () => {
        if (!hoverPill) return;
        const navRect = navBar.getBoundingClientRect();
        const tabRect = tab.getBoundingClientRect();
        const left = tabRect.left - navRect.left + navBar.scrollLeft;
        const width = tabRect.width;
        hoverPill.style.width = `${width}px`;
        hoverPill.style.transform = `translateX(${left}px)`;
        hoverPill.style.opacity = '1';
      });
      tab.addEventListener('click', () => {
        setTimeout(updateActiveIndicator, 40);
      });
    });
    navBar.addEventListener('mouseleave', () => {
      if (hoverPill) hoverPill.style.opacity = '0';
    });
    window.addEventListener('resize', updateActiveIndicator);
    window.addEventListener('polaris:tab-changed', updateActiveIndicator);
    setTimeout(updateActiveIndicator, 150);
  }

  // 9. IPHONE MOCKUP 3D PARALLAX TILT
  function initPhoneMockupTilt() {
    const mockups = document.querySelectorAll('.dl-iphone-mockup, .wa-phone-mockup');
    mockups.forEach((mockup) => {
      mockup.addEventListener('mousemove', (e) => {
        const rect = mockup.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = Math.max(-6, Math.min(6, ((y - centerY) / centerY) * -6));
        const rotateY = Math.max(-6, Math.min(6, ((x - centerX) / centerX) * 6));
        mockup.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.015, 1.015, 1.015)`;
      });
      mockup.addEventListener('mouseleave', () => {
        mockup.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      });
    });
  }

  // Expose global methods
  window.PolarisMotion = {
    init: function () {
      ensureCursorElements();
      setupCursorListeners();
      initMagneticButtons();
      init3DCardTilt();
      initCardSpotlight();
      initSlidingTabs();
      initPhoneMockupTilt();
      if (!rafId) renderCursorFollower();
    },
    refreshInteractive: function () {
      setupCursorListeners();
      initMagneticButtons();
      init3DCardTilt();
      initPhoneMockupTilt();
    },
    scrambleText,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.PolarisMotion.init();
    });
  } else {
    window.PolarisMotion.init();
  }
})();
