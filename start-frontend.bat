@echo off
REM Steam 游戏数据采集器 - 前端快速启动脚本 (CMD 版本)
REM 用途: 一键启动 Angular 前端开发服务器

echo =====================================
echo Steam 游戏数据采集器 - 前端启动中...
echo =====================================
echo.

cd /d "%~dp0steam-data-frontend"

if not exist "%cd%\package.json" (
    echo [错误] 找不到前端目录 'steam-data-frontend'
    echo 请确保脚本在项目根目录下运行
    pause
    exit /b 1
)

echo [信息] 切换到前端目录: %cd%
echo.

if not exist "node_modules\" (
    echo [警告] 检测到依赖未安装
    echo 正在安装 npm 依赖，这可能需要几分钟时间...
    echo.
    
    call npm install
    
    if errorlevel 1 (
        echo.
        echo [错误] 依赖安装失败，请检查 Node.js 和 npm 是否正确安装
        echo 建议手动运行: cd steam-data-frontend ^&^& npm install
        pause
        exit /b 1
    )
    
    echo.
    echo [成功] 依赖安装完成!
)

echo.
echo [信息] 检查并停止之前运行的开发服务器...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo.
echo [启动] Angular 开发服务器...
echo [浏览器] 将自动打开 http://localhost:4200/
echo.
echo 提示:
echo    - 按 Ctrl+C 停止服务器
echo    - 代码修改会自动热更新
echo    - 首次编译可能需要 10-30 秒
echo.
echo =====================================
echo.

npm start
