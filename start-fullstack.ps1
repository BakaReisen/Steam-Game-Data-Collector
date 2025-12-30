# Steam 数据采集系统 - 全栈启动脚本
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Steam 数据采集系统 - 全栈启动脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

Write-Host "[1/2] 启动后端服务..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-File", "backend\start-backend.ps1" -WindowStyle Normal
Start-Sleep -Seconds 3
Write-Host ""

Write-Host "[2/2] 启动前端服务..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd steam-data-frontend; npm start" -WindowStyle Normal
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "服务已启动!" -ForegroundColor Green
Write-Host "后端地址: http://localhost:5000" -ForegroundColor Cyan
Write-Host "前端地址: http://localhost:4200" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "按任意键关闭此窗口 (不会关闭已启动的服务)" -ForegroundColor Yellow
Read-Host
