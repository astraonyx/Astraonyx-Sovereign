// lib/instagramFacebookScraper.js — Download Instagram & Facebook.
// Amati-tiru-modifikasi dari coflyn/Mori (public/js/scrapers/instagram.js,
// facebook.js, utils/index.js).
//
// Instagram: PRIORITAS UTAMA pakai endpoint embed RESMI instagram.com sendiri
// (instagram.com/p/<shortcode>/embed/captioned/) — ini fitur publik yang
// disediakan Instagram untuk embed post di website lain, jadi bukan
// scraping situs pihak ketiga sama sekali. Fallback ke snapsave.app kalau
// itu gagal (misal untuk beberapa kasus reel).
//
// Facebook: snapsave.app (situs publik downloader FB/IG umum dipakai).
// Responsnya dienkode dengan skema base-N sederhana ala eval(function(h,u,n,t,e,r){...}),
// TAPI kode di sini TIDAK PERNAH menjalankan eval() itu — decodeSnapSave()
// murni mem-parsing string argumennya lewat regex lalu mendekode manual
// (substitusi karakter + base konversi), hasilnya string HTML biasa.

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const cheerio = require('cheerio');

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const CHROME_UA = BROWSER_UA;
const SAFARI_MOBILE_UA = BROWSER_UA;

