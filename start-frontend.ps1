# Steam 游戏数据采集器 - 前端快速启动脚本
# 用途: 一键启动 Angular 前端开发服务器

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Steam 游戏数据采集器 - 前端启动中..." -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 设置前端目录路径
$frontendDir = Join-Path $PSScriptRoot "steam-data-frontend"

# 检查前端目录是否存在
if (-Not (Test-Path $frontendDir)) {
    Write-Host "❌ 错误: 找不到前端目录 'steam-data-frontend'" -ForegroundColor Red
    Write-Host "请确保脚本在项目根目录下运行" -ForegroundColor Yellow
    pause
    exit 1
}

# 进入前端目录
Set-Location $frontendDir
Write-Host "📂 切换到前端目录: $frontendDir" -ForegroundColor Green

# 检查 node_modules 是否存在
if (-Not (Test-Path "node_modules")) {
    Write-Host ""
    Write-Host "⚠️  检测到依赖未安装" -ForegroundColor Yellow
    Write-Host "正在安装 npm 依赖，这可能需要几分钟时间..." -ForegroundColor Yellow
    Write-Host ""
    
    npm install
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "❌ 依赖安装失败，请检查 Node.js 和 npm 是否正确安装" -ForegroundColor Red
        Write-Host "建议手动运行: cd steam-data-frontend; npm install" -ForegroundColor Yellow
        pause
        exit 1
    }
    
    Write-Host ""
    Write-Host "✅ 依赖安装完成!" -ForegroundColor Green
}

# 停止之前可能运行的 Angular 开发服务器
Write-Host ""
Write-Host "🔄 检查并停止之前运行的开发服务器..." -ForegroundColor Yellow
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# 启动开发服务器并自动打开浏览器
Write-Host ""
Write-Host "🚀 启动 Angular 开发服务器..." -ForegroundColor Green
Write-Host "📱 浏览器将自动打开 http://localhost:4200/" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 提示:" -ForegroundColor Yellow
Write-Host "   - 按 Ctrl+C 停止服务器" -ForegroundColor Gray
Write-Host "   - 代码修改会自动热更新" -ForegroundColor Gray
Write-Host "   - 首次编译可能需要 10-30 秒" -ForegroundColor Gray
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan

# 启动开发服务器
npm start
