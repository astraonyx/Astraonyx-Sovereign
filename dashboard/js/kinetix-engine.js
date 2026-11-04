// dashboard/js/kinetix-engine.js — Unified Kinetix Theme Engine, Audio Synthesizer & Motion Studio for Polaris

(function () {
  'use strict';

  // ==================== 0. INDEXEDDB AUDIO PERSISTENCE ====================
  const PolarisAudioDB = {
    _db: null,
    async getDB() {
      if (this._db) return this._db;
      return new Promise((resolve) => {
        if (typeof indexedDB === 'undefined') return resolve(null);
        const req = indexedDB.open('polaris_audio_storage_db', 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('audio_tracks')) {
            db.createObjectStore('audio_tracks', { keyPath: 'slot' });
          }
        };
        req.onsuccess = (e) => {
          this._db = e.target.result;
          resolve(this._db);
        };
        req.onerror = () => resolve(null);
      });
    },
    async saveAudio(slot, dataUrl, name) {
      const db = await this.getDB();
      if (!db) {
        try { localStorage.setItem('polaris_audio_' + slot, JSON.stringify({ dataUrl, name })); } catch (_) {}
        return;
      }
      return new Promise((resolve) => {
        try {
          const tx = db.transaction('audio_tracks', 'readwrite');
          tx.objectStore('audio_tracks').put({ slot, dataUrl, name, timestamp: Date.now() });
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (_) { resolve(false); }
      });
    },
    async getAudio(slot) {
      const db = await this.getDB();
      if (!db) {
        try {
          const item = localStorage.getItem('polaris_audio_' + slot);
          return item ? JSON.parse(item) : null;
        } catch (_) { return null; }
      }
      return new Promise((resolve) => {
        try {
          const tx = db.transaction('audio_tracks', 'readonly');
          const req = tx.objectStore('audio_tracks').get(slot);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        } catch (_) { resolve(null); }
      });
    },
    async removeAudio(slot) {
      const db = await this.getDB();
      try { localStorage.removeItem('polaris_audio_' + slot); } catch (_) {}
      if (!db) return;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction('audio_tracks', 'readwrite');
          tx.objectStore('audio_tracks').delete(slot);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (_) { resolve(false); }
      });
    }
  };

  // ==================== 1. PROCEDURAL WEB AUDIO SYNTHESIZER & GENERATIVE BGM ====================
  let audioCtx = null;
  let sfxGainNode = null;
  let bgmGainNode = null;

  let soundEnabled = localStorage.getItem('polaris_sound_enabled') !== 'false';
  let audioMode = localStorage.getItem('polaris_audio_mode') || 'synth'; // 'synth' | 'custom'
  let sfxVolume = parseFloat(localStorage.getItem('polaris_sfx_vol') || '0.7');
  let bgmVolume = parseFloat(localStorage.getItem('polaris_bgm_vol') || '0.35');
  let currentBgmTrack = localStorage.getItem('polaris_bgm_track') || 'cosmic';
  let isBgmPlaying = false;
  let bgmTimer = null;
  let bgmStepIndex = 0;
  let activeBgmNodes = [];

  // Custom MP3 audio pipeline
  const customBgmAudio = typeof Audio !== 'undefined' ? new Audio() : null;
  if (customBgmAudio) {
    customBgmAudio.loop = true;
    customBgmAudio.crossOrigin = 'anonymous';
  }
  let customBgmMeta = null;
  let customBgmSourceNode = null;
  const customSfxMap = {}; // { [slot]: { url, name } }

  // 3-Band Parametric Audio Equalizer Nodes & SFX Pitch
  let eqBassNode = null;
  let eqMidNode = null;
  let eqTrebleNode = null;
  let eqBassVal = parseFloat(localStorage.getItem('polaris_eq_bass') || '0');
  let eqMidVal = parseFloat(localStorage.getItem('polaris_eq_mid') || '0');
  let eqTrebleVal = parseFloat(localStorage.getItem('polaris_eq_treble') || '0');
  let sfxPitchRate = parseFloat(localStorage.getItem('polaris_sfx_pitch') || '1.0');

  function getAudioContext() {
    if (typeof window === 'undefined') return null;
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        sfxGainNode = audioCtx.createGain();
        sfxGainNode.gain.setValueAtTime(sfxVolume, audioCtx.currentTime);
        sfxGainNode.connect(audioCtx.destination);

        bgmGainNode = audioCtx.createGain();
        bgmGainNode.gain.setValueAtTime(bgmVolume, audioCtx.currentTime);

        // 3-Band Parametric EQ Filters: bgmGainNode -> Bass -> Mid -> Treble -> Destination
        eqBassNode = audioCtx.createBiquadFilter();
        eqBassNode.type = 'lowshelf';
        eqBassNode.frequency.setValueAtTime(100, audioCtx.currentTime);
        eqBassNode.gain.setValueAtTime(eqBassVal, audioCtx.currentTime);

        eqMidNode = audioCtx.createBiquadFilter();
        eqMidNode.type = 'peaking';
        eqMidNode.frequency.setValueAtTime(1000, audioCtx.currentTime);
        eqMidNode.Q.setValueAtTime(1.0, audioCtx.currentTime);
        eqMidNode.gain.setValueAtTime(eqMidVal, audioCtx.currentTime);

        eqTrebleNode = audioCtx.createBiquadFilter();
        eqTrebleNode.type = 'highshelf';
        eqTrebleNode.frequency.setValueAtTime(4000, audioCtx.currentTime);
        eqTrebleNode.gain.setValueAtTime(eqTrebleVal, audioCtx.currentTime);

        bgmGainNode.connect(eqBassNode);
        eqBassNode.connect(eqMidNode);
        eqMidNode.connect(eqTrebleNode);
        eqTrebleNode.connect(audioCtx.destination);
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function setSFXVolume(val) {
    sfxVolume = Math.max(0, Math.min(1, parseFloat(val) || 0));
    localStorage.setItem('polaris_sfx_vol', sfxVolume.toString());
    if (sfxGainNode && audioCtx) {
      sfxGainNode.gain.setValueAtTime(sfxVolume, audioCtx.currentTime);
    }
    const valLabel = document.getElementById('label-sfx-volume-val');
    if (valLabel) valLabel.textContent = `${Math.round(sfxVolume * 100)}%`;
    const slider = document.getElementById('slider-sfx-volume');
    if (slider) slider.value = Math.round(sfxVolume * 100);
  }

  function setBGMVolume(val) {
    bgmVolume = Math.max(0, Math.min(1, parseFloat(val) || 0));
    localStorage.setItem('polaris_bgm_vol', bgmVolume.toString());
    if (bgmGainNode && audioCtx) {
      bgmGainNode.gain.setValueAtTime(bgmVolume, audioCtx.currentTime);
    }
    if (customBgmAudio) {
      customBgmAudio.volume = bgmVolume;
    }
    const valLabel = document.getElementById('label-bgm-volume-val');
    if (valLabel) valLabel.textContent = `${Math.round(bgmVolume * 100)}%`;
    const slider = document.getElementById('slider-bgm-volume');
    if (slider) slider.value = Math.round(bgmVolume * 100);
  }

  function setBgmEq(band, gainDb) {
    const val = Math.max(-15, Math.min(15, parseFloat(gainDb) || 0));
    const ctx = getAudioContext();
    if (band === 'bass') {
      eqBassVal = val;
      localStorage.setItem('polaris_eq_bass', val.toString());
      if (eqBassNode && ctx) eqBassNode.gain.setValueAtTime(val, ctx.currentTime);
      const label = document.getElementById('label-eq-bass-val');
      if (label) label.textContent = `${val > 0 ? '+' : ''}${val} dB`;
      const slider = document.getElementById('slider-eq-bass');
      if (slider) slider.value = val;
    } else if (band === 'mid') {
      eqMidVal = val;
      localStorage.setItem('polaris_eq_mid', val.toString());
      if (eqMidNode && ctx) eqMidNode.gain.setValueAtTime(val, ctx.currentTime);
      const label = document.getElementById('label-eq-mid-val');
      if (label) label.textContent = `${val > 0 ? '+' : ''}${val} dB`;
      const slider = document.getElementById('slider-eq-mid');
      if (slider) slider.value = val;
    } else if (band === 'treble') {
      eqTrebleVal = val;
      localStorage.setItem('polaris_eq_treble', val.toString());
      if (eqTrebleNode && ctx) eqTrebleNode.gain.setValueAtTime(val, ctx.currentTime);
      const label = document.getElementById('label-eq-treble-val');
      if (label) label.textContent = `${val > 0 ? '+' : ''}${val} dB`;
      const slider = document.getElementById('slider-eq-treble');
      if (slider) slider.value = val;
    }
  }

  function setSfxPitch(rate) {
    sfxPitchRate = Math.max(0.5, Math.min(2.0, parseFloat(rate) || 1.0));
    localStorage.setItem('polaris_sfx_pitch', sfxPitchRate.toFixed(1));
    const label = document.getElementById('label-sfx-pitch-val');
    if (label) {
      label.textContent = `${sfxPitchRate.toFixed(1)}x (${sfxPitchRate < 0.9 ? 'Deep' : sfxPitchRate > 1.2 ? 'Fast' : 'Normal'})`;
    }
    const slider = document.getElementById('slider-sfx-pitch');
    if (slider) slider.value = sfxPitchRate;
  }

  function resetBgmEqAndPitch() {
    setBgmEq('bass', 0);
    setBgmEq('mid', 0);
    setBgmEq('treble', 0);
    setSfxPitch(1.0);
    if (window.PolarisApp && typeof window.PolarisApp.showToast === 'function') {
      window.PolarisApp.showToast('Audio EQ & SFX Pitch direset ke setelan normal.', 'info');
    }
  }

  function setSoundEnabled(enabled) {
    soundEnabled = !!enabled;
    localStorage.setItem('polaris_sound_enabled', soundEnabled ? 'true' : 'false');
    updateSoundToggleUIs();
    if (!soundEnabled && isBgmPlaying) {
      stopBGM();
    }
  }

  function updateSoundToggleUIs() {
    const soundBtns = [
      document.getElementById('btn-sound-toggle'),
      document.getElementById('btn-kinetix-sound-toggle')
    ].filter(Boolean);

    soundBtns.forEach(btn => {
      btn.innerHTML = soundEnabled ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
      btn.title = soundEnabled ? 'Suara Haptic & Soundtrack Aktif (Klik untuk matikan)' : 'Suara Haptic & Soundtrack Senyap (Klik untuk aktifkan)';
      if (soundEnabled) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const masterBtnText = document.getElementById('sfx-master-text');
    const masterBtnIcon = document.getElementById('sfx-master-icon');
    if (masterBtnText) masterBtnText.textContent = soundEnabled ? 'SFX: ON' : 'SFX: OFF';
    if (masterBtnIcon) masterBtnIcon.textContent = soundEnabled ? '🔊' : '🔇';
  }

  // --- Differentiated Sound Effects Engine ---
  function playKinetixSound(type, customVol) {
    if (!soundEnabled) return;

    const pitch = sfxPitchRate || 1.0;

    // 1. Check if user configured a Custom MP3 for this SFX slot
    if (customSfxMap[type] && customSfxMap[type].url) {
      try {
        const audio = new Audio(customSfxMap[type].url);
        audio.playbackRate = pitch;
        audio.volume = Math.max(0, Math.min(1, sfxVolume * (typeof customVol === 'number' ? customVol : 1.0)));
        audio.play().catch(() => {});
        return;
      } catch (_) {}
    }

    try {
      const ctx = getAudioContext();
      if (!ctx || !sfxGainNode) return;
      const now = ctx.currentTime;
      const gainFactor = typeof customVol === 'number' ? customVol : 1.0;

      if (type === 'click') {
        // Tactile micro-tick: High frequency blip decaying rapidly
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400 * pitch, now);
        osc.frequency.exponentialRampToValueAtTime(380 * pitch, now + 0.035);
        gain.gain.setValueAtTime(0.06 * gainFactor, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
        osc.connect(gain);
        gain.connect(sfxGainNode);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'page_whoosh') {
        // Aerodynamic atmospheric sweep: Dual frequency sweep with bandpass filter
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(820, now + 0.1);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.22);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.22);
        filter.Q.setValueAtTime(3.5, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.08 * gainFactor, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(sfxGainNode);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'theme_morph') {
        // Crystalline ascending chord chime: Ethereal pentatonic chord burst
        const freqs = [523.25, 659.25, 783.99, 987.77, 1174.66]; // C5, E5, G5, B5, D6
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.035);
          gain.gain.setValueAtTime(0.035 * gainFactor, now + idx * 0.035);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.035 + 0.22);
          osc.connect(gain);
          gain.connect(sfxGainNode);
          osc.start(now + idx * 0.035);
          osc.stop(now + idx * 0.035 + 0.24);
        });
      } else if (type === 'toggle') {
        // Bistable mechanical snap: Quick frequency hop
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.03);
        gain.gain.setValueAtTime(0.05 * gainFactor, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
        osc.connect(gain);
        gain.connect(sfxGainNode);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'modal_open') {
        // Resonant acoustic bloom: Warm multi-note chord swell
        const chord = [220, 277.18, 329.63, 440]; // A major pad bloom
        chord.forEach((f) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now);
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.04 * gainFactor, now + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
          osc.connect(gain);
          gain.connect(sfxGainNode);
          osc.start(now);
          osc.stop(now + 0.32);
        });
      } else if (type === 'modal_close' || type === 'pop') {
        // Soft downward pop
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(360, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.07);
        gain.gain.setValueAtTime(0.06 * gainFactor, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
        osc.connect(gain);
        gain.connect(sfxGainNode);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'success') {
        // Celebratory major triad fanfare
        [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + i * 0.05);
          gain.gain.setValueAtTime(0.04 * gainFactor, now + i * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 0.32);
          osc.connect(gain);
          gain.connect(sfxGainNode);
          osc.start(now + i * 0.05);
          osc.stop(now + i * 0.05 + 0.34);
        });
      } else if (type === 'danger') {
        // Sub-bass impact boom: Heavy low-end drop
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(85, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
        gain.gain.setValueAtTime(0.09 * gainFactor, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
        osc.connect(gain);
        gain.connect(sfxGainNode);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'teletype') {
        // Vintage CRT terminal character tick
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(2100, now);
        gain.gain.setValueAtTime(0.025 * gainFactor, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);
        osc.connect(gain);
        gain.connect(sfxGainNode);
        osc.start(now);
        osc.stop(now + 0.018);
      }
    } catch (e) {
      // Autoplay policy or audio ctx error
    }
  }

  // --- Procedural Generative Soundtrack (BGM) Engine ---
  function clearActiveBgmNodes() {
    activeBgmNodes.forEach(node => {
      try {
        if (typeof node.stop === 'function') node.stop();
        if (typeof node.disconnect === 'function') node.disconnect();
      } catch (_) {}
    });
    activeBgmNodes = [];
  }

  function scheduleBgmNote(freq, type, startTime, duration, vol, filterCutoff) {
    try {
      const ctx = getAudioContext();
      if (!ctx || !bgmGainNode) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      let lastNode = osc;
      if (filterCutoff) {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterCutoff, startTime);
        osc.connect(filter);
        lastNode = filter;
      }

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(vol || 0.04, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration - 0.01);

      lastNode.connect(gain);
      gain.connect(bgmGainNode);

      osc.start(startTime);
      osc.stop(startTime + duration);
      activeBgmNodes.push(osc);
    } catch (_) {}
  }

  function playBgmStep() {
    if (!isBgmPlaying) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (currentBgmTrack === 'cosmic') {
      // Ambient Pad: Chords changing every 3.8 seconds
      const chords = [
        [155.56, 196.00, 233.08, 293.66, 349.23], // Eb maj9
        [130.81, 196.00, 233.08, 311.13, 392.00], // Cm7/9
        [103.83, 155.56, 196.00, 261.63, 311.13], // Ab maj7
        [116.54, 174.61, 233.08, 293.66, 349.23], // Bb add9
      ];
      const chord = chords[bgmStepIndex % chords.length];
      chord.forEach(f => {
        scheduleBgmNote(f, 'sine', now, 3.8, 0.02, 600);
        scheduleBgmNote(f * 1.002, 'triangle', now, 3.8, 0.012, 500); // subtle detune chorusing
      });
      bgmStepIndex++;
    } else if (currentBgmTrack === 'cyberpunk') {
      // 120 BPM Synthwave 16th Arp: 125ms per step
      const arpNotes = [146.83, 220.00, 293.66, 349.23, 440.00, 349.23, 293.66, 220.00]; // D3, A3, D4, F4, A4, F4, D4, A3
      const bassNotes = [73.42, 73.42, 87.31, 98.00]; // D2, D2, F2, G2
      const step = bgmStepIndex % 16;
      const note = arpNotes[step % arpNotes.length];
      scheduleBgmNote(note, 'sawtooth', now, 0.11, 0.035, 1400);

      // Bass on 1st, 5th, 9th, 13th steps
      if (step % 4 === 0) {
        const bass = bassNotes[Math.floor(step / 4) % bassNotes.length];
        scheduleBgmNote(bass, 'square', now, 0.22, 0.045, 450);
      }
      bgmStepIndex++;
    } else if (currentBgmTrack === 'chiptune') {
      // 130 BPM 8-bit Retro Game Arpeggiator: 115ms per step
      const runs = [
        261.63, 329.63, 392.00, 523.25, 659.25, 523.25, 392.00, 329.63,
        349.23, 440.00, 523.25, 698.46, 880.00, 698.46, 523.25, 440.00,
      ];
      const note = runs[bgmStepIndex % runs.length];
      scheduleBgmNote(note, 'square', now, 0.09, 0.028, null);
      bgmStepIndex++;
    } else if (currentBgmTrack === 'lofi') {
      // Warm Lo-Fi Chords: Changing every 2.4 seconds
      const lofiChords = [
        [174.61, 220.00, 261.63, 329.63], // Fmaj7
        [164.81, 196.00, 246.94, 293.66], // Em7
        [146.83, 174.61, 220.00, 261.63], // Dm7
        [130.81, 164.81, 196.00, 246.94], // Cmaj7
      ];
      const chord = lofiChords[bgmStepIndex % lofiChords.length];
      chord.forEach((f, idx) => {
        scheduleBgmNote(f, 'sine', now + idx * 0.04, 2.2, 0.03, 750);
      });
      bgmStepIndex++;
    } else if (currentBgmTrack === 'glass_zen') {
      // 75 BPM Glass Ambient Chimes: 1600ms per step
      const glassNotes = [
        [329.63, 493.88, 659.25], // E4, B4, E5
        [392.00, 587.33, 783.99], // G4, D5, G5
        [440.00, 659.25, 880.00], // A4, E5, A5
        [493.88, 739.99, 987.77], // B4, F#5, B5
      ];
      const chord = glassNotes[bgmStepIndex % glassNotes.length];
      chord.forEach((f, idx) => {
        scheduleBgmNote(f, 'sine', now + idx * 0.08, 3.2, 0.025, 1200);
      });
      bgmStepIndex++;
    } else if (currentBgmTrack === 'vintage_vinyl') {
      // 85 BPM Warm Vintage Vinyl Chords: 2200ms per step
      const vintageChords = [
        [174.61, 220.00, 261.63, 311.13], // F7
        [155.56, 196.00, 233.08, 277.18], // Bb7
        [130.81, 164.81, 196.00, 246.94], // Cmaj7
        [146.83, 174.61, 220.00, 261.63], // Dm7
      ];
      const chord = vintageChords[bgmStepIndex % vintageChords.length];
      chord.forEach((f, idx) => {
        scheduleBgmNote(f, 'triangle', now + idx * 0.05, 2.8, 0.022, 650);
      });
      bgmStepIndex++;
    } else if (currentBgmTrack === 'metaverse_3d') {
      // 128 BPM Spatial Metaverse Arp: 117ms per step
      const metaArp = [196.00, 246.94, 293.66, 392.00, 493.88, 587.33, 493.88, 392.00];
      const note = metaArp[bgmStepIndex % metaArp.length];
      scheduleBgmNote(note, 'sawtooth', now, 0.12, 0.03, 1600);
      if (bgmStepIndex % 4 === 0) {
        scheduleBgmNote(98.00, 'square', now, 0.25, 0.04, 380);
      }
      bgmStepIndex++;
    } else if (currentBgmTrack === 'deep_obsidian') {
      // 110 BPM Sub-bass Obsidian Pulse: 272ms per step
      const subNotes = [55.00, 55.00, 65.41, 73.42, 55.00, 82.41, 73.42, 65.41];
      const note = subNotes[bgmStepIndex % subNotes.length];
      scheduleBgmNote(note, 'sine', now, 0.28, 0.06, 200);
      if (bgmStepIndex % 2 === 0) {
        scheduleBgmNote(note * 2, 'triangle', now, 0.15, 0.02, 500);
      }
      bgmStepIndex++;
    }
  }

  function startBGM(trackName) {
    if (trackName) currentBgmTrack = trackName;
    stopBGM();
    isBgmPlaying = true;

    // Check if Custom Audio mode is active and we have a custom MP3
    if (audioMode === 'custom' && customBgmAudio && customBgmAudio.src) {
      try {
        const ctx = getAudioContext();
        if (ctx && bgmGainNode && !customBgmSourceNode) {
          try {
            customBgmSourceNode = ctx.createMediaElementSource(customBgmAudio);
            customBgmSourceNode.connect(bgmGainNode);
          } catch (_) {}
        }
      } catch (_) {}
      customBgmAudio.volume = bgmVolume;
      customBgmAudio.play().catch(() => {});
      updateBgmUI();
      return;
    }

    // Procedural Synth Playback
    const ctx = getAudioContext();
    if (!ctx) return;
    bgmStepIndex = 0;

    let intervalMs = 125;
    if (currentBgmTrack === 'cosmic') intervalMs = 3800;
    else if (currentBgmTrack === 'cyberpunk') intervalMs = 125;
    else if (currentBgmTrack === 'chiptune') intervalMs = 115;
    else if (currentBgmTrack === 'lofi') intervalMs = 2400;
    else if (currentBgmTrack === 'glass_zen') intervalMs = 1600;
    else if (currentBgmTrack === 'vintage_vinyl') intervalMs = 2200;
    else if (currentBgmTrack === 'metaverse_3d') intervalMs = 117;
    else if (currentBgmTrack === 'deep_obsidian') intervalMs = 272;

    playBgmStep();
    bgmTimer = setInterval(playBgmStep, intervalMs);

    updateBgmUI();
  }

  function stopBGM() {
    isBgmPlaying = false;
    if (bgmTimer) {
      clearInterval(bgmTimer);
      bgmTimer = null;
    }
    clearActiveBgmNodes();
    if (customBgmAudio) {
      try {
        customBgmAudio.pause();
        customBgmAudio.currentTime = 0;
      } catch (_) {}
    }
    updateBgmUI();
  }

  function toggleBGM() {
    if (isBgmPlaying) {
      stopBGM();
    } else {
      startBGM();
    }
  }

  function setBGMTrack(trackName) {
    currentBgmTrack = trackName;
    localStorage.setItem('polaris_bgm_track', trackName);
    updateBgmTrackPills();
    if (isBgmPlaying) {
      startBGM(trackName);
    }
  }

  function setAudioMode(mode) {
    audioMode = mode;
    localStorage.setItem('polaris_audio_mode', mode);
    updateAudioModeUI();
    if (isBgmPlaying) {
      startBGM();
    }
  }

  function updateAudioModeUI() {
    const synthBtn = document.getElementById('btn-audio-mode-synth');
    const customBtn = document.getElementById('btn-audio-mode-custom');
    const synthSec = document.getElementById('section-audio-synth-bgm');
    const customSec = document.getElementById('section-audio-custom-bgm');

    if (synthBtn && customBtn) {
      if (audioMode === 'custom') {
        customBtn.className = 'btn-polaris btn-sm active';
        synthBtn.className = 'btn-polaris btn-secondary btn-sm';
      } else {
        synthBtn.className = 'btn-polaris btn-sm active';
        customBtn.className = 'btn-polaris btn-secondary btn-sm';
      }
    }
    if (synthSec && customSec) {
      synthSec.style.display = audioMode === 'synth' ? 'block' : 'none';
      customSec.style.display = audioMode === 'custom' ? 'block' : 'none';
    }
  }

  async function loadCustomBgm(dataUrl, fileName) {
    if (!dataUrl) return;
    if (!customBgmAudio) return;
    customBgmAudio.src = dataUrl;
    customBgmMeta = { name: fileName || 'Custom Soundtrack MP3', url: dataUrl };
    await PolarisAudioDB.saveAudio('bgm', dataUrl, customBgmMeta.name);
    updateCustomBgmStatusUI();
    setAudioMode('custom');
  }

  async function resetCustomBgm() {
    if (customBgmAudio) {
      customBgmAudio.pause();
      customBgmAudio.src = '';
    }
    customBgmMeta = null;
    await PolarisAudioDB.removeAudio('bgm');
    updateCustomBgmStatusUI();
    setAudioMode('synth');
  }

  function updateCustomBgmStatusUI() {
    const nameEl = document.getElementById('custom-bgm-file-name');
    const metaEl = document.getElementById('custom-bgm-file-meta');
    if (nameEl) {
      nameEl.textContent = customBgmMeta ? `🎵 ${customBgmMeta.name}` : 'Belum ada file MP3 custom (Masih menggunakan Synth bawaan)';
    }
    if (metaEl) {
      metaEl.textContent = customBgmMeta ? 'File tersimpan aktif di browser. Klik Putar BGM untuk mendengarkan.' : 'Pilih file .mp3 atau masukkan link URL untuk memutar musik pilihan Anda';
    }
  }

  async function loadCustomSfx(slot, dataUrl, fileName) {
    if (!slot || !dataUrl) return;
    customSfxMap[slot] = { url: dataUrl, name: fileName || `${slot}.mp3` };
    await PolarisAudioDB.saveAudio(`sfx_${slot}`, dataUrl, customSfxMap[slot].name);
    updateCustomSfxSlotUI(slot);
  }

  async function resetCustomSfx(slot) {
    if (!slot) return;
    delete customSfxMap[slot];
    await PolarisAudioDB.removeAudio(`sfx_${slot}`);
    updateCustomSfxSlotUI(slot);
  }

  async function resetAllCustomSfx() {
    const slots = ['click', 'theme_morph', 'page_whoosh', 'success', 'danger', 'modal_open'];
    for (const s of slots) {
      delete customSfxMap[s];
      await PolarisAudioDB.removeAudio(`sfx_${s}`);
      updateCustomSfxSlotUI(s);
    }
  }

  function updateCustomSfxSlotUI(slot) {
    const statusEl = document.querySelector(`.sfx-slot-status[data-sfx-slot="${slot}"]`);
    if (statusEl) {
      if (customSfxMap[slot]) {
        statusEl.textContent = `Custom: ${customSfxMap[slot].name}`;
        statusEl.style.color = 'var(--accent-cyan)';
      } else {
        statusEl.textContent = 'Bawaan: Web Audio Synth';
        statusEl.style.color = 'var(--text-muted)';
      }
    }
  }

  async function restoreCustomAudioFromDB() {
    try {
      // 1. Restore Custom BGM
      const savedBgm = await PolarisAudioDB.getAudio('bgm');
      if (savedBgm && savedBgm.dataUrl && customBgmAudio) {
        customBgmMeta = { name: savedBgm.name, url: savedBgm.dataUrl };
        customBgmAudio.src = savedBgm.dataUrl;
        updateCustomBgmStatusUI();
      }

      // 2. Restore Custom SFX
      const sfxSlots = ['click', 'theme_morph', 'page_whoosh', 'success', 'danger', 'modal_open'];
      for (const slot of sfxSlots) {
        const item = await PolarisAudioDB.getAudio(`sfx_${slot}`);
        if (item && item.dataUrl) {
          customSfxMap[slot] = { url: item.dataUrl, name: item.name };
          updateCustomSfxSlotUI(slot);
        }
      }
    } catch (_) {}
  }

  function updateBgmUI() {
    const playIcon = document.getElementById('bgm-play-icon');
    const playText = document.getElementById('bgm-play-text');
    const eqBars = document.getElementById('audio-visualizer-bars');

    if (playIcon) playIcon.textContent = isBgmPlaying ? '⏸️' : '▶️';
    if (playText) playText.textContent = isBgmPlaying ? 'Jeda BGM' : 'Putar BGM';
    if (eqBars) eqBars.classList.toggle('playing', isBgmPlaying);
  }

  function updateBgmTrackPills() {
    document.querySelectorAll('.bgm-track-pill').forEach(pill => {
      const track = pill.getAttribute('data-track');
      if (track === currentBgmTrack) {
        pill.className = 'btn-polaris btn-sm bgm-track-pill active';
      } else {
        pill.className = 'btn-polaris btn-secondary btn-sm bgm-track-pill';
      }
    });
  }

  // ==================== 2. THEME DEFINITION (POLARIS DEFAULT LOCKED) ====================
  // Seluruh pergantian tema telah dinonaktifkan sesuai arsitektur. Tema default dikunci ke Polaris Classic obsidian.
  const KINETIX_THEMES = [
    {
      id: 'polaris_classic',
      name: 'Polaris',
      category: 'Tema bawaan',
      tagline: 'Biru-grafit senja dengan satu aksen cahaya bintang. Permukaan datar obsidian.',
      colors: ['#12171F', '#171E28', '#F1DFA4', '#8DB5F2', '#6CCB9B'],
    }
  ];

  let currentThemeId = 'polaris_classic';
  try { localStorage.setItem('polaris_kinetix_theme', 'polaris_classic'); } catch (_) {}

  function normalizeThemeDOM(themeId) {
    const starfield = document.getElementById('starfield-canvas');
    if (starfield) starfield.style.opacity = '0.75';
    if (typeof updateThemeBackground === 'function') {
      updateThemeBackground('polaris_classic');
    }
  }

  function applyTheme(themeId) {
    currentThemeId = 'polaris_classic';
    try {
      localStorage.setItem('polaris_kinetix_theme', 'polaris_classic');
      document.documentElement.setAttribute('data-theme', 'polaris_classic');
      document.body.setAttribute('data-theme', 'polaris_classic');
    } catch (_) {}
  }

  function updateThemeUIState() {}

  // ==================== 3. AUDIO CONTROLS & BGM SOUNDBOARD SETUP ====================
  function initThemeControls() {
    document.documentElement.setAttribute('data-theme', 'polaris_classic');
    document.body.setAttribute('data-theme', 'polaris_classic');
    normalizeThemeDOM('polaris_classic');

    // 5. Sound toggle button
    // 5. Sound and BGM UI Controls
    updateSoundToggleUIs();
    updateBgmUI();
    updateBgmTrackPills();

    const soundBtn = document.getElementById('btn-kinetix-sound-toggle');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        setSoundEnabled(!soundEnabled);
        if (soundEnabled) playKinetixSound('toggle');
      });
    }

    const masterSfxBtn = document.getElementById('btn-toggle-sfx-master');
    if (masterSfxBtn) {
      masterSfxBtn.addEventListener('click', () => {
        setSoundEnabled(!soundEnabled);
        if (soundEnabled) playKinetixSound('toggle');
      });
    }

    const btnToggleBgm = document.getElementById('btn-toggle-bgm');
    if (btnToggleBgm) {
      btnToggleBgm.addEventListener('click', () => {
        toggleBGM();
      });
    }

    // Volume Sliders
    const sliderBgm = document.getElementById('slider-bgm-volume');
    if (sliderBgm) {
      sliderBgm.value = Math.round(bgmVolume * 100);
      const lbl = document.getElementById('label-bgm-volume-val');
      if (lbl) lbl.textContent = `${Math.round(bgmVolume * 100)}%`;
      sliderBgm.addEventListener('input', (e) => {
        setBGMVolume(parseFloat(e.target.value) / 100);
      });
    }

    const sliderSfx = document.getElementById('slider-sfx-volume');
    if (sliderSfx) {
      sliderSfx.value = Math.round(sfxVolume * 100);
      const lbl = document.getElementById('label-sfx-volume-val');
      if (lbl) lbl.textContent = `${Math.round(sfxVolume * 100)}%`;
      sliderSfx.addEventListener('input', (e) => {
        setSFXVolume(parseFloat(e.target.value) / 100);
      });
    }

    // BGM Track Pills
    document.querySelectorAll('.bgm-track-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const track = pill.getAttribute('data-track');
        if (track) {
          setBGMTrack(track);
          playKinetixSound('click');
        }
      });
    });

    // SFX Soundboard Audition Buttons
    document.querySelectorAll('.sfx-test-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sfx = btn.getAttribute('data-sfx');
        if (sfx) {
          playKinetixSound(sfx);
        }
      });
    });

    // 5b. Audio Engine Mode Selector (Synth vs Custom MP3)
    updateAudioModeUI();
    const btnModeSynth = document.getElementById('btn-audio-mode-synth');
    const btnModeCustom = document.getElementById('btn-audio-mode-custom');
    if (btnModeSynth) {
      btnModeSynth.addEventListener('click', () => {
        setAudioMode('synth');
        playKinetixSound('toggle');
      });
    }
    if (btnModeCustom) {
      btnModeCustom.addEventListener('click', () => {
        setAudioMode('custom');
        playKinetixSound('toggle');
      });
    }

    // 5c. Custom BGM MP3 Uploader & URL Loader
    const btnBrowseCustomBgm = document.getElementById('btn-browse-custom-bgm');
    const inputCustomBgmFile = document.getElementById('input-custom-bgm-file');
    const inputCustomBgmUrl = document.getElementById('input-custom-bgm-url');
    const btnLoadCustomBgmUrl = document.getElementById('btn-load-custom-bgm-url');
    const btnTestCustomBgm = document.getElementById('btn-test-custom-bgm');
    const btnResetCustomBgm = document.getElementById('btn-reset-custom-bgm');

    if (btnBrowseCustomBgm && inputCustomBgmFile) {
      btnBrowseCustomBgm.addEventListener('click', () => inputCustomBgmFile.click());
      inputCustomBgmFile.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            loadCustomBgm(ev.target.result, file.name);
            playKinetixSound('success');
            if (window.PolarisComponents && typeof window.PolarisComponents.showToast === 'function') {
              window.PolarisComponents.showToast(`🎵 Custom Soundtrack dimuat: ${file.name}`, 'success');
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (btnLoadCustomBgmUrl && inputCustomBgmUrl) {
      btnLoadCustomBgmUrl.addEventListener('click', () => {
        const url = inputCustomBgmUrl.value.trim();
        if (url) {
          const fileName = url.split('/').pop() || 'Streaming Soundtrack MP3';
          loadCustomBgm(url, fileName);
          playKinetixSound('success');
          if (window.PolarisComponents && typeof window.PolarisComponents.showToast === 'function') {
            window.PolarisComponents.showToast(`🎵 Custom Soundtrack dimuat dari URL`, 'success');
          }
        }
      });
    }

    if (btnTestCustomBgm) {
      btnTestCustomBgm.addEventListener('click', () => {
        setAudioMode('custom');
        toggleBGM();
      });
    }

    if (btnResetCustomBgm) {
      btnResetCustomBgm.addEventListener('click', () => {
        resetCustomBgm();
        playKinetixSound('toggle');
        if (window.PolarisComponents && typeof window.PolarisComponents.showToast === 'function') {
          window.PolarisComponents.showToast('↺ Soundtrack di-reset ke Synth bawaan', 'info');
        }
      });
    }

    // 5d. Custom SFX Slot File Pickers & Resets
    document.querySelectorAll('.btn-browse-sfx').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetSlot = btn.getAttribute('data-sfx-target');
        const fileInput = document.querySelector(`.input-sfx-file[data-sfx-target="${targetSlot}"]`);
        if (fileInput) fileInput.click();
      });
    });

    document.querySelectorAll('.input-sfx-file').forEach(input => {
      input.addEventListener('change', (e) => {
        const targetSlot = input.getAttribute('data-sfx-target');
        const file = e.target.files && e.target.files[0];
        if (file && targetSlot) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            loadCustomSfx(targetSlot, ev.target.result, file.name);
            playKinetixSound(targetSlot);
            if (window.PolarisComponents && typeof window.PolarisComponents.showToast === 'function') {
              window.PolarisComponents.showToast(`📁 SFX [${targetSlot}] diperbarui: ${file.name}`, 'success');
            }
          };
          reader.readAsDataURL(file);
        }
      });
    });

    document.querySelectorAll('.btn-reset-sfx').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetSlot = btn.getAttribute('data-sfx-target');
        if (targetSlot) {
          resetCustomSfx(targetSlot);
          playKinetixSound('toggle');
        }
      });
    });

    const btnResetAllSfx = document.getElementById('btn-reset-all-custom-sfx');
    if (btnResetAllSfx) {
      btnResetAllSfx.addEventListener('click', () => {
        resetAllCustomSfx();
        playKinetixSound('toggle');
        if (window.PolarisComponents && typeof window.PolarisComponents.showToast === 'function') {
          window.PolarisComponents.showToast('↺ Semua custom SFX di-reset ke Synth bawaan', 'info');
        }
      });
    }

    // Restore saved audio from IndexedDB
    restoreCustomAudioFromDB();

    // 7. Differentiated SFX Event Delegation across all Polaris Elements
    document.addEventListener('click', (e) => {
      const target = e.target.closest('button, .nav-tab, .theme-pill-btn, .theme-card-option, .btn-polaris, input[type="checkbox"], a[href], .modal-close, [data-modal-close]');
      if (!target) return;
      if (target.classList.contains('sfx-test-btn')) return; // Handled specifically

      if (target.classList.contains('nav-tab')) {
        playKinetixSound('page_whoosh');
      } else if (target.classList.contains('theme-card-option') || target.classList.contains('theme-pill-btn') || target.id === 'btn-open-kinetix-themes') {
        playKinetixSound('theme_morph');
      } else if (target.type === 'checkbox' || target.classList.contains('form-switch')) {
        playKinetixSound('toggle');
      } else if (target.classList.contains('btn-danger') || /delete|ban|hapus|reset|stop/i.test(target.id || target.textContent)) {
        playKinetixSound('danger');
      } else if (target.classList.contains('modal-close') || target.hasAttribute('data-modal-close') || target.id === 'btn-close-kinetix-modal') {
        playKinetixSound('modal_close');
      } else if (target.hasAttribute('data-modal') || /buka|open|tambah|create/i.test(target.id || target.textContent)) {
        playKinetixSound('modal_open');
      } else {
        playKinetixSound('click');
      }
    });

    // Initialize Theme Lab and Audio EQ controls
    initThemeLab();
  }

  // ==================== 3B. AUDIO EQ INITIALIZATION & THEME LAB STUBS ====================
  function initThemeLab() {
    const bassSlider = document.getElementById('slider-eq-bass');
    const midSlider = document.getElementById('slider-eq-mid');
    const trebleSlider = document.getElementById('slider-eq-treble');
    const pitchSlider = document.getElementById('slider-sfx-pitch');
    const resetEqBtn = document.getElementById('btn-reset-audio-eq');

    if (bassSlider) bassSlider.addEventListener('input', (e) => setBgmEq('bass', e.target.value));
    if (midSlider) midSlider.addEventListener('input', (e) => setBgmEq('mid', e.target.value));
    if (trebleSlider) trebleSlider.addEventListener('input', (e) => setBgmEq('treble', e.target.value));
    if (pitchSlider) pitchSlider.addEventListener('input', (e) => setSfxPitch(e.target.value));
    if (resetEqBtn) resetEqBtn.addEventListener('click', resetBgmEqAndPitch);

    setBgmEq('bass', eqBassVal);
    setBgmEq('mid', eqMidVal);
    setBgmEq('treble', eqTrebleVal);
    setSfxPitch(sfxPitchRate);
  }

  let customThemeState = {
    canvas: '#12171F',
    surface: '#171E28',
    primary: '#F1DFA4',
    secondary: '#8DB5F2',
    border: '#242e3d',
    pattern: 'aurora_nebula',
  };
  function applyCustomTheme() {}
  function saveCustomThemePreset() {}
  function exportCustomThemeJson() {}
  function downloadCustomThemeJson() {}
  function resetThemeLabToActive() {}

  // ==================== 4. ADAPTIVE THEME BACKGROUND CANVAS ENGINE ====================
  let updateThemeBackground = null;

  function initAdaptiveThemeBackground() {
    let canvas = document.getElementById('starfield-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'starfield-canvas';
      document.body.prepend(canvas);
    }
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      reseedThemeElements();
    }

    // Theme elements state
    let bgStars = [];
    let bgGridOffset = 0;
    let bgMatrixDrops = [];
    let bgBauhausShapes = [];
    let bgEmbers = [];
    let bgSunMotes = [];
    let bgBokehCircles = [];
    let bgGoldDust = [];
    let bgConstellationNodes = [];
    let bgGlassBubbles = [];
    let bgTechMeshNodes = [];
    let bgMetaversePrisms = [];
    let bgVintageGrain = [];
    let bgObsidianBeacons = [];

    function reseedThemeElements() {
      const theme = currentThemeId;

      // 1. Stars for space/aurora/classic
      bgStars = [];
      const starCount = Math.min(Math.floor((width * height) / 9000), 110);
      for (let i = 0; i < starCount; i++) {
        bgStars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 1.5 + 0.5,
          alpha: Math.random() * 0.7 + 0.2,
          twinkleSpeed: Math.random() * 0.03 + 0.01,
          driftSpeed: Math.random() * 0.25 + 0.05,
          color: Math.random() > 0.4 ? '#38bdf8' : (Math.random() > 0.5 ? '#818cf8' : '#ffffff')
        });
      }

      // 2. Matrix rain drops
      bgMatrixDrops = [];
      const colWidth = 20;
      const cols = Math.floor(width / colWidth);
      const chars = '0123456789ABCDEFｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ';
      for (let i = 0; i < cols; i++) {
        bgMatrixDrops.push({
          x: i * colWidth + 6,
          y: Math.random() * -height,
          speed: Math.random() * 3 + 2.5,
          chars: Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]),
          lastChange: performance.now()
        });
      }

      // 3. Bauhaus wireframe geometric shapes for Neobrutalism
      bgBauhausShapes = [];
      const shapeCount = 12;
      for (let i = 0; i < shapeCount; i++) {
        bgBauhausShapes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          type: ['cube', 'diamond', 'circle', 'tri'][i % 4],
          size: Math.random() * 26 + 18,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.012,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4
        });
      }

      // 4. Rising fire embers for Sunset Crimson
      bgEmbers = [];
      const emberCount = 55;
      for (let i = 0; i < emberCount; i++) {
        bgEmbers.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 3 + 1.2,
          speedY: Math.random() * 1.5 + 0.6,
          speedX: (Math.random() - 0.5) * 0.8,
          alpha: Math.random() * 0.8 + 0.2,
          hue: Math.random() > 0.4 ? '#ff0055' : (Math.random() > 0.5 ? '#f43f5e' : '#fbbf24')
        });
      }

      // 5. Sunlit dust motes for Solar Light
      bgSunMotes = [];
      for (let i = 0; i < 45; i++) {
        bgSunMotes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 2.2 + 0.8,
          alpha: Math.random() * 0.5 + 0.15,
          vy: -Math.random() * 0.4 - 0.1,
          vx: (Math.random() - 0.5) * 0.3
        });
      }

      // 6. Bokeh neon circles for Vaporwave
      bgBokehCircles = [];
      for (let i = 0; i < 16; i++) {
        bgBokehCircles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 70 + 40,
          color: i % 2 === 0 ? 'rgba(255, 113, 206, 0.08)' : 'rgba(1, 205, 254, 0.08)',
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35
        });
      }

      // 7. Gold dust for Editorial Luxury
      bgGoldDust = [];
      for (let i = 0; i < 40; i++) {
        bgGoldDust.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 1.8 + 0.6,
          alpha: Math.random() * 0.6 + 0.2,
          vy: -Math.random() * 0.3 - 0.08,
          vx: (Math.random() - 0.5) * 0.2
        });
      }

      // 8. Constellation nodes for Polaris Classic
      bgConstellationNodes = [];
      const nodeCount = 38;
      for (let i = 0; i < nodeCount; i++) {
        bgConstellationNodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 2 + 1
        });
      }

      // 9. Glassmorphism Refractive Floating Spheres
      bgGlassBubbles = [];
      for (let i = 0; i < 20; i++) {
        bgGlassBubbles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 60 + 25,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          alpha: Math.random() * 0.15 + 0.05,
          color: i % 2 === 0 ? 'rgba(56, 189, 248, 0.12)' : 'rgba(192, 132, 252, 0.12)'
        });
      }

      // 10. Modern SaaS Tech Dotted Grid Matrix
      bgTechMeshNodes = [];
      for (let i = 0; i < 35; i++) {
        bgTechMeshNodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          pulse: Math.random() * Math.PI,
          speed: Math.random() * 0.03 + 0.015,
          radius: Math.random() * 2 + 1.2
        });
      }

      // 11. Immersive 3D Metaverse Polyhedra Prisms
      bgMetaversePrisms = [];
      for (let i = 0; i < 14; i++) {
        bgMetaversePrisms.push({
          x: Math.random() * width,
          y: Math.random() * height,
          z: Math.random() * 300 + 100,
          rotX: Math.random() * Math.PI * 2,
          rotY: Math.random() * Math.PI * 2,
          rotSpeedX: (Math.random() - 0.5) * 0.02,
          rotSpeedY: (Math.random() - 0.5) * 0.02,
          size: Math.random() * 35 + 20,
          color: i % 2 === 0 ? '#00F5FF' : '#FF007A'
        });
      }

      // 12. Heritage Retro Vintage Grain Motes
      bgVintageGrain = [];
      for (let i = 0; i < 40; i++) {
        bgVintageGrain.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 2.2 + 0.8,
          alpha: Math.random() * 0.5 + 0.2,
          speedY: Math.random() * 0.4 + 0.1,
          speedX: (Math.random() - 0.5) * 0.2
        });
      }

      // 13. Dark Mode Pro Console Radar Beacons
      bgObsidianBeacons = [];
      for (let i = 0; i < 18; i++) {
        bgObsidianBeacons.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          color: i % 2 === 0 ? '#1DB954' : '#0070D1',
          radius: Math.random() * 2.5 + 1.5,
          glow: Math.random() * 15 + 8
        });
      }
    }

    updateThemeBackground = function (themeId) {
      reseedThemeElements();
    };

    window.addEventListener('resize', resize);
    resize();

    // Main background animation loop
    function renderBackground(time) {
      ctx.clearRect(0, 0, width, height);
      const t = time * 0.001;
      const theme = currentThemeId;

      if (theme === 'midnight_aurora') {
        // === MIDNIGHT AURORA: Northern Lights Ribbons + Twinkling Stars ===
        // 1. Stars
        for (let i = 0; i < bgStars.length; i++) {
          const s = bgStars[i];
          s.y -= s.driftSpeed;
          if (s.y < 0) { s.y = height; s.x = Math.random() * width; }
          const a = s.alpha + Math.sin(t * 3 + i) * 0.18;
          ctx.fillStyle = s.color;
          ctx.globalAlpha = Math.max(0.1, Math.min(1, a));
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // 2. Flowing Aurora Borealis Wave Ribbons
        const ribbonCount = 3;
        const colors = [
          { r: 56, g: 189, b: 248, a: 0.16 },  // Cyan
          { r: 52, g: 211, b: 153, a: 0.14 },  // Emerald
          { r: 192, g: 132, b: 252, a: 0.13 }  // Violet
        ];

        for (let r = 0; r < ribbonCount; r++) {
          const c = colors[r];
          const baseY = height * (0.18 + r * 0.12);
          ctx.beginPath();
          ctx.moveTo(0, baseY);
          for (let x = 0; x <= width; x += 30) {
            const y = baseY +
              Math.sin(x * 0.003 + t * 0.8 + r * 1.6) * 45 +
              Math.sin(x * 0.007 - t * 0.5) * 25;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(width, 0);
          ctx.lineTo(0, 0);
          ctx.closePath();

          const grad = ctx.createLinearGradient(0, baseY - 60, 0, baseY + 60);
          grad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
          grad.addColorStop(0.5, `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`);
          grad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
          ctx.fillStyle = grad;
          ctx.fill();
        }

      } else if (theme === 'cyberpunk') {
        // === CYBERPUNK: 3D Perspective Ground Grid + Neon Data Sparks ===
        bgGridOffset = (bgGridOffset + 0.8) % 40;
        const horizonY = height * 0.62;

        // Horizon line
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        ctx.lineTo(width, horizonY);
        ctx.stroke();

        // 3D Perspective Grid Floor
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.14)';
        ctx.lineWidth = 1;

        // Radiating perspective vanishing lines
        const vanishingX = width * 0.5;
        for (let x = -width * 0.4; x <= width * 1.4; x += 70) {
          ctx.beginPath();
          ctx.moveTo(vanishingX, horizonY);
          ctx.lineTo(x, height);
          ctx.stroke();
        }

        // Horizontal scrolling lines with exponential perspective spacing
        for (let i = 1; i <= 14; i++) {
          const depth = Math.pow(i / 14, 2.2);
          const py = horizonY + depth * (height - horizonY) + (bgGridOffset * 0.25 * depth);
          if (py <= height) {
            ctx.strokeStyle = `rgba(255, 0, 127, ${0.08 + depth * 0.18})`;
            ctx.beginPath();
            ctx.moveTo(0, py);
            ctx.lineTo(width, py);
            ctx.stroke();
          }
        }

        // Neon cyber data sparks
        for (let i = 0; i < bgEmbers.length; i++) {
          const sp = bgEmbers[i];
          sp.y -= sp.speedY * 1.8;
          if (sp.y < 0) { sp.y = height; sp.x = Math.random() * width; }
          ctx.fillStyle = i % 2 === 0 ? '#00f0ff' : '#ff007f';
          ctx.globalAlpha = sp.alpha * 0.7;
          ctx.fillRect(sp.x, sp.y, 2, sp.size * 2.5);
        }
        ctx.globalAlpha = 1;

      } else if (theme === 'amber_terminal') {
        // === AMBER TERMINAL: Retro CRT Scanlines & Phosphor Floating ASCII Data ===
        ctx.font = '12px "JetBrains Mono", monospace';
        const glyphs = ['0', '1', '>', '$', '#', '_', 'λ', '§', '::', '4K'];
        for (let i = 0; i < 35; i++) {
          const s = bgStars[i];
          if (!s) continue;
          s.y += s.driftSpeed * 0.6;
          if (s.y > height) { s.y = 0; s.x = Math.random() * width; }
          const g = glyphs[i % glyphs.length];
          ctx.fillStyle = '#ffb000';
          ctx.globalAlpha = 0.18 + 0.12 * Math.sin(t * 2 + i);
          ctx.fillText(g, s.x, s.y);
        }
        ctx.globalAlpha = 1;

      } else if (theme === 'emerald_matrix') {
        // === EMERALD MATRIX: Falling Digital Rain ===
        ctx.font = '13px "JetBrains Mono", monospace';
        for (let i = 0; i < bgMatrixDrops.length; i++) {
          const d = bgMatrixDrops[i];
          d.y += d.speed;
          if (d.y > height + 200) {
            d.y = -200;
            d.x = Math.random() * width;
          }

          // Cycle one character periodically
          if (time - d.lastChange > 120) {
            d.chars[Math.floor(Math.random() * d.chars.length)] =
              '0123456789ABCDEFｦｱｳｴｵ'[Math.floor(Math.random() * 20)];
            d.lastChange = time;
          }

          for (let j = 0; j < d.chars.length; j++) {
            const py = d.y - j * 16;
            if (py >= 0 && py <= height) {
              if (j === 0) {
                ctx.fillStyle = '#ffffff'; // Leading bright head
                ctx.globalAlpha = 0.95;
              } else {
                ctx.fillStyle = '#00ff66';
                ctx.globalAlpha = (1 - j / d.chars.length) * 0.6;
              }
              ctx.fillText(d.chars[j], d.x, py);
            }
          }
        }
        ctx.globalAlpha = 1;

      } else if (theme === 'neobrutalism') {
        // === NEOBRUTALISM: Bauhaus Wireframe Geometric Prisms ===
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#000000';

        for (let i = 0; i < bgBauhausShapes.length; i++) {
          const s = bgBauhausShapes[i];
          s.x += s.vx;
          s.y += s.vy;
          s.rot += s.rotSpeed;

          if (s.x < -40) s.x = width + 40;
          if (s.x > width + 40) s.x = -40;
          if (s.y < -40) s.y = height + 40;
          if (s.y > height + 40) s.y = -40;

          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(s.rot);

          // Hard drop shadow
          ctx.fillStyle = '#000000';
          ctx.globalAlpha = 0.08;
          ctx.fillRect(4, 4, s.size, s.size);

          ctx.globalAlpha = 0.22;
          ctx.fillStyle = ['#ffe600', '#00e5ff', '#ff52d9', '#00e676'][i % 4];

          if (s.type === 'cube' || s.type === 'diamond') {
            ctx.fillRect(-s.size * 0.5, -s.size * 0.5, s.size, s.size);
            ctx.globalAlpha = 0.6;
            ctx.strokeRect(-s.size * 0.5, -s.size * 0.5, s.size, s.size);
          } else if (s.type === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, s.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 0.6;
            ctx.stroke();
          } else {
            // Triangle
            ctx.beginPath();
            ctx.moveTo(0, -s.size * 0.6);
            ctx.lineTo(s.size * 0.55, s.size * 0.45);
            ctx.lineTo(-s.size * 0.55, s.size * 0.45);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 0.6;
            ctx.stroke();
          }
          ctx.restore();
        }
        ctx.globalAlpha = 1;

      } else if (theme === 'solar_light') {
        // === SOLAR LIGHT: Sunlit Dust Motes & Prismatic Caustics ===
        for (let i = 0; i < bgSunMotes.length; i++) {
          const m = bgSunMotes[i];
          m.y += m.vy;
          m.x += m.vx + Math.sin(t * 1.5 + i) * 0.2;
          if (m.y < 0) { m.y = height; m.x = Math.random() * width; }

          ctx.fillStyle = i % 2 === 0 ? 'rgba(2, 132, 199, 0.35)' : 'rgba(168, 85, 247, 0.25)';
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
          ctx.fill();
        }

      } else if (theme === 'sunset_crimson') {
        // === SUNSET CRIMSON: Rising Fire Embers with Turbulence ===
        for (let i = 0; i < bgEmbers.length; i++) {
          const e = bgEmbers[i];
          e.y -= e.speedY;
          e.x += Math.sin(t * 2 + i) * 0.6;
          if (e.y < 0) { e.y = height; e.x = Math.random() * width; }

          ctx.fillStyle = e.hue;
          ctx.globalAlpha = e.alpha * (0.6 + 0.4 * Math.sin(t * 3 + i));
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

      } else if (theme === 'vaporwave_retro') {
        // === VAPORWAVE RETRO: Soft Neon Bokeh Orbs ===
        for (let i = 0; i < bgBokehCircles.length; i++) {
          const b = bgBokehCircles[i];
          b.x += b.vx;
          b.y += b.vy;
          if (b.x < -b.radius) b.x = width + b.radius;
          if (b.x > width + b.radius) b.x = -b.radius;
          if (b.y < -b.radius) b.y = height + b.radius;
          if (b.y > height + b.radius) b.y = -b.radius;

          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          ctx.fill();
        }

      } else if (theme === 'editorial' || theme === 'editorial_luxury') {
        // === EDITORIAL LUXURY: Gold Micro-Glitter Motes ===
        for (let i = 0; i < bgGoldDust.length; i++) {
          const g = bgGoldDust[i];
          g.y += g.vy;
          g.x += g.vx + Math.sin(t + i) * 0.15;
          if (g.y < 0) { g.y = height; g.x = Math.random() * width; }

          ctx.fillStyle = '#d4af37';
          ctx.globalAlpha = g.alpha * (0.5 + 0.5 * Math.sin(t * 2.5 + i));
          ctx.beginPath();
          ctx.arc(g.x, g.y, g.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

      } else if (theme === 'glassmorphism') {
        // === GLASSMORPHISM: Translucent Refractive Floating Orbs & Specular Prisms ===
        for (let i = 0; i < bgGlassBubbles.length; i++) {
          const b = bgGlassBubbles[i];
          b.x += b.vx;
          b.y += b.vy;
          if (b.x < -b.radius) b.x = width + b.radius;
          if (b.x > width + b.radius) b.x = -b.radius;
          if (b.y < -b.radius) b.y = height + b.radius;
          if (b.y > height + b.radius) b.y = -b.radius;

          const grad = ctx.createRadialGradient(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.1, b.x, b.y, b.radius);
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
          grad.addColorStop(0.5, b.color);
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          ctx.fill();

          // Hairline specular highlight rim
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          ctx.stroke();
        }

      } else if (theme === 'modern_saas') {
        // === MODERN SAAS: Isometric Tech Dotted Matrix & Node Pulses ===
        ctx.fillStyle = 'rgba(148, 163, 184, 0.15)';
        const step = 45;
        for (let x = 20; x < width; x += step) {
          for (let y = 20; y < height; y += step) {
            ctx.fillRect(x, y, 1.5, 1.5);
          }
        }
        for (let i = 0; i < bgTechMeshNodes.length; i++) {
          const n = bgTechMeshNodes[i];
          n.pulse += n.speed;
          const a = (Math.sin(n.pulse) + 1) * 0.5;
          ctx.fillStyle = i % 2 === 0 ? 'rgba(99, 102, 241, ' + (0.3 + a * 0.5) + ')' : 'rgba(14, 165, 233, ' + (0.3 + a * 0.5) + ')';
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius * (1 + a * 0.4), 0, Math.PI * 2);
          ctx.fill();
        }

      } else if (theme === 'immersive_3d') {
        // === IMMERSIVE 3D: Rotating Wireframe Prisms with Volumetric Glow ===
        for (let i = 0; i < bgMetaversePrisms.length; i++) {
          const p = bgMetaversePrisms[i];
          p.rotX += p.rotSpeedX;
          p.rotY += p.rotSpeedY;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.2;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 15;
          ctx.globalAlpha = 0.5;

          const sz = p.size;
          ctx.beginPath();
          ctx.moveTo(-sz, -sz);
          ctx.lineTo(sz, -sz);
          ctx.lineTo(sz, sz);
          ctx.lineTo(-sz, sz);
          ctx.closePath();
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(-sz * 0.6, -sz * 0.6);
          ctx.lineTo(sz * 0.6, -sz * 0.6);
          ctx.lineTo(sz * 0.6, sz * 0.6);
          ctx.lineTo(-sz * 0.6, sz * 0.6);
          ctx.closePath();
          ctx.stroke();

          ctx.restore();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

      } else if (theme === 'retro_vintage') {
        // === RETRO VINTAGE: Sepia Film Grain & Warm Amber Embers ===
        for (let i = 0; i < bgVintageGrain.length; i++) {
          const g = bgVintageGrain[i];
          g.y -= g.speedY;
          g.x += g.speedX;
          if (g.y < 0) { g.y = height; g.x = Math.random() * width; }

          ctx.fillStyle = '#D97706';
          ctx.globalAlpha = g.alpha * (0.6 + 0.4 * Math.sin(t * 2 + i));
          ctx.beginPath();
          ctx.arc(g.x, g.y, g.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

      } else if (theme === 'dark_mode_pro') {
        // === DARK MODE PRO: Obsidian Stealth Grid & Cyber Coordinate Beacons ===
        for (let i = 0; i < bgObsidianBeacons.length; i++) {
          const b = bgObsidianBeacons[i];
          b.x += b.vx;
          b.y += b.vy;
          if (b.x < 0 || b.x > width) b.vx *= -1;
          if (b.y < 0 || b.y > height) b.vy *= -1;

          ctx.shadowColor = b.color;
          ctx.shadowBlur = b.glow;
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;

      } else {
        // === POLARIS CLASSIC / MINIMALIST / DEFAULT: Constellation Nexus ===
        for (let i = 0; i < bgConstellationNodes.length; i++) {
          const n = bgConstellationNodes[i];
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0 || n.x > width) n.vx *= -1;
          if (n.y < 0 || n.y > height) n.vy *= -1;

          ctx.fillStyle = '#38bdf8';
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
          ctx.fill();

          for (let j = i + 1; j < bgConstellationNodes.length; j++) {
            const m = bgConstellationNodes[j];
            const dx = n.x - m.x;
            const dy = n.y - m.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 130) {
              ctx.strokeStyle = `rgba(56, 189, 248, ${(1 - dist / 130) * 0.2})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(n.x, n.y);
              ctx.lineTo(m.x, m.y);
              ctx.stroke();
            }
          }
        }
        ctx.globalAlpha = 1;
      }

      requestAnimationFrame(renderBackground);
    }

    requestAnimationFrame(renderBackground);
  }

  // ==================== 5. KINETIX STUDIO: REPAIR & UPGRADE PARTICLE PLAYGROUND ====================
  function initParticlePlayground() {
    const canvas = document.getElementById('kinetix-particle-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let particles = [];
    let particleCount = 65;
    let gravity = 0.25;
    let elasticity = 0.75;
    let isPointerDown = false;
    let pointerPos = { x: 0, y: 0 };

    function getActiveThemePalette() {
      const t = KINETIX_THEMES.find(th => th.id === currentThemeId);
      if (t && t.colors && t.colors.length > 2) {
        return t.colors.slice(2);
      }
      return ['#38bdf8', '#818cf8', '#34d399', '#c084fc', '#fbbf24', '#ff0055'];
    }

    class Particle {
      constructor(x, y, vx, vy, radius, color) {
        const palette = getActiveThemePalette();
        this.x = (x !== undefined && !isNaN(x)) ? x : Math.random() * (width || 400);
        this.y = (y !== undefined && !isNaN(y)) ? y : Math.random() * ((height || 400) * 0.5);
        this.vx = (vx !== undefined) ? vx : (Math.random() - 0.5) * 8;
        this.vy = (vy !== undefined) ? vy : (Math.random() - 0.5) * 8;
        this.radius = radius || Math.random() * 7 + 4;
        this.color = color || palette[Math.floor(Math.random() * palette.length)];
        this.shape = currentThemeId === 'neobrutalism' ? 'square' : 'circle';
      }

      update() {
        // Vortex pull toward cursor while dragging
        if (isPointerDown && width > 0) {
          const dx = pointerPos.x - this.x;
          const dy = pointerPos.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 10 && dist < 220) {
            const pull = (1 - dist / 220) * 0.45;
            this.vx += (dx / dist) * pull;
            this.vy += (dy / dist) * pull;
            // Swirl tangential force
            this.vx += (-dy / dist) * pull * 0.6;
            this.vy += (dx / dist) * pull * 0.6;
          }
        }

        this.vy += gravity;
        this.x += this.vx;
        this.y += this.vy;

        // Floor bounce
        if (this.y + this.radius > height) {
          this.y = height - this.radius;
          this.vy *= -elasticity;
          this.vx *= 0.98;
        }

        // Walls bounce
        if (this.x - this.radius < 0) {
          this.x = this.radius;
          this.vx *= -elasticity;
        } else if (this.x + this.radius > width) {
          this.x = width - this.radius;
          this.vx *= -elasticity;
        }

        // Ceiling bounce
        if (this.y - this.radius < 0) {
          this.y = this.radius;
          this.vy *= -elasticity;
        }
      }

      draw() {
        ctx.fillStyle = this.color;
        if (this.shape === 'square') {
          ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
        } else {
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function initParticles() {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    }

    function checkAndResize() {
      if (!canvas || !canvas.parentElement) return false;
      const rect = canvas.parentElement.getBoundingClientRect();
      const newW = Math.round(rect.width);
      const newH = Math.round(rect.height) || 480;

      if (newW > 0 && (newW !== width || newH !== height)) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = newW;
        height = newH;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return true;
      }
      return false;
    }

    // Auto-observe size changes (handles switching to Kinetix Studio tab)
    if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) {
      const ro = new ResizeObserver(() => {
        if (checkAndResize()) {
          initParticles();
        }
      });
      ro.observe(canvas.parentElement);
    }

    checkAndResize();
    initParticles();

    // Expose resize trigger for tab switchers
    window.Kinetix.resizeParticleCanvas = function () {
      setTimeout(() => {
        if (checkAndResize() || particles.length === 0) {
          initParticles();
        }
      }, 50);
    };

    function spawnFountain(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      pointerPos.x = x;
      pointerPos.y = y;

      const palette = getActiveThemePalette();
      for (let i = 0; i < 4; i++) {
        if (particles.length > 220) particles.shift();
        particles.push(new Particle(
          x,
          y,
          (Math.random() - 0.5) * 14,
          -Math.random() * 12 - 4,
          Math.random() * 8 + 4,
          palette[Math.floor(Math.random() * palette.length)]
        ));
      }
    }

    // Mouse listeners
    canvas.addEventListener('mousedown', (e) => {
      isPointerDown = true;
      spawnFountain(e.clientX, e.clientY);
      playKinetixSound('pop');
    });

    window.addEventListener('mouseup', () => {
      isPointerDown = false;
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      pointerPos.x = e.clientX - rect.left;
      pointerPos.y = e.clientY - rect.top;
      if (isPointerDown) {
        spawnFountain(e.clientX, e.clientY);
      }
    });

    // Touch listeners
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        isPointerDown = true;
        const touch = e.touches[0];
        spawnFountain(touch.clientX, touch.clientY);
        playKinetixSound('pop');
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (isPointerDown && e.touches.length > 0) {
        const touch = e.touches[0];
        spawnFountain(touch.clientX, touch.clientY);
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      isPointerDown = false;
    });

    // Controls
    const blastBtn = document.getElementById('btn-particle-blast');
    if (blastBtn) {
      blastBtn.addEventListener('click', () => {
        playKinetixSound('success');
        particles.forEach(p => {
          p.vx = (Math.random() - 0.5) * 28;
          p.vy = -Math.random() * 22 - 6;
        });
      });
    }

    const resetBtn = document.getElementById('btn-particle-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        playKinetixSound('pop');
        checkAndResize();
        initParticles();
      });
    }

    const gravitySlider = document.getElementById('slider-gravity');
    if (gravitySlider) {
      gravitySlider.addEventListener('input', (e) => {
        gravity = parseFloat(e.target.value);
        const valLabel = document.getElementById('label-gravity-val');
        if (valLabel) valLabel.textContent = gravity.toFixed(2);
      });
    }

    const countSlider = document.getElementById('slider-count');
    if (countSlider) {
      countSlider.addEventListener('input', (e) => {
        particleCount = parseInt(e.target.value);
        const valLabel = document.getElementById('label-count-val');
        if (valLabel) valLabel.textContent = particleCount;
        initParticles();
      });
    }

    // Main animation loop
    function loop() {
      if (width <= 0) {
        if (checkAndResize()) {
          initParticles();
        }
      }

      if (width > 0) {
        ctx.clearRect(0, 0, width, height);

        // Subtle connecting lines between nearby particles
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 75) {
              ctx.strokeStyle = `rgba(100, 150, 255, ${0.16 * (1 - dist / 75)})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke();
            }
          }
        }

        particles.forEach(p => {
          p.update();
          p.draw();
        });
      }

      requestAnimationFrame(loop);
    }

    loop();
  }

  // ==================== 6. GLOBAL INTERACTIVE CURSOR PARTICLE SUITE ====================
  function initGlobalCursorParticles() {
    let canvas = document.getElementById('cursor-particle-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'cursor-particle-canvas';
      document.body.appendChild(canvas);
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const sparks = [];
    let isMouseDown = false;
    let animId = null;

    function getThemeSparkPalette() {
      const t = KINETIX_THEMES.find(th => th.id === currentThemeId);
      if (t && t.colors && t.colors.length > 2) {
        return t.colors.slice(2);
      }
      return ['#38bdf8', '#a855f7', '#10b981', '#fbbf24', '#ff0055'];
    }

    function addSparkBurst(x, y, count) {
      const colors = getThemeSparkPalette();
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 2;
        sparks.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 3.5 + 1.5,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 1,
          decay: Math.random() * 0.035 + 0.02
        });
      }
      if (!animId) {
        animId = requestAnimationFrame(updateSparks);
      }
    }

    window.addEventListener('pointerdown', (e) => {
      isMouseDown = true;
      addSparkBurst(e.clientX, e.clientY, 12);
    });

    window.addEventListener('pointerup', () => {
      isMouseDown = false;
    });

    window.addEventListener('pointermove', (e) => {
      if (isMouseDown) {
        addSparkBurst(e.clientX, e.clientY, 3);
      }
    });

    function updateSparks() {
      ctx.clearRect(0, 0, width, height);

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.12; // light gravity
        s.vx *= 0.96; // friction
        s.vy *= 0.96;
        s.life -= s.decay;

        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }

        ctx.fillStyle = s.color;
        ctx.globalAlpha = Math.max(0, s.life);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (sparks.length > 0) {
        animId = requestAnimationFrame(updateSparks);
      } else {
        animId = null;
        ctx.clearRect(0, 0, width, height);
      }
    }
  }

  // ==================== 7. INITIALIZE ON DOM READY ====================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initAdaptiveThemeBackground();
      initThemeControls();
      initParticlePlayground();
      initGlobalCursorParticles();
    });
  } else {
    initAdaptiveThemeBackground();
    initThemeControls();
    initParticlePlayground();
    initGlobalCursorParticles();
  }

  // Export global API
  window.Kinetix = {
    setTheme: applyTheme,
    playSound: playKinetixSound,
    playSFX: playKinetixSound,
    getThemes: () => KINETIX_THEMES,
    getCurrentTheme: () => currentThemeId,
    startBGM,
    stopBGM,
    toggleBGM,
    setBGMTrack,
    setBGMVolume,
    setSFXVolume,
    setSoundEnabled,
    setAudioMode,
    loadCustomBgm,
    resetCustomBgm,
    loadCustomSfx,
    resetCustomSfx,
    resetAllCustomSfx,
    setBgmEq,
    setSfxPitch,
    resetBgmEqAndPitch,
    applyCustomTheme,
    ThemeLab: {
      apply: applyCustomTheme,
      savePreset: saveCustomThemePreset,
      exportJson: exportCustomThemeJson,
      downloadJson: downloadCustomThemeJson,
      reset: resetThemeLabToActive,
      getState: () => Object.assign({}, customThemeState)
    },
    getAudioMode: () => audioMode,
    isBgmPlaying: () => isBgmPlaying,
    resizeParticleCanvas: () => {
      const pCanvas = document.getElementById('kinetix-particle-canvas');
      if (pCanvas && window.Kinetix.resizeParticleCanvas) {
        window.Kinetix.resizeParticleCanvas();
      }
    }
  };

  window.KinetixAudio = {
    playSFX: playKinetixSound,
    startBGM,
    stopBGM,
    toggleBGM,
    setBGMTrack,
    setBGMVolume,
    setSFXVolume,
    setSoundEnabled,
    setAudioMode,
    loadCustomBgm,
    resetCustomBgm,
    loadCustomSfx,
    resetCustomSfx,
    resetAllCustomSfx,
    setBgmEq,
    setSfxPitch,
    resetBgmEqAndPitch,
    getAudioMode: () => audioMode,
    isBgmPlaying: () => isBgmPlaying,
    currentTrack: () => currentBgmTrack,
  };
})();

