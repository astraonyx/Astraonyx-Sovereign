// lib/tiktokScraper.js — Download TikTok (video + slide foto).
// Amati-tiru-modifikasi dari coflyn/Mori (public/js/scrapers/tiktok.js),
// diporting dari environment browser/Capacitor ke Node.js:
//   - window.crypto.subtle -> node:crypto (AES-256-CBC)
//   - CapacitorHttp/fetch browser -> fetch bawaan Node
// Dua sumber, dicoba berurutan:
//   1. snaptik.app  — butuh solve "challenge" matematis sederhana yang
//      di-derive dari token terenkripsi AES (BUKAN captcha, murni operasi
//      angka: xor/shift/reduce, tidak ada eksekusi kode remote sama sekali).
//   2. tiktokio.com — fallback lebih simpel, parsing HTML biasa.

const crypto = require('crypto');

const CHROME_UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36';

function isTikTokUrl(url) {
  const re = /https:\/\/(?:m|www|vm|vt|lite)?\.?tiktok\.com\//i;
  return re.test(url);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ---- Porting decryptSnapTikAes: Web Crypto API (SHA-256 + AES-CBC) -> node:crypto ----
function decryptSnapTikAes(id, encryptedBase64) {
  const salt = 'sn4pt1k_v3r1fy2026';
  const str = `${salt}:${id}`;
  const keyBytes = crypto.createHash('sha256').update(str, 'utf8').digest(); // 32 byte key

  const bytes = Buffer.from(encryptedBase64, 'base64');
  const iv = bytes.subarray(0, 16);
  const data = bytes.subarray(16);

  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBytes, iv);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

// Porting solveSnapTikChallenge: murni operasi matematika/string, identik
// dengan versi Mori aslinya, tidak ada perubahan logic.
function solveSnapTikChallenge(challenge) {
  switch (challenge.t) {
    case 'b':
      return ((challenge.a ^ challenge.b) >> challenge.s) & 255;
    case 'r':
      return challenge.n.reduce((m, f) => m + f, 0) * 2 + 1;
    case 'c':
      return challenge.w.charCodeAt(challenge.i) * challenge.m;
    case 'm':
      return ((challenge.a + challenge.b) % 100) * challenge.c;
    case 'n':
      return challenge.a * challenge.b + challenge.b * challenge.c + challenge.c * challenge.a - challenge.a;
    default:
      throw new Error('Unknown challenge type: ' + challenge.t);
  }
}

async function scrapeViaSnapTik(cleanUrl, timeoutMs) {
  const tokenRes = await fetchWithTimeout('https://snaptik.app/api/token', {
    method: 'POST',
    headers: {
      'User-Agent': CHROME_UA,
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/json',
      Origin: 'https://snaptik.app',
      Referer: 'https://snaptik.app/',
    },
    body: '{}',
  }, timeoutMs);
  const tData = await tokenRes.json();
  if (!tData || !tData.id || !tData.p) throw new Error('Gagal mengambil token dari SnapTik.');

  const decryptedStr = decryptSnapTikAes(tData.id, tData.p);
  const challenge = JSON.parse(decryptedStr);
  const _e = challenge._e;
  const _h = challenge._h;
  delete challenge._e;
  delete challenge._h;
  const challengeResult = solveSnapTikChallenge(challenge);
  const xVerify = `${tData.id}:${challengeResult}:${_e}:${_h}`;

  const extractRes = await fetchWithTimeout(`https://snaptik.app/api/extract?url=${encodeURIComponent(cleanUrl)}`, {
    headers: {
      'User-Agent': CHROME_UA,
      'X-Requested-With': 'XMLHttpRequest',
      'X-Verify': xVerify,
      Origin: 'https://snaptik.app',
      Referer: 'https://snaptik.app/',
    },
  }, timeoutMs);
  const exData = await extractRes.json();
  if (!exData || !exData.success || !exData.data) {
    throw new Error(exData?.message || 'Ekstraksi SnapTik gagal.');
  }

  const info = exData.data;
  const downloads = [];
  const photos = info.photoUrls || info.photos || info.images || info.slides;
  if (photos && Array.isArray(photos) && photos.length > 0) {
    photos.forEach((img) => {
      const photoUrl = typeof img === 'string' ? img : (img?.url || img?.src || img?.link || img?.downloadUrl || '');
      if (photoUrl) downloads.push({ type: 'PHOTO', url: photoUrl });
    });
  }
  if (info.downloadUrl) downloads.push({ type: 'MP4', url: info.downloadUrl });
  // Hanya masukkan hdDownloadUrl jika link media valid dan bukan endpoint verifikasi internal snaptik
  if (info.hdDownloadUrl && !info.hdDownloadUrl.includes('/api/hd')) {
    const hdUrl = info.hdDownloadUrl.startsWith('http') ? info.hdDownloadUrl : 'https://snaptik.app' + info.hdDownloadUrl;
    downloads.push({ type: 'MP4 (HD)', url: hdUrl });
  }
  if (!downloads.length) throw new Error('Tidak ada link download dari SnapTik.');

  return {
    success: true,
    title: info.title || 'TikTok Video',
    author: info.author?.nickname || info.author?.name || 'TikTok User',
    thumbnail: info.thumbnail || '',
    downloads,
  };
}

async function scrapeViaTikTokIo(cleanUrl, timeoutMs) {
  const res = await fetchWithTimeout('https://tiktokio.com/api/v1/tk/html', {
    method: 'POST',
    headers: {
      'User-Agent': CHROME_UA,
      'Content-Type': 'application/json',
      Origin: 'https://tiktokio.com',
      Referer: 'https://tiktokio.com/',
    },
    body: JSON.stringify({ vid: cleanUrl, prefix: 'tiktokio.com' }),
  }, timeoutMs);

  let html = await res.text();
  if (!html || html.includes('Please paste a valid link') || html.includes('Error')) {
    throw new Error('Link tidak valid atau gagal mengambil data dari tiktokio.');
  }

  let title = 'TikTok Content';
  const titleMatch = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
  if (titleMatch) title = titleMatch[1].replace(/<[^>]+>/g, '').trim();

  let thumbnail = '';
  const thumbMatch = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  if (thumbMatch) thumbnail = thumbMatch[1].replace(/&#38;/g, '&');

  const isSlideshow = html.includes('class="images-grid"') || html.includes('class="image-item"');
  const authorMatch = cleanUrl.match(/@([^/]+)/);
  const author = authorMatch ? authorMatch[1] : 'Unknown';

  const downloads = [];

  if (isSlideshow) {
    const slidesRegex = /<div[^>]*class=["'][^"']*image-item[^"']*["'][^>]*>[\s\S]*?<\/div>/gi;
    let slideMatch;
    while ((slideMatch = slidesRegex.exec(html)) !== null) {
      const slideHtml = slideMatch[0];
      const aHref = slideHtml.match(/href=["']([^"']+)/i);
      const imgSrc = slideHtml.match(/src=["']([^"']+)/i);
      const found = (aHref && aHref[1] !== '#') ? aHref[1] : (imgSrc ? imgSrc[1] : null);
      if (found) {
        const photoUrl = found.replace(/&#38;/g, '&');
        if (!downloads.some((d) => d.url === photoUrl)) downloads.push({ type: 'PHOTO', url: photoUrl });
      }
    }
    const mp3TagRegex = /<a[\s\S]*?<\/a>/gi;
    let mp3Match;
    while ((mp3Match = mp3TagRegex.exec(html)) !== null) {
      const tag = mp3Match[0];
      if (tag.includes('download-btn-purple') || tag.toLowerCase().includes('mp3') || tag.toLowerCase().includes('music')) {
        const h = tag.match(/href=["']([^"']+)/i);
        if (h && h[1] !== '#') {
          const audioUrl = h[1].replace(/&#38;/g, '&');
          if (!downloads.some((d) => d.url === audioUrl)) downloads.push({ type: 'MP3', url: audioUrl });
        }
      }
    }
  } else {
    const anchorTagRegex = /<a[\s\S]*?<\/a>/gi;
    let anchorMatch;
    while ((anchorMatch = anchorTagRegex.exec(html)) !== null) {
      const tag = anchorMatch[0];
      if (!tag.includes('download-btn')) continue;
      const hrefM = tag.match(/href=["']([^"']+)/i);
      if (!hrefM || hrefM[1] === '#') continue;
      const href = hrefM[1].replace(/&#38;/g, '&');
      const innerText = tag.replace(/<[^>]+>/g, '').trim().toLowerCase();
      let label = null;
      if (innerText.includes('without watermark') || tag.includes('download-btn-blue') || tag.includes('download-btn-green')) {
        label = 'VIDEO';
      } else if (innerText.includes('mp3') || innerText.includes('music') || tag.includes('download-btn-purple')) {
        label = 'MP3';
      }
      if (label) downloads.push({ type: label, url: href });
    }
  }

  if (downloads.length === 0) throw new Error('Tidak ada link download ditemukan.');

  return { success: true, title, author, thumbnail, downloads };
}

async function scrapeViaTikWm(cleanUrl, timeoutMs = 15000) {
  const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(cleanUrl)}&hd=1`;
  const res = await fetchWithTimeout(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      'Accept': 'application/json',
    },
  }, timeoutMs);

  const json = await res.json();
  if (!json || json.code !== 0 || !json.data) {
    throw new Error(json?.msg || 'Ekstraksi TikWM gagal.');
  }

  const d = json.data;
  const downloads = [];

  // Slideshow foto
  if (Array.isArray(d.images) && d.images.length > 0) {
    d.images.forEach((imgUrl) => {
      downloads.push({ type: 'PHOTO', url: imgUrl });
    });
  }

  // Video HD (1080p) & Standard (720p)
  if (d.hdplay) {
    downloads.push({ type: 'MP4 (HD)', url: d.hdplay });
  }
  if (d.play) {
    downloads.push({ type: 'MP4', url: d.play });
  }
  if (d.music) {
    downloads.push({ type: 'MP3', url: d.music });
  }

  if (!downloads.length) throw new Error('Tidak ada link media ditemukan dari TikWM.');

  return {
    success: true,
    title: d.title || 'TikTok Video',
    author: d.author?.nickname || d.author?.unique_id || 'TikTok User',
    thumbnail: d.cover || '',
    duration: d.duration ? `${d.duration}s` : null,
    downloads,
  };
}

async function scrapeTikTok(url, timeoutMs = 20000) {
  const cleanUrl = url.split('?')[0];
  if (!isTikTokUrl(cleanUrl)) {
    return { success: false, error: 'Bukan link TikTok yang valid.' };
  }

  try {
    return await scrapeViaTikWm(cleanUrl, timeoutMs);
  } catch (wmErr) {
    try {
      return await scrapeViaSnapTik(cleanUrl, timeoutMs);
    } catch (snapErr) {
      try {
        return await scrapeViaTikTokIo(cleanUrl, timeoutMs);
      } catch (ioErr) {
        return { success: false, error: `Gagal mengekstrak TikTok. TikWM: ${wmErr.message} | SnapTik: ${snapErr.message} | TikTokIO: ${ioErr.message}` };
      }
    }
  }
}

module.exports = {
  isTikTokUrl,
  scrapeTikTok,
  scrapeViaTikWm,
  scrapeViaSnapTik,
  scrapeViaTikTokIo,
};
