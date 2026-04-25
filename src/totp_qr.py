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
        def _try_extract(img_obj):
            for sym in pyzbar_decode(img_obj):
                data = sym.data.decode("utf-8", errors="replace").strip()
                if not data:
                    continue
                sec = extract_secret_from_otpauth_uri(data)
                if sec and str(sec).strip():
                    return str(sec).strip()
            return None

        src = Image.open(io.BytesIO(raw))
        if src.mode not in ("RGB", "L"):
            src = src.convert("RGB")

        # 多轮尝试：原图、灰度、二值化、放大后再识别，降低因截图缩放/模糊导致的漏识别。
        candidates = [src]
        try:
            gray = src.convert("L")
            candidates.append(gray)
            for th in (110, 128, 145, 165):
                bw = gray.point(lambda p, t=th: 255 if p > t else 0, mode="1")
                candidates.append(bw.convert("L"))
        except Exception:
            pass
        try:
            from PIL import ImageOps

            candidates.append(ImageOps.autocontrast(src.convert("L")))
        except Exception:
            pass

        for base in list(candidates):
            sec0 = _try_extract(base)
            if sec0:
                return sec0
            w, h = base.size
            if w <= 0 or h <= 0:
                continue
            for scale in (2, 3):
                up = base.resize((w * scale, h * scale), Image.NEAREST)
                sec = _try_extract(up)
                if sec:
                    return sec
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
