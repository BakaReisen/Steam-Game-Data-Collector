import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SteamApiService, TrainingRequest, TaskStatus } from '../../services/steam-api.service';
import { interval, Subscription } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';

interface TrainingConfig {
  dataFile: string;
  trainCurrentPlayers: boolean;
  trainPeak24h: boolean;
  trainPeakAllTime: boolean;
  testSize: number;
  nEstimators: number;
  maxDepth: number;
  randomState: number;
}

interface TrainingProgress {
  currentModel: string;
  completed: number;
  total: number;
  percentage: number;
  status: string;
}

interface TrainingResult {
  modelName: string;
  mae: number;
  rmse: number;
  r2: number;
  trainSamples: number;
  featureImportance: Array<{name: string, importance: number}>;
}

interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

@Component({
  selector: 'app-model-training',
  imports: [CommonModule, FormsModule],
  templateUrl: './model-training.component.html',
  styleUrl: './model-training.component.scss'
})
export class ModelTrainingComponent implements OnDestroy {
  currentTaskId: string | null = null;
  statusCheckSubscription: Subscription | null = null;
  config: TrainingConfig = {
    dataFile: 'Source data.csv',
    trainCurrentPlayers: true,
    trainPeak24h: true,
    trainPeakAllTime: true,
    testSize: 0.2,
    nEstimators: 100,
    maxDepth: 20,
    randomState: 42
  };

  progress: TrainingProgress = {
    currentModel: '',
    completed: 0,
    total: 0,
    percentage: 0,
    status: ''
  };

  results: TrainingResult[] = [];
  logs: LogEntry[] = [];
  isTraining: boolean = false;
  trainingComplete: boolean = false;

  constructor(private apiService: SteamApiService) {}

  ngOnDestroy(): void {
    this.stopStatusCheck();
  }

  hasSelectedModel(): boolean {
    return this.config.trainCurrentPlayers || 
           this.config.trainPeak24h || 
           this.config.trainPeakAllTime;
  }

  startTraining(): void {
    if (!this.hasSelectedModel()) {
      this.addLog('请至少选择一个模型进行训练', 'error');
      return;
    }

    this.isTraining = true;
    this.trainingComplete = false;
    this.results = [];
    this.logs = [];
    this.resetProgress();

    this.addLog('开始机器学习模型训练...', 'info');
    this.addLog(`数据文件: ${this.config.dataFile}`, 'info');

    const request: TrainingRequest = {
      inputFile: this.config.dataFile,
      testSize: this.config.testSize,
      randomState: this.config.randomState,
      nEstimators: this.config.nEstimators
    };

    this.apiService.startTraining(request).subscribe({
      next: (response) => {
        this.currentTaskId = response.task_id;
        this.addLog(`任务已创建: ${response.task_id}`, 'success');
        this.startStatusCheck();
      },
      error: (error) => {
        this.addLog(`启动失败: ${error.error?.error || error.message}`, 'error');
        this.isTraining = false;
      }
    });
  }

  stopTraining(): void {
    this.isTraining = false;
    this.addLog('训练已停止', 'warning');
  }

  resetConfig(): void {
    this.config = {
      dataFile: 'Source data.csv',
      trainCurrentPlayers: true,
      trainPeak24h: true,
      trainPeakAllTime: true,
      testSize: 0.2,
      nEstimators: 100,
      maxDepth: 20,
      randomState: 42
    };
    this.resetProgress();
    this.results = [];
    this.logs = [];
    this.trainingComplete = false;
  }

  private resetProgress(): void {
    const total = (this.config.trainCurrentPlayers ? 1 : 0) +
                  (this.config.trainPeak24h ? 1 : 0) +
                  (this.config.trainPeakAllTime ? 1 : 0);
    
    this.progress = {
      currentModel: '',
      completed: 0,
      total: total,
      percentage: 0,
      status: ''
    };
  }

