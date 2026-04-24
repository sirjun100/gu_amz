"""TOTP：从二维码图片解析 otpauth 密钥，以及用 pyotp 生成当前验证码。"""
from __future__ import annotations

import io
import re
from urllib.parse import parse_qs, urlparse


def decode_totp_secret_from_image_bytes(raw: bytes) -> str | None:
    """从截图字节中识别 otpauth://totp/... 二维码，返回 Base32 secret。依赖 pyzbar + Pillow。"""
    if not raw:
        return None
    try:
        from PIL import Image
    except ImportError:
        return None
    try:
        from pyzbar.pyzbar import decode as pyzbar_decode
    except ImportError:
        return None
    try:
        img = Image.open(io.BytesIO(raw))
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        for sym in pyzbar_decode(img):
            data = sym.data.decode("utf-8", errors="replace").strip()
            if not data.startswith("otpauth://"):
                continue
            u = urlparse(data)
            qs = parse_qs(u.query)
            sec = (qs.get("secret") or [None])[0]
            if sec and str(sec).strip():
                return str(sec).strip()
        return None
    except Exception:
        return None


def extract_secret_from_otpauth_uri(uri: str) -> str | None:
    if not uri or "otpauth://" not in uri:
        return None
    try:
        u = urlparse(uri.strip())
        qs = parse_qs(u.query)
        sec = (qs.get("secret") or [None])[0]
        if sec:
            return str(sec).strip()
    except Exception:
        pass
    m = re.search(r"[?&]secret=([^&]+)", uri)
    if m:
        from urllib.parse import unquote

        return unquote(m.group(1)).strip()
    return None


def totp_current_code(secret_b32: str) -> str | None:
    if not secret_b32 or not str(secret_b32).strip():
        return None
    try:
        import pyotp

        return pyotp.TOTP(str(secret_b32).strip().replace(" ", "")).now()
    except Exception:
        return None
