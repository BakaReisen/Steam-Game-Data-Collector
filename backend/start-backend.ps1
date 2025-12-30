# Steam 数据采集系统 - 后端启动脚本
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Steam 数据采集系统 - 后端启动脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

Write-Host "[1/3] 检查 Python 环境..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python 版本: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "错误: 未找到 Python，请先安装 Python 3.8+" -ForegroundColor Red
    Read-Host "按任意键退出"
    exit 1
}
Write-Host ""

Write-Host "[2/3] 安装依赖包..." -ForegroundColor Yellow
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "警告: 部分依赖包安装失败，但将继续启动" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "[3/3] 启动 Flask 后端服务..." -ForegroundColor Yellow
Write-Host "服务地址: http://localhost:5000" -ForegroundColor Green
Write-Host "按 Ctrl+C 停止服务" -ForegroundColor Yellow
Write-Host ""

python app.py
