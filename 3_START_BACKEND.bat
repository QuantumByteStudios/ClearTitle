@echo off
title 3 - Express Backend & Blockchain Sync Listener
color 0E
echo ===================================================
echo [3/3] Starting Express Backend & Sync Listener
echo ===================================================
echo.
cd /d "%~dp0\backend"

if not exist .env (
    echo [INFO] Copying .env.example to .env
    copy .env.example .env >nul
)

if not exist node_modules (
    echo [INFO] Installing backend dependencies...
    call npm install
)

echo [INFO] Starting Backend Server on port 5000...
call npm run dev
pause

