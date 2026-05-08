---
name: ec-ios-cli
description: >-
  中文说明：EasyClick ec-ios-cli 的安装前提、子命令、参数与示例。
  在用户或 Agent 需要执行、脚本化或排查该 CLI 时使用；不包含实现细节。
---

# ec-ios-cli 使用说明

## 使用前提
- 该工具用于代替 IDEA 插件中的部分操作，仅适用于 EasyClick iOS USB 版本和脱机版本。
- 本机已启动 **IntelliJ IDEA**，并已加载 **EasyClick iOS 开发工具**插件；插件需处于可响应命令的状态。
- 命令行中的 **模块名** 与 IDEA 里脚本工程对应的 **模块名** 一致。
- 多窗口、多工程时，建议用 **`-p` / `--project`** 传入与 IDEA 中打开路径一致的 **工程根目录**，便于匹配到正确实例。

## 程序名与帮助
- **本仓库自带可执行文件**（相对仓库根目录）：**`ec_work_config/ios/bin/ec-ios-cli`**
  - 在仓库根下：`./ec_work_config/ios/bin/ec-ios-cli -h`
  - Agent / 脚本优先使用该路径，避免依赖全局 PATH。
- 若本机已单独安装并加入 PATH，也可直接执行 **`ec-ios-cli`**（与上述为同一程序；本地若改名，请将命令中的名称一并替换）。
- 查看总帮助：`./ec_work_config/ios/bin/ec-ios-cli -h`（或：`ec-ios-cli -h`）
- 查看子命令帮助：`./ec_work_config/ios/bin/ec-ios-cli <子命令> -h`

## 子命令一览

| 子命令 | 作用 |
|--------|------|
| `preview` | 预览工程 |
| `run` | 运行工程 |
| `stop` | 停止正在运行的脚本 |
| `build` | 构建编译 IEC |
| `monitor` | 仅持续输出日志流（不要求 `-m`） |
| `capture-image` | 截图并返回保存路径（AI 辅助） |
| `ocr-screen` | OCR 识别当前屏幕（AI 辅助） |
| `capture-node` | 抓取节点(UIX)并返回文件路径（AI 辅助） |
| `test-image` | 测试模板匹配（AI 辅助） |
| `ocr-local-image` | OCR 识别本地图像（AI 辅助） |

**说明：**
- `preview / run / stop / build / capture-image / ocr-screen / capture-node / test-image / ocr-local-image` 均需 **`-m`（模块名）**。
- `monitor` 不需要模块名。
- `capture-image` 兼容旧命令名别名：`captureImage` / `fetch-image` / `fetchImage`（建议统一用 `capture-image`）。

## 通用参数（除 `monitor` 外）

这些参数在大多数命令上都可用（尤其是日志监控相关）。

| 参数 | 含义 |
|------|------|
| **`-m` / `--module`** | **必填**。IDEA 模块名。 |
| **`-p` / `--project`** | 可选。工程根目录路径（与 IDEA 中打开路径一致）。 |
| **`-f` / `--format`** | 可选。日志行格式：`text` 或 `json`；**省略时默认为 `json`**。 |
| **`-o` / `--log`** | 可选。将日志**追加**写入指定文件路径。 |
| **`-k` / `--stop-on`** | 可选。日志中包含该子串时退出监控；多个关键字用 **`|||`** 连接表示“或”（任一命中即退出）。 |
| **`-w` / `--monitor-logs`** | 可选。`true` / `false`。通常默认会持续监控日志；显式 `-w false` 可让命令在 HTTP 调用结束后立即结束日志监控。 |
| **`-r` / `--random-log`** | 可选。`true` / `false`。为 `true` 时在 `ai_logs/` 下自动生成随机日志文件名；**不可与 `-o` 同时使用**。 |

**约束：**
- 凡写出的可选参数须带有效取值。
- **`-r` 与 `-o` 不能同时使用**。

## 布尔参数（bool）写法：为什么建议用 `=`

CLI 里 `--need-auto` / `--release` / `--monitor-logs` 等是 **bool** 参数：
- 写成 `--flag` 表示 **true**
- 要传 **false** 时，建议使用 **等号**：`--flag=false`（或短参数：`-a=false`）

示例：
- `--need-auto` 等价于 `--need-auto=true`
- `--need-auto=false` 才能明确关闭

## `monitor` 专用参数

仅日志流；不使用 `-m`、`-p`、`-w`。

| 参数 | 含义 |
|------|------|
| **`-f` / `--format`** | `text` 或 `json`，默认 `json`。 |
| **`-o` / `--log`** | 将日志追加写入该文件。 |
| **`-k` / `--stop-on`** | 日志匹配关键字则退出（`|||` 多关键字“或”）。 |
| **`-r` / `--random-log`** | 自动生成随机日志文件（勿与 `-o` 同用）。 |

## 新增 AI 辅助命令（参数与示例）

这些命令同样支持通用参数 `-m/-p/-f/-o/-r/-k/-w`，并内置默认 `stop-on` 关键字（包含 `失败请登录`），用于在成功/失败时自动停止日志监控。

### `capture-image`（截图）
- **业务参数**
  - `--dir / -d`：可选。保存目录；不传则保存到工程默认图片目录
  - `--image-format / -g`：可选。`jpg|png`（默认 `jpg`）
  - `--need-auto / -a`：可选。是否需要自动化服务（默认 `true`）
- **示例**

```bash
EC=./ec_work_config/ios/bin/ec-ios-cli
$EC capture-image -m app
$EC capture-image -m app -d /tmp -g png
$EC capture-image -m app --need-auto=false
```

### `ocr-screen`（OCR 屏幕）
- **业务参数**
  - `--ocr-type / -t`：可选。默认 `paddleOcrNcnnV5`
  - `--padding / -x`：可选。默认 `32`
  - `--max-side-len / -l`：可选。默认 `640`
  - `--release / -e`：可选。默认 `false`
  - `--need-auto / -a`：可选。默认 `true`
- **示例**

```bash
EC=./ec_work_config/ios/bin/ec-ios-cli
$EC ocr-screen -m app
$EC ocr-screen -m app -t paddleOcrOnnxV5 -x 32 -l 640
```

### `capture-node`（抓取节点）
- **业务参数**
  - `--dir / -d`：可选。保存目录；不传则保存到工程默认节点目录
- **示例**

```bash
EC=./ec_work_config/ios/bin/ec-ios-cli
$EC capture-node -m app
$EC capture-node -m app -d /tmp
```

### `test-image`（模板匹配测试）
- **业务参数（常用）**
  - `--test-type / -t`：可选。`2`（默认，实时抓屏）或 `1`（本图测试）
  - `--small-image-path / -s`：必填。模板图路径
  - `--big-image-path / -b`：可选。本图测试（`-t 1`）时必填
- **示例**

```bash
EC=./ec_work_config/ios/bin/ec-ios-cli
# 实时抓屏（默认）
$EC test-image -m app -s /path/to/small.png
# 本图测试
$EC test-image -m app -t 1 -s /path/to/small.png -b /path/to/big.png
```

### `ocr-local-image`（OCR 本地图像）
- **业务参数**
  - `--path / -i`：必填。本地图像路径
  - 其它参数同 `ocr-screen`
- **示例**

```bash
EC=./ec_work_config/ios/bin/ec-ios-cli
$EC ocr-local-image -m app -i /path/to/image.png
$EC ocr-local-image -m app -i /path/to/image.png -t paddleOcrOnnxV5 -x 32 -l 640
```

## 日志输出习惯
- 常规日志多输出到 **标准错误（stderr）**；使用 **`-o`** 或 **`-r`** 时还会写入文件。
- 默认日志行格式为 **JSON**，除非指定 **`-f text`**。

## 经典命令示例（preview / run / stop / build / monitor）

```bash
# 以下假定当前目录为仓库根；EC 即 ./ec_work_config/ios/bin/ec-ios-cli
EC=./ec_work_config/ios/bin/ec-ios-cli

# preview
$EC preview -m app
$EC preview -m app -f json

# run
$EC run -m app
$EC run -m app -f json -o /tmp/easyclick.log
$EC run -m app -r true
$EC run -m app -w false

# stop
$EC stop -m app

# build（编译 IEC）
$EC build -m app

# monitor（仅日志流）
$EC monitor
$EC monitor -f text -o /tmp/monitor.log -k "完成"
```

多工程/多 IDEA 实例时示例（建议加 `-p` 缩小匹配范围）：

```bash
./ec_work_config/ios/bin/ec-ios-cli run -m app -p /path/to/project/root
```

## 综合示例

```bash
EC=./ec_work_config/ios/bin/ec-ios-cli

# 旧命令
$EC preview -m app
$EC run -m app -o /tmp/run.log -k "上传"
$EC stop -m app
$EC build -m app
$EC monitor -k "完成"

# 新增 AI 辅助
$EC capture-image -m app -d /tmp -g png
$EC ocr-screen -m app
$EC capture-node -m app
$EC test-image -m app -s /path/to/small.png
$EC ocr-local-image -m app -i /path/to/image.png
```
