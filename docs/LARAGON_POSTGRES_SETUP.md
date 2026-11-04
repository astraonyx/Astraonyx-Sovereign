# Panduan Penggunaan Laragon & PostgreSQL untuk Astraonyx Polaris

Dokumen ini menjelaskan cara menghubungkan **Astraonyx Polaris** dengan **Laragon** dan basis data **PostgreSQL** tanpa merusak basis data SQLite bawaan.

---

## 1. Konfigurasi PostgreSQL di Laragon

1. Buka **Laragon**.
2. Klik kanan pada jendela Laragon → **PostgreSQL** → Pilih versi PostgreSQL yang aktif.
3. Klik tombol **Start All** di Laragon.
4. Buka terminal Laragon atau PgAdmin / DBeaver / HeidiSQL:
   - **Host:** `127.0.0.1`
   - **Port:** `5432`
   - **User:** `postgres`
   - **Password:** (sesuai setelan Laragon, bawaan: `root` atau kosong)
5. Buat database baru bernama `polaris_db`:
   ```sql
   CREATE DATABASE polaris_db;
   ```

---

## 2. Menjalankan Migrasi Skema & Data ke PostgreSQL

Skrip migrasi otomatis telah disiapkan di root proyek:
```bash
node scripts/migrate-sqlite-to-postgres.js
```

Perintah ini akan secara otomatis:
- Membaca 38 tabel dari `database/polaris.sqlite`.
- Menghasilkan file DDL PostgreSQL di `database/migrations/postgres_schema.sql`.
- Menghasilkan file data seed di `database/migrations/postgres_seed.sql`.
- Menjaga file SQLite asli tetap **100% aman dan tidak terhapus**.

### Eksekusi ke Database PostgreSQL di Laragon:
Jalankan di terminal (PowerShell atau Bash Laragon):
```bash
# Import Skema
psql -h 127.0.0.1 -U postgres -d polaris_db -f database/migrations/postgres_schema.sql

# Import Data Seed
psql -h 127.0.0.1 -U postgres -d polaris_db -f database/migrations/postgres_seed.sql
```

---

## 3. Menjalankan Laravel Companion API di Laragon

1. Salin folder `laravel-bridge/` ke direktori web Laragon (biasanya `C:\laragon\www\polaris-laravel` atau jalankan langsung dari proyek ini).
2. Salin `.env.example` menjadi `.env`:
   ```bash
   cd laravel-bridge
   copy .env.example .env
   ```
3. Sesuaikan `DB_PASSWORD` di file `.env` jika password postgres Anda berbeda.
4. Jalankan server Laravel:
   ```bash
   php artisan serve --port=8000
   ```
5. Endpoint API Laravel kini aktif di:
   - Status WhatsApp Bot: `http://localhost:8000/api/v1/bot/status`
   - Daftar Pengguna: `http://localhost:8000/api/v1/auth/users`
   - Data Kebiasaan Atomic: `http://localhost:8000/api/v1/atomic/habits`
   - Bank Kuis Wayground: `http://localhost:8000/api/v1/wayground/quizzes`
