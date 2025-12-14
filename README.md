# Steam 游戏数据采集与分析系统

## 📖 项目说明

本项目是一个完整的 **Steam 游戏数据采集与分析系统**,专为商务数据分析课程设计。通过集成多个数据源和机器学习技术,实现了从数据采集、清洗、补全到深度分析的全流程自动化。

### 🎯 项目目标

- **数据采集**: 从 Steam、SteamSpy、SteamCharts 等多个平台采集游戏数据
- **数据清洗**: 智能识别缺失值,结合 API 和机器学习模型自动补全
- **用户洞察**: 收集和分析游戏评论,理解玩家情感和偏好
- **预测分析**: 训练机器学习模型,预测游戏在线人数峰值
- **商务智能**: 支持定价策略、市场趋势、用户行为等多维度分析

### 🌟 项目特色

1. **多源数据整合**: 集成 4+ 个数据源,确保数据完整性和准确性
2. **智能数据补全**: 当 API 不可用时,使用 RandomForest 模型预测缺失数据
3. **端到端自动化**: 从数据采集到清洗分析,全流程自动化处理
4. **用户评论分析**: 19 个维度的评论数据,支持情感分析和用户画像
5. **可扩展架构**: 模块化设计,易于扩展新的数据源或分析功能
6. **详尽文档**: 完整的使用文档、故障排除和代码示例

### 📊 适用场景

- **商务数据分析**: 市场趋势、定价策略、竞争分析
- **用户研究**: 玩家行为、偏好分析、情感挖掘
- **预测建模**: 游戏成功预测、在线人数预测
- **推荐系统**: 基于用户行为的游戏推荐
- **学术研究**: 游戏产业数据研究、机器学习应用

### 🛠️ 技术栈

- **Python 3.11+**: 核心开发语言
- **Pandas**: 数据处理和分析
- **scikit-learn**: 机器学习模型训练
- **Requests + BeautifulSoup**: 数据采集和网页爬虫
- **Steam API / SteamSpy API**: 官方和第三方数据接口

---

## ⚡ 重要更新 (v3.0)

**完整的数据采集、清洗、分析工作流!**

- ✅ **数据采集** (`datacollect.py`) - 多源游戏数据采集
- ✅ **数据清洗** (`data_cleaner.py`) - 智能数据补全与清洗
- ✅ **机器学习** (`train_ml_model.py`) - 在线人数预测模型
- ✅ **评论采集** (`collect_reviews.py`) - 用户评论数据收集
- ✅ **评论合并** (`merge_reviews.py`) - 批量评论数据整合
- 🔄 **智能回退机制** - 自动尝试多个数据源

详见: [第三方数据源指南](THIRD_PARTY_SOURCES.md)

---

## 核心功能模块

### 1. 数据采集 (`datacollect.py`)

集成多个数据源,全面采集 Steam 游戏的商务分析数据:

### 数据源
1. **Steam Official API** - 基础游戏信息、价格、平台支持
2. **SteamSpy API** - 销量估算、玩家数据、评分统计 ⭐ 可作为游戏列表来源
3. **SteamCharts** (网页爬虫) - 历史在线人数、峰值数据
4. **IsThereAnyDeal** (网页爬虫) - 历史最低价格

### 采集的数据维度

#### 1. 基础信息
- AppID - Steam 唯一标识
- Name - 游戏名称
- Type - 类型 (game/dlc)
- Release_Date - 发行日期
- Developers - 开发商
- Publishers - 发行商
- Genres - 游戏类型标签
- Categories - 游戏分类

#### 2. 价格与销售数据
- Is_Free - 是否免费
- Currency - 货币类型
- Initial_Price - 原价
- Final_Price - 现价
- Discount_Percent - 折扣百分比
- Price_Formatted - 格式化价格
- **Historical_Low_Price** - 历史最低价 (ITAD)
- **Historical_Low_Date** - 历史最低价日期
- **Historical_Low_Store** - 历史最低价商店

#### 3. 用户反馈与活跃度
- Metacritic_Score - Metacritic 评分
- Total_Reviews - 总评论数
- **Positive_Reviews** - 好评数 (SteamSpy)
- **Negative_Reviews** - 差评数 (SteamSpy)
- **Positive_Rate** - 好评率百分比 (计算得出)
- **User_Score** - 用户评分 0-100 (SteamSpy)
- **Owners** - 拥有者数量范围 (SteamSpy)
- **Players_Forever** - 总玩家数 (SteamSpy)
- **Players_2Weeks** - 最近2周玩家数 (SteamSpy)
- **Average_Playtime_Forever** - 平均游戏时长 (分钟)
- **Median_Playtime_Forever** - 中位数游戏时长
- Current_Players - 当前在线人数
- **Peak_Players_24h** - 24小时峰值 (SteamCharts)
- **Peak_Players_AllTime** - 历史最高在线 (SteamCharts)
- **Avg_Players_30d** - 30天平均在线 (SteamCharts)

