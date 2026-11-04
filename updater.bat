@echo off
chcp 65001 >nul
title Astraonyx Polaris - Snapshot Updater Engine
cls
echo ========================================================
echo        ASTRAONYX POLARIS - SNAPSHOT UPDATER ENGINE
echo ========================================================
echo.
echo [1] Terapkan Snapshot Update (dari file zip)
echo [2] Validasi Sintaks Kode (node --check)
echo [3] Rollback ke Backup Sebelumnya
echo [4] Keluar
echo.
set /p choice="Pilih opsi [1-4]: "

if "%choice%"=="1" goto update
if "%choice%"=="2" goto check
if "%choice%"=="3" goto rollback
if "%choice%"=="4" goto exit

:update
echo.
echo Menjalankan proses update...
node scripts\updater.js
pause
goto exit

:check
echo.
echo Menjalankan validasi sintaks...
node scripts\updater.js --check
pause
goto exit

:rollback
echo.
echo Menjalankan proses rollback...
node scripts\updater.js --rollback
pause
goto exit

:exit
echo.
echo Selesai.
