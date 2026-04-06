import json
import os
from contextlib import contextmanager
from datetime import date, timezone

import pymysql
from pymysql.cursors import DictCursor
from dotenv import load_dotenv
from werkzeug.security import check_password_hash, generate_password_hash

from .paths import unlink_task_image_files
from .reg_password import generate_registration_password

load_dotenv()

CLICK_TASK_TYPES = frozenset({"search_click", "related_click", "similar_click"})

SCREENSHOT_UPLOAD_POLICIES = frozenset({"all", "failed_only", "none"})


def normalize_target_asin(raw: str | None) -> str:
    """Amazon ASIN：去空白、大写；长度 10～16，仅字母数字。"""
    s = "".join((raw or "").strip().upper().split())
    if len(s) < 10 or len(s) > 16 or not s.isalnum():
        return ""
    return s


def normalize_screenshot_upload_policy(value: str | None) -> str:
    s = (value or "all").strip().lower()
    return s if s in SCREENSHOT_UPLOAD_POLICIES else "all"


def _normalize_click_params_dict(obj: dict) -> dict:
    """点击类 params：keyword + res_folder_name（1:1）。兼容旧 JSON 中的 product_title(s)。"""
    kw = (obj.get("keyword") or "") or ""
    fn = (obj.get("res_folder_name") or "").strip()
    if not fn:
        pt = (obj.get("product_title") or "").strip()
        arr = obj.get("product_titles")
        if isinstance(arr, list) and arr:
            fn = str(arr[0]).strip()
        elif pt:
            fn = pt
    return {"keyword": kw, "res_folder_name": fn}


def parse_task_params(row: dict | None) -> dict:
    """Build params dict from DB row (uses params JSON or legacy columns)."""
    if not row:
        return {}
    tt0 = row.get("task_type") or ""
    raw = row.get("params")
    if isinstance(raw, str) and raw.strip():
        try:
            obj = json.loads(raw)
            if isinstance(obj, dict):
                if tt0 in CLICK_TASK_TYPES:
                    return _normalize_click_params_dict(obj)
                return obj
            return {"value": obj}
        except json.JSONDecodeError:
            return {"_invalid_params": raw[:500]}
    if isinstance(raw, dict):
        if tt0 in CLICK_TASK_TYPES:
            return _normalize_click_params_dict(dict(raw))
        return raw
    tt = row.get("task_type") or ""
    if tt in CLICK_TASK_TYPES:
        kw = (row.get("keyword") or "") or ""
        pt = (row.get("product_title") or "") or ""
        return {"keyword": kw, "res_folder_name": pt.strip()}
    if tt == "register":
        snap = row.get("address_snapshot")
        snap_obj: dict | str | None = None
        if isinstance(snap, str) and snap.strip():
            try:
                snap_obj = json.loads(snap)
            except json.JSONDecodeError:
                snap_obj = snap
        return {
            "phone": (row.get("phone") or "") or "",
            "account_username": (row.get("account_username") or "") or "",
            "account_password": (row.get("account_password") or "") or "",
            "address_id": row.get("address_id"),
            "address_snapshot": snap_obj,
        }
    return {}


def _mysql_params():
    return {
        "host": os.getenv("MYSQL_HOST", "127.0.0.1"),
        "port": int(os.getenv("MYSQL_PORT", "3306")),
        "user": os.getenv("MYSQL_USER", "root"),
        "password": os.getenv("MYSQL_PASSWORD", "123456"),
        "database": os.getenv("MYSQL_DATABASE", "amz"),
        "charset": "utf8mb4",
        "cursorclass": DictCursor,
        "autocommit": False,
    }


