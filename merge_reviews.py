"""
合并 reviews 文件夹下的所有评论 CSV 文件
将所有游戏的评论数据合并到一个文件中
"""

import pandas as pd
import os
from typing import List
import glob


def find_review_files(reviews_dir: str) -> List[str]:
    """
    查找 reviews 目录下的所有 CSV 文件
    
    Args:
        reviews_dir: reviews 目录路径
        
    Returns:
        CSV 文件路径列表
    """
    pattern = os.path.join(reviews_dir, "*.csv")
    csv_files = glob.glob(pattern)
    
    print(f"[发现] 找到 {len(csv_files)} 个评论文件")
    for file in csv_files:
        file_name = os.path.basename(file)
        file_size = os.path.getsize(file) / 1024  # KB
        print(f"  - {file_name} ({file_size:.2f} KB)")
    
    return csv_files


def merge_review_files(csv_files: List[str], output_file: str) -> pd.DataFrame:
    """
    合并多个评论 CSV 文件
    
    Args:
        csv_files: CSV 文件路径列表
        output_file: 输出文件路径
        
    Returns:
        合并后的 DataFrame
    """
    print("\n" + "=" * 80)
    print("开始合并评论文件")
    print("=" * 80)
    
    all_reviews = []
    total_rows = 0
    
    for idx, file_path in enumerate(csv_files, 1):
        file_name = os.path.basename(file_path)
        print(f"\n[{idx}/{len(csv_files)}] 读取: {file_name}")
        
        try:
            # 读取 CSV 文件
            df = pd.read_csv(file_path, encoding='utf-8-sig')
            
            rows = len(df)
            total_rows += rows
            
            print(f"  - 评论数: {rows}")
            
            # 显示评论类型分布
            if '是否推荐' in df.columns:
                positive = (df['是否推荐'] == '好评').sum()
                negative = (df['是否推荐'] == '差评').sum()
                print(f"  - 好评: {positive}, 差评: {negative}")
            
            all_reviews.append(df)
            
        except Exception as e:
            print(f"  [错误] 读取文件失败: {e}")
            continue
    
    if not all_reviews:
        print("\n[错误] 没有成功读取任何文件")
        return pd.DataFrame()
    
    # 合并所有 DataFrame
    print("\n" + "-" * 80)
    print("合并数据...")
    
    merged_df = pd.concat(all_reviews, ignore_index=True)
    
    print(f"[完成] 合并完成")
    print(f"  - 总评论数: {len(merged_df)}")
    print(f"  - 总游戏数: {len(csv_files)}")
    
    # 统计信息
    if '游戏名称' in merged_df.columns:
        print(f"\n游戏分布:")
        game_counts = merged_df['游戏名称'].value_counts()
        for game, count in game_counts.items():
            print(f"  - {game}: {count} 条评论")
    
    if '是否推荐' in merged_df.columns:
        print(f"\n评论类型分布:")
        positive_total = (merged_df['是否推荐'] == '好评').sum()
        negative_total = (merged_df['是否推荐'] == '差评').sum()
        print(f"  - 好评总数: {positive_total}")
        print(f"  - 差评总数: {negative_total}")
        print(f"  - 好评率: {positive_total / len(merged_df) * 100:.2f}%")
    
    if '语言' in merged_df.columns:
        print(f"\n语言分布 (前5):")
        lang_counts = merged_df['语言'].value_counts().head(5)
        for lang, count in lang_counts.items():
            print(f"  - {lang}: {count} 条")
    
    # 保存合并后的文件
    print(f"\n保存合并文件...")
    merged_df.to_csv(output_file, index=False, encoding='utf-8-sig')
    
    file_size = os.path.getsize(output_file) / 1024 / 1024  # MB
    print(f"[保存] 已保存到: {output_file}")
    print(f"  - 文件大小: {file_size:.2f} MB")
    
    return merged_df


def show_merged_statistics(df: pd.DataFrame):
    """
    显示合并后的数据统计
    
    Args:
        df: 合并后的 DataFrame
    """
    if df.empty:
        return
    
    print("\n" + "=" * 80)
    print("合并数据统计")
    print("=" * 80)
    
    # 基本信息
    print(f"\n基本信息:")
    print(f"  - 总评论数: {len(df)}")
    print(f"  - 列数: {len(df.columns)}")
    print(f"  - 内存占用: {df.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB")
    
    # 列名
    print(f"\n数据列:")
    for col in df.columns:
        non_null = df[col].notna().sum()
        null_count = df[col].isna().sum()
        print(f"  - {col}: {non_null} 非空, {null_count} 空值")
    
    # 数值统计
    numeric_cols = df.select_dtypes(include=['int64', 'float64']).columns
    if len(numeric_cols) > 0:
        print(f"\n数值列统计:")
        for col in numeric_cols:
            if col in ['游戏时长(小时)', '有用数', '评论质量']:
                mean_val = df[col].mean()
                median_val = df[col].median()
                max_val = df[col].max()
                print(f"  - {col}:")
                print(f"      平均: {mean_val:.2f}, 中位数: {median_val:.2f}, 最大: {max_val:.2f}")
    
    # 样本数据
    print(f"\n样本数据 (前3条):")
    print("-" * 80)
    sample_cols = ['游戏名称', '是否推荐', '游戏时长(小时)', '有用数', '评论内容']
    available_cols = [col for col in sample_cols if col in df.columns]
    
    for idx, row in df[available_cols].head(3).iterrows():
        print(f"\n评论 {idx + 1}:")
        for col in available_cols:
            value = row[col]
            if col == '评论内容':
                # 截断过长的评论
                value = str(value)[:80] + '...' if len(str(value)) > 80 else value
            print(f"  {col}: {value}")
    print("-" * 80)


def main():
    """主函数"""
    print("=" * 80)
    print("Steam 评论文件合并工具")
    print("=" * 80)
    
    # 设置路径
    script_dir = os.path.dirname(os.path.abspath(__file__))
    reviews_dir = os.path.join(script_dir, "DATA/reviews")
    output_file = os.path.join(script_dir, "DATA/all_reviews_merged.csv")
    
    # 检查目录是否存在
    if not os.path.exists(reviews_dir):
        print(f"\n[错误] reviews 目录不存在: {reviews_dir}")
        return
    
    print(f"\n输入目录: {reviews_dir}")
    print(f"输出文件: {output_file}")
    
    # 查找 CSV 文件
    csv_files = find_review_files(reviews_dir)
    
    if not csv_files:
        print("\n[错误] 未找到任何 CSV 文件")
        return
    
    # 确认操作
    print("\n" + "-" * 80)
    confirm = input(f"是否合并 {len(csv_files)} 个文件? (y/n, 默认为y): ").strip().lower()
    if confirm and confirm != 'y':
        print("[取消] 用户取消操作")
        return
    
    # 合并文件
    merged_df = merge_review_files(csv_files, output_file)
    
    # 显示统计信息
    if not merged_df.empty:
        show_merged_statistics(merged_df)
    
    print("\n" + "=" * 80)
    print("合并完成!")
    print("=" * 80)


if __name__ == "__main__":
    main()
