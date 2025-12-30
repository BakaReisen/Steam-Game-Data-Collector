import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SteamApiService, CleaningRequest, TaskStatus } from '../../services/steam-api.service';
import { interval, Subscription } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';

interface CleaningConfig {
  inputFile: string;
  outputFile: string;
  useApiCompletion: boolean;
  useMlPrediction: boolean;
  removeInvalid: boolean;
  generateReport: boolean;
}

interface CleaningProgress {
  processed: number;
  total: number;
  fixed: number;
  removed: number;
  percentage: number;
  status: string;
}

interface CleaningStats {
  apiFixed: number;
  mlFixed: number;
  simpleFilled: number;
  totalTime: string;
  avgSpeed: number;
}

interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

@Component({
  selector: 'app-data-cleaning',
  imports: [CommonModule, FormsModule],
  templateUrl: './data-cleaning.component.html',
  styleUrl: './data-cleaning.component.scss'
})
export class DataCleaningComponent implements OnDestroy {
  currentTaskId: string | null = null;
  statusCheckSubscription: Subscription | null = null;
  config: CleaningConfig = {
    inputFile: 'Source data.csv',
    outputFile: 'Source data_cleaned.csv',
    useApiCompletion: true,
    useMlPrediction: true,
    removeInvalid: true,
    generateReport: true
  };

  progress: CleaningProgress = {
    processed: 0,
    total: 0,
    fixed: 0,
    removed: 0,
    percentage: 0,
    status: ''
  };

  stats: CleaningStats = {
    apiFixed: 0,
    mlFixed: 0,
    simpleFilled: 0,
    totalTime: '0 秒',
    avgSpeed: 0
  };

  logs: LogEntry[] = [];
  isCleaning: boolean = false;
  cleaningComplete: boolean = false;
  startTime: Date | null = null;

  constructor(private apiService: SteamApiService) {}

  ngOnDestroy(): void {
    this.stopStatusCheck();
  }

  startCleaning(): void {
    this.isCleaning = true;
    this.cleaningComplete = false;
    this.startTime = new Date();
    this.resetProgress();
    this.logs = [];

    this.addLog(`开始数据清洗: ${this.config.inputFile}`, 'info');
    
    const request: CleaningRequest = {
      inputFile: this.config.inputFile,
      useApi: this.config.useApiCompletion,
      useMl: this.config.useMlPrediction,
      useEstimation: true,
      deleteFailed: this.config.removeInvalid
    };

    this.apiService.startCleaning(request).subscribe({
      next: (response) => {
        this.currentTaskId = response.task_id;
        this.addLog(`任务已创建: ${response.task_id}`, 'success');
        this.startStatusCheck();
      },
      error: (error) => {
        this.addLog(`启动失败: ${error.error?.error || error.message}`, 'error');
        this.isCleaning = false;
      }
    });
  }

  stopCleaning(): void {
    this.isCleaning = false;
    this.addLog('清洗已停止', 'warning');
  }

  resetConfig(): void {
    this.config = {
      inputFile: 'Source data.csv',
      outputFile: 'Source data_cleaned.csv',
      useApiCompletion: true,
      useMlPrediction: true,
      removeInvalid: true,
      generateReport: true
    };
    this.resetProgress();
    this.logs = [];
    this.cleaningComplete = false;
  }

  private resetProgress(): void {
    this.progress = {
      processed: 0,
      total: 1000, // 模拟总数
      fixed: 0,
      removed: 0,
      percentage: 0,
      status: ''
    };

    this.stats = {
      apiFixed: 0,
      mlFixed: 0,
      simpleFilled: 0,
      totalTime: '0 秒',
      avgSpeed: 0
    };
  }

