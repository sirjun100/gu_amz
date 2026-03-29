"""
FastAPI 管理后台：/api/v1 与项目根目录 static/ 下的前端（index.html）。
启动: python app.py 或 uvicorn src.admin_app:app --host 0.0.0.0 --port 5002
"""
from __future__ import annotations

import hashlib
import json
import mimetypes
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated, Any, Optional

import jwt
from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .db import db
from .paths import DATA_DIR, TRC20_QR_EXTS, TRC20_QR_PREFIX, delete_all_trc20_qr, ensure_data_dir, trc20_qr_image_path

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
# 前端构建产物目录：在 admin 目录执行 npm run build，输出到项目根下 static/
STATIC = os.path.join(ROOT, "static")

JWT_ALG = "HS256"
JWT_EXPIRE_DAYS = 7


def _jwt_signing_key() -> bytes:
    """HS256 建议密钥长度 ≥32 字节；短字符串经 SHA-256 派生，消除 InsecureKeyLengthWarning。"""
    raw = os.getenv("JWT_SECRET", "dev-change-JWT_SECRET-in-production").encode("utf-8")
    if len(raw) < 32:
        return hashlib.sha256(raw).digest()
    return raw

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

ALLOWED_CONFIG_KEYS = frozenset(
    {
        "TRC20_ADDRESS",
        "OKPAY_ID",
        "OKPAY_TOKEN",
        "OKPAY_PAYED",
        "OKPAY_RETURN_URL",
        "BOT_CUSTOM_MENU_JSON",
        "APPLY_PACK_1_PRICE",
        "APPLY_PACK_10_PRICE",
        "APPLY_PACK_50_PRICE",
        "APPLY_PACK_100_PRICE",
        "TRON_MONITOR_ENABLED",
        "TRONGRID_API_KEY",
        "TRON_API_BASE",
        "TRON_USDT_CONTRACT",
        "TRON_POLL_SECONDS",
        "TRON_MIN_CONFIRMATIONS",
    }
)


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


class StatsResponse(BaseModel):
    total_users: int
    total_orders: int
    total_codes: int
    total_applications: int


class Paginated(BaseModel):
    items: list[dict[str, Any]]
    page: int
    per_page: int
    total: int
    total_pages: int


class AddApplyCreditsBody(BaseModel):
    telegram_id: str = Field(..., min_length=1)
    count: int = Field(..., ge=1, le=100000)


class GenerateCodesBody(BaseModel):
    credits: int = Field(..., ge=1, le=100000, description="每张卡密可兑换的申请次数")
    count: int = Field(..., ge=1, le=500)


class BotConfigUpdate(BaseModel):
    TRC20_ADDRESS: Optional[str] = None
    OKPAY_ID: Optional[str] = None
    OKPAY_TOKEN: Optional[str] = None
    OKPAY_PAYED: Optional[str] = None
    OKPAY_RETURN_URL: Optional[str] = None
    BOT_CUSTOM_MENU_JSON: Optional[str] = None
    APPLY_PACK_1_PRICE: Optional[str] = None
    APPLY_PACK_10_PRICE: Optional[str] = None
    APPLY_PACK_50_PRICE: Optional[str] = None
    APPLY_PACK_100_PRICE: Optional[str] = None
    TRON_MONITOR_ENABLED: Optional[str] = None
    TRONGRID_API_KEY: Optional[str] = None
    TRON_API_BASE: Optional[str] = None
    TRON_USDT_CONTRACT: Optional[str] = None
    TRON_POLL_SECONDS: Optional[str] = None
    TRON_MIN_CONFIRMATIONS: Optional[str] = None


class CompleteOrderBody(BaseModel):
    order_id: str = Field(..., min_length=1)
    secret: str = Field(..., min_length=1)


def _serialize_row(row: dict[str, Any]) -> dict[str, Any]:
    out = {}
    for k, v in row.items():
        if hasattr(v, "isoformat"):
            out[k] = v.isoformat() if v is not None else None
        else:
            out[k] = v
    return out


