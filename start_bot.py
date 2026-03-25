"""
启动 Telegram API 自动注册工具 (机器人模式)
"""

import asyncio
import logging
from dotenv import load_dotenv
import os
import platform

# 加载环境变量
load_dotenv()


system_name = platform.system()
if system_name == 'Linux':
    print("当前系统是 Linux, 开启代理 ttp://127.0.0.1:40000")
    # Cloudflare WARP 代理配置
    os.environ["HTTP_PROXY"] = "http://127.0.0.1:40000"
    os.environ["HTTPS_PROXY"] = "http://127.0.0.1:40000"
else:
    print(f"当前系统是 {system_name}")



# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)

from src.bot import run_bot

if __name__ == "__main__":
    asyncio.run(run_bot())