  private simulateCleaning(): void {
    const total = this.progress.total;
    let processed = 0;

    this.addLog('📂 读取数据文件...', 'info');
    this.progress.status = '读取数据...';

    setTimeout(() => {
      this.addLog(`✅ 读取完成,总记录数: ${total}`, 'success');
      this.progress.status = '检测缺失值...';
      this.addLog('🔍 检测关键字段缺失值...', 'info');

      const interval = setInterval(() => {
        if (!this.isCleaning || processed >= total) {
          clearInterval(interval);
          if (processed >= total) {
            this.completeCleaning();
          }
          return;
        }

        // 模拟处理记录
        const batchSize = Math.min(50, total - processed);
        processed += batchSize;

        // 随机生成修复和删除
        const needsFix = Math.floor(Math.random() * batchSize * 0.3);
        const needsRemove = Math.floor(Math.random() * batchSize * 0.05);

        this.progress.processed = processed;
        this.progress.fixed += needsFix;
        this.progress.removed += needsRemove;
        this.progress.percentage = Math.round((processed / total) * 100);

        // 模拟不同的修复方法
        if (needsFix > 0) {
          const apiFixed = Math.floor(needsFix * 0.5);
          const mlFixed = Math.floor(needsFix * 0.3);
          const simpleFilled = needsFix - apiFixed - mlFixed;

          this.stats.apiFixed += apiFixed;
          this.stats.mlFixed += mlFixed;
          this.stats.simpleFilled += simpleFilled;

          if (apiFixed > 0 && this.config.useApiCompletion) {
            this.addLog(`🌐 API 补全: ${apiFixed} 条记录`, 'success');
          }
          if (mlFixed > 0 && this.config.useMlPrediction) {
            this.addLog(`🤖 ML 预测: ${mlFixed} 条记录`, 'success');
          }
        }

        if (needsRemove > 0 && this.config.removeInvalid) {
          this.addLog(`❌ 删除无效记录: ${needsRemove} 条`, 'warning');
        }

        this.progress.status = `正在处理... (${processed}/${total})`;

      }, 100); // 加速模拟
    }, 1000);
  }

