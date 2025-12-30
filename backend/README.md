# Steam 数据采集系统 - 后端 API

Flask + SocketIO 后端服务，提供游戏数据采集、评论收集、模型训练、数据清洗的 RESTful API。

## 功能特性

- ✅ **游戏数据采集**: 支持多种模式 (示例、自定义、中文评论、SteamSpy、热门游戏)
- ✅ **评论采集**: 采集 Steam 游戏评论，支持语言过滤
- ✅ **模型训练**: 训练 RandomForest 模型预测玩家数
- ✅ **数据清洗**: API + ML + 规则多层次数据补全
- ✅ **实时进度**: WebSocket 实时推送任务进度和日志
- ✅ **异步任务**: 后台线程执行长时间任务

## 快速开始

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 启动服务

**Windows PowerShell:**
```powershell
.\start-backend.ps1
```

**Windows CMD:**
```cmd
start-backend.bat
```

**手动启动:**
```bash
python app.py
```

服务将在 `http://localhost:5000` 启动。

## API 文档

### 通用端点

#### 健康检查
```http
GET /api/health
```

**响应:**
```json
{
  "status": "healthy",
  "message": "Steam 数据采集系统 API 正常运行",
  "timestamp": "2024-01-01T12:00:00"
}
```

#### 获取任务状态
```http
GET /api/tasks/<task_id>
```

**响应:**
```json
{
  "id": "uuid",
  "type": "game_collection",
  "status": "running",
  "progress": 45,
  "message": "正在采集 45/100",
  "logs": [...],
  "created_at": "2024-01-01T12:00:00",
  "updated_at": "2024-01-01T12:05:00"
}
```

#### 取消任务
```http
DELETE /api/tasks/<task_id>
```

---

### 游戏数据采集

#### 开始采集
```http
POST /api/collect/start
Content-Type: application/json

{
  "mode": "sample",           // 模式: sample|custom|chinese_reviews|steamspy|top_games
  "delay": 1.5,               // 请求延迟(秒)
  "skipSteamcharts": false,   // 是否跳过 SteamCharts
  
  // mode=custom 时需要
  "appIds": [570, 730, 440],
  
  // mode=chinese_reviews 时需要
  "threshold": 1000,          // 最小中文评论数
  "maxGames": 100,            // 最大游戏数
  
  // mode=steamspy 或 top_games 时需要
  "limit": 1000               // 游戏数量
}
```

**响应:**
```json
{
  "task_id": "uuid",
  "message": "数据采集任务已启动"
}
```

#### 获取采集状态
```http
GET /api/collect/status/<task_id>
```

#### 下载采集结果
```http
GET /api/collect/download/<task_id>
```

返回 CSV 文件。

---

### 评论采集

#### 开始采集
```http
POST /api/reviews/start
Content-Type: application/json

{
  "gameName": "Dota 2",       // 游戏名称(可选)
  "appId": 570,               // 游戏 AppID(必需)
  "maxReviews": 1000,         // 最大评论数
  "language": "schinese",     // 语言: schinese|english|all
  "reviewType": "all"         // 类型: all|positive|negative
}
```

**响应:**
```json
{
  "task_id": "uuid",
  "message": "评论采集任务已启动"
}
```

#### 获取采集状态
```http
GET /api/reviews/status/<task_id>
```

#### 下载评论数据
```http
GET /api/reviews/download/<task_id>
```

---

### 模型训练

#### 开始训练
```http
POST /api/train/start
Content-Type: application/json

{
  "inputFile": "steam_games_data.csv",  // 输入文件路径(相对或绝对)
  "testSize": 0.2,                      // 测试集比例
  "randomState": 42,                    // 随机种子
  "nEstimators": 100                    // 决策树数量
}
```

**响应:**
```json
{
  "task_id": "uuid",
  "message": "模型训练任务已启动"
}
```

#### 获取训练状态
```http
GET /api/train/status/<task_id>
```

#### 获取训练统计
```http
GET /api/train/stats/<task_id>
```

**响应:**
```json
{
  "current_players": {
    "r2_score": 0.85,
    "mae": 123.45,
    "mse": 456.78
  },
  ...
}
```

