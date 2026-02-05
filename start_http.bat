
@echo off
echo ========================================
echo Material Management Group
echo Starting HTTP Server (Static Files Only)
echo ========================================
echo.

http-server ./public -p 5000 -a 0.0.0.0

pause
