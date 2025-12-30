import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SteamApiService, CollectionRequest, TaskStatus } from '../../services/steam-api.service';
import { interval, Subscription } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';

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
export class DataCollectionComponent implements OnDestroy {
  selectedMode: number = 0;
  isCollecting: boolean = false;
  collectionComplete: boolean = false;
  currentTaskId: string | null = null;
  statusCheckSubscription: Subscription | null = null;

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

  constructor(private apiService: SteamApiService) {}

  ngOnDestroy(): void {
    this.stopStatusCheck();
  }

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

    // 构建请求参数
    const request = this.buildCollectionRequest();
    
    // 调用后端 API
    this.apiService.startCollection(request).subscribe({
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
      this.apiService.cancelCollection(this.currentTaskId).subscribe({
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
    if (this.currentTaskId) {
      const url = this.apiService.downloadCollectionResult(this.currentTaskId);
      window.open(url, '_blank');
      this.addLog('开始下载 CSV 文件...', 'info');
    } else {
      alert('没有可下载的数据');
    }
  }

  downloadJSON(): void {
    if (this.currentTaskId) {
      this.addLog('开始下载 JSON 文件...', 'info');
      const url = this.apiService.downloadCollectionJSON(this.currentTaskId);
      window.open(url, '_blank');
    } else {
      alert('没有可下载的数据');
    }
  }

  viewData(): void {
    if (this.currentTaskId) {
      this.addLog('正在加载数据预览...', 'info');
      // 获取 CSV 数据并在新窗口显示
      const csvUrl = this.apiService.downloadCollectionResult(this.currentTaskId);
      this.apiService.getCollectionResult(this.currentTaskId).subscribe({
        next: (blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            const csvText = reader.result as string;
            const lines = csvText.split('\n').slice(0, 101); // 前100行 + header
            const preview = lines.join('\n');
            
            // 创建预览窗口
            const previewWindow = window.open('', '_blank');
            if (previewWindow) {
              previewWindow.document.write(`
                <html>
                  <head>
                    <title>数据预览 - ${this.currentTaskId}</title>
                    <style>
                      body { font-family: 'Courier New', monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
                      pre { white-space: pre-wrap; word-wrap: break-word; background: #252526; padding: 15px; border-radius: 5px; }
                      .header { background: #2d2d30; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                      h2 { margin: 0 0 10px 0; color: #4ec9b0; }
                      .info { color: #ce9178; }
                    </style>
                  </head>
                  <body>
                    <div class="header">
                      <h2>📊 数据预览</h2>
                      <p class="info">任务ID: ${this.currentTaskId}</p>
                      <p class="info">显示前 100 行数据</p>
                    </div>
                    <pre>${preview}</pre>
                  </body>
                </html>
              `);
            }
          };
          reader.readAsText(blob);
        },
        error: (error) => {
          this.addLog('数据预览失败: ' + error.message, 'error');
        }
      });
    } else {
      alert('没有可查看的数据');
    }
  }

  private buildCollectionRequest(): CollectionRequest {
    const modeMap: { [key: number]: string } = {
      1: 'sample',
      2: 'top_games',
      3: 'custom',
      4: 'chinese_reviews',
      5: 'steamspy'
    };

    const request: CollectionRequest = {
      mode: modeMap[this.selectedMode] || 'sample',
      delay: this.config.delay,
      skipSteamcharts: this.config.skipSteamCharts
    };

    switch (this.selectedMode) {
      case 2: // 自定义数量
        request.limit = this.config.gameCount;
        break;
      case 3: // 指定 AppID
        const appIds = this.config.appIdsText
          .split(/[,\n]/)
          .map(id => parseInt(id.trim()))
          .filter(id => !isNaN(id));
        request.appIds = appIds;
        break;
      case 4: // 热门游戏
        request.threshold = this.config.minReviews;
        request.maxGames = this.config.maxGames || 50;
        break;
      case 5: // 大规模采集
        request.limit = this.config.topLimit;
        break;
    }

    return request;
  }

  private startStatusCheck(): void {
    if (!this.currentTaskId) return;

    this.statusCheckSubscription = interval(2000)
      .pipe(
        switchMap(() => this.apiService.getCollectionStatus(this.currentTaskId!)),
        takeWhile((status) => {
          return status.status === 'running' || status.status === 'pending';
        }, true)
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
    this.progress.currentGame = status.message;

    // 更新日志
    if (status.logs && status.logs.length > 0) {
      const lastLog = status.logs[status.logs.length - 1];
      const logType = lastLog.level === 'success' ? 'success' : 
                      lastLog.level === 'error' ? 'error' :
                      lastLog.level === 'warning' ? 'warning' : 'info';
      
      // 避免重复添加相同的日志
      const lastLocalLog = this.logs[this.logs.length - 1];
      if (!lastLocalLog || lastLocalLog.message !== lastLog.message) {
        this.addLog(lastLog.message, logType);
      }
    }

    // 检查是否完成
    if (status.status === 'completed') {
      this.handleCollectionComplete(status);
    } else if (status.status === 'failed') {
      this.handleCollectionFailed(status);
    }
  }

  private handleCollectionComplete(status: TaskStatus): void {
    this.isCollecting = false;
    this.collectionComplete = true;

    if (this.startTime) {
      const totalTime = new Date().getTime() - this.startTime.getTime();
      this.progress.totalTime = this.formatTime(totalTime);
    }

    if (status.result) {
      this.progress.success = status.result.total_collected || 0;
      this.progress.total = status.result.total_requested || 0;
      this.progress.failed = this.progress.total - this.progress.success;
    }

    this.addLog('🎉 数据采集完成!', 'success');
    this.stopStatusCheck();
  }

  private handleCollectionFailed(status: TaskStatus): void {
    this.isCollecting = false;
    this.addLog(`❌ 采集失败: ${status.error || '未知错误'}`, 'error');
    this.stopStatusCheck();
  }
}
