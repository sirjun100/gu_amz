# Nginx 配置说明（tgapi.tgitellyou.com）

本目录的 `nginx.conf` 把域名 **tgapi.tgitellyou.com** 反向代理到本机 **5080** 端口上的管理后台（与项目根目录 `app.py` 默认 `PORT=5080` 一致）。

## 1. 准备

1. **DNS**  
   在域名解析里为 **tgapi.tgitellyou.com** 添加 **A 记录**，指向服务器公网 IP（若只用 IPv6 则用 AAAA）。

2. **先启动应用**（监听本机 5080，且建议只绑内网）  
   ```bash
   cd /path/to/tg-api
   PORT=5080 python app.py
   ```  
   或：  
   ```bash
   uvicorn src.admin_app:app --host 127.0.0.1 --port 5080
   ```  
   确认本机可访问：`curl -sI http://127.0.0.1:5080/`

## 2. 接入 Nginx（Debian / Ubuntu 常见做法）

1. 安装 Nginx（若尚未安装）：  
   `sudo apt update && sudo apt install -y nginx`

2. 把本仓库里的配置挂到 Nginx（二选一）：

   **方式 A：软链到 `sites-enabled`（推荐）**  
   ```bash
   sudo ln -sf /path/to/tg-api/nginx/nginx.conf /etc/nginx/sites-enabled/tg-api.conf
   sudo rm -f /etc/nginx/sites-enabled/default   # 若 80 端口被 default 占用且你不需要默认站，可删
   ```

   **方式 B：在 `nginx.conf` 的 `http { }` 里 include**  
   在 `/etc/nginx/nginx.conf` 的 `http` 块中增加一行（路径改成你的实际路径）：  
   `include /path/to/tg-api/nginx/nginx.conf;`

3. 检查并重载：  
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. 浏览器访问：`http://tgapi.tgitellyou.com/`（应打开管理后台）。

## 3. HTTPS（可选）

1. 用 Certbot 等申请证书（示例）：  
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d tgapi.tgitellyou.com
   ```  
   Certbot 往往会自动改 Nginx；若你手动维护，可把 `nginx.conf` 里注释掉的 **443** `server` 段取消注释，并把 `ssl_certificate` / `ssl_certificate_key` 改成实际证书路径。

2. 建议在 443 生效后，把 80 段改为仅跳转 HTTPS（可自行在 `server` 里加 `return 301 https://$host$request_uri;`）。

## 4. 防火墙

若服务器启用了防火墙，需放行 **80**（及 **443**）：  
例如 UFW：`sudo ufw allow 'Nginx Full'` 或分别 `allow 80`、`allow 443`。

## 5. 修改端口时

若应用不用 5080，请同时改两处：

- 启动命令里的端口（或环境变量 `PORT`）  
- `nginx.conf` 里 `upstream tgapi_admin` 的 `server 127.0.0.1:5080;`

改完后执行：`sudo nginx -t && sudo systemctl reload nginx`。
