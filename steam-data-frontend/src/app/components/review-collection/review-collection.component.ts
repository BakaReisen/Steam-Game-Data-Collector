import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SteamApiService, ReviewRequest, TaskStatus } from '../../services/steam-api.service';
import { interval, Subscription } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';

interface ReviewConfig {
  appId: number | null;
  gameName: string;
  positiveCount: number;
  negativeCount: number;
  language: string;
}

interface ReviewProgress {
  collected: number;
  target: number;
  positive: number;
  negative: number;
  percentage: number;
  currentStatus: string;
}

interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

@Component({
  selector: 'app-review-collection',
  imports: [CommonModule, FormsModule],
  templateUrl: './review-collection.component.html',
  styleUrl: './review-collection.component.scss'
})
export class ReviewCollectionComponent implements OnDestroy {
  currentTaskId: string | null = null;
  statusCheckSubscription: Subscription | null = null;
  config: ReviewConfig = {
    appId: null,
    gameName: '',
    positiveCount: 100,
    negativeCount: 100,
    language: 'all'
  };

  progress: ReviewProgress = {
    collected: 0,
    target: 0,
    positive: 0,
    negative: 0,
    percentage: 0,
    currentStatus: ''
  };

  logs: LogEntry[] = [];
  isCollecting: boolean = false;
  collectionComplete: boolean = false;

  constructor(private apiService: SteamApiService) {}

  ngOnDestroy(): void {
    this.stopStatusCheck();
  }

  isConfigValid(): boolean {
    return !!(this.config.appId && this.config.gameName.trim());
  }

  startCollection(): void {
    if (!this.isConfigValid()) {
      this.addLog('请填写完整的游戏信息', 'error');
      return;
    }

    this.isCollecting = true;
    this.collectionComplete = false;
    this.resetProgress();
    this.logs = [];

    this.addLog(`开始收集 ${this.config.gameName} 的评论数据`, 'info');
    this.addLog(`AppID: ${this.config.appId}`, 'info');

    const request: ReviewRequest = {
      appId: this.config.appId!,
      gameName: this.config.gameName,
      maxReviews: this.config.positiveCount + this.config.negativeCount,
      language: this.config.language,
      reviewType: 'all'
    };

    this.apiService.startReviewCollection(request).subscribe({
      next: (response) => {
        this.currentTaskId = response.task_id;
        this.addLog(`任务已创建: ${response.task_id}`, 'success');
        this.startStatusCheck();
      },
      error: (error) => {
        this.addLog(`启动失败: ${error.error?.error || error.message}`, 'error');
        this.isCollecting = false;
      }
    });
  }

  stopCollection(): void {
    if (this.currentTaskId) {
      this.apiService.cancelReviewCollection(this.currentTaskId).subscribe({
        next: () => {
          this.addLog('采集已停止', 'warning');
        },
        error: (error) => {
          this.addLog(`停止失败: ${error.message}`, 'error');
        }
      });
    }
    this.isCollecting = false;
    this.stopStatusCheck();
  }

  resetForm(): void {
    this.config = {
      appId: null,
      gameName: '',
      positiveCount: 100,
      negativeCount: 100,
      language: 'all'
    };
    this.resetProgress();
    this.logs = [];
    this.collectionComplete = false;
  }

  private resetProgress(): void {
    this.progress = {
      collected: 0,
      target: this.config.positiveCount + this.config.negativeCount,
      positive: 0,
      negative: 0,
      percentage: 0,
      currentStatus: ''
    };
  }

  private simulateCollection(): void {
    const total = this.config.positiveCount + this.config.negativeCount;
    let collected = 0;
    let positiveCollected = 0;
    let negativeCollected = 0;

    const interval = setInterval(() => {
      if (!this.isCollecting || collected >= total) {
        clearInterval(interval);
        if (collected >= total) {
          this.completeCollection();
        }
        return;
      }

      // 随机决定采集好评还是差评
      const collectPositive = positiveCollected < this.config.positiveCount &&
        (negativeCollected >= this.config.negativeCount || Math.random() > 0.5);

      if (collectPositive) {
        positiveCollected++;
        this.progress.positive = positiveCollected;
        this.progress.currentStatus = '正在采集好评...';
        this.addLog(`✅ 采集好评 #${positiveCollected}`, 'success');
      } else {
        negativeCollected++;
        this.progress.negative = negativeCollected;
        this.progress.currentStatus = '正在采集差评...';
        this.addLog(`❌ 采集差评 #${negativeCollected}`, 'info');
      }

      collected++;
      this.progress.collected = collected;
      this.progress.percentage = Math.round((collected / total) * 100);

    }, 200); // 加速模拟
  }

