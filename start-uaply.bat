@echo off
rem Starts the three UAply servers on this computer: prod 8765, sandbox 8766 and dev 8767.
rem Double-click this file after the computer restarts (a restart stops them, and the app then says "Could not reach the server").
rem Each server opens in its own minimized window; close that window to stop it. It never touches your saved data.
cd /d "%~dp0"
start "UAply prod 8765" /min python serve.py 8765 prod
start "UAply sandbox 8766" /min python serve.py 8766 sandbox --api
start "UAply dev 8767" /min python serve.py 8767 dev --api
echo.
echo Started. Open these in your browser:
echo   Prod     http://localhost:8765
echo   Sandbox  http://localhost:8766
echo   Dev      http://localhost:8767
echo.
timeout /t 6 >nul
