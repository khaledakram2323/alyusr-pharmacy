@echo off
title Al-Yusr Pharmacy — Local Server
cd /d "%~dp0"

echo ========================================================
echo   Al-Yusr Pharmacy Website
echo ========================================================
echo.

if not exist "node_modules\" (
    echo Installing dependencies for the first time...
    call npm install
    echo.
)

echo Starting server and opening browser...
echo (Keep this window open while using the site. Press Ctrl+C to stop.)
echo.
call npm run dev -- --host --open
pause
