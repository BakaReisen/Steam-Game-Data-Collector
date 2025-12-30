# Backend API 测试脚本
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "后端 API 测试脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$apiBase = "http://localhost:5000/api"

# 测试健康检查
Write-Host "[1/4] 测试健康检查..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$apiBase/health" -Method Get
    Write-Host "✓ 健康检查成功" -ForegroundColor Green
    Write-Host "  状态: $($response.status)" -ForegroundColor Gray
    Write-Host "  消息: $($response.message)" -ForegroundColor Gray
} catch {
    Write-Host "✗ 健康检查失败: $_" -ForegroundColor Red
    Write-Host "提示: 请先启动后端服务 (.\backend\start-backend.ps1)" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# 测试游戏数据采集
Write-Host "[2/4] 测试游戏数据采集 API..." -ForegroundColor Yellow
try {
    $body = @{
        mode = "sample"
        delay = 1.5
        skipSteamcharts = $false
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$apiBase/collect/start" -Method Post -Body $body -ContentType "application/json"
    $taskId = $response.task_id
    Write-Host "✓ 采集任务已创建" -ForegroundColor Green
    Write-Host "  任务 ID: $taskId" -ForegroundColor Gray
    
    # 获取任务状态
    Start-Sleep -Seconds 2
    $status = Invoke-RestMethod -Uri "$apiBase/collect/status/$taskId" -Method Get
    Write-Host "  任务状态: $($status.status)" -ForegroundColor Gray
    Write-Host "  进度: $($status.progress)%" -ForegroundColor Gray
} catch {
    Write-Host "✗ 采集 API 测试失败: $_" -ForegroundColor Red
}
Write-Host ""

# 测试评论采集
Write-Host "[3/4] 测试评论采集 API..." -ForegroundColor Yellow
try {
    $body = @{
        appId = 570
        gameName = "Dota 2"
        maxReviews = 10
        language = "schinese"
        reviewType = "all"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$apiBase/reviews/start" -Method Post -Body $body -ContentType "application/json"
    Write-Host "✓ 评论采集任务已创建" -ForegroundColor Green
    Write-Host "  任务 ID: $($response.task_id)" -ForegroundColor Gray
} catch {
    Write-Host "✗ 评论 API 测试失败: $_" -ForegroundColor Red
}
Write-Host ""

# 测试模型训练
Write-Host "[4/4] 测试模型训练 API..." -ForegroundColor Yellow
try {
    $body = @{
        inputFile = "Data preprocessing/Source data_cleaned.csv"
        testSize = 0.2
        randomState = 42
        nEstimators = 100
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$apiBase/train/start" -Method Post -Body $body -ContentType "application/json"
    Write-Host "✓ 训练任务已创建" -ForegroundColor Green
    Write-Host "  任务 ID: $($response.task_id)" -ForegroundColor Gray
} catch {
    Write-Host "✗ 训练 API 测试失败: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "测试完成!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
