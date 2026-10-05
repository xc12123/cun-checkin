@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ⏳ 正在启动浏览器，请稍候...
node auto-login.js
pause
