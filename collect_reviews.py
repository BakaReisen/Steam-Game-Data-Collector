"""
Steam 游戏评论爬取脚本
爬取指定游戏的好评和差评
"""

import pandas as pd
import requests
import time
import random
import json
from typing import Optional, List, Dict
import os
from datetime import datetime

class SteamReviewCollector:
    def __init__(self):
        """初始化评论收集器"""
        self.review_api_base = "https://store.steampowered.com/appreviews"
        
        # 随机User-Agent列表
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        ]
        
        # 会话对象
        self.session = requests.Session()
    
    def get_reviews(self, app_id: int, review_type: str = 'all', 
                   num_reviews: int = 100, language: str = 'all') -> List[Dict]:
        """
        获取游戏评论
        
        Args:
            app_id: Steam AppID
            review_type: 评论类型 ('positive', 'negative', 'all')
            num_reviews: 需要获取的评论数量
            language: 语言过滤 ('schinese', 'english', 'all')
            
        Returns:
            评论列表
        """
        print(f"\n[收集] AppID: {app_id}, 类型: {review_type}, 数量: {num_reviews}")
        
        reviews = []
        cursor = '*'  # Steam API 使用 cursor 进行翻页
        collected = 0
        
        while collected < num_reviews:
            try:
                # 构建请求参数
                params = {
                    'json': 1,
                    'filter': review_type,  # all, recent, updated
                    'language': language if language != 'all' else 'all',
                    'day_range': 9223372036854775807,  # 获取所有时间的评论
                    'cursor': cursor,
                    'review_type': review_type,  # positive, negative, all
                    'purchase_type': 'all',  # all, steam, non_steam_purchase
                    'num_per_page': min(100, num_reviews - collected)  # 每页最多100条
                }
                
                headers = {
                    'User-Agent': random.choice(self.user_agents),
                    'Accept': 'application/json',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
                }
                
                url = f"{self.review_api_base}/{app_id}"
                
                print(f"[请求] 正在获取评论... (已收集: {collected}/{num_reviews})")
                
                response = self.session.get(url, params=params, headers=headers, timeout=20)
                
                if response.status_code == 429:
                    print(f"[限制] 触发速率限制，等待 30 秒...")
                    time.sleep(30)
                    continue
                
                response.raise_for_status()
                data = response.json()
                
                # 检查是否成功
                if not data.get('success'):
                    print(f"[错误] API 返回失败")
                    break
                
                # 获取评论
                review_list = data.get('reviews', [])
                
                if not review_list:
                    print(f"[完成] 没有更多评论了")
                    break
                
                # 解析评论
                for review_data in review_list:
                    if collected >= num_reviews:
                        break
                    
                    review = self._parse_review(review_data, app_id)
                    reviews.append(review)
                    collected += 1
                
                # 更新 cursor 用于下一页
                cursor = data.get('cursor')
                if not cursor or cursor == '*':
                    print(f"[完成] 没有更多评论了")
                    break
                
                # 请求延迟
                time.sleep(0.5 + random.uniform(0, 0.5))
                
            except Exception as e:
                print(f"[错误] 获取评论失败: {e}")
                break
        
        print(f"[完成] 成功收集 {len(reviews)} 条评论")
        return reviews
    
    def _parse_review(self, review_data: Dict, app_id: int) -> Dict:
        """
        解析单条评论数据
        
        Args:
            review_data: 原始评论数据
            app_id: Steam AppID
            
        Returns:
            解析后的评论字典
        """
        author = review_data.get('author', {})
        
        return {
            'AppID': app_id,
            '评论ID': review_data.get('recommendationid'),
            '用户ID': author.get('steamid'),
            '用户名': author.get('num_games_owned', 'N/A'),
            '用户拥有游戏数': author.get('num_games_owned', 0),
            '用户评论数': author.get('num_reviews', 0),
            '是否推荐': '好评' if review_data.get('voted_up') else '差评',
            '投票类型': review_data.get('voted_up'),
            '评论内容': review_data.get('review', ''),
            '发布时间': datetime.fromtimestamp(review_data.get('timestamp_created', 0)).strftime('%Y-%m-%d %H:%M:%S'),
            '更新时间': datetime.fromtimestamp(review_data.get('timestamp_updated', 0)).strftime('%Y-%m-%d %H:%M:%S') if review_data.get('timestamp_updated') else None,
            '游戏时长(小时)': round(review_data.get('author', {}).get('playtime_forever', 0) / 60, 2),
            '评论游戏时长(小时)': round(review_data.get('author', {}).get('playtime_at_review', 0) / 60, 2),
            '有用数': review_data.get('votes_up', 0),
            '搞笑数': review_data.get('votes_funny', 0),
            '评论权重分数': review_data.get('weighted_vote_score', 0),
            '评论质量': review_data.get('comment_count', 0),
            '是否免费获得': review_data.get('received_for_free', False),
            '是否抢先体验评论': review_data.get('written_during_early_access', False),
            '语言': review_data.get('language', 'unknown'),
        }
    
    def collect_reviews_for_game(self, app_id: int, game_name: str,
                                 num_positive: int = 100, 
                                 num_negative: int = 100,
                                 language: str = 'all') -> pd.DataFrame:
        """
        收集指定游戏的好评和差评
        
        Args:
            app_id: Steam AppID
            game_name: 游戏名称
            num_positive: 需要的好评数量
            num_negative: 需要的差评数量
            language: 语言过滤
            
        Returns:
            评论DataFrame
        """
        print("=" * 80)
        print(f"收集游戏评论: {game_name} (AppID: {app_id})")
        print("=" * 80)
        
        all_reviews = []
        
        # 收集好评
        if num_positive > 0:
            print(f"\n[好评] 开始收集 {num_positive} 条好评...")
            positive_reviews = self.get_reviews(
                app_id, 
                review_type='positive', 
                num_reviews=num_positive,
                language=language
            )
            all_reviews.extend(positive_reviews)
            print(f"[好评] 收集完成: {len(positive_reviews)} 条")
        
        # 收集差评
        if num_negative > 0:
            print(f"\n[差评] 开始收集 {num_negative} 条差评...")
            negative_reviews = self.get_reviews(
                app_id, 
                review_type='negative', 
                num_reviews=num_negative,
                language=language
            )
            all_reviews.extend(negative_reviews)
            print(f"[差评] 收集完成: {len(negative_reviews)} 条")
        
        # 转换为DataFrame
        df = pd.DataFrame(all_reviews)
        
        if not df.empty:
            # 添加游戏名称
            df.insert(1, '游戏名称', game_name)
            
            # 统计信息
            print(f"\n[统计] 评论收集统计:")
            print(f"  - 总评论数: {len(df)}")
            if '是否推荐' in df.columns:
                print(f"  - 好评数: {(df['是否推荐'] == '好评').sum()}")
                print(f"  - 差评数: {(df['是否推荐'] == '差评').sum()}")
            
            # 语言分布
            if '语言' in df.columns and language == 'all':
                print(f"\n  语言分布:")
                lang_counts = df['语言'].value_counts().head(5)
                for lang, count in lang_counts.items():
                    print(f"    - {lang}: {count} 条")
        
        return df
    
    def collect_reviews_batch(self, game_list: List[tuple], 
                              num_positive: int = 100,
                              num_negative: int = 100,
                              language: str = 'all',
                              output_dir: str = None) -> Dict[str, pd.DataFrame]:
        """
        批量收集多个游戏的评论
        
        Args:
            game_list: 游戏列表 [(app_id, game_name), ...]
            num_positive: 每个游戏的好评数量
            num_negative: 每个游戏的差评数量
            language: 语言过滤
            output_dir: 输出目录
            
        Returns:
            游戏评论字典 {game_name: DataFrame}
        """
        print("\n" + "=" * 80)
        print(f"批量收集 {len(game_list)} 个游戏的评论")
        print("=" * 80)
        
        all_game_reviews = {}
        
        for idx, (app_id, game_name) in enumerate(game_list, 1):
            print(f"\n[{idx}/{len(game_list)}] 处理游戏: {game_name}")
            
            try:
                df = self.collect_reviews_for_game(
                    app_id, 
                    game_name,
                    num_positive,
                    num_negative,
                    language
                )
                
                all_game_reviews[game_name] = df
                
                # 保存单个游戏的评论
                if output_dir and not df.empty:
                    os.makedirs(output_dir, exist_ok=True)
                    
                    # 清理文件名
                    safe_name = "".join(c for c in game_name if c.isalnum() or c in (' ', '-', '_')).strip()
                    output_file = os.path.join(output_dir, f"{safe_name}_reviews.csv")
                    
                    df.to_csv(output_file, index=False, encoding='utf-8-sig')
                    print(f"[保存] 已保存到: {output_file}")
                
                # 游戏间延迟
                if idx < len(game_list):
                    time.sleep(2 + random.uniform(0, 1))
                
            except Exception as e:
                print(f"[错误] 处理游戏 {game_name} 失败: {e}")
                continue
        
        return all_game_reviews


