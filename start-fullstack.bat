@echo off
chcp 65001 >nul
echo ========================================
echo Steam 数据采集系统 - 全栈启动脚本
echo ========================================
echo.

cd /d %~dp0

echo [1/2] 启动后端服务...
start "Steam Backend" cmd /k "cd backend && start-backend.bat"
timeout /t 3 /nobreak >nul
echo.

echo [2/2] 启动前端服务...
start "Steam Frontend" cmd /k "cd steam-data-frontend && npm start"
echo.

echo ========================================
echo 服务已启动!
echo 后端地址: http://localhost:5000
echo 前端地址: http://localhost:4200
echo ========================================
echo.
echo 按任意键关闭此窗口 (不会关闭已启动的服务)
pause >nul
