-- =============================================================================
-- amz 运维后端 — 完整数据库结构（与 src/db.py 中 init_tables + 迁移一致）
-- MySQL 5.7+ / 8.0+，InnoDB，utf8mb4
--
-- 用法示例：
--   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS amz CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
--   mysql -u root -p amz < sql/db.sql
--
-- 说明：使用 CREATE TABLE IF NOT EXISTS，可重复执行但不会给已有表补列；
-- 若线上库是旧结构，请以应用启动时的迁移为准，或自行 ALTER。
-- 默认管理员由应用首次启动时写入（见 _ensure_default_admin），本文件不含账号数据。
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS amz DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE amz;

-- ----------------------------------------------------------------------------- admin_users
CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_admin TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------- devices
CREATE TABLE IF NOT EXISTS devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(128) NOT NULL UNIQUE,
    alias VARCHAR(255) NULL,
    last_seen_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    screenshot_upload_policy VARCHAR(24) NOT NULL DEFAULT 'all' COMMENT 'all | failed_only | none'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------- tasks
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
    phone VARCHAR(128) NULL,
    account_username VARCHAR(255) NULL,
    account_password VARCHAR(255) NULL,
    address_id BIGINT NULL,
    address_snapshot TEXT NULL,
    persist_data TINYINT(1) NOT NULL DEFAULT 0,
    INDEX idx_tasks_device (device_id),
    INDEX idx_tasks_status (status),
    INDEX idx_tasks_type (task_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------- task_logs
CREATE TABLE IF NOT EXISTS task_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id BIGINT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_task_logs_task (task_id),
    CONSTRAINT fk_task_logs_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------- task_images
CREATE TABLE IF NOT EXISTS task_images (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id BIGINT NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    description VARCHAR(512) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_task_images_name (stored_name),
    INDEX idx_task_images_task (task_id),
    CONSTRAINT fk_task_images_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------- random_keywords
CREATE TABLE IF NOT EXISTS random_keywords (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    keyword VARCHAR(512) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_rk_kw (keyword(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------- us_addresses
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------- app_settings
CREATE TABLE IF NOT EXISTS app_settings (
    setting_key VARCHAR(64) NOT NULL PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------- task_saved_records
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- 可选：任务保留天数默认（应用也会 INSERT IGNORE）
-- INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES ('task_retention_days', '15');