def get_user_input():
    """
    获取用户输入
    
    Returns:
        (app_id, game_name, num_positive, num_negative, language) 或 None
    """
    print("\n" + "=" * 80)
    print("Steam 游戏评论收集工具")
    print("=" * 80)
    
    try:
        # 获取游戏信息
        print("\n请输入游戏信息:")
        app_id_input = input("  Steam AppID (例如: 730): ").strip()
        
        if not app_id_input:
            print("[错误] AppID 不能为空")
            return None
        
        try:
            app_id = int(app_id_input)
        except ValueError:
            print("[错误] AppID 必须是数字")
            return None
        
        game_name = input("  游戏名称 (例如: Counter-Strike 2): ").strip()
        if not game_name:
            print("[错误] 游戏名称不能为空")
            return None
        
        # 获取评论数量
        print("\n请输入需要收集的评论数量:")
        
        num_positive_input = input("  好评数量 (例如: 100): ").strip()
        if not num_positive_input:
            num_positive = 0
        else:
            try:
                num_positive = int(num_positive_input)
                if num_positive < 0:
                    print("[警告] 好评数量不能为负数，将设置为 0")
                    num_positive = 0
            except ValueError:
                print("[错误] 好评数量必须是数字")
                return None
        
        num_negative_input = input("  差评数量 (例如: 100): ").strip()
        if not num_negative_input:
            num_negative = 0
        else:
            try:
                num_negative = int(num_negative_input)
                if num_negative < 0:
                    print("[警告] 差评数量不能为负数，将设置为 0")
                    num_negative = 0
            except ValueError:
                print("[错误] 差评数量必须是数字")
                return None
        
        if num_positive == 0 and num_negative == 0:
            print("[错误] 好评和差评数量不能同时为 0")
            return None
        
        # 获取语言过滤
        print("\n请选择语言过滤:")
        print("  1. 所有语言 (all)")
        print("  2. 简体中文 (schinese)")
        print("  3. 英语 (english)")
        print("  4. 繁体中文 (tchinese)")
        
        language_choice = input("  请选择 (1-4，默认为1): ").strip()
        
        language_map = {
            '1': 'all',
            '2': 'schinese',
            '3': 'english',
            '4': 'tchinese',
            '': 'all'
        }
        
        language = language_map.get(language_choice, 'all')
        
        # 确认信息
        print("\n" + "-" * 80)
        print("确认收集信息:")
        print(f"  游戏: {game_name} (AppID: {app_id})")
        print(f"  好评数量: {num_positive}")
        print(f"  差评数量: {num_negative}")
        print(f"  语言过滤: {language}")
        print("-" * 80)
        
        confirm = input("\n是否开始收集? (y/n, 默认为y): ").strip().lower()
        if confirm and confirm != 'y':
            print("[取消] 用户取消操作")
            return None
        
        return app_id, game_name, num_positive, num_negative, language
        
    except KeyboardInterrupt:
        print("\n\n[取消] 用户中断操作")
        return None
    except Exception as e:
        print(f"\n[错误] 输入处理失败: {e}")
        return None