  private simulateTraining(): void {
    const models: string[] = [];
    if (this.config.trainCurrentPlayers) models.push('当前在线人数');
    if (this.config.trainPeak24h) models.push('24小时峰值');
    if (this.config.trainPeakAllTime) models.push('历史最高在线');

    let currentIdx = 0;

    const trainNextModel = () => {
      if (currentIdx >= models.length || !this.isTraining) {
        if (currentIdx >= models.length) {
          this.completeTraining();
        }
        return;
      }

      const modelName = models[currentIdx];
      this.progress.currentModel = modelName;
      this.progress.status = `正在训练 ${modelName} 模型...`;
      this.addLog(`📊 开始训练: ${modelName}`, 'info');

      // 模拟训练步骤
      const steps = [
        '读取数据...',
        '提取特征...',
        '分割训练集/测试集...',
        '训练 RandomForest 模型...',
        '评估模型性能...',
        '计算特征重要性...'
      ];

      let stepIdx = 0;
      const stepInterval = setInterval(() => {
        if (stepIdx >= steps.length || !this.isTraining) {
          clearInterval(stepInterval);
          
          // 生成模拟结果
          const result = this.generateMockResult(modelName);
          this.results.push(result);
          
          this.addLog(`✅ ${modelName} 训练完成 - R²: ${result.r2.toFixed(4)}, MAE: ${result.mae.toFixed(0)}`, 'success');
          
          currentIdx++;
          this.progress.completed = currentIdx;
          this.progress.percentage = Math.round((currentIdx / models.length) * 100);
          
          setTimeout(trainNextModel, 500);
          return;
        }

        this.progress.status = steps[stepIdx];
        this.addLog(`  ${steps[stepIdx]}`, 'info');
        stepIdx++;
      }, 800);
    };

    trainNextModel();
  }

  private generateMockResult(modelName: string): TrainingResult {
    const features = [
      { name: 'peak_24h', importance: 0.35 },
      { name: 'playtime_avg', importance: 0.22 },
      { name: 'game_age_years', importance: 0.18 },
      { name: 'playtime_price_ratio', importance: 0.12 },
      { name: 'price_numeric', importance: 0.08 },
      { name: 'is_free', importance: 0.05 }
    ];

    return {
      modelName: modelName,
      mae: Math.random() * 5000 + 2000,
      rmse: Math.random() * 8000 + 3000,
      r2: Math.random() * 0.2 + 0.8,
      trainSamples: Math.floor(Math.random() * 500 + 1500),
      featureImportance: features
    };
  }

  private completeTraining(): void {
    this.isTraining = false;
    this.trainingComplete = true;
    this.progress.status = '训练完成';
    this.addLog('🎉 所有模型训练完成!', 'success');
  }

