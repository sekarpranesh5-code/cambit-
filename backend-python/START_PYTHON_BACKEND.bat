@echo off
title Cambit - Python Backend Server
echo ========================================================
echo    Starting Cambit Python Backend Server...
echo ========================================================
echo.
cd /d "%~dp0"
pip install -r requirements.txt
python app.py
pause
