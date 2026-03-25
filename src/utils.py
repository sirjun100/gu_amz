import os
from datetime import datetime
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent.parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)


def load_ads() -> str:
    """从 .env 中读取 AD_1 ~ AD_5，拼接为广告文本。"""
    ads = []
    for i in range(1, 6):
        ad = os.getenv(f"AD_{i}", "").strip()
        if ad:
            ads.append(ad)
    return "\n".join(ads)


def save_result(phone: str, info: dict) -> Path:
    """将注册结果保存为 txt 文件，以手机号命名。"""
    filename = phone.replace("+", "plus_").replace(" ", "") + ".txt"
    filepath = OUTPUT_DIR / filename

    lines = [
        f"手机号: {phone}",
        f"api_id: {info.get('api_id', 'N/A')}",
        f"api_hash: {info.get('api_hash', 'N/A')}",
        f"app_title: {info.get('app_title', 'N/A')}",
        f"注册时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
    ]
    filepath.write_text("\n".join(lines), encoding="utf-8")
    return filepath
