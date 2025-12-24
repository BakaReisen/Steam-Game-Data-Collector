import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  features = [
    {
      icon: 'database',
      title: '游戏数据采集',
      description: '从 Steam、SteamSpy、SteamCharts 等多个数据源采集游戏信息',
      link: '/data-collection',
      color: '#4CAF50'
    },
    {
      icon: 'comment',
      title: '评论数据采集',
      description: '批量采集游戏评论数据，支持多语言过滤和情感分析',
      link: '/review-collection',
      color: '#2196F3'
    },
    {
      icon: 'model',
      title: '机器学习模型训练',
      description: '训练 RandomForest 模型预测游戏在线人数和市场表现',
      link: '/model-training',
      color: '#FF9800'
    },
    {
      icon: 'clean',
      title: '智能数据清洗',
      description: '自动检测缺失值，使用 ML 模型智能补全数据',
      link: '/data-cleaning',
      color: '#9C27B0'
    }
  ];

  stats = [
    { value: '10,000+', label: '采集游戏数量', icon: '🎮' },
    { value: '40+', label: '数据维度', icon: '📊' },
    { value: '4', label: '数据源整合', icon: '🔗' },
    { value: '99.8%', label: '数据完整度', icon: '✨' }
  ];

  technologies = [
    { name: 'Angular 19', icon: '⚡' },
    { name: 'Python 3.11', icon: '🐍' },
    { name: 'scikit-learn', icon: '🤖' },
    { name: 'Pandas', icon: '🐼' },
    { name: 'Steam API', icon: '💨' },
    { name: 'TypeScript', icon: '📘' }
  ];
}