#### 下载模型文件
```http
GET /api/train/download/<task_id>/<model_name>
```

`model_name`: `current_players` | `peak_24h` | `peak_alltime`

---

### 数据清洗

#### 开始清洗
```http
POST /api/clean/start
Content-Type: application/json

{
  "inputFile": "steam_games_data.csv",  // 输入文件路径
  "useApi": true,                       // 使用 API 补全
  "useMl": true,                        // 使用 ML 预测
  "useEstimation": true,                // 使用规则估算
  "deleteFailed": false                 // 删除失败行
}
```

**响应:**
```json
{
  "task_id": "uuid",
  "message": "数据清洗任务已启动"
}
```

#### 获取清洗状态
```http
GET /api/clean/status/<task_id>
```

#### 分析缺失值
```http
GET /api/clean/analyze/<task_id>?inputFile=steam_games_data.csv
```

**响应:**
```json
{
  "total_rows": 1000,
  "missing_stats": {
    "当前在线人数": {
      "missing_count": 50,
      "missing_percentage": 5.0
    },
    ...
  }
}
```

#### 下载清洗后的数据
```http
GET /api/clean/download/<task_id>
```

---

## WebSocket 事件

连接 `ws://localhost:5000`

### 客户端事件

#### 加入任务房间
```javascript
socket.emit('join_task', { task_id: 'uuid' });
```

### 服务端事件

#### 任务更新
```javascript
socket.on('task_update', (data) => {
  // data: { task_id, status, progress, message, result }
});
```

#### 任务日志
```javascript
socket.on('task_log', (data) => {
  // data: { task_id, level, message, timestamp }
});
```

#### 连接成功
```javascript
socket.on('connect', () => {
  // 连接成功
});
```

---

## 项目结构

```
backend/
├── app.py                 # Flask 应用主文件
├── requirements.txt       # Python 依赖
├── start-backend.bat      # Windows 启动脚本
├── start-backend.ps1      # PowerShell 启动脚本
└── routes/                # API 路由模块
    ├── collection.py      # 游戏数据采集
    ├── reviews.py         # 评论采集
    ├── training.py        # 模型训练
    └── cleaning.py        # 数据清洗
```

## 技术栈

- **Flask 2.3**: Python Web 框架
- **Flask-CORS**: 跨域资源共享
- **Flask-SocketIO**: WebSocket 支持
- **Threading**: 异步任务管理
- **Pandas**: 数据处理
- **Scikit-learn**: 机器学习

## 依赖说明

```txt
Flask==2.3.0              # Web 框架
Flask-CORS==4.0.0         # CORS 支持
Flask-SocketIO==5.3.0     # WebSocket
python-socketio==5.9.0    # SocketIO 客户端
python-engineio==4.7.0    # Engine.IO
pandas==2.0.0             # 数据处理
requests==2.31.0          # HTTP 请求
beautifulsoup4==4.12.0    # HTML 解析
scikit-learn==1.3.0       # 机器学习
joblib==1.3.0             # 模型序列化
eventlet==0.33.3          # 异步网络库
```

## 错误处理

所有 API 端点统一错误响应格式:

```json
{
  "error": "错误信息描述"
}
```

HTTP 状态码:
- `200`: 成功
- `400`: 请求参数错误
- `404`: 资源不存在
- `500`: 服务器内部错误

## 注意事项

1. **端口占用**: 确保 5000 端口未被占用
2. **CORS 配置**: 默认允许所有源，生产环境请修改 `CORS(app, origins=[...])`
3. **文件路径**: 支持绝对路径和相对路径(相对于项目根目录)
4. **任务管理**: 任务数据仅保存在内存中，重启服务会丢失
5. **并发限制**: 长时间任务使用后台线程，避免阻塞主线程

## 开发调试

启用 Flask 调试模式:

```python
# app.py
socketio.run(app, host='0.0.0.0', port=5000, debug=True)
```

查看实时日志:

```bash
python app.py
```

测试 API:

```bash
# 健康检查
curl http://localhost:5000/api/health

# 开始采集
curl -X POST http://localhost:5000/api/collect/start \
  -H "Content-Type: application/json" \
  -d '{"mode": "sample"}'
```

## 许可证

本项目仅供学习使用。
