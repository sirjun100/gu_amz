import os
import random
import string
from contextlib import contextmanager

import pymysql
from pymysql.cursors import DictCursor
from pymysql.err import IntegrityError as PyMySQLIntegrityError
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash

load_dotenv()


def _mysql_params():
    return {
        "host": os.getenv("MYSQL_HOST", "127.0.0.1"),
        "port": int(os.getenv("MYSQL_PORT", "3306")),
        "user": os.getenv("MYSQL_USER", "root"),
        "password": os.getenv("MYSQL_PASSWORD", "123456"),
        "database": os.getenv("MYSQL_DATABASE", "tg_api"),
        "charset": "utf8mb4",
        "cursorclass": DictCursor,
        "autocommit": False,
    }


class Database:
    """MySQL 数据访问（每次操作独立连接）。"""

    @contextmanager
    def _cursor(self, dict_rows=True):
        conn = pymysql.connect(**_mysql_params())
        try:
            cur = conn.cursor(DictCursor if dict_rows else pymysql.cursors.Cursor)
            yield conn, cur
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def init_tables(self):
        with self._cursor() as (conn, cur):
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    telegram_id VARCHAR(64) NOT NULL UNIQUE,
                    username VARCHAR(255) NULL,
                    balance DOUBLE DEFAULT 0,
                    total_recharge DOUBLE DEFAULT 0,
                    total_applications INT DEFAULT 0,
                    apply_credits INT NOT NULL DEFAULT 0,
                    language VARCHAR(8) DEFAULT 'zh',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS orders (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    order_id VARCHAR(128) NOT NULL UNIQUE,
                    telegram_id VARCHAR(64) NOT NULL,
                    amount DOUBLE NOT NULL,
                    payment_method VARCHAR(64) NOT NULL,
                    credit_pack INT NULL,
                    status VARCHAR(32) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS codes (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    code VARCHAR(64) NOT NULL UNIQUE,
                    credits INT NOT NULL,
                    status VARCHAR(32) DEFAULT 'unused',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    used_at TIMESTAMP NULL,
                    used_by VARCHAR(64) NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS api_applications (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    telegram_id VARCHAR(64) NOT NULL,
                    phone VARCHAR(64) NOT NULL,
                    api_id VARCHAR(64) NOT NULL,
                    api_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS config (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cfg_key VARCHAR(255) NOT NULL UNIQUE,
                    cfg_value TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS admin_users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(64) NOT NULL UNIQUE,
                    password_hash VARCHAR(255) NOT NULL,
                    is_admin TINYINT(1) NOT NULL DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """
            )

        self._migrate_schema()
        self._init_default_config()
        self._ensure_default_admin()

    def _migrate_schema(self):
        """为已有库补充 apply_credits、orders.credit_pack。"""
        with self._cursor() as (conn, cur):
            cur.execute(
                """
                SELECT COUNT(*) AS c FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'apply_credits'
                """
            )
            if cur.fetchone()["c"] == 0:
                cur.execute("ALTER TABLE users ADD COLUMN apply_credits INT NOT NULL DEFAULT 0")
            cur.execute(
                """
                SELECT COUNT(*) AS c FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'credit_pack'
                """
            )
            if cur.fetchone()["c"] == 0:
                cur.execute("ALTER TABLE orders ADD COLUMN credit_pack INT NULL")

            cur.execute(
                """
                SELECT COUNT(*) AS c FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'trc20_pay_amount'
                """
            )
            if cur.fetchone()["c"] == 0:
                cur.execute("ALTER TABLE orders ADD COLUMN trc20_pay_amount DOUBLE NULL")

            cur.execute(
                """
                SELECT COUNT(*) AS c FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tron_processed_tx'
                """
            )
            if cur.fetchone()["c"] == 0:
                cur.execute(
                    """
                    CREATE TABLE tron_processed_tx (
                        tx_id VARCHAR(128) NOT NULL PRIMARY KEY,
                        order_id VARCHAR(128) NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                    """
                )

            cur.execute(
                """
                SELECT COLUMN_NAME AS n FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'codes'
                """
            )
            code_cols = {r["n"] for r in cur.fetchall()}
            if code_cols and "credits" not in code_cols and "value" in code_cols:
                cur.execute("ALTER TABLE codes ADD COLUMN credits INT NOT NULL DEFAULT 1")
                cur.execute("UPDATE codes SET credits = GREATEST(1, FLOOR(COALESCE(value, 0) + 0.5))")
                cur.execute("ALTER TABLE codes DROP COLUMN value")

    def _init_default_config(self):
        default_config = [
            ("BOT_TOKEN", ""),
            ("TRC20_ADDRESS", ""),
            ("OKPAY_ID", ""),
            ("OKPAY_TOKEN", ""),
            ("OKPAY_PAYED", "USDT"),
            ("OKPAY_RETURN_URL", "https://t.me/"),
            ("APPLY_PACK_1_PRICE", "1"),
            ("APPLY_PACK_10_PRICE", "7.5"),
            ("APPLY_PACK_50_PRICE", "25"),
            ("APPLY_PACK_100_PRICE", "35"),
            ("BOT_CUSTOM_MENU_JSON", "[]"),
            ("TRON_MONITOR_ENABLED", "0"),
            ("TRONGRID_API_KEY", ""),
            ("TRON_API_BASE", "https://api.trongrid.io"),
            ("TRON_USDT_CONTRACT", "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"),
            ("TRON_POLL_SECONDS", "45"),
            ("TRON_MIN_CONFIRMATIONS", "0"),
        ]
        with self._cursor() as (conn, cur):
            for key, value in default_config:
                cur.execute(
                    "INSERT IGNORE INTO config (cfg_key, cfg_value) VALUES (%s, %s)",
                    (key, value),
                )

    def _ensure_default_admin(self):
        with self._cursor() as (conn, cur):
            cur.execute("SELECT COUNT(*) AS c FROM admin_users")
            row = cur.fetchone()
            if row and row["c"] == 0:
                h = generate_password_hash("admin")
                cur.execute(
                    "INSERT INTO admin_users (username, password_hash, is_admin) VALUES (%s, %s, 1)",
                    ("admin", h),
                )

    def verify_admin_login(self, username: str, password: str):
        with self._cursor() as (conn, cur):
            cur.execute(
                "SELECT id, username, password_hash, is_admin FROM admin_users WHERE username = %s",
                (username,),
            )
            row = cur.fetchone()
            if not row or not check_password_hash(row["password_hash"], password):
                return None
            return {
                "id": row["id"],
                "username": row["username"],
                "is_admin": bool(row["is_admin"]),
            }

    def get_user(self, telegram_id):
        """元组: id, tg, username, balance, total_recharge, total_applications, apply_credits, language, created_at"""
        with self._cursor() as (conn, cur):
            cur.execute("SELECT * FROM users WHERE telegram_id = %s", (str(telegram_id),))
            row = cur.fetchone()
            if not row:
                return None
            return (
                row["id"],
                row["telegram_id"],
                row["username"],
                float(row["balance"] or 0),
                float(row["total_recharge"] or 0),
                int(row["total_applications"] or 0),
                int(row.get("apply_credits") or 0),
                row["language"] or "zh",
                row["created_at"],
            )

    def set_user_language(self, telegram_id, language: str):
        with self._cursor() as (conn, cur):
            cur.execute(
                "UPDATE users SET language = %s WHERE telegram_id = %s",
                (language, str(telegram_id)),
            )

    def create_user(self, telegram_id, username=None):
        try:
            with self._cursor() as (conn, cur):
                cur.execute(
                    "INSERT INTO users (telegram_id, username) VALUES (%s, %s)",
                    (str(telegram_id), username),
                )
            return True
        except PyMySQLIntegrityError:
            return False

    def update_balance(self, telegram_id, amount):
        with self._cursor() as (conn, cur):
            cur.execute(
                "UPDATE users SET balance = balance + %s WHERE telegram_id = %s",
                (amount, str(telegram_id)),
            )

    def update_total_recharge(self, telegram_id, amount):
        with self._cursor() as (conn, cur):
            cur.execute(
                "UPDATE users SET total_recharge = total_recharge + %s WHERE telegram_id = %s",
                (amount, str(telegram_id)),
            )

    def increment_application_count(self, telegram_id):
        with self._cursor() as (conn, cur):
            cur.execute(
                "UPDATE users SET total_applications = total_applications + 1 WHERE telegram_id = %s",
                (str(telegram_id),),
            )

    def create_order(self, order_id, telegram_id, amount, payment_method, credit_pack=None, trc20_pay_amount=None):
        with self._cursor() as (conn, cur):
            cur.execute(
                """
                INSERT INTO orders (order_id, telegram_id, amount, payment_method, credit_pack, trc20_pay_amount)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (order_id, str(telegram_id), amount, payment_method, credit_pack, trc20_pay_amount),
            )

    def fulfill_order(self, order_id: str) -> bool:
        """将 pending 订单置为完成，并给用户增加 credit_pack 次数、累计支付金额。"""
        with self._cursor() as (conn, cur):
            cur.execute(
                "SELECT telegram_id, amount, trc20_pay_amount, credit_pack, status FROM orders WHERE order_id = %s FOR UPDATE",
                (order_id,),
            )
            row = cur.fetchone()
            if not row or row["status"] != "pending":
                return False
            pack = int(row["credit_pack"] or 0)
            if pack <= 0:
                return False
            recharge = (
                float(row["trc20_pay_amount"])
                if row.get("trc20_pay_amount") is not None
                else float(row["amount"])
            )
            cur.execute(
                "UPDATE orders SET status = %s, completed_at = CURRENT_TIMESTAMP WHERE order_id = %s AND status = 'pending'",
                ("completed", order_id),
            )
            if cur.rowcount == 0:
                return False
            cur.execute(
                "UPDATE users SET apply_credits = apply_credits + %s, total_recharge = total_recharge + %s WHERE telegram_id = %s",
                (pack, recharge, str(row["telegram_id"])),
            )
        return True

    def list_pending_tron_orders(self):
        """待链上匹配的 USDT 订单（含 TRC20 精确金额）。"""
        with self._cursor() as (conn, cur):
            cur.execute(
                """
                SELECT order_id, telegram_id, trc20_pay_amount, credit_pack, amount, created_at
                FROM orders
                WHERE status = 'pending' AND payment_method = 'usdt' AND trc20_pay_amount IS NOT NULL
                """
            )
            return cur.fetchall()

    def tron_try_claim_tx_and_fulfill(self, tx_id: str, order_id: str) -> bool:
        """同一事务内占用 tx_id 并完成订单；避免重复入账。"""
        with self._cursor() as (conn, cur):
            try:
                cur.execute(
                    "INSERT INTO tron_processed_tx (tx_id, order_id) VALUES (%s, %s)",
                    (tx_id, order_id),
                )
            except PyMySQLIntegrityError:
                return False
            cur.execute(
                """
                SELECT telegram_id, amount, trc20_pay_amount, credit_pack, status
                FROM orders WHERE order_id = %s FOR UPDATE
                """,
                (order_id,),
            )
            row = cur.fetchone()
            if not row or row["status"] != "pending":
                cur.execute("DELETE FROM tron_processed_tx WHERE tx_id = %s", (tx_id,))
                return False
            pack = int(row["credit_pack"] or 0)
            if pack <= 0:
                cur.execute("DELETE FROM tron_processed_tx WHERE tx_id = %s", (tx_id,))
                return False
            recharge = (
                float(row["trc20_pay_amount"])
                if row.get("trc20_pay_amount") is not None
                else float(row["amount"])
            )
            cur.execute(
                """
                UPDATE orders SET status = %s, completed_at = CURRENT_TIMESTAMP
                WHERE order_id = %s AND status = 'pending'
                """,
                ("completed", order_id),
            )
            if cur.rowcount == 0:
                cur.execute("DELETE FROM tron_processed_tx WHERE tx_id = %s", (tx_id,))
                return False
            cur.execute(
                """
                UPDATE users SET apply_credits = apply_credits + %s, total_recharge = total_recharge + %s
                WHERE telegram_id = %s
                """,
                (pack, recharge, str(row["telegram_id"])),
            )
        return True

    def consume_apply_credit(self, telegram_id) -> bool:
        with self._cursor() as (conn, cur):
            cur.execute(
                "UPDATE users SET apply_credits = apply_credits - 1 WHERE telegram_id = %s AND apply_credits >= 1",
                (str(telegram_id),),
            )
            return cur.rowcount > 0

    def increment_apply_credits(self, telegram_id, n: int):
        with self._cursor() as (conn, cur):
            cur.execute(
                "UPDATE users SET apply_credits = apply_credits + %s WHERE telegram_id = %s",
                (int(n), str(telegram_id)),
            )

    def update_order_status(self, order_id, status):
        with self._cursor() as (conn, cur):
            cur.execute(
                "UPDATE orders SET status = %s, completed_at = CURRENT_TIMESTAMP WHERE order_id = %s",
                (status, order_id),
            )

    def get_pending_orders(self, telegram_id):
        with self._cursor() as (conn, cur):
            cur.execute(
                "SELECT order_id FROM orders WHERE telegram_id = %s AND status = 'pending'",
                (str(telegram_id),),
            )
            return cur.fetchall()

    def cancel_pending_orders(self, telegram_id):
        with self._cursor() as (conn, cur):
            cur.execute(
                "UPDATE orders SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP "
                "WHERE telegram_id = %s AND status = 'pending'",
                (str(telegram_id),),
            )
            return cur.rowcount

    def expire_pending_orders_older_than(self, minutes: int) -> list[dict]:
        """将创建超过 minutes 分钟仍为 pending 的订单置为 cancelled，返回需通知的列表（order_id, telegram_id）。"""
        out: list[dict] = []
        with self._cursor() as (conn, cur):
            cur.execute(
                """
                SELECT order_id, telegram_id FROM orders
                WHERE status = 'pending'
                  AND created_at < DATE_SUB(NOW(), INTERVAL %s MINUTE)
                FOR UPDATE
                """,
                (int(minutes),),
            )
            rows = cur.fetchall()
            for row in rows:
                oid = row["order_id"]
                cur.execute(
                    """
                    UPDATE orders SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP
                    WHERE order_id = %s AND status = 'pending'
                    """,
                    (oid,),
                )
                if cur.rowcount:
                    out.append({"order_id": oid, "telegram_id": str(row["telegram_id"])})
        return out

    def get_code(self, code):
        """返回元组 (id, code, credits, status, created_at, used_at, used_by)；[2] 为可兑换申请次数。"""
        with self._cursor() as (conn, cur):
            cur.execute("SELECT * FROM codes WHERE code = %s", (code,))
            row = cur.fetchone()
            if not row:
                return None
            cr = row.get("credits")
            if cr is None and row.get("value") is not None:
                cr = max(1, int(round(float(row["value"]))))
            return (
                row["id"],
                row["code"],
                int(cr or 0),
                row["status"],
                row["created_at"],
                row["used_at"],
                row["used_by"],
            )

    def use_code(self, code, telegram_id):
        with self._cursor() as (conn, cur):
            cur.execute(
                "UPDATE codes SET status = 'used', used_at = CURRENT_TIMESTAMP, used_by = %s "
                "WHERE code = %s AND status = 'unused'",
                (str(telegram_id), code),
            )
            ok = cur.rowcount > 0
            return ok

    def add_api_application(self, telegram_id, phone, api_id, api_hash):
        with self._cursor() as (conn, cur):
            cur.execute(
                "INSERT INTO api_applications (telegram_id, phone, api_id, api_hash) VALUES (%s, %s, %s, %s)",
                (str(telegram_id), phone, str(api_id), str(api_hash)),
            )

    def insert_code(self, code: str, credits: int):
        with self._cursor() as (conn, cur):
            cur.execute("INSERT INTO codes (code, credits) VALUES (%s, %s)", (code, int(credits)))

    def get_config(self, key, default=None):
        with self._cursor() as (conn, cur):
            cur.execute("SELECT cfg_value FROM config WHERE cfg_key = %s", (key,))
            row = cur.fetchone()
            return row["cfg_value"] if row else default

    def set_config(self, key, value):
        with self._cursor() as (conn, cur):
            cur.execute(
                """
                INSERT INTO config (cfg_key, cfg_value) VALUES (%s, %s)
                ON DUPLICATE KEY UPDATE cfg_value = VALUES(cfg_value), updated_at = CURRENT_TIMESTAMP
                """,
                (key, str(value)),
            )

    def get_all_config(self):
        with self._cursor() as (conn, cur):
            cur.execute("SELECT cfg_key, cfg_value FROM config")
            return {r["cfg_key"]: r["cfg_value"] for r in cur.fetchall()}

    def admin_add_apply_credits(self, telegram_id: str, count: int):
        with self._cursor() as (conn, cur):
            cur.execute(
                "UPDATE users SET apply_credits = apply_credits + %s WHERE telegram_id = %s",
                (int(count), str(telegram_id)),
            )
            return cur.rowcount

    def admin_stats(self):
        with self._cursor() as (conn, cur):
            cur.execute("SELECT COUNT(*) AS c FROM users")
            total_users = cur.fetchone()["c"]
            cur.execute("SELECT COUNT(*) AS c FROM orders")
            total_orders = cur.fetchone()["c"]
            cur.execute("SELECT COUNT(*) AS c FROM codes")
            total_codes = cur.fetchone()["c"]
            cur.execute("SELECT COALESCE(SUM(total_applications), 0) AS s FROM users")
            total_application_events = int(cur.fetchone()["s"] or 0)
        return {
            "total_users": total_users,
            "total_orders": total_orders,
            "total_codes": total_codes,
            "total_applications": total_application_events,
        }

    def admin_list_tg_users(self, page: int, per_page: int):
        offset = (page - 1) * per_page
        with self._cursor() as (conn, cur):
            cur.execute("SELECT COUNT(*) AS c FROM users")
            total = cur.fetchone()["c"]
            cur.execute(
                "SELECT * FROM users ORDER BY created_at DESC LIMIT %s OFFSET %s",
                (per_page, offset),
            )
            rows = cur.fetchall()
        return total, rows

    def admin_list_orders(self, page: int, per_page: int):
        offset = (page - 1) * per_page
        with self._cursor() as (conn, cur):
            cur.execute("SELECT COUNT(*) AS c FROM orders")
            total = cur.fetchone()["c"]
            cur.execute(
                "SELECT * FROM orders ORDER BY created_at DESC LIMIT %s OFFSET %s",
                (per_page, offset),
            )
            rows = cur.fetchall()
        return total, rows

    def admin_list_codes(self, page: int, per_page: int):
        offset = (page - 1) * per_page
        with self._cursor() as (conn, cur):
            cur.execute("SELECT COUNT(*) AS c FROM codes")
            total = cur.fetchone()["c"]
            cur.execute(
                "SELECT * FROM codes ORDER BY created_at DESC LIMIT %s OFFSET %s",
                (per_page, offset),
            )
            rows = cur.fetchall()
        return total, rows

    def admin_list_api_applications(self, page: int, per_page: int):
        offset = (page - 1) * per_page
        with self._cursor() as (conn, cur):
            cur.execute("SELECT COUNT(*) AS c FROM api_applications")
            total = cur.fetchone()["c"]
            cur.execute(
                "SELECT * FROM api_applications ORDER BY created_at DESC LIMIT %s OFFSET %s",
                (per_page, offset),
            )
            rows = cur.fetchall()
        return total, rows

    def admin_generate_codes(self, count: int, credits: int):
        chars = string.ascii_uppercase + string.digits

        def one_code():
            return "".join(random.choice(chars) for _ in range(12))

        c = max(1, int(credits))
        with self._cursor() as (conn, cur):
            for _ in range(count):
                for _attempt in range(20):
                    code = one_code()
                    try:
                        cur.execute("INSERT INTO codes (code, credits) VALUES (%s, %s)", (code, c))
                        break
                    except PyMySQLIntegrityError:
                        continue

    def close(self):
        pass


db = Database()
