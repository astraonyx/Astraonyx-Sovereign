// lib/teraboxScraper.js — Scraper Terabox Modern & Multi-Engine
// Mendukung terabox.com, 1024tera.com, teraboxapp.com, nephobox, 4funbox, dll.
const cheerio = require('cheerio');

const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const TERABOX_DOMAINS = [
  'terabox.com',
  'terabox.app',
  'teraboxapp.com',
  '1024tera.com',
  '1024terabox.com',
  'freeterabox.com',
  'nephobox.com',
  'mirrobox.com',
  'momerybox.com',
  '4funbox.com',
  '4funbox.co',
  'tibibox.com',
  'dm.terabox.com',
  'dm.terabox.app',
  'dm.1024tera.com',
];

function isTeraboxUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return TERABOX_DOMAINS.some((d) => host === d || host.endsWith('.' + d) || host.includes('terabox'));
  } catch {
    return false;
  }
}

function extractTeraboxId(link) {
  try {
    const url = new URL(link);
    const surlParam = url.searchParams.get('surl');
    if (surlParam) return surlParam.replace(/^1/, '');

    const match = url.pathname.match(/\/s\/1?([A-Za-z0-9_-]+)/);
    if (match) return match[1];

    const embedMatch = url.search.match(/surl=1?([^&]+)/);
    if (embedMatch) return embedMatch[1];

    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      const last = segments[segments.length - 1].replace(/^1/, '');
      if (last.length >= 6) return last;
    }
  } catch (_) {
    const clean = link.trim().split('?')[0];
    const sMatch = clean.match(/\/s\/1?([a-zA-Z0-9_-]+)/);
    if (sMatch) return sMatch[1];
    const endMatch = clean.match(/\/1?([a-zA-Z0-9_-]+)$/);
    if (endMatch) return endMatch[1];
  }
  return null;
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

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return 'Unknown size';
  const num = Number(bytes);
  if (num === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return `${parseFloat((num / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function extractTokensFromHtml(html) {
  // 1. jsToken patterns
  const jsTokenPatterns = [
    /fn%28%22([a-f0-9]+)%22%29/,
    /"jsToken"\s*:\s*"([a-f0-9]+)"/,
    /jsToken["']?\s*[:=]\s*["']([a-f0-9]+)["']/,
    /window\.jsToken\s*=\s*['"]([^'"]+)['"]/,
    /`jsToken`\s*:\s*['"]([^'"]+)['"]/,
    /jsToken\s*=\s*['"]([a-zA-Z0-9]+)['"]/,
  ];
  let jsToken = null;
  for (const pat of jsTokenPatterns) {
    const m = html.match(pat);
    if (m && m[1]) {
      jsToken = m[1];
      break;
    }
  }
  if (!jsToken) {
    const aggressive = html.match(/[a-f0-9]{32,}/g)?.[0];
    if (aggressive && aggressive.length >= 32) jsToken = aggressive;
  }

  // 2. dpLogId patterns
  const dpLogIdPatterns = [
    /dp-logid=([^&"']+)/,
    /dpLogId["']?\s*[:=]\s*["']([^"']+)["']/,
    /"dp-logid":\s*"([^"]+)"/,
  ];
  let dpLogId = '';
  for (const pat of dpLogIdPatterns) {
    const m = html.match(pat);
    if (m && m[1]) {
      dpLogId = m[1];
      break;
    }
  }

  // 3. bdstoken & sekey
  const bdstokenMatch = html.match(/"bdstoken"\s*:\s*"([^"]+)"/);
  const bdstoken = bdstokenMatch ? bdstokenMatch[1] : '';

  const sekeyMatch = html.match(/sekey["']?\s*[:=]\s*["']([^"']+)["']/);
  const sekey = sekeyMatch ? sekeyMatch[1] : '';

  return { jsToken: jsToken || '', dpLogId, bdstoken, sekey };
}

// Engine 1: Terabox Direct Official Endpoints
async function scrapeTeraboxDirect(surl, timeoutMs) {
  const shorturl = surl.startsWith('1') ? surl.slice(1) : surl;
  const envCookie = process.env.TERABOX_COOKIE || '';
  const cookieHeader = envCookie ? (envCookie.includes('=') ? envCookie : `ndus=${envCookie}`) : '';

  const domainCandidates = [
    'https://www.terabox.app',
    'https://www.terabox.com',
    'https://dm.terabox.com',
    'https://1024tera.com',
  ];

  for (const domain of domainCandidates) {
    try {
      const shareUrl = `${domain}/sharing/link?surl=${shorturl}`;
      const res = await fetchWithTimeout(shareUrl, {
        headers: {
          'User-Agent': DEFAULT_UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
          'Cookie': cookieHeader,
        },
        redirect: 'follow',
      }, Math.min(timeoutMs, 10000));

      if (!res.ok) continue;

      const html = await res.text();
      const setCookies = res.headers.get('set-cookie') || '';
      const combinedCookies = (cookieHeader ? cookieHeader + '; ' : '') + setCookies;

      const tokens = extractTokensFromHtml(html);
      if (!tokens.jsToken) continue;

      // Query share/list API
      const listParams = new URLSearchParams({
        app_id: '250528',
        web: '1',
        channel: 'dubox',
        clienttype: '0',
        jsToken: tokens.jsToken,
        'dp-logid': tokens.dpLogId,
        page: '1',
        num: '100',
        by: 'name',
        order: 'asc',
        shorturl: shorturl,
        root: '1',
      });

      const listRes = await fetchWithTimeout(`${domain}/share/list?${listParams.toString()}`, {
        headers: {
          'User-Agent': DEFAULT_UA,
          'Accept': 'application/json, text/plain, */*',
          'Referer': shareUrl,
          'Cookie': combinedCookies,
        },
      }, Math.min(timeoutMs, 12000));

      if (!listRes.ok) continue;
      const data = await listRes.json();

      if (data.errno === 0 && Array.isArray(data.list) && data.list.length > 0) {
        const file = data.list[0];
        let directUrl = file.dlink || file.download_link;

        // Coba resolve redirect URL jika dlink tersedia
        if (directUrl && typeof directUrl === 'string' && directUrl.startsWith('http')) {
          try {
            const headRes = await fetchWithTimeout(directUrl, {
              method: 'HEAD',
              headers: { 'User-Agent': DEFAULT_UA, 'Cookie': combinedCookies },
              redirect: 'manual',
            }, 6000);
            const loc = headRes.headers.get('location');
            if (loc && loc.startsWith('http')) directUrl = loc;
          } catch (_) {}
        }

        const validDownloadUrl = (directUrl && typeof directUrl === 'string' && directUrl.startsWith('http'))
          ? directUrl
          : ((file.dlink && typeof file.dlink === 'string' && file.dlink.startsWith('http')) ? file.dlink : null);

        if (validDownloadUrl) {
          return {
            success: true,
            filename: file.server_filename || file.filename || 'terabox_file',
            sizeText: formatBytes(file.size),
            downloadUrl: validDownloadUrl,
            fileList: data.list.map((f) => ({
              name: f.server_filename || f.filename,
              size: formatBytes(f.size),
              dlink: f.dlink,
            })),
          };
        }
      }

      if (data.errno === 105) {
        return { success: false, error: 'File tidak ditemukan atau link Terabox telah kedaluwarsa/dihapus oleh pemiliknya.' };
      }
      if (data.errno === 2 || data.errno === -9) {
        return { success: false, error: 'File Terabox ini diproteksi password.' };
      }
      if (data.errno === 400210) {
        // Captcha turnstile challenge
        console.log('[terabox] Hit verify_v2 challenge');
      }
    } catch (err) {
      console.log(`[terabox] Notice on ${domain}:`, err.message);
    }
  }

  return null;
}

// Engine 2: Worker Mirror Fallback
async function scrapeTeraboxWorker(surl, timeoutMs) {
  const shorturl = surl.startsWith('1') ? surl.slice(1) : surl;
  const workerUrls = [
    `https://terabox-dl.qtcloud.workers.dev/api/get-info?shorturl=${shorturl}&pwd=`,
    `https://terabox-dl.qtcloud.workers.dev/api/get-info?shorturl=1${shorturl}&pwd=`,
  ];

  for (const workerUrl of workerUrls) {
    try {
      const res = await fetchWithTimeout(workerUrl, {
        headers: { 'User-Agent': DEFAULT_UA },
      }, timeoutMs);

      if (res.ok) {
        const json = await res.json();
        const candidateUrl = json?.downloadUrl || json?.dlink || json?.direct_link || (typeof json?.url === 'string' ? json.url : null);
        if (candidateUrl && typeof candidateUrl === 'string' && candidateUrl.startsWith('http')) {
          return {
            success: true,
            filename: json.filename || json.server_filename || 'terabox_file',
            sizeText: json.size ? formatBytes(json.size) : 'Unknown size',
            downloadUrl: candidateUrl,
          };
        }
      }
    } catch (_) {}
  }
  return null;
}

