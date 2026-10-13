@echo off
title 1 - Hardhat Local Blockchain Node
color 0A
echo ===================================================
echo [1/3] Starting Hardhat Localhost Blockchain Node
echo ===================================================
echo.
cd /d "%~dp0\contracts"

if not exist node_modules (
    echo [INFO] Installing smart contract dependencies...
    call npm install
)

echo [INFO] Compiling Smart Contracts...
call npx hardhat compile

echo.
echo [INFO] Launching node on http://127.0.0.1:8545
echo Keep this window OPEN. Do NOT close it.
echo.
call npx hardhat node
pause

