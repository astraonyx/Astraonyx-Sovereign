# Mori — Satu Tempat Scrape untuk Bot WA & Dashboard Web

Sebelumnya folder ini bernama `astraonyx/omniget/`, dan ada percampuran
nama "Mori" vs "OmniGet" di berbagai komentar/kode (peninggalan AI
slop — dua nama untuk satu engine yang sama). Sekarang disatukan jadi
**satu nama resmi: Mori**.

## Kenapa "satu tempat"

Mori adalah **satu-satunya** pintu masuk untuk semua kebutuhan
download/scrape media (TikTok, Instagram, YouTube, Spotify, dll),
dipakai bersama oleh:

- **Bot WhatsApp (Polaris)** → `commands/downloader.js` →
  `astraonyx/mori/botHandler.js`
- **Dashboard web (Polarium)** → `server/routes/downloader.js` →
  `server/downloaderService.js` → `server/threeTierDownloader.js` →
  `astraonyx/mori` (`engine.js` + `toolbox.js`)

Tidak ada lagi engine terpisah/duplikat untuk masing-masing.

## Struktur

| File | Peran |
| --- | --- |
| `index.js` | Hub: daftar command, dispatcher untuk bot WA |
| `engine.js` | Core 3-layer scraping + server registry (multi-server failover) |
| `toolbox.js` | Tools tambahan: magnet/torrent, course, video-to-gif, kompresi, dll |
| `botHandler.js` | Handler balasan chat WA per-platform |

## Kompatibilitas mundur

- Command `/omniget` di WhatsApp **masih berfungsi** (alias ke `/mori`),
  supaya tidak ada yang mendadak patah untuk pengguna lama.
- `lib/omnigetToolbox.js` masih ada, tapi sekarang cuma re-export dari
  `lib/moriToolbox.js` — kalau ada kode lama yang belum ke-update,
  masih tetap jalan.
- Endpoint API dashboard (`/api/downloader/omniget/...`) **sengaja tidak
  diganti** namanya, karena `dashboard/js/app.js` memanggil path itu
  langsung dan UI dashboard tidak disentuh di perubahan ini.

## Yang masih perlu dibereskan (di luar scope perbaikan kali ini)

- `scrape/furina/fakeIQC.js` masih error karena package `canvas` butuh
  kompilasi native (`node-gyp`) yang gagal di sandbox ini (tidak ada akses
  ke `nodejs.org` untuk unduh header Node). Perlu di-build di mesin lokal
  kamu sendiri (`npm rebuild canvas`), atau ganti ke `@napi-rs/canvas`
  yang sudah prebuilt dan dipakai `fakeig.js`/`fakenotif.js`.
- `scrape/furina/ddos.js` dan `spamOtp.js` sengaja **tidak disentuh**
  sesuai permintaan — isinya sebenarnya cuma diagnostic tools jinak
  (load-benchmark & validator format nomor, bukan alat serang), tapi
  nama filenya menyesatkan.