// Engine 3: TeraPlay & Public Downloader Gateway
async function scrapeTeraPlay(link, timeoutMs) {
  try {
    const apiUrl = `https://teraplay.in/api/fetch?url=${encodeURIComponent(link)}`;
    const res = await fetchWithTimeout(apiUrl, {
      headers: {
        'User-Agent': DEFAULT_UA,
        'Referer': 'https://teraplay.in/',
      },
    }, timeoutMs);

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.list) && data.list.length > 0) {
        const item = data.list[0];
        const dlUrl = (item.fast_stream_url && Object.values(item.fast_stream_url)[0]) || item.stream_url;
        if (dlUrl) {
          return {
            success: true,
            filename: item.name || 'terabox_media.mp4',
            sizeText: item.size_formatted || 'Unknown size',
            downloadUrl: `${dlUrl}&download=1`,
            engine: 'teraplay',
          };
        }
      }
    }
  } catch (_) {}
  return null;
}

async function scrapeTerabox(link, timeoutMs = 25000) {
  const id = extractTeraboxId(link);
  if (!id) {
    return { success: false, error: 'Link Terabox tidak valid atau format ID surl tidak ditemukan.' };
  }

  // 1. Coba Engine 1 (Direct Multi-Domain Web API dengan auto token extraction & cookie)
  try {
    const directResult = await scrapeTeraboxDirect(id, timeoutMs);
    if (directResult) {
      return directResult;
    }
  } catch (err) {
    console.log('[terabox] Engine 1 direct notice:', err.message);
  }

  // 2. Coba Engine 2 (TeraPlay API)
  try {
    const playResult = await scrapeTeraPlay(link, timeoutMs);
    if (playResult && playResult.success) {
      return playResult;
    }
  } catch (err) {
    console.log('[terabox] Engine 2 teraplay notice:', err.message);
  }

  // 3. Coba Engine 3 (Worker Mirror API)
  try {
    const workerResult = await scrapeTeraboxWorker(id, timeoutMs);
    if (workerResult && workerResult.success) {
      return workerResult;
    }
  } catch (err) {
    console.log('[terabox] Engine 3 worker notice:', err.message);
  }

  return {
    success: false,
    error: 'File Terabox tidak dapat diunduh otomatis oleh bot (Server Terabox membatasi akses tanpa login atau membutuhkan verifikasi captcha).\n\n💡 *Alternatif Download Langsung (Web):*\n1. https://teradownloader.com/\n2. https://teraplay.in/\n\n(Untuk bot, Anda juga dapat memasukkan cookie akun Terabox di file .env: TERABOX_COOKIE="ndus=xxx")',
  };
}

module.exports = { isTeraboxUrl, scrapeTerabox, extractTeraboxId };

