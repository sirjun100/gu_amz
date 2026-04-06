from __future__ import annotations

import hashlib
import io
import json
import mimetypes
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated, Any, Optional

import jwt
import pymysql
from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .db import db, normalize_target_asin, parse_task_params
from .task_report_parse import parse_task_report_footer
from .paths import STATIC_WEB_DIR, TASK_IMAGE_DIR, ensure_data_dir

STATIC = STATIC_WEB_DIR

JWT_ALG = "HS256"
JWT_EXPIRE_DAYS = 7


def _jwt_signing_key() -> bytes:
    raw = os.getenv("JWT_SECRET", "dev-change-JWT_SECRET-in-production").encode("utf-8")
    if len(raw) < 32:
        return hashlib.sha256(raw).digest()
    return raw


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


def _create_token(user_id: int, username: str, is_admin: bool) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "username": username,
        "is_admin": is_admin,
        "iat": now,
        "exp": now + timedelta(days=JWT_EXPIRE_DAYS),
    }
    return jwt.encode(payload, _jwt_signing_key(), algorithm=JWT_ALG)


def _decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, _jwt_signing_key(), algorithms=[JWT_ALG])
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效或过期的令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> dict[str, Any]:
    data = _decode_token(token)
    uid = data.get("sub")
    if not uid:
        raise HTTPException(status_code=401, detail="无效令牌")
    return {
        "id": int(uid),
        "username": data.get("username", ""),
        "is_admin": bool(data.get("is_admin", False)),
    }


CurrentUser = Annotated[dict[str, Any], Depends(get_current_user)]


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    id: int
    username: str
    is_admin: bool


class PaginatedTasks(BaseModel):
    items: list[dict[str, Any]]
    page: int
    per_page: int
    total: int
    total_pages: int


class PaginatedRows(BaseModel):
    items: list[dict[str, Any]]
    page: int
    per_page: int
    total: int
    total_pages: int


class DeviceAliasBody(BaseModel):
    alias: str | None = None


class DeviceScreenshotPolicyBody(BaseModel):
    screenshot_upload_policy: str = Field(..., pattern="^(all|failed_only|none)$")


class BatchClickTasksBody(BaseModel):
    task_type: str = Field(..., min_length=1)
    keyword: str = Field(..., min_length=1)
    res_folder_name: str = Field(
        "",
        min_length=0,
        description="与关键词 1:1；客户端 res 下资源目录名",
    )
    product_title: str = Field(
        "",
        min_length=0,
        description="已废弃，仅兼容旧请求体",
    )
    product_titles: list[str] = Field(
        default_factory=list,
        description="已废弃，仅兼容旧请求体",
    )
    mode: str = Field(..., pattern="^(manual|smart)$")
    device_ids: list[str] = Field(default_factory=list)
    per_device_counts: dict[str, int] = Field(default_factory=dict)
    total_count: int = Field(0, ge=0, le=100000)
    save_data_record: bool = Field(
        False, description="勾选后任务成功结案时写入归档（仅成功，含参数与状态）"
    )


class BatchRegisterBody(BaseModel):
    mode: str = Field(..., pattern="^(manual|smart)$")
    device_ids: list[str] = Field(default_factory=list)
    per_device_counts: dict[str, int] = Field(default_factory=dict)
    raw_text: str = Field(..., min_length=1)
    save_data_record: bool = Field(
        True, description="默认勾选：创建时写入归档，结案时合并成功/失败与详情"
    )


class AdminSettingsResponse(BaseModel):
    task_retention_days: int


class AdminSettingsPatchBody(BaseModel):
    task_retention_days: int = Field(..., ge=1, le=3650)


class UsAddressBody(BaseModel):
    recipient_name: str | None = None
    state: str | None = None
    city: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    zip_code: str | None = None
    phone: str | None = None
    full_line: str | None = None


class TargetAsinCreateBody(BaseModel):
    asin: str = Field(..., min_length=1, max_length=32)
    note: str = Field("", max_length=512)


class TargetAsinPatchBody(BaseModel):
    asin: str | None = Field(None, min_length=1, max_length=32)
    note: str | None = Field(None, max_length=512)


