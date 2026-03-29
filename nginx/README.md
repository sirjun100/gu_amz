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

若应用不用 5080，请同时改两处：

- 启动命令里的端口（或环境变量 `PORT`）  
- `nginx.conf` 里 `upstream tgapi_admin` 的 `server 127.0.0.1:5080;`

改完后执行：`sudo nginx -t && sudo systemctl reload nginx`。
