import requests
import time
import subprocess

# WARP 代理配置
proxies = {
    "http": "socks5://127.0.0.1:40000",
    "https": "socks5://127.0.0.1:40000"
}

def check_warp():
    try:
        # 测试IP
        ip = requests.get("https://ifconfig.me", proxies=proxies, timeout=10).text
        print(f"✅ WARP 正常 | 当前IP: {ip}")
        return True
    except Exception as e:
        print(f"❌ 代理失效: {str(e)}")
        return False

def restart_warp():
    print("🔄 正在重启 WARP 服务...")
    # 直接重启系统服务，比脚本更稳
    subprocess.run(["systemctl", "restart", "warp-svc"], capture_output=True)
    time.sleep(3)
    subprocess.run(["warp-cli", "connect"], capture_output=True)
    time.sleep(2)

# 主循环：1分钟检查一次，无限运行
if __name__ == "__main__":
    print("🚀 WARP 循环监控已启动 (1分钟检查一次)")
    while True:
        if not check_warp():
            restart_warp()
        # 等待 60 秒 = 1分钟
        time.sleep(60)