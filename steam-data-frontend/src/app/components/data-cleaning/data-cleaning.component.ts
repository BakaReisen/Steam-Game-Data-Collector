import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
export class DataCleaningComponent {
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

  startCleaning(): void {
    this.isCleaning = true;
    this.cleaningComplete = false;
    this.startTime = new Date();
    this.resetProgress();
    this.logs = [];

    this.addLog(`开始数据清洗: ${this.config.inputFile}`, 'info');
    this.addLog(`输出文件: ${this.config.outputFile}`, 'info');
    
    if (this.config.useApiCompletion) {
      this.addLog('✅ 启用 API 数据补全', 'info');
    }
    if (this.config.useMlPrediction) {
      this.addLog('✅ 启用 ML 模型预测', 'info');
    }

    // 模拟清洗过程
    this.simulateCleaning();
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
    this.addLog('正在生成清洗数据文件...', 'info');
    alert('数据下载功能将在后端 API 完成后实现');
  }

  viewReport(): void {
    this.addLog('正在打开清洗报告...', 'info');
    alert('报告查看功能将在后续开发');
  }
}