  private completeCollection(): void {
    this.isCollecting = false;
    this.collectionComplete = true;
    this.progress.currentStatus = '采集完成';
    this.addLog('🎉 评论采集完成!', 'success');
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

  calculatePositiveRate(): number {
    const total = this.progress.collected;
    return total > 0 ? Math.round((this.progress.positive / total) * 100) : 0;
  }

  getLanguageName(): string {
    const languageMap: { [key: string]: string } = {
      'all': '所有语言',
      'schinese': '简体中文',
      'english': '英语',
      'tchinese': '繁体中文'
    };
    return languageMap[this.config.language] || '所有语言';
  }

  downloadCSV(): void {
    if (this.currentTaskId) {
      const url = this.apiService.downloadReviews(this.currentTaskId);
      window.open(url, '_blank');
      this.addLog('开始下载 CSV 文件...', 'info');
    } else {
      alert('没有可下载的数据');
    }
  }

  viewSample(): void {
    if (this.currentTaskId) {
      this.addLog('正在加载评论样本...', 'info');
      
      this.apiService.getReviewsResult(this.currentTaskId).subscribe({
        next: (blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            const csvText = reader.result as string;
            const lines = csvText.split('\n');
            const headers = lines[0].split(',');
            const sampleLines = lines.slice(1, 11); // 10条样本
            
            const sampleWindow = window.open('', '_blank');
            if (sampleWindow) {
              const reviewsHtml = sampleLines.map((line, index) => {
                const values = line.split(',');
                if (values.length < 3) return '';
                
                return `
                  <div class="review-card">
                    <div class="review-header">
                      <span class="review-number">#${index + 1}</span>
                      <span class="review-sentiment" style="background: ${values[2] === 'positive' ? '#10b981' : '#ef4444'}">
                        ${values[2] === 'positive' ? '👍 好评' : '👎 差评'}
                      </span>
                    </div>
                    <div class="review-content">${values[1] ? values[1].substring(0, 200) + (values[1].length > 200 ? '...' : '') : 'N/A'}</div>
                  </div>
                `;
              }).join('');
              
              sampleWindow.document.write(`
                <html>
                  <head>
                    <title>评论样本预览</title>
                    <style>
                      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; }
                      .container { max-width: 1000px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); padding: 40px; }
                      h1 { color: #2d3748; margin-bottom: 10px; font-size: 32px; }
                      .subtitle { color: #718096; margin-bottom: 30px; }
                      .review-card { background: #f7fafc; border-radius: 8px; padding: 20px; margin: 15px 0; border-left: 4px solid #667eea; }
                      .review-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
                      .review-number { color: #a0aec0; font-weight: bold; font-size: 14px; }
                      .review-sentiment { padding: 4px 12px; border-radius: 12px; color: white; font-size: 12px; font-weight: 600; }
                      .review-content { color: #4a5568; line-height: 1.6; }
                      .timestamp { color: #a0aec0; font-size: 14px; margin-top: 30px; text-align: center; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <h1>💬 评论样本预览</h1>
                      <p class="subtitle">任务ID: ${this.currentTaskId} | 显示前 10 条评论</p>
                      ${reviewsHtml}
                      <p class="timestamp">生成时间: ${new Date().toLocaleString('zh-CN')}</p>
                    </div>
                  </body>
                </html>
              `);
            }
          };
          reader.readAsText(blob);
        },
        error: (error) => {
          this.addLog('样本加载失败: ' + error.message, 'error');
        }
      });
    } else {
      alert('没有可查看的评论样本');
    }
  }

  private startStatusCheck(): void {
    if (!this.currentTaskId) return;

    this.statusCheckSubscription = interval(2000)
      .pipe(
        switchMap(() => this.apiService.getReviewCollectionStatus(this.currentTaskId!)),
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
    this.progress.currentStatus = status.message;

    if (status.logs && status.logs.length > 0) {
      const lastLog = status.logs[status.logs.length - 1];
      const logType = lastLog.level === 'success' ? 'success' : 
                      lastLog.level === 'error' ? 'error' :
                      lastLog.level === 'warning' ? 'warning' : 'info';
      
      const lastLocalLog = this.logs[this.logs.length - 1];
      if (!lastLocalLog || lastLocalLog.message !== lastLog.message) {
        this.addLog(lastLog.message, logType);
      }
    }

    if (status.status === 'completed') {
      this.handleCollectionComplete(status);
    } else if (status.status === 'failed') {
      this.handleCollectionFailed(status);
    }
  }

  private handleCollectionComplete(status: TaskStatus): void {
    this.isCollecting = false;
    this.collectionComplete = true;

    if (status.result) {
      this.progress.collected = status.result.total_collected || 0;
    }

    this.addLog('🎉 评论采集完成!', 'success');
    this.stopStatusCheck();
  }

  private handleCollectionFailed(status: TaskStatus): void {
    this.isCollecting = false;
    this.addLog(`❌ 采集失败: ${status.error || '未知错误'}`, 'error');
    this.stopStatusCheck();
  }
}
