# Nginx 配置说明（tgapi.tgitellyou.com）

本目录的 `nginx.conf` 把域名 **tgapi.tgitellyou.com** 反向代理到本机 **5090** 端口上的管理后台（与项目根目录 `app.py` 默认 `PORT=5090` 一致）。

## 1. 准备

1. **DNS**  
   在域名解析里为 **tgapi.tgitellyou.com** 添加 **A 记录**，指向服务器公网 IP（若只用 IPv6 则用 AAAA）。

2. **先启动应用**（监听本机 5090，且建议只绑内网）  
   ```bash
   cd /path/to/tg-api
   PORT=5090 python app.py
   ```  
   或：  
   ```bash
   uvicorn src.admin_app:app --host 127.0.0.1 --port 5090
   ```  
   确认本机可访问：`curl -sI http://127.0.0.1:5090/`

## 2. 接入 Nginx

不同发行版目录不一样：**CentOS / Rocky / AlmaLinux / RHEL 没有 `sites-enabled`**，请用下面的 **2.1**；**Debian / Ubuntu** 用 **2.2**。

### 2.1 CentOS 9 / Rocky / AlmaLinux / RHEL（推荐：`conf.d`）

1. 安装 Nginx（若尚未安装）：  
   ```bash
   sudo dnf install -y nginx
   sudo systemctl enable --now nginx
   ```

2. 把项目里的配置链到 **`/etc/nginx/conf.d/`**（该目录默认会被主配置 `include`）：  
   ```bash
   sudo ln -sf /root/tg-api/nginx/nginx.conf /etc/nginx/conf.d/tg-api.conf
   ```  
   路径请改成你机器上真实项目路径（上例假设项目在 `/root/tg-api`）。

3. 若 **`/etc/nginx/conf.d/` 里还有 `default.conf`** 且也监听 80，会与 `server_name` 冲突。可改名禁用默认站：  
   ```bash
   sudo mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bak
   ```

4. 检查并重载：  
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

5. 防火墙（CentOS 常用 **firewalld**）：  
   ```bash
   sudo firewall-cmd --permanent --add-service=http
   sudo firewall-cmd --permanent --add-service=https
   sudo firewall-cmd --reload
   ```

6. 浏览器访问：`http://tgapi.tgitellyou.com/`。

### 2.2 Debian / Ubuntu（`sites-enabled`）

1. 安装 Nginx：  
   `sudo apt update && sudo apt install -y nginx`

2. 若系统里**没有** `sites-enabled`，可先建目录再在主配置里 `include`，或直接用与 CentOS 相同做法：软链到 **`/etc/nginx/conf.d/tg-api.conf`**。

3. 若使用经典 `sites-enabled`：  
   ```bash
   sudo ln -sf /path/to/tg-api/nginx/nginx.conf /etc/nginx/sites-enabled/tg-api.conf
   ```  
   并确认 `/etc/nginx/nginx.conf` 的 `http {}` 里有：`include /etc/nginx/sites-enabled/*;`（部分版本需自行添加）。

4. `sudo nginx -t && sudo systemctl reload nginx`。

## 3. HTTPS（可选）

1. 用 Certbot 等申请证书（示例）：  
   - Debian/Ubuntu：`sudo apt install -y certbot python3-certbot-nginx`  
   - CentOS 9：`sudo dnf install -y certbot python3-certbot-nginx`  
   ```bash
   sudo certbot --nginx -d tgapi.tgitellyou.com
   ```  
   Certbot 往往会自动改 Nginx；若你手动维护，可把 `nginx.conf` 里注释掉的 **443** `server` 段取消注释，并把 `ssl_certificate` / `ssl_certificate_key` 改成实际证书路径。

2. 建议在 443 生效后，把 80 段改为仅跳转 HTTPS（可自行在 `server` 里加 `return 301 https://$host$request_uri;`）。

## 4. 防火墙

- **firewalld（CentOS 等）**：见上文 2.1 第 5 步。  
- **UFW（Ubuntu）**：`sudo ufw allow 'Nginx Full'` 或分别放行 80、443。

## 5. 修改端口时

若应用不用 5090，请同时改两处：

- 启动命令里的端口（或环境变量 `PORT`）  
- `nginx.conf` 里 `upstream tgapi_admin` 的 `server 127.0.0.1:5090;`

改完后执行：`sudo nginx -t && sudo systemctl reload nginx`。

## 6. Cloudflare 报错 521（Web server is down）

含义：访客 → Cloudflare 正常，但 **Cloudflare → 你的源站** 连不上（被拒绝、无服务、或协议/端口不对）。

### 6.1 最常见：SSL/TLS 加密模式与源站不一致

仓库里的 `nginx.conf` 默认只在源站监听 **HTTP 80**，**没有**在源站配置 **443 HTTPS**。

| Cloudflare 模式 | Cloudflare 访问源站的方式 | 你只有 Nginx:80 时 |
|-----------------|---------------------------|-------------------|
| **Flexible**    | 用 **HTTP** 连源站（常见 80） | 通常可以 |
| **Full** / **Full (strict)** | 用 **HTTPS** 连源站 **443** | **会 521**（源站没有 443 或证书） |

**处理（二选一）：**

1. **临时验证**：Cloudflare 控制台 → SSL/TLS → 概述 → 把加密模式改为 **Flexible**（仅用于排查；源站到 CF 仍是明文，长期建议用下面方案）。  
2. **推荐**：在源站为 `tgapi.tgitellyou.com` 配置 **Let's Encrypt**（certbot + nginx），源站监听 **443**，再把 CF 设为 **Full (strict)**。

### 6.2 源站服务或防火墙

在**服务器本机**执行：

```bash
systemctl status nginx
curl -sI http://127.0.0.1/          # 经 Nginx（若 server_name 不匹配可能 404，但不应连接失败）
curl -sI http://127.0.0.1:5090/     # 直连后端
ss -tlnp | grep -E ':80|:443'
```

- Nginx / 应用未运行 → 先 `systemctl start nginx` 并保证 `5090` 上的应用在跑。  
- **firewalld / 安全组** 未放行 **80**（若用 Full 还要 **443**）→ 外网和 Cloudflare 都连不上源站。

### 6.3 DNS 是否指对

Cloudflare 里该子域名的 **A 记录** 必须是**服务器真实公网 IP**，小云朵为「已代理」（橙色）。若 IP 填错，可能出现其它错误码；521 多数是「IP 对但源站不接」。

### 6.4 小结

先确认：**Nginx 监听 80 且本机 `curl 127.0.0.1` 有响应**；再把 Cloudflare SSL 设为 **Flexible** 试访问。若 Flexible 能打开，说明问题在 **Full 需要源站 HTTPS**，再在源站加证书并改回 **Full (strict)**。
