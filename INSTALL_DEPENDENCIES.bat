@echo off
title Installing All Dependencies for Land Registry System
color 0E
echo ========================================================
echo       INSTALLING ALL PROJECT DEPENDENCIES
echo ========================================================
echo.

echo [1/3] Installing Smart Contract Dependencies (Hardhat, OpenZeppelin, Chai)...
cd /d "%~dp0\contracts"
if not exist .env copy .env.example .env >nul
call npm install
echo [DONE] Smart Contract dependencies installed.
echo.

echo [2/3] Installing Backend Dependencies (Express, Mongoose, ethers, JWT)...
cd /d "%~dp0\backend"
if not exist .env copy .env.example .env >nul
call npm install
echo [DONE] Backend dependencies installed.
echo.

echo [3/3] Installing Frontend Dependencies (React, Vite, Tailwind, Recharts)...
cd /d "%~dp0\frontend"
if not exist .env copy .env.example .env >nul
call npm install
echo [DONE] Frontend dependencies installed.
echo.

echo ========================================================
echo   SUCCESS! All dependencies have been installed!
echo   You can now double-click RUN_ALL.bat to start.
echo ========================================================
pause

