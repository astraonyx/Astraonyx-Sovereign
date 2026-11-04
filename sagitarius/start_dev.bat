@echo off
title LUMINA HD - Dev Mode (FastAPI + Vite)
echo ===============================================================
echo     LUMINA HD // Development Mode (FastAPI + Vite Hot Reload)
echo ===============================================================
echo.

start "LUMINA Backend" cmd /k "cd backend && venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 2 >nul

start "LUMINA Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 3 >nul

start http://localhost:5173
