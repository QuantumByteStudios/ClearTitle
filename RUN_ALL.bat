@echo off
title Launch Entire Land Registry System
color 0F
echo ========================================================
echo   Launching Land Ownership Registry System
echo ========================================================
echo.
echo [1/4] Launching Local Blockchain Node in a new window...
start "1 - Hardhat Blockchain Node" cmd /c "%~dp01_START_NODE.bat"

echo Waiting 5 seconds for node to initialize...
timeout /t 5 /nobreak >nul

echo [2/4] Deploying Smart Contracts...
call "%~dp02_DEPLOY_CONTRACTS.bat"

echo [3/4] Launching Express Backend & Event Listener...
start "3 - Express Backend" cmd /c "%~dp03_START_BACKEND.bat"

echo [4/4] Launching React Vite Frontend...
start "4 - React Frontend" cmd /c "%~dp04_START_FRONTEND.bat"

echo.
echo ========================================================
echo  All services started!
echo  Frontend will be live at: http://localhost:5173
echo ========================================================
pause

