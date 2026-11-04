// server/videoHdService.js — Lumina Video HD AI Enhancer & Remaster Studio
// Integrates Wink AI Ultra HD Cloud + High-Performance Local FFmpeg Remastering Engine

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

let ffmpegPath = null;
try {
  ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
} catch (e) {
  console.warn('[videoHdService] @ffmpeg-installer/ffmpeg path warning:', e.message);
}

const winkEnhance = require('../scrape/furina/hdvideo');

const VIDEO_HD_DIR = path.resolve(__dirname, '../public/artifacts/video_hd');
try {
  fs.mkdirSync(VIDEO_HD_DIR, { recursive: true });
} catch (_) {}

// In-memory tasks tracker
const activeTasks = new Map();

/**
 * Run local FFmpeg Remastering with Lanczos upscale, unsharp sharpness, 60fps & vibrance
 */
function enhanceVideoLocalFFmpeg(inputPath, outputPath, options = {}, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      return reject(new Error('FFmpeg binary tidak ditemukan di server.'));
    }

    const resolution = options.resolution || '1080p'; // '720p', '1080p', '4k'
    const targetFps = options.fps || 60;
    const sharpness = options.sharpness || 35; // 0 - 100

    let scaleFilter = 'scale=1920:1080:flags=lanczos:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2';
    if (resolution === '4k') {
      scaleFilter = 'scale=3840:2160:flags=lanczos:force_original_aspect_ratio=decrease,pad=3840:2160:(ow-iw)/2:(oh-ih)/2';
    } else if (resolution === '720p') {
      scaleFilter = 'scale=1280:720:flags=lanczos:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2';
    }

    // Dynamic unsharp based on sharpness percentage
    const unsharpStrength = ((sharpness / 100) * 1.5).toFixed(2);
    const filterComplex = `${scaleFilter},unsharp=5:5:${unsharpStrength}:5:5:0.0,eq=contrast=1.08:saturation=1.12,fps=${targetFps}`;

    const args = [
      '-y',
      '-i', inputPath,
      '-vf', filterComplex,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '19',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart',
      outputPath
    ];

    console.log('[videoHdService] Spawning FFmpeg with args:', args.join(' '));
    const proc = spawn(ffmpegPath, args);

    let durationSec = 0;

    proc.stderr.on('data', (data) => {
      const line = data.toString();
      // Match duration
      const durMatch = line.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      if (durMatch) {
        const h = parseInt(durMatch[1], 10);
        const m = parseInt(durMatch[2], 10);
        const s = parseFloat(durMatch[3]);
        durationSec = h * 3600 + m * 60 + s;
      }

      // Match time
      const timeMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      if (timeMatch && durationSec > 0) {
        const h = parseInt(timeMatch[1], 10);
        const m = parseInt(timeMatch[2], 10);
        const s = parseFloat(timeMatch[3]);
        const curSec = h * 3600 + m * 60 + s;
        const percent = Math.min(99, Math.round((curSec / durationSec) * 100));
        onProgress(percent, `Memproses frame FFmpeg... ${percent}%`);
      }
    });

    proc.on('close', (code) => {
      if (code === 0) {
        onProgress(100, 'Remaster Video Selesai!');
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg exited with error code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Main video enhance entrypoint
 */
async function enhanceVideo(inputFilePath, options = {}) {
  const taskId = crypto.randomUUID();
  const engine = options.engine || 'auto'; // 'wink', 'ffmpeg', 'auto'
  const filename = path.basename(inputFilePath);
  const outFilename = `lumina_hd_${Date.now()}_${path.parse(filename).name}.mp4`;
  const outPath = path.join(VIDEO_HD_DIR, outFilename);

  const taskData = {
    taskId,
    status: 'processing',
    progress: 5,
    message: 'Menginisialisasi engine video HD...',
    engineUsed: '',
    resultUrl: null,
    filename: outFilename,
    createdAt: new Date().toISOString()
  };
  activeTasks.set(taskId, taskData);

  // Background execution
  (async () => {
    try {
      if (engine === 'wink' || (engine === 'auto' && !options.localOnly)) {
        taskData.engineUsed = 'Wink AI Ultra HD (Cloud Neural)';
        taskData.progress = 15;
        taskData.message = 'Mengunggah video ke Wink AI Cloud Enhancer...';

        try {
          const res = await winkEnhance(inputFilePath, { filename });
          if (res?.resultUrl) {
            taskData.progress = 100;
            taskData.status = 'completed';
            taskData.message = 'Peningkatan Video Wink AI Berhasil!';
            taskData.resultUrl = res.resultUrl;
            return;
          }
        } catch (winkErr) {
          console.warn('[videoHdService] Wink AI fallback to FFmpeg:', winkErr.message);
          taskData.message = 'Wink AI cloud sibuk, beralih ke Local 4K 60FPS Remaster...';
        }
      }

      // Fallback / FFmpeg engine
      taskData.engineUsed = 'Local FFmpeg 4K 60FPS Remaster';
      taskData.progress = 20;
      taskData.message = 'Memulai rendering lanczos upscale & 60fps...';

      await enhanceVideoLocalFFmpeg(inputFilePath, outPath, options, (pct, msg) => {
        taskData.progress = Math.max(taskData.progress, pct);
        taskData.message = msg;
      });

      taskData.status = 'completed';
      taskData.progress = 100;
      taskData.message = 'Peningkatan Video HD Selesai!';
      taskData.resultUrl = `/artifacts/video_hd/${outFilename}`;
    } catch (err) {
      console.error('[videoHdService] Error:', err);
      taskData.status = 'failed';
      taskData.progress = 0;
      taskData.message = `Gagal memproses video: ${err.message}`;
    }
  })();

  return { taskId, status: 'processing', engineUsed: engine };
}

function getTaskStatus(taskId) {
  return activeTasks.get(taskId) || { status: 'not_found' };
}

module.exports = {
  enhanceVideo,
  getTaskStatus,
  VIDEO_HD_DIR
};
