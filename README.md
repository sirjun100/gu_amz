# 亚马逊运维系统

管理端 + 客户端 HTTP API。默认服务见 `app.py`（`PORT` 环境变量，默认 `5090`）。数据库默认名 `amz`，连接参数见环境变量 `MYSQL_*`（`src/db.py`）。

---

## 客户端调用说明

以下接口**不需要**管理端登录 Token（`Authorization` 可不传）。请将 `{BASE}` 换成你的服务根地址，例如 `http://192.168.1.10:5090`。

所有路径均以 **`/api/v1`** 为前缀。

### 1. 心跳 — 登记设备在线

用于上报设备 ID，服务端会写入/更新 `devices` 表及最后在线时间。可与「领任务」配合使用；建议约 **每 1 分钟** 调用一次（与 EasyClick 心跳节奏一致即可）。

- **方法/路径**：`POST {BASE}/api/v1/client/heartbeat`
- **Content-Type**：`application/json`
- **请求体**：

```json
{
  "device_id": "你的设备唯一标识字符串"
}
```

- **成功响应**（示例）：`{"ok": true}`

**cURL 示例**：

```bash
curl -s -X POST "${BASE}/api/v1/client/heartbeat" \
  -H "Content-Type: application/json" \
  -d '{"device_id":"phone-001"}'
```

---

### 2. 领取下一条任务

服务端按任务 `id` 升序，查找状态为 **`pending`** 且 **未指定设备或指定设备与当前一致** 的任务；找到后原子更新为 **`running`**，并把 `device_id` 填为当前设备（若任务原本未指定设备）。

- **方法/路径**：`GET {BASE}/api/v1/client/tasks/next?device_id=你的设备ID`
- **查询参数**：
  - `device_id`（必填，与心跳里一致）
  - `task_type`（可选）若填写则只领取该类型，如 `search_click`、`related_click`、`similar_click`、`register`
- **副作用**：成功领取前会同样更新一次设备心跳（与 `heartbeat` 等效）
- **响应**：
  - 无任务：`{"task": null}`
  - 有任务：`{"task": { ... }}`，`task` 为任务行字段，主要包括：
    - `id`：任务 ID，后续上报必带
    - `device_id`：执行设备（领取后会有值）
    - `task_type`：任务类型字符串，例如 `search_click`、`related_click`、`similar_click`、`register`（与后台创建任务时一致）
    - `status`：此时为 `running`
    - `keyword`、`product_title`：业务字段，可能为 `null`
    - `failure_detail`、`retry_count`、`created_at`、`started_at` 等

**cURL 示例**：

```bash
curl -s "${BASE}/api/v1/client/tasks/next?device_id=phone-001"
```

仅领取搜索点击类任务示例：`.../tasks/next?device_id=phone-001&task_type=search_click`

---

### 2.1 随机关键词（客户端）

管理端在「随机关键词」中导入 TXT 后，客户端可随机抽取若干条：

- **方法/路径**：`GET {BASE}/api/v1/client/random-keywords?num=2`
- **查询参数**：`num` 默认 `2`，范围约 `1–100`（服务端单次最多返回约 200 条池内随机，实际条数可能少于 `num` 若词库不足）
- **响应示例**：`{"keywords": ["词A", "词B"], "count": 2}`

---

**建议客户端循环**：定时心跳 + 轮询 `tasks/next`；领到任务后本地执行脚本，结束后**必须**调用下面的上报接口结案（否则任务会一直停在 `running`）。

---

### 2.1 过程截图（执行中上传，不结案）

用于同一任务多次传图、在管理端任务详情中按时间顺序回顾（每张图可有文字说明）。

- **方法/路径**：`POST {BASE}/api/v1/client/tasks/{task_id}/screenshots`
- **Content-Type**：`multipart/form-data`
- **前置条件**：任务状态须为 **`running`**，且 `device_id` 与任务当前绑定设备一致。
- **表单字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `device_id` | 文本 | 与领任务时一致 |
| `description` | 文本 | 可选；该图的名称/步骤说明（最长约 512 字），管理端展示在缩略图下方 |
| `image` | 文件 | 单张图片；字段名固定为 **`image`** |

- **成功响应**：`{"ok": true, "image_id": 123}`