  private addLog(message: string, type: LogEntry['type']): void {
    this.logs.push({
      timestamp: new Date(),
      message,
      type
    });

    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }
  }

  downloadModels(): void {
    if (this.currentTaskId) {
      this.addLog('开始下载模型文件...', 'info');
      // 下载所有训练好的模型
      const models = ['current_players', 'peak_24h', 'peak_alltime'];
      models.forEach(modelName => {
        const url = this.apiService.downloadModel(this.currentTaskId!, modelName);
        window.open(url, '_blank');
      });
    } else {
      alert('没有可下载的模型');
    }
  }

  viewReport(): void {
    if (this.currentTaskId && this.results.length > 0) {
      this.addLog('正在生成训练报告...', 'info');
      
      const reportWindow = window.open('', '_blank');
      if (reportWindow) {
        const modelsHtml = this.results.map(result => `
          <div class="model-card">
            <h3>🎯 ${result.modelName}</h3>
            <div class="metrics-grid">
              <div class="metric">
                <div class="metric-label">MAE</div>
                <div class="metric-value">${result.mae.toFixed(4)}</div>
              </div>
              <div class="metric">
                <div class="metric-label">MSE</div>
                <div class="metric-value">${result.rmse.toFixed(4)}</div>
              </div>
              <div class="metric">
                <div class="metric-label">RMSE</div>
                <div class="metric-value">${result.rmse.toFixed(4)}</div>
              </div>
              <div class="metric">
                <div class="metric-label">R²</div>
                <div class="metric-value" style="color: ${result.r2 > 0.8 ? '#10b981' : result.r2 > 0.6 ? '#f59e0b' : '#ef4444'}">${result.r2.toFixed(4)}</div>
              </div>
            </div>
            <div class="feature-importance">
              <div class="importance-title">特征重要性</div>
              ${result.featureImportance.slice(0, 5).map((f: any, i: number) => `
                <div class="importance-item">
                  <span class="importance-rank">#${i + 1}</span>
                  <span class="importance-name">${f.feature}</span>
                  <div class="importance-bar">
                    <div class="importance-fill" style="width: ${f.importance * 100}%"></div>
                  </div>
                  <span class="importance-value">${(f.importance * 100).toFixed(2)}%</span>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('');
        
        reportWindow.document.write(`
          <html>
            <head>
              <title>模型训练报告</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; }
                .container { max-width: 1400px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); padding: 40px; }
                h1 { color: #2d3748; margin-bottom: 10px; font-size: 32px; }
                .subtitle { color: #718096; margin-bottom: 30px; }
                .model-card { background: #f7fafc; border-radius: 12px; padding: 30px; margin: 20px 0; border: 2px solid #e2e8f0; }
                .model-card h3 { color: #2d3748; margin-top: 0; margin-bottom: 20px; font-size: 24px; }
                .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
                .metric { background: white; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0; }
                .metric-label { color: #718096; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
                .metric-value { color: #2d3748; font-size: 28px; font-weight: bold; }
                .feature-importance { background: white; padding: 20px; border-radius: 8px; }
                .importance-title { color: #2d3748; font-weight: 600; margin-bottom: 15px; font-size: 16px; }
                .importance-item { display: grid; grid-template-columns: 40px 200px 1fr 80px; gap: 10px; align-items: center; margin: 10px 0; }
                .importance-rank { color: #a0aec0; font-weight: bold; }
                .importance-name { color: #4a5568; font-weight: 500; }
                .importance-bar { background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden; }
                .importance-fill { background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); height: 100%; transition: width 0.3s; }
                .importance-value { color: #667eea; font-weight: 600; text-align: right; }
                .config-section { background: #f7fafc; padding: 25px; border-radius: 8px; margin: 20px 0; }
                .config-title { font-size: 20px; color: #2d3748; margin-bottom: 15px; font-weight: 600; }
                .config-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
                .timestamp { color: #a0aec0; font-size: 14px; margin-top: 30px; text-align: center; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>🤖 机器学习模型训练报告</h1>
                <p class="subtitle">任务ID: ${this.currentTaskId}</p>
                
                <div class="config-section">
                  <div class="config-title">⚙️ 训练配置</div>
                  <div class="config-row">
                    <span>数据文件</span>
                    <span><strong>${this.config.dataFile}</strong></span>
                  </div>
                  <div class="config-row">
                    <span>测试集比例</span>
                    <span><strong>${(this.config.testSize * 100).toFixed(0)}%</strong></span>
                  </div>
                  <div class="config-row">
                    <span>随机种子</span>
                    <span><strong>${this.config.randomState}</strong></span>
                  </div>
                  <div class="config-row">
                    <span>决策树数量</span>
                    <span><strong>${this.config.nEstimators}</strong></span>
                  </div>
                </div>
                
                ${modelsHtml}
                
                <p class="timestamp">报告生成时间: ${new Date().toLocaleString('zh-CN')}</p>
              </div>
            </body>
          </html>
        `);
      }
    } else {
      alert('没有可查看的训练报告');
    }
  }

  private startStatusCheck(): void {
    if (!this.currentTaskId) return;

    this.statusCheckSubscription = interval(2000)
      .pipe(
        switchMap(() => this.apiService.getTrainingStatus(this.currentTaskId!)),
        takeWhile((status) => status.status === 'running' || status.status === 'pending', true)
      )
      .subscribe({
        next: (status) => {
          this.updateProgressFromStatus(status);
        },
        error: (error) => {
          this.addLog(`状态查询失败: ${error.message}`, 'error');
          this.stopStatusCheck();
        }
      });
  }

  private stopStatusCheck(): void {
    if (this.statusCheckSubscription) {
      this.statusCheckSubscription.unsubscribe();
      this.statusCheckSubscription = null;
    }
  }

  private updateProgressFromStatus(status: TaskStatus): void {
    this.progress.percentage = status.progress;
    this.progress.status = status.message;

    if (status.logs && status.logs.length > 0) {
      status.logs.forEach(log => {
        const logType = log.level === 'success' ? 'success' : 
                        log.level === 'error' ? 'error' :
                        log.level === 'warning' ? 'warning' : 'info';
        
        const exists = this.logs.some(l => l.message === log.message);
        if (!exists) {
          this.addLog(log.message, logType);
        }
      });
    }

    if (status.status === 'completed') {
      this.handleTrainingComplete(status);
    } else if (status.status === 'failed') {
      this.handleTrainingFailed(status);
    }
  }

  private handleTrainingComplete(status: TaskStatus): void {
    this.isTraining = false;
    this.trainingComplete = true;

    this.addLog('🎉 所有模型训练完成!', 'success');
    this.stopStatusCheck();
  }

  private handleTrainingFailed(status: TaskStatus): void {
    this.isTraining = false;
    this.addLog(`❌ 训练失败: ${status.error || '未知错误'}`, 'error');
    this.stopStatusCheck();
  }
}