  private completeCleaning(): void {
    this.isCleaning = false;
    this.cleaningComplete = true;
    this.progress.status = '清洗完成';

    // 计算耗时
    if (this.startTime) {
      const elapsed = new Date().getTime() - this.startTime.getTime();
      const seconds = Math.floor(elapsed / 1000);
      this.stats.totalTime = seconds > 60 
        ? `${Math.floor(seconds / 60)} 分钟 ${seconds % 60} 秒`
        : `${seconds} 秒`;
      this.stats.avgSpeed = Math.round(this.progress.total / (elapsed / 1000));
    }

    this.addLog('🎉 数据清洗完成!', 'success');
    this.addLog(`💾 保存文件: ${this.config.outputFile}`, 'success');

    if (this.config.generateReport) {
      this.addLog('📄 生成清洗报告...', 'info');
    }
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

  downloadCleaned(): void {
    if (this.currentTaskId) {
      const url = this.apiService.downloadCleanedData(this.currentTaskId);
      window.open(url, '_blank');
      this.addLog('开始下载清洗数据...', 'info');
    } else {
      alert('没有可下载的数据');
    }
  }

  viewReport(): void {
    if (this.currentTaskId) {
      this.addLog('正在生成清洗报告...', 'info');
      
      // 生成清洗报告 HTML
      const reportWindow = window.open('', '_blank');
      if (reportWindow) {
        const totalProcessed = this.stats.apiFixed + this.stats.mlFixed + this.stats.simpleFilled;
        const successRate = totalProcessed > 0 ? ((totalProcessed / (totalProcessed + 1)) * 100).toFixed(2) : '0';
        
        reportWindow.document.write(`
          <html>
            <head>
              <title>数据清洗报告</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; }
                .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); padding: 40px; }
                h1 { color: #2d3748; margin-bottom: 10px; font-size: 32px; }
                .subtitle { color: #718096; margin-bottom: 30px; }
                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0; }
                .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 10px; color: white; text-align: center; }
                .stat-value { font-size: 48px; font-weight: bold; margin: 10px 0; }
                .stat-label { font-size: 14px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; }
                .section { margin: 30px 0; padding: 25px; background: #f7fafc; border-radius: 8px; border-left: 4px solid #667eea; }
                .section-title { font-size: 20px; color: #2d3748; margin-bottom: 15px; font-weight: 600; }
                .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
                .info-label { color: #4a5568; font-weight: 500; }
                .info-value { color: #2d3748; font-weight: 600; }
                .timestamp { color: #a0aec0; font-size: 14px; margin-top: 30px; text-align: center; }
                @media print { body { background: white; } .container { box-shadow: none; } }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>🧹 数据清洗报告</h1>
                <p class="subtitle">任务ID: ${this.currentTaskId}</p>
                
                <div class="stats-grid">
                  <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                    <div class="stat-label">API 修复</div>
                    <div class="stat-value">${this.stats.apiFixed}</div>
                  </div>
                  <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                    <div class="stat-label">ML 预测</div>
                    <div class="stat-value">${this.stats.mlFixed}</div>
                  </div>
                  <div class="stat-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
                    <div class="stat-label">规则填充</div>
                    <div class="stat-value">${this.stats.simpleFilled}</div>
                  </div>
                  <div class="stat-card" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
                    <div class="stat-label">总计修复</div>
                    <div class="stat-value">${totalProcessed}</div>
                  </div>
                </div>
                
                <div class="section">
                  <div class="section-title">📋 清洗详情</div>
                  <div class="info-row">
                    <span class="info-label">输入文件</span>
                    <span class="info-value">${this.config.inputFile}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">输出文件</span>
                    <span class="info-value">${this.config.outputFile}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">总耗时</span>
                    <span class="info-value">${this.stats.totalTime}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">成功率</span>
                    <span class="info-value">${successRate}%</span>
                  </div>
                </div>
                
                <div class="section">
                  <div class="section-title">⚙️ 清洗配置</div>
                  <div class="info-row">
                    <span class="info-label">API 补全</span>
                    <span class="info-value">${this.config.useApiCompletion ? '✅ 启用' : '❌ 禁用'}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">ML 预测</span>
                    <span class="info-value">${this.config.useMlPrediction ? '✅ 启用' : '❌ 禁用'}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">移除无效数据</span>
                    <span class="info-value">${this.config.removeInvalid ? '✅ 启用' : '❌ 禁用'}</span>
                  </div>
                </div>
                
                <p class="timestamp">报告生成时间: ${new Date().toLocaleString('zh-CN')}</p>
              </div>
            </body>
          </html>
        `);
      }
    } else {
      alert('没有可查看的报告');
    }
  }

  private startStatusCheck(): void {
    if (!this.currentTaskId) return;

    this.statusCheckSubscription = interval(2000)
      .pipe(
        switchMap(() => this.apiService.getCleaningStatus(this.currentTaskId!)),
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

    if (status.logs) {
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
      this.handleCleaningComplete(status);
    } else if (status.status === 'failed') {
      this.handleCleaningFailed(status);
    }
  }

  private handleCleaningComplete(status: TaskStatus): void {
    this.isCleaning = false;
    this.cleaningComplete = true;

    if (this.startTime) {
      const elapsed = new Date().getTime() - this.startTime.getTime();
      const seconds = Math.floor(elapsed / 1000);
      this.stats.totalTime = seconds > 60 
        ? `${Math.floor(seconds / 60)} 分钟 ${seconds % 60} 秒`
        : `${seconds} 秒`;
    }

    if (status.result) {
      this.stats.apiFixed = status.result.api_filled || 0;
      this.stats.mlFixed = status.result.ml_estimated || 0;
      this.stats.simpleFilled = status.result.rule_estimated || 0;
    }

    this.addLog('🎉 数据清洗完成!', 'success');
    this.stopStatusCheck();
  }

  private handleCleaningFailed(status: TaskStatus): void {
    this.isCleaning = false;
    this.addLog(`❌ 清洗失败: ${status.error || '未知错误'}`, 'error');
    this.stopStatusCheck();
  }
}
