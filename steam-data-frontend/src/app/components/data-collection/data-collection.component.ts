import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface CollectionConfig {
  gameCount: number;
  appIdsText: string;
  minReviews: number;
  maxGames: number | null;
  topLimit: number;
  delay: number;
  saveInterval: number;
  skipSteamCharts: boolean;
}

interface CollectionProgress {
  current: number;
  total: number;
  success: number;
  failed: number;
  percentage: number;
  currentGame: string;
  estimatedTime: string;
  totalTime: string;
}

interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

@Component({
  selector: 'app-data-collection',
  imports: [CommonModule, FormsModule],
  templateUrl: './data-collection.component.html',
  styleUrl: './data-collection.component.scss'
})
export class DataCollectionComponent {
  selectedMode: number = 0;
  isCollecting: boolean = false;
  collectionComplete: boolean = false;

  config: CollectionConfig = {
    gameCount: 100,
    appIdsText: '',
    minReviews: 1000,
    maxGames: null,
    topLimit: 1000,
    delay: 1.5,
    saveInterval: 100,
    skipSteamCharts: false
  };

  progress: CollectionProgress = {
    current: 0,
    total: 0,
    success: 0,
    failed: 0,
    percentage: 0,
    currentGame: '',
    estimatedTime: '',
    totalTime: ''
  };

  logs: LogEntry[] = [];
  collectedData: any[] = [];
  startTime: Date | null = null;

  selectMode(mode: number): void {
    this.selectedMode = mode;
    this.resetProgress();
    this.logs = [];
    this.collectionComplete = false;
  }

  startCollection(): void {
    if (!this.validateConfig()) {
      return;
    }

    this.isCollecting = true;
    this.collectionComplete = false;
    this.startTime = new Date();
    this.resetProgress();
    this.logs = [];

    this.addLog('开始数据采集...', 'info');
    this.addLog(`采集模式: ${this.getModeName()}`, 'info');

    // 模拟采集过程
    this.simulateCollection();
  }

  stopCollection(): void {
    this.isCollecting = false;
    this.addLog('采集已停止', 'warning');
  }

  resetForm(): void {
    this.selectedMode = 0;
    this.config = {
      gameCount: 100,
      appIdsText: '',
      minReviews: 1000,
      maxGames: null,
      topLimit: 1000,
      delay: 1.5,
      saveInterval: 100,
      skipSteamCharts: false
    };
    this.resetProgress();
    this.logs = [];
    this.collectionComplete = false;
  }

  private resetProgress(): void {
    this.progress = {
      current: 0,
      total: 0,
      success: 0,
      failed: 0,
      percentage: 0,
      currentGame: '',
      estimatedTime: '',
      totalTime: ''
    };
  }

  private validateConfig(): boolean {
    switch (this.selectedMode) {
      case 2:
        if (!this.config.gameCount || this.config.gameCount < 1) {
          this.addLog('请输入有效的游戏数量', 'error');
          return false;
        }
        break;
      case 3:
        if (!this.config.appIdsText.trim()) {
          this.addLog('请输入至少一个 AppID', 'error');
          return false;
        }
        break;
      case 4:
        if (!this.config.minReviews || this.config.minReviews < 1) {
          this.addLog('请输入有效的最小评论数', 'error');
          return false;
        }
        break;
      case 5:
        if (!this.config.topLimit || this.config.topLimit < 100) {
          this.addLog('Top 排名数量至少为 100', 'error');
          return false;
        }
        break;
    }
    return true;
  }

  private simulateCollection(): void {
    // 模拟数据采集过程 (实际项目中这里会调用后端 API)
    const total = this.getEstimatedTotal();
    this.progress.total = total;

    const sampleGames = [
      'Dota 2', 'Counter-Strike 2', 'PUBG', 'Apex Legends',
      'GTA V', 'Red Dead Redemption 2', '艾尔登法环', '博德之门3',
      '荒野大镖客2', '赛博朋克2077', '巫师3', '上古卷轴5',
      '黑神话:悟空', '星空', '霍格沃茨之遗', '生化危机4'
    ];

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (!this.isCollecting || currentIndex >= total) {
        clearInterval(interval);
        if (currentIndex >= total) {
          this.completeCollection();
        }
        return;
      }

      currentIndex++;
      const gameName = sampleGames[Math.floor(Math.random() * sampleGames.length)];
      const isSuccess = Math.random() > 0.1; // 90% 成功率

      this.progress.current = currentIndex;
      this.progress.currentGame = gameName;
      this.progress.percentage = Math.round((currentIndex / total) * 100);

      if (isSuccess) {
        this.progress.success++;
        this.addLog(`✅ 成功采集: ${gameName}`, 'success');
      } else {
        this.progress.failed++;
        this.addLog(`❌ 采集失败: ${gameName}`, 'error');
      }

      // 计算预计剩余时间
      const elapsed = new Date().getTime() - this.startTime!.getTime();
      const avgTime = elapsed / currentIndex;
      const remaining = (total - currentIndex) * avgTime;
      this.progress.estimatedTime = this.formatTime(remaining);

      // 检查点保存
      if (currentIndex % this.config.saveInterval === 0) {
        this.addLog(`💾 保存检查点 (已采集 ${currentIndex} 个游戏)`, 'info');
      }
    }, this.config.delay * 100); // 加速模拟,实际应该是 delay * 1000
  }

  private completeCollection(): void {
    this.isCollecting = false;
    this.collectionComplete = true;

    const totalTime = new Date().getTime() - this.startTime!.getTime();
    this.progress.totalTime = this.formatTime(totalTime);

    this.addLog('🎉 数据采集完成!', 'success');
    this.addLog(`成功: ${this.progress.success}, 失败: ${this.progress.failed}`, 'info');
  }

  private getEstimatedTotal(): number {
    switch (this.selectedMode) {
      case 1:
        return 10;
      case 2:
        return this.config.gameCount;
      case 3:
        const appIds = this.config.appIdsText.split(/[,\n]/).filter(id => id.trim());
        return appIds.length;
      case 4:
        return this.config.maxGames || 50;
      case 5:
        return this.config.topLimit;
      default:
        return 0;
    }
  }

  private getModeName(): string {
    const modes = ['', '示例游戏', '自定义数量', '指定 AppID', '热门游戏', '大规模采集'];
    return modes[this.selectedMode] || '';
  }

  private formatTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours} 小时 ${minutes % 60} 分钟`;
    } else if (minutes > 0) {
      return `${minutes} 分钟 ${seconds % 60} 秒`;
    } else {
      return `${seconds} 秒`;
    }
  }

  private addLog(message: string, type: LogEntry['type']): void {
    this.logs.push({
      timestamp: new Date(),
      message,
      type
    });

    // 限制日志数量
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }
  }

  downloadCSV(): void {
    this.addLog('正在生成 CSV 文件...', 'info');
    // TODO: 实现 CSV 下载逻辑
    alert('CSV 下载功能将在后端 API 完成后实现');
  }

  downloadJSON(): void {
    this.addLog('正在生成 JSON 文件...', 'info');
    // TODO: 实现 JSON 下载逻辑
    alert('JSON 下载功能将在后端 API 完成后实现');
  }

  viewData(): void {
    this.addLog('正在跳转到数据查看页面...', 'info');
    // TODO: 实现数据查看功能
    alert('数据查看功能将在后续开发');
  }
}
