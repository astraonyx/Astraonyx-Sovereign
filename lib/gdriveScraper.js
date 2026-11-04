// lib/gdriveScraper.js — Download file publik dari Google Drive.
// TIDAK pakai package pihak ketiga (beda dari V9 Fontaine yang pakai
// `api-dylux`, black-box, tidak bisa diaudit). Ini pakai endpoint RESMI
// Google sendiri untuk direct-download file publik:
//   https://drive.google.com/uc?export=download&id=<FILE_ID>
// Ini bukan API tersembunyi, ini fitur publik yang sudah lama dipakai
// banyak tool/skrip resmi maupun tidak resmi untuk file yang "Anyone with
// the link" — TIDAK bisa dipakai untuk file privat/restricted (itu tetap
// butuh OAuth, di luar cakupan bot pribadi seperti ini).
//
// Kerumitan yang perlu ditangani: untuk file berukuran besar (umumnya
// >25MB), Google menyisipkan halaman konfirmasi "file ini tidak bisa
// dipindai virus, tetap download?" alih-alih langsung mengirim file.
// Halaman itu berisi token `confirm=` yang harus disertakan di request
// kedua untuk benar-benar mendapatkan filenya.

function extractFileId(url) {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,      // drive.google.com/file/d/<id>/view
    /[?&]id=([a-zA-Z0-9_-]+)/,           // drive.google.com/open?id=<id> atau uc?id=<id>
    /\/uc\?.*id=([a-zA-Z0-9_-]+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

function isGoogleDriveUrl(url) {
  try {
    const host = new URL(url).hostname;
    return /(^|\.)drive\.google\.com$/i.test(host) || /(^|\.)docs\.google\.com$/i.test(host);
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timer);
  }
}

function parseContentDisposition(header) {
  if (!header) return null;
  const match = header.match(/filename\*?=(?:UTF-8''|")?([^";\n]+)/i);
  return match ? decodeURIComponent(match[1].replace(/"/g, '')) : null;
}

// Kembalikan { success, downloadUrl, filename, sizeBytes } — downloadUrl
// sudah final, siap langsung di-fetch oleh pemanggil (bukan link
// konfirmasi lagi).
async function scrapeGDrive(url, timeoutMs = 20000) {
  const fileId = extractFileId(url);
  if (!fileId) {
    return { success: false, error: 'Tidak bisa menemukan file ID dari link ini. Pastikan link Google Drive valid.' };
  }

  const baseUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

  let res;
  try {
    res = await fetchWithTimeout(baseUrl, {}, timeoutMs);
  } catch (err) {
    return { success: false, error: `Gagal menghubungi Google Drive: ${err.message}` };
  }

  const contentType = res.headers.get('content-type') || '';

  // Kalau langsung dapat file (bukan halaman HTML konfirmasi), berarti file
  // kecil dan sudah selesai di request pertama.
  if (!contentType.includes('text/html')) {
    const filename = parseContentDisposition(res.headers.get('content-disposition')) || `gdrive-${fileId}`;
    const sizeBytes = parseInt(res.headers.get('content-length') || '0', 10) || null;
    return { success: true, downloadUrl: res.url || baseUrl, filename, sizeBytes };
  }

  // File besar -> dapat halaman konfirmasi HTML, cari token & URL form-nya.
  const html = await res.text();

  if (html.includes('Google Drive - Quota exceeded') || html.includes('exceeded the daily quota')) {
    return { success: false, error: 'Kuota download file ini sudah habis (limit harian Google Drive), coba lagi besok.' };
  }
  if (html.includes('does not exist') || html.includes('File not found')) {
    return { success: false, error: 'File tidak ditemukan atau tidak publik.' };
  }

  // Coba pola form konfirmasi modern (id, export, confirm, uuid sebagai hidden input)
  const formActionMatch = html.match(/<form[^>]+id="download-form"[^>]+action="([^"]+)"/i);
  const hiddenInputs = [...html.matchAll(/<input[^>]+type="hidden"[^>]+name="([^"]+)"[^>]+value="([^"]*)"/gi)];

  let confirmUrl;
  if (formActionMatch) {
    const action = formActionMatch[1].replace(/&amp;/g, '&');
    const params = new URLSearchParams();
    for (const [, name, value] of hiddenInputs) params.set(name, value);
    confirmUrl = `${action}${action.includes('?') ? '&' : '?'}${params.toString()}`;
  } else {
    // Fallback pola lama: cari link berisi confirm=xxxx langsung di HTML
    const confirmMatch = html.match(/href="(\/uc\?export=download[^"]+confirm=[^"]+)"/i);
    if (confirmMatch) {
      confirmUrl = 'https://drive.google.com' + confirmMatch[1].replace(/&amp;/g, '&');
    }
  }

  if (!confirmUrl) {
    return { success: false, error: 'Tidak bisa melewati halaman konfirmasi Google Drive (struktur halaman mungkin berubah).' };
  }

  let confirmRes;
  try {
    confirmRes = await fetchWithTimeout(confirmUrl, {}, timeoutMs);
  } catch (err) {
    return { success: false, error: `Gagal mengambil file setelah konfirmasi: ${err.message}` };
  }

  const confirmContentType = confirmRes.headers.get('content-type') || '';
  if (confirmContentType.includes('text/html')) {
    return { success: false, error: 'Gagal melewati halaman konfirmasi Google Drive (kemungkinan file butuh login/tidak publik).' };
  }

  const filename = parseContentDisposition(confirmRes.headers.get('content-disposition')) || `gdrive-${fileId}`;
  const sizeBytes = parseInt(confirmRes.headers.get('content-length') || '0', 10) || null;

  return { success: true, downloadUrl: confirmRes.url || confirmUrl, filename, sizeBytes };
}

module.exports = { isGoogleDriveUrl, scrapeGDrive };
