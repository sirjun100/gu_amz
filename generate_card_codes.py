import random
import string
from pathlib import Path
from src.db import db

# 生成卡密的函数
def generate_card_code(length=12):
    """生成指定长度的卡密"""
    characters = string.ascii_uppercase + string.digits
    return ''.join(random.choice(characters) for _ in range(length))

# 生成卡密并保存到数据库
def generate_cards(count=100, value=1.0):
    """生成指定数量和面值的卡密"""
    for i in range(count):
        code = generate_card_code()
        try:
            # 插入卡密到数据库
            db.cursor.execute(
                "INSERT INTO codes (code, value) VALUES (?, ?)",
                (code, value)
            )
            print(f"生成卡密: {code}, 面值: {value}u")
        except Exception as e:
            print(f"生成卡密失败: {e}")
    db.conn.commit()
    print(f"成功生成 {count} 个卡密，面值 {value}u")

if __name__ == "__main__":
    # 生成不同面值的卡密
    generate_cards(count=50, value=1.0)  # 1u 卡密
    generate_cards(count=30, value=5.0)  # 5u 卡密
    generate_cards(count=20, value=10.0)  # 10u 卡密
