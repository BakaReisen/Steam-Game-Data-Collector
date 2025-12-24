import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CollectionRequest {
  mode: number;
  config: {
    gameCount?: number;
    appIds?: number[];
    minReviews?: number;
    maxGames?: number;
    topLimit?: number;
    delay?: number;
    saveInterval?: number;
    skipSteamCharts?: boolean;
  };
}

export interface CollectionResponse {
  success: boolean;
  message: string;
  taskId?: string;
  data?: any;
}

export interface CollectionStatus {
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: {
    current: number;
    total: number;
    success: number;
    failed: number;
    percentage: number;
    currentGame?: string;
    estimatedTime?: string;
  };
  logs: Array<{
    timestamp: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
  }>;
}

export interface GameData {
  AppID: number;
  Name: string;
  Type: string;
  Release_Date: string;
  Developers: string;
  Publishers: string;
  Genres: string;
  Categories: string;
  Tags: string;
  Is_Free: boolean;
  Final_Price: number;
  Discount_Percent: number;
  Positive_Rate: number;
  Total_Reviews: number;
  Owners: string;
  Current_Players: number;
  Peak_Players_AllTime: number;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class SteamApiService {
  private apiUrl = 'http://localhost:5000/api'; // 后端 API 地址

  constructor(private http: HttpClient) { }

  /**
   * 开始游戏数据采集任务
   */
  startCollection(request: CollectionRequest): Observable<CollectionResponse> {
    return this.http.post<CollectionResponse>(`${this.apiUrl}/collect/start`, request);
  }

  /**
   * 获取采集任务状态
   */
  getCollectionStatus(taskId: string): Observable<CollectionStatus> {
    return this.http.get<CollectionStatus>(`${this.apiUrl}/collect/status/${taskId}`);
  }

  /**
   * 停止采集任务
   */
  stopCollection(taskId: string): Observable<CollectionResponse> {
    return this.http.post<CollectionResponse>(`${this.apiUrl}/collect/stop/${taskId}`, {});
  }

  /**
   * 获取采集结果数据
   */
  getCollectionResult(taskId: string): Observable<GameData[]> {
    return this.http.get<GameData[]>(`${this.apiUrl}/collect/result/${taskId}`);
  }

  /**
   * 下载 CSV 文件
   */
  downloadCSV(taskId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/collect/download/csv/${taskId}`, {
      responseType: 'blob'
    });
  }

  /**
   * 下载 JSON 文件
   */
  downloadJSON(taskId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/collect/download/json/${taskId}`, {
      responseType: 'blob'
    });
  }

  /**
   * 获取所有采集任务历史
   */
  getCollectionHistory(): Observable<CollectionStatus[]> {
    return this.http.get<CollectionStatus[]>(`${this.apiUrl}/collect/history`);
  }

  /**
   * 删除采集任务
   */
  deleteCollection(taskId: string): Observable<CollectionResponse> {
    return this.http.delete<CollectionResponse>(`${this.apiUrl}/collect/${taskId}`);
  }

  /**
   * 获取游戏详细信息
   */
  getGameDetails(appId: number): Observable<GameData> {
    return this.http.get<GameData>(`${this.apiUrl}/game/${appId}`);
  }

  /**
   * 搜索游戏
   */
  searchGames(keyword: string, limit: number = 20): Observable<GameData[]> {
    const params = new HttpParams()
      .set('keyword', keyword)
      .set('limit', limit.toString());
    
    return this.http.get<GameData[]>(`${this.apiUrl}/game/search`, { params });
  }

  /**
   * 获取热门游戏列表
   */
  getPopularGames(limit: number = 50): Observable<GameData[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<GameData[]>(`${this.apiUrl}/game/popular`, { params });
  }

  /**
   * 验证 AppID 是否有效
   */
  validateAppIds(appIds: number[]): Observable<{
    valid: number[];
    invalid: number[];
  }> {
    return this.http.post<{valid: number[], invalid: number[]}>(`${this.apiUrl}/game/validate`, { appIds });
  }
}