class Database:
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
                CREATE TABLE IF NOT EXISTS admin_users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(64) NOT NULL UNIQUE,
                    password_hash VARCHAR(255) NOT NULL,
                    is_admin TINYINT(1) NOT NULL DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS devices (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    device_id VARCHAR(128) NOT NULL UNIQUE,
                    alias VARCHAR(255) NULL,
                    last_seen_at TIMESTAMP NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS tasks (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    device_id VARCHAR(128) NULL,
                    task_type VARCHAR(32) NOT NULL,
                    status VARCHAR(16) NOT NULL DEFAULT 'pending',
                    params LONGTEXT NULL,
                    keyword VARCHAR(512) NULL,
                    product_title VARCHAR(1024) NULL,
                    failure_detail TEXT NULL,
                    retry_count INT NOT NULL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    started_at TIMESTAMP NULL,
                    finished_at TIMESTAMP NULL,
                    task_environment VARCHAR(256) NULL,
                    INDEX idx_tasks_device (device_id),
                    INDEX idx_tasks_status (status),
                    INDEX idx_tasks_type (task_type)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS task_logs (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    task_id BIGINT NOT NULL,
                    body TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_task_logs_task (task_id),
                    CONSTRAINT fk_task_logs_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS task_images (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    task_id BIGINT NOT NULL,
                    stored_name VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY uq_task_images_name (stored_name),
                    INDEX idx_task_images_task (task_id),
                    CONSTRAINT fk_task_images_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS random_keywords (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    keyword VARCHAR(512) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_rk_kw (keyword(191))
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS us_addresses (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    recipient_name VARCHAR(255) NULL,
                    state VARCHAR(64) NULL,
                    city VARCHAR(255) NULL,
                    address_line1 VARCHAR(512) NULL,
                    address_line2 VARCHAR(512) NULL,
                    zip_code VARCHAR(64) NULL,
                    phone VARCHAR(64) NULL,
                    full_line VARCHAR(1024) NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """
            )
        self._migrate_tasks_extra_columns()
        self._migrate_task_images_description()
        self._migrate_tasks_persist_data()
        self._migrate_app_settings_and_saved_records()
        self._migrate_devices_screenshot_upload_policy()
        self._migrate_target_asins()
        self._migrate_asin_click_records()
        self._ensure_default_admin()
        self._ensure_default_app_settings()

    def _migrate_target_asins(self):
        with self._cursor() as (conn, cur):
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS target_asins (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    asin VARCHAR(16) NOT NULL,
                    note VARCHAR(512) NULL,
                    total_clicks INT NOT NULL DEFAULT 0,
                    today_clicks INT NOT NULL DEFAULT 0,
                    stats_date DATE NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY uq_target_asins_asin (asin),
                    INDEX idx_target_asins_stats_date (stats_date)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """
            )

    def _migrate_asin_click_records(self):
        with self._cursor() as (conn, cur):
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS asin_click_records (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    asin VARCHAR(16) NOT NULL,
                    keyword VARCHAR(512) NOT NULL,
                    device_id VARCHAR(128) NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_acr_asin (asin),
                    INDEX idx_acr_created (created_at),
                    INDEX idx_acr_keyword (keyword(191))
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """
            )

    def _migrate_task_images_description(self):
        with self._cursor() as (conn, cur):
            cur.execute(
                """
                SELECT COLUMN_NAME AS n FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'task_images'
                """
            )
            cols = {r["n"] for r in cur.fetchall()}
            if not cols:
                return
            if "description" not in cols:
                cur.execute("ALTER TABLE task_images ADD COLUMN description VARCHAR(512) NULL")

    def _migrate_tasks_extra_columns(self):
        with self._cursor() as (conn, cur):
            cur.execute(
                """
                SELECT COLUMN_NAME AS n FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks'
                """
            )
            cols = {r["n"] for r in cur.fetchall()}
            if not cols:
                return
            parts = []
            if "phone" not in cols:
                parts.append("ADD COLUMN phone VARCHAR(128) NULL")
            if "account_username" not in cols:
                parts.append("ADD COLUMN account_username VARCHAR(255) NULL")
            if "account_password" not in cols:
                parts.append("ADD COLUMN account_password VARCHAR(255) NULL")
            if "address_id" not in cols:
                parts.append("ADD COLUMN address_id BIGINT NULL")
            if "address_snapshot" not in cols:
                parts.append("ADD COLUMN address_snapshot TEXT NULL")
            if "params" not in cols:
                parts.append("ADD COLUMN params LONGTEXT NULL")
            if "task_environment" not in cols:
                parts.append("ADD COLUMN task_environment VARCHAR(256) NULL")
            if parts:
                cur.execute("ALTER TABLE tasks " + ", ".join(parts))
            self._backfill_tasks_params_column(cur)

    def _migrate_tasks_persist_data(self):
        with self._cursor() as (conn, cur):
            cur.execute(
                """
                SELECT COLUMN_NAME AS n FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks'
                """
            )
            cols = {r["n"] for r in cur.fetchall()}
            if not cols:
                return
            if "persist_data" not in cols:
                cur.execute(
                    "ALTER TABLE tasks ADD COLUMN persist_data TINYINT(1) NOT NULL DEFAULT 0"
                )

    def _migrate_app_settings_and_saved_records(self):
        with self._cursor() as (conn, cur):
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS app_settings (
                    setting_key VARCHAR(64) NOT NULL PRIMARY KEY,
                    setting_value TEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS task_saved_records (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    task_type VARCHAR(32) NOT NULL,
                    content LONGTEXT NOT NULL,
                    source_task_id BIGINT NULL,
                    device_id VARCHAR(128) NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_tsr_type (task_type),
                    INDEX idx_tsr_source (source_task_id),
                    INDEX idx_tsr_created (created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """
            )

    def _migrate_devices_screenshot_upload_policy(self):
        with self._cursor() as (conn, cur):
            cur.execute(
                """
                SELECT COLUMN_NAME AS n FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'devices'
                """
            )
            cols = {r["n"] for r in cur.fetchall()}
            if not cols:
                return
            if "screenshot_upload_policy" not in cols:
                cur.execute(
                    """
                    ALTER TABLE devices
                    ADD COLUMN screenshot_upload_policy VARCHAR(24) NOT NULL DEFAULT 'all'
                    """
                )

    def _ensure_default_app_settings(self):
        with self._cursor() as (conn, cur):
            cur.execute(
                """
                INSERT IGNORE INTO app_settings (setting_key, setting_value)
                VALUES ('task_retention_days', '15')
                """
            )

    def get_app_setting(self, key: str, default: str | None = None) -> str | None:
        with self._cursor() as (conn, cur):
            cur.execute(
                "SELECT setting_value FROM app_settings WHERE setting_key = %s",
                (key,),
            )
            row = cur.fetchone()
            if not row:
                return default
            return row.get("setting_value") or default

    def set_app_setting(self, key: str, value: str) -> None:
        with self._cursor() as (conn, cur):
            cur.execute(
                """
                INSERT INTO app_settings (setting_key, setting_value)
                VALUES (%s, %s)
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
                """,
                (key, value),
            )

    def get_task_retention_days(self) -> int:
        raw = self.get_app_setting("task_retention_days", "15")
        try:
            n = int(raw or 15)
        except (TypeError, ValueError):
            n = 15
        return max(1, min(n, 3650))

    def set_task_retention_days(self, days: int) -> None:
        d = max(1, min(int(days), 3650))
        self.set_app_setting("task_retention_days", str(d))

    def purge_completed_tasks_older_than_days(self, days: int) -> int:
        """Delete finished tasks (success/failed) whose finished_at is older than N days.

        task_logs / task_images rows are removed via ON DELETE CASCADE.
        Screenshot files under data/task_images are deleted explicitly before removing tasks.
        """
        d = max(1, int(days))
        with self._cursor() as (conn, cur):
            cur.execute(
                """
                SELECT ti.stored_name
                FROM task_images ti
                INNER JOIN tasks t ON t.id = ti.task_id
                WHERE t.status IN ('success', 'failed')
                  AND t.finished_at IS NOT NULL
                  AND t.finished_at < DATE_SUB(NOW(), INTERVAL %s DAY)
                """,
                (d,),
            )
            names = [r["stored_name"] for r in cur.fetchall()]
            unlink_task_image_files(names)
            cur.execute(
                """
                DELETE FROM tasks
                WHERE status IN ('success', 'failed')
                  AND finished_at IS NOT NULL
                  AND finished_at < DATE_SUB(NOW(), INTERVAL %s DAY)
                """,
                (d,),
            )
            return int(cur.rowcount or 0)

    def insert_task_saved_record(
        self,
        task_type: str,
        content: dict,
        source_task_id: int | None = None,
        device_id: str | None = None,
    ) -> int:
        body = json.dumps(content, default=str, ensure_ascii=False)
        with self._cursor() as (conn, cur):
            cur.execute(
                """
                INSERT INTO task_saved_records (task_type, content, source_task_id, device_id)
                VALUES (%s, %s, %s, %s)
                """,
                (task_type, body, source_task_id, (device_id or "").strip() or None),
            )
            return int(cur.lastrowid)

    def _insert_task_saved_record_cur(self, cur, task_type: str, content: dict, source_task_id: int | None, device_id: str | None):
        body = json.dumps(content, default=str, ensure_ascii=False)
        cur.execute(
            """
            INSERT INTO task_saved_records (task_type, content, source_task_id, device_id)
            VALUES (%s, %s, %s, %s)
            """,
            (task_type, body, source_task_id, (device_id or "").strip() or None),
        )

    def _merge_task_saved_record_for_source_cur(self, cur, source_task_id: int, merge: dict):
        cur.execute(
            "SELECT id, content FROM task_saved_records WHERE source_task_id = %s LIMIT 1 FOR UPDATE",
            (source_task_id,),
        )
        row = cur.fetchone()
        if not row:
            return
        try:
            data = json.loads(row["content"] or "{}")
        except json.JSONDecodeError:
            data = {}
        if not isinstance(data, dict):
            data = {"_raw": data}
        data.update(merge)
        cur.execute(
            "UPDATE task_saved_records SET content = %s WHERE id = %s",
            (json.dumps(data, default=str, ensure_ascii=False), row["id"]),
        )

    def list_task_saved_records(
        self,
        page: int,
        per_page: int,
        task_type: str | None = None,
        q: str | None = None,
    ):
        offset = (page - 1) * per_page
        where = ["1=1"]
        params: list = []
        if task_type and str(task_type).strip():
            where.append("task_type = %s")
            params.append(str(task_type).strip())
        if q and str(q).strip():
            where.append("(content LIKE %s OR CAST(device_id AS CHAR) LIKE %s OR CAST(source_task_id AS CHAR) LIKE %s)")
            needle = f"%{str(q).strip()}%"
            params.extend([needle, needle, needle])
        wsql = " AND ".join(where)
        with self._cursor() as (conn, cur):
            cur.execute(f"SELECT COUNT(*) AS c FROM task_saved_records WHERE {wsql}", params)
            total = cur.fetchone()["c"]
            cur.execute(
                f"""
                SELECT id, task_type, content, source_task_id, device_id, created_at
                FROM task_saved_records
                WHERE {wsql}
                ORDER BY id DESC
                LIMIT %s OFFSET %s
                """,
                [*params, per_page, offset],
            )
            rows = cur.fetchall()
        return total, rows

    def _backfill_tasks_params_column(self, cur) -> None:
        cur.execute(
            """
            SELECT id, task_type, keyword, product_title, phone, account_username, account_password,
                   address_id, address_snapshot, params
            FROM tasks
            WHERE params IS NULL OR TRIM(COALESCE(params, '')) = ''
            """
        )
        for row in cur.fetchall():
            tid = row["id"]
            tt = row["task_type"] or ""
            if tt in CLICK_TASK_TYPES:
                pt = (row.get("product_title") or "") or ""
                obj = {
                    "keyword": (row.get("keyword") or "") or "",
                    "res_folder_name": pt.strip(),
                }
            elif tt == "register":
                snap = row.get("address_snapshot")
                snap_obj = None
                if isinstance(snap, str) and snap.strip():
                    try:
                        snap_obj = json.loads(snap)
                    except json.JSONDecodeError:
                        snap_obj = snap
                obj = {
                    "phone": (row.get("phone") or "") or "",
                    "account_username": (row.get("account_username") or "") or "",
                    "account_password": (row.get("account_password") or "") or "",
                    "address_id": row.get("address_id"),
                    "address_snapshot": snap_obj,
                }
            else:
                obj = {}
            if not obj and tt not in CLICK_TASK_TYPES and tt != "register":
                continue
            cur.execute(
                "UPDATE tasks SET params = %s WHERE id = %s",
                (json.dumps(obj, default=str, ensure_ascii=False), tid),
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

    def upsert_device_heartbeat(self, device_id: str):
        did = device_id.strip()
        if not did:
            return
        with self._cursor() as (conn, cur):
            cur.execute(
                """
                INSERT INTO devices (device_id, last_seen_at) VALUES (%s, CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE last_seen_at = CURRENT_TIMESTAMP
                """,
                (did,),
            )

    def set_device_alias(self, device_id: str, alias: str | None):
        with self._cursor() as (conn, cur):
            cur.execute(
                "UPDATE devices SET alias = %s WHERE device_id = %s",
                (alias, device_id),
            )

    def get_device_by_device_id(self, device_id: str):
        did = (device_id or "").strip()
        if not did:
            return None
        with self._cursor() as (conn, cur):
            cur.execute("SELECT * FROM devices WHERE device_id = %s", (did,))
            return cur.fetchone()

    def get_device_screenshot_upload_policy(self, device_id: str) -> str:
        row = self.get_device_by_device_id(device_id)
        if not row:
            return "all"
        return normalize_screenshot_upload_policy(row.get("screenshot_upload_policy"))

    def upsert_device_screenshot_upload_policy(self, device_id: str, policy: str) -> None:
        p = normalize_screenshot_upload_policy(policy)
        did = (device_id or "").strip()
        if not did:
            raise ValueError("EMPTY_DEVICE_ID")
        with self._cursor() as (conn, cur):
            cur.execute(
                """
                INSERT INTO devices (device_id, screenshot_upload_policy)
                VALUES (%s, %s)
                ON DUPLICATE KEY UPDATE screenshot_upload_policy = VALUES(screenshot_upload_policy)
                """,
                (did, p),
            )

    def list_devices_options(self):
        with self._cursor() as (conn, cur):
            cur.execute(
                "SELECT device_id, alias, last_seen_at FROM devices ORDER BY last_seen_at IS NULL, last_seen_at DESC"
            )
            return list(cur.fetchall())

    def list_devices_paginated(self, page: int, per_page: int, q: str | None):
        offset = (page - 1) * per_page
        where = "1=1"
        params: list = []
        if q and q.strip():
            where += " AND (device_id LIKE %s OR COALESCE(alias,'') LIKE %s)"
            like = f"%{q.strip()}%"
            params.extend([like, like])
        with self._cursor() as (conn, cur):
            cur.execute(f"SELECT COUNT(*) AS c FROM devices WHERE {where}", params)
            total = cur.fetchone()["c"]
            cur.execute(
                f"""
                SELECT * FROM devices WHERE {where}
                ORDER BY last_seen_at IS NULL, last_seen_at DESC
                LIMIT %s OFFSET %s
                """,
                [*params, per_page, offset],
            )
            rows = cur.fetchall()
        return total, rows

    def get_pending_task_counts_by_device(self, device_ids: list[str]) -> dict[str, dict[str, int]]:
        if not device_ids:
            return {}
        placeholders = ",".join(["%s"] * len(device_ids))
        with self._cursor() as (conn, cur):
            cur.execute(
                f"""
                SELECT device_id, task_type, COUNT(*) AS c
                FROM tasks
                WHERE status = 'pending' AND device_id IN ({placeholders})
                GROUP BY device_id, task_type
                """,
                tuple(device_ids),
            )
            rows = cur.fetchall()
        out: dict[str, dict[str, int]] = {str(d): {} for d in device_ids}
        for r in rows:
            did = str(r["device_id"])
            tt = str(r["task_type"])
            if did not in out:
                out[did] = {}
            out[did][tt] = int(r["c"])
        return out

    def list_keywords_paginated(self, page: int, per_page: int, q: str | None):
        offset = (page - 1) * per_page
        where = "1=1"
        params: list = []
        if q and q.strip():
            where += " AND keyword LIKE %s"
            params.append(f"%{q.strip()}%")
        with self._cursor() as (conn, cur):
            cur.execute(f"SELECT COUNT(*) AS c FROM random_keywords WHERE {where}", params)
            total = cur.fetchone()["c"]
            cur.execute(
                f"SELECT * FROM random_keywords WHERE {where} ORDER BY id DESC LIMIT %s OFFSET %s",
                [*params, per_page, offset],
            )
            rows = cur.fetchall()
        return total, rows

    def keywords_import_lines(self, lines: list[str]) -> int:
        n = 0
        with self._cursor() as (conn, cur):
            for line in lines:
                kw = line.strip()
                if not kw:
                    continue
                cur.execute("INSERT INTO random_keywords (keyword) VALUES (%s)", (kw,))
                n += cur.rowcount
        return n

    def keyword_delete(self, kid: int) -> bool:
        with self._cursor() as (conn, cur):
            cur.execute("DELETE FROM random_keywords WHERE id = %s", (kid,))
            return cur.rowcount > 0

    def keywords_random_sample(self, num: int) -> list[str]:
        n = max(1, min(200, int(num)))
        with self._cursor() as (conn, cur):
            cur.execute("SELECT keyword FROM random_keywords ORDER BY RAND() LIMIT %s", (n,))
            return [r["keyword"] for r in cur.fetchall()]

    def list_addresses_paginated(self, page: int, per_page: int, q: str | None):
        offset = (page - 1) * per_page
        where = "1=1"
        params: list = []
        if q and q.strip():
            like = f"%{q.strip()}%"
            where += """ AND (
                recipient_name LIKE %s OR state LIKE %s OR city LIKE %s OR address_line1 LIKE %s
                OR zip_code LIKE %s OR phone LIKE %s OR full_line LIKE %s
            )"""
            params.extend([like] * 7)
        with self._cursor() as (conn, cur):
            cur.execute(f"SELECT COUNT(*) AS c FROM us_addresses WHERE {where}", params)
            total = cur.fetchone()["c"]
            cur.execute(
                f"SELECT * FROM us_addresses WHERE {where} ORDER BY id DESC LIMIT %s OFFSET %s",
                [*params, per_page, offset],
            )
            rows = cur.fetchall()
        return total, rows

    def address_get(self, aid: int):
        with self._cursor() as (conn, cur):
            cur.execute("SELECT * FROM us_addresses WHERE id = %s", (aid,))
            return cur.fetchone()

    def address_create(self, row: dict) -> int:
        with self._cursor() as (conn, cur):
            cur.execute(
                """
                INSERT INTO us_addresses (
                    recipient_name, state, city, address_line1, address_line2,
                    zip_code, phone, full_line
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (
                    row.get("recipient_name"),
                    row.get("state"),
                    row.get("city"),
                    row.get("address_line1"),
                    row.get("address_line2"),
                    row.get("zip_code"),
                    row.get("phone"),
                    row.get("full_line"),
                ),
            )
            return cur.lastrowid

    def address_update(self, aid: int, row: dict) -> bool:
        with self._cursor() as (conn, cur):
            cur.execute(
                """
                UPDATE us_addresses SET
                    recipient_name=%s, state=%s, city=%s, address_line1=%s, address_line2=%s,
                    zip_code=%s, phone=%s, full_line=%s
                WHERE id=%s
                """,
                (
                    row.get("recipient_name"),
                    row.get("state"),
                    row.get("city"),
                    row.get("address_line1"),
                    row.get("address_line2"),
                    row.get("zip_code"),
                    row.get("phone"),
                    row.get("full_line"),
                    aid,
                ),
            )
            return cur.rowcount > 0

    def address_delete(self, aid: int) -> bool:
        with self._cursor() as (conn, cur):
            cur.execute("DELETE FROM us_addresses WHERE id = %s", (aid,))
            return cur.rowcount > 0

    def list_target_asins_paginated(self, page: int, per_page: int, q: str | None):
        offset = (page - 1) * per_page
        where = "1=1"
        params: list = []
        if q and q.strip():
            like = f"%{q.strip()}%"
            where += " AND (asin LIKE %s OR note LIKE %s)"
            params.extend([like, like])
        with self._cursor() as (conn, cur):
            cur.execute(f"SELECT COUNT(*) AS c FROM target_asins WHERE {where}", params)
            total = cur.fetchone()["c"]
            cur.execute(
                f"""
                SELECT * FROM target_asins WHERE {where}
                ORDER BY id DESC LIMIT %s OFFSET %s
                """,
                [*params, per_page, offset],
            )
            rows = cur.fetchall()
        return total, rows

    def target_asin_get(self, tid: int):
        with self._cursor() as (conn, cur):
            cur.execute("SELECT * FROM target_asins WHERE id = %s", (tid,))
            return cur.fetchone()

    def target_asin_create(self, asin_raw: str, note: str | None) -> int:
        norm = normalize_target_asin(asin_raw)
        if not norm:
            raise ValueError("BAD_ASIN")
        note_s = (note or "").strip() or None
        with self._cursor() as (conn, cur):
            cur.execute(
                """
                INSERT INTO target_asins (asin, note, total_clicks, today_clicks, stats_date)
                VALUES (%s, %s, 0, 0, NULL)
                """,
                (norm, note_s),
            )
            return int(cur.lastrowid)

    def target_asin_update(self, tid: int, asin_raw: str | None, note: str | None) -> bool:
        row = self.target_asin_get(tid)
        if not row:
            return False
        new_asin = row["asin"]
        if asin_raw is not None:
            norm = normalize_target_asin(asin_raw)
            if not norm:
                raise ValueError("BAD_ASIN")
            new_asin = norm
        new_note = row.get("note")
        if note is not None:
            new_note = note.strip() or None
        with self._cursor() as (conn, cur):
            cur.execute(
                """
                UPDATE target_asins SET asin=%s, note=%s WHERE id=%s
                """,
                (new_asin, new_note, tid),
            )
            return cur.rowcount > 0

    def target_asin_delete(self, tid: int) -> bool:
        with self._cursor() as (conn, cur):
            cur.execute("DELETE FROM target_asins WHERE id = %s", (tid,))
            return cur.rowcount > 0

    def increment_target_asin_click(
        self, asin_norm: str, keyword: str, device_id: str | None
    ) -> dict | None:
        """累加计数并写入 asin_click_records；若无 target_asins 行则自动插入（备注：客户端上报自动创建）。"""
        if not asin_norm:
            return None
        kw = (keyword or "").strip()
        if not kw:
            return None
        kw = kw[:512]
        did = (device_id or "").strip() or None
        if did and len(did) > 128:
            did = did[:128]
        auto_note = "客户端上报自动创建"
        with self._cursor() as (conn, cur):
            cur.execute(
                "SELECT id, total_clicks, today_clicks, stats_date FROM target_asins WHERE asin = %s FOR UPDATE",
                (asin_norm,),
            )
            row = cur.fetchone()
            auto_created = False
            if not row:
                try:
                    cur.execute(
                        """
                        INSERT INTO target_asins (asin, note, total_clicks, today_clicks, stats_date)
                        VALUES (%s, %s, 0, 0, NULL)
                        """,
                        (asin_norm, auto_note),
                    )
                    auto_created = True
                except pymysql.err.IntegrityError:
                    pass
                cur.execute(
                    "SELECT id, total_clicks, today_clicks, stats_date FROM target_asins WHERE asin = %s FOR UPDATE",
                    (asin_norm,),
                )
                row = cur.fetchone()
            if not row:
                return None
            today = date.today()
            sd = row.get("stats_date")
            if hasattr(sd, "date"):
                sd = sd.date()
            tc = int(row["total_clicks"] or 0)
            tdy = int(row["today_clicks"] or 0)
            if sd is None or sd != today:
                tdy = 0
            tdy += 1
            tc += 1
            cur.execute(
                """
                UPDATE target_asins SET total_clicks=%s, today_clicks=%s, stats_date=%s WHERE id=%s
                """,
                (tc, tdy, today, row["id"]),
            )
            cur.execute(
                """
                INSERT INTO asin_click_records (asin, keyword, device_id)
                VALUES (%s, %s, %s)
                """,
                (asin_norm, kw, did),
            )
            rid = int(cur.lastrowid)
            return {
                "asin": asin_norm,
                "total_clicks": tc,
                "today_clicks": tdy,
                "record_id": rid,
                "keyword": kw,
                "auto_registered": auto_created,
            }

    def list_asin_click_records_paginated(
        self, page: int, per_page: int, q: str | None, asin_filter: str | None
    ):
        offset = (page - 1) * per_page
        where = ["1=1"]
        params: list = []
        if q and q.strip():
            like = f"%{q.strip()}%"
            where.append("(keyword LIKE %s OR asin LIKE %s OR COALESCE(device_id,'') LIKE %s)")
            params.extend([like, like, like])
        if asin_filter and str(asin_filter).strip():
            af = normalize_target_asin(str(asin_filter).strip()) or str(asin_filter).strip().upper()
            where.append("asin = %s")
            params.append(af[:16])
        wsql = " AND ".join(where)
        with self._cursor() as (conn, cur):
            cur.execute(f"SELECT COUNT(*) AS c FROM asin_click_records WHERE {wsql}", params)
            total = cur.fetchone()["c"]
            cur.execute(
                f"""
                SELECT * FROM asin_click_records WHERE {wsql}
                ORDER BY id DESC LIMIT %s OFFSET %s
                """,
                [*params, per_page, offset],
            )
            rows = cur.fetchall()
        return total, rows

    def addresses_import_rows(self, rows: list[dict]) -> int:
        n = 0
        with self._cursor() as (conn, cur):
            for row in rows:
                cur.execute(
                    """
                    INSERT INTO us_addresses (
                        recipient_name, state, city, address_line1, address_line2,
                        zip_code, phone, full_line
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                    """,
                    (
                        row.get("recipient_name"),
                        row.get("state"),
                        row.get("city"),
                        row.get("address_line1"),
                        row.get("address_line2"),
                        row.get("zip_code"),
                        row.get("phone"),
                        row.get("full_line"),
                    ),
                )
                n += cur.rowcount
        return n

    def pick_random_address_row(self):
        with self._cursor() as (conn, cur):
            cur.execute("SELECT * FROM us_addresses ORDER BY RAND() LIMIT 1")
            return cur.fetchone()

    def insert_click_tasks_batch(
        self,
        task_type: str,
        keyword: str,
        res_folder_name: str,
        device_counts: list[tuple[str, int]],
        persist_data: bool = False,
    ) -> int:
        fn = (res_folder_name or "").strip()
        if not fn:
            return 0
        n = 0
        pd = 1 if persist_data else 0
        with self._cursor() as (conn, cur):
            for device_id, count in device_counts:
                c = max(0, int(count))
                did = device_id.strip() if device_id else ""
                if not did:
                    continue
                payload = json.dumps(
                    {"keyword": keyword, "res_folder_name": fn},
                    ensure_ascii=False,
                )
                for _ in range(c):
                    cur.execute(
                        """
                        INSERT INTO tasks (device_id, task_type, status, params, persist_data)
                        VALUES (%s, %s, 'pending', %s, %s)
                        """,
                        (did, task_type, payload, pd),
                    )
                    n += 1
        return n

    def insert_register_tasks_phones(
        self, phones: list[str], device_counts: list[tuple[str, int]], save_data_record: bool = True
    ) -> int:
        plist = [p.strip() for p in phones if p and str(p).strip()]
        if not plist:
            return 0
        total_assigned = sum(max(0, int(c)) for _, c in device_counts)
        if total_assigned != len(plist):
            raise ValueError("REGISTER_DEVICE_COUNT_MISMATCH")
        n = 0
        pos = 0
        with self._cursor() as (conn, cur):
            cur.execute("SELECT COUNT(*) AS c FROM us_addresses")
            if cur.fetchone()["c"] == 0:
                raise ValueError("EMPTY_ADDRESS_POOL")
            for device_id, count in device_counts:
                did = (device_id or "").strip()
                if not did:
                    raise ValueError("REGISTER_EMPTY_DEVICE")
                for _ in range(max(0, int(count))):
                    if pos >= len(plist):
                        raise ValueError("REGISTER_DEVICE_COUNT_MISMATCH")
                    phone = plist[pos]
                    pos += 1
                    cur.execute("SELECT * FROM us_addresses ORDER BY RAND() LIMIT 1")
                    addr = cur.fetchone()
                    if not addr:
                        raise ValueError("EMPTY_ADDRESS_POOL")
                    name_raw = (addr.get("recipient_name") or "").strip()
                    uname = name_raw if name_raw else f"user{n % 100000}"
                    pwd = generate_registration_password()
                    addr_obj = {k: addr[k] for k in addr if k not in ("id",)}
                    reg_params = json.dumps(
                        {
                            "phone": phone,
                            "account_username": uname,
                            "account_password": pwd,
                            "address_id": addr["id"],
                            "address_snapshot": addr_obj,
                        },
                        default=str,
                        ensure_ascii=False,
                    )
                    persist = 1 if save_data_record else 0
                    cur.execute(
                        """
                        INSERT INTO tasks (device_id, task_type, status, params, persist_data)
                        VALUES (%s, 'register', 'pending', %s, %s)
                        """,
                        (did, reg_params, persist),
                    )
                    tid = int(cur.lastrowid)
                    if save_data_record:
                        params_obj = json.loads(reg_params)
                        self._insert_task_saved_record_cur(
                            cur,
                            "register",
                            {"phase": "created", "params": params_obj, "task_id": tid, "device_id": did},
                            tid,
                            did,
                        )
                    n += 1
        if pos != len(plist):
            raise ValueError("REGISTER_DEVICE_COUNT_MISMATCH")
        return n

    def _task_center_list_where(
        self,
        device_id: str | None,
        status: str | None,
        task_type: str | None,
        params_contains: str | None,
    ) -> tuple[str, list]:
        where = ["1=1"]
        params: list = []
        if device_id:
            where.append("t.device_id = %s")
            params.append(device_id)
        if status:
            where.append("t.status = %s")
            params.append(status)
        if task_type:
            where.append("t.task_type = %s")
            params.append(task_type)
        if params_contains and str(params_contains).strip():
            needle = f"%{str(params_contains).strip()}%"
            where.append(
                "("
                "COALESCE(t.params, '') LIKE %s "
                "OR CONCAT("
                "IFNULL(t.keyword,''), IFNULL(t.product_title,''), IFNULL(t.phone,''), "
                "IFNULL(t.account_username,''), IFNULL(t.account_password,'')"
                ") LIKE %s)"
            )
            params.extend([needle, needle])
        return " AND ".join(where), params

    def list_tasks_filtered(
        self,
        page: int,
        per_page: int,
        device_id: str | None,
        status: str | None,
        task_type: str | None,
        params_contains: str | None = None,
    ):
        offset = (page - 1) * per_page
        wsql, params = self._task_center_list_where(device_id, status, task_type, params_contains)
        with self._cursor() as (conn, cur):
            cur.execute(f"SELECT COUNT(*) AS c FROM tasks t WHERE {wsql}", params)
            total = cur.fetchone()["c"]
            cur.execute(
                f"""
                SELECT t.*, d.alias AS device_alias
                FROM tasks t
                LEFT JOIN devices d ON d.device_id = t.device_id
                WHERE {wsql}
                ORDER BY t.id DESC
                LIMIT %s OFFSET %s
                """,
                [*params, per_page, offset],
            )
            rows = cur.fetchall()
        return total, rows

    def get_task_by_id(self, task_id: int):
        with self._cursor() as (conn, cur):
            cur.execute(
                """
                SELECT t.*, d.alias AS device_alias
                FROM tasks t
                LEFT JOIN devices d ON d.device_id = t.device_id
                WHERE t.id = %s
                """,
                (task_id,),
            )
            return cur.fetchone()

    def get_task_logs(self, task_id: int):
        with self._cursor() as (conn, cur):
            cur.execute(
                "SELECT id, body, created_at FROM task_logs WHERE task_id = %s ORDER BY id ASC",
                (task_id,),
            )
            return cur.fetchall()

    def get_task_image_rows(self, task_id: int):
        with self._cursor() as (conn, cur):
            cur.execute(
                "SELECT id, stored_name, description, created_at FROM task_images WHERE task_id = %s ORDER BY id ASC",
                (task_id,),
            )
            return cur.fetchall()

    def delete_task_and_collect_images(self, task_id: int):
        with self._cursor() as (conn, cur):
            cur.execute("SELECT stored_name FROM task_images WHERE task_id = %s", (task_id,))
            names = [r["stored_name"] for r in cur.fetchall()]
            cur.execute("DELETE FROM tasks WHERE id = %s", (task_id,))
            return cur.rowcount > 0, names

    def delete_tasks_matching_filters(
        self,
        device_id: str | None,
        status: str | None,
        task_type: str | None,
        params_contains: str | None,
    ) -> tuple[int, list[str]]:
        """Delete tasks matching the same filters as task center list; CASCADE removes logs/images rows.
        Returns (deleted_task_count, stored_names for disk cleanup)."""
        wsql, params = self._task_center_list_where(device_id, status, task_type, params_contains)
        with self._cursor() as (conn, cur):
            cur.execute(
                f"SELECT ti.stored_name FROM task_images ti INNER JOIN tasks t ON t.id = ti.task_id WHERE {wsql}",
                params,
            )
            names = [r["stored_name"] for r in cur.fetchall()]
            cur.execute(f"DELETE t FROM tasks t WHERE {wsql}", params)
            deleted = int(cur.rowcount or 0)
        return deleted, names

    def clone_task_redo(self, task_id: int) -> int | None:
        with self._cursor() as (conn, cur):
            cur.execute("SELECT * FROM tasks WHERE id = %s", (task_id,))
            row = cur.fetchone()
            if not row:
                return None
            tt = row["task_type"]
            if tt in CLICK_TASK_TYPES:
                p = parse_task_params(row)
                fn = (p.get("res_folder_name") or "").strip()
                payload = json.dumps(
                    {
                        "keyword": p.get("keyword") or "",
                        "res_folder_name": fn,
                    },
                    ensure_ascii=False,
                )
                pd = int(row.get("persist_data") or 0)
                cur.execute(
                    """
                    INSERT INTO tasks (device_id, task_type, status, params, persist_data)
                    VALUES (%s, %s, 'pending', %s, %s)
                    """,
                    (row.get("device_id"), tt, payload, pd),
                )
                return cur.lastrowid
            if tt == "register":
                cur.execute("SELECT COUNT(*) AS c FROM us_addresses")
                if cur.fetchone()["c"] == 0:
                    raise ValueError("EMPTY_ADDRESS_POOL")
                p = parse_task_params(row)
                phone = (p.get("phone") or row.get("phone") or "").strip()
                if not phone:
                    return None
                cur.execute("SELECT * FROM us_addresses ORDER BY RAND() LIMIT 1")
                addr = cur.fetchone()
                if not addr:
                    raise ValueError("EMPTY_ADDRESS_POOL")
                name_raw = (addr.get("recipient_name") or "").strip()
                uname = name_raw if name_raw else "user"
                pwd = generate_registration_password()
                addr_obj = {k: addr[k] for k in addr if k not in ("id",)}
                reg_params = json.dumps(
                    {
                        "phone": phone,
                        "account_username": uname,
                        "account_password": pwd,
                        "address_id": addr["id"],
                        "address_snapshot": addr_obj,
                    },
                    default=str,
                    ensure_ascii=False,
                )
                pd = int(row.get("persist_data") or 0)
                cur.execute(
                    """
                    INSERT INTO tasks (device_id, task_type, status, params, persist_data)
                    VALUES (%s, 'register', 'pending', %s, %s)
                    """,
                    (row.get("device_id"), reg_params, pd),
                )
                new_tid = int(cur.lastrowid)
                if pd:
                    params_obj = json.loads(reg_params)
                    did = (row.get("device_id") or "").strip() or None
                    self._insert_task_saved_record_cur(
                        cur,
                        "register",
                        {
                            "phase": "created",
                            "params": params_obj,
                            "task_id": new_tid,
                            "device_id": did,
                            "redone_from_task_id": task_id,
                        },
                        new_tid,
                        did,
                    )
                return new_tid
        return None

    def retry_failed_task(self, task_id: int):
        with self._cursor() as (conn, cur):
            cur.execute("SELECT id, status FROM tasks WHERE id = %s FOR UPDATE", (task_id,))
            row = cur.fetchone()
            if not row or row["status"] != "failed":
                return False, []
            cur.execute("SELECT stored_name FROM task_images WHERE task_id = %s", (task_id,))
            names = [r["stored_name"] for r in cur.fetchall()]
            cur.execute("DELETE FROM task_logs WHERE task_id = %s", (task_id,))
            cur.execute("DELETE FROM task_images WHERE task_id = %s", (task_id,))
            cur.execute(
                """
                UPDATE tasks SET
                    status = 'pending',
                    failure_detail = NULL,
                    started_at = NULL,
                    finished_at = NULL,
                    task_environment = NULL,
                    retry_count = retry_count + 1
                WHERE id = %s
                """,
                (task_id,),
            )
        return True, names

    def claim_next_task(self, device_id: str, task_type: str | None = None):
        did = device_id.strip()
        with self._cursor() as (conn, cur):
            if task_type and task_type.strip():
                tt = task_type.strip()
                cur.execute(
                    """
                    SELECT id FROM tasks
                    WHERE status = 'pending' AND (device_id IS NULL OR device_id = %s) AND task_type = %s
                    ORDER BY id ASC
                    LIMIT 1
                    FOR UPDATE
                    """,
                    (did, tt),
                )
            else:
                cur.execute(
                    """
                    SELECT id FROM tasks
                    WHERE status = 'pending' AND (device_id IS NULL OR device_id = %s)
                    ORDER BY id ASC
                    LIMIT 1
                    FOR UPDATE
                    """,
                    (did,),
                )
            row = cur.fetchone()
            if not row:
                return None
            tid = row["id"]
            cur.execute(
                """
                UPDATE tasks SET status = 'running', started_at = CURRENT_TIMESTAMP, device_id = COALESCE(device_id, %s)
                WHERE id = %s AND status = 'pending'
                """,
                (did, tid),
            )
            if cur.rowcount == 0:
                return None
            cur.execute("SELECT * FROM tasks WHERE id = %s", (tid,))
            return cur.fetchone()

    def append_task_logs(self, task_id: int, lines: list[str]):
        with self._cursor() as (conn, cur):
            for line in lines:
                cur.execute(
                    "INSERT INTO task_logs (task_id, body) VALUES (%s, %s)",
                    (task_id, line),
                )

    def insert_task_image(self, task_id: int, stored_name: str, description: str | None = None) -> int:
        desc = (description or "").strip()
        if len(desc) > 512:
            desc = desc[:512]
        if not desc:
            desc = None
        with self._cursor() as (conn, cur):
            cur.execute(
                "INSERT INTO task_images (task_id, stored_name, description) VALUES (%s, %s, %s)",
                (task_id, stored_name, desc),
            )
            return int(cur.lastrowid)

    def finalize_task_from_report(self, task_id: int, log_lines: list[str]):
        from .task_report_parse import parse_task_report_footer

        parsed = parse_task_report_footer(log_lines)
        success = parsed.success
        fin = parsed.finished_at
        if fin is not None and fin.tzinfo is not None:
            fin = fin.astimezone(timezone.utc).replace(tzinfo=None)

        with self._cursor() as (conn, cur):
            cur.execute(
                """
                SELECT id, status, task_type, persist_data, params, device_id
                FROM tasks WHERE id = %s FOR UPDATE
                """,
                (task_id,),
            )
            row = cur.fetchone()
            if not row or row["status"] != "running":
                return False, False
            env = parsed.environment
            if success:
                cur.execute(
                    """
                    UPDATE tasks SET
                        status = 'success',
                        failure_detail = NULL,
                        finished_at = COALESCE(%s, CURRENT_TIMESTAMP),
                        task_environment = %s
                    WHERE id = %s
                    """,
                    (fin, env, task_id),
                )
            else:
                detail = parsed.failure_detail or "failed"
                cur.execute(
                    """
                    UPDATE tasks SET
                        status = 'failed',
                        failure_detail = %s,
                        finished_at = COALESCE(%s, CURRENT_TIMESTAMP),
                        task_environment = %s
                    WHERE id = %s
                    """,
                    (detail, fin, env, task_id),
                )

            persist = int(row.get("persist_data") or 0)
            tt = row["task_type"] or ""
            if persist:
                finished_iso = None
                if fin is not None:
                    finished_iso = fin.isoformat() if hasattr(fin, "isoformat") else str(fin)
                merge_finish = {
                    "phase": "finished",
                    "status": "success" if success else "failed",
                    "failure_detail": None if success else (parsed.failure_detail or "failed"),
                    "finished_at": finished_iso,
                    "task_environment": env,
                }
                if tt == "register":
                    self._merge_task_saved_record_for_source_cur(cur, task_id, merge_finish)
                elif tt in CLICK_TASK_TYPES and success:
                    cur.execute(
                        "DELETE FROM task_saved_records WHERE source_task_id = %s AND task_type = %s",
                        (task_id, tt),
                    )
                    params_obj = parse_task_params(row)
                    content = {
                        "params": params_obj,
                        "status": "success",
                        "task_id": task_id,
                        "device_id": row.get("device_id"),
                        "finished_at": finished_iso,
                        "task_environment": env,
                    }
                    self._insert_task_saved_record_cur(cur, tt, content, task_id, row.get("device_id"))
        return True, success

    def get_image_by_id(self, image_id: int):
        with self._cursor() as (conn, cur):
            cur.execute(
                "SELECT id, task_id, stored_name FROM task_images WHERE id = %s",
                (image_id,),
            )
            return cur.fetchone()


db = Database()
