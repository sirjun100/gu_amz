import asyncio
import json
import logging
import random
import re
import string
from pathlib import Path

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# 注册时自动填写的默认值
# ──────────────────────────────────────────────
DEFAULT_APP_TITLE = "My Application"
DEFAULT_APP_URL = "https://baidu.com"
DEFAULT_APP_PLATFORM = "desktop"
DEFAULT_APP_DESC = "Desktop client application for personal use"

BASE_URL = "https://my.telegram.org"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Origin": BASE_URL,
    "Referer": f"{BASE_URL}/",
}


# ══════════════════════════════════════════════
# 核心：my.telegram.org 注册逻辑
# ══════════════════════════════════════════════
class TelegramRegistrar:
    """处理 my.telegram.org 的登录和应用注册流程。每个实例维护独立的 HTTP session。"""

    def __init__(self):
        self.client = httpx.AsyncClient(
            headers=HEADERS,
            follow_redirects=True,
            timeout=30.0,
        )
        self.logged_in = False

    async def close(self):
        await self.client.aclose()

    async def send_code(self, phone: str) -> dict:
        """步骤1：发送验证码到手机。"""
        logger.info(f"正在向 {phone} 发送验证码...")
        resp = await self.client.post(
            f"{BASE_URL}/auth/send_password",
            data={"phone": phone},
        )
        text = resp.text.strip()
        if resp.status_code != 200:
            return {"ok": False, "error": f"HTTP {resp.status_code}: {text}"}
        # 先检查是否包含已知错误信息
        error_keywords = ["sorry", "too many", "flood", "banned", "error", "invalid"]
        if any(kw in text.lower() for kw in error_keywords):
            return {"ok": False, "error": text}
        # 尝试解析 JSON 响应
        if "random_hash" in text:
            try:
                data = json.loads(text)
                return {"ok": True, "random_hash": data.get("random_hash", "")}
            except json.JSONDecodeError:
                pass
        # 非 JSON 但看起来像 hash 的纯字符串
        if len(text) > 10:
            return {"ok": True, "random_hash": text}
        return {"ok": False, "error": text or "未知错误"}

    async def login(self, phone: str, random_hash: str, code: str) -> dict:
        """步骤2：用验证码登录。"""
        logger.info("正在登录...")
        resp = await self.client.post(
            f"{BASE_URL}/auth/login",
            data={
                "phone": phone,
                "random_hash": random_hash,
                "password": code,
            },
        )
        text = resp.text.strip()
        if resp.status_code != 200:
            return {"ok": False, "error": f"HTTP {resp.status_code}: {text}"}
        if text.lower() == "true" or "true" in text.lower():
            self.logged_in = True
            return {"ok": True}
        return {"ok": False, "error": text}

    async def get_or_create_app(self) -> dict:
        """步骤3：获取已有应用或创建新应用，返回 api_id / api_hash 等。"""
        if not self.logged_in:
            return {"ok": False, "error": "未登录"}

        await asyncio.sleep(1)

        logger.info("正在检查已有应用...")
        resp = await self.client.get(f"{BASE_URL}/apps")
        soup = BeautifulSoup(resp.text, "html.parser")

        app_info = self._parse_app_page(soup)
        if app_info:
            logger.info("发现已有应用，直接获取信息")
            return {"ok": True, **app_info}

        # 没有应用，需要创建
        logger.info("未找到已有应用，正在创建新应用...")
        await asyncio.sleep(2)

        hash_input = soup.find("input", {"name": "hash"})
        app_hash = hash_input["value"] if hash_input else ""

        create_data = {
            "hash": app_hash,
            "app_title": DEFAULT_APP_TITLE,
            "app_shortname": self._gen_shortname(),
            "app_url": DEFAULT_APP_URL,
            "app_platform": DEFAULT_APP_PLATFORM,
            "app_desc": DEFAULT_APP_DESC,
        }

        resp = await self.client.post(f"{BASE_URL}/apps/create", data=create_data)
        if resp.status_code != 200:
            return {"ok": False, "error": f"创建失败 HTTP {resp.status_code}: {resp.text[:200]}"}

        await asyncio.sleep(1)
        resp = await self.client.get(f"{BASE_URL}/apps")
        soup = BeautifulSoup(resp.text, "html.parser")
        app_info = self._parse_app_page(soup)
        if app_info:
            return {"ok": True, **app_info}

        return {"ok": False, "error": f"创建应用后无法获取信息，响应: {resp.text[:300]}"}

    def _parse_app_page(self, soup: BeautifulSoup) -> dict | None:
        """从 /apps 页面解析出 api_id, api_hash 等信息。"""
        labels = soup.find_all("label")
        info = {}
        for label in labels:
            text = label.get_text(strip=True).lower()
            value_el = label.find_next_sibling("span") or label.find_next_sibling("strong")
            if not value_el:
                parent = label.parent
                if parent:
                    value_el = parent.find("span") or parent.find("strong")
            if not value_el:
                continue
            value = value_el.get_text(strip=True)
            if "app api_id" in text or "api_id" in text:
                info["api_id"] = value
            elif "app api_hash" in text or "api_hash" in text:
                info["api_hash"] = value
            elif "app title" in text or "title" in text:
                info["app_title"] = value

        if not info.get("api_id"):
            for inp in soup.find_all("input"):
                name = inp.get("name", "")
                value = inp.get("value", "")
                if not value:
                    continue
                if name == "app_id" or "api_id" in name:
                    info["api_id"] = value
                elif name == "app_hash" or "api_hash" in name:
                    info["api_hash"] = value
                elif name == "app_title":
                    info["app_title"] = value

        if not info.get("api_id"):
            page_text = soup.get_text()
            id_match = re.search(r"api[_\s]?id[:\s]+(\d+)", page_text, re.IGNORECASE)
            if id_match:
                info["api_id"] = id_match.group(1)
            hash_match = re.search(r"api[_\s]?hash[:\s]+([a-f0-9]{32})", page_text, re.IGNORECASE)
            if hash_match:
                info["api_hash"] = hash_match.group(1)

        if info.get("api_id") and info.get("api_hash"):
            return info
        return None

    @staticmethod
    def _gen_shortname() -> str:
        suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
        return f"app{suffix}"
