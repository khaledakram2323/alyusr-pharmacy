@echo off
title Al-Yusr Pharmacy — Public Share Link
cd /d "%~dp0"

echo ========================================================
echo   Al-Yusr Pharmacy — Shareable Online Link
echo ========================================================
echo.

if not exist "node_modules\" (
    echo Installing dependencies for the first time...
    call npm install
    echo.
)

echo [1/2] Building latest production version...
call npm run build

echo.
echo [2/2] Starting local server in background on port 4173...
start "Al-Yusr Preview Server" /min cmd /c "npx vite preview --host --port 4173 --strictPort"

timeout /t 2 /nobreak >nul
start "" "http://localhost:4173"

echo.
echo ========================================================
echo   Creating public HTTPS link below (copy the https://*.lhr.life URL):
echo ========================================================
echo.
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:localhost:4173 nokey@localhost.run
pause
