@echo off
rem Starts the Coach Bouguerra site for testing. Close this window to stop it.
cd /d "%~dp0"
title Coach Bouguerra - dev server (http://localhost:3100)

rem open the browser a few seconds from now, once the server is ready
start /b cmd /c "timeout /t 8 /nobreak >nul & start http://localhost:3100/fr"

echo.
echo   Coach Bouguerra  -  http://localhost:3100
echo   (first page after a fresh start takes about 10 seconds)
echo   Close this window to stop the server.
echo.
call npm run dev -- --port 3100
pause
