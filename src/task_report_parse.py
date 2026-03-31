"""
任务上报日志解析（实现细节）。

完整约定见项目根目录文档：客户端上报日志约定.md
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import json
from typing import Any

REPORT_PREFIX = "AMZ_REPORT "


@dataclass
class ParsedTaskReport:
    success: bool
    environment: str | None
    finished_at: datetime | None  # aware UTC or None → 服务端用 CURRENT_TIMESTAMP
    failure_detail: str | None  # 失败时写入任务表
    used_amz_report: bool


def _parse_iso_to_utc(s: str | None) -> datetime | None:
    if s is None:
        return None
    raw = str(s).strip()
    if not raw:
        return None
    if raw.endswith("Z"):
        raw = raw[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(raw)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt


def _truncate_env(s: str | None, max_len: int = 256) -> str | None:
    if s is None:
        return None
    t = str(s).strip()
    if not t:
        return None
    return t[:max_len]


def parse_task_report_footer(log_lines: list[str]) -> ParsedTaskReport:
    lines = [str(x) for x in (log_lines or [])]
    # 自底向上找 AMZ_REPORT
    for i in range(len(lines) - 1, -1, -1):
        line = lines[i].strip()
        if not line:
            continue
        if line.startswith(REPORT_PREFIX):
            payload = line[len(REPORT_PREFIX) :].strip()
            try:
                obj: Any = json.loads(payload)
            except json.JSONDecodeError:
                return ParsedTaskReport(
                    success=False,
                    environment=None,
                    finished_at=None,
                    failure_detail="AMZ_REPORT 行 JSON 无法解析",
                    used_amz_report=True,
                )
            if not isinstance(obj, dict):
                return ParsedTaskReport(
                    success=False,
                    environment=None,
                    finished_at=None,
                    failure_detail="AMZ_REPORT 须为 JSON 对象",
                    used_amz_report=True,
                )
            st = str(obj.get("status", "")).strip().lower()
            success = st == "success"
            env = _truncate_env(obj.get("environment"))
            fin = _parse_iso_to_utc(obj.get("finished_at"))
            err_raw = obj.get("error")
            if err_raw is not None and str(err_raw).strip():
                err_msg = str(err_raw).strip()[:2000]
            else:
                err_msg = None
            if success:
                return ParsedTaskReport(
                    success=True,
                    environment=env,
                    finished_at=fin,
                    failure_detail=None,
                    used_amz_report=True,
                )
            detail = err_msg or json.dumps(obj, ensure_ascii=False)[:2000]
            return ParsedTaskReport(
                success=False,
                environment=env,
                finished_at=fin,
                failure_detail=detail,
                used_amz_report=True,
            )
    # 旧协议：最后一条非空行
    last_text: str | None = None
    for j in range(len(lines) - 1, -1, -1):
        t = lines[j].strip()
        if t:
            last_text = t
            break
    if not last_text:
        return ParsedTaskReport(
            success=False,
            environment=None,
            finished_at=None,
            failure_detail="failed",
            used_amz_report=False,
        )
    success_legacy = last_text.lower() == "success"
    return ParsedTaskReport(
        success=success_legacy,
        environment=None,
        finished_at=None,
        failure_detail=None if success_legacy else last_text[:2000],
        used_amz_report=False,
    )