#### 4. 技术与支持
- Supported_Languages - 支持的语言
- Windows - 支持 Windows
- Mac - 支持 macOS
- Linux - 支持 Linux
- Required_Age - 年龄限制
- DLC_Count - DLC 数量
- Achievements - 成就数量
- Short_Description - 简短描述

**粗体标注** 的字段为高价值数据维度!

### 2. 数据清洗 (`data_cleaner.py`)

智能数据补全与清洗引擎:
- 自动检测关键字段缺失值
- 使用 Steam API 尝试补全数据
- **机器学习预测**: 当 API 无法获取时,使用训练好的 RandomForest 模型预测在线人数
- 智能价格填充: 仅价格缺失时填充 "Free"
- 删除无法修复的异常记录

### 3. 机器学习 (`train_ml_model.py`)

训练预测模型:
- 训练 3 个 RandomForest 模型预测在线人数相关指标
- 自动保存模型文件 (`.pkl` 格式)
- 生成特征重要性分析报告
- 提供详细的训练统计和性能指标

### 4. 评论采集 (`collect_reviews.py`)

交互式评论收集工具:
- 用户输入驱动,无需修改代码
- 指定游戏 AppID 和收集数量
- 支持好评/差评分别收集
- 多语言过滤 (简体中文/英语/繁体中文/全部)
### 方式 2: 在代码中使用

#### 数据采集
```python
from datacollect import SteamDataCollector

# 初始化采集器
collector = SteamDataCollector()

# 定义要采集的游戏 AppID
app_ids = [570, 730, 440]  # Dota 2, CS:GO, TF2

# 开始采集
df = collector.collect_games_data(
    app_ids=app_ids,
    delay=2.0,  # 请求间隔时间(秒)
    save_interval=20  # 每20个游戏保存检查点
)

# 保存数据
collector.save_to_csv(df, "my_steam_data.csv")
```

#### 数据清洗
```python
from Data.preprocessing.data_cleaner import SteamDataCleaner

cleaner = SteamDataCleaner()
cleaner.clean_data("Source data.csv", "Source data_cleaned.csv")
```

#### 评论收集
```python
from collect_reviews import SteamReviewCollector

collector = SteamReviewCollector()
df = collector.collect_reviews_for_game(
    app_id=1086940,
    game_name="博德之门3",
    num_positive=100,
    num_negative=100,
    language='schinese'
)
df.to_csv("reviews.csv", index=False, encoding='utf-8-sig')
```

#### 评论合并
```python
import pandas as pd
import glob

csv_files = glob.glob("DATA/reviews/*.csv")
all_reviews = []
for file in csv_files:
    df = pd.read_csv(file, encoding='utf-8-sig')
    all_reviews.append(df)

merged_df = pd.concat(all_reviews, ignore_index=True)
merged_df.to_csv("all_reviews_merged.csv", index=False, encoding='utf-8-sig')
```据分析 (可选): `matplotlib`, `seaborn`

## 完整工作流程

### 步骤 1: 数据采集

```powershell
python datacollect.py
```

根据提示选择采集模式:
- 选项 1: 采集 10 个示例热门游戏
- 选项 2: 自定义采集数量
- 选项 3: 采集简体中文评论数 > 1000 的游戏
- 选项 4: 大规模采集 - SteamSpy Top 1000-10000 (推荐)

输出文件: `steam_games_data_YYYYMMDD_HHMMSS.csv`

### 步骤 2: 数据清洗与补全

```powershell
python Data\ preprocessing\\data_cleaner.py
```

功能:
- 检测关键字段的缺失值
- 使用 Steam API 自动补全数据
- **机器学习预测**: 当无法从 API 获取数据时,使用训练好的模型预测在线人数
- 删除无法修复的异常记录
- 智能价格填充(仅价格缺失时填充 "Free")

输入: `Source data.csv`  
输出: `Source data_cleaned.csv`

### 步骤 3: 训练机器学习模型 (可选)

```powershell
python Data\ preprocessing\\train_ml_model.py
```

功能:
- 训练 3 个 RandomForest 模型预测:
  - 当前在线人数 (`current_players`)
  - 24小时峰值 (`peak_24h`)
  - 历史最高在线 (`peak_alltime`)
