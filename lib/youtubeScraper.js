// lib/youtubeScraper.js — Download YouTube (mp4 + mp3).
// Amati-tiru-modifikasi dari coflyn/Mori (public/js/scrapers/youtube.js).
// Metadata (judul, thumbnail) diambil dari endpoint oEmbed RESMI YouTube
// sendiri (youtube.com/oembed) — bukan scraping pihak ketiga.
// Konversi ke mp4/mp3 lewat 2 sumber (dicoba berurutan):
//   1. ytmp3.mobi (via a.ymcdn.org) — dipakai sebagai default, alurnya
//      lebih sederhana (init sekali, lalu convert+poll per format).
//   2. ytmp3.gg (via hub.convert1s.com) — fallback, poll job status.
// Keduanya murni HTTP request + polling status berkala, tidak ada
// eval/vm sama sekali.

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';

function extractVideoId(url) {
  const match = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i);
  return match ? match[1] : null;
}

function isYouTubeUrl(url) {
  return Boolean(extractVideoId(url));
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

async function getMeta(videoId, timeoutMs) {
  let title = 'YouTube Video';
  let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  try {
    const res = await fetchWithTimeout(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {}, timeoutMs);
    if (res.ok) {
      const data = await res.json();
      title = data.title || title;
      thumbnail = data.thumbnail_url || thumbnail;
    }
  } catch { /* metadata opsional, lanjut dengan default kalau gagal */ }
  return { title, thumbnail };
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---- Sumber utama: ytmp3.mobi ----
async function scrapeViaYtmp3Mobi(url, videoId, timeoutMs) {
  const headers = { Origin: 'https://ytmp3.mobi', Referer: 'https://ytmp3.mobi/', 'User-Agent': CHROME_UA };

  const initRes = await fetchWithTimeout('https://a.ymcdn.org/api/v1/init?p=y&23=1llum1n471', { headers }, timeoutMs);
  const initData = await initRes.json();
  if (!initData || initData.error) throw new Error('Gagal inisialisasi ytmp3.mobi.');

  const fetchSingle = async (format) => {
    const convRes = await fetchWithTimeout(`${initData.convertURL}&v=${videoId}&f=${format}`, { headers }, timeoutMs);
    const convData = await convRes.json();
    if (!convData || convData.error) return null;

    let progress = 0;
    let dlUrl = convData.downloadURL;
    const progUrl = convData.progressURL;
    let attempts = 0;

    while (progress < 3 && attempts < 15) {
      await sleep(2000);
      const progRes = await fetchWithTimeout(progUrl, { headers }, timeoutMs);
      const progData = await progRes.json();
      if (!progData || progData.error) break;
      progress = progData.progress;
      if (progData.downloadURL) dlUrl = progData.downloadURL;
      if (progress === 4) break;
      attempts++;
    }

    if (dlUrl && dlUrl.startsWith('//')) dlUrl = 'https:' + dlUrl;
    if (dlUrl && dlUrl.startsWith('/')) dlUrl = 'https://ytmp3.mobi' + dlUrl;
    return dlUrl;
  };

  const [mp4Url, mp3Url] = await Promise.all([fetchSingle('mp4'), fetchSingle('mp3')]);
  const downloads = [];
  if (mp4Url) downloads.push({ type: 'MP4', url: mp4Url });
  if (mp3Url) downloads.push({ type: 'MP3', url: mp3Url });
  if (!downloads.length) throw new Error('Gagal mendapatkan link download dari ytmp3.mobi.');

  return downloads;
}

// ---- Fallback: ytmp3.gg ----
async function scrapeViaYtmp3Gg(url, timeoutMs) {
  const headers = {
    Origin: 'https://media.ytmp3.gg',
    Referer: 'https://media.ytmp3.gg/',
    'User-Agent': CHROME_UA,
    Accept: 'application/json, text/plain, */*',
  };

  const runConvert = async (format, quality) => {
    try {
      const convRes = await fetchWithTimeout('https://hub.convert1s.com/api/download', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, os: 'macos', output: { type: format === 'mp4' ? 'video' : 'audio', format, quality }, audio: { bitrate: '128k' } }),
      }, timeoutMs);
      const conv = await convRes.json();
      if (!conv || conv.error || !conv.statusUrl) return null;

      let downloadUrl = null;
      let attempts = 0;
      while (!downloadUrl && attempts < 30) {
        await sleep(1500);
        const pollRes = await fetchWithTimeout(conv.statusUrl, { headers }, timeoutMs);
        const pollData = await pollRes.json();
        attempts++;
        if (pollData?.status === 'completed' && pollData.downloadUrl) { downloadUrl = pollData.downloadUrl; break; }
        if (pollData?.status === 'error' || pollData?.status === 'failed') break;
      }
      return downloadUrl ? { url: downloadUrl, quality: conv.selectedQuality || quality } : null;
    } catch {
      return null;
    }
  };

  const downloads = [];
  for (const q of ['720p', '360p']) {
    const r = await runConvert('mp4', q);
    if (r?.url) { downloads.push({ type: `MP4 ${r.quality || q}`, url: r.url }); break; }
    await sleep(300);
  }
  const mp3 = await runConvert('mp3', '');
  if (mp3?.url) downloads.push({ type: 'MP3', url: mp3.url });

  if (downloads.length === 0) throw new Error('Gagal mendapatkan link download dari ytmp3.gg.');
  return downloads;
}

async function scrapeYouTube(url, timeoutMs = 60000) {
  const videoId = extractVideoId(url);
  if (!videoId) return { success: false, error: 'Link YouTube tidak valid.' };

  const meta = await getMeta(videoId, 10000);

  try {
    const downloads = await scrapeViaYtmp3Mobi(url, videoId, timeoutMs);
    return { success: true, ...meta, downloads };
  } catch (mobiErr) {
    try {
      const downloads = await scrapeViaYtmp3Gg(url, timeoutMs);
      return { success: true, ...meta, downloads };
    } catch (ggErr) {
      return { success: false, error: `Gagal dari kedua sumber. ytmp3.mobi: ${mobiErr.message} | ytmp3.gg: ${ggErr.message}` };
    }
  }
}

module.exports = {
  isYouTubeUrl,
  scrapeYouTube,
  scrapeViaYtmp3Mobi,
  scrapeViaYtmp3Gg,
};
