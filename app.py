"""
管理后台：FastAPI + 根目录 static/ 下的前端构建产物（index.html）。
先构建: cd admin && npm run build → 输出到 ../static/
再启动: python app.py（默认 0.0.0.0:5002，根路径即管理页）
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "src.admin_app:app",
        host="0.0.0.0",
        port=int(__import__("os").getenv("PORT", "5002")),
        reload=True,
    )
