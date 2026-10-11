@echo off
title Cambit - College Canteen Pre-Order System
echo ========================================================
echo    Starting Cambit Canteen Smart Pre-Order System...
echo ========================================================
echo.
cd /d "%~dp0"
start "" http://localhost:3000
node server.js
pause
