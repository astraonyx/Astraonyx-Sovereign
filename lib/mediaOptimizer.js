// lib/mediaOptimizer.js — Video & Media Optimizer for WhatsApp Status & Sharing
// Menjamin video 100% kompatibel dengan WhatsApp Status (H.264 + AAC + yuv420p + faststart)
// Mencegah error "merah-merah" / "gagal memuat video" pada nomor pengirim / penerima.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const config = require('../config');

// Ambil binary ffmpeg dari @ffmpeg-installer jika ada, atau fallback ke sistem PATH
let ffmpegPath = null;
try {
  const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
  if (ffmpegInstaller && ffmpegInstaller.path && fs.existsSync(ffmpegInstaller.path)) {
    ffmpegPath = ffmpegInstaller.path;
  }
} catch (_) {}

if (!ffmpegPath) {
  try {
    const test = spawnSync('ffmpeg', ['-version']);
    if (test.status === 0) {
      ffmpegPath = 'ffmpeg';
    }
  } catch (_) {}
}

/**
 * Cek apakah ffmpeg siap digunakan
 */
function isFfmpegAvailable() {
  return Boolean(ffmpegPath);
}

/**
 * Ambil durasi dan resolusi video menggunakan ffmpeg/ffprobe
 * @param {string} inputPath
 * @returns {{ duration: number, width: number, height: number, hasAudio: boolean }}
 */
function probeVideo(inputPath) {
  if (!ffmpegPath || !fs.existsSync(inputPath)) {
    return { duration: 0, width: 0, height: 0, hasAudio: false };
  }

  try {
    const res = spawnSync(ffmpegPath, ['-i', inputPath], { encoding: 'utf8' });
    const output = (res.stderr || '') + (res.stdout || '');

    // Cari durasi: Duration: 00:00:15.20
    let duration = 0;
    const durMatch = output.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
    if (durMatch) {
      const hours = parseFloat(durMatch[1]) || 0;
      const mins = parseFloat(durMatch[2]) || 0;
      const secs = parseFloat(durMatch[3]) || 0;
      duration = Math.round(hours * 3600 + mins * 60 + secs);
    }

    // Cari resolusi: 1920x1080
    let width = 0;
    let height = 0;
    const resMatch = output.match(/,\s*(\d{2,5})x(\d{2,5})/);
    if (resMatch) {
      width = parseInt(resMatch[1], 10) || 0;
      height = parseInt(resMatch[2], 10) || 0;
    }

    // Deteksi keberadaan audio stream
    const hasAudio = /Stream\s*#\d+:\d+.*Audio:/.test(output);

    return { duration, width, height, hasAudio };
  } catch (err) {
    console.warn('[mediaOptimizer] Gagal probe video:', err.message);
    return { duration: 0, width: 0, height: 0, hasAudio: false };
  }
}

/**
 * Meng-generate thumbnail JPEG dari video (frame di detik ke-1)
 * WhatsApp Status SANGAT membutuhkan jpegThumbnail agar preview video tampil di HP
 * @param {string} videoPath
 * @returns {Buffer|null}
 */
function generateVideoThumbnail(videoPath) {
  if (!ffmpegPath || !fs.existsSync(videoPath)) return null;

  const tempThumb = path.join(config.paths.tmp || './tmp', `thumb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`);

  try {
    // Ambil frame pada detik 00:00:01 (atau 0 jika sangat pendek), resize lebar max 320px aspect ratio dijaga
    spawnSync(ffmpegPath, [
      '-y',
      '-ss', '00:00:01',
      '-i', videoPath,
      '-vframes', '1',
      '-vf', "scale='min(320,iw)':-2",
      '-q:v', '5',
      tempThumb,
    ], { timeout: 15000 });

    if (fs.existsSync(tempThumb) && fs.statSync(tempThumb).size > 0) {
      const buf = fs.readFileSync(tempThumb);
      try { fs.unlinkSync(tempThumb); } catch (_) {}
      return buf;
    }

    // Fallback: coba di detik ke-0 jika video < 1 detik
    spawnSync(ffmpegPath, [
      '-y',
      '-ss', '00:00:00',
      '-i', videoPath,
      '-vframes', '1',
      '-vf', "scale='min(320,iw)':-2",
      '-q:v', '5',
      tempThumb,
    ], { timeout: 15000 });

    if (fs.existsSync(tempThumb) && fs.statSync(tempThumb).size > 0) {
      const buf = fs.readFileSync(tempThumb);
      try { fs.unlinkSync(tempThumb); } catch (_) {}
      return buf;
    }
  } catch (err) {
    console.warn('[mediaOptimizer] Gagal generate thumbnail:', err.message);
  } finally {
    try { if (fs.existsSync(tempThumb)) fs.unlinkSync(tempThumb); } catch (_) {}
  }

  return null;
}

