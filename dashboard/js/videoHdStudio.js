// dashboard/js/videoHdStudio.js — Lumina Video HD AI Enhancer Studio (Wink 4K + 60FPS Remaster)

(function() {
  'use strict';

  let currentVideoFile = null;
  let activeTaskId = null;
  let pollInterval = null;

  function initVideoHdStudio() {
    const btnModePhoto = document.getElementById('btn-lumina-mode-photo');
    const btnModeVideo = document.getElementById('btn-lumina-mode-video');
    const photoContainer = document.getElementById('lumina-photo-studio-wrap');
    const videoContainer = document.getElementById('lumina-video-studio-wrap');

    if (!btnModePhoto || !btnModeVideo || !videoContainer) return;

    btnModePhoto.addEventListener('click', () => {
      btnModePhoto.classList.add('active');
      btnModePhoto.style.border = '1px solid #ec4899';
      btnModePhoto.style.background = 'rgba(236,72,153,0.22)';
      btnModePhoto.style.color = '#fff';

      btnModeVideo.classList.remove('active');
      btnModeVideo.style.border = '1px solid rgba(255,255,255,0.1)';
      btnModeVideo.style.background = 'rgba(255,255,255,0.04)';
      btnModeVideo.style.color = 'var(--text-muted)';

      if (photoContainer) photoContainer.style.display = 'block';
      videoContainer.style.display = 'none';
    });

    btnModeVideo.addEventListener('click', () => {
      btnModeVideo.classList.add('active');
      btnModeVideo.style.border = '1px solid #38bdf8';
      btnModeVideo.style.background = 'rgba(56,189,248,0.22)';
      btnModeVideo.style.color = '#fff';

      btnModePhoto.classList.remove('active');
      btnModePhoto.style.border = '1px solid rgba(255,255,255,0.1)';
      btnModePhoto.style.background = 'rgba(255,255,255,0.04)';
      btnModePhoto.style.color = 'var(--text-muted)';

      if (photoContainer) photoContainer.style.display = 'none';
      videoContainer.style.display = 'block';
    });

    // File input & Dropzone
    const fileInput = document.getElementById('lumina-video-file-input');
    const dropzone = document.getElementById('lumina-video-dropzone-box');
    const promptBox = document.getElementById('lumina-video-upload-prompt');
    const previewBox = document.getElementById('lumina-video-upload-preview');
    const videoPlayerBefore = document.getElementById('lumina-video-player-before');
    const videoFileName = document.getElementById('lumina-video-file-name');
    const videoFileSize = document.getElementById('lumina-video-file-size');
    const btnChange = document.getElementById('btn-lumina-change-video');
    const btnEnhance = document.getElementById('btn-lumina-enhance-video');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', (e) => {
        if (e.target.closest('#btn-lumina-change-video')) return;
        fileInput.click();
      });

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleVideoFileSelected(file);
      });

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '#38bdf8';
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'rgba(56, 189, 248, 0.35)';
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'rgba(56, 189, 248, 0.35)';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleVideoFileSelected(e.dataTransfer.files[0]);
        }
      });
    }

    if (btnChange) {
      btnChange.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.value = '';
        currentVideoFile = null;
        if (previewBox) previewBox.style.display = 'none';
        if (promptBox) promptBox.style.display = 'block';
        if (btnEnhance) btnEnhance.disabled = true;
      });
    }

    function handleVideoFileSelected(file) {
      if (!file.type.includes('video') && !file.name.match(/\.(mp4|mov|webm|mkv)$/i)) {
        alert('Harap pilih file video yang valid (.mp4, .mov, .webm, .mkv).');
        return;
      }
      currentVideoFile = file;

      if (promptBox) promptBox.style.display = 'none';
      if (previewBox) previewBox.style.display = 'flex';
      if (videoFileName) videoFileName.textContent = file.name;
      if (videoFileSize) videoFileSize.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

      const videoUrl = URL.createObjectURL(file);
      if (videoPlayerBefore) {
        videoPlayerBefore.src = videoUrl;
      }

      if (btnEnhance) {
        btnEnhance.disabled = false;
        btnEnhance.style.opacity = '1';
      }
    }

    // Presets selection
    document.querySelectorAll('.lumina-video-preset-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.lumina-video-preset-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      });
    });

    // Start Enhance Video Trigger
    if (btnEnhance) {
      btnEnhance.addEventListener('click', async () => {
        if (!currentVideoFile) {
          alert('Pilih file video terlebih dahulu.');
          return;
        }

        const activePreset = document.querySelector('.lumina-video-preset-card.active')?.getAttribute('data-preset') || 'ultra_4k';
        const resolution = activePreset === 'ultra_4k' ? '4k' : '1080p';
        const fps = 60;
        const sharpness = activePreset === 'anime' ? 45 : 35;
        const engine = activePreset === 'ultra_4k' ? 'auto' : 'ffmpeg';

        btnEnhance.disabled = true;
        btnEnhance.innerHTML = '<span>⏳</span> Mengunggah Video...';

        const progressSection = document.getElementById('lumina-video-progress-section');
        const progressBar = document.getElementById('lumina-video-progress-bar');
        const progressText = document.getElementById('lumina-video-progress-text');
        const resultSection = document.getElementById('lumina-video-result-section');

        if (progressSection) progressSection.style.display = 'block';
        if (resultSection) resultSection.style.display = 'none';
        if (progressBar) progressBar.style.width = '10%';
        if (progressText) progressText.textContent = 'Mengunggah video ke server...';

        try {
          // 1. Upload video
          const formData = new FormData();
          formData.append('video', currentVideoFile);

          const uploadRes = await fetch('/api/lumina/video/upload', {
            method: 'POST',
            body: formData
          });
          const uploadData = await uploadRes.json();

          if (!uploadData.success || !uploadData.file) {
            throw new Error(uploadData.error || 'Gagal mengunggah video.');
          }

          if (progressBar) progressBar.style.width = '25%';
          if (progressText) progressText.textContent = 'Memulai proses Restorasi AI Ultra HD...';

          // 2. Trigger enhance
          const enhanceRes = await fetch('/api/lumina/video/enhance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              videoPath: uploadData.file.path,
              filename: uploadData.file.filename,
              engine,
              resolution,
              fps,
              sharpness
            })
          });
          const enhanceData = await enhanceRes.json();

          if (!enhanceData.success || !enhanceData.taskId) {
            throw new Error(enhanceData.error || 'Gagal memulai enhancement task.');
          }

          activeTaskId = enhanceData.taskId;

          // 3. Poll status
          pollVideoStatus(activeTaskId);
        } catch (err) {
          console.error('[VideoHdStudio] Enhance error:', err);
          alert(`Gagal memproses video: ${err.message}`);
          btnEnhance.disabled = false;
          btnEnhance.innerHTML = '<span>✨</span> Tingkatkan Resolusi Video ke Ultra HD';
          if (progressSection) progressSection.style.display = 'none';
        }
      });
    }

    function pollVideoStatus(taskId) {
      if (pollInterval) clearInterval(pollInterval);

      const progressBar = document.getElementById('lumina-video-progress-bar');
      const progressText = document.getElementById('lumina-video-progress-text');
      const progressSection = document.getElementById('lumina-video-progress-section');
      const resultSection = document.getElementById('lumina-video-result-section');
      const videoResultPlayer = document.getElementById('lumina-video-player-after');
      const btnDownloadResult = document.getElementById('btn-lumina-download-video');
      const btnEnhance = document.getElementById('btn-lumina-enhance-video');

      pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/lumina/video/status/${taskId}`);
          const data = await res.json();

          if (data.status === 'processing') {
            const pct = Math.max(10, data.progress || 10);
            if (progressBar) progressBar.style.width = `${pct}%`;
            if (progressText) progressText.textContent = data.message || `Memproses... ${pct}%`;
          } else if (data.status === 'completed') {
            clearInterval(pollInterval);
            if (progressBar) progressBar.style.width = '100%';
            if (progressText) progressText.textContent = 'Peningkatan Video Selesai!';

            setTimeout(() => {
              if (progressSection) progressSection.style.display = 'none';
              if (resultSection) resultSection.style.display = 'block';
              if (videoResultPlayer) {
                videoResultPlayer.src = data.resultUrl;
                videoResultPlayer.load();
              }
              if (btnDownloadResult) {
                btnDownloadResult.href = data.resultUrl;
                btnDownloadResult.setAttribute('download', data.filename || 'lumina_video_hd.mp4');
              }
              if (btnEnhance) {
                btnEnhance.disabled = false;
                btnEnhance.innerHTML = '<span>✨</span> Tingkatkan Video Lainnya';
              }
            }, 800);
          } else if (data.status === 'failed') {
            clearInterval(pollInterval);
            alert(`Proses video gagal: ${data.message}`);
            if (progressSection) progressSection.style.display = 'none';
            if (btnEnhance) {
              btnEnhance.disabled = false;
              btnEnhance.innerHTML = '<span>✨</span> Coba Lagi';
            }
          }
        } catch (pollErr) {
          console.warn('[VideoHdStudio] Poll error:', pollErr);
        }
      }, 1500);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVideoHdStudio);
  } else {
    initVideoHdStudio();
  }
})();
