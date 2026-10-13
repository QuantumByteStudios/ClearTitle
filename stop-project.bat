@echo off
title Stop All Services
echo ========================================================
echo   Stopping all Hardhat, Backend, and Frontend processes...
echo ========================================================
taskkill /F /IM node.exe >nul 2>&1
echo.
echo All Node.js processes terminated.
echo.
pause

