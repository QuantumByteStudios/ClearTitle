@echo off
title 4 - React Vite Frontend
color 0D
echo ===================================================
echo [4/4] Starting React + Vite Frontend
echo ===================================================
echo.
cd /d "%~dp0\frontend"

if not exist .env (
    echo [INFO] Copying .env.example to .env
    copy .env.example .env >nul
)

if not exist node_modules (
    echo [INFO] Installing frontend dependencies...
    call npm install
)

echo [INFO] Starting Vite Dev Server...
echo Once ready, open http://localhost:5173 in your browser.
call npm run dev
pause