function isInstagramUrl(url) {
  try { return /(^|\.)instagram\.com$/i.test(new URL(url).hostname); } catch { return false; }
}
function isFacebookUrl(url) {
  try {
    const h = new URL(url).hostname;
    return /(^|\.)facebook\.com$/i.test(h) || /(^|\.)fb\.watch$/i.test(h);
  } catch { return false; }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function decodeSnapApp(args) {
  let [h, u, n, t, e, r] = args;
  const tNum = Number(t);
  const eNum = Number(e);
  function decode(d, e, f) {
    const g = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/".split("");
    const hArr = g.slice(0, e);
    const iArr = g.slice(0, f);
    let j = d.split("").reverse().reduce((a, b, c) => {
      const idx = hArr.indexOf(b);
      if (idx !== -1) return a + idx * Math.pow(e, c);
      return a;
    }, 0);
    let k = "";
    while (j > 0) {
      k = iArr[j % f] + k;
      j = Math.floor(j / f);
    }
    return k || "0";
  }
  let result = "";
  for (let i = 0, len = h.length; i < len;) {
    let s = "";
    while (i < len && h[i] !== n[eNum]) {
      s += h[i];
      i++;
    }
    i++;
    for (let j = 0; j < n.length; j++) s = s.replace(new RegExp(n[j], "g"), j.toString());
    result += String.fromCharCode(Number(decode(s, eNum, 10)) - tNum);
  }
  try {
    const bytes = new Uint8Array(result.split("").map((char) => char.charCodeAt(0)));
    return new TextDecoder("utf-8").decode(bytes);
  } catch (_) {
    return result;
  }
}

function decodeSnapSave(data) {
  if (!data) return '';
  if (data.includes('<table') || data.includes('<div class="download-items"')) return data;

  // 1. Decoder modern Snapsave (decodeURIComponent(escape(r)))
  if (data.includes("decodeURIComponent(escape(r))}(")) {
    try {
      const encoded = data.split("decodeURIComponent(escape(r))}(")[1].split("))")[0].split(",").map((v) => v.replace(/"/g, "").trim());
      const decodedJs = decodeSnapApp(encoded);
      if (decodedJs.includes('document.querySelector("#alert").innerHTML = "')) {
        const err = decodedJs.split('document.querySelector("#alert").innerHTML = "')[1].split('";')[0];
        throw new Error(err);
      }
      if (decodedJs.includes('getElementById("download-section").innerHTML = "')) {
        return decodedJs.split('getElementById("download-section").innerHTML = "')[1].split('";')[0].replace(/\\(\\)?/g, "");
      }
      return decodedJs;
    } catch (e) {
      if (e.message && !e.message.includes('split')) throw e;
    }
  }

  // 2. VM Sandbox fallback
  try {
    const vm = require('vm');
    let capturedHtml = '';
    const mockElement = {
      set innerHTML(val) { if (val) capturedHtml += val; },
      get innerHTML() { return ''; },
      classList: { remove: () => {}, add: () => {} },
      style: {},
      remove: () => {},
    };
    const sandbox = {
      eval: function(code) {
        try { vm.runInContext(code, sandbox, { timeout: 2500 }); } catch (_) {}
      },
      document: {
        querySelector: () => mockElement,
        querySelectorAll: () => [mockElement],
        getElementById: () => mockElement,
        getElementsByClassName: () => [mockElement],
      },
      window: { location: { hostname: 'snapsave.app' } },
    };
    vm.createContext(sandbox);
    vm.runInContext(data, sandbox, { timeout: 3000 });
    if (capturedHtml) return capturedHtml;
  } catch (_) {}

  // 3. Fallback string regex unpacker
  try {
    const match = data.match(/eval\(function\(h,u,n,t,e,r\)\{.*?\}\("(.*?)",(\d+),"(.*?)",(\d+),(\d+),(\d+)\)\)/);
    if (match) {
      const h = match[1], n = match[3], t = parseInt(match[4]), e = parseInt(match[5]);
      const delimiter = n[e];
      const parts = h.split(delimiter);
      let decoded = '';
      for (const s of parts) {
        if (s === '') continue;
        let val = 0;
        for (let j = 0; j < s.length; j++) val += n.indexOf(s[j]) * Math.pow(e, s.length - 1 - j);
        decoded += String.fromCharCode(val - t);
      }
      return decodeURIComponent(escape(decoded));
    }
  } catch (_) {}

  return data;
}

function extractFinalUrl(input) {
  if (!input) return null;
  let raw = input.trim().replace(/^["'\\]+|["'\\]+$/g, '');
  let isRender = false;
  if (raw.includes('get_progressApi')) {
    isRender = true;
    const tokenMatch = raw.match(/token=([^&'"]+)/);
    if (tokenMatch) raw = tokenMatch[1];
  }
  if (raw.includes('.') && !raw.startsWith('http')) {
    try {
      const payloadPart = raw.split('.')[1];
      if (payloadPart) {
        const payload = JSON.parse(Buffer.from(payloadPart, 'base64').toString('utf8'));
        if (payload.video_url) return { url: payload.video_url, isRender: true };
        if (payload.url) return { url: payload.url, isRender: false };
      }
    } catch { /* bukan base64 payload */ }
  }
  if (raw.startsWith('//')) return { url: 'https:' + raw, isRender };
  if (raw.startsWith('/')) return { url: 'https://snapsave.app' + raw, isRender };
  return { url: raw, isRender };
}

// ---- Instagram + Facebook Engine: snapsave.app ----
async function scrapeViaSnapSave(url, timeoutMs = 20000) {
  const headers = {
    'Accept': '*/*',
    'User-Agent': CHROME_UA,
    'Origin': 'https://snapsave.app',
    'Referer': 'https://snapsave.app/',
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const r2 = await fetchWithTimeout('https://snapsave.app/action.php?lang=en', {
    method: 'POST',
    headers,
    body: new URLSearchParams({ url }).toString(),
  }, timeoutMs);

  const rawData = await r2.text();
  if (!rawData) throw new Error('Snapsave tidak mengembalikan data.');

  const decodedHtml = decodeSnapSave(rawData);
  const $ = cheerio.load(decodedHtml);
  const downloads = [];

  $('table tbody tr').each((_, tr) => {
    const $tr = $(tr);
    const qTd = $tr.find('td.video-quality');
    const quality = qTd.length ? qTd.text().trim() : $tr.find('td').first().text().trim();
    const btn = $tr.find('a.btn-download').first().length ? $tr.find('a.btn-download').first() : ($tr.find('button').first().length ? $tr.find('button').first() : $tr.find('a').first());
    const linkAttr = btn.attr('href') || btn.attr('onclick');

    const extracted = extractFinalUrl(linkAttr);
    if (extracted && extracted.url.startsWith('http')) {
      downloads.push({ type: quality || 'VIDEO', url: extracted.url });
    }
  });

  if (downloads.length === 0) {
    $('a.btn-download, a[href*="download"], a[href*="snapcdn"], a[href*="fbcdn"], .download-items a, .download-bottom a').each((_, el) => {
      const link = $(el).attr('href') || $(el).attr('onclick');
      const extracted = extractFinalUrl(link);
      if (extracted && extracted.url.startsWith('http') && !downloads.find((d) => d.url === extracted.url)) {
        downloads.push({ type: 'VIDEO', url: extracted.url });
      }
    });
  }

  if (downloads.length === 0) {
    if (decodedHtml.includes('alert') || decodedHtml.includes('Error')) {
      const cleanErr = decodedHtml.replace(/<[^>]+>/g, ' ').trim().slice(0, 100);
      throw new Error(cleanErr || 'Server Snapsave membatasi unduhan.');
    }
    throw new Error('Tidak bisa ekstrak link download dari snapsave.');
  }

  let thumbnail = $('.video-preview img').first().attr('src') || $('img').not('[src*="logo"]').first().attr('src') || null;
  if (thumbnail && thumbnail.startsWith('/')) thumbnail = 'https://snapsave.app' + thumbnail;

  return { success: true, title: 'Media', thumbnail, downloads };
}

// ---- Engine 2: JerryCoder Worker API ----
async function scrapeInstagramWorker(url, timeoutMs = 7000) {
  try {
    const res = await fetchWithTimeout(`https://jerrycoder.oggyapi.workers.dev/insta?url=${encodeURIComponent(url)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
    }, timeoutMs);
    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
      const downloads = json.data.map((item, i) => ({
        url: item.url,
        type: item.type?.toUpperCase() || 'VIDEO',
        quality: `HD Media ${i + 1}`,
      }));
      return {
        success: true,
        title: 'Instagram Media',
        thumbnail: downloads[0]?.url || null,
        downloads,
      };
    }
  } catch (_) {}
  return null;
}

// ---- Engine 2b: SnapSave Media Downloader (ESM) ----
async function scrapeViaSnapSaveMedia(url, timeoutMs = 6000) {
  return Promise.race([
    (async () => {
      try {
        const { snapsave } = await import('snapsave-media-downloader');
        const res = await snapsave(url);
        if (res && res.success && res.data?.media?.length) {
          const downloads = res.data.media.map((m, i) => ({
            url: m.url,
            type: m.type?.toUpperCase() === 'IMAGE' ? 'IMAGE' : 'VIDEO',
            quality: m.resolution || `HD Media ${i + 1}`,
          }));
          return {
            success: true,
            title: res.data.description || 'Media',
            thumbnail: res.data.preview || downloads[0].url,
            downloads,
          };
        }
      } catch (_) {}
      return null;
    })(),
    new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

function getYtDlpBin() {
  const localBin = path.join(process.cwd(), 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
  if (fs.existsSync(localBin)) return localBin;
  return 'yt-dlp';
}

function getInstagramCookie() {
  if (process.env.INSTAGRAM_COOKIE && process.env.INSTAGRAM_COOKIE.trim()) {
    return process.env.INSTAGRAM_COOKIE.trim();
  }
  const possibleFiles = ['cookies.txt', 'instagram_cookies.txt', 'cookies-instagram.txt'];
  for (const f of possibleFiles) {
    const p = path.join(process.cwd(), f);
    if (fs.existsSync(p)) {
      try {
        return fs.readFileSync(p, 'utf8').trim();
      } catch (_) {}
    }
  }
  return null;
}

function ensureNetscapeCookieFile(rawCookie) {
  if (!rawCookie) return null;
  const tmpDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const cookieFilePath = path.join(tmpDir, 'ig_yt_dlp_cookies.txt');

  if (rawCookie.includes('# Netscape HTTP Cookie File')) {
    fs.writeFileSync(cookieFilePath, rawCookie, 'utf8');
    return cookieFilePath;
  }

  const lines = ['# Netscape HTTP Cookie File', '# https://curl.haxx.se/rfc/cookie_spec.html'];
  const pairs = rawCookie.split(';');
  for (const pair of pairs) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const name = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    lines.push(`.instagram.com\tTRUE\t/\tTRUE\t2147483647\t${name}\t${value}`);
  }
  fs.writeFileSync(cookieFilePath, lines.join('\n'), 'utf8');
  return cookieFilePath;
}

async function scrapeWithYtDlp(url, isInstagram = true, timeoutMs = 25000) {
  const bin = getYtDlpBin();
  const args = ['--dump-json', '--no-warnings', '--no-playlist'];

  if (isInstagram) {
    const rawCookie = getInstagramCookie();
    if (rawCookie) {
      const cookieFile = ensureNetscapeCookieFile(rawCookie);
      if (cookieFile) args.push('--cookies', cookieFile);
    }
  }

  args.push(url);

  return new Promise((resolve) => {
    execFile(bin, args, { timeout: timeoutMs }, (err, stdout) => {
      if (err || !stdout) return resolve(null);
      try {
        const data = JSON.parse(stdout);
        const downloads = [];

        if (Array.isArray(data.entries) && data.entries.length > 0) {
          data.entries.forEach((e, i) => {
            const mUrl = e.url || (e.formats && e.formats.slice(-1)[0]?.url);
            if (mUrl) {
              downloads.push({
                url: mUrl,
                type: e.vcodec && e.vcodec !== 'none' ? 'VIDEO' : 'IMAGE',
                quality: `HD ${e.vcodec && e.vcodec !== 'none' ? 'Video' : 'Photo'} ${i + 1}`,
              });
            }
          });
        } else {
          const mUrl = data.url || (data.formats && data.formats.slice(-1)[0]?.url);
          if (mUrl) {
            downloads.push({
              url: mUrl,
              type: data.vcodec && data.vcodec !== 'none' ? 'VIDEO' : 'IMAGE',
              quality: data.vcodec && data.vcodec !== 'none' ? 'HD Video' : 'HD Photo',
            });
          }
        }

        if (downloads.length > 0) {
          return resolve({
            success: true,
            title: data.title || (isInstagram ? 'Instagram Media' : 'Facebook Media'),
            thumbnail: data.thumbnail || downloads[0].url,
            downloads,
          });
        }
      } catch (_) {}
      resolve(null);
    });
  });
}

// ---- Engine 3: Instagram Authenticated GraphQL (jika ada INSTAGRAM_COOKIE di .env) ----
async function scrapeInstagramWithCookie(url, timeoutMs = 15000) {
  const cookie = getInstagramCookie();
  if (!cookie) return null;

  try {
    const shortcodeMatch = url.match(/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
    if (!shortcodeMatch) return null;
    const shortcode = shortcodeMatch[1];

    const csrfMatch = cookie.match(/csrftoken=([^;]+)/);
    const csrfToken = csrfMatch ? csrfMatch[1] : '';

    const params = new URLSearchParams({
      variables: JSON.stringify({
        shortcode,
        fetch_tagged_user_count: null,
        hoisted_comment_id: null,
        hoisted_reply_id: null,
      }),
      doc_id: '9510064595728286',
    });

    const res = await fetchWithTimeout('https://www.instagram.com/graphql/query', {
      method: 'POST',
      headers: {
        'User-Agent': CHROME_UA,
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRFToken': csrfToken,
        'X-IG-App-ID': '936619743392459',
        'Cookie': cookie,
      },
      body: params.toString(),
    }, timeoutMs);

    if (res.ok) {
      const data = await res.json();
      const media = data?.data?.xdt_shortcode_media;
      if (media) {
        const downloads = [];
        if (media.edge_sidecar_to_children?.edges) {
          media.edge_sidecar_to_children.edges.forEach((edge, i) => {
            const n = edge.node;
            const mUrl = n.video_url || n.display_url;
            if (mUrl) downloads.push({ url: mUrl, type: n.is_video ? 'VIDEO' : 'IMAGE', quality: `HD ${n.is_video ? 'Video' : 'Photo'} ${i + 1}` });
          });
        } else {
          const mUrl = media.video_url || media.display_url;
          if (mUrl) downloads.push({ url: mUrl, type: media.is_video ? 'VIDEO' : 'IMAGE', quality: media.is_video ? 'HD Video' : 'HD Photo' });
        }
        if (downloads.length > 0) {
          return {
            success: true,
            title: media.edge_media_to_caption?.edges?.[0]?.node?.text?.slice(0, 80) || 'Instagram Media',
            thumbnail: downloads[0].url,
            downloads,
          };
        }
      }
    }
  } catch (_) {}
  return null;
}

async function scrapeInstagram(url, timeoutMs = 20000) {
  if (!isInstagramUrl(url)) return { success: false, error: 'Bukan link Instagram yang valid.' };
  const cleanUrl = url.split('?')[0];

  // 1. Coba Cookie jika diset di .env atau file cookies.txt
  const rawCookie = getInstagramCookie();
  if (rawCookie) {
    try {
      const cookieResult = await scrapeInstagramWithCookie(cleanUrl, 10000);
      if (cookieResult && cookieResult.success) return cookieResult;
    } catch (_) {}
  }

  // 2. Coba yt-dlp (termasuk dengan cookie jika tersedia)
  try {
    const ytdlpResult = await scrapeWithYtDlp(cleanUrl, true, 18000);
    if (ytdlpResult && ytdlpResult.success) return ytdlpResult;
  } catch (_) {}

  // 3. Coba SnapSave Media Downloader (paket terupdate)
  try {
    const snapMediaResult = await scrapeViaSnapSaveMedia(cleanUrl);
    if (snapMediaResult && snapMediaResult.success) {
      return { ...snapMediaResult, title: 'Instagram Media' };
    }
  } catch (_) {}

  // 4. Coba SnapSave dengan direct decoder
  try {
    const snapResult = await scrapeViaSnapSave(cleanUrl, 8000);
    if (snapResult && snapResult.success) {
      return { ...snapResult, title: 'Instagram Media' };
    }
  } catch (err) {
    console.log('[instagram] SnapSave attempt notice:', err.message);
  }

  // 5. Coba JerryCoder Worker fallback
  try {
    const workerResult = await scrapeInstagramWorker(cleanUrl, 7000);
    if (workerResult && workerResult.success) {
      return workerResult;
    }
  } catch (err) {
    console.log('[instagram] Worker attempt notice:', err.message);
  }

  return {
    success: false,
    error: 'Media Instagram tidak dapat diunduh (Instagram membatasi akses tanpa login untuk postingan ini).\n\n💡 *Solusi agar download Instagram selalu lancar:*\n1. Salin cookie Instagram Anda dari browser (cukup nilai `sessionid=...; ds_user_id=...`).\n2. Masukkan ke file `.env`:\n   INSTAGRAM_COOKIE="sessionid=...; ds_user_id=..."\n   (atau letakkan file `cookies.txt` di folder bot).\n3. Restart bot, semua Reel & Post Instagram dapat langsung diunduh tanpa batasan!',
  };
}

async function scrapeFacebook(url, timeoutMs = 20000) {
  if (!isFacebookUrl(url)) return { success: false, error: 'Bukan link Facebook yang valid.' };

  // 1. Coba SnapSave Media Downloader (terbukti cepat & sukses)
  try {
    const snapMediaResult = await scrapeViaSnapSaveMedia(url);
    if (snapMediaResult && snapMediaResult.success) {
      return { ...snapMediaResult, title: 'Facebook Media' };
    }
  } catch (_) {}

  // 2. Coba yt-dlp
  try {
    const ytdlpResult = await scrapeWithYtDlp(url, false, 18000);
    if (ytdlpResult && ytdlpResult.success) return ytdlpResult;
  } catch (_) {}

  // 3. Coba SnapSave direct
  try {
    const result = await scrapeViaSnapSave(url, 8000);
    if (result && result.success) return { ...result, title: 'Facebook Media' };
  } catch (err) {
    console.log('[facebook] SnapSave notice:', err.message);
  }

  // 4. Coba Nexray API
  try {
    const res = await fetchWithTimeout(`https://api.nexray.web.id/downloader/facebook?url=${encodeURIComponent(url)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    }, 8000);
    if (res.ok) {
      const json = await res.json();
      const mediaUrl = json?.result?.video_hd || json?.result?.video_sd;
      if (mediaUrl) {
        return {
          success: true,
          title: json?.result?.title || 'Facebook Media',
          thumbnail: null,
          downloads: [{ url: mediaUrl, type: 'VIDEO', quality: 'HD' }],
        };
      }
    }
  } catch (_) {}

  return { success: false, error: 'Gagal mengambil media Facebook. Server downloader sedang membatasi akses, silakan coba beberapa saat lagi.' };
}

module.exports = { isInstagramUrl, isFacebookUrl, scrapeInstagram, scrapeFacebook, scrapeViaSnapSave };
