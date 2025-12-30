@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
echo ========================================
echo Steam 数据采集系统 - 全栈启动脚本
echo ========================================
echo.

cd /d %~dp0

echo [1/2] 启动后端服务...
start "Steam Backend" cmd /k "cd backend && start-backend.bat"
echo 等待后端服务启动...
timeout /t 8 /nobreak >nul
echo.

echo [2/2] 启动前端服务...
start "Steam Frontend" cmd /k "cd steam-data-frontend && npm start"
echo 等待前端服务启动...
echo.

echo [3/3] 检测服务状态并打开浏览器...
echo 正在检测后端服务 (http://localhost:5000)...

set backend_ready=0
for /L %%i in (1,1,10) do (
    powershell -Command "try { $null = Invoke-WebRequest -Uri 'http://localhost:5000/api/health' -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop; Write-Host ''; exit 0 } catch { exit 1 }" >nul 2>&1
    if !errorlevel! equ 0 (
        set backend_ready=1
        goto backend_ok
    )
    echo 尝试 %%i/10 - 后端服务尚未就绪，2秒后重试...
    timeout /t 2 /nobreak >nul
)
:backend_ok
if %backend_ready% equ 0 (
    echo ⚠ 警告: 后端服务检测超时，但可能已启动
    echo 请手动检查: http://localhost:5000/api/health
) else (
    echo ✓ 后端服务已就绪
)
echo.

echo 正在检测前端服务 (http://localhost:4200)...
set frontend_ready=0
for /L %%i in (1,1,30) do (
    powershell -Command "try { $null = Invoke-WebRequest -Uri 'http://localhost:4200' -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop; Write-Host ''; exit 0 } catch { exit 1 }" >nul 2>&1
    if !errorlevel! equ 0 (
        set frontend_ready=1
        goto frontend_ok
    )
    echo 尝试 %%i/30 - 前端服务尚未就绪，2秒后重试...
    timeout /t 2 /nobreak >nul
)
:frontend_ok
if %frontend_ready% equ 0 (
    echo ⚠ 警告: 前端服务检测超时
    echo 请手动访问: http://localhost:4200
) else (
    echo ✓ 前端服务已就绪
)
echo.

echo ========================================
echo 🎉 服务启动完成!
echo 后端地址: http://localhost:5000
echo 前端地址: http://localhost:4200
echo ========================================
echo.

if %frontend_ready% equ 1 (
    echo 正在打开浏览器...
    timeout /t 1 /nobreak >nul
    start http://localhost:4200
    echo ✓ 浏览器已打开
) else (
    echo ℹ 请手动访问: http://localhost:4200
)
echo.

echo 按任意键关闭此窗口 (不会关闭已启动的服务)
pause >nul
