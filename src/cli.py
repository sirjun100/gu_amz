import asyncio
import logging

from .core import TelegramRegistrar
from .utils import save_result

logger = logging.getLogger(__name__)


async def run_cli():
    """终端交互模式。"""
    print("=" * 50)
    print("  Telegram API 信息自动注册工具 (终端模式)")
    print("=" * 50)

    while True:
        print()
        phone = input("请输入手机号（国际格式如 +8613800138000，输入 q 退出）: ").strip()
        if phone.lower() == "q":
            print("再见！")
            break
        if not phone.startswith("+"):
            print("❌ 手机号必须以 + 开头（国际格式）")
            continue

        reg = TelegramRegistrar()
        try:
            result = await reg.send_code(phone)
            if not result["ok"]:
                print(f"❌ 发送验证码失败: {result['error']}")
                continue

            random_hash = result["random_hash"]
            print("✅ 验证码已发送，请查看您的 Telegram 消息")

            code = input("请输入收到的验证码: ").strip()
            if not code:
                print("❌ 验证码不能为空")
                continue

            result = await reg.login(phone, random_hash, code)
            if not result["ok"]:
                print(f"❌ 登录失败: {result['error']}")
                continue

            print("✅ 登录成功，正在获取/创建应用...")

            result = await reg.get_or_create_app()
            if not result["ok"]:
                print(f"❌ 获取应用信息失败: {result['error']}")
                continue

            filepath = save_result(phone, result)
            print()
            print("=" * 40)
            print("  ✅ 注册成功！信息如下：")
            print("=" * 40)
            print(f"  api_id:    {result.get('api_id')}")
            print(f"  api_hash:  {result.get('api_hash')}")
            print(f"  API其他信息访问 https://my.telegram.org 查看")
            print(f"  文件保存:  {filepath}")
            print(f"  麻烦闲鱼给个好评,非常感谢!!!")
            print(f"  凡购买过一次的朋友以后可免费申请,机器人-> @r7appinfo_bot")
            print(f"  TG业务:软件开发/机器人开发/棋牌开发/TG账号批发-> @r7haopu_bot")
            print("=" * 40)

        except Exception as e:
            print(f"❌ 发生错误: {e}")
            logger.exception("CLI 异常")
        finally:
            await reg.close()