- 自动保存模型为 `.pkl` 文件
- 生成特征重要性报告
- 生成训练统计报告 (`MODEL_TRAINING_REPORT.md`)

输出:
- `model_current_players.pkl`
- `model_peak_24h.pkl`
- `model_peak_alltime.pkl`
- `model_training_stats.json`
- `feature_importance.txt`

### 步骤 4: 收集用户评论

```powershell
python collect_reviews.py
```

功能:
- 交互式输入游戏 AppID 和名称
- 指定收集好评和差评的数量
- 支持语言过滤 (简体中文/英语/繁体中文/所有)
- 自动保存到 `DATA/reviews/` 目录
- 支持连续收集多个游戏

数据字段:
- 用户信息: 用户ID、游戏时长、拥有游戏数
- 评论内容: 评论文本、是否推荐、发布时间
- 互动数据: 有用数、搞笑数、评论质量

### 步骤 5: 合并评论数据

```powershell
python merge_reviews.py
```

功能:
- 自动扫描 `DATA/reviews/` 文件夹
- 合并所有评论 CSV 文件
- 生成统计报告 (游戏分布、好评率、语言分布)
- 输出: `DATA/all_reviews_merged.csv`

---
## 注意事项

### 1. 请求频率限制
- **数据采集**: 默认 1.5 秒/游戏 + 额外 API 调用延迟
- **数据清洗**: 使用机器学习模型预测,避免过度 API 调用
- **评论采集**: 内置速率限制处理,自动处理 HTTP 429 错误
- 建议不要设置过短的延迟时间,避免被 API 限流
- SteamCharts 和 ITAD 使用网页爬虫,更容易触发反爬机制
# 1. 采集游戏数据
python datacollect.py
# 选择选项 1 (示例游戏) 或选项 4 (大规模采集)

# 2. 清洗数据
python Data\ preprocessing\\data_cleaner.py

# 3. 收集评论 (可选)
python collect_reviews.py
```

### 方式 2: 在代码中使用

```python
from datacollect import SteamDataCollector

# 初始化采集器
collector = SteamDataCollector()

# 定义要采集的游戏 AppID
app_ids = [570, 730, 440]  # Dota 2, CS:GO, TF2

# 开始采集
df = collector.collect_games_data(
    app_ids=app_ids,
    delay=2.0,  # 请求间隔时间(秒)
    save_interval=20  # 每20个游戏保存检查点
)

