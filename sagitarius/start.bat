@echo off
title LUMINA HD - AI Image Enhancer Studio
echo ===============================================================
echo     LUMINA HD // AI IMAGE ENHANCER (Upscale + Wink + Remini)
echo ===============================================================
echo.
echo [*] Memeriksa virtual environment...

if not exist "backend\venv\Scripts\python.exe" (
    echo [!] Virtual environment belum dibuat. Menyiapkan venv...
    python -m venv backend\venv
    call backend\venv\Scripts\pip install -r backend\requirements.txt
)

echo [*] Membuka browser ke http://localhost:8000 ...
start http://localhost:8000

echo [*] Menjalankan Server LUMINA HD AI...
echo [i] Tekan CTRL+C di terminal ini untuk mematikan server.
echo.

cd backend
venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause
