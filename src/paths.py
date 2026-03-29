"""项目根目录与上传文件路径（机器人与后台共用）。"""
from __future__ import annotations

import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(ROOT, "data")
TRC20_QR_PREFIX = "trc20_payment_qr"
TRC20_QR_EXTS = (".png", ".jpg", ".jpeg", ".webp")


def ensure_data_dir() -> None:
    os.makedirs(DATA_DIR, mode=0o755, exist_ok=True)


def trc20_qr_image_path() -> str | None:
    """若已上传收款二维码，返回磁盘路径，否则 None。"""
    for ext in TRC20_QR_EXTS:
        p = os.path.join(DATA_DIR, TRC20_QR_PREFIX + ext)
        if os.path.isfile(p):
            return p
    return None


def delete_all_trc20_qr() -> None:
    for ext in TRC20_QR_EXTS:
        try:
            os.remove(os.path.join(DATA_DIR, TRC20_QR_PREFIX + ext))
        except FileNotFoundError:
            pass