/**
 * Mengoptimalkan video khusus untuk WhatsApp Status & Chat:
 * 1. Transcode ke H.264 (AVC) profile baseline/main yang kompatibel di semua ponsel Android/iOS.
 * 2. Audio ke AAC-LC 128kbps stereo 44.1kHz.
 * 3. Format pixel yuv420p (WA mobile menolak yuv444p / 10-bit HDR dengan tanda merah).
 * 4. Tambahkan flag `-movflags +faststart` agar header atom 'moov' dipindah ke depan file sehingga WA dapat streaming instan.
 * 5. Potong durasi max 30 detik (standar mutlak WhatsApp Status).
 * 6. Downscale jika resolusi di atas 1080p agar tidak melebihi batas bitrate WhatsApp.
 */
async function optimizeVideoForWhatsApp(inputPath, options = {}) {
  const maxDuration = options.maxDuration || 30;
  if (!fs.existsSync(inputPath)) {
    throw new Error(`File video tidak ditemukan: ${inputPath}`);
  }

  const probe = probeVideo(inputPath);
  const origStats = fs.statSync(inputPath);

  // Jika ffmpeg tidak ada, kembalikan buffer asli dengan peringatan
  if (!ffmpegPath) {
    console.warn('[mediaOptimizer] ⚠️ FFmpeg tidak terdeteksi. Menggunakan video asli tanpa transcode.');
    const buf = fs.readFileSync(inputPath);
    return {
      success: true,
      outputPath: inputPath,
      videoBuffer: buf,
      jpegThumbnail: null,
      seconds: probe.duration || 10,
      width: probe.width || 720,
      height: probe.height || 1280,
      size: origStats.size,
      isOriginal: true,
    };
  }

  const outputDir = path.resolve(config.paths.tmpMedia || './tmp/media');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const optimizedPath = path.join(outputDir, `wa_opt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.mp4`);

  console.log(`[mediaOptimizer] 🎬 Memulai optimasi video untuk WhatsApp Status: ${path.basename(inputPath)} (Durasi: ${probe.duration}s)...`);

  try {
    const args = [
      '-y',
      '-i', inputPath,
      // Potong ke max 30 detik jika lebih
      '-t', String(maxDuration),
      // Video Codec H.264 kompatibel
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'fast',
      '-crf', '23',
      // Skala resolusi max 1080p, pertahankan rasio aspek dan pastikan genap (-2)
      '-vf', "scale='min(1080,iw)':-2:flags=lanczos,fps=30",
    ];

    if (probe.hasAudio) {
      args.push('-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2');
    } else {
      args.push('-an');
    }

    // Pindahkan moov atom ke depan (faststart) — MUTLAK WAJIB AGAR WA TIDAK MERAH
    args.push('-movflags', '+faststart', optimizedPath);

    const proc = spawnSync(ffmpegPath, args, { timeout: 60000 });

    if (proc.error) {
      throw proc.error;
    }

    if (!fs.existsSync(optimizedPath) || fs.statSync(optimizedPath).size === 0) {
      throw new Error(`FFmpeg gagal menghasilkan output: ${proc.stderr?.toString() || 'Unknown error'}`);
    }

    const optStats = fs.statSync(optimizedPath);
    const videoBuffer = fs.readFileSync(optimizedPath);
    const thumbBuffer = generateVideoThumbnail(optimizedPath);
    const optProbe = probeVideo(optimizedPath);

    console.log(`[mediaOptimizer] ✨ Sukses optimasi video! Ukuran: ${(optStats.size / (1024 * 1024)).toFixed(2)} MB, Durasi: ${optProbe.duration || probe.duration}s, Thumbnail: ${thumbBuffer ? '✅' : '❌'}`);

    return {
      success: true,
      outputPath: optimizedPath,
      videoBuffer,
      jpegThumbnail: thumbBuffer,
      seconds: optProbe.duration || probe.duration || Math.min(maxDuration, 15),
      width: optProbe.width || probe.width || 720,
      height: optProbe.height || probe.height || 1280,
      size: optStats.size,
      isOriginal: false,
    };
  } catch (err) {
    console.error('[mediaOptimizer] ❌ Kendala saat transcoding video:', err.message);
    const origBuffer = fs.readFileSync(inputPath);
    const thumbBuffer = generateVideoThumbnail(inputPath);

    return {
      success: true,
      outputPath: inputPath,
      videoBuffer: origBuffer,
      jpegThumbnail: thumbBuffer,
      seconds: probe.duration || 10,
      width: probe.width || 720,
      height: probe.height || 1280,
      size: origStats.size,
      isOriginal: true,
      warning: err.message,
    };
  }
}

/**
 * Mengoptimalkan gambar untuk WhatsApp Status (resize & thumbnail)
 */
async function optimizeImageForWhatsApp(inputPath) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`File gambar tidak ditemukan: ${inputPath}`);
  }

  let imageBuffer = fs.readFileSync(inputPath);
  let jpegThumbnail = null;

  try {
    const sharp = require('sharp');
    jpegThumbnail = await sharp(inputPath)
      .resize(160, 160, { fit: 'inside' })
      .jpeg({ quality: 65 })
      .toBuffer()
      .catch(() => null);
  } catch (_) {}

  return { imageBuffer, jpegThumbnail };
}

module.exports = {
  ffmpegPath,
  isFfmpegAvailable,
  probeVideo,
  generateVideoThumbnail,
  optimizeVideoForWhatsApp,
  optimizeImageForWhatsApp,
};
