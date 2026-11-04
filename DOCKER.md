# 🐳 Panduan Deployment Docker: Polaris WhatsApp Bot & Cyberpunk Dashboard

Panduan lengkap untuk menjalankan **Polaris WhatsApp Bot** menggunakan Docker dan Docker Compose di lingkungan lokal maupun VPS Linux (Ubuntu, Debian, dsb).

---

## ⚡ Fitur Container
- **Multi-Bot Cluster Ready**: Mendukung banyak akun WhatsApp sekaligus melalui panel dashboard.
- **SQLite 3 dengan WAL Mode**: Performa tinggi tanpa overhead memori server.
- **FFmpeg & Build Essentials**: Mendukung konversi audio, stiker bergerak WebP, serta kompilasi native C++.
- **Volume Persistensi Otomatis**: Sesi login WhatsApp (`auth_info`), database SQLite (`database`), dan log tersimpan permanen di host server.
- **Healthcheck Terintegrasi**: Memantau kesehatan instance via endpoint `/api/health`.

---

## 🚀 1-Click Run dengan Docker Compose

### 1. Prasyarat
Pastikan server/laptop Anda telah terpasang:
- Docker Engine (versi 20.10+)
- Docker Compose (v2+)

### 2. Jalankan Container
Cukup jalankan satu perintah berikut di folder proyek:

```bash
docker compose up -d --build
```

Docker akan mengompilasi image, menginstal dependensi native, dan menjalankan bot di latar belakang (background mode).

### 3. Cek Status & Log Container
Untuk memantau log realtime proses inisialisasi bot dan dashboard:

```bash
docker logs -f polaris-bot-instance
```

Untuk memeriksa status container dan healthcheck:

```bash
docker ps
```

---

## 🌐 Mengakses Cyberpunk Dashboard

Buka peramban (browser) Anda dan akses:
```
http://localhost:3000
```
*(Ganti `localhost` dengan IP VPS publik jika di-deploy di cloud server).*

- **Login Dashboard**: Gunakan akun admin Polaris Anda.
- **Koneksi WhatsApp**: Masuk ke tab **Overview / Multi-Bot Cluster**, klik tombol **Launch Bot (QR Mode)** untuk memindai QR code atau pilih **Pairing Code Mode** untuk memasukkan kode 8 digit ke ponsel Anda tanpa perlu scan kamera.

---

## 📂 Struktur Volume Persisten

Container Polaris memetakan volume penting ke sistem file host agar data tidak hilang saat container di-restart atau di-update:

| Direktori Host | Di Dalam Container | Kegunaan |
|---|---|---|
| `./auth_info` | `/app/auth_info` | Kunci sesi login Baileys & WhatsApp Multi-Device |
| `./database` | `/app/database` | Database utama `polaris.sqlite` & backup JSON |
| `./logs` | `/app/logs` | Catatan error runtime dan audit log |
| `./tmp` | `/app/tmp` | Cache temporer download & konversi media |

---

## 🔄 Pembaruan & Restart Bot

Jika Anda melakukan modifikasi kode atau menarik update terbaru:

```bash
# Hentikan container
docker compose down

# Build ulang dan jalankan container baru
docker compose up -d --build
```

---

## 💾 Backup & Pemeliharaan Database SQLite

Seluruh data bot (akun, preferensi whitelist, grup terdaftar, histori unduhan, metrik analitik, dan aturan auto-responder) tersimpan dalam satu file SQLite:

```bash
./database/polaris.sqlite
```

Untuk membuat backup cepat:
```bash
# Salin file SQLite saat bot berjalan (didukung penuh oleh SQLite WAL mode)
cp ./database/polaris.sqlite ./database/polaris_backup_$(date +%Y%m%d_%H%M%S).sqlite
```

---

## 🛠️ Troubleshooting

1. **Port 3000 Bentrok dengan Aplikasi Lain**:
   Ubah variabel `PORT` di file `.env` atau jalankan:
   ```bash
   PORT=8080 docker compose up -d
   ```
2. **Container Keluar / Status Unhealthy**:
   Periksa log detail:
   ```bash
   docker logs --tail 100 polaris-bot-instance
   ```
3. **Reset Sesi Login WhatsApp (QR Ulang)**:
   Hapus isi folder `auth_info` lalu restart container:
   ```bash
   rm -rf auth_info/*
   docker compose restart
   ```
