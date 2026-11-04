# LUMINA HD // AI Image Enhancer Studio 🚀
### (Super-Resolution • Wink Beauty Glow • Remini Face Restoration)

Aplikasi web modern untuk meningkatkan resolusi foto (Super-Resolution), merestorasi wajah dan mata buram (Face Restoration ala Remini), serta memoles kehalusan kulit dan vibrance warna (Aesthetic Polish ala Wink).

---

## ✨ Fitur Unggulan

1. **🌟 Remini Face HD**
   - Mendeteksi wajah secara otomatis menggunakan **OpenCV YuNet** (5 facial landmarks).
   - Merekonstruksi detail iris mata, bulu mata, alis, gigi, dan tekstur kulit menggunakan **GFPGAN v1.4 ONNX**.
   - Blending wajah mulus tanpa garis potongan (*smooth Gaussian feather mask*).

2. **✨ Wink Beauty Glow**
   - **Porcelain Skin Smoothing:** Menghaluskan noda kasar kulit dengan *Bilateral Filtering* tanpa mengaburkan tepi mata atau bibir.
   - **Micro-Contrast (CLAHE):** Memberikan kedalaman warna (*dynamic pop*) seperti filter kamera pro Meitu/Wink.
   - **Smart Clarity:** Memperjelas detail mikro dengan *high-pass unsharp masking*.
   - **Color Vibrance:** Meningkatkan kehangatan dan saturasi warna alami.

3. **📸 Ultra Photo 4K (Real-ESRGAN)**
   - Super-Resolution 2x dan 4x untuk pemandangan, pakaian, arsitektur, dan foto umum.
   - Didukung akselerasi hardware via **Vulkan API** pada **Intel UHD Graphics / iGPU** — tanpa perlu GPU diskrit NVIDIA mahal!

4. **🎨 Anime & Manga HD**
   - Model `realesrgan-x4plus-anime` untuk mempertajam garis gambar digital, komik, kartun, dan logo tanpa pixelated.

5. **🎛️ Interactive Before/After Split Slider**
   - Geser pembatas kiri/kanan untuk membandingkan pixel asli vs hasil AI secara real-time.
   - Fitur **Zoom In (hingga 400%)**, Zoom Out, dan **Pan / Drag** untuk memeriksa detail mata dan pori-pori secara dekat.

6. **⚙️ Custom Pro Fine-Tuning**
   - Slider pengaturan manual: kekuatan restorasi wajah (0-100%), ketajaman (0-100%), kehalusan kulit (0-100%), dan vibrance warna (0-100%).
   - Pilihan ekspor: **PNG (Lossless)**, **JPG (High Quality 96%)**, atau **WebP (Ringan)**.

7. **✂️ Hapus Background Otomatis (Bria RMBG-1.4 ONNX)**
   - Segmentasi subjek presisi tinggi untuk helai rambut, lekuk tubuh, produk, dan pakaian.
   - Eksekusi kilat ~1 detik via ONNX Runtime CPU.
   - **Mode Instan 1-Klik:** Potong langsung dari foto yang diunggah tanpa perlu menunggu upscale.
   - **Pilihan Latar Belakang:** Transparan (PNG Lossless), Putih Bersih, Hitam Pekat, Pas Foto Merah (#E11D48), Pas Foto Biru (#2563EB), dan Bokeh Blur Portrait DSLR.
   - **Ganti Latar Interaktif:** Bisa mengganti warna latar belakang langsung pada hasil review secara real-time.

---

## 🏗️ Struktur Project

```text
Sagitarius/
├── backend/
│   ├── bin/
│   │   ├── realesrgan-ncnn-vulkan.exe     # Binary super-resolution Vulkan
│   │   └── models/                        # Model Real-ESRGAN x4plus, anime
│   ├── models/
│   │   ├── face_detection_yunet_2023mar.onnx  # YuNet face detector
│   │   ├── GFPGANv1.4.onnx                # Model restorasi wajah Remini
│   │   └── rmbg-1.4.onnx                  # Model potong background Bria RMBG
│   ├── uploads/                           # Direktori gambar yang diunggah
│   ├── outputs/                           # Direktori hasil peningkatan HD
│   ├── sr_engine.py                       # Wrapper Real-ESRGAN
│   ├── face_engine.py                     # Wrapper GFPGAN & YuNet
│   ├── wink_engine.py                     # Filter kehalusan kulit & ketajaman Wink
│   ├── bg_engine.py                       # Engine Hapus Background AI (RMBG-1.4)
│   ├── main.py                            # Server FastAPI & API endpoints
│   └── requirements.txt                   # Dependensi Python
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── ComparisonSlider.jsx       # Komponen slider Before/After interaktif
│   │   ├── App.jsx                        # Tampilan utama & kontrol preset
│   │   └── index.css                      # Tailwind styling
│   └── dist/                              # Build production frontend
├── start.bat                              # Launcher 1-klik untuk Windows
├── start_dev.bat                          # Launcher mode developer (Vite + FastAPI)
└── README.md
```

---

## 🚀 Cara Menjalankan

### Cara 1: Sekali Klik (Rekomendasi untuk Pengguna Windows)
Cukup klik dua kali file:
👉 **`start.bat`**
- Server backend akan berjalan otomatis di `http://localhost:8000`.
- Browser akan langsung terbuka otomatis menampilkan aplikasi web.

---

### Cara 2: Menjalankan Manual via Terminal
1. Buka terminal di folder project:
   ```powershell
   cd backend
   venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
   ```
2. Buka browser dan kunjungi:
   `http://localhost:8000`

---

### Cara 3: Mode Pengembangan (Vite Hot-Reload)
Jika ingin mengubah kode frontend secara langsung:
```powershell
# Di terminal 1:
cd backend
venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# Di terminal 2:
cd frontend
npm run dev
```
Buka `http://localhost:5173`.
