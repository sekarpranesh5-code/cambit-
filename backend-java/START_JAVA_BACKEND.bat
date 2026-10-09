@echo off
title Cambit - Java Spring Boot Backend Server
echo ========================================================
echo    Starting Cambit Spring Boot Backend Server...
echo ========================================================
echo.
cd /d "%~dp0"
call mvn spring-boot:run
pause
