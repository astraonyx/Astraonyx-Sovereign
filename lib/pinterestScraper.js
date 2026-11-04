// lib/pinterestScraper.js — Download gambar/video dari 1 link Pinterest (pin).
// Amati-tiru-modifikasi dari coflyn/Mori (public/js/scrapers/pinterest.js).
// Alur:
//   1. Kalau link pendek (pin.it), expand dulu ke URL pin sebenarnya lewat
//      tag <link rel="canonical"> di halaman redirect-nya.
//   2. Coba parsing HTML halaman pin langsung (regex cari URL pinimg.com),
//      ini yang paling reliable untuk gambar original & video.
//   3. Kalau itu gagal, fallback ke pindown.io (situs downloader publik).

const cheerio = require('cheerio');

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function isPinterestUrl(url) {
  try {
    const parsed = new URL(url);
    return /(^|\.)pinterest\.(com|[a-z]{2,3})$/i.test(parsed.hostname) || /(^|\.)pin\.it$/i.test(parsed.hostname);
  } catch {
    return false;
  }
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

function isSiteAsset(u) {
  return u.includes('d53b014d86a6b6761bf649a0ed813c2b') || u.includes('/avatars/') || u.includes('/profile/') || u.includes('sprite') || u.includes('placeholder');
}

async function scrapeViaDirectHtml(targetUrl, timeoutMs) {
  const res = await fetchWithTimeout(targetUrl, {
    headers: {
      'User-Agent': CHROME_UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
  }, timeoutMs);

  const html = await res.text();
  let title = 'Pinterest Pin';
  const ogTitleMatch = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/i);
  if (ogTitleMatch) title = ogTitleMatch[1].replace(/ \| Pinterest$/i, '').trim();

  const downloads = [];
  const videoMatches = html.match(/https:\/\/(?:v1\.pinimg\.com|7\.pinimg\.com|v\.pinimg\.com)\/[^"'\s]+\.mp4/gi) || html.match(/https:\/\/[^"'\s]+\.mp4[^\s"']*/gi) || [];

  let rawImageMatches = html.match(/https:\/\/i\.pinimg\.com\/originals\/[a-zA-Z0-9/._-]+\.(?:jpg|jpeg|png|webp)/gi) || [];
  if (rawImageMatches.length === 0) {
    rawImageMatches = html.match(/https:\/\/i\.pinimg\.com\/736x\/[a-zA-Z0-9/._-]+\.(?:jpg|jpeg|png|webp)/gi) || [];
  }

  const uniqueVideos = [...new Set(videoMatches)];
  const uniqueImages = [...new Set(rawImageMatches.filter((u) => !isSiteAsset(u)))];

  uniqueVideos.forEach((vUrl) => downloads.push({ type: 'VIDEO', url: vUrl }));
  uniqueImages.forEach((iUrl) => downloads.push({ type: 'IMAGE', url: iUrl }));

  if (downloads.length === 0) throw new Error('Tidak ada media ditemukan di halaman pin.');

  return { success: true, title, thumbnail: uniqueImages[0] || uniqueVideos[0] || null, downloads };
}

async function scrapeViaPindown(targetUrl, timeoutMs) {
  const r1 = await fetchWithTimeout('https://pindown.io/', { headers: { 'User-Agent': CHROME_UA } }, timeoutMs);
  const cookies = r1.headers.get('set-cookie') || '';
  const html1 = await r1.text();
  const $1 = cheerio.load(html1);

  const tokenInput = $1('input[type="hidden"]').not('[name="lang"]').first();
  const tokenName = tokenInput.attr('name');
  const tokenValue = tokenInput.attr('value');
  if (!tokenName || !tokenValue) throw new Error('Token Pinterest tidak ditemukan.');

  const r2 = await fetchWithTimeout('https://pindown.io/action', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      Cookie: cookies,
      'User-Agent': CHROME_UA,
    },
    body: new URLSearchParams({ url: targetUrl, [tokenName]: tokenValue, lang: 'en' }).toString(),
  }, timeoutMs);

  let r2Data;
  try { r2Data = await r2.json(); } catch { r2Data = { html: await r2.text() }; }

  const $2 = cheerio.load(r2Data.html || '');
  const downloads = [];
  $2('.columns .column').each((_, el) => {
    const title = $2(el).find('.is-size-6').text().trim();
    let dlUrl = $2(el).find('.button').attr('href');
    if (!dlUrl) return;
    if (dlUrl.includes('file=') && dlUrl.includes('http')) {
      const match = dlUrl.match(/file=(https?%3A%2F%2F[^&]+|https?:\/\/[^&]+)/i);
      if (match) dlUrl = decodeURIComponent(match[1]);
    }
    const lowerUrl = dlUrl.toLowerCase();
    let dlType = 'IMAGE';
    if (lowerUrl.includes('.mp4') || lowerUrl.includes('/videos/') || title.toLowerCase().includes('video')) dlType = 'VIDEO';
    downloads.push({ type: dlType, url: dlUrl });
  });

  if (downloads.length === 0) throw new Error('Tidak ada media ditemukan lewat pindown.io.');

  return {
    success: true,
    title: $2('h3').first().text().trim() || 'Pinterest',
    thumbnail: $2('.image img').first().attr('src') || null,
    downloads,
  };
}

async function scrapePinterest(url, timeoutMs = 20000) {
  if (!isPinterestUrl(url)) {
    return { success: false, error: 'Bukan link Pinterest yang valid.' };
  }

  let targetUrl = url;

  // Expand short pin.it link
  if (targetUrl.includes('pin.it')) {
    try {
      const expandRes = await fetchWithTimeout(targetUrl, { headers: { 'User-Agent': CHROME_UA } }, timeoutMs);
      const html = await expandRes.text();
      const canonicalMatch = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i);
      if (canonicalMatch) targetUrl = canonicalMatch[1];
    } catch { /* biarkan pakai URL asli kalau expand gagal */ }
  }

  try {
    return await scrapeViaDirectHtml(targetUrl, timeoutMs);
  } catch (directErr) {
    try {
      return await scrapeViaPindown(targetUrl, timeoutMs);
    } catch (fallbackErr) {
      return { success: false, error: `Gagal dari kedua sumber. Langsung: ${directErr.message} | Pindown: ${fallbackErr.message}` };
    }
  }
}

module.exports = { isPinterestUrl, scrapePinterest };
