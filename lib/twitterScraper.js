// lib/twitterScraper.js — Download video/gambar dari Twitter/X.
// Amati-tiru-modifikasi dari coflyn/Mori (public/js/scrapers/twitter.js),
// diporting dari DOMParser browser ke cheerio. SENGAJA TIDAK memakai
// implementasi V9 Fontaine untuk fitur ini (lihat PROGRESS.md) karena versi
// itu memakai node:vm untuk eksekusi kode JS mentah dari respons server
// pihak ketiga — resiko keamanan nyata. Versi ini murni HTML parsing biasa,
// tidak ada eval/vm sama sekali.
//
// Dua sumber dicoba berurutan:
//   1. tweeload.com — quality label lebih detail & terstruktur (tabel).
//   2. twittervideodownloader.com (TVD) — fallback, perlu CSRF token dari
//      form halaman utama terlebih dulu.

const cheerio = require('cheerio');

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';

function isTwitterUrl(url) {
  try {
    const host = new URL(url).hostname;
    return /(^|\.)(twitter|x|fixupx|fxtwitter|vxtwitter|nitter)\.com$/i.test(host);
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

function getCookiesFromHeaders(headers) {
  const raw = headers.get ? headers.get('set-cookie') : headers['set-cookie'];
  if (!raw) return '';
  return raw.split(',').map((c) => c.trim().split(';')[0]).join('; ');
}

function formatResolutionLabel(rawText, qualityText, url = '') {
  const text = `${rawText || ''} ${qualityText || ''}`;
  const urlMatch = (url || '').match(/\/vid\/(\d+x\d+)\//i);
  if (urlMatch) return urlMatch[1].toLowerCase();
  const match = text.match(/(\d+\s*[xX]\s*\d+|\d+\s*p)/i);
  if (match) return match[1].replace(/\s+/g, '').toLowerCase();
  const clean = text.replace(/download|video|mp4|get|premium|for|\$|\d+\.\d+|:/gi, '').trim();
  return clean || 'MP4';
}

function isPaywallOrInvalid(href, labelText) {
  if (!href || !href.startsWith('http')) return true;
  const lowerHref = href.toLowerCase();
  const lowerLabel = (labelText || '').toLowerCase();
  return (
    lowerHref.includes('checkout') || lowerHref.includes('stripe') || lowerHref.includes('buy') ||
    lowerHref.includes('premium') || lowerLabel.includes('$') || lowerLabel.includes('for $') ||
    lowerLabel.includes('premium') || lowerLabel.includes('paywall')
  );
}

// ---- Sumber utama: tweeload.com ----
async function scrapeViaTweeload(cleanUrl, timeoutMs) {
  const twitterUrl = cleanUrl.replace(/https:\/\/(fixupx|fxtwitter|vxtwitter|nitter|twitter)\.com/g, 'https://x.com');

  await fetchWithTimeout('https://tweeload.com/en', { headers: { 'User-Agent': CHROME_UA } }, timeoutMs);

  const res = await fetchWithTimeout('https://tweeload.com/en/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': CHROME_UA },
    body: new URLSearchParams({ url: twitterUrl }).toString(),
  }, timeoutMs);

  const html = await res.text();
  const $ = cheerio.load(html);
  const downloads = [];

  $('.download__item__info__actions tbody tr').each((_, tr) => {
    const $tr = $(tr);
    const quality = $tr.find('td').eq(0).text().trim();
    let dlUrl = $tr.find('a.download__item__info__actions__button').attr('href');
    if (!dlUrl) return;
    if (dlUrl.startsWith('/')) dlUrl = 'https://tweeload.com' + dlUrl;
    if (isPaywallOrInvalid(dlUrl, quality)) return;
    const label = formatResolutionLabel(quality, '', dlUrl);
    const isImg = /\.(jpe?g|png|webp)(\?|$)/i.test(dlUrl);
    downloads.push({ type: isImg ? 'IMAGE' : label, url: dlUrl });
  });

  if (downloads.length === 0) {
    $('a.btn').each((_, a) => {
      const href = $(a).attr('href');
      if (href && (href.includes('downloads.acxcdn.com') || href.includes('twimg.com') || href.includes('tweeload'))) {
        const text = $(a).text().trim();
        if (text.toLowerCase() !== 'download via the mobile app' && !isPaywallOrInvalid(href, text)) {
          const label = formatResolutionLabel(text, '', href);
          const isImg = /\.(jpe?g|png|webp)(\?|$)/i.test(href);
          downloads.push({ type: isImg ? 'IMAGE' : label, url: href });
        }
      }
    });
  }

  if (downloads.length === 0) throw new Error('Link video/gambar tidak ditemukan di tweeload.');

  const name = $('.download__item__info__user__name').text().trim();
  const handle = $('.download__item__info__user__handle').text().trim();
  const thumbnail = $('.download__item__preview img, .download__item img').attr('src') || null;

  return { success: true, title: name ? `${name} (${handle})` : 'Twitter/X Content', thumbnail, downloads };
}

// ---- Fallback: twittervideodownloader.com ----
async function scrapeViaTvd(cleanUrl, timeoutMs) {
  const twitterUrl = cleanUrl.replace(/https:\/\/(x|fixupx|fxtwitter|vxtwitter|nitter)\.com/g, 'https://twitter.com');

  const r1 = await fetchWithTimeout('https://twittervideodownloader.com/', { headers: { 'User-Agent': CHROME_UA } }, timeoutMs);
  const cookies = getCookiesFromHeaders(r1.headers);
  const html1 = await r1.text();
  const $1 = cheerio.load(html1);
  const csrf = $1('input[name="csrfmiddlewaretoken"]').attr('value');
  const gql = $1('input[name="gql"]').attr('value') || '';

  if (!csrf) throw new Error('Tidak menemukan CSRF token dari TwitterVideoDownloader.');

  const r2 = await fetchWithTimeout('https://twittervideodownloader.com/download', {
    method: 'POST',
    headers: {
      Cookie: cookies,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': CHROME_UA,
      Referer: 'https://twittervideodownloader.com/',
    },
    body: new URLSearchParams({ tweet: twitterUrl, csrfmiddlewaretoken: csrf, gql }).toString(),
  }, timeoutMs);

  const html2 = await r2.text();
  const $2 = cheerio.load(html2);
  const downloads = [];

  $2('.card-body').each((_, card) => {
    const $card = $2(card);
    const qualityText = $card.find('.card-text').text().trim();
    $card.find('a.btn-download, a.btn').each((_, btn) => {
      const href = $2(btn).attr('href');
      const btnText = $2(btn).text().trim();
      const fullText = `${btnText} ${qualityText}`;
      if (isPaywallOrInvalid(href, fullText)) return;
      const label = formatResolutionLabel(btnText, qualityText, href);
      if (!downloads.some((d) => d.url === href)) {
        const isImg = /\.(jpe?g|png|webp)(\?|$)/i.test(href);
        downloads.push({ type: isImg ? 'IMAGE' : label, url: href });
      }
    });
  });

  if (downloads.length === 0) {
    $2('a[href*="video.twimg.com"], a[href*="twimg.com"]').each((_, a) => {
      const href = $2(a).attr('href');
      const text = $2(a).text().trim();
      if (!isPaywallOrInvalid(href, text) && !downloads.some((d) => d.url === href)) {
        const label = formatResolutionLabel(text, '', href);
        downloads.push({ type: label, url: href });
      }
    });
  }

  if (downloads.length === 0) throw new Error('Tidak ditemukan link video gratis di TVD.');

  const thumbnail = $2("img[src*='twimg.com'], img[src*='pbs.twimg.com'], .card img").first().attr('src')
    || $2('video').attr('poster') || null;

  // TVD dibatasi 1 hasil (sesuai versi asli Mori — situs ini kadang menampilkan opsi berbayar campur dengan gratis)
  return { success: true, title: 'Twitter/X Video', thumbnail, downloads: downloads.slice(0, 1) };
}

async function scrapeTwitter(url, timeoutMs = 20000) {
  if (!isTwitterUrl(url)) return { success: false, error: 'Bukan link Twitter/X yang valid.' };
  const cleanUrl = url.split('?')[0];

  try {
    return await scrapeViaTweeload(cleanUrl, timeoutMs);
  } catch (tweeloadErr) {
    try {
      return await scrapeViaTvd(cleanUrl, timeoutMs);
    } catch (tvdErr) {
      return { success: false, error: `Gagal dari kedua sumber. Tweeload: ${tweeloadErr.message} | TVD: ${tvdErr.message}` };
    }
  }
}

module.exports = { isTwitterUrl, scrapeTwitter };