# 保存数据
collector.save_to_csv(df, "my_steam_data.csv")
```

## 注意事项

### 1. 请求频率限制
- 脚本已内置延迟机制 (默认 1.5 秒/游戏 + 额外 API 调用延迟)
- 建议不要设置过短的延迟时间,避免被 API 限流
- SteamCharts 和 ITAD 使用网页爬虫,更容易触发反爬机制

### 2. 数据可用性
- **SteamSpy**: 对于新游戏或小众游戏,数据可能不准确或缺失
- **SteamCharts**: 只有在 SteamCharts 上有记录的游戏才能获取数据
- **ITAD**: 历史价格数据可能不完整,建议申请 API Key 提高准确性

### 3. 反爬机制
- SteamCharts 和 ITAD 可能有 Cloudflare 保护
- 如果遇到频繁失败,建议:
  - 增加延迟时间
  - 使用代理 IP
### 4. 性能优化建议

**数据采集**:
- 小规模测试: 10-50 个游戏
- 中等规模: 100-500 个游戏 (预计 5-15 分钟)
## 数据分析建议

采集完成后,你可以进行以下分析:

### 1. 游戏数据分析 (`Source data_cleaned.csv`)

**定价策略分析**:
- 不同类型游戏的价格分布
- 折扣力度与销量的关系
- 历史最低价与当前价格的差异
- 免费游戏 vs 付费游戏的在线人数对比

**市场趋势分析**:
- 每年发布的游戏数量变化
- 热门类型的演变 (Action, RPG, Indie...)
- 地区差异分析 (语言支持对销量的影响)

**用户行为分析**:
- 好评率与销量的相关性
- 游戏时长与用户满意度
- 多人游戏 vs 单机游戏的留存差异
- 在线人数峰值规律分析

**厂商竞争分析**:
## 故障排除

### 问题 1: `ModuleNotFoundError: No module named 'xxx'`
**解决方案**: 
```powershell
pip install -r requirements.txt
```

### 问题 2: SteamCharts 数据全部为 None
**原因**: 游戏可能没有在 SteamCharts 上记录,或网站结构发生变化
**解决方案**: 这是正常现象,数据清洗时会使用机器学习模型预测

### 问题 3: 数据清洗提示 "模型文件不存在"
**解决方案**: 
```powershell
python Data\ preprocessing\\train_ml_model.py
```
先训练模型,再运行数据清洗

### 问题 4: 评论收集遇到 HTTP 429 错误
**原因**: Steam API 速率限制
**解决方案**: 脚本会自动等待 30 秒后重试,无需手动干预

### 问题 5: 采集速度太慢
**解决方案**: 
- **数据采集**: 注释掉 SteamCharts 或 ITAD 的调用
- **数据清洗**: 使用 ML 模型预测,避免频繁 API 调用
- **评论收集**: 减少每个游戏的评论数量

### 问题 6: sklearn 警告 "X does not have valid feature names"
**解决方案**: 已在 `data_cleaner.py` 中修复,使用 DataFrame 而非 numpy 数组
## 输出文件

### 数据采集输出
- `steam_games_data_YYYYMMDD_HHMMSS.csv` - 原始采集数据
- `steam_data_checkpoint_N.csv` - 检查点文件 (每 N 个游戏保存一次)

### 数据清洗输出
- `Source data_cleaned.csv` - 清洗后的完整数据
- `data_cleaning_report_YYYYMMDD_HHMMSS.txt` - 清洗报告

### 机器学习输出
- `model_current_players.pkl` - 当前在线人数预测模型
- `model_peak_24h.pkl` - 24小时峰值预测模型
- `model_peak_alltime.pkl` - 历史最高在线预测模型
- `model_training_stats.json` - 训练统计数据
- `feature_importance.txt` - 特征重要性报告
- `MODEL_TRAINING_REPORT.md` - 完整训练报告

### 评论采集输出
- `DATA/reviews/{游戏名称}_reviews.csv` - 单个游戏的评论数据
- `DATA/all_reviews_merged.csv` - 合并后的所有评论数据
- 游戏生命周期中的口碑变化
- 更新/DLC 发布对评价的影响

**互动质量分析**:
- 有用数、搞笑数与评论质量的关系
- 高质量评论的特征识别
- 评论权重分数的计算逻辑验证

### 3. 机器学习应用

**预测模型**:
- 基于游戏特征预测在线人数峰值
- 预测游戏成功概率 (好评率、销量)
- 评论文本的情感分类

**推荐系统**:
- 基于用户评论的游戏推荐
- 相似游戏识别 (基于标签、类型、玩家重叠)

**异常检测**:
- 识别刷评论/刷分行为
- 检测价格异常波动
2. **市场趋势分析**
   - 每年发布的游戏数量变化
   - 热门类型的演变 (Action, RPG, Indie...)
   - 地区差异分析 (语言支持对销量的影响)

3. **用户行为分析**
   - 好评率与销量的相关性
   - 游戏时长与用户满意度
   - 多人游戏 vs 单机游戏的留存差异

4. **厂商竞争分析**
   - 头部开发商/发行商的市场份额
   - 独立游戏 vs 大厂游戏的表现
   - 不同平台支持策略的效果

## 故障排除

### 问题 1: `ModuleNotFoundError: No module named 'bs4'`
**解决方案**: 
```powershell
pip install beautifulsoup4
```

### 问题 2: SteamCharts 数据全部为 None
**原因**: 游戏可能没有在 SteamCharts 上记录,或网站结构发生变化
**解决方案**: 这是正常现象,专注于使用 SteamSpy 的玩家数据

### 问题 3: 采集速度太慢
**解决方案**: 
- 减少每个游戏的 API 调用次数
- 注释掉 SteamCharts 或 ITAD 的调用
- 只使用 Steam API + SteamSpy (速度最快)

## API Key 申请 (可选)

### IsThereAnyDeal API Key
1. 访问 https://isthereanydeal.com/dev/app/
2. 注册并申请 API Key
3. 修改代码中的 `get_itad_price_history` 方法使用官方 API

### Steam Web API Key
虽然本脚本的主要功能不需要 Steam API Key,但如果需要获取更多用户相关数据:
1. 访问 https://steamcommunity.com/dev/apikey
2. 填写域名信息并同意条款
3. 获取 Key 后传入 `SteamDataCollector(api_key="YOUR_KEY")`

## 输出文件

- `steam_games_data_YYYYMMDD_HHMMSS.csv` - 最终完整数据
- `steam_data_checkpoint_N.csv` - 检查点文件 (每 N 个游戏保存一次)

## 许可证

本脚本仅供教育和研究用途。请遵守各数据源的使用条款:
- Steam API: https://steamcommunity.com/dev/apiterms
- SteamSpy API: https://steamspy.com/about
- 网页爬虫请遵守 robots.txt 和网站使用条款
