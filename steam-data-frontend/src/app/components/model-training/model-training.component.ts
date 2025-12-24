import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
export class ModelTrainingComponent {
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
    this.addLog(`测试集比例: ${this.config.testSize * 100}%`, 'info');

    // 模拟训练过程
    this.simulateTraining();
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
    this.addLog('正在生成模型文件...', 'info');
    alert('模型下载功能将在后端 API 完成后实现');
  }

  viewReport(): void {
    this.addLog('正在生成详细报告...', 'info');
    alert('报告查看功能将在后续开发');
  }
}
