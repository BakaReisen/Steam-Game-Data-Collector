import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
export class ReviewCollectionComponent {
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
    this.addLog(`目标: 好评 ${this.config.positiveCount} 条, 差评 ${this.config.negativeCount} 条`, 'info');

    // 模拟评论采集
    this.simulateCollection();
  }

  stopCollection(): void {
    this.isCollecting = false;
    this.addLog('采集已停止', 'warning');
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
    this.addLog('正在生成 CSV 文件...', 'info');
    alert('CSV 下载功能将在后端 API 完成后实现');
  }

  viewSample(): void {
    this.addLog('显示评论样本...', 'info');
    alert('评论样本查看功能将在后续开发');
  }
}
