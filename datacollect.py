"""
Steam 游戏数据爬取脚本
使用 Steam Web API 和 Storefront API 爬取游戏数据用于商务分析
"""

import requests
import json
import pandas as pd
import time
from datetime import datetime
from typing import Dict, List, Optional
import os
from bs4 import BeautifulSoup
import re
import random
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

class SteamDataCollector:
    def __init__(self, api_key: str = "input your steam api here"):
        """
        初始化 Steam 数据采集器
        
        Args:
            api_key: Steam Web API Key (部分功能需要)
        """
        self.api_key = api_key
        self.store_api_base = "https://store.steampowered.com/api"
        self.web_api_base = "https://api.steampowered.com"
        self.steamspy_api_base = "https://steamspy.com/api.php"
        self.itad_api_base = "https://api.isthereanydeal.com"
        
        # 随机User-Agent列表，模拟不同浏览器
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
        ]
        self.headers = {
            "User-Agent": random.choice(self.user_agents)
        }
        
        # 配置session重试策略
        self.session = requests.Session()
        retry_strategy = Retry(
            total=5,  # 总共重试5次
            backoff_factor=2,  # 重试间隔指数增长: 2, 4, 8, 16, 32秒
            status_forcelist=[429, 500, 502, 503, 504],  # 这些状态码才重试
            allowed_methods=["GET", "POST"]  # 允许重试的HTTP方法
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        self.session.headers.update(self.headers)
        
        # 列名映射字典（英文 -> 中文）
        self.column_mapping = {
            'AppID': 'AppID',
            'Name': '游戏名称',
            'Type': '类型',
            'Release_Date': '发行日期',
            'Coming_Soon': '即将推出',
            'Developers': '开发商',
            'Publishers': '发行商',
            'Genres': '游戏类型',
            'Categories': '分类',
            'Tags': '标签',
            'Is_Free': '是否免费',
            'Currency': '货币',
            'Initial_Price': '原价',
            'Final_Price': '现价',
            'Discount_Percent': '折扣百分比',
            'Price_Formatted': '格式化价格',
            'Metacritic_Score': 'Metacritic评分',
            'Total_Reviews': '总评论数',
            'Positive_Reviews': '好评数',
            'Negative_Reviews': '差评数',
            'Positive_Rate': '好评率',
            'User_Score': '用户评分',
            'Owners': '拥有者数量',
            'Players_Forever': '总玩家数',
            'Players_2Weeks': '近两周玩家数',
            'Average_Playtime_Forever': '平均游戏时长(分钟)',
            'Median_Playtime_Forever': '中位数游戏时长(分钟)',
            'Current_Players': '当前在线人数',
            'Peak_Players_24h': '24小时峰值',
            'Peak_Players_AllTime': '历史最高在线',
            'Avg_Players_30d': '30天平均在线',
            'Supported_Languages': '支持语言',
            'Windows': 'Windows支持',
            'Mac': 'Mac支持',
            'Linux': 'Linux支持',
            'Required_Age': '年龄限制',
            'DLC_Count': 'DLC数量',
            'Achievements': '成就数量'
        }
        
    def get_all_apps(self, limit: int = 1000) -> List[Dict]:
        """
        获取 Steam 上所有应用的列表（AppID 和名称）
        使用多个备用端点确保可靠性
        
        Args:
            limit: 当使用备用方案(SteamSpy)时获取的游戏数量
        
        Returns:
            包含所有应用信息的列表
        """
        # 尝试多个 API 端点
        endpoints = [
            f"{self.web_api_base}/ISteamApps/GetAppList/v2/",
            "https://api.steampowered.com/ISteamApps/GetAppList/v0002/?format=json",
            "https://api.steampowered.com/ISteamApps/GetAppList/v1/"
        ]
        
        for idx, url in enumerate(endpoints, 1):
            try:
                print(f"尝试端点 {idx}/{len(endpoints)}: {url}")
                response = requests.get(url, headers=self.headers, timeout=30)
                response.raise_for_status()
                data = response.json()
                
                # 兼容不同的响应格式
                if 'applist' in data and 'apps' in data['applist']:
                    apps = data['applist']['apps']
                elif 'apps' in data:
                    apps = data['apps']
                else:
                    print(f"  ✗ 端点 {idx} 返回格式不正确")
                    continue
                
                print(f"  ✓ 成功获取 {len(apps)} 个应用")
                return apps
                
            except requests.exceptions.HTTPError as e:
                print(f"  ✗ 端点 {idx} HTTP 错误: {e}")
                continue
            except requests.exceptions.RequestException as e:
                print(f"  ✗ 端点 {idx} 请求失败: {e}")
                continue
            except Exception as e:
                print(f"  ✗ 端点 {idx} 未知错误: {e}")
                continue
        
        # 如果所有 Steam API 都失败,尝试从 SteamSpy 获取热门游戏
        print(f"\n所有 Steam API 端点均失败,尝试从 SteamSpy 获取热门游戏列表(Top {limit})...")
        steamspy_apps = self.get_apps_from_steamspy(limit=limit)
        
        if steamspy_apps:
            return steamspy_apps
        
        # 如果 SteamSpy 也失败,尝试 SteamDB
        print("\nSteamSpy 失败,尝试从 SteamDB 获取游戏列表...")
        steamdb_apps = self.get_apps_from_steamdb()
        
        if steamdb_apps:
            return steamdb_apps
        
        print("\n⚠ 警告: 所有数据源均失败,返回空列表")
        print("建议:")
        print("  1. 检查网络连接")
        print("  2. 使用模式 1 或 3 (指定 AppID) 进行采集")
        print("  3. 稍后再试或使用代理")
        return []
    
    def get_apps_from_steamdb(self) -> List[Dict]:
        """
        从 SteamDB 网站爬取游戏列表
        
        Returns:
            包含游戏信息的列表 [{'appid': int, 'name': str}, ...]
        """
        try:
            print("正在从 SteamDB 获取游戏列表...")
            
            apps = []
            
            # SteamDB 的多个数据源
            sources = [
                {
                    'url': 'https://steamdb.info/charts/',
                    'name': '热门游戏排行榜',
                    'parser': self._parse_steamdb_charts
                },
                {
                    'url': 'https://steamdb.info/api/GetGraph/?type=concurrent',
                    'name': 'API 端点',
                    'parser': self._parse_steamdb_api
                }
            ]
            
            for source in sources:
                try:
                    print(f"  尝试: {source['name']}")
                    result = source['parser'](source['url'])
                    if result:
                        apps.extend(result)
                        print(f"  ✓ 成功获取 {len(result)} 个游戏")
                        break
                except Exception as e:
                    print(f"  ✗ 失败: {e}")
                    continue
            
            if apps:
                # 去重
                seen = set()
                unique_apps = []
                for app in apps:
                    if app['appid'] not in seen:
                        seen.add(app['appid'])
                        unique_apps.append(app)
                
                print(f"✓ 从 SteamDB 获取到 {len(unique_apps)} 个游戏")
                return unique_apps
            
            return []
            
        except Exception as e:
            print(f"  ✗ SteamDB 获取失败: {e}")
            return []
    
    def _parse_steamdb_charts(self, url: str) -> List[Dict]:
        """解析 SteamDB 排行榜页面"""
        try:
            response = requests.get(url, headers=self.headers, timeout=30)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            apps = []
            
            # 查找游戏表格
            table = soup.find('table', class_='table-products')
            if not table:
                # 尝试其他可能的表格类名
                table = soup.find('table')
            
            if table:
                rows = table.find_all('tr')[1:]  # 跳过表头
                
                for row in rows[:500]:  # 限制最多 500 个
                    try:
                        cells = row.find_all('td')
                        if len(cells) < 2:
                            continue
                        
                        # 查找 AppID 和游戏名称
                        app_link = row.find('a', href=True)
                        if app_link and '/app/' in app_link['href']:
                            app_id_match = re.search(r'/app/(\d+)', app_link['href'])
                            if app_id_match:
                                app_id = int(app_id_match.group(1))
                                app_name = app_link.get_text(strip=True)
                                apps.append({'appid': app_id, 'name': app_name})
                    except:
                        continue
            
            return apps
            
        except Exception as e:
            print(f"    解析排行榜失败: {e}")
            return []
    
    def _parse_steamdb_api(self, url: str) -> List[Dict]:
        """解析 SteamDB API 响应"""
        try:
            response = requests.get(url, headers=self.headers, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            apps = []
            
            # SteamDB API 可能返回游戏数据
            if isinstance(data, dict) and 'data' in data:
                for item in data['data']:
                    if isinstance(item, dict) and 'appid' in item:
                        apps.append({
                            'appid': item['appid'],
                            'name': item.get('name', f"Game_{item['appid']}")
                        })
            
            return apps
            
        except Exception as e:
            print(f"    API 解析失败: {e}")
            return []
    
    def get_apps_from_steamspy(self, limit: int = 1000) -> List[Dict]:
        """
        从 SteamSpy 获取游戏列表 (支持大规模采集)
        
        Args:
            limit: 最多获取的游戏数量 (100-10000)
            
        Returns:
            包含游戏信息的列表
        """
        try:
            print(f"正在从 SteamSpy 获取游戏列表 (Top {limit})...")
            
            apps = []
            
            # 增强请求头,模拟真实浏览器
            enhanced_headers = self.headers.copy()
            enhanced_headers.update({
                'User-Agent': random.choice(self.user_agents),
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Referer': 'https://steamspy.com/',
                'Origin': 'https://steamspy.com',
                'Connection': 'keep-alive',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin'
            })
            
            # SteamSpy API 限制: request=all 默认返回约1000个游戏
            # 需要分页获取更多游戏
            if limit <= 1000:
                # 方式1: 直接获取 (<=1000个游戏)
                url = "https://steamspy.com/api.php"
                params = {
                    "request": "all",
                    "page": "0"
                }
                
                print("  正在发送请求...")
                time.sleep(3)  # 请求前等待3秒
                response = requests.get(url, params=params, headers=enhanced_headers, timeout=60)
                response.raise_for_status()
                data = response.json()
                
                for app_id, app_data in list(data.items())[:limit]:
                    try:
                        apps.append({
                            'appid': int(app_id),
                            'name': app_data.get('name', f'Game_{app_id}')
                        })
                    except:
                        continue
            else:
                # 方式2: 分页获取 (>1000个游戏)
                # SteamSpy API 支持分页: page=0,1,2,3...
                # 每页约1000个游戏
                pages_needed = (limit // 1000) + (1 if limit % 1000 != 0 else 0)
                print(f"  需要获取 {pages_needed} 页数据...")
                
                for page in range(pages_needed):
                    try:
                        url = "https://steamspy.com/api.php"
                        params = {
                            "request": "all",
                            "page": str(page)
                        }
                        
                        # 每页请求前等待,避免触发限制
                        if page > 0:
                            wait_time = 5 + random.uniform(0, 2)  # 5-7秒随机延迟
                            print(f"  等待 {wait_time:.1f} 秒...")
                            time.sleep(wait_time)
                        else:
                            time.sleep(3)  # 首次请求前也等待3秒
                        
                        print(f"  正在获取第 {page + 1}/{pages_needed} 页...", end=' ')
                        response = requests.get(url, params=params, headers=enhanced_headers, timeout=60)
                        response.raise_for_status()
                        data = response.json()
                        
                        page_apps = []
                        for app_id, app_data in data.items():
                            try:
                                page_apps.append({
                                    'appid': int(app_id),
                                    'name': app_data.get('name', f'Game_{app_id}')
                                })
                            except:
                                continue
                        
                        apps.extend(page_apps)
                        print(f"✓ 获取 {len(page_apps)} 个游戏 (累计: {len(apps)})")
                        
                        # 如果已达到目标数量,提前退出
                        if len(apps) >= limit:
                            apps = apps[:limit]
                            break
                        
                        
                    except requests.exceptions.HTTPError as e:
                        print(f"\n  ⚠ 第 {page + 1} 页 HTTP 错误: {e}")
                        if e.response.status_code == 403:
                            print("  → 403 Forbidden: SteamSpy 拒绝访问")
                            print("  → 可能原因: 请求过快、IP 被限制、缺少必要的请求头")
                            print("  → 建议: 等待几分钟后重试,或使用模式 1/2 手动指定 AppID")
                        if page == 0:  # 如果第一页就失败,抛出异常
                            raise
                        else:  # 其他页失败则继续
                            continue
                    except Exception as e:
                        print(f"\n  ⚠ 第 {page + 1} 页获取失败: {e}")
                        if page == 0:
                            raise
                        else:
                            continue
            
            print(f"✓ 从 SteamSpy 获取到 {len(apps)} 个游戏")
            return apps
            
        except requests.exceptions.HTTPError as e:
            print(f"✗ SteamSpy HTTP 错误: {e}")
            if hasattr(e, 'response') and e.response.status_code == 403:
                print("\n【403 错误解决方案】")
                print("1. 等待 5-10 分钟后重试 (IP 可能被临时限制)")
                print("2. 使用模式 1: 采集示例游戏 (10个热门游戏)")
                print("3. 使用模式 2: 手动指定 AppID 列表")
                print("4. 检查网络连接,尝试更换网络环境")
                print("5. 如果持续失败,可能需要使用代理或 VPN\n")
            return []
        except Exception as e:
            print(f"✗ SteamSpy 获取失败: {e}")
            return []
    
    def get_game_details(self, app_id: int, region: str = "cn", max_retries: int = 3) -> Optional[Dict]:
        """
        获取单个游戏的详细信息 (带重试和速率限制处理)
        
        Args:
            app_id: Steam AppID
            region: 地区代码 (cn=中国, us=美国)
            max_retries: 最大重试次数
            
        Returns:
            游戏详细信息字典
        """
        url = f"{self.store_api_base}/appdetails"
        params = {
            "appids": app_id,
            "cc": region,
            "l": "schinese"  # 简体中文
        }
        
        for attempt in range(max_retries):
            try:
                # 随机更换User-Agent
                headers = self.headers.copy()
                headers['User-Agent'] = random.choice(self.user_agents)
                
                response = requests.get(url, params=params, headers=headers, timeout=20)
                
                # 特殊处理429错误
                if response.status_code == 429:
                    wait_time = (attempt + 1) * 30  # 30, 60, 90秒
                    print(f"  ⚠ 触发速率限制(429), 等待 {wait_time} 秒后重试... (尝试 {attempt + 1}/{max_retries})")
                    time.sleep(wait_time)
                    continue
                
                response.raise_for_status()
                data = response.json()
                
                # 检查是否成功获取数据
                app_data = data.get(str(app_id), {})
                if app_data.get('success'):
                    return app_data['data']
                else:
                    return None
                    
            except requests.exceptions.HTTPError as e:
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 10
                    print(f"  ⚠ HTTP错误: {e}, {wait_time}秒后重试...")
                    time.sleep(wait_time)
                else:
                    print(f"获取 AppID {app_id} 详情失败: {e}")
                    return None
            except Exception as e:
                if attempt < max_retries - 1:
                    time.sleep(5)
                else:
                    print(f"获取 AppID {app_id} 详情失败: {e}")
                    return None
        
        return None
    
    def get_player_count(self, app_id: int) -> Dict:
        """
        获取游戏当前在线人数
        
        Args:
            app_id: Steam AppID
            
        Returns:
            包含在线人数的字典
        """
        url = f"{self.web_api_base}/ISteamUserStats/GetNumberOfCurrentPlayers/v1/"
        params = {"appid": app_id}
        
        try:
            headers = self.headers.copy()
            headers['User-Agent'] = random.choice(self.user_agents)
            response = self.session.get(url, params=params, headers=headers, timeout=20)
            response.raise_for_status()
            data = response.json()
            
            if data['response']['result'] == 1:
                return {
                    "current_players": data['response']['player_count']
                }
            return {"current_players": 0}
            
        except Exception as e:
            print(f"获取 AppID {app_id} 在线人数失败: {e}")
            return {"current_players": None}
    
    def get_chinese_tags_from_store_page(self, app_id: int) -> List[str]:
        """
        从 Steam 商店页面爬取中文用户标签
        
        Args:
            app_id: Steam AppID
            
        Returns:
            中文标签列表
        """
        try:
            url = f"https://store.steampowered.com/app/{app_id}/?l=schinese"
            headers = self.headers.copy()
            headers['User-Agent'] = random.choice(self.user_agents)
            headers['Accept-Language'] = 'zh-CN,zh;q=0.9'
            
            response = self.session.get(url, headers=headers, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            chinese_tags = []
            
            # 方法1: 查找用户定义的标签 (通常在 class="app_tag" 或 class="popular_tags" 中)
            tag_elements = soup.find_all('a', class_='app_tag')
            for tag_elem in tag_elements[:10]:  # 取前10个
                tag_text = tag_elem.get_text(strip=True)
                if tag_text and tag_text not in ['+', '']:
                    chinese_tags.append(tag_text)
            
            # 方法2: 如果方法1没找到,尝试其他可能的标签容器
            if not chinese_tags:
                # 尝试查找 data-appid 属性的标签
                popular_tags_container = soup.find('div', class_='glance_tags popular_tags')
                if popular_tags_container:
                    tag_links = popular_tags_container.find_all('a', limit=10)
                    for tag_link in tag_links:
                        tag_text = tag_link.get_text(strip=True)
                        if tag_text and tag_text not in ['+', '']:
                            chinese_tags.append(tag_text)
            
            return chinese_tags[:10]  # 最多返回10个标签
            
        except Exception as e:
            # 静默失败,不打印错误(避免刷屏)
            return []
    
    def get_steamspy_data(self, app_id: int) -> Dict:
        """
        从 SteamSpy API 获取游戏数据 (销量估算、评分等)
        
        Args:
            app_id: Steam AppID
            
        Returns:
            包含 SteamSpy 数据的字典
        """
        url = self.steamspy_api_base
        params = {
            "request": "appdetails",
            "appid": app_id
        }
        
        try:
            # 使用增强的请求头
            headers = self.headers.copy()
            headers.update({
                'User-Agent': random.choice(self.user_agents),
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Referer': 'https://steamspy.com/',
                'Origin': 'https://steamspy.com'
            })
            response = requests.get(url, params=params, headers=headers, timeout=25)
            response.raise_for_status()
            data = response.json()
            
            # 提取关键数据
            return {
                "owners": data.get('owners', 'N/A'),  # 拥有者数量范围
                "owners_variance": data.get('owners_variance', 0),
                "players_forever": data.get('players_forever', 0),  # 总玩家数
                "players_2weeks": data.get('players_2weeks', 0),  # 最近2周玩家数
                "average_forever": data.get('average_forever', 0),  # 平均游戏时长 (分钟)
                "average_2weeks": data.get('average_2weeks', 0),
                "median_forever": data.get('median_forever', 0),  # 中位数游戏时长
                "median_2weeks": data.get('median_2weeks', 0),
                "positive": data.get('positive', 0),  # 好评数
                "negative": data.get('negative', 0),  # 差评数
                "score_rank": data.get('score_rank', None),  # 评分排名
                "userscore": data.get('userscore', 0),  # 用户评分 (0-100)
                "ccu": data.get('ccu', 0),  # 当前同时在线人数
                "tags": data.get('tags', {})  # 标签字典
            }
            
        except Exception as e:
            print(f"  ⚠ SteamSpy 数据获取失败: {e}")
            return {
                "owners": None, "owners_variance": None,
                "players_forever": None, "players_2weeks": None,
                "average_forever": None, "average_2weeks": None,
                "median_forever": None, "median_2weeks": None,
                "positive": None, "negative": None,
                "score_rank": None, "userscore": None, "ccu": None,
                "tags": {}
            }
    
    def get_steamcharts_data(self, app_id: int) -> Dict:
        """
        从 SteamCharts 爬取历史在线人数数据
        
        Args:
            app_id: Steam AppID
            
        Returns:
            包含历史在线人数的字典
        """
        url = f"https://steamcharts.com/app/{app_id}"
        
        try:
            response = requests.get(url, headers=self.headers, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 提取数据
            result = {
                "peak_players_24h": None,
                "peak_players_alltime": None,
                "avg_players_30d": None
            }
            
            # 查找统计表格
            stats_divs = soup.find_all('div', class_='app-stat')
            
            for div in stats_divs:
                title = div.find('span', class_='num')
                value_span = div.find('span', class_='num')
                
                if title and value_span:
                    text = div.get_text()
                    value_text = value_span.get_text().strip().replace(',', '')
                    
                    try:
                        value = int(value_text)
                        
                        if '24-hour peak' in text or '24小时峰值' in text:
                            result['peak_players_24h'] = value
                        elif 'all-time peak' in text.lower() or '历史峰值' in text:
                            result['peak_players_alltime'] = value
                        elif 'average players' in text.lower() or '平均玩家' in text:
                            result['avg_players_30d'] = value
                    except ValueError:
                        continue
            
            return result
            
        except Exception as e:
            print(f"  ⚠ SteamCharts 数据获取失败: {e}")
            return {
                "peak_players_24h": None,
                "peak_players_alltime": None,
                "avg_players_30d": None
            }
    

    
    def parse_game_data(self, app_id: int, game_details: Dict, player_data: Dict,
                       steamspy_data: Dict = None, steamcharts_data: Dict = None,
                       chinese_tags: List[str] = None) -> Dict:
        """
        解析游戏数据，提取所需的分析维度
        
        Args:
            app_id: Steam AppID
            game_details: 游戏详细信息
            player_data: 玩家数据
            chinese_tags: 从商店页面爬取的中文标签列表
            
        Returns:
            格式化后的游戏数据字典
        """
        if not game_details:
            return None
        
        # 1. 基础信息
        parsed_data = {
            "AppID": app_id,
            "Name": game_details.get('name', 'N/A'),
            "Type": game_details.get('type', 'N/A'),  # game, dlc, etc.
        }
        
        # 发行日期
        release_date = game_details.get('release_date', {})
        parsed_data["Release_Date"] = release_date.get('date', 'N/A')
        parsed_data["Coming_Soon"] = release_date.get('coming_soon', False)
        
        # 开发商和发行商
        parsed_data["Developers"] = ', '.join(game_details.get('developers', ['N/A']))
        parsed_data["Publishers"] = ', '.join(game_details.get('publishers', ['N/A']))
        
        # 标签和类型
        genres = game_details.get('genres', [])
        parsed_data["Genres"] = ', '.join([g['description'] for g in genres]) if genres else 'N/A'
        
        categories = game_details.get('categories', [])
        parsed_data["Categories"] = ', '.join([c['description'] for c in categories]) if categories else 'N/A'
        
        # 标签 (Tags) - 优先使用从商店页面爬取的中文标签
        tags_to_use = []
        
        # 方法1: 使用传入的中文标签(从商店页面爬取)
        if chinese_tags and isinstance(chinese_tags, list) and len(chinese_tags) > 0:
            tags_to_use = chinese_tags[:10]
        
        # 方法2: 如果没有中文标签,从 game_details 提取
        elif 'tags' in game_details:
            tags_to_use = list(game_details.get('tags', {}).keys())[:10]
        
        # 方法3: 使用类型和分类作为标签
        elif genres or categories:
            tag_sources = []
            if genres:
                tag_sources.extend([g['description'] for g in genres])
            if categories:
                tag_sources.extend([c['description'] for c in categories[:5]])
            tags_to_use = tag_sources[:10]
        
        # 方法4: 最后使用 SteamSpy 的英文标签
        else:
            tags_dict = steamspy_data.get('tags', {})
            if isinstance(tags_dict, dict) and tags_dict:
                tags_to_use = list(tags_dict.keys())[:10]
        
        parsed_data["Tags"] = ', '.join(tags_to_use) if tags_to_use else 'N/A'
        
        # 2. 价格与销售数据
        price_overview = game_details.get('price_overview', {})
        if price_overview:
            parsed_data["Is_Free"] = False
            parsed_data["Currency"] = price_overview.get('currency', 'N/A')
            parsed_data["Initial_Price"] = price_overview.get('initial', 0) / 100  # 转换为元
            parsed_data["Final_Price"] = price_overview.get('final', 0) / 100
            parsed_data["Discount_Percent"] = price_overview.get('discount_percent', 0)
            parsed_data["Price_Formatted"] = price_overview.get('final_formatted', 'N/A')
        else:
            parsed_data["Is_Free"] = game_details.get('is_free', True)
            parsed_data["Currency"] = 'N/A'
            parsed_data["Initial_Price"] = 0
            parsed_data["Final_Price"] = 0
            parsed_data["Discount_Percent"] = 0
            parsed_data["Price_Formatted"] = 'Free' if parsed_data["Is_Free"] else 'N/A'
        
        # 3. 用户反馈与活跃度
        # 评分信息
        metacritic = game_details.get('metacritic', {})
        parsed_data["Metacritic_Score"] = metacritic.get('score', None)
        
        # Steam 评价 (需要从recommendations获取)
        recommendations = game_details.get('recommendations', {})
        parsed_data["Total_Reviews"] = recommendations.get('total', 0)
        
        # SteamSpy 数据
        parsed_data["Positive_Reviews"] = steamspy_data.get('positive', None)
        parsed_data["Negative_Reviews"] = steamspy_data.get('negative', None)
        
        # 计算好评率
        if parsed_data["Positive_Reviews"] and parsed_data["Negative_Reviews"]:
            total_reviews = parsed_data["Positive_Reviews"] + parsed_data["Negative_Reviews"]
            parsed_data["Positive_Rate"] = round(parsed_data["Positive_Reviews"] / total_reviews * 100, 2) if total_reviews > 0 else None
        else:
            parsed_data["Positive_Rate"] = None
        
        parsed_data["User_Score"] = steamspy_data.get('userscore', None)  # 0-100
        parsed_data["Owners"] = steamspy_data.get('owners', None)  # 拥有者范围
        parsed_data["Players_Forever"] = steamspy_data.get('players_forever', None)
        parsed_data["Players_2Weeks"] = steamspy_data.get('players_2weeks', None)
        parsed_data["Average_Playtime_Forever"] = steamspy_data.get('average_forever', None)  # 分钟
        parsed_data["Median_Playtime_Forever"] = steamspy_data.get('median_forever', None)
        
        # 在线人数 (优先使用 SteamCharts 数据)
        parsed_data["Current_Players"] = player_data.get('current_players', None)
        parsed_data["Peak_Players_24h"] = steamcharts_data.get('peak_players_24h', None)
        parsed_data["Peak_Players_AllTime"] = steamcharts_data.get('peak_players_alltime', None)
        parsed_data["Avg_Players_30d"] = steamcharts_data.get('avg_players_30d', None)
        
        # 4. 技术与支持
        # 支持的语言
        supported_languages = game_details.get('supported_languages', 'N/A')
        # 清理HTML标签 (简单处理)
        if supported_languages != 'N/A':
            supported_languages = supported_languages.replace('<strong>*</strong>', '').replace('<br>', ', ')
        parsed_data["Supported_Languages"] = supported_languages
        
        # 支持的平台
        platforms = game_details.get('platforms', {})
        parsed_data["Windows"] = platforms.get('windows', False)
        parsed_data["Mac"] = platforms.get('mac', False)
        parsed_data["Linux"] = platforms.get('linux', False)
        
        # 其他有用信息
        parsed_data["Required_Age"] = game_details.get('required_age', 0)
        parsed_data["DLC_Count"] = len(game_details.get('dlc', []))
        parsed_data["Achievements"] = game_details.get('achievements', {}).get('total', 0)
        
        return parsed_data
    
    def collect_games_data(self, app_ids: List[int], delay: float = 1.0, 
                          save_interval: int = 100,
                          skip_steamcharts: bool = False, resume_from: int = 0) -> pd.DataFrame:
        """
        批量采集游戏数据 (优化版,支持大规模采集)
        
        Args:
            app_ids: 要采集的 AppID 列表
            delay: 请求间隔时间（秒），避免被限流 (默认1.0秒)
            save_interval: 每采集多少个游戏保存一次数据 (默认100个)
            skip_steamcharts: 是否跳过SteamCharts数据 (默认False)
            resume_from: 从第几个游戏开始采集 (用于断点续传)
            
        Returns:
            包含所有游戏数据的 DataFrame
        """
        all_games_data = []
        total = len(app_ids)
        
        # 断点续传:加载已有数据
        if resume_from > 0:
            checkpoint_file = f"steam_data_checkpoint_{resume_from}.csv"
            if os.path.exists(checkpoint_file):
                print(f"检测到检查点文件: {checkpoint_file}")
                try:
                    existing_df = pd.read_csv(checkpoint_file, encoding='utf-8-sig')
                    # 反向映射列名
                    reverse_mapping = {v: k for k, v in self.column_mapping.items()}
                    existing_df.rename(columns=reverse_mapping, inplace=True)
                    all_games_data = existing_df.to_dict('records')
                    print(f"✓ 已加载 {len(all_games_data)} 条已采集数据")
                except Exception as e:
                    print(f"⚠ 加载检查点失败: {e}")
        
        print(f"\n开始采集 {total} 个游戏的数据...")
        print(f"起始位置: {resume_from + 1}")
        print(f"预计耗时: {(total - resume_from) * delay / 60:.1f} 分钟")
        print(f"优化设置: skip_steamcharts={skip_steamcharts}")
        print(f"保存间隔: 每 {save_interval} 个游戏\n")
        
        for idx, app_id in enumerate(app_ids, 1):
            # 跳过已采集的数据
            if idx <= resume_from:
                continue
            
            # 简化进度显示(每10个显示一次详情)
            if idx % 10 == 0 or idx <= 5:
                print(f"\n[{idx}/{total}] 正在采集 AppID: {app_id}")
            else:
                print(f"[{idx}/{total}] {app_id}", end=' ')
            
            try:
                # 获取游戏详情
                game_details = self.get_game_details(app_id)
                
                if game_details and game_details.get('type') == 'game':  # 只采集游戏
                    # 获取中文标签(从商店页面)
                    chinese_tags = self.get_chinese_tags_from_store_page(app_id)
                    time.sleep(0.2)  # 短暂延迟
                    
                    # 获取在线人数(快速)
                    player_data = self.get_player_count(app_id)
                    
                    # 获取 SteamSpy 数据
                    steamspy_data = self.get_steamspy_data(app_id)
                    time.sleep(0.3)  # 短暂延迟
                    
                    # 条件获取 SteamCharts 数据
                    if not skip_steamcharts:
                        steamcharts_data = self.get_steamcharts_data(app_id)
                        time.sleep(0.3)
                    else:
                        steamcharts_data = {"peak_players_24h": None, "peak_players_alltime": None, "avg_players_30d": None}
                    
                    # 解析数据(传入中文标签)
                    parsed_data = self.parse_game_data(
                        app_id, game_details, player_data,
                        steamspy_data, steamcharts_data,
                        chinese_tags=chinese_tags
                    )
                    
                    if parsed_data:
                        all_games_data.append(parsed_data)
                        if idx % 10 == 0 or idx <= 5:
                            print(f"  ✓ 成功: {parsed_data['Name']}")
                        else:
                            print("✓", end='')
                    else:
                        print("✗", end='')
                else:
                    print("⊘", end='')  # 跳过标记
                
            except Exception as e:
                print(f"\n  ✗ AppID {app_id} 采集出错: {e}")
                continue
            
            # 定期保存数据
            if idx % save_interval == 0 and all_games_data:
                self.save_checkpoint(all_games_data, f"steam_data_checkpoint_{idx}.csv")
                print(f"\n  💾 检查点已保存 ({len(all_games_data)} 条数据)")
            
            # 随机延迟,避免固定频率被识别
            random_delay = delay + random.uniform(0, 1.5)  # 在基础延迟上增加0-1.5秒随机值
            time.sleep(random_delay)
        
        print(f"\n采集完成! 共成功采集 {len(all_games_data)} 个游戏数据")
        
        # 转换为 DataFrame
        df = pd.DataFrame(all_games_data)
        return df
    
    def save_checkpoint(self, data: List[Dict], filename: str):
        """保存检查点数据"""
        df = pd.DataFrame(data)
        df.rename(columns=self.column_mapping, inplace=True)
        df.to_csv(filename, index=False, encoding='utf-8-sig')
        print(f"  → 检查点已保存: {filename} (中文表头)")
    
    def save_to_csv(self, df: pd.DataFrame, filename: str = "steam_games_data.csv"):
        """
        保存数据到 CSV 文件
        
        Args:
            df: 数据 DataFrame
            filename: 输出文件名
        """
        # 复制 DataFrame 避免修改原数据
        df_chinese = df.copy()
        
        # 重命名列为中文
        df_chinese.rename(columns=self.column_mapping, inplace=True)
        
        # 保存为 CSV
        df_chinese.to_csv(filename, index=False, encoding='utf-8-sig')
        print(f"\n数据已保存到: {filename}")
        print(f"共 {len(df_chinese)} 条记录, {len(df_chinese.columns)} 个字段")
        print(f"✓ 表头已转换为中文")
    
    def get_top_games(self, limit: int = 100) -> List[int]:
        """
        获取热门游戏的 AppID 列表 (简单示例)
        实际使用时可以根据需要筛选
        
        Args:
            limit: 获取前 N 个应用
            
        Returns:
            AppID 列表
        """
        apps = self.get_all_apps()
        
        if not apps:
            return []
        
        # 这里简单返回前 N 个，实际使用时应该根据其他标准筛选
        # 例如：按照在线人数、评分等筛选热门游戏
        return [app['appid'] for app in apps[:limit]]
    
    def get_games_by_chinese_reviews(self, min_reviews: int = 1000, max_games: int = None) -> List[int]:
        """
        获取简体中文评论数大于指定数量的游戏列表
        
        Args:
            min_reviews: 最小评论数阈值
            max_games: 最大返回游戏数量 (None 表示不限制)
            
        Returns:
            符合条件的 AppID 列表
        """
        print(f"\n开始搜索简体中文评论数 > {min_reviews} 的游戏...")
        print("这可能需要较长时间，请耐心等待...\n")
        
        # 直接获取用户要求数量的候选游戏
        fetch_limit = max_games if max_games else 10000
        fetch_limit = min(fetch_limit, 10000)  # 最多10000个
        print(f"将获取 {fetch_limit} 个候选游戏进行筛选...\n")
        
        all_apps = self.get_all_apps(limit=fetch_limit)
        
        # 如果获取应用列表失败，使用备用的热门游戏列表
        if not all_apps:
            print("\n⚠ 无法获取完整应用列表，使用预设的热门游戏 AppID 进行搜索...")
            print(f"提示: 这将仅搜索约 100 个预设的热门游戏(目标: {max_games or '不限制'})\n")
            
            # 预设的热门游戏 AppID (涵盖各类型)
            popular_app_ids = [
                570, 730, 440, 578080, 1172470, 271590, 1245620, 1938090, 292030, 431960,
                1086940, 1174180, 230410, 252490, 1203220, 1091500, 945360, 1237970, 377160,
                8930, 975370, 1326470, 1097150, 1449850, 1222670, 1296830, 1284410, 1794680,
                1599340, 1623730, 1144200, 1426210, 1716740, 1245040, 1817190, 1113000, 1426300,
                1332010, 1890800, 236390, 72850, 1151640, 1465360, 2195250, 2054970, 1938080,
                813780, 1454400, 1623660, 2399830, 2136490, 1217060, 1276790, 2442530, 1966720,
                976730, 1142710, 493520, 39210, 1659040, 1517290, 648800, 632360, 2379780,
                1145350, 1811260, 1203850, 1325200, 1240440, 1888930, 2358720, 2231450, 346110,
                1887720, 1593500, 1551360, 739630, 1174180, 892970, 1062090, 359550, 1057090,
                1250410, 620, 221100, 238960, 238960, 4000, 10, 20, 30, 40, 50, 70, 80, 100
            ]
            
            all_apps = [{'appid': aid, 'name': f'Game_{aid}'} for aid in popular_app_ids]
            print(f"将搜索 {len(all_apps)} 个预设游戏")
        
        print(f"开始从 {len(all_apps)} 个候选游戏中筛选符合条件的游戏...\n")
        qualified_app_ids = []
        checked_count = 0
        
        for app in all_apps:
            app_id = app['appid']
            checked_count += 1
            
            # 每检查100个应用显示一次进度
            if checked_count % 100 == 0:
                print(f"已检查: {checked_count}/{len(all_apps)} 个应用, 找到: {len(qualified_app_ids)} 个符合条件的游戏")
            
            try:
                # 获取游戏详情
                game_details = self.get_game_details(app_id, region="cn")
                
                if not game_details or game_details.get('type') != 'game':
                    continue
                
                # 检查是否支持简体中文
                supported_languages = game_details.get('supported_languages', '')
                if 'Simplified Chinese' not in supported_languages and '简体中文' not in supported_languages:
                    continue
                
                # 获取 SteamSpy 数据来检查评论数
                steamspy_data = self.get_steamspy_data(app_id)
                positive = steamspy_data.get('positive', 0) or 0
                negative = steamspy_data.get('negative', 0) or 0
                total_reviews = positive + negative
                
                if total_reviews > min_reviews:
                    qualified_app_ids.append(app_id)
                    print(f"  ✓ 找到: {game_details.get('name', 'Unknown')} (AppID: {app_id}, 评论数: {total_reviews:,})")
                
                # 短暂延迟避免限流
                time.sleep(0.3)
                
            except Exception as e:
                # 跳过出错的应用
                continue
        
        print(f"\n筛选完成!")
        print(f"从 {len(all_apps)} 个候选游戏中找到 {len(qualified_app_ids)} 个符合条件的游戏")
        print(f"(支持简体中文 且 评论数 > {min_reviews})")
        return qualified_app_ids
    
    def save_to_json(self, df: pd.DataFrame, filename: str = "steam_games_data.json"):
        """
        保存数据到 JSON 文件
        
        Args:
            df: 数据 DataFrame
            filename: 输出文件名
        """
        # 转换 DataFrame 为字典列表
        data_dict = df.to_dict('records')
        
        # 创建包含元数据的完整结构
        output_data = {
            "metadata": {
                "collection_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "total_games": len(df),
                "data_fields": list(df.columns),
                "collection_tool": "Steam Data Collector v2.0"
            },
            "statistics": {
                "free_games": int(df['Is_Free'].sum()) if 'Is_Free' in df.columns else 0,
                "paid_games": int((~df['Is_Free']).sum()) if 'Is_Free' in df.columns else 0,
                "avg_price": float(df[df['Final_Price'] > 0]['Final_Price'].mean()) if 'Final_Price' in df.columns and len(df[df['Final_Price'] > 0]) > 0 else 0,
                "avg_positive_rate": float(df['Positive_Rate'].mean()) if 'Positive_Rate' in df.columns and df['Positive_Rate'].notna().any() else 0,
                "total_reviews_sum": int(df['Total_Reviews'].sum()) if 'Total_Reviews' in df.columns else 0
            },
            "games": data_dict
        }
        
        # 保存为 JSON
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        
        print(f"\nJSON 数据已保存到: {filename}")
        print(f"包含 {len(data_dict)} 条游戏记录")
        print(f"文件大小: {os.path.getsize(filename) / 1024:.2f} KB")


def main():
    """主函数：演示如何使用数据采集器"""
    
    # 1. 初始化采集器 (如果有 API Key 可以传入)
    collector = SteamDataCollector(api_key=None)
    
    # 2. 方式一：手动指定要采集的游戏 AppID (推荐用于测试和特定游戏)
    # 这里列举了一些热门游戏作为示例
    sample_app_ids = [
        570,      # Dota 2
        730,      # CS:GO
        440,      # Team Fortress 2
        578080,   # PUBG
        1172470,  # Apex Legends
        271590,   # GTA V
        1245620,  # Elden Ring
        1938090,  # Call of Duty
        292030,   # The Witcher 3
        431960,   # Wallpaper Engine
    ]
    
    print("=" * 60)
    print("Steam 游戏数据采集脚本")
    print("=" * 60)
    
    # 用户选择采集模式
    print("\n请选择采集模式:")
    print("1. 采集示例游戏 (10个热门游戏)")
    print("2. 采集指定 AppID 列表")
    print("3. 采集简体中文评论数 > 1000 的游戏")
    print("4. 大规模采集 - SteamSpy Top 1000-10000 (⭐ 推荐)")
    
    choice = input("\n请输入选项 (1/2/3/4): ").strip()
    
    if choice == "1":
        app_ids = sample_app_ids
        print(f"\n将采集 {len(app_ids)} 个示例游戏")
        
    elif choice == "2":
        app_ids_str = input("请输入 AppID 列表，用逗号分隔 (例如: 570,730,440): ")
        app_ids = [int(x.strip()) for x in app_ids_str.split(',') if x.strip().isdigit()]
        print(f"\n将采集 {len(app_ids)} 个指定游戏")
    
    elif choice == "3":
        print("\n【简体中文高评论游戏采集模式】")
        min_reviews = input("请输入最小评论数阈值 (默认: 1000): ").strip()
        min_reviews = int(min_reviews) if min_reviews.isdigit() else 1000
        
        max_games = input("请输入最大采集游戏数 (留空=不限制): ").strip()
        max_games = int(max_games) if max_games.isdigit() else None
        
        print(f"\n搜索条件:")
        print(f"  - 支持简体中文")
        print(f"  - 评论数 > {min_reviews}")
        print(f"  - 最多采集: {'不限制' if max_games is None else f'{max_games} 个游戏'}")
        
        confirm = input("\n开始搜索? (y/n): ").strip().lower()
        if confirm == 'y':
            app_ids = collector.get_games_by_chinese_reviews(min_reviews, max_games)
            if not app_ids:
                print("未找到符合条件的游戏，程序退出")
                return
        else:
            print("已取消")
            return
    
    elif choice == "4":
        print("\n【大规模采集模式 - 优化版】")
        print("从 SteamSpy 获取热门游戏列表，支持 1000-10000 个游戏")
        
        num = input("请输入要采集的游戏数量 (1000-10000，推荐5000): ").strip()
        num = int(num) if num.isdigit() else 5000
        num = min(max(num, 100), 10000)  # 限制在 100-10000
        
        print(f"\n正在从 SteamSpy 获取 Top {num} 游戏...")
        apps = collector.get_apps_from_steamspy(limit=num)
        
        if not apps:
            print("获取游戏列表失败，程序退出")
            return
        
        app_ids = [app['appid'] for app in apps]
        print(f"✓ 成功获取 {len(app_ids)} 个游戏 AppID")
        
        # 优化选项
        print("\n性能优化选项:")
        skip_steamcharts = input("跳过 SteamCharts 数据? (y/n, 默认n): ").strip().lower() == 'y'
        
        # 断点续传
        resume = input("是否从断点继续? (y/n): ").strip().lower() == 'y'
        resume_from = 0
        if resume:
            resume_from = int(input("从第几个游戏开始 (输入数字): ").strip() or "0")
        
        print(f"\n采集配置:")
        print(f"  - 游戏数量: {len(app_ids)}")
        print(f"  - 跳过 SteamCharts: {skip_steamcharts}")
        print(f"  - 断点续传: 从第 {resume_from + 1} 个开始")
        print(f"  - 预计耗时: {len(app_ids) * 1.0 / 60:.1f} 分钟")
        
        confirm = input("\n确认开始采集? (y/n): ").strip().lower()
        if confirm != 'y':
            print("已取消")
            return
        
    else:
        print("无效选项，使用默认示例游戏列表")
        app_ids = sample_app_ids
        skip_steamcharts = False
        resume_from = 0
    
    # 3. 开始采集数据
    if app_ids:
        # 根据不同模式使用不同的采集参数
        if choice == "4":  # 大规模采集模式
            df = collector.collect_games_data(
                app_ids=app_ids,
                delay=1.0,
                save_interval=100,
                skip_steamcharts=skip_steamcharts,
                resume_from=resume_from
            )
        else:  # 其他模式使用标准参数 (增加延迟避免429错误)
            df = collector.collect_games_data(
                app_ids=app_ids,
                delay=2.0,  # 增加到2秒,避免触发速率限制
                save_interval=200
            )
        
        # 4. 保存最终数据
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"steam_games_data_{timestamp}.csv"
        collector.save_to_csv(df, filename)
        
        # 5. 保存 JSON 格式
        json_filename = f"steam_games_data_{timestamp}.json"
        collector.save_to_json(df, json_filename)
        
        # 6. 显示数据预览
        print("\n" + "=" * 60)
        print("数据预览 (前 5 条):")
        print("=" * 60)
        print(df.head().to_string())
        
        print("\n" + "=" * 60)
        print("数据统计:")
        print("=" * 60)
        print(f"总游戏数: {len(df)}")
        print(f"免费游戏: {df['Is_Free'].sum()}")
        if len(df[df['Final_Price'] > 0]) > 0:
            print(f"平均价格: ¥{df[df['Final_Price'] > 0]['Final_Price'].mean():.2f}")
        if 'Total_Reviews' in df.columns:
            print(f"平均评论数: {df['Total_Reviews'].mean():.0f}")
        if 'Positive_Rate' in df.columns and df['Positive_Rate'].notna().any():
            print(f"平均好评率: {df['Positive_Rate'].mean():.2f}%")
        
        print("\n" + "=" * 60)
        print("输出文件:")
        print("=" * 60)
        print(f"  ✓ CSV 文件: {filename}")
        print(f"  ✓ JSON 文件: {json_filename}")
        
    else:
        print("没有要采集的游戏数据")


if __name__ == "__main__":
    main()
