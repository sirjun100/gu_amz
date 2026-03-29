"""
TRC20 USDT 入账扫描（TronGrid），配置来自数据库 config 表。
匹配规则：收款地址、合约、转账金额（与订单 trc20_pay_amount 一致）、订单创建早于链上时间。
"""
from __future__ import annotations

import hashlib
import logging
from decimal import Decimal
from typing import Any

import requests

from src.bot_lang import translate_for_user

logger = logging.getLogger(__name__)

DEFAULT_TRON_API = "https://api.trongrid.io"
DEFAULT_USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"


def unique_trc20_pay_amount(base: float, order_id: str) -> float:
    """在套餐价基础上加随机微尾数，避免多笔同额订单链上无法区分。"""
    h = int(hashlib.md5(order_id.encode()).hexdigest(), 16)
    tail_units = (h % 999_999) + 1
    return round(float(base) + tail_units * 1e-6, 6)


def _truthy(val: str | None) -> bool:
    if not val:
        return False
    return val.strip().lower() in ("1", "true", "yes", "on")


def _headers(api_key: str | None) -> dict[str, str]:
    h: dict[str, str] = {}
    if api_key and api_key.strip():
        h["TRON-PRO-API-KEY"] = api_key.strip()
    return h


def _fetch_json(url: str, params: dict | None, headers: dict, timeout: float = 20.0) -> Any:
    r = requests.get(url, params=params or {}, headers=headers, timeout=timeout)
    r.raise_for_status()
    return r.json()


def _latest_block_number(api_base: str, headers: dict) -> int | None:
    try:
        data = _fetch_json(f"{api_base.rstrip('/')}/wallet/getnowblock", None, headers)
        return int(data["block_header"]["raw_data"]["number"])
    except Exception:
        logger.exception("获取 TRON 最新区块失败")
        return None


def _expected_minor_units(trc20_pay: float, decimals: int) -> int:
    d = Decimal(str(trc20_pay))
    scale = Decimal(10) ** decimals
    return int(d * scale)


def run_tron_payment_scan(db) -> list[dict[str, str]]:
    """
    拉取收款地址近期 TRC20 入账，尝试匹配 pending 订单并 fulfill。
    返回需通知用户的消息列表：[{"telegram_id", "text"}, ...]
    """
    if not _truthy(db.get_config("TRON_MONITOR_ENABLED", "0")):
        return []

    addr = (db.get_config("TRC20_ADDRESS") or "").strip()
    if not addr:
        return []

    api_base = (db.get_config("TRON_API_BASE") or DEFAULT_TRON_API).strip().rstrip("/")
    contract = (db.get_config("TRON_USDT_CONTRACT") or DEFAULT_USDT_CONTRACT).strip()
    api_key = (db.get_config("TRONGRID_API_KEY") or "").strip()

    try:
        min_conf = int(db.get_config("TRON_MIN_CONFIRMATIONS", "19") or "19")
    except ValueError:
        min_conf = 19
    if min_conf < 0:
        min_conf = 0

    headers = _headers(api_key)
    latest_block = _latest_block_number(api_base, headers) if min_conf > 0 else None

    url = f"{api_base}/v1/accounts/{addr}/transactions/trc20"
    params = {
        "limit": 50,
        "only_confirmed": "true",
        "contract_address": contract,
    }
    try:
        body = _fetch_json(url, params, headers)
    except Exception:
        logger.exception("TronGrid 拉取 TRC20 转账失败")
        return []

    txs = body.get("data") or []
    pending_orders = db.list_pending_tron_orders()
    if not pending_orders:
        return []

    # order_id -> row
    by_minor: dict[int, list[dict]] = {}
    for row in pending_orders:
        pay = float(row["trc20_pay_amount"])
        minor = _expected_minor_units(pay, 6)
        by_minor.setdefault(minor, []).append(row)

    notifications: list[dict[str, str]] = []

    for tx in txs:
        tx_id = tx.get("transaction_id") or tx.get("txID")
        if not tx_id:
            continue
        to_a = (tx.get("to") or "").strip()
        if to_a != addr:
            continue
        try:
            value = int(tx["value"])
        except (KeyError, TypeError, ValueError):
            continue
        ts_ms = int(tx.get("block_timestamp", 0) or 0)
        tx_block_raw = tx.get("block_number", tx.get("block"))
        tx_block: int | None = None
        if tx_block_raw is not None:
            try:
                tx_block = int(tx_block_raw)
            except (TypeError, ValueError):
                tx_block = None
        if min_conf > 0:
            if latest_block is None or tx_block is None:
                continue
            if latest_block - tx_block + 1 < min_conf:
                continue

        candidates = sorted(by_minor.get(value) or [], key=lambda r: r["created_at"])
        for order in candidates:
            created = order["created_at"]
            created_ms = int(created.timestamp() * 1000) if hasattr(created, "timestamp") else 0
            if ts_ms and created_ms and ts_ms < created_ms:
                continue
            oid = order["order_id"]
            if db.tron_try_claim_tx_and_fulfill(str(tx_id), oid):
                logger.info("TRC20 入账匹配订单 order_id=%s tx=%s", oid, tx_id)
                tid = str(order["telegram_id"])
                notifications.append(
                    {
                        "telegram_id": tid,
                        "text": translate_for_user(tid, "tron_payment_confirmed", order_id=oid),
                    }
                )
                break

    return notifications
