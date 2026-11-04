# 🌟 Polaris Project — Multi-Account WhatsApp Bot & Interactive Dashboard

Polaris Project adalah bot WhatsApp modular canggih berbasis **WhiskeySockets/Baileys** yang terintegrasi secara seamless dengan **Interactive Web Dashboard** realtime (Express + WebSockets). Dirancang untuk skalabilitas tinggi, multi-bot clustering, manajemen kontak, otomatisasi moderasi grup, serta agen kecerdasan buatan otonom (**Hermes Autonomous AI**).

---

## 🚀 Fitur Unggulan

### 1. 🤖 Multi-Bot & Cluster Hub
- Menjalankan dan mengelola beberapa nomor WhatsApp sekaligus dalam satu platform.
- Penautan akun instan via **QR Code** langsung di Web Dashboard.
- Pemantauan status live Baileys (ONLINE, CONNECTING, OFFLINE) tanpa bentrok port.
- Multi-bot control switch untuk broadcast WhatsApp Story, eksekusi command, dan moderasi.

### 2. 📊 Interactive Web Dashboard
- **Realtime Monitor**: Pantau penggunaan RAM, CPU, latency server, dan status uptime.
- **Bot Hub & Overview**: Kontrol cluster, restart bot, dan sinkronisasi sesi.
- **Command & Permission Studio**: Atur hak akses tiap command (Owner, Level 1, Level 2, Whitelist, atau Publik / Semua Orang), aktifkan/nonaktifkan command secara massal.
- **Grup & Moderasi**: Kelola izin bot di tiap grup, tombol darurat nonaktifkan semua izin, filter pencarian grup cepat, dan proteksi otomatis grup ekosistem resmi.
- **Contacts & Audience Manager**: Buku kontak otomatis tersimpan permanen, impor file VCF kontak, dan export vCard.
- **Story / Status Broadcaster**: Buat WhatsApp Story teks atau media langsung dari dashboard dengan target audiens custom.

### 3. 🧠 Hermes Autonomous AI Agent
- Agen AI cerdas terintegrasi dengan **OpenRouter** (mendukung model gratis dan auto-chain fallback).
- Intent recognition, memori adaptif percakapan, dynamic persona, dan sistem eksekusi skill kustom (hermes_skills).

### 4. ⚡ Network Diagnostics & Tools
- Command /interping untuk mengukur kecepatan unduh (Download), unggah (Upload), serta latensi ping server langsung ke edge network Cloudflare.
- Downloader media sosial otomatis (TikTok, YouTube, Instagram, Pinterest, Google Drive, MediaFire, dll.).
- Antidelete & Virtex Shield untuk proteksi grup WhatsApp.

---

## 📋 Persyaratan Sistem

- **Node.js**: Versi 18.0.0 atau yang lebih baru.
- **NPM**: Versi 9.0.0 atau yang lebih baru.
- **Git**: Terpasang di sistem operasi.

---

## 🛠️ Panduan Instalasi & Menjalankan

### 1. Clone Repository
`ash
git clone <URL_REPOSITORY_ANDA>
cd wa-bot-clean
`

### 2. Pasang Dependensi
`ash
npm install
`

### 3. Konfigurasi Lingkungan (.env)
Salin template konfigurasi .env.example ke .env:
`ash
cp .env.example .env
`
Buka file .env dengan teks editor, lalu sesuaikan isinya:
- OWNER_NUMBER: Nomor WhatsApp pemilik bot (contoh: 6281234567890).
- PORT: Port web dashboard (default: 3000).
- JWT_SECRET: Kunci rahasia token otentikasi dashboard.
- OPENROUTER_API_KEY: API Key OpenRouter untuk fitur AI (dapat diperoleh gratis di [openrouter.ai](https://openrouter.ai/keys)).

### 4. Jalankan Aplikasi
Jalankan bot beserta web dashboard secara bersamaan:
`ash
npm start
`
*(Atau gunakan perintah 
ode server.js)*

### 5. Hubungkan Bot ke WhatsApp
1. Buka browser dan akses dashboard di: **http://localhost:3000**
2. Buat akun admin dashboard pertama kali.
3. Masuk ke halaman **Bot Hub** atau tab penautan akun.
4. Scan **QR Code** yang muncul menggunakan aplikasi WhatsApp di ponsel Anda (*Perangkat Tertaut / Linked Devices*).
5. Bot siap digunakan!

---

## 🔒 Keamanan & Kebersihan Repositori (Best Practices)

- **JANGAN PERNAH** meng-commit file .env atau folder sesi kredensial (uth_info/, instances/) ke GitHub publik.
- File .gitignore sudah dikonfigurasi secara ketat untuk melindungi:
  - Token API & secret key (.env)
  - Sesi WhatsApp pribadi (uth_info/, creds.json, instances/)
  - Database riwayat obrolan & kontak pribadi pengguna
  - File cache sementara & binary berukuran besar
- Sebelum melakukan commit pertama kali, selalu periksa status file yang akan di-commit dengan:
  `ash
  git status
  `

---

## 📜 Lisensi & Kontribusi

Proyek ini dikembangkan secara modular untuk tujuan edukasi dan otomatisasi produktivitas. Silakan berkontribusi melalui Pull Request atau pelaporan Issue.
