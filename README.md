# tg-api

Telegram API 申请服务：用户通过 Bot **购买申请次数包**（1 / 10 / 50 / 100 次），每次**成功申请 API 消耗 1 次**；支持卡密兑换次数；管理端可改套餐价格、查看订单与用户剩余次数。

## 组成说明

| 模块 | 说明 |
|------|------|
| **Telegram Bot** | `start_bot.py` → `src/bot.py`，业务逻辑与 MySQL 读写 |
| **管理后台 API** | FastAPI：`src/admin_app.py`，前缀 `/api/v1`，并托管根目录 **`static/`**（`npm run build` 生成） |
| **管理前端** | `admin/`（Vite + React），`build` 输出到 **`static/`**，`python app.py` 根路径即管理页 |
| **网页注册工具** | `start_web.py`，独立 Flask 页面（`templates/index.html`），与主库无强绑定 |
| **CLI 注册** | `start_cli.py`，终端交互调用 `src/cli.py` |

## 技术栈

- Python：`python-telegram-bot`、`Pyrogram`、FastAPI、Uvicorn、`pymysql`
- 数据库：**MySQL**（业务数据与后台账号）
- 前端：`admin` 目录内 React + TypeScript + Vite

## 环境要求

- Python 3.10+（建议）
- MySQL 5.7+ / 8.x
- Node.js 18+（构建或开发 admin 前端）

## MySQL

1. 创建数据库（示例库名 `tgapi`，与默认环境变量一致）：

```sql
CREATE DATABASE tgapi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. 首次启动管理 API 时会自动建表并写入默认配置；若 `admin_users` 为空，会创建默认管理员：

- 用户名：`admin`
- 密码：`admin`

**生产环境请立即修改密码**（可直接在库中替换 `admin_users.password_hash`，或自行实现改密接口）。

### 数据库相关环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MYSQL_HOST` | `127.0.0.1` | |
| `MYSQL_PORT` | `3306` | |
| `MYSQL_USER` | `root` | |
| `MYSQL_PASSWORD` | `123456` | |
| `MYSQL_DATABASE` | `tgapi` | |

## 安装

```bash
# Python 依赖（建议在虚拟环境中）
pip install -r requirements.txt

# 管理前端依赖
cd admin && npm install   # 或 pnpm install
```

## 运行

### 管理后台（API + 前端静态资源）

```bash
# 项目根目录；需先构建前端
cd admin && npm run build && cd ..
python app.py
```

- 默认监听 **`0.0.0.0:5002`**（可用环境变量 **`PORT`** 覆盖）
- 交互式 API 文档：<http://127.0.0.1:5002/docs>
- 也可直接：`uvicorn src.admin_app:app --host 0.0.0.0 --port 5002`

前端 `npm run build` 输出到项目根目录 **`static/`**；未构建时访问根路径会提示先 build。

### 前端本地开发（热更新 + 代理 API）

```bash
cd admin && npm run dev
```

Vite 将 **`/api/v1`** 代理到 **`http://127.0.0.1:5002`**，请同时在本机运行 `python app.py`。

### Telegram 机器人

```bash
python start_bot.py
```

在 `.env` 中至少配置 **`BOT_TOKEN`**。**OKPay、TRC20 收款（地址与二维码）、链上监听（TronGrid）、套餐价格** 等均在管理后台「系统设置」中维护，写入数据库 `config` 表（或 `data/` 下二维码文件）。机器人进程内会轮询 TronGrid（可配置开关），按 **TRC20 精确金额** 匹配 `pending` 订单并自动入账，同一链上交易仅处理一次（`tron_processed_tx` 表）。管理员账号在数据库 `admin_users` 表中。

### 其它入口

```bash
python start_cli.py      # 终端申请流程
python start_web.py      # 网页版发送验证码/登录（Flask）
python generate_card_codes.py  # 批量生成卡密（字段为可兑换申请次数，非金额）
```

## 管理 API 与环境变量（节选）

| 变量 | 说明 |
|------|------|
| `JWT_SECRET` | JWT 签名密钥，**生产环境必填且保密** |
| `ORDER_COMPLETE_SECRET` | 支付回调密钥，与 `POST /api/v1/payment/complete-order` 的 `secret` 一致 |
| `PORT` | `python app.py` 监听端口，默认 `5002` |
| `CORS_ORIGINS` | 逗号分隔，默认 `*` |

主要路由（均需登录的接口携带 `Authorization: Bearer <token>`，管理员接口要求 `is_admin`）：

- `POST /api/v1/auth/token` — 表单 `username`、`password`
- `GET /api/v1/auth/me`
- `GET /api/v1/admin/stats`
- `GET /api/v1/admin/tg-users`、`POST /api/v1/admin/tg-users/add-apply-credits`（手动增加申请次数）
- `POST /api/v1/payment/complete-order` — JSON `{ "order_id": "...", "secret": "<ORDER_COMPLETE_SECRET>" }`，将待支付订单置为完成并**发放订单中的次数包**（无需登录）
- `GET /api/v1/admin/orders`
- `GET /api/v1/admin/codes`、`POST /api/v1/admin/codes/generate`
- `GET /api/v1/admin/api-applications`
- `GET` / `PUT /api/v1/admin/bot-config` — 各档套餐单价（`APPLY_PACK_*_PRICE`）、`TRC20_ADDRESS`、`OKPAY_*`、联系客服、`TRON_*`（链上监听）等
- `POST` / `GET` / `DELETE /api/v1/admin/trc20-qr` — 上传 / 预览 / 删除 TRC20 收款二维码图片（`POST` 为 `multipart/form-data` 字段 `file`）

完整定义见 `src/admin_app.py` 或 Swagger **`/docs`**。

## 目录结构（摘要）

```
tg-api/
├── app.py              # 启动 Uvicorn（管理后台）
├── start_bot.py        # 启动 Bot
├── start_cli.py / start_web.py
├── requirements.txt
├── src/
│   ├── admin_app.py    # FastAPI 应用
│   ├── db.py           # MySQL 访问与表初始化
│   ├── tron_monitor.py # TRC20 入账扫描（TronGrid）
│   ├── bot.py
│   ├── core.py / utils.py / okpay.py
│   └── ...
├── static/             # 管理前端构建产物（由 admin 目录 vite build 生成）
├── admin/              # 管理前端源码（Vite + React）
└── templates/          # start_web 使用的页面
```

## 从 SQLite 迁移到 MySQL

若曾有旧版 SQLite 数据，需自行导出并导入 MySQL（表结构以 `src/db.py` 中 `init_tables` 为准）。本仓库不提供自动迁移脚本。
