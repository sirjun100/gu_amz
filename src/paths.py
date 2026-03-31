from __future__ import annotations

import os
from collections.abc import Iterable

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(ROOT, "data")
TASK_IMAGE_DIR = os.path.join(DATA_DIR, "task_images")

# 管理端 SPA 静态目录（admin：npm run build）。可用 AMZ_STATIC_ROOT 覆盖为绝对路径或相对 ROOT 的路径。
_raw_static = (os.getenv("AMZ_STATIC_ROOT") or "").strip()
if _raw_static:
    _sp = os.path.expanduser(_raw_static)
    STATIC_WEB_DIR = os.path.abspath(_sp if os.path.isabs(_sp) else os.path.join(ROOT, _sp))
else:
    STATIC_WEB_DIR = os.path.join(ROOT, "static")


def ensure_data_dir() -> None:
    os.makedirs(DATA_DIR, mode=0o755, exist_ok=True)
    os.makedirs(TASK_IMAGE_DIR, mode=0o755, exist_ok=True)


def safe_task_image_path(stored_name: str | None) -> str | None:
    """Resolve stored_name to an absolute path under TASK_IMAGE_DIR, or None if unsafe / empty."""
    if stored_name is None:
        return None
    s = str(stored_name).strip()
    if not s or "/" in s or "\\" in s or s.startswith("."):
        return None
    base = os.path.basename(s)
    if not base or base != s:
        return None
    return os.path.join(TASK_IMAGE_DIR, base)


def unlink_task_image_files(stored_names: Iterable[str]) -> int:
    """Remove files for the given stored_name values; ignores missing paths. Returns removed count."""
    n = 0
    seen: set[str] = set()
    for raw in stored_names:
        key = str(raw or "").strip()
        if not key or key in seen:
            continue
        seen.add(key)
        p = safe_task_image_path(key)
        if p and os.path.isfile(p):
            try:
                os.remove(p)
                n += 1
            except OSError:
                pass
    return n
