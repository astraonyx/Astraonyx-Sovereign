// dashboard/js/nanoSoundFX.js — High-Fidelity Procedural Sound Synthesis Engine for Polaris Games & Fun Tools
// 100% Web Audio API procedural synthesis with zero external MP3/WAV dependencies. Works offline.

(function(global) {
  'use strict';

  class NanoSoundFXEngine {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.isMuted = localStorage.getItem('polaris_games_sound_muted') === 'true';
      this.volume = 0.4;
      this._initialized = false;
      this._initOnGesture = this._initOnGesture.bind(this);

      // Register gesture listeners to resume AudioContext cleanly
      ['click', 'keydown', 'pointerdown', 'touchstart'].forEach(evt => {
        window.addEventListener(evt, this._initOnGesture, { once: true, passive: true });
      });
    }

    _initContext() {
      if (this.ctx) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
        this._initialized = true;
      } catch (err) {
        console.warn('[NanoSoundFX] Web Audio API initialization notice:', err.message);
      }
    }

    _initOnGesture() {
      this._initContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }

    ensureContext() {
      this._initContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx && !this.isMuted;
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      localStorage.setItem('polaris_games_sound_muted', this.isMuted ? 'true' : 'false');
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      }
      this._dispatchMuteEvent();
      return this.isMuted;
    }

    setMuted(muted) {
      this.isMuted = !!muted;
      localStorage.setItem('polaris_games_sound_muted', this.isMuted ? 'true' : 'false');
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      }
      this._dispatchMuteEvent();
    }

    _dispatchMuteEvent() {
      window.dispatchEvent(new CustomEvent('nanosound:mutechange', { detail: { isMuted: this.isMuted } }));
    }

    createNoiseBuffer(duration = 0.2) {
      if (!this.ctx) return null;
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      return buffer;
    }

    // ==================== 1. CHESS SOUNDS ====================
    playChessMove() {
      if (!this.ensureContext()) return;
      const t = this.ctx.currentTime;

      // 1. Tactile wood/marble knock (triangle low-pitch body)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(140, t);
      osc1.frequency.exponentialRampToValueAtTime(55, t + 0.05);

      gain1.gain.setValueAtTime(0.35, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc1.connect(gain1);
      gain1.connect(this.masterGain);
      osc1.start(t);
      osc1.stop(t + 0.07);

      // 2. High tap snap
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(520, t);
      osc2.frequency.exponentialRampToValueAtTime(220, t + 0.03);

      gain2.gain.setValueAtTime(0.25, t);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc2.connect(gain2);
      gain2.connect(this.masterGain);
      osc2.start(t);
      osc2.stop(t + 0.05);
    }

    playChessCapture() {
      if (!this.ensureContext()) return;
      const t = this.ctx.currentTime;

      // 1. Heavy physical strike impact
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);

      gain.gain.setValueAtTime(0.45, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.15);

      // 2. Filtered noise rattle/strike
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(0.12);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, t);
      filter.Q.setValueAtTime(2, t);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.3, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.masterGain);
      noise.start(t);
      noise.stop(t + 0.12);
    }

    playChessCheck() {
      if (!this.ensureContext()) return;
      const t = this.ctx.currentTime;

      // Urgent double-ping warning
      [0, 0.12].forEach((offset, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(idx === 0 ? 880 : 1174.66, t + offset); // A5 then D6

        gain.gain.setValueAtTime(0.3, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t + offset);
        osc.stop(t + offset + 0.16);
      });
    }

    playChessCheckmate() {
      if (!this.ensureContext()) return;
      const t = this.ctx.currentTime;

      // Regal victory arpeggio: C5 -> E5 -> G5 -> C6 -> E6
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, idx) => {
        const time = t + idx * 0.1;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.28, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(time);
        osc.stop(time + 0.5);
      });
    }

    playChessIllegal() {
      if (!this.ensureContext()) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, t);
      osc.frequency.linearRampToValueAtTime(90, t + 0.1);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.13);
    }

    // ==================== 2. GALAXY SNAKE SOUNDS ====================
    playSnakeEat() {
      if (!this.ensureContext()) return;
      const t = this.ctx.currentTime;

      // Joyful ascending bubble pop
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(920, t + 0.08);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.11);
    }

    playSnakeDie() {
      if (!this.ensureContext()) return;
      const t = this.ctx.currentTime;

      // 1. Descending crash frequency
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.35);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.42);

      // 2. Glitch noise explosion
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(0.35);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.linearRampToValueAtTime(100, t + 0.35);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.45, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.masterGain);
      noise.start(t);
      noise.stop(t + 0.36);
    }

    playSnakeTurn() {
      if (!this.ensureContext()) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);

      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.03);
    }

    // ==================== 3. MINESWEEPER SOUNDS ====================
    playMineClick() {
      if (!this.ensureContext()) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.04);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.06);
    }

    playMineFlag() {
      if (!this.ensureContext()) return;
      const t = this.ctx.currentTime;

      // Sharp metallic flag pin
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1100, t);
      osc.frequency.exponentialRampToValueAtTime(700, t + 0.06);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.08);
    }

    playMineExplosion() {
      if (!this.ensureContext()) return;
      const t = this.ctx.currentTime;

      // Heavy bomb detonation
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(95, t);
      osc.frequency.exponentialRampToValueAtTime(25, t + 0.5);

      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.65);

      // Noise blast
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(0.5);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, t);
      filter.frequency.exponentialRampToValueAtTime(60, t + 0.5);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.55, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.masterGain);
      noise.start(t);
      noise.stop(t + 0.52);
    }

    playMineWin() {
      if (!this.ensureContext()) return;
      const t = this.ctx.currentTime;

      // Sparkly victory chime
      [587.33, 739.99, 880.00, 1174.66, 1479.98].forEach((f, idx) => {
        const time = t + idx * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, time);

        gain.gain.setValueAtTime(0.28, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(time);
        osc.stop(time + 0.4);
      });
    }

    // ==================== 4. XOX & SOS SOUNDS ====================
    playXOXPlace(symbol) {
      if (!this.ensureContext()) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(symbol === 'X' ? 659.25 : 440, t);
      osc.frequency.exponentialRampToValueAtTime(symbol === 'X' ? 880 : 330, t + 0.06);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.09);
    }

    playXOXWin() {
      this.playChessCheckmate();
    }

    playSOSPlace(letter) {
      if (!this.ensureContext()) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(letter === 'S' ? 740 : 493.88, t);

      gain.gain.setValueAtTime(0.26, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.08);
    }

    playSOSFormed() {
      if (!this.ensureContext()) return;
      const t = this.ctx.currentTime;

      // Bright harmonic double chime
      [880, 1318.51].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.32, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.38);
      });
    }

    // ==================== 5. MEMORY FLIP & DOTS SOUNDS ====================
    playCardFlip() {
      if (!this.ensureContext()) return;
      const t = this.ctx.currentTime;

      // Filtered air whoosh sweep
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(0.18);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(500, t);
      filter.frequency.exponentialRampToValueAtTime(2400, t + 0.1);
      filter.Q.setValueAtTime(1.8, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      noise.start(t);
      noise.stop(t + 0.18);
    }

    playCardMatch() {
      if (!this.ensureContext()) return;
      const t = this.ctx.currentTime;

      // Celestial bell chord: C6 + G6 + C7
      [1046.50, 1567.98, 2093.00].forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.65);
      });
    }

    playCardMismatch() {
      if (!this.ensureContext()) return;
      const t = this.ctx.currentTime;

      // Low dull dual tone
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(196, t);
      osc.frequency.exponentialRampToValueAtTime(146.83, t + 0.15);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.2);
    }

    playDotsLine() {
      if (!this.ensureContext()) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, t);
      osc.frequency.exponentialRampToValueAtTime(320, t + 0.05);

      gain.gain.setValueAtTime(0.24, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.07);
    }

    playDotsBox() {
      if (!this.ensureContext()) return;
      const t = this.ctx.currentTime;

      // Power-up territory capture
      [523.25, 783.99, 1046.50].forEach((freq, idx) => {
        const time = t + idx * 0.06;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(time);
        osc.stop(time + 0.3);
      });
    }

    // ==================== 6. TAROT ORACLE SOUNDS ====================
    playTarotShuffle() {
      if (!this.ensureContext()) return;
      const t = this.ctx.currentTime;

      // 4 rapid card flick whooshes
      for (let i = 0; i < 4; i++) {
        const time = t + i * 0.06;
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.09);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1000 + i * 300, time);
        filter.Q.setValueAtTime(2.5, time);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start(time);
        noise.stop(time + 0.09);
      }
    }

    playTarotFlip() {
      if (!this.ensureContext()) return;
      const t = this.ctx.currentTime;

      // Mystical card flip whoosh + crystalline ping
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(0.22);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, t);
      filter.frequency.exponentialRampToValueAtTime(2800, t + 0.15);
      filter.Q.setValueAtTime(2.0, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      noise.start(t);
      noise.stop(t + 0.22);

      // Crystal chime harmonic
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1318.51, t + 0.05); // E6

      oscGain.gain.setValueAtTime(0.2, t + 0.05);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(t + 0.05);
      osc.stop(t + 0.48);
    }

    playTarotGong() {
      if (!this.ensureContext()) return;
      const t = this.ctx.currentTime;

      // Deep Tibetan singing bowl / Cosmic Oracle Gong (A2 110Hz + harmonics with binaural shimmer)
      const harmonics = [
        { freq: 110, gain: 0.45, decay: 2.8 },
        { freq: 111.5, gain: 0.35, decay: 2.7 }, // subtle beating shimmer
        { freq: 220, gain: 0.28, decay: 2.2 },
        { freq: 330, gain: 0.20, decay: 1.8 },
        { freq: 550, gain: 0.15, decay: 1.4 },
        { freq: 880, gain: 0.10, decay: 1.0 }
      ];

      harmonics.forEach(h => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(h.freq, t);

        g.gain.setValueAtTime(h.gain, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + h.decay);

        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + h.decay + 0.1);
      });
    }
  }

  // Export singleton instance to window
  global.NanoSoundFX = new NanoSoundFXEngine();

})(typeof window !== 'undefined' ? window : this);