def _paginate(total: int, page: int, per_page: int, rows: list) -> Paginated:
    total_pages = max(1, (total + per_page - 1) // per_page) if total else 1
    return Paginated(
        items=[_serialize_row(r) for r in rows],
        page=page,
        per_page=per_page,
        total=total,
        total_pages=total_pages,
    )


app = FastAPI(title="TG-API Admin", version="1.0.0")

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


@app.get("/api/v1/admin/stats", response_model=StatsResponse)
async def admin_stats(user: CurrentUser):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    s = db.admin_stats()
    return StatsResponse(**s)


@app.get("/api/v1/admin/tg-users", response_model=Paginated)
async def admin_tg_users(
    user: CurrentUser,
    page: int = Query(1, ge=1),
    per_page: int = Query(15, ge=1, le=100),
):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    total, rows = db.admin_list_tg_users(page, per_page)
    return _paginate(total, page, per_page, rows)


@app.post("/api/v1/admin/tg-users/add-apply-credits")
async def admin_add_apply_credits(user: CurrentUser, body: AddApplyCreditsBody):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    n = db.admin_add_apply_credits(body.telegram_id, body.count)
    if n == 0:
        raise HTTPException(status_code=404, detail="未找到该 Telegram 用户")
    return {"ok": True}


@app.post("/api/v1/payment/complete-order")
async def payment_complete_order(body: CompleteOrderBody):
    """支付回调：校验 secret 后将订单置为完成并发放申请次数。环境变量 ORDER_COMPLETE_SECRET。"""
    expected = os.getenv("ORDER_COMPLETE_SECRET", "").strip()
    if not expected or body.secret != expected:
        raise HTTPException(status_code=403, detail="Forbidden")
    if not db.fulfill_order(body.order_id.strip()):
        raise HTTPException(status_code=400, detail="订单无法完成（不存在、非待支付或无次数包）")
    return {"ok": True}


@app.get("/api/v1/admin/orders", response_model=Paginated)
async def admin_orders(
    user: CurrentUser,
    page: int = Query(1, ge=1),
    per_page: int = Query(15, ge=1, le=100),
):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    total, rows = db.admin_list_orders(page, per_page)
    return _paginate(total, page, per_page, rows)


@app.get("/api/v1/admin/codes", response_model=Paginated)
async def admin_codes(
    user: CurrentUser,
    page: int = Query(1, ge=1),
    per_page: int = Query(15, ge=1, le=100),
):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    total, rows = db.admin_list_codes(page, per_page)
    return _paginate(total, page, per_page, rows)


@app.post("/api/v1/admin/codes/generate")
async def admin_generate_codes(user: CurrentUser, body: GenerateCodesBody):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    db.admin_generate_codes(body.count, body.credits)
    return {"ok": True, "count": body.count, "credits": body.credits}


@app.get("/api/v1/admin/api-applications", response_model=Paginated)
async def admin_api_applications(
    user: CurrentUser,
    page: int = Query(1, ge=1),
    per_page: int = Query(15, ge=1, le=100),
):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    total, rows = db.admin_list_api_applications(page, per_page)
    return _paginate(total, page, per_page, rows)


@app.get("/api/v1/admin/bot-config")
async def admin_get_bot_config(user: CurrentUser):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    full = db.get_all_config()
    return {k: full.get(k, "") for k in sorted(ALLOWED_CONFIG_KEYS)}


def _validate_bot_custom_menu_json(raw: str) -> None:
    try:
        data = json.loads(raw.strip() or "[]")
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="BOT_CUSTOM_MENU_JSON 不是合法 JSON")
    if not isinstance(data, list):
        raise HTTPException(status_code=400, detail="BOT_CUSTOM_MENU_JSON 必须是数组")
    if len(data) > 6:
        raise HTTPException(status_code=400, detail="自定义菜单最多 6 条")
    for i, item in enumerate(data):
        if not isinstance(item, dict):
            raise HTTPException(status_code=400, detail=f"菜单项 #{i + 1} 必须是对象")
        text = str(item.get("text") or "").strip()
        url = str(item.get("url") or "").strip()
        if not text or not url:
            raise HTTPException(status_code=400, detail=f"菜单项 #{i + 1} 需同时填写 text 与 url")


@app.put("/api/v1/admin/bot-config")
async def admin_put_bot_config(user: CurrentUser, body: BotConfigUpdate):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    data = body.model_dump(exclude_unset=True)
    if "BOT_CUSTOM_MENU_JSON" in data and data["BOT_CUSTOM_MENU_JSON"] is not None:
        _validate_bot_custom_menu_json(data["BOT_CUSTOM_MENU_JSON"])
    for key, val in data.items():
        if key not in ALLOWED_CONFIG_KEYS:
            continue
        if val is not None:
            db.set_config(key, val)
    return await admin_get_bot_config(user)


@app.post("/api/v1/admin/trc20-qr")
async def admin_upload_trc20_qr(
    user: CurrentUser,
    file: UploadFile = File(...),
):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    ct = (file.content_type or "").lower()
    if not ct.startswith("image/"):
        raise HTTPException(status_code=400, detail="请上传图片文件")
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in TRC20_QR_EXTS:
        if "png" in ct:
            suffix = ".png"
        elif "jpeg" in ct or "jpg" in ct:
            suffix = ".jpg"
        elif "webp" in ct:
            suffix = ".webp"
        else:
            raise HTTPException(status_code=400, detail="仅支持 png / jpg / jpeg / webp")
    body = await file.read()
    if len(body) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="图片不得超过 5MB")
    ensure_data_dir()
    delete_all_trc20_qr()
    dest = os.path.join(DATA_DIR, TRC20_QR_PREFIX + suffix)
    with open(dest, "wb") as f:
        f.write(body)
    return {"ok": True}


@app.get("/api/v1/admin/trc20-qr")
async def admin_get_trc20_qr(user: CurrentUser):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    p = trc20_qr_image_path()
    if not p:
        raise HTTPException(status_code=404, detail="尚未上传二维码")
    media_type, _ = mimetypes.guess_type(p)
    return FileResponse(p, media_type=media_type or "application/octet-stream")


@app.delete("/api/v1/admin/trc20-qr")
async def admin_delete_trc20_qr(user: CurrentUser):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    delete_all_trc20_qr()
    return {"ok": True}


# Vite base 为 /static/ 时，打包后 JS/CSS 在 static/assets/，请求路径为 /static/assets/*
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
            "detail": "请先构建前端：cd admin && npm run build（产物输出到项目根目录 static/）",
        }
    return FileResponse(index)


@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    # 避免未匹配的 /api/... 被当成 SPA（具体接口已在上方注册）
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