**说明**：与结案接口 `report` 不同，本接口**不会**修改任务状态或写入结案日志；客户端可在脚本任意步骤调用多次。建议上传前在本地做缩放或 JPEG 压缩，避免单张过大导致超时（服务端单张上限见下文 `TASK_IMAGE_MAX_MB`）。

**cURL 示例**：

```bash
curl -s -X POST "${BASE}/api/v1/client/tasks/123/screenshots" \
  -F "device_id=phone-001" \
  -F "description=打开搜索页" \
  -F "image=@/path/to/step1.jpg"
```

EasyClick 脚本侧可参考 `usbclient/src/js/api/运维接口.js` 中的 **`运维接口.上传过程截图(taskId, 本地路径, 描述)`**（内部会先按配置做宽度缩放再上传）。

---

### 3. 上报执行结果（日志 + 可选截图）

任务必须处于 **`running`**，且请求里的 `device_id` 必须与该任务当前 `device_id` 一致，否则返回 403。

- **方法/路径**：`POST {BASE}/api/v1/client/tasks/{task_id}/report`
- **Content-Type**：`multipart/form-data`
- **表单字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `device_id` | 文本 | 与领任务时一致 |
| `log_lines` | 文本 | **JSON 数组的字符串**，元素为每条日志一行，例如 `["step1","step2","success"]` |
| `images` | 文件，可多个 | 可选；字段名需为 **`images`**，可重复多个 part 传多张图 |
| `image_descriptions` | 文本 | 可选；**JSON 数组字符串**，与 `images` 顺序一一对应，元素为每张图的说明（与过程截图的 `description` 语义相同）；未传或长度不足时缺省为无说明 |

**成功 / 失败判定（服务端）**：

- 取本次请求中 `log_lines` **解析后数组的最后一项**（字符串），去掉首尾空白并转小写后若等于 **`success`**，则任务记为 **成功**。
- 否则记为 **失败**；`failure_detail` 会截取最后一行日志（最多约 2000 字符），若无日志则为 `"failed"`。

**图片限制**：

- 单张大小默认不超过 **8MB**（可用环境变量 `TASK_IMAGE_MAX_MB` 调整）。
- 扩展名一般为 `.png` / `.jpg` / `.jpeg` / `.webp` / `.gif`。

**cURL 示例**（仅日志、成功结案）：

```bash
curl -s -X POST "${BASE}/api/v1/client/tasks/123/report" \
  -F "device_id=phone-001" \
  -F 'log_lines=["打开搜索","点击商品","success"]'
```

**cURL 示例**（日志 + 两张截图）：

```bash
curl -s -X POST "${BASE}/api/v1/client/tasks/123/report" \
  -F "device_id=phone-001" \
  -F 'log_lines=["执行中…","error: timeout"]' \
  -F "images=@/path/to/a.png" \
  -F "images=@/path/to/b.jpg"
```

**EasyClick / 脚本侧注意**：

1. `log_lines` 必须是 **合法 JSON 数组** 再作为表单的一个字段提交；不要传纯文本多行而不包在 `[]` 里。
2. 每次 `report` 会 **追加** 日志行并 **结案**（成功或失败）；同一任务不要重复结案；若需重试由管理端在任务中心对 **失败** 任务点「重试」后任务会回到 `pending`，再由客户端重新领取。
3. 多文件上传时多个 part 使用**相同字段名** `images`（与常见 HTTP 客户端的 `addBinaryBody("images", ...)` 多次添加一致）。

---

## 管理端与构建

- 启动：`python3 app.py` 或 `uvicorn src.admin_app:app --host 0.0.0.0 --port 5090`
- 依赖：`pip install -r requirements.txt`（含 **openpyxl**，用于地址 XLSX 导入）
- 管理后台前端：在 `admin` 目录执行 `pnpm install` / `pnpm run build`，静态资源输出到项目根目录 `static/`。
- 管理员登录：`POST /api/v1/auth/token`（OAuth2 密码表单：`username`、`password`），默认首次初始化用户 `admin` / `admin`（请在生产环境修改密码）。

登录后侧边栏包含：**任务中心、设备管理、随机关键词、三类点击任务创建、自动注册任务、地址管理**（与 `项目文档.md` 一致）。

更完整的产品说明见仓库内 **`项目文档.md`**。
