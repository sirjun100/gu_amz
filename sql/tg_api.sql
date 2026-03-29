/*
 Navicat Premium Dump SQL

 Source Server         : 127.0.0.1
 Source Server Type    : MySQL
 Source Server Version : 50744 (5.7.44)
 Source Host           : 127.0.0.1:3306
 Source Schema         : tg_api

 Target Server Type    : MySQL
 Target Server Version : 50744 (5.7.44)
 File Encoding         : 65001

 Date: 29/03/2026 10:17:56
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for admin_users
-- ----------------------------
DROP TABLE IF EXISTS `admin_users`;
CREATE TABLE `admin_users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(64) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `is_admin` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Records of admin_users
-- ----------------------------
BEGIN;
INSERT INTO `admin_users` (`id`, `username`, `password_hash`, `is_admin`, `created_at`) VALUES (1, 'admin', 'scrypt:32768:8:1$TCUVWkeuCX5WP1L6$4f20e3d9837d2691c6bd7e62db4c300701ef8a6e96b13743e3cf084674399a690976d304264620fa7383e9bbd15d16cf5cb1070fa305a5406e957a5e021bd567', 1, '2026-03-29 01:04:11');
COMMIT;

-- ----------------------------
-- Table structure for api_applications
-- ----------------------------
DROP TABLE IF EXISTS `api_applications`;
CREATE TABLE `api_applications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `telegram_id` varchar(64) NOT NULL,
  `phone` varchar(64) NOT NULL,
  `api_id` varchar(64) NOT NULL,
  `api_hash` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Records of api_applications
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for codes
-- ----------------------------
DROP TABLE IF EXISTS `codes`;
CREATE TABLE `codes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(64) NOT NULL,
  `status` varchar(32) DEFAULT 'unused',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `used_at` timestamp NULL DEFAULT NULL,
  `used_by` varchar(64) DEFAULT NULL,
  `credits` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Records of codes
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for config
-- ----------------------------
DROP TABLE IF EXISTS `config`;
CREATE TABLE `config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cfg_key` varchar(255) NOT NULL,
  `cfg_value` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cfg_key` (`cfg_key`)
) ENGINE=InnoDB AUTO_INCREMENT=1846 DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Records of config
-- ----------------------------
BEGIN;
INSERT INTO `config` (`id`, `cfg_key`, `cfg_value`, `created_at`, `updated_at`) VALUES (1, 'BOT_TOKEN', '', '2026-03-29 01:04:11', '2026-03-29 01:04:11');
INSERT INTO `config` (`id`, `cfg_key`, `cfg_value`, `created_at`, `updated_at`) VALUES (2, 'ADMIN_USERS', '', '2026-03-29 01:04:11', '2026-03-29 01:04:11');
INSERT INTO `config` (`id`, `cfg_key`, `cfg_value`, `created_at`, `updated_at`) VALUES (3, 'OKPAY_WEBHOOK_URL', '', '2026-03-29 01:04:11', '2026-03-29 01:04:11');
INSERT INTO `config` (`id`, `cfg_key`, `cfg_value`, `created_at`, `updated_at`) VALUES (4, 'TRC20_ADDRESS', 'TEg2UPDov676PSKmU4j1Rbq7FsG2HKnfys', '2026-03-29 01:04:11', '2026-03-29 09:34:54');
INSERT INTO `config` (`id`, `cfg_key`, `cfg_value`, `created_at`, `updated_at`) VALUES (5, 'PRICE_1', '1.0', '2026-03-29 01:04:11', '2026-03-29 01:04:11');
INSERT INTO `config` (`id`, `cfg_key`, `cfg_value`, `created_at`, `updated_at`) VALUES (6, 'PRICE_5', '4.0', '2026-03-29 01:04:11', '2026-03-29 01:04:11');
INSERT INTO `config` (`id`, `cfg_key`, `cfg_value`, `created_at`, `updated_at`) VALUES (7, 'BONUS_THRESHOLD', '20', '2026-03-29 01:04:11', '2026-03-29 01:04:11');
INSERT INTO `config` (`id`, `cfg_key`, `cfg_value`, `created_at`, `updated_at`) VALUES (8, 'BONUS_RATE', '0.1', '2026-03-29 01:04:11', '2026-03-29 01:04:11');
INSERT INTO `config` (`id`, `cfg_key`, `cfg_value`, `created_at`, `updated_at`) VALUES (93, 'APPLY_PACK_1_PRICE', '1', '2026-03-29 01:44:35', '2026-03-29 09:34:54');
INSERT INTO `config` (`id`, `cfg_key`, `cfg_value`, `created_at`, `updated_at`) VALUES (94, 'APPLY_PACK_10_PRICE', '7.5', '2026-03-29 01:44:35', '2026-03-29 09:34:54');
INSERT INTO `config` (`id`, `cfg_key`, `cfg_value`, `created_at`, `updated_at`) VALUES (95, 'APPLY_PACK_50_PRICE', '25', '2026-03-29 01:44:35', '2026-03-29 09:34:54');
INSERT INTO `config` (`id`, `cfg_key`, `cfg_value`, `created_at`, `updated_at`) VALUES (96, 'APPLY_PACK_100_PRICE', '35', '2026-03-29 01:44:35', '2026-03-29 09:34:54');
INSERT INTO `config` (`id`, `cfg_key`, `cfg_value`, `created_at`, `updated_at`) VALUES (513, 'CONTACT_SUPPORT_URL', 'https://t.me/r7tg1', '2026-03-29 02:28:33', '2026-03-29 04:31:17');
INSERT INTO `config` (`id`, `cfg_key`, `cfg_value`, `created_at`, `updated_at`) VALUES (788, 'OKPAY_ID', '30343', '2026-03-29 03:13:01', '2026-03-29 09:34:54');
INSERT INTO `config` (`id`, `cfg_key`, `cfg_value`, `created_at`, `updated_at`) VALUES (789, 'OKPAY_TOKEN', '9Vd6feDiQGXRlxyAsEK1MNPbScFpLJ7', '2026-03-29 03:13:01', '2026-03-29 09:34:54');
INSERT INTO `config` (`id`, `cfg_key`, `cfg_value`, `created_at`, `updated_at`) VALUES (790, 'OKPAY_PAYED', 'USDT', '2026-03-29 03:13:01', '2026-03-29 09:34:54');
INSERT INTO `config` (`id`, `cfg_key`, `cfg_value`, `created_at`, `updated_at`) VALUES (791, 'OKPAY_RETURN_URL', 'https://t.me/r7tg1', '2026-03-29 03:13:01', '2026-03-29 09:34:54');
INSERT INTO `config` (`id`, `cfg_key`, `cfg_value`, `created_at`, `updated_at`) VALUES (1267, 'TRON_MONITOR_ENABLED', '1', '2026-03-29 04:10:21', '2026-03-29 09:34:54');
INSERT INTO `config` (`id`, `cfg_key`, `cfg_value`, `created_at`, `updated_at`) VALUES (1268, 'TRONGRID_API_KEY', '234b4e03-ed7c-4f74-957c-6aebe86685e3', '2026-03-29 04:10:21', '2026-03-29 09:34:54');
INSERT INTO `config` (`id`, `cfg_key`, `cfg_value`, `created_at`, `updated_at`) VALUES (1269, 'TRON_API_BASE', 'https://api.trongrid.io', '2026-03-29 04:10:21', '2026-03-29 09:34:54');
INSERT INTO `config` (`id`, `cfg_key`, `cfg_value`, `created_at`, `updated_at`) VALUES (1270, 'TRON_USDT_CONTRACT', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', '2026-03-29 04:10:21', '2026-03-29 09:34:54');
INSERT INTO `config` (`id`, `cfg_key`, `cfg_value`, `created_at`, `updated_at`) VALUES (1271, 'TRON_POLL_SECONDS', '45', '2026-03-29 04:10:21', '2026-03-29 09:34:54');
INSERT INTO `config` (`id`, `cfg_key`, `cfg_value`, `created_at`, `updated_at`) VALUES (1272, 'TRON_MIN_CONFIRMATIONS', '0', '2026-03-29 04:10:21', '2026-03-29 09:34:54');
INSERT INTO `config` (`id`, `cfg_key`, `cfg_value`, `created_at`, `updated_at`) VALUES (1741, 'BOT_CUSTOM_MENU_JSON', '[{\"text\":\"☎️ 联系客服[招代理]\",\"url\":\"https://t.me/r7tg1\"},{\"text\":\"CNY换U使用@Okpay[官方交易群]\",\"url\":\"https://t.me/okpay\"}]', '2026-03-29 09:24:43', '2026-03-29 09:34:54');
COMMIT;

-- ----------------------------
-- Table structure for orders
-- ----------------------------
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` varchar(128) NOT NULL,
  `telegram_id` varchar(64) NOT NULL,
  `amount` double NOT NULL,
  `payment_method` varchar(64) NOT NULL,
  `credit_pack` int(11) DEFAULT NULL,
  `status` varchar(32) DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  `trc20_pay_amount` double DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_id` (`order_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Records of orders
-- ----------------------------
BEGIN;
INSERT INTO `orders` (`id`, `order_id`, `telegram_id`, `amount`, `payment_method`, `credit_pack`, `status`, `created_at`, `completed_at`, `trc20_pay_amount`) VALUES (1, '20260329021922523', '7604827308', 1, 'usdt', 1, 'cancelled', '2026-03-29 02:19:22', '2026-03-29 02:19:44', NULL);
INSERT INTO `orders` (`id`, `order_id`, `telegram_id`, `amount`, `payment_method`, `credit_pack`, `status`, `created_at`, `completed_at`, `trc20_pay_amount`) VALUES (2, '20260329021944119', '7604827308', 7.5, 'usdt', 10, 'cancelled', '2026-03-29 02:19:44', '2026-03-29 02:37:44', NULL);
INSERT INTO `orders` (`id`, `order_id`, `telegram_id`, `amount`, `payment_method`, `credit_pack`, `status`, `created_at`, `completed_at`, `trc20_pay_amount`) VALUES (3, '20260329023744552', '7604827308', 35, 'usdt', 100, 'cancelled', '2026-03-29 02:37:44', '2026-03-29 02:39:15', NULL);
INSERT INTO `orders` (`id`, `order_id`, `telegram_id`, `amount`, `payment_method`, `credit_pack`, `status`, `created_at`, `completed_at`, `trc20_pay_amount`) VALUES (4, '20260329023915092', '7604827308', 1, 'usdt', 1, 'cancelled', '2026-03-29 02:39:15', '2026-03-29 04:00:43', NULL);
INSERT INTO `orders` (`id`, `order_id`, `telegram_id`, `amount`, `payment_method`, `credit_pack`, `status`, `created_at`, `completed_at`, `trc20_pay_amount`) VALUES (5, '20260329040108203', '6771497132', 1, 'usdt', 1, 'cancelled', '2026-03-29 04:01:08', '2026-03-29 04:11:13', NULL);
INSERT INTO `orders` (`id`, `order_id`, `telegram_id`, `amount`, `payment_method`, `credit_pack`, `status`, `created_at`, `completed_at`, `trc20_pay_amount`) VALUES (6, '20260329043235261', '6771497132', 7.5, 'usdt', 10, 'cancelled', '2026-03-29 04:32:35', '2026-03-29 04:33:56', 7.656764);
INSERT INTO `orders` (`id`, `order_id`, `telegram_id`, `amount`, `payment_method`, `credit_pack`, `status`, `created_at`, `completed_at`, `trc20_pay_amount`) VALUES (7, '20260329043356659', '6771497132', 1, 'usdt', 1, 'cancelled', '2026-03-29 04:33:56', '2026-03-29 04:36:20', 1.074728);
INSERT INTO `orders` (`id`, `order_id`, `telegram_id`, `amount`, `payment_method`, `credit_pack`, `status`, `created_at`, `completed_at`, `trc20_pay_amount`) VALUES (8, '20260329043620585', '6771497132', 1, 'usdt', 1, 'cancelled', '2026-03-29 04:36:20', '2026-03-29 04:39:05', 1.032503);
INSERT INTO `orders` (`id`, `order_id`, `telegram_id`, `amount`, `payment_method`, `credit_pack`, `status`, `created_at`, `completed_at`, `trc20_pay_amount`) VALUES (9, '20260329043905239', '6771497132', 7.5, 'usdt', 10, 'cancelled', '2026-03-29 04:39:05', '2026-03-29 09:09:43', 8.194026);
INSERT INTO `orders` (`id`, `order_id`, `telegram_id`, `amount`, `payment_method`, `credit_pack`, `status`, `created_at`, `completed_at`, `trc20_pay_amount`) VALUES (10, '20260329091120791', '7604827308', 7.5, 'usdt', 10, 'cancelled', '2026-03-29 09:11:20', '2026-03-29 09:22:21', 7.537274);
INSERT INTO `orders` (`id`, `order_id`, `telegram_id`, `amount`, `payment_method`, `credit_pack`, `status`, `created_at`, `completed_at`, `trc20_pay_amount`) VALUES (11, '20260329092239616', '7604827308', 1, 'usdt', 1, 'cancelled', '2026-03-29 09:22:39', '2026-03-29 09:29:29', 1.340761);
INSERT INTO `orders` (`id`, `order_id`, `telegram_id`, `amount`, `payment_method`, `credit_pack`, `status`, `created_at`, `completed_at`, `trc20_pay_amount`) VALUES (12, '20260329092929666', '7604827308', 1, 'usdt', 1, 'cancelled', '2026-03-29 09:29:29', '2026-03-29 09:39:37', 1.159976);
COMMIT;

-- ----------------------------
-- Table structure for telegram_app
-- ----------------------------
DROP TABLE IF EXISTS `telegram_app`;
CREATE TABLE `telegram_app` (
  `id` int(11) NOT NULL,
  `api_id` int(11) DEFAULT NULL,
  `api_hash` varchar(64) COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- ----------------------------
-- Records of telegram_app
-- ----------------------------
BEGIN;
INSERT INTO `telegram_app` (`id`, `api_id`, `api_hash`) VALUES (1, NULL, NULL);
COMMIT;

-- ----------------------------
-- Table structure for tron_processed_tx
-- ----------------------------
DROP TABLE IF EXISTS `tron_processed_tx`;
CREATE TABLE `tron_processed_tx` (
  `tx_id` varchar(128) NOT NULL,
  `order_id` varchar(128) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tx_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Records of tron_processed_tx
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `telegram_id` varchar(64) NOT NULL,
  `username` varchar(255) DEFAULT NULL,
  `balance` double DEFAULT '0',
  `total_recharge` double DEFAULT '0',
  `total_applications` int(11) DEFAULT '0',
  `apply_credits` int(11) NOT NULL DEFAULT '0',
  `language` varchar(8) DEFAULT 'zh',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `telegram_id` (`telegram_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Records of users
-- ----------------------------
BEGIN;
INSERT INTO `users` (`id`, `telegram_id`, `username`, `balance`, `total_recharge`, `total_applications`, `apply_credits`, `language`, `created_at`) VALUES (1, '7604827308', 'r7tg1', 0, 0, 0, 100, 'en', '2026-03-29 02:19:07');
INSERT INTO `users` (`id`, `telegram_id`, `username`, `balance`, `total_recharge`, `total_applications`, `apply_credits`, `language`, `created_at`) VALUES (2, '6771497132', 'r7haopu', 0, 0, 0, 0, 'zh', '2026-03-29 03:12:17');
COMMIT;

SET FOREIGN_KEY_CHECKS = 1;
