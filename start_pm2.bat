
@echo off
echo ========================================
echo Material Management Group
echo Starting with PM2 Process Manager...
echo ========================================
echo.

pm2 start ecosystem.config.js
pm2 logs

pause
