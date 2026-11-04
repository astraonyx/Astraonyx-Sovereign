// lib/spotifyScraper.js — Download lagu Spotify via spotidown.app.
// Amati-tiru-modifikasi dari coflyn/Mori (public/js/scrapers/spotify.js),
// memakai alur "spotidown.app" (sumber default di Mori). Alur 3 langkah:
//   1. GET halaman utama, ambil form + hidden input token
//   2. POST ke /action dengan url + token -> dapat HTML form kedua
//   3. POST ke /action/track dengan token form kedua -> dapat HTML hasil akhir
// Field "g-recaptcha-response: dummy_token" BUKAN bypass captcha asli —
// situs publik ini memang tidak strict validasi di endpoint actionnya
// (perilaku situs itu sendiri, bukan sesuatu yang kita paksakan).

const cheerio = require('cheerio');

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';

function isSpotifyUrl(url) {
  try {
    const parsed = new URL(url);
    return /(^|\.)spotify\.com$/i.test(parsed.hostname) || /(^|\.)spotify\.link$/i.test(parsed.hostname);
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
  const setCookie = headers.get ? headers.get('set-cookie') : headers['set-cookie'];
  if (!setCookie) return '';
  // Ambil hanya pasangan nama=nilai (buang atribut seperti Path/Expires)
  return setCookie.split(',').map((c) => c.split(';')[0].trim()).join('; ');
}

async function scrapeSpotify(spotifyUrl, timeoutMs = 20000) {
  try {
    const r1 = await fetchWithTimeout('https://spotidown.app/', { headers: { 'User-Agent': CHROME_UA } }, timeoutMs);
    if (!r1.ok) return { success: false, error: `spotidown.app merespons status ${r1.status}.` };
    const cookies = getCookiesFromHeaders(r1.headers);
    const html1 = await r1.text();

    const $1 = cheerio.load(html1);
    const form = $1('form[name="spotifyurl"]');
    const formData = { url: spotifyUrl };
    form.find('input').each((_, el) => {
      const name = $1(el).attr('name');
      const value = $1(el).attr('value') || '';
      if (name && name !== 'url') formData[name] = value;
    });
    formData['g-recaptcha-response'] = 'dummy_token';

    const r2Headers = {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': CHROME_UA,
      Origin: 'https://spotidown.app',
      Referer: 'https://spotidown.app/',
      'X-Requested-With': 'XMLHttpRequest',
    };
    if (cookies) r2Headers.Cookie = cookies;

    const r2 = await fetchWithTimeout('https://spotidown.app/action', {
      method: 'POST',
      headers: r2Headers,
      body: new URLSearchParams(formData).toString(),
    }, timeoutMs);

    let r2Data;
    try { r2Data = await r2.json(); } catch { r2Data = { data: await r2.text() }; }
    if (r2Data.error) return { success: false, error: r2Data.message || 'Link Spotify tidak valid.' };

    let finalHtml = r2Data.data || r2Data;
    let $doc = cheerio.load(finalHtml);
    const form2 = $doc('form[name="submitspurl"]');

    if (form2.length > 0) {
      const data2 = {};
      form2.find('input').each((_, el) => {
        const name = $doc(el).attr('name');
        const value = $doc(el).attr('value') || '';
        if (name) data2[name] = value;
      });
      data2['g-recaptcha-response'] = 'dummy_token';

      const r3Headers = { ...r2Headers };
      const r3 = await fetchWithTimeout('https://spotidown.app/action/track', {
        method: 'POST',
        headers: r3Headers,
        body: new URLSearchParams(data2).toString(),
      }, timeoutMs);

      let r3Data;
      try { r3Data = await r3.json(); } catch { r3Data = { data: await r3.text() }; }
      finalHtml = r3Data.data || r3Data;
      $doc = cheerio.load(finalHtml);
    }

    const title = $doc('h3').first().text().trim() || 'Spotify Track';
    const artist = $doc('p').first().text().trim();
    const thumbnail = $doc('img').first().attr('src') || null;

    const downloads = [];
    $doc('a').each((_, el) => {
      const link = $doc(el).attr('href');
      const text = $doc(el).text().trim();
      if (link && link.startsWith('http') && !link.includes('premium.html') && text !== 'Download Another Song') {
        downloads.push({ type: text || 'MP3', url: link });
      }
    });

    if (downloads.length === 0) {
      return { success: false, error: 'Tidak ada link download ditemukan (mungkin lagu privat atau link salah).' };
    }

    return {
      success: true,
      title: artist ? `${artist} - ${title}` : title,
      thumbnail,
      audioUrl: downloads[0].url,
      downloads,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { isSpotifyUrl, scrapeSpotify };
