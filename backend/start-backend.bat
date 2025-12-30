@echo off
chcp 65001 >nul
echo ========================================
echo Steam 数据采集系统 - 后端启动脚本
echo ========================================
echo.

cd /d %~dp0

echo [1/3] 检查 Python 环境...
python --version
if errorlevel 1 (
    echo 错误: 未找到 Python，请先安装 Python 3.8+
    pause
    exit /b 1
)
echo.

echo [2/3] 安装依赖包...
pip install -r requirements.txt
if errorlevel 1 (
    echo 警告: 部分依赖包安装失败，但将继续启动
)
echo.

echo [3/3] 启动 Flask 后端服务...
echo 服务地址: http://localhost:5000
echo 按 Ctrl+C 停止服务
echo.
python app.py

pause
