// dashboard/js/spotifyStreamer.js — Astraonyx Spotify Cloud Streamer & Lyrics Studio
// Pure live audio streaming (zero local download), synced lyrics & translation,
// playlist/album support with repeat playlist / repeat track / shuffle, and floating PIP overlay!

(function() {
  'use strict';

  // State Management
  const state = {
    playlist: null,
    tracks: [],
    currentIndex: -1,
    isPlaying: false,
    repeatMode: 'playlist', // 'off', 'playlist', 'track'
    isShuffle: false,
    shuffleOrder: [],
    shufflePointer: 0,
    currentLyrics: null,
    isTranslating: false,
    translatedLines: [],
    showTranslated: false,
    volume: 0.85,
    overlayActive: false,
    overlayCollapsed: false,
    activeLyricIndex: -1
  };

  // Audio Instance
  const audio = new Audio();
  audio.preload = 'auto';
  audio.volume = state.volume;

  // DOM Elements Cache
  let els = {};

  function initElements() {
    els = {
      subpage: document.getElementById('dl-subpage-spotify'),
      urlInput: document.getElementById('spotify-url-input'),
      btnLoad: document.getElementById('btn-spotify-load'),
      btnPaste: document.getElementById('btn-spotify-paste'),
      statusBadge: document.getElementById('spotify-status-badge'),
      playlistHeader: document.getElementById('spotify-playlist-header'),
      playlistCover: document.getElementById('spotify-playlist-cover'),
      playlistTitle: document.getElementById('spotify-playlist-title'),
      playlistCreator: document.getElementById('spotify-playlist-creator'),
      playlistCount: document.getElementById('spotify-playlist-count'),
      btnPlayAll: document.getElementById('btn-spotify-play-all'),
      btnShuffleAll: document.getElementById('btn-spotify-shuffle-all'),
      trackSearchInput: document.getElementById('spotify-track-search'),
      trackListContainer: document.getElementById('spotify-tracklist-items'),
      
      // Lyrics Box
      lyricsContainer: document.getElementById('spotify-lyrics-content'),
      lyricsTrackTitle: document.getElementById('spotify-lyrics-track-title'),
      lyricsTrackArtist: document.getElementById('spotify-lyrics-track-artist'),
      lyricsTypeBadge: document.getElementById('spotify-lyrics-type-badge'),
      btnTranslate: document.getElementById('btn-spotify-translate'),

      // Player Bar
      playerBar: document.getElementById('spotify-master-player'),
      playerArt: document.getElementById('spotify-player-art'),
      playerTitle: document.getElementById('spotify-player-title'),
      playerArtist: document.getElementById('spotify-player-artist'),
      btnPrev: document.getElementById('btn-spotify-prev'),
      btnPlay: document.getElementById('btn-spotify-play'),
      btnNext: document.getElementById('btn-spotify-next'),
      btnRepeat: document.getElementById('btn-spotify-repeat'),
      btnShuffle: document.getElementById('btn-spotify-shuffle'),
      repeatBadge: document.getElementById('spotify-repeat-badge'),
      currTime: document.getElementById('spotify-current-time'),
      totalTime: document.getElementById('spotify-total-time'),
      progressBar: document.getElementById('spotify-progress-bar'),
      progressFill: document.getElementById('spotify-progress-fill'),
      btnPip: document.getElementById('btn-spotify-pip-toggle'),
      volumeSlider: document.getElementById('spotify-volume-slider'),

      // Floating PIP Overlay
      overlay: document.getElementById('spotify-floating-overlay'),
      pipArt: document.getElementById('spotify-pip-art'),
      pipTitle: document.getElementById('spotify-pip-title'),
      pipArtist: document.getElementById('spotify-pip-artist'),
      btnPipPlay: document.getElementById('btn-spotify-pip-play'),
      btnPipPrev: document.getElementById('btn-spotify-pip-prev'),
      btnPipNext: document.getElementById('btn-spotify-pip-next'),
      pipProgressFill: document.getElementById('spotify-pip-progress-fill'),
      btnPipClose: document.getElementById('btn-spotify-pip-close'),
      btnPipExpand: document.getElementById('btn-spotify-pip-expand')
    };
  }

  // Audio Event Listeners
  audio.addEventListener('play', () => {
    state.isPlaying = true;
    updatePlayPauseUI();
    if (els.playerArt) els.playerArt.classList.add('spin');
  });

  audio.addEventListener('pause', () => {
    state.isPlaying = false;
    updatePlayPauseUI();
    if (els.playerArt) els.playerArt.classList.remove('spin');
  });

  audio.addEventListener('timeupdate', () => {
    if (!audio.duration || isNaN(audio.duration)) return;
    const cur = audio.currentTime;
    const dur = audio.duration;
    const pct = (cur / dur) * 100;

    if (els.progressFill) els.progressFill.style.width = `${pct}%`;
    if (els.pipProgressFill) els.pipProgressFill.style.width = `${pct}%`;
    if (els.currTime) els.currTime.textContent = formatSec(cur);
    if (els.totalTime) els.totalTime.textContent = formatSec(dur);

    syncLyricsHighlight(cur);
  });

  audio.addEventListener('ended', () => {
    handleTrackEnded();
  });

  audio.addEventListener('error', (e) => {
    console.warn('[SpotifyStreamer] Audio stream error:', e);
    // Auto skip to next after brief pause if stream fails
    setTimeout(() => {
      if (state.tracks.length > 1) {
        playNextTrack();
      }
    }, 1500);
  });

  function formatSec(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function updatePlayPauseUI() {
    const playIcon = state.isPlaying
      ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>'
      : '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';

    if (els.btnPlay) els.btnPlay.innerHTML = playIcon;
    if (els.btnPipPlay) els.btnPipPlay.innerHTML = playIcon;

    // Update track rows active visualizer
    document.querySelectorAll('.spotify-track-row').forEach(row => {
      const idx = parseInt(row.getAttribute('data-index'), 10);
      const isCurrent = idx === state.currentIndex;
      row.classList.toggle('active', isCurrent);
      const soundwave = row.querySelector('.spotify-mini-soundwave');
      if (soundwave) {
        soundwave.style.display = (isCurrent && state.isPlaying) ? 'flex' : 'none';
      }
    });
  }

  function handleTrackEnded() {
    if (state.repeatMode === 'track') {
      audio.currentTime = 0;
      audio.play().catch(console.warn);
      return;
    }

    if (state.isShuffle) {
      playNextShuffleTrack();
      return;
    }

    const isLast = state.currentIndex >= state.tracks.length - 1;
    if (isLast) {
      if (state.repeatMode === 'playlist') {
        playTrackByIndex(0);
      } else {
        state.isPlaying = false;
        updatePlayPauseUI();
      }
    } else {
      playTrackByIndex(state.currentIndex + 1);
    }
  }

  function generateShuffleOrder() {
    const arr = state.tracks.map((_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    state.shuffleOrder = arr;
    state.shufflePointer = 0;
  }

  function playNextShuffleTrack() {
    if (state.shuffleOrder.length === 0) generateShuffleOrder();
    state.shufflePointer++;
    if (state.shufflePointer >= state.shuffleOrder.length) {
      if (state.repeatMode === 'playlist') {
        generateShuffleOrder();
      } else {
        state.isPlaying = false;
        updatePlayPauseUI();
        return;
      }
    }
    const nextIdx = state.shuffleOrder[state.shufflePointer];
    playTrackByIndex(nextIdx);
  }

  function playPrevTrack() {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    if (state.currentIndex > 0) {
      playTrackByIndex(state.currentIndex - 1);
    } else if (state.repeatMode === 'playlist') {
      playTrackByIndex(state.tracks.length - 1);
    }
  }

  function playNextTrack() {
    if (state.isShuffle) {
      playNextShuffleTrack();
    } else if (state.currentIndex < state.tracks.length - 1) {
      playTrackByIndex(state.currentIndex + 1);
    } else if (state.repeatMode === 'playlist') {
      playTrackByIndex(0);
    }
  }

  function togglePlayPause() {
    if (state.currentIndex === -1 && state.tracks.length > 0) {
      playTrackByIndex(0);
      return;
    }
    if (audio.paused) {
      audio.play().catch(console.warn);
    } else {
      audio.pause();
    }
  }

  function cycleRepeatMode() {
    if (state.repeatMode === 'off') {
      state.repeatMode = 'playlist';
    } else if (state.repeatMode === 'playlist') {
      state.repeatMode = 'track';
    } else {
      state.repeatMode = 'off';
    }
    updateRepeatUI();
  }

  function updateRepeatUI() {
    if (!els.btnRepeat) return;
    if (state.repeatMode === 'off') {
      els.btnRepeat.classList.remove('active');
      els.btnRepeat.style.color = 'rgba(255,255,255,0.45)';
      if (els.repeatBadge) els.repeatBadge.textContent = 'Off';
    } else if (state.repeatMode === 'playlist') {
      els.btnRepeat.classList.add('active');
      els.btnRepeat.style.color = '#1DB954';
      if (els.repeatBadge) els.repeatBadge.textContent = 'All 🔁';
    } else if (state.repeatMode === 'track') {
      els.btnRepeat.classList.add('active');
      els.btnRepeat.style.color = '#38bdf8';
      if (els.repeatBadge) els.repeatBadge.textContent = '1 🔂';
    }
  }

  function toggleShuffle() {
    state.isShuffle = !state.isShuffle;
    if (state.isShuffle) {
      generateShuffleOrder();
      if (els.btnShuffle) els.btnShuffle.classList.add('active');
      if (els.btnShuffle) els.btnShuffle.style.color = '#1DB954';
    } else {
      if (els.btnShuffle) els.btnShuffle.classList.remove('active');
      if (els.btnShuffle) els.btnShuffle.style.color = 'rgba(255,255,255,0.45)';
    }
  }

  // Load and play track via Mori Audio Streamer
  async function playTrackByIndex(index) {
    if (!state.tracks || !state.tracks[index]) return;
    state.currentIndex = index;
    const track = state.tracks[index];

    // Update Player UI
    if (els.playerTitle) els.playerTitle.textContent = track.title;
    if (els.playerArtist) els.playerArtist.textContent = track.artist;
    if (els.playerArt) els.playerArt.src = track.coverArt || state.playlist?.coverArt || '';
    if (els.totalTime) els.totalTime.textContent = track.durationFormatted || '0:00';

    // Update PIP Overlay UI
    if (els.pipTitle) els.pipTitle.textContent = track.title;
    if (els.pipArtist) els.pipArtist.textContent = track.artist;
    if (els.pipArt) els.pipArt.src = track.coverArt || state.playlist?.coverArt || '';

    // Show connecting status beacon
    if (els.statusBadge) {
      els.statusBadge.textContent = `Menghubungkan Mori Audio: ${track.title}...`;
      els.statusBadge.style.color = '#38bdf8';
    }

    // Set loading spinner on master play button
    if (els.btnPlay) {
      els.btnPlay.innerHTML = '<span style="display:inline-block; width:16px; height:16px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite;"></span>';
    }

    // Fetch and render lyrics in parallel immediately
    loadLyricsForTrack(track);

    let streamUrl = track.moriAudioUrl;

    // If Mori stream not yet resolved for this track, resolve it now via Mori Scraper API
    if (!streamUrl) {
      try {
        const moriRes = await fetch(`/api/spotify/resolve-track?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`);
        const moriData = await moriRes.json();
        if (moriData.success && moriData.streamUrl) {
          track.moriAudioUrl = moriData.streamUrl;
          streamUrl = moriData.streamUrl;
          if (moriData.durationFormatted) {
            track.durationFormatted = moriData.durationFormatted;
            track.durationMs = moriData.durationMs;
            if (els.totalTime) els.totalTime.textContent = moriData.durationFormatted;
          }
        } else if (track.streamUrl) {
          // Spotify preview fallback if Mori fails
          streamUrl = track.streamUrl;
        } else {
          throw new Error(moriData.error || 'Gagal memuat streaming audio dari Mori.');
        }
      } catch (err) {
        console.warn('[SpotifyStreamer] Mori stream resolve warning, trying direct stream:', err.message);
        if (track.streamUrl) {
          streamUrl = track.streamUrl;
        } else {
          streamUrl = `/api/spotify/stream-proxy?url=${encodeURIComponent(track.spotifyUrl || '')}`;
        }
      }
    }

    try {
      audio.src = streamUrl;
      audio.load();
      await audio.play();
      state.isPlaying = true;
      if (els.statusBadge) {
        els.statusBadge.textContent = `Sedang Streaming: ${track.title}`;
        els.statusBadge.style.color = '#1DB954';
      }
    } catch (err) {
      console.warn('[SpotifyStreamer] Play failed, attempting stream proxy fallback:', err.message);
      try {
        audio.src = `/api/spotify/stream-proxy?url=${encodeURIComponent(streamUrl)}`;
        audio.load();
        await audio.play();
        state.isPlaying = true;
      } catch (e) {
        console.error('[SpotifyStreamer] Audio playback failed:', e);
        state.isPlaying = false;
      }
    }

    updatePlayPauseUI();

    // Prefetch next track in background after 3s so transition is instant
    prefetchNextTrack(index + 1);
  }

  // Background prefetch for next track to ensure zero playback latency
  async function prefetchNextTrack(nextIndex) {
    if (!state.tracks || nextIndex >= state.tracks.length) return;
    const nextTrack = state.tracks[nextIndex];
    if (nextTrack && !nextTrack.moriAudioUrl) {
      try {
        const res = await fetch(`/api/spotify/resolve-track?title=${encodeURIComponent(nextTrack.title)}&artist=${encodeURIComponent(nextTrack.artist)}`);
        const data = await res.json();
        if (data.success && data.streamUrl) {
          nextTrack.moriAudioUrl = data.streamUrl;
          if (data.durationFormatted) {
            nextTrack.durationFormatted = data.durationFormatted;
            nextTrack.durationMs = data.durationMs;
          }
        }
      } catch (_) {}
    }
  }

  // Fetch & Render Lyrics with sync & duration support
  async function loadLyricsForTrack(track) {
    if (els.lyricsTrackTitle) els.lyricsTrackTitle.textContent = track.title;
    if (els.lyricsTrackArtist) els.lyricsTrackArtist.textContent = track.artist;
    if (els.lyricsTypeBadge) {
      els.lyricsTypeBadge.textContent = 'Memuat Lirik...';
      els.lyricsTypeBadge.style.color = '#fbbf24';
    }

    state.currentLyrics = null;
    state.translatedLines = [];
    state.activeLyricIndex = -1;

    try {
      const durSec = Math.round((track.durationMs || 180000) / 1000);
      const res = await fetch(`/api/spotify/lyrics?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}&duration=${durSec}`);
      const data = await res.json();
      state.currentLyrics = data;

      if (!data.hasLyrics) {
        renderEmptyLyrics('Lirik tidak tersedia untuk lagu ini.');
        if (els.lyricsTypeBadge) {
          els.lyricsTypeBadge.textContent = 'Lirik Kosong';
          els.lyricsTypeBadge.style.color = 'var(--text-muted)';
        }
        if (els.btnTranslate) els.btnTranslate.style.display = 'none';
        return;
      }

      if (els.btnTranslate) els.btnTranslate.style.display = 'inline-flex';

      if (data.isSynced && Array.isArray(data.syncedLyrics) && data.syncedLyrics.length > 0) {
        if (els.lyricsTypeBadge) {
          els.lyricsTypeBadge.textContent = '⚡ Lirik Sinkron';
          els.lyricsTypeBadge.style.color = '#1DB954';
        }
        renderSyncedLyrics(data.syncedLyrics);
      } else {
        if (els.lyricsTypeBadge) {
          els.lyricsTypeBadge.textContent = '📝 Lirik Teks';
          els.lyricsTypeBadge.style.color = '#38bdf8';
        }
        renderPlainLyrics(data.plainLyrics);
      }
    } catch (err) {
      console.warn('[SpotifyStreamer] Lyrics load error:', err.message);
      renderEmptyLyrics('Gagal memuat lirik: ' + err.message);
    }
  }

  function renderEmptyLyrics(message) {
    if (!els.lyricsContainer) return;
    els.lyricsContainer.innerHTML = `
      <div class="spotify-lyrics-empty">
        <div style="font-size: 2.2rem; margin-bottom: 12px; opacity: 0.6;">🎙️</div>
        <div style="font-size: 0.92rem; font-weight: 600; color: #fff; margin-bottom: 6px;">Bagian Lirik Kosong</div>
        <div style="font-size: 0.78rem; color: var(--text-muted); max-width: 320px; line-height: 1.5;">${message}</div>
      </div>
    `;
  }

  function renderPlainLyrics(plainText) {
    if (!els.lyricsContainer) return;
    const lines = (plainText || '').split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) {
      renderEmptyLyrics('Lirik tidak memiliki teks.');
      return;
    }
    const html = lines.map((line, idx) => `
      <div class="spotify-lyric-line plain-line" data-index="${idx}">
        <span class="spotify-lyric-text">${escapeHtml(line)}</span>
      </div>
    `).join('');
    els.lyricsContainer.innerHTML = `<div class="spotify-lyrics-scroll" id="spotify-lyrics-scroll-box">${html}</div>`;
  }

  function renderSyncedLyrics(syncedLines) {
    if (!els.lyricsContainer) return;
    const html = syncedLines.map((line, idx) => `
      <div class="spotify-lyric-line" data-index="${idx}" data-time="${line.time}" onclick="window.spotifySeekTo(${line.time})">
        <div class="spotify-lyric-text">${escapeHtml(line.text || '...')}</div>
        <span class="spotify-lyric-trans" id="lyric-trans-${idx}" style="display: ${state.showTranslated ? 'block' : 'none'};"></span>
      </div>
    `).join('');
    els.lyricsContainer.innerHTML = `<div class="spotify-lyrics-scroll" id="spotify-lyrics-scroll-box">${html}</div>`;
  }

  // Real-time Lyrics Auto-Scroll & Singer Line Highlight
  function syncLyricsHighlight(currentTime) {
    if (!state.currentLyrics || !state.currentLyrics.isSynced) return;
    const lines = state.currentLyrics.syncedLyrics;
    if (!lines || lines.length === 0) return;

    let targetIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].time <= currentTime) {
        targetIdx = i;
      } else {
        break;
      }
    }

    if (targetIdx !== state.activeLyricIndex) {
      state.activeLyricIndex = targetIdx;
      const allLines = document.querySelectorAll('.spotify-lyric-line');
      let activeEl = null;

      allLines.forEach((el) => {
        const idx = parseInt(el.getAttribute('data-index'), 10);
        const isActive = idx === targetIdx;
        const isPassed = targetIdx !== -1 && idx < targetIdx;
        el.classList.toggle('active', isActive);
        el.classList.toggle('passed', isPassed);
        if (isActive) {
          activeEl = el;
        }
      });

      if (activeEl) {
        const scrollBox = document.getElementById('spotify-lyrics-scroll-box');
        if (scrollBox) {
          // Precisely center the active singing line in the scroll container
          const targetTop = (activeEl.offsetTop - scrollBox.offsetTop) - (scrollBox.clientHeight / 2) + (activeEl.clientHeight / 2);
          scrollBox.scrollTo({
            top: Math.max(0, targetTop),
            behavior: 'smooth'
          });
        }
      }
    }
  }

  // Lyrics Translation Toggle
  async function toggleLyricsTranslation() {
    if (!state.currentLyrics || !state.currentLyrics.hasLyrics) return;
    state.showTranslated = !state.showTranslated;

    if (els.btnTranslate) {
      els.btnTranslate.classList.toggle('active', state.showTranslated);
      els.btnTranslate.style.borderColor = state.showTranslated ? '#38bdf8' : 'rgba(255,255,255,0.15)';
      els.btnTranslate.style.color = state.showTranslated ? '#38bdf8' : '#fff';
    }

    if (state.showTranslated) {
      if (state.translatedLines.length === 0) {
        if (els.btnTranslate) els.btnTranslate.innerHTML = '<span>⏳</span> Menerjemahkan...';
        try {
          const payload = state.currentLyrics.isSynced
            ? { lines: state.currentLyrics.syncedLyrics, targetLang: 'id' }
            : { text: state.currentLyrics.plainLyrics, targetLang: 'id' };

          const res = await fetch('/api/spotify/translate-lyrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          state.translatedLines = data.translatedLines || [];

          // Inject into rendered lines
          if (state.currentLyrics.isSynced && Array.isArray(state.translatedLines)) {
            state.translatedLines.forEach((tLine, i) => {
              const transEl = document.getElementById(`lyric-trans-${i}`);
              if (transEl && tLine.translatedText) {
                transEl.textContent = tLine.translatedText;
                transEl.style.display = 'block';
              }
            });
          }
        } catch (err) {
          console.warn('[SpotifyStreamer] Translation error:', err.message);
        } finally {
          if (els.btnTranslate) els.btnTranslate.innerHTML = '<span>🌐</span> Terjemahan: Indonesia ✓';
        }
      } else {
        document.querySelectorAll('.spotify-lyric-trans').forEach(el => el.style.display = 'block');
      }
    } else {
      document.querySelectorAll('.spotify-lyric-trans').forEach(el => el.style.display = 'none');
      if (els.btnTranslate) els.btnTranslate.innerHTML = '<span>🌐</span> Terjemahkan Lirik';
    }
  }

  // Load Playlist from Input URL
  async function loadSpotifyUrl(url) {
    const cleanUrl = String(url || els.urlInput?.value || '').trim();
    if (!cleanUrl) {
      alert('Masukkan link playlist atau lagu Spotify terlebih dahulu.');
      return;
    }

    if (els.btnLoad) {
      els.btnLoad.disabled = true;
      els.btnLoad.innerHTML = '<span>⏳</span> Merender Playlist...';
    }
    if (els.statusBadge) {
      els.statusBadge.textContent = 'Menghubungkan ke Spotify Cloud...';
      els.statusBadge.style.color = '#fbbf24';
    }

    try {
      const res = await fetch('/api/spotify/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl })
      });
      const data = await res.json();

      if (!data.success || !data.data) {
        throw new Error(data.error || 'Gagal memuat playlist Spotify.');
      }

      state.playlist = data.data;
      state.tracks = data.data.tracks || [];

      // Update Playlist Header Card
      if (els.playlistHeader) els.playlistHeader.style.display = 'flex';
      if (els.playlistCover) els.playlistCover.src = state.playlist.coverArt;
      if (els.playlistTitle) els.playlistTitle.textContent = state.playlist.title;
      if (els.playlistCreator) els.playlistCreator.textContent = `Oleh ${state.playlist.creator}`;
      if (els.playlistCount) els.playlistCount.textContent = `${state.tracks.length} Lagu Tersedia`;

      // Render Tracks List
      renderTrackList(state.tracks);

      // Auto play first track
      if (state.tracks.length > 0) {
        playTrackByIndex(0);
      }

      if (els.statusBadge) {
        els.statusBadge.textContent = `Sukses! ${state.tracks.length} Lagu Siap Streaming`;
        els.statusBadge.style.color = '#1DB954';
      }
    } catch (err) {
      console.error('[SpotifyStreamer] Resolve error:', err);
      alert(`Gagal memproses link Spotify: ${err.message}`);
      if (els.statusBadge) {
        els.statusBadge.textContent = `Error: ${err.message}`;
        els.statusBadge.style.color = '#f43f5e';
      }
    } finally {
      if (els.btnLoad) {
        els.btnLoad.disabled = false;
        els.btnLoad.innerHTML = '<span>⚡</span> Muat Playlist & Lirik';
      }
    }
  }

  function renderTrackList(tracks) {
    if (!els.trackListContainer) return;
    if (!tracks || tracks.length === 0) {
      els.trackListContainer.innerHTML = '<div style="text-align: center; padding: 24px; color: var(--text-muted);">Tidak ada lagu ditemukan dalam playlist ini.</div>';
      return;
    }

    const html = tracks.map((t, idx) => `
      <div class="spotify-track-row ${idx === state.currentIndex ? 'active' : ''}" data-index="${idx}" onclick="window.spotifyPlayIndex(${idx})">
        <div style="font-size: 0.78rem; font-weight: 700; color: rgba(255,255,255,0.4); width: 22px; text-align: center;">${t.index || (idx + 1)}</div>
        <img class="spotify-track-art" src="${escapeHtml(t.coverArt || state.playlist?.coverArt || '')}" alt="${escapeHtml(t.title)}" loading="lazy">
        <div class="spotify-track-meta">
          <div class="spotify-track-title">${escapeHtml(t.title)}</div>
          <div class="spotify-track-artist">${escapeHtml(t.artist)}</div>
        </div>
        <div class="spotify-mini-soundwave" style="display: ${(idx === state.currentIndex && state.isPlaying) ? 'flex' : 'none'};">
          <span></span><span></span><span></span>
        </div>
        <div style="font-size: 0.76rem; color: var(--text-muted); font-mono: true;">${escapeHtml(t.durationFormatted || '0:30')}</div>
      </div>
    `).join('');

    els.trackListContainer.innerHTML = html;
  }

  function filterTracks(query) {
    const q = String(query || '').toLowerCase().trim();
    if (!state.tracks) return;
    if (!q) {
      renderTrackList(state.tracks);
      return;
    }
    const filtered = state.tracks.filter(t =>
      t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
    );
    renderTrackList(filtered);
  }

  // Floating PIP Overlay Controls
  function toggleOverlay(forceState) {
    state.overlayActive = typeof forceState === 'boolean' ? forceState : !state.overlayActive;
    if (els.overlay) {
      els.overlay.style.display = state.overlayActive ? 'flex' : 'none';
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Global window functions for event delegation
  window.spotifyPlayIndex = (idx) => playTrackByIndex(idx);
  window.spotifySeekTo = (sec) => {
    audio.currentTime = sec;
    if (audio.paused) audio.play().catch(console.warn);
  };

  // Auto show PIP overlay when navigating away while playing
  function setupNavigationDetector() {
    const navButtons = document.querySelectorAll('.nav-tab, .dl-subnav-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const subpage = btn.getAttribute('data-dl-subpage');
        const tab = btn.getAttribute('data-tab');
        const isSpotify = subpage === 'spotify';

        if (!isSpotify && state.isPlaying) {
          // Keep player alive in Floating PIP Overlay!
          toggleOverlay(true);
        }
      });
    });
  }

  // Initialize Spotify Cloud Streamer
  function init() {
    initElements();
    updateRepeatUI();

    // Load button
    if (els.btnLoad) {
      els.btnLoad.addEventListener('click', () => loadSpotifyUrl());
    }

    // Paste button
    if (els.btnPaste && navigator.clipboard) {
      els.btnPaste.addEventListener('click', async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text && els.urlInput) {
            els.urlInput.value = text;
            loadSpotifyUrl(text);
          }
        } catch (_) {}
      });
    }

    // Search filter
    if (els.trackSearchInput) {
      els.trackSearchInput.addEventListener('input', (e) => filterTracks(e.target.value));
    }

    // Play all & Shuffle all
    if (els.btnPlayAll) {
      els.btnPlayAll.addEventListener('click', () => {
        state.isShuffle = false;
        if (els.btnShuffle) els.btnShuffle.classList.remove('active');
        playTrackByIndex(0);
      });
    }
    if (els.btnShuffleAll) {
      els.btnShuffleAll.addEventListener('click', () => {
        state.isShuffle = true;
        if (els.btnShuffle) els.btnShuffle.classList.add('active');
        generateShuffleOrder();
        playNextShuffleTrack();
      });
    }

    // Player bar controls
    if (els.btnPlay) els.btnPlay.addEventListener('click', togglePlayPause);
    if (els.btnPrev) els.btnPrev.addEventListener('click', playPrevTrack);
    if (els.btnNext) els.btnNext.addEventListener('click', playNextTrack);
    if (els.btnRepeat) els.btnRepeat.addEventListener('click', cycleRepeatMode);
    if (els.btnShuffle) els.btnShuffle.addEventListener('click', toggleShuffle);
    if (els.btnTranslate) els.btnTranslate.addEventListener('click', toggleLyricsTranslation);

    // Seekbar click / scrub
    if (els.progressBar) {
      els.progressBar.addEventListener('click', (e) => {
        if (!audio.duration) return;
        const rect = els.progressBar.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        audio.currentTime = pos * audio.duration;
      });
    }

    // Volume slider
    if (els.volumeSlider) {
      els.volumeSlider.addEventListener('input', (e) => {
        audio.volume = parseFloat(e.target.value);
        state.volume = audio.volume;
      });
    }

    // PIP Overlay triggers
    if (els.btnPip) els.btnPip.addEventListener('click', () => toggleOverlay());
    if (els.btnPipPlay) els.btnPipPlay.addEventListener('click', togglePlayPause);
    if (els.btnPipPrev) els.btnPipPrev.addEventListener('click', playPrevTrack);
    if (els.btnPipNext) els.btnPipNext.addEventListener('click', playNextTrack);
    if (els.btnPipClose) els.btnPipClose.addEventListener('click', () => toggleOverlay(false));
    if (els.btnPipExpand) {
      els.btnPipExpand.addEventListener('click', () => {
        if (window.switchDownloaderSubpage) {
          window.switchDownloaderSubpage('spotify');
        }
        toggleOverlay(false);
      });
    }

    // Quick preset buttons for demo
    document.querySelectorAll('.spotify-preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const sampleUrl = chip.getAttribute('data-url');
        if (els.urlInput && sampleUrl) {
          els.urlInput.value = sampleUrl;
          loadSpotifyUrl(sampleUrl);
        }
      });
    });

    setupNavigationDetector();
  }

  // Auto-init on DOMContentLoaded or immediately if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export to window
  window.AstraonyxSpotifyStreamer = {
    loadSpotifyUrl,
    playTrackByIndex,
    togglePlayPause,
    toggleOverlay,
    state
  };
})();