def main():
    """主函数 - 用户交互式输入"""
    # 获取用户输入
    user_input = get_user_input()
    
    if not user_input:
        print("\n[退出] 程序结束")
        return
    
    app_id, game_name, num_positive, num_negative, language = user_input
    
    # 创建收集器
    collector = SteamReviewCollector()
    
    # 收集评论
    try:
        df = collector.collect_reviews_for_game(
            app_id=app_id,
            game_name=game_name,
            num_positive=num_positive,
            num_negative=num_negative,
            language=language
        )
        
        # 保存结果
        script_dir = os.path.dirname(os.path.abspath(__file__))
        output_dir = os.path.join(script_dir, "DATA/reviews")
        os.makedirs(output_dir, exist_ok=True)
        
        # 清理文件名
        safe_name = "".join(c for c in game_name if c.isalnum() or c in (' ', '-', '_')).strip()
        safe_name = safe_name.replace(' ', '_')
        output_file = os.path.join(output_dir, f"{safe_name}_reviews.csv")
        
        df.to_csv(output_file, index=False, encoding='utf-8-sig')
        print(f"\n[完成] 评论已保存到: {output_file}")
        
        # 显示样本
        if not df.empty:
            print(f"\n[样本] 评论样本 (前5条):")
            print("-" * 80)
            sample_cols = ['游戏名称', '是否推荐', '游戏时长(小时)', '评论内容']
            available_cols = [col for col in sample_cols if col in df.columns]
            
            for idx, row in df[available_cols].head(5).iterrows():
                print(f"\n评论 {idx + 1}:")
                for col in available_cols:
                    value = row[col]
                    if col == '评论内容':
                        # 截断过长的评论
                        value = str(value)[:100] + '...' if len(str(value)) > 100 else value
                    print(f"  {col}: {value}")
            print("-" * 80)
        
        # 询问是否继续
        print("\n是否继续收集其他游戏的评论? (y/n, 默认为n): ", end='')
        continue_choice = input().strip().lower()
        
        if continue_choice == 'y':
            main()  # 递归调用继续收集
        else:
            print("\n" + "=" * 80)
            print("评论收集完成!")
            print("=" * 80)
    
    except Exception as e:
        print(f"\n[错误] 评论收集失败: {e}")
        print("\n" + "=" * 80)
        print("程序异常退出")
        print("=" * 80)


if __name__ == "__main__":
    main()