class HeartbeatBody(BaseModel):
    device_id: str = Field(..., min_length=1, max_length=128)


class ClientAsinClickBody(BaseModel):
    device_id: str = Field(..., min_length=1, max_length=128)
    asin: str = Field(..., min_length=1, max_length=32)


class TaskReportParsePreviewBody(BaseModel):
    """联调：模拟客户端 log_lines，查看服务端解析结果（与 客户端上报日志约定.md 一致）。"""

    log_lines: list[str]


class TaskReportParsePreviewResponse(BaseModel):
    parsed: dict[str, Any]


def _serialize_row(row: dict[str, Any]) -> dict[str, Any]:
    out = {}
    for k, v in row.items():
        if hasattr(v, "isoformat"):
            out[k] = v.isoformat() if v is not None else None
        else:
            out[k] = v
    return out


def _serialize_saved_record_row(row: dict[str, Any]) -> dict[str, Any]:
    base = _serialize_row(row)
    raw = base.get("content")
    if isinstance(raw, str) and raw.strip():
        try:
            base["content"] = json.loads(raw)
        except json.JSONDecodeError:
            base["content"] = {"_invalid_json": raw[:2000]}
    return base


def _serialize_task_row(row: dict[str, Any]) -> dict[str, Any]:
    """API task shape: core fields + params (object). Legacy DB columns are not exposed."""
    base = _serialize_row(row)
    params_obj = parse_task_params(base)
    out: dict[str, Any] = {
        "id": base["id"],
        "device_id": base.get("device_id"),
        "task_type": base["task_type"],
        "status": base["status"],
        "params": params_obj,
        "failure_detail": base.get("failure_detail"),
        "retry_count": int(base.get("retry_count") or 0),
        "created_at": base.get("created_at"),
        "updated_at": base.get("updated_at"),
        "started_at": base.get("started_at"),
        "finished_at": base.get("finished_at"),
        "environment": base.get("task_environment"),
    }
    if "device_alias" in base:
        out["device_alias"] = base["device_alias"]
    return out


