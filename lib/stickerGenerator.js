// lib/stickerGenerator.js — Convert gambar/video jadi WebP sticker.
// Gambar: jimp (pure JS, tanpa native binding) untuk resize/crop/composite,
// lalu ffmpeg untuk convert PNG -> webp (jimp sendiri tidak bisa tulis webp).
// Video: full ffmpeg lewat child_process (sama seperti sebelumnya).
// Migrasi dari sharp -> jimp: sharp gagal install permanen di Termux
// (android-arm, native binding libvips bermasalah), lihat PROGRESS.md.

const { Jimp } = require('jimp');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const config = require('../config');

const execAsync = promisify(exec);
const MAX_VIDEO_DURATION_SEC = 10;

function detectIsVideo(buffer) {
  const hex = buffer.toString('hex', 0, 16);
  return (
    hex.includes('66747970') || // MP4/MOV ('ftyp' box, biasanya muncul di byte 4-8, bukan byte 0)
    hex.startsWith('1a45dfa3') || // WEBM/MKV (EBML header ada di byte 0)
    (hex.startsWith('52494646') && buffer.toString('hex', 8, 12) === '57415649') // AVI (RIFF....AVI )
  );
}

async function imageToSticker(buffer, type) {
  const size = 512;
  const image = await Jimp.read(buffer);
  const tempDir = path.join(config.paths.tmpMedia, 'sticker');
  fs.mkdirSync(tempDir, { recursive: true });
  const tempPng = path.join(tempDir, `img_${Date.now()}.png`);
  const tempOutput = path.join(tempDir, `img_${Date.now()}.webp`);

  try {
    if (type === 'circle' || type === 'rounded') {
      // cover-crop ke persegi lalu mask lingkaran manual pixel-by-pixel
      image.cover({ w: size, h: size });
      const cx = size / 2;
      const cy = size / 2;
      const r = size / 2;
      image.scan(0, 0, size, size, function (x, y, idx) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy > r * r) {
          this.bitmap.data[idx + 3] = 0; // alpha = 0 di luar lingkaran
        }
      });
    } else if (type === 'full') {
      // contain: fit dalam 512x512 tanpa crop, sisa transparan
      image.contain({ w: size, h: size });
    } else {
      image.cover({ w: size, h: size });
    }

    await image.write(tempPng);

    const cmd = `ffmpeg -y -i "${tempPng}" -vcodec libwebp -lossless 0 -q:v 80 -preset default -an -vsync 0 "${tempOutput}"`;
    await execAsync(cmd);

    return fs.readFileSync(tempOutput);
  } finally {
    if (fs.existsSync(tempPng)) fs.unlink(tempPng, () => {});
    if (fs.existsSync(tempOutput)) fs.unlink(tempOutput, () => {});
  }
}

async function videoToSticker(buffer, type) {
  const tempDir = path.join(config.paths.tmpMedia, 'sticker');
  fs.mkdirSync(tempDir, { recursive: true });

  const tempInput = path.join(tempDir, `input_${Date.now()}.mp4`);
  const tempOutput = path.join(tempDir, `output_${Date.now()}.webp`);

  try {
    fs.writeFileSync(tempInput, buffer);

    const durationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempInput}"`;
    const { stdout } = await execAsync(durationCmd);
    const duration = parseFloat(stdout.trim());

    if (duration > MAX_VIDEO_DURATION_SEC) {
      throw new Error(`Video terlalu panjang (${duration.toFixed(1)}s). Maksimal ${MAX_VIDEO_DURATION_SEC} detik.`);
    }

    let crop;
    if (type === 'circle' || type === 'rounded') {
      crop = `-vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,format=rgba,geq=lum='p(X,Y)':a='if(gt(abs(W/2-X),W/2)||gt(abs(H/2-Y),H/2),0,255)'"`;
    } else if (type === 'full') {
      crop = `-vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000"`;
    } else {
      crop = `-vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512"`;
    }

    const cmd = `ffmpeg -i "${tempInput}" -t ${MAX_VIDEO_DURATION_SEC} ${crop} -vcodec libwebp -lossless 0 -q:v 60 -loop 0 -preset default -an -vsync 0 -fs 1M "${tempOutput}"`;
    await execAsync(cmd);

    return fs.readFileSync(tempOutput);
  } finally {
    // Cleanup best-effort, tidak perlu await/throw kalau gagal hapus
    if (fs.existsSync(tempInput)) fs.unlink(tempInput, () => {});
    if (fs.existsSync(tempOutput)) fs.unlink(tempOutput, () => {});
  }
}

// type: 'default' | 'full' | 'circle' | 'rounded'
async function createSticker(buffer, type = 'default') {
  const isVideo = detectIsVideo(buffer);
  if (isVideo) {
    return videoToSticker(buffer, type);
  }
  return imageToSticker(buffer, type);
}

module.exports = { createSticker, detectIsVideo };
