@echo off
cd /d "%~dp0"
start "Stampin Data Server" /min cmd /c "node server.js"
timeout /t 1 /nobreak >nul
start "" http://localhost:3000
