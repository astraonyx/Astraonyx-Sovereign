// dashboard/js/auth.js — Otentikasi & Sesi Polaris Dashboard dengan 2FA / OTP
(function () {
  'use strict';

  const TOKEN_KEY = 'polaris_token';
  const USER_KEY = 'polaris_user';
  let currentTempToken = null;
  let isVerifyingOtp = false;
  let pendingRegisterData = null;
  let currentRegisterSmsToken = null;
  let currentBindToken = null;
  let currentBindPhoneSmsToken = null;

  const isLoginPage = window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('/login') || window.location.href.includes('login.html');
  const isWelcomePage = window.location.pathname.endsWith('welcome.html') || window.location.pathname.endsWith('/welcome') || window.location.href.includes('welcome.html');
  const isPublicPage = isLoginPage || isWelcomePage;

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch (_) {
      return null;
    }
  }

  function setCurrentUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    currentTempToken = null;
  }

  // Helper fetch terotentikasi
  async function authFetch(url, options = {}) {
    const token = getToken();
    const headers = {
      ...(options.headers || {}),
    };
    // Jika body BUKAN FormData dan header Content-Type belum diset, gunakan application/json
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });
    if (response.status === 401 || response.status === 403) {
      let respJson = null;
      try {
        const cloned = response.clone();
        respJson = await cloned.json();
      } catch (_) {}

      if (respJson && (respJson.forceLogout || respJson.sessionTerminated || respJson.isBanned || respJson.requirePhone || response.status === 401)) {
        clearAuth();
        let reason = 'session_expired';
        if (respJson && respJson.sessionTerminated) {
          reason = 'other_device';
        } else if (respJson && respJson.isBanned) {
          reason = 'banned';
        } else if (respJson && respJson.requirePhone) {
          reason = 'require_phone';
        }

        const errorMsg = respJson?.error || 'Sesi telah berakhir.';
        if (!isPublicPage) {
          window.location.href = `login.html?reason=${reason}&msg=${encodeURIComponent(errorMsg)}`;
        } else if (isLoginPage) {
          showAuthModal(errorMsg);
        }
        throw new Error(errorMsg);
      }
    }
    return response;
  }

  // Tampilkan Modal Auth (Fallback jika masih di halaman modal)
  function showAuthModal(message = '') {
    if (!isLoginPage) {
      window.location.href = 'login.html';
      return;
    }
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.classList.add('active');
      const errEl = document.getElementById('auth-error-msg');
      if (errEl) {
        errEl.textContent = message;
        errEl.style.display = message ? 'block' : 'none';
      }
      hideOtpStep();
    }
  }

  function hideAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('active');
  }

  function updateUserUI(user) {
    if (!user) return;
    const usernameEl = document.getElementById('header-username');
    const roleEl = document.getElementById('header-role');
    const role = (user.role || 'member').toLowerCase();

    if (usernameEl) usernameEl.textContent = user.username;
    const wsUserEl = document.getElementById('header-workspace-user');
    if (wsUserEl) wsUserEl.textContent = user.displayName || user.username;
    if (roleEl) {
      roleEl.textContent = role.toUpperCase();
      roleEl.className = `badge badge-role-${role}`;
    }

    // Terapkan Invisible Barrier jika role Member
    if (role === 'member') {
      document.body.classList.add('wuna-role-member');
    } else {
      document.body.classList.remove('wuna-role-member');
    }

    // Panel Owner HANYA ADA & BISA DIBUKA jika akun tersebut role COSMOS (Owner)
    const isCosmos = role === 'cosmos';
    const ownerTabBtn = document.getElementById('tab-btn-owner');
    const ownerPane = document.getElementById('pane-owner');

    if (ownerTabBtn) {
      ownerTabBtn.style.setProperty('display', isCosmos ? 'inline-flex' : 'none', 'important');
    }

    if (!isCosmos) {
      if (ownerPane) {
        ownerPane.classList.remove('active');
        ownerPane.style.setProperty('display', 'none', 'important');
      }
      const activeNav = document.querySelector('.nav-tab.active');
      if (activeNav && activeNav.getAttribute('data-tab') === 'owner') {
        const overviewTab = document.querySelector('.nav-tab[data-tab="overview"]');
        if (overviewTab) overviewTab.click();
      }
    } else {
      if (ownerPane) {
        ownerPane.style.removeProperty('display');
      }
    }

    // Trigger update untuk panel Wuna management jika ada
    if (window.PolarisApp && typeof window.PolarisApp.onRoleUpdated === 'function') {
      window.PolarisApp.onRoleUpdated(user);
    }
  }

  // ==================== 6-DIGIT OTP TORNADO ENGINE ====================
  function resetOtpBoxes() {
    const digits = document.querySelectorAll('.otp-box-digit');
    digits.forEach((d) => {
      d.value = '';
      d.disabled = false;
      d.readOnly = false;
    });

    const grid = document.getElementById('otp-boxes-grid');
    if (grid) {
      grid.classList.remove('tornado-active');
      grid.classList.remove('tornado-reverse');
    }

    const center = document.getElementById('otp-tornado-center');
    if (center) {
      center.classList.remove('active', 'success', 'error');
    }

    const spinner = document.getElementById('otp-center-spinner');
    const checkmark = document.getElementById('otp-checkmark-svg');
    const cross = document.getElementById('otp-cross-svg');
    if (spinner) spinner.style.display = 'none';
    if (checkmark) checkmark.style.display = 'none';
    if (cross) cross.style.display = 'none';

    isVerifyingOtp = false;
  }

  function showOtpStep() {
    const tabSelector = document.getElementById('auth-tab-selector');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const regSmsForm = document.getElementById('register-sms-form');
    const bindPhoneForm = document.getElementById('bind-phone-form');
    const otpForm = document.getElementById('otp-form');

    if (tabSelector) tabSelector.style.display = 'none';
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'none';
    if (regSmsForm) regSmsForm.style.display = 'none';
    if (bindPhoneForm) bindPhoneForm.style.display = 'none';

    if (otpForm) {
      otpForm.style.display = 'block';
      resetOtpBoxes();
      const firstInput = document.querySelector('.otp-box-digit[data-index="0"]');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 250);
      }
    }
  }

  function hideOtpStep() {
    currentTempToken = null;
    const tabSelector = document.getElementById('auth-tab-selector');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const otpForm = document.getElementById('otp-form');
    const regSmsForm = document.getElementById('register-sms-form');
    const bindPhoneForm = document.getElementById('bind-phone-form');

    if (tabSelector) tabSelector.style.display = 'flex';
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
    if (otpForm) otpForm.style.display = 'none';
    if (regSmsForm) regSmsForm.style.display = 'none';
    if (bindPhoneForm) bindPhoneForm.style.display = 'none';
    resetOtpBoxes();
  }

  function showRegisterSmsStep(phoneNumber, previewOtps) {
    const tabSelector = document.getElementById('auth-tab-selector');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const otpForm = document.getElementById('otp-form');
    const regSmsForm = document.getElementById('register-sms-form');
    const bindPhoneForm = document.getElementById('bind-phone-form');

    if (tabSelector) tabSelector.style.display = 'none';
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'none';
    if (otpForm) otpForm.style.display = 'none';
    if (bindPhoneForm) bindPhoneForm.style.display = 'none';

    if (regSmsForm) {
      regSmsForm.style.display = 'block';
      const phoneDisplay = document.getElementById('reg-sms-phone-display');
      if (phoneDisplay) phoneDisplay.textContent = '+' + phoneNumber;

      const previewBox = document.getElementById('reg-sms-preview-box');
      const previewContent = document.getElementById('reg-sms-preview-content');
      if (previewOtps && previewBox && previewContent) {
        previewBox.style.display = 'block';
        previewContent.innerHTML = `OTP 1: <strong style="color:#38bdf8; letter-spacing:2px;">${previewOtps.otp1}</strong> &bull; OTP 2: <strong style="color:#38bdf8; letter-spacing:2px;">${previewOtps.otp2}</strong>`;
      } else if (previewBox) {
        previewBox.style.display = 'none';
      }

      const input1 = document.getElementById('reg-sms-otp1');
      const input2 = document.getElementById('reg-sms-otp2');
      if (input1) { input1.value = ''; setTimeout(() => input1.focus(), 250); }
      if (input2) input2.value = '';
    }
  }

  function hideRegisterSmsStep() {
    const regSmsForm = document.getElementById('register-sms-form');
    const registerForm = document.getElementById('register-form');
    const tabSelector = document.getElementById('auth-tab-selector');
    if (regSmsForm) regSmsForm.style.display = 'none';
    if (tabSelector) tabSelector.style.display = 'flex';
    if (registerForm) registerForm.style.display = 'block';
  }

  function showBindPhoneStep(username, message) {
    const tabSelector = document.getElementById('auth-tab-selector');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const otpForm = document.getElementById('otp-form');
    const regSmsForm = document.getElementById('register-sms-form');
    const bindPhoneForm = document.getElementById('bind-phone-form');

    if (tabSelector) tabSelector.style.display = 'none';
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'none';
    if (otpForm) otpForm.style.display = 'none';
    if (regSmsForm) regSmsForm.style.display = 'none';

    if (bindPhoneForm) {
      bindPhoneForm.style.display = 'block';
      const userDisplay = document.getElementById('bind-username-display');
      if (userDisplay) userDisplay.textContent = username || '';

      const phoneInput = document.getElementById('bind-phone-input');
      if (phoneInput) {
        phoneInput.value = '';
        setTimeout(() => phoneInput.focus(), 250);
      }
    }
  }

  function hideBindPhoneStep() {
    currentBindToken = null;
    currentBindPhoneSmsToken = null;
    const bindPhoneForm = document.getElementById('bind-phone-form');
    const tabSelector = document.getElementById('auth-tab-selector');
    const loginForm = document.getElementById('login-form');
    if (bindPhoneForm) bindPhoneForm.style.display = 'none';
    if (tabSelector) tabSelector.style.display = 'flex';
    if (loginForm) loginForm.style.display = 'block';
  }

  async function triggerOtpTornado() {
    if (isVerifyingOtp) return;

    const digits = Array.from(document.querySelectorAll('.otp-box-digit'));
    const otp = digits.map((d) => d.value.trim()).join('');

    if (otp.length < 6) {
      const errEl = document.getElementById('auth-error-msg');
      if (errEl) {
        errEl.textContent = 'Harap isi seluruh 6 digit PIN verifikasi!';
        errEl.style.display = 'block';
      }
      return;
    }

    isVerifyingOtp = true;
    digits.forEach((d) => (d.disabled = true));

    const grid = document.getElementById('otp-boxes-grid');
    const center = document.getElementById('otp-tornado-center');
    const spinner = document.getElementById('otp-center-spinner');
    const checkmark = document.getElementById('otp-checkmark-svg');
    const cross = document.getElementById('otp-cross-svg');
    const errEl = document.getElementById('auth-error-msg');
    if (errEl) errEl.style.display = 'none';

    // 1. Luncurkan Slowmo Tornado Animation
    if (grid) grid.classList.add('tornado-active');
    if (center) {
      center.classList.add('active');
      if (spinner) spinner.style.display = 'block';
      if (checkmark) checkmark.style.display = 'none';
      if (cross) cross.style.display = 'none';
    }

    const minAnimationDelay = new Promise((resolve) => setTimeout(resolve, 1400));

    try {
      if (!currentTempToken) {
        throw new Error('Sesi login telah kadaluarsa. Silakan ulangi.');
      }

      const fetchPromise = fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken: currentTempToken, otp }),
      }).then((r) => r.json());

      const [resData] = await Promise.all([fetchPromise, minAnimationDelay]);

      if (!resData.success) {
        throw new Error(resData.error || 'Verifikasi OTP gagal.');
      }

      // ==================== PENAUTAN NOMOR TELEPON JIKA AKUN BELUM TERTAUT ====================
      if (resData.requirePhoneBinding) {
        if (spinner) spinner.style.display = 'none';
        if (checkmark) checkmark.style.display = 'block';
        if (center) center.classList.add('success');
        await new Promise((resolve) => setTimeout(resolve, 600));

        currentBindToken = resData.bindToken;
        resetOtpBoxes();
        showBindPhoneStep(resData.user?.username || '', resData.message);
        return;
      }

      // ==================== ANIMASI SUKSES (CENTANG HIJAU) ====================
      if (spinner) spinner.style.display = 'none';
      if (checkmark) checkmark.style.display = 'block';
      if (center) center.classList.add('success');

      // Berikan jeda 850ms agar animasi drawing centang selesai dinikmati
      await new Promise((resolve) => setTimeout(resolve, 850));

      setToken(resData.token);
      setCurrentUser(resData.user);
      updateUserUI(resData.user);
      resetOtpBoxes();

      if (isLoginPage) {
        window.location.href = 'index.html';
      } else {
        hideAuthModal();
        if (window.PolarisApp) window.PolarisApp.refreshAll();
      }
    } catch (err) {
      // ==================== ANIMASI GAGAL (SILANG 'X' + SHAKE + REVERSE BURST) ====================
      await minAnimationDelay;

      if (spinner) spinner.style.display = 'none';
      if (cross) cross.style.display = 'block';
      if (center) center.classList.add('error');

      if (errEl) {
        errEl.textContent = err.message || 'Master PIN 6-Digit Salah!';
        errEl.style.display = 'block';
      }

      // Tunggu 800ms animasi silang dan getar
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Reset pusat orb
      if (center) center.classList.remove('active', 'error');
      if (cross) cross.style.display = 'none';

      // Reverse burst meledak kembali ke 6 kotak
      if (grid) {
        grid.classList.remove('tornado-active');
        grid.classList.add('tornado-reverse');
      }

      digits.forEach((d) => {
        d.value = '';
        d.disabled = false;
      });

      const firstBox = document.querySelector('.otp-box-digit[data-index="0"]');
      if (firstBox) firstBox.focus();

      setTimeout(() => {
        if (grid) grid.classList.remove('tornado-reverse');
        isVerifyingOtp = false;
      }, 700);
    }
  }

  function setupOtpBoxes() {
    const digits = document.querySelectorAll('.otp-box-digit');
    if (!digits.length) return;

    digits.forEach((input, idx) => {
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^0-9a-zA-Z]/g, '');
        e.target.value = val ? val.slice(-1) : '';

        if (e.target.value && idx < digits.length - 1) {
          digits[idx + 1].focus();
        }

        // Cek apakah seluruh 6 digit sudah terisi
        const allFilled = Array.from(digits).every((d) => d.value.length === 1);
        if (allFilled) {
          triggerOtpTornado();
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace') {
          if (!input.value && idx > 0) {
            digits[idx - 1].focus();
            digits[idx - 1].value = '';
          }
        } else if (e.key === 'ArrowLeft' && idx > 0) {
          digits[idx - 1].focus();
        } else if (e.key === 'ArrowRight' && idx < digits.length - 1) {
          digits[idx + 1].focus();
        }
      });

      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const clipboard = (e.clipboardData || window.clipboardData).getData('text').trim();
        const clean = clipboard.replace(/[^0-9a-zA-Z]/g, '').slice(0, 6);
        if (!clean) return;

        clean.split('').forEach((char, i) => {
          if (digits[i]) digits[i].value = char;
        });

        if (clean.length === 6) {
          digits[5].focus();
          triggerOtpTornado();
        } else if (digits[clean.length]) {
          digits[clean.length].focus();
        }
      });
    });
  }

  async function checkSession() {
    const token = getToken();
    if (!token) {
      if (!isPublicPage) {
        window.location.href = 'login.html';
      }
      return false;
    }

    try {
      const res = await authFetch('/api/auth/me');
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
        updateUserUI(data.user);
        if (isLoginPage) {
          window.location.href = 'index.html';
        } else {
          hideAuthModal();
        }
        return true;
      }
    } catch (_) {
      // Session invalid
    }
    clearAuth();
    if (!isPublicPage) {
      window.location.href = 'login.html';
    }
    return false;
  }

  // Heartbeat check: Single-device & Ban detector (setiap 20 detik)
  setInterval(async () => {
    const token = getToken();
    if (!token || isPublicPage) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401 || res.status === 403) {
        const data = await res.json().catch(() => ({}));
        let reason = 'session_expired';
        if (data.sessionTerminated) reason = 'other_device';
        else if (data.isBanned || res.status === 403) reason = 'banned';
        else if (data.requirePhone) reason = 'require_phone';
        clearAuth();
        window.location.href = `login.html?reason=${reason}&msg=${encodeURIComponent(data.error || 'Sesi akun Anda telah berakhir.')}`;
      }
    } catch (_) {}
  }, 20000);

  // Login handler (Menerima username ATAU Nomor WhatsApp + Password)
  async function handleLogin(identifier, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, username: identifier, password }),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Login gagal.');
    }

    // Jika akun belum dikaitkan dengan nomor WhatsApp/telepon
    // Sesuai alur: login normal -> jika belum dikaitkan masuk ke fase kaitkan -> abis kelar baru masukin pin
    if (data.requirePhoneBinding) {
      currentBindToken = data.bindToken;
      showBindPhoneStep(data.username, data.message);
      return data;
    }

    // Jika akun mewajibkan 2FA
    if (data.require2FA) {
      currentTempToken = data.tempToken;
      showOtpStep();
      return data;
    }

    setToken(data.token);
    setCurrentUser(data.user);
    updateUserUI(data.user);
    if (isLoginPage) {
      window.location.href = 'index.html';
    } else {
      hideAuthModal();
      if (window.PolarisApp) window.PolarisApp.refreshAll();
    }
    return data;
  }

  // Register handler (Validasi deteksi WhatsApp & langsung lanjut ke Master PIN)
  async function handleRegister(username, password, phoneNumber, pin) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, phoneNumber, pin }),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Pendaftaran akun gagal.');
    }

    if (data.require2FA && data.tempToken) {
      currentTempToken = data.tempToken;
      showOtpStep();
      const otpSub = document.querySelector('#otp-form .auth-subtitle');
      if (otpSub) {
        otpSub.innerHTML = `Akun <strong>${username}</strong> berhasil didaftarkan!<br>Silakan masukkan Master PIN akun Anda.`;
      }
      return data;
    }

    if (data.token) {
      setToken(data.token);
      setCurrentUser(data.user);
      updateUserUI(data.user);
      if (isLoginPage) window.location.href = 'index.html';
      else hideAuthModal();
    }
    return data;
  }

  function logout() {
    clearAuth();
    window.location.href = 'login.html';
  }

  // Event Listeners Auth Forms
  document.addEventListener('DOMContentLoaded', () => {
    const loginTabBtn = document.getElementById('tab-login-btn');
    const registerTabBtn = document.getElementById('tab-register-btn');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const registerSmsForm = document.getElementById('register-sms-form');
    const bindPhoneForm = document.getElementById('bind-phone-form');
    const otpForm = document.getElementById('otp-form');
    const cancelOtpBtn = document.getElementById('btn-cancel-otp');
    const logoutBtn = document.getElementById('btn-logout');

    const btnBackReg = document.getElementById('btn-back-reg');
    const btnCancelBind = document.getElementById('btn-cancel-bind');
    const btnBackBindPhone = document.getElementById('btn-back-bind-phone');
    const btnSendBindSms = document.getElementById('btn-send-bind-sms');

    setupOtpBoxes();

    // Auto-advance & paste handler untuk Dual OTP (6 Digit + 6 Digit)
    function setupDualOtpInputs(input1Id, input2Id) {
      const in1 = document.getElementById(input1Id);
      const in2 = document.getElementById(input2Id);
      if (!in1 || !in2) return;

      in1.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^0-9]/g, '');
        e.target.value = val.slice(0, 6);
        if (e.target.value.length === 6) {
          in2.focus();
        }
      });

      in2.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^0-9]/g, '');
        e.target.value = val.slice(0, 6);
      });

      in1.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData('text').trim().replace(/[^0-9]/g, '');
        if (pasted.length >= 12) {
          in1.value = pasted.slice(0, 6);
          in2.value = pasted.slice(6, 12);
          in2.focus();
        } else if (pasted.length >= 6) {
          in1.value = pasted.slice(0, 6);
          in2.focus();
        } else {
          in1.value = pasted;
        }
      });
    }

    setupDualOtpInputs('reg-sms-otp1', 'reg-sms-otp2');
    setupDualOtpInputs('bind-sms-otp1', 'bind-sms-otp2');

    if (loginTabBtn && registerTabBtn) {
      loginTabBtn.addEventListener('click', () => {
        loginTabBtn.classList.add('active');
        registerTabBtn.classList.remove('active');
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        if (registerSmsForm) registerSmsForm.style.display = 'none';
        if (bindPhoneForm) bindPhoneForm.style.display = 'none';
        document.getElementById('auth-error-msg').style.display = 'none';
      });

      registerTabBtn.addEventListener('click', () => {
        registerTabBtn.classList.add('active');
        loginTabBtn.classList.remove('active');
        registerForm.style.display = 'block';
        loginForm.style.display = 'none';
        if (registerSmsForm) registerSmsForm.style.display = 'none';
        if (bindPhoneForm) bindPhoneForm.style.display = 'none';
        document.getElementById('auth-error-msg').style.display = 'none';
      });
    }

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('login-username').value.trim();
        const p = document.getElementById('login-password').value;
        const errEl = document.getElementById('auth-error-msg');
        try {
          errEl.style.display = 'none';
          await handleLogin(u, p);
        } catch (err) {
          errEl.textContent = err.message;
          errEl.style.display = 'block';
          loginForm.classList.add('shake-error');
          setTimeout(() => loginForm.classList.remove('shake-error'), 500);
        }
      });
    }

    if (otpForm) {
      otpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        triggerOtpTornado();
      });
    }

    if (cancelOtpBtn) {
      cancelOtpBtn.addEventListener('click', () => {
        hideOtpStep();
      });
    }

    // Step 1 Register: Validasi Form & Kirim SMS
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('reg-username').value.trim();
        const phone = document.getElementById('reg-phone')?.value.trim();
        const p = document.getElementById('reg-password').value;
        const p2 = document.getElementById('reg-password-confirm').value;
        const pin = document.getElementById('reg-pin')?.value.trim() || '';
        const errEl = document.getElementById('auth-error-msg');

        if (!phone || phone.replace(/\D/g, '').length < 9) {
          errEl.textContent = 'Nomor telepon wajib diisi (minimal 9 digit angka, contoh: 0812xxx atau 628xxx).';
          errEl.style.display = 'block';
          registerForm.classList.add('shake-error');
          setTimeout(() => registerForm.classList.remove('shake-error'), 500);
          return;
        }

        if (p !== p2) {
          errEl.textContent = 'Konfirmasi password tidak cocok.';
          errEl.style.display = 'block';
          registerForm.classList.add('shake-error');
          setTimeout(() => registerForm.classList.remove('shake-error'), 500);
          return;
        }

        if (pin && !/^\d{6}$/.test(pin)) {
          errEl.textContent = 'Master PIN harus berupa 6 digit angka.';
          errEl.style.display = 'block';
          registerForm.classList.add('shake-error');
          setTimeout(() => registerForm.classList.remove('shake-error'), 500);
          return;
        }

        try {
          errEl.style.display = 'none';
          await handleRegister(u, p, phone, pin);
        } catch (err) {
          errEl.textContent = err.message;
          errEl.style.display = 'block';
          registerForm.classList.add('shake-error');
          setTimeout(() => registerForm.classList.remove('shake-error'), 500);
        }
      });
    }

    // Tombol Kembali dari verifikasi SMS pendaftaran
    if (btnBackReg) {
      btnBackReg.addEventListener('click', () => {
        hideRegisterSmsStep();
      });
    }

    // Step 2 Register: Verifikasi 2 Kode OTP SMS (6 Digit + 6 Digit)
    if (registerSmsForm) {
      registerSmsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const otp1 = document.getElementById('reg-sms-otp1').value.trim();
        const otp2 = document.getElementById('reg-sms-otp2').value.trim();
        const errEl = document.getElementById('auth-error-msg');

        if (!/^\d{6}$/.test(otp1) || !/^\d{6}$/.test(otp2)) {
          errEl.textContent = 'Harap masukkan kedua kode OTP yang diterima via SMS (masing-masing 6 digit angka).';
          errEl.style.display = 'block';
          registerSmsForm.classList.add('shake-error');
          setTimeout(() => registerSmsForm.classList.remove('shake-error'), 500);
          return;
        }

        try {
          errEl.style.display = 'none';
          const res = await fetch('/api/auth/register-verify-sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionToken: currentRegisterSmsToken,
              otp1,
              otp2,
              ...pendingRegisterData,
            }),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || 'Verifikasi OTP SMS gagal.');

          setToken(data.token);
          setCurrentUser(data.user);
          updateUserUI(data.user);
          if (isLoginPage) window.location.href = 'index.html';
          else hideAuthModal();
        } catch (err) {
          errEl.textContent = err.message;
          errEl.style.display = 'block';
          registerSmsForm.classList.add('shake-error');
          setTimeout(() => registerSmsForm.classList.remove('shake-error'), 500);
        }
      });
    }

    // Tombol Batal & Kembali Penautan Nomor Telepon
    if (btnCancelBind) {
      btnCancelBind.addEventListener('click', () => {
        hideBindPhoneStep();
      });
    }
    if (btnBackBindPhone) {
      btnBackBindPhone.addEventListener('click', () => {
        const stepPhone = document.getElementById('bind-step-phone');
        const stepOtp = document.getElementById('bind-step-otp');
        if (stepPhone) stepPhone.style.display = 'block';
        if (stepOtp) stepOtp.style.display = 'none';
      });
    }

    // Penautan Nomor WhatsApp Langsung (Verifikasi deteksi WhatsApp -> Lanjut ke Master PIN)
    if (bindPhoneForm) {
      bindPhoneForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const phoneInput = document.getElementById('bind-phone-input');
        const phone = phoneInput ? phoneInput.value.trim() : '';
        const errEl = document.getElementById('auth-error-msg');

        if (!phone || phone.replace(/\D/g, '').length < 9) {
          errEl.textContent = 'Nomor WhatsApp wajib diisi (minimal 9 digit angka, contoh: 0812xxx atau 628xxx).';
          errEl.style.display = 'block';
          bindPhoneForm.classList.add('shake-error');
          setTimeout(() => bindPhoneForm.classList.remove('shake-error'), 500);
          return;
        }

        const submitBtn = document.getElementById('btn-submit-bind-direct') || bindPhoneForm.querySelector('button[type="submit"]');
        const origBtnText = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `<span>Memverifikasi WhatsApp...</span>`;
        }

        try {
          errEl.style.display = 'none';
          const res = await fetch('/api/auth/bind-phone/direct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bindToken: currentBindToken,
              phoneNumber: phone,
            }),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || 'Penautan nomor WhatsApp gagal.');

          // Sesuai alur instruksi: "abis kelar kaitkan baru masukin pin"
          if (data.require2FA && data.tempToken) {
            currentTempToken = data.tempToken;
            currentBindToken = null;
            if (bindPhoneForm) bindPhoneForm.style.display = 'none';
            showOtpStep();
            const otpSub = document.querySelector('#otp-form .auth-subtitle');
            if (otpSub) {
              const uName = data.user?.username || data.username || '';
              const uPhone = data.user?.phoneNumber || data.phoneNumber || '';
              otpSub.innerHTML = `Nomor <span style="color:#22c55e;font-weight:600;">+${uPhone}</span> berhasil diverifikasi di WhatsApp!<br>Silakan masukkan 6-Digit Master PIN akun <strong>${uName}</strong>.`;
            }
            return;
          }

          setToken(data.token);
          setCurrentUser(data.user);
          updateUserUI(data.user);
          if (isLoginPage) window.location.href = 'index.html';
          else hideAuthModal();
        } catch (err) {
          errEl.textContent = err.message;
          errEl.style.display = 'block';
          bindPhoneForm.classList.add('shake-error');
          setTimeout(() => bindPhoneForm.classList.remove('shake-error'), 500);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origBtnText;
          }
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
      });
    }

    checkSession();
  });

  window.PolarisAuth = {
    getToken,
    getCurrentUser,
    setCurrentUser,
    authFetch,
    checkSession,
    logout,
    showAuthModal,
    updateUserUI,
  };
})();
