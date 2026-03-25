import sqlite3
import os
from pathlib import Path

# 数据库文件路径
DB_DIR = Path("db")
DB_FILE = DB_DIR / "tgapi.db"

# 确保数据库目录存在
DB_DIR.mkdir(exist_ok=True)

class Database:
    """数据库管理类"""
    
    def __init__(self):
        self.conn = sqlite3.connect(DB_FILE)
        self.cursor = self.conn.cursor()
        self.init_tables()
    
    def init_tables(self):
        """初始化数据库表"""
        # 用户表
        self.cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id TEXT UNIQUE NOT NULL,
            username TEXT,
            balance REAL DEFAULT 0.0,
            total_recharge REAL DEFAULT 0.0,
            total_applications INTEGER DEFAULT 0,
            language TEXT DEFAULT 'zh',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # 订单表
        self.cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT UNIQUE NOT NULL,
            telegram_id TEXT NOT NULL,
            amount REAL NOT NULL,
            payment_method TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP
        )
        ''')
        
        # 卡密表
        self.cursor.execute('''
        CREATE TABLE IF NOT EXISTS codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            value REAL NOT NULL,
            status TEXT DEFAULT 'unused',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            used_at TIMESTAMP,
            used_by TEXT
        )
        ''')
        
        # API申请记录表
        self.cursor.execute('''
        CREATE TABLE IF NOT EXISTS api_applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id TEXT NOT NULL,
            phone TEXT NOT NULL,
            api_id TEXT NOT NULL,
            api_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # 配置表
        self.cursor.execute('''
        CREATE TABLE IF NOT EXISTS config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            value TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # 初始化默认配置
        self._init_default_config()
        
        self.conn.commit()
    
    def _init_default_config(self):
        """初始化默认配置"""
        default_config = [
            ('BOT_TOKEN', ''),
            ('ADMIN_USERS', ''),
            ('OKPAY_WEBHOOK_URL', ''),
            ('TRC20_ADDRESS', ''),
            ('PRICE_1', '1.0'),
            ('PRICE_5', '4.0'),
            ('BONUS_THRESHOLD', '20'),
            ('BONUS_RATE', '0.1')
        ]
        
        for key, value in default_config:
            self.cursor.execute(
                "INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)",
                (key, value)
            )
        self.conn.commit()
    
    def get_user(self, telegram_id):
        """获取用户信息"""
        self.cursor.execute("SELECT * FROM users WHERE telegram_id = ?", (telegram_id,))
        return self.cursor.fetchone()
    
    def create_user(self, telegram_id, username=None):
        """创建用户"""
        try:
            self.cursor.execute(
                "INSERT INTO users (telegram_id, username) VALUES (?, ?)",
                (telegram_id, username)
            )
            self.conn.commit()
            return True
        except sqlite3.IntegrityError:
            # 用户已存在
            return False
    
    def update_balance(self, telegram_id, amount):
        """更新用户余额"""
        self.cursor.execute(
            "UPDATE users SET balance = balance + ? WHERE telegram_id = ?",
            (amount, telegram_id)
        )
        self.conn.commit()
    
    def update_total_recharge(self, telegram_id, amount):
        """更新用户累计充值"""
        self.cursor.execute(
            "UPDATE users SET total_recharge = total_recharge + ? WHERE telegram_id = ?",
            (amount, telegram_id)
        )
        self.conn.commit()
    
    def increment_application_count(self, telegram_id):
        """增加用户申请次数"""
        self.cursor.execute(
            "UPDATE users SET total_applications = total_applications + 1 WHERE telegram_id = ?",
            (telegram_id,)
        )
        self.conn.commit()
    
    def create_order(self, order_id, telegram_id, amount, payment_method):
        """创建订单"""
        self.cursor.execute(
            "INSERT INTO orders (order_id, telegram_id, amount, payment_method) VALUES (?, ?, ?, ?)",
            (order_id, telegram_id, amount, payment_method)
        )
        self.conn.commit()
    
    def update_order_status(self, order_id, status):
        """更新订单状态"""
        self.cursor.execute(
            "UPDATE orders SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE order_id = ?",
            (status, order_id)
        )
        self.conn.commit()
    
    def get_pending_orders(self, telegram_id):
        """获取用户的未支付订单"""
        self.cursor.execute(
            "SELECT order_id FROM orders WHERE telegram_id = ? AND status = 'pending'",
            (telegram_id,)
        )
        return self.cursor.fetchall()
    
    def cancel_pending_orders(self, telegram_id):
        """取消用户的所有未支付订单"""
        self.cursor.execute(
            "UPDATE orders SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP WHERE telegram_id = ? AND status = 'pending'",
            (telegram_id,)
        )
        self.conn.commit()
        return self.cursor.rowcount
    
    def get_code(self, code):
        """获取卡密信息"""
        self.cursor.execute("SELECT * FROM codes WHERE code = ?", (code,))
        return self.cursor.fetchone()
    
    def use_code(self, code, telegram_id):
        """使用卡密"""
        self.cursor.execute(
            "UPDATE codes SET status = 'used', used_at = CURRENT_TIMESTAMP, used_by = ? WHERE code = ? AND status = 'unused'",
            (telegram_id, code)
        )
        affected = self.cursor.rowcount
        self.conn.commit()
        return affected > 0
    
    def add_api_application(self, telegram_id, phone, api_id, api_hash):
        """添加API申请记录"""
        self.cursor.execute(
            "INSERT INTO api_applications (telegram_id, phone, api_id, api_hash) VALUES (?, ?, ?, ?)",
            (telegram_id, phone, api_id, api_hash)
        )
        self.conn.commit()
    
    def close(self):
        """关闭数据库连接"""
        self.conn.close()
    
    def get_config(self, key, default=None):
        """获取配置值"""
        self.cursor.execute("SELECT value FROM config WHERE key = ?", (key,))
        result = self.cursor.fetchone()
        return result[0] if result else default
    
    def set_config(self, key, value):
        """设置配置值"""
        self.cursor.execute(
            "INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
            (key, value)
        )
        self.conn.commit()
    
    def get_all_config(self):
        """获取所有配置"""
        self.cursor.execute("SELECT key, value FROM config")
        return dict(self.cursor.fetchall())

# 创建数据库实例
db = Database()
