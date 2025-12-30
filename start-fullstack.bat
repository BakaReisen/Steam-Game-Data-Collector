@echo off
chcp 65001 >nul
echo ========================================
echo Steam 数据采集系统 - 全栈启动脚本
echo ========================================
echo.

cd /d %~dp0

echo [1/2] 启动后端服务...
start "Steam Backend" cmd /k "cd backend && start-backend.bat"
echo 等待后端服务启动...
timeout /t 5 /nobreak >nul
echo.

echo [2/2] 启动前端服务...
start "Steam Frontend" cmd /k "cd steam-data-frontend && npm start"
echo 等待前端服务启动...
echo.

echo [3/3] 检测服务状态并打开浏览器...
echo 正在检测后端服务 (http://localhost:5000)...

:check_backend
timeout /t 2 /nobreak >nul
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:5000/api/health' -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 (
    echo 后端服务尚未就绪，继续等待...
    goto check_backend
)
echo ✓ 后端服务已就绪

echo 正在检测前端服务 (http://localhost:4200)...
:check_frontend
timeout /t 2 /nobreak >nul
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:4200' -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 (
    echo 前端服务尚未就绪，继续等待...
    goto check_frontend
)
echo ✓ 前端服务已就绪
echo.

echo ========================================
echo 🎉 所有服务已成功启动!
echo 后端地址: http://localhost:5000
echo 前端地址: http://localhost:4200
echo ========================================
echo.
echo 正在打开浏览器...
timeout /t 1 /nobreak >nul
start http://localhost:4200
echo.

echo 按任意键关闭此窗口 (不会关闭已启动的服务)
pause >nul
