// lib/removeBgScraper.js — Hapus background gambar via iloveimg.com.
// Amati-tiru-modifikasi dari V9 Fontaine (library/enchancing.js, HANYA
// fungsi removeBg — fungsi remini() di file yang sama SENGAJA TIDAK
// diambil, itu reverse-engineered dari API internal aplikasi mobile
// Remini/vyro.ai, beda fungsi dari yang diminta dan berisiko lebih tinggi).
//
// CATATAN PENTING: source asli V9 punya bug — variabel `api` (axios
// instance yang dipanggil di uploadImageToServer & removeBg) TIDAK PERNAH
// didefinisikan di file itu sendiri maupun file lain yang bisa ditemukan,
// jadi base URL sebenarnya tidak jelas dari kode sumbernya. Base URL
// `https://api.iloveimg.com` di bawah ini adalah REKONSTRUKSI berdasarkan
// pola umum subdomain API situs iloveimg.com, BUKAN dikonfirmasi dari kode
// asli. WAJIB ditest live sebelum dianggap berfungsi.

async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getTaskId(timeoutMs) {
  const res = await fetchWithTimeout('https://www.iloveimg.com/id/hapus-latar-belakang', {}, timeoutMs);
  const html = await res.text();

  const tokenMatches = html.match(/ey[a-zA-Z0-9?%\-_/]+/g);
  const taskIdMatch = html.match(/taskId\s*=\s*'(\w+)/);

  if (!tokenMatches || tokenMatches.length < 2 || !taskIdMatch) {
    throw new Error('Gagal mengambil token dari iloveimg.com (struktur halaman mungkin berubah).');
  }

  return { token: tokenMatches[1], taskId: taskIdMatch[1] };
}

async function uploadImageToServer(imageBuffer, timeoutMs) {
  const { token, taskId } = await getTaskId(timeoutMs);
  const fileName = Math.random().toString(36).slice(2) + '.jpg';

  const form = new FormData();
  form.append('name', fileName);
  form.append('chunk', '0');
  form.append('chunks', '1');
  form.append('task', taskId);
  form.append('preview', '1');
  form.append('pdfinfo', '0');
  form.append('pdfforms', '0');
  form.append('pdfresetforms', '0');
  form.append('v', 'web.0');
  form.append('file', new Blob([imageBuffer]), fileName);

  const res = await fetchWithTimeout('https://api.iloveimg.com/v1/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  }, timeoutMs);

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Upload gagal (status ${res.status}): ${errText.slice(0, 150)}`);
  }

  const json = await res.json();
  return { serverFilename: json.server_filename, taskId, token };
}

async function removeBg(imageBuffer, timeoutMs = 30000) {
  try {
    const { serverFilename, taskId, token } = await uploadImageToServer(imageBuffer, timeoutMs);

    const form = new FormData();
    form.append('task', taskId);
    form.append('server_filename', serverFilename);

    const res = await fetchWithTimeout('https://api.iloveimg.com/v1/removebackground', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }, timeoutMs);

    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !/image/.test(contentType)) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Proses hapus background gagal: ${errText.slice(0, 150) || res.statusText}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    return { success: true, imageBuffer: buffer };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { removeBg };