def _paginate_tasks(total: int, page: int, per_page: int, rows: list) -> PaginatedTasks:
    total_pages = max(1, (total + per_page - 1) // per_page) if total else 1
    return PaginatedTasks(
        items=[_serialize_task_row(r) for r in rows],
        page=page,
        per_page=per_page,
        total=total,
        total_pages=total_pages,
    )


def _paginate_rows(total: int, page: int, per_page: int, rows: list) -> PaginatedRows:
    total_pages = max(1, (total + per_page - 1) // per_page) if total else 1
    return PaginatedRows(
        items=[_serialize_row(r) for r in rows],
        page=page,
        per_page=per_page,
        total=total,
        total_pages=total_pages,
    )


def _distribute_total(total: int, n: int) -> list[int]:
    if n <= 0:
        return []
    base = total // n
    rem = total % n
    return [base + (1 if i < rem else 0) for i in range(n)]


CLICK_TYPES = frozenset({"search_click", "related_click", "similar_click"})


def _xlsx_row_to_address(row) -> dict[str, Any] | None:
    vals = list(row) if row else []
    while len(vals) < 8:
        vals.append(None)
    if vals[0] is None and not any(vals):
        return None
    return {
        "recipient_name": str(vals[0]).strip() if vals[0] is not None else None,
        "state": (str(vals[1]).strip()[:64] if vals[1] is not None else None) or None,
        "city": (str(vals[2]).strip()[:255] if vals[2] is not None else None) or None,
        "address_line1": (str(vals[3]).strip()[:512] if vals[3] is not None else None) or None,
        "address_line2": (str(vals[4]).strip()[:512] if vals[4] is not None else None) or None,
        "zip_code": (str(vals[5]).strip()[:64] if vals[5] is not None else None) or None,
        "phone": (str(vals[6]).strip()[:64] if vals[6] is not None else None) or None,
        "full_line": (str(vals[7]).strip()[:1024] if vals[7] is not None else None) or None,
    }


app = FastAPI(title="亚马逊运维系统", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup():
    db.init_tables()
    ensure_data_dir()
    try:
        db.purge_completed_tasks_older_than_days(db.get_task_retention_days())
    except Exception:
        pass


@app.post("/api/v1/auth/token", response_model=TokenResponse)
async def login(form: Annotated[OAuth2PasswordRequestForm, Depends()]):
    user = db.verify_admin_login(form.username, form.password)
    if not user:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    token = _create_token(user["id"], user["username"], user["is_admin"])
    return TokenResponse(access_token=token)


@app.get("/api/v1/auth/me", response_model=MeResponse)
async def me(user: CurrentUser):
    return MeResponse(id=user["id"], username=user["username"], is_admin=user["is_admin"])


@app.get("/api/v1/admin/devices/options")
async def admin_device_options(user: CurrentUser):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    rows = db.list_devices_options()
    return {"items": [_serialize_row(r) for r in rows]}


@app.get("/api/v1/admin/devices", response_model=PaginatedRows)
async def admin_devices_list(
    user: CurrentUser,
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
    q: Optional[str] = None,
):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    total, rows = db.list_devices_paginated(page, per_page, q)
    ids = [str(r["device_id"]) for r in rows]
    counts_map = db.get_pending_task_counts_by_device(ids)
    items: list[dict[str, Any]] = []
    for r in rows:
        d = _serialize_row(r)
        did = str(d["device_id"])
        d["pending_tasks"] = counts_map.get(did, {})
        items.append(d)
    total_pages = max(1, (total + per_page - 1) // per_page) if total else 1
    return PaginatedRows(
        items=items,
        page=page,
        per_page=per_page,
        total=total,
        total_pages=total_pages,
    )


@app.patch("/api/v1/admin/devices/{device_id}/alias")
async def admin_device_set_alias(user: CurrentUser, device_id: str, body: DeviceAliasBody):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    db.set_device_alias(device_id, body.alias)
    return {"ok": True}


@app.patch("/api/v1/admin/devices/{device_id}/screenshot-upload-policy")
async def admin_device_screenshot_upload_policy(user: CurrentUser, device_id: str, body: DeviceScreenshotPolicyBody):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    try:
        db.upsert_device_screenshot_upload_policy(device_id, body.screenshot_upload_policy)
    except ValueError:
        raise HTTPException(status_code=400, detail="设备 ID 无效")
    return {
        "ok": True,
        "screenshot_upload_policy": db.get_device_screenshot_upload_policy(device_id),
    }


@app.get("/api/v1/admin/keywords", response_model=PaginatedRows)
async def admin_keywords_list(
    user: CurrentUser,
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=200),
    q: Optional[str] = None,
):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    total, rows = db.list_keywords_paginated(page, per_page, q)
    return _paginate_rows(total, page, per_page, rows)


@app.post("/api/v1/admin/keywords/import")
async def admin_keywords_import(user: CurrentUser, file: UploadFile = File(...)):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    raw = await file.read()
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        text = raw.decode("gbk", errors="replace")
    lines = text.splitlines()
    n = db.keywords_import_lines(lines)
    return {"ok": True, "imported": n}


@app.delete("/api/v1/admin/keywords/{keyword_id}")
async def admin_keyword_delete(user: CurrentUser, keyword_id: int):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    if not db.keyword_delete(keyword_id):
        raise HTTPException(status_code=404, detail="不存在")
    return {"ok": True}


@app.post("/api/v1/admin/tasks/batch-click")
async def admin_tasks_batch_click(user: CurrentUser, body: BatchClickTasksBody):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    if body.task_type not in CLICK_TYPES:
        raise HTTPException(status_code=400, detail="task_type 无效")
    device_ids = [d.strip() for d in body.device_ids if d and str(d).strip()]
    if not device_ids:
        raise HTTPException(status_code=400, detail="请至少选择一台设备")
    pairs: list[tuple[str, int]] = []
    if body.mode == "manual":
        for d in device_ids:
            c = int(body.per_device_counts.get(d, 0))
            if c > 0:
                pairs.append((d, c))
    else:
        total = int(body.total_count)
        if total <= 0:
            raise HTTPException(status_code=400, detail="智能分配请填写总任务数")
        counts = _distribute_total(total, len(device_ids))
        pairs = [(device_ids[i], counts[i]) for i in range(len(device_ids)) if counts[i] > 0]
    if not pairs:
        raise HTTPException(status_code=400, detail="没有可创建的任务数量")
    fn = (body.res_folder_name or "").strip()
    if not fn:
        legacy = [str(t).strip() for t in (body.product_titles or []) if str(t).strip()]
        one = (body.product_title or "").strip()
        if legacy:
            fn = legacy[0]
        elif one:
            fn = one
    if not fn:
        raise HTTPException(status_code=400, detail="请填写资源文件夹名 res_folder_name（与关键词 1:1）")
    n = db.insert_click_tasks_batch(
        body.task_type,
        body.keyword.strip(),
        fn,
        pairs,
        persist_data=body.save_data_record,
    )
    return {"ok": True, "created": n}


def _parse_phones_from_text(raw: str) -> list[str]:
    out: list[str] = []
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        first = line.split("\t", 1)[0].split(",", 1)[0].strip()
        if first:
            out.append(first)
    return out


@app.post("/api/v1/admin/tasks/batch-register")
async def admin_tasks_batch_register(user: CurrentUser, body: BatchRegisterBody):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    phones = _parse_phones_from_text(body.raw_text)
    if not phones:
        raise HTTPException(status_code=400, detail="请填写手机号，一行一个")
    device_ids = [d.strip() for d in body.device_ids if d and str(d).strip()]
    if not device_ids:
        raise HTTPException(status_code=400, detail="请至少选择一台设备")
    pairs: list[tuple[str, int]] = []
    if body.mode == "manual":
        for d in device_ids:
            c = int(body.per_device_counts.get(d, 0))
            if c > 0:
                pairs.append((d, c))
        if sum(c for _, c in pairs) != len(phones):
            raise HTTPException(
                status_code=400,
                detail=f"手动分配：所选设备任务数之和须等于手机号行数（当前手机号 {len(phones)} 条）",
            )
    else:
        counts = _distribute_total(len(phones), len(device_ids))
        pairs = [(device_ids[i], counts[i]) for i in range(len(device_ids)) if counts[i] > 0]
    if not pairs:
        raise HTTPException(status_code=400, detail="没有可分配的任务数量")
    try:
        n = db.insert_register_tasks_phones(phones, pairs, save_data_record=body.save_data_record)
    except ValueError as e:
        code = str(e)
        if code == "EMPTY_ADDRESS_POOL":
            raise HTTPException(status_code=400, detail="地址库为空，请先导入地址")
        if code == "REGISTER_DEVICE_COUNT_MISMATCH":
            raise HTTPException(status_code=400, detail="设备任务数与手机号数量不一致")
        if code == "REGISTER_EMPTY_DEVICE":
            raise HTTPException(status_code=400, detail="设备 ID 无效")
        raise
    return {"ok": True, "created": n}


@app.get("/api/v1/admin/settings", response_model=AdminSettingsResponse)
async def admin_get_settings(user: CurrentUser):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    return AdminSettingsResponse(task_retention_days=db.get_task_retention_days())


@app.patch("/api/v1/admin/settings", response_model=AdminSettingsResponse)
async def admin_patch_settings(user: CurrentUser, body: AdminSettingsPatchBody):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    db.set_task_retention_days(body.task_retention_days)
    try:
        db.purge_completed_tasks_older_than_days(db.get_task_retention_days())
    except Exception:
        pass
    return AdminSettingsResponse(task_retention_days=db.get_task_retention_days())


@app.get("/api/v1/admin/task-saved-records", response_model=PaginatedRows)
async def admin_task_saved_records_list(
    user: CurrentUser,
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
    task_type: Optional[str] = None,
    q: Optional[str] = None,
):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    total, rows = db.list_task_saved_records(page, per_page, task_type, q)
    total_pages = max(1, (total + per_page - 1) // per_page) if total else 1
    return PaginatedRows(
        items=[_serialize_saved_record_row(r) for r in rows],
        page=page,
        per_page=per_page,
        total=total,
        total_pages=total_pages,
    )


@app.get("/api/v1/admin/addresses", response_model=PaginatedRows)
async def admin_addresses_list(
    user: CurrentUser,
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
    q: Optional[str] = None,
):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    total, rows = db.list_addresses_paginated(page, per_page, q)
    return _paginate_rows(total, page, per_page, rows)


@app.post("/api/v1/admin/addresses")
async def admin_address_create(user: CurrentUser, body: UsAddressBody):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    aid = db.address_create(body.model_dump())
    return {"ok": True, "id": aid}


@app.get("/api/v1/admin/addresses/{address_id}")
async def admin_address_get(user: CurrentUser, address_id: int):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    row = db.address_get(address_id)
    if not row:
        raise HTTPException(status_code=404, detail="不存在")
    return _serialize_row(row)


@app.put("/api/v1/admin/addresses/{address_id}")
async def admin_address_update(user: CurrentUser, address_id: int, body: UsAddressBody):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    if not db.address_update(address_id, body.model_dump()):
        raise HTTPException(status_code=404, detail="不存在")
    return {"ok": True}


@app.delete("/api/v1/admin/addresses/{address_id}")
async def admin_address_delete(user: CurrentUser, address_id: int):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    if not db.address_delete(address_id):
        raise HTTPException(status_code=404, detail="不存在")
    return {"ok": True}


@app.post("/api/v1/admin/addresses/import-xlsx")
async def admin_addresses_import_xlsx(user: CurrentUser, file: UploadFile = File(...)):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    try:
        from openpyxl import load_workbook
    except ImportError:
        raise HTTPException(status_code=500, detail="服务端未安装 openpyxl")
    data = await file.read()
    wb = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    ws = wb.active
    rows_out: list[dict] = []
    for row in ws.iter_rows(values_only=True):
        rec = _xlsx_row_to_address(row)
        if rec and (rec.get("recipient_name") or rec.get("full_line") or rec.get("address_line1")):
            rows_out.append(rec)
    wb.close()
    if not rows_out:
        raise HTTPException(status_code=400, detail="未解析到有效行")
    n = db.addresses_import_rows(rows_out)
    return {"ok": True, "imported": n}


@app.get("/api/v1/admin/target-asins", response_model=PaginatedRows)
async def admin_target_asins_list(
    user: CurrentUser,
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
    q: Optional[str] = None,
):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    total, rows = db.list_target_asins_paginated(page, per_page, q)
    return _paginate_rows(total, page, per_page, rows)


@app.post("/api/v1/admin/target-asins")
async def admin_target_asin_create(user: CurrentUser, body: TargetAsinCreateBody):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    try:
        aid = db.target_asin_create(body.asin, body.note or None)
    except ValueError:
        raise HTTPException(status_code=400, detail="ASIN 格式无效（需 10～16 位字母数字）")
    except pymysql.err.IntegrityError:
        raise HTTPException(status_code=400, detail="ASIN 已存在")
    return {"ok": True, "id": aid}


@app.get("/api/v1/admin/target-asins/{asin_id}")
async def admin_target_asin_get(user: CurrentUser, asin_id: int):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    row = db.target_asin_get(asin_id)
    if not row:
        raise HTTPException(status_code=404, detail="不存在")
    return _serialize_row(row)


@app.put("/api/v1/admin/target-asins/{asin_id}")
async def admin_target_asin_update(user: CurrentUser, asin_id: int, body: TargetAsinPatchBody):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    if body.asin is None and body.note is None:
        raise HTTPException(status_code=400, detail="请至少提供一个要修改的字段")
    try:
        ok = db.target_asin_update(asin_id, body.asin, body.note)
    except ValueError:
        raise HTTPException(status_code=400, detail="ASIN 格式无效（需 10～16 位字母数字）")
    except pymysql.err.IntegrityError:
        raise HTTPException(status_code=400, detail="ASIN 与其他记录冲突")
    if not ok:
        raise HTTPException(status_code=404, detail="不存在")
    return {"ok": True}


@app.delete("/api/v1/admin/target-asins/{asin_id}")
async def admin_target_asin_delete(user: CurrentUser, asin_id: int):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    if not db.target_asin_delete(asin_id):
        raise HTTPException(status_code=404, detail="不存在")
    return {"ok": True}


@app.post("/api/v1/admin/task-report/parse-preview", response_model=TaskReportParsePreviewResponse)
async def admin_task_report_parse_preview(user: CurrentUser, body: TaskReportParsePreviewBody):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    p = parse_task_report_footer(body.log_lines)
    fin: str | None = None
    if p.finished_at is not None:
        fin = p.finished_at.isoformat()
    return TaskReportParsePreviewResponse(
        parsed={
            "success": p.success,
            "environment": p.environment,
            "finished_at": fin,
            "failure_detail": p.failure_detail,
            "used_amz_report": p.used_amz_report,
        }
    )


@app.get("/api/v1/admin/task-center/tasks", response_model=PaginatedTasks)
async def admin_task_center_list(
    user: CurrentUser,
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
    device_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    task_type: Optional[str] = None,
    params_q: Optional[str] = Query(
        None,
        max_length=256,
        description="在 params JSON 及遗留关键词/标题/手机等字段中模糊匹配",
    ),
):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    pq = params_q.strip() if params_q and params_q.strip() else None
    total, rows = db.list_tasks_filtered(page, per_page, device_id, status_filter, task_type, pq)
    return _paginate_tasks(total, page, per_page, rows)


@app.delete("/api/v1/admin/task-center/tasks")
async def admin_task_delete_all_matching(
    user: CurrentUser,
    device_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    task_type: Optional[str] = None,
    params_q: Optional[str] = Query(
        None,
        max_length=256,
        description="与列表接口一致；无筛选参数时删除库内全部任务",
    ),
):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    pq = params_q.strip() if params_q and params_q.strip() else None
    deleted, names = db.delete_tasks_matching_filters(device_id, status_filter, task_type, pq)
    for name in names:
        p = os.path.join(TASK_IMAGE_DIR, name)
        try:
            os.remove(p)
        except FileNotFoundError:
            pass
    return {"ok": True, "deleted": deleted}


@app.get("/api/v1/admin/task-center/tasks/{task_id}")
async def admin_task_center_detail(user: CurrentUser, task_id: int):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    task = db.get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    logs = db.get_task_logs(task_id)
    imgs = db.get_task_image_rows(task_id)
    return {
        "task": _serialize_task_row(task),
        "logs": [_serialize_row(r) for r in logs],
        "screenshots": [_serialize_row(r) for r in imgs],
    }


@app.get("/api/v1/admin/task-center/screenshots/{image_id}")
async def admin_task_screenshot_file(user: CurrentUser, image_id: int):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    row = db.get_image_by_id(image_id)
    if not row:
        raise HTTPException(status_code=404, detail="不存在")
    path = os.path.join(TASK_IMAGE_DIR, row["stored_name"])
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="文件缺失")
    media_type, _ = mimetypes.guess_type(path)
    return FileResponse(path, media_type=media_type or "application/octet-stream")


@app.post("/api/v1/admin/task-center/tasks/{task_id}/retry")
async def admin_task_retry(user: CurrentUser, task_id: int):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    ok, names = db.retry_failed_task(task_id)
    if not ok:
        raise HTTPException(status_code=400, detail="仅失败状态可重试")
    for name in names:
        p = os.path.join(TASK_IMAGE_DIR, name)
        try:
            os.remove(p)
        except FileNotFoundError:
            pass
    return {"ok": True}


@app.delete("/api/v1/admin/task-center/tasks/{task_id}")
async def admin_task_delete(user: CurrentUser, task_id: int):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    ok, names = db.delete_task_and_collect_images(task_id)
    if not ok:
        raise HTTPException(status_code=404, detail="任务不存在")
    for name in names:
        p = os.path.join(TASK_IMAGE_DIR, name)
        try:
            os.remove(p)
        except FileNotFoundError:
            pass
    return {"ok": True}


@app.post("/api/v1/admin/task-center/tasks/{task_id}/redo")
async def admin_task_redo(user: CurrentUser, task_id: int):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    try:
        new_id = db.clone_task_redo(task_id)
    except ValueError as e:
        if str(e) == "EMPTY_ADDRESS_POOL":
            raise HTTPException(status_code=400, detail="地址库为空，无法复制注册任务")
        raise
    if not new_id:
        raise HTTPException(status_code=400, detail="无法复制该任务（类型不支持或数据不完整）")
    return {"ok": True, "new_task_id": new_id}


@app.post("/api/v1/client/heartbeat")
async def client_heartbeat(body: HeartbeatBody):
    db.upsert_device_heartbeat(body.device_id)
    pol = db.get_device_screenshot_upload_policy(body.device_id)
    return {"ok": True, "screenshot_upload_policy": pol}


@app.post("/api/v1/client/asin-clicks")
async def client_asin_click(body: ClientAsinClickBody):
    """客户端每次完成目标 ASIN 相关点击后调用；仅对已登记的 ASIN 累加「总点击 / 今日点击」。"""
    db.upsert_device_heartbeat(body.device_id)
    norm = normalize_target_asin(body.asin)
    if not norm:
        raise HTTPException(status_code=400, detail="ASIN 格式无效（需 10～16 位字母数字）")
    out = db.increment_target_asin_click(norm)
    if not out:
        raise HTTPException(
            status_code=404,
            detail="ASIN 未在后台登记，请先在「目标 ASIN 管理」中添加",
        )
    return {"ok": True, **out}


@app.get("/api/v1/client/random-keywords")
async def client_random_keywords(num: int = Query(2, ge=1, le=100)):
    kws = db.keywords_random_sample(num)
    return {"keywords": kws, "count": len(kws)}


@app.get("/api/v1/client/tasks/next")
async def client_tasks_next(
    device_id: str = Query(..., min_length=1),
    task_type: Optional[str] = Query(None, description="仅领取指定类型，如 search_click"),
):
    db.upsert_device_heartbeat(device_id)
    pol = db.get_device_screenshot_upload_policy(device_id)
    tt = task_type.strip() if task_type else None
    task = db.claim_next_task(device_id, tt)
    if not task:
        return {"task": None, "screenshot_upload_policy": pol}
    return {"task": _serialize_task_row(task), "screenshot_upload_policy": pol}


@app.post("/api/v1/client/tasks/{task_id}/screenshots")
async def client_task_append_screenshots(
    task_id: int,
    device_id: str = Form(...),
    description: str = Form(default=""),
    image: UploadFile = File(...),
):
    """过程截图：running 时按设备策略即时上传；failed_only 策略下也可在任务失败后补传队列中的图。"""
    task = db.get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    if str(task.get("device_id") or "") != device_id.strip():
        raise HTTPException(status_code=403, detail="设备不匹配")
    policy = db.get_device_screenshot_upload_policy(device_id)
    st = task["status"]
    if policy == "none":
        raise HTTPException(status_code=403, detail="设备策略为禁止上传截图")
    if st == "running":
        if policy == "failed_only":
            raise HTTPException(
                status_code=403,
                detail="设备策略为仅失败任务上传截图：请在本地压缩暂存，任务失败结案后再传",
            )
    elif st == "failed":
        if policy not in ("all", "failed_only"):
            raise HTTPException(status_code=403, detail="设备策略为禁止上传截图")
    else:
        raise HTTPException(status_code=400, detail="仅执行中或已失败任务可上传过程截图")
    if not image.filename:
        raise HTTPException(status_code=400, detail="缺少图片文件")
    body = await image.read()
    max_mb = int(os.getenv("TASK_IMAGE_MAX_MB", "8"))
    if len(body) > max_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail="单张图片过大")
    ext = Path(image.filename).suffix.lower() or ".bin"
    if ext not in (".png", ".jpg", ".jpeg", ".webp", ".gif", ".bin"):
        ext = ".bin"
    stored = f"{task_id}_{uuid.uuid4().hex}{ext}"
    dest = os.path.join(TASK_IMAGE_DIR, stored)
    with open(dest, "wb") as f:
        f.write(body)
    desc = (description or "").strip()[:512] or None
    img_id = db.insert_task_image(task_id, stored, desc)
    return {"ok": True, "image_id": img_id}


@app.post("/api/v1/client/tasks/{task_id}/report")
async def client_task_report(
    task_id: int,
    device_id: str = Form(...),
    log_lines: str = Form(default="[]"),
    images: Optional[list[UploadFile]] = File(None),
    image_descriptions: Optional[str] = Form(
        default=None,
        description='可选，与 images 顺序一致的说明 JSON 数组，如 ["搜索页","详情"]',
    ),
):
    try:
        lines = json.loads(log_lines) if log_lines else []
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="log_lines 须为 JSON 字符串数组")
    if not isinstance(lines, list):
        raise HTTPException(status_code=400, detail="log_lines 须为数组")
    lines = [str(x) for x in lines]
    task = db.get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    if task["status"] != "running":
        raise HTTPException(status_code=400, detail="任务状态不可上报")
    if str(task.get("device_id") or "") != device_id.strip():
        raise HTTPException(status_code=403, detail="设备不匹配")
    policy = db.get_device_screenshot_upload_policy(device_id)
    parsed_preview = parse_task_report_footer(lines)
    imgs: list[UploadFile] = list(images or [])
    if policy == "none" and imgs:
        raise HTTPException(status_code=400, detail="设备策略为禁止上传截图，结案请勿附带图片")
    if policy == "failed_only" and parsed_preview.success:
        imgs = []
    if lines:
        db.append_task_logs(task_id, lines)
    desc_list: list[str | None] = []
    if image_descriptions and str(image_descriptions).strip():
        try:
            arr = json.loads(str(image_descriptions).strip())
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="image_descriptions 须为 JSON 数组字符串")
        if not isinstance(arr, list):
            raise HTTPException(status_code=400, detail="image_descriptions 须为数组")
        for x in arr:
            if x is None:
                desc_list.append(None)
            else:
                s = str(x).strip()
                desc_list.append(s[:512] if s else None)
    max_mb = int(os.getenv("TASK_IMAGE_MAX_MB", "8"))
    for i, uf in enumerate(imgs):
        if not uf.filename:
            continue
        body = await uf.read()
        if len(body) > max_mb * 1024 * 1024:
            raise HTTPException(status_code=413, detail="单张图片过大")
        ext = Path(uf.filename).suffix.lower() or ".bin"
        if ext not in (".png", ".jpg", ".jpeg", ".webp", ".gif", ".bin"):
            ext = ".bin"
        stored = f"{task_id}_{uuid.uuid4().hex}{ext}"
        dest = os.path.join(TASK_IMAGE_DIR, stored)
        with open(dest, "wb") as f:
            f.write(body)
        one_desc = desc_list[i] if i < len(desc_list) else None
        db.insert_task_image(task_id, stored, one_desc)
    ok, _ = db.finalize_task_from_report(task_id, lines)
    if not ok:
        raise HTTPException(status_code=400, detail="无法结案任务")
    return {"ok": True}


_assets = os.path.join(STATIC, "assets")
if os.path.isdir(_assets):
    app.mount("/static/assets", StaticFiles(directory=_assets), name="static_assets")


@app.get("/static/favicon.svg")
async def admin_favicon():
    p = os.path.join(STATIC, "favicon.svg")
    if os.path.isfile(p):
        return FileResponse(p)
    raise HTTPException(status_code=404)


@app.get("/")
async def spa_index():
    index = os.path.join(STATIC, "index.html")
    if not os.path.isfile(index):
        return {
            "detail": "请先构建前端：cd admin && npm run build（输出到仓库根目录 static/，见 vite.config.ts）",
        }
    return FileResponse(index)


@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    if full_path == "api" or full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")
    if full_path == "static" or full_path.startswith("static/"):
        raise HTTPException(status_code=404, detail="Not found")
    candidate = os.path.join(STATIC, full_path)
    if os.path.isfile(candidate):
        return FileResponse(candidate)
    index = os.path.join(STATIC, "index.html")
    if os.path.isfile(index):
        return FileResponse(index)
    raise HTTPException(status_code=404, detail="Not found")
