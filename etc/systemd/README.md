# systemd 单元（逐个安装）

不要使用 `cp *.service` 或 `systemctl enable *.service` 这种通配方式。按下面顺序：**每复制一个文件 → `daemon-reload` → `enable` → `start`**，需要几个服务就重复几次。

## 1. 改路径

用编辑器打开 `system/amz-admin.service`，把其中的 **`/root/amz`** 改成你服务器上本仓库的真实路径（共两处：`WorkingDirectory` 与 `ExecStart` 里的目录）。

可选：在 `[Service]` 里增加环境变量，例如：

```ini
Environment=PORT=5090
Environment=MYSQL_HOST=127.0.0.1
Environment=MYSQL_DATABASE=amz
```

或整文件加载： `EnvironmentFile=/root/amz/.env`（路径按实际填写）。

## 2. 安装并启动（一次只做一个 unit）

示例单元名：`amz-admin.service`。

```bash
sudo cp /你的仓库路径/etc/systemd/system/amz-admin.service /etc/systemd/system/amz-admin.service
sudo systemctl daemon-reload
sudo systemctl enable amz-admin.service
sudo systemctl start amz-admin.service
sudo systemctl status amz-admin.service
```

若还要装第二个、第三个服务，再各自执行一遍：**复制对应 `.service` → `daemon-reload` → `enable` → `start`**。

## 3. 常用命令

```bash
sudo systemctl restart amz-admin.service
sudo journalctl -u amz-admin.service -f
```

当前项目通常只需要 **`amz-admin.service`** 一个进程（`app.py` 即管理端 + API）。Nginx 请按仓库 `nginx/README.md` 单独配置，不必做成项目里的第二个 Python service。
