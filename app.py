"""
启动 FastAPI：REST API + 仓库根目录 static/ 下的管理端 SPA。

1) 构建管理端（产物写入项目根目录 static/）：
     cd admin && npm run build
2) 启动：
     python app.py

可选环境变量 AMZ_STATIC_ROOT：覆盖静态文件目录（绝对路径或相对于仓库根的路径）。
未设置时由 app.py 默认为与本文件同目录下的 static/。
"""
from __future__ import annotations

import os

_repo_root = os.path.dirname(os.path.abspath(__file__))
os.environ.setdefault("AMZ_STATIC_ROOT", os.path.join(_repo_root, "static"))

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "src.admin_app:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "5090")),
        reload=True,
    )
