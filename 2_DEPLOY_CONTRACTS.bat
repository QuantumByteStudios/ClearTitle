@echo off
title 2 - Deploy Contracts to Local Node
color 0B
echo ===================================================
echo [2/3] Deploying Contracts & Setting Up Roles
echo ===================================================
echo.
cd /d "%~dp0\contracts"

if not exist .env (
    echo [INFO] Copying .env.example to .env
    copy .env.example .env >nul
)

echo [INFO] Deploying LandRegistry contract to localhost...
call npx hardhat run scripts/deploy.js --network localhost

echo.
echo [INFO] Granting Registrar roles to admin account...
call npx hardhat run scripts/setup-roles.js --network localhost

echo.
echo ===================================================
echo Contracts deployed successfully! You can close this window.
echo ===================================================
pause

