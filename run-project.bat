@echo off
title Land Ownership Registry System - Launcher
color 0B

echo ====================================================================
echo        LAND OWNERSHIP REGISTRY SYSTEM - AUTOMATIC LAUNCHER
echo ====================================================================
echo.

set "ROOT_DIR=%~dp0"
set "CONTRACTS_DIR=%ROOT_DIR%contracts"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"

echo [1/4] Starting Hardhat Local Blockchain Node on Port 8545...
start "1. Hardhat Blockchain Node (8545)" cmd /k "cd /d "%CONTRACTS_DIR%" && npx hardhat node"

echo       Waiting 6 seconds for blockchain to initialize...
timeout /t 6 /nobreak >nul

echo.
echo [2/4] Deploying LandRegistry Smart Contract to Localhost...
cd /d "%CONTRACTS_DIR%"
call npx hardhat run scripts/deploy.js --network localhost
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Contract deployment failed! Check the Hardhat node window.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2.5/4] Setting up Roles and Admin Permissions...
call npx hardhat run scripts/setup-roles.js --network localhost

echo.
echo [3/4] Starting Backend Express API Server (Port 5000)...
start "2. Backend API Server (5000)" cmd /k "cd /d "%BACKEND_DIR%" && npm run dev"

echo.
echo [4/4] Starting Frontend Vite Client (Port 5173)...
start "3. Frontend Web App (5173)" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

echo.
echo       Waiting 4 seconds for frontend dev server...
timeout /t 4 /nobreak >nul

echo.
echo Launching Web Browser at http://localhost:5173 ...
start http://localhost:5173

echo.
echo ====================================================================
echo   SUCCESS! All services are active:
echo     - Hardhat RPC Node : http://127.0.0.1:8545
echo     - Backend API      : http://localhost:5000
echo     - Frontend Web App : http://localhost:5173
echo.
echo   Keep the terminal windows open while testing.
echo ====================================================================
pause

