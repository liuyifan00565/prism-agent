"""
Auth router — JWT-based local authentication.
Depends on:  python-jose[cryptography]  bcrypt  (both in requirements.txt)
Falls back to sha256 + simple HMAC token if libs are missing.
"""
import os, hashlib, hmac, base64, json, time
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from auth.models import (
    find_by_email, find_by_id, create_user,
    update_platform_binding, public_user,
)

router   = APIRouter(prefix="/api/auth", tags=["auth"])
_bearer  = HTTPBearer(auto_error=False)

SECRET      = os.getenv("AUTH_SECRET", "prism-local-secret-key-2024")
EXPIRE_DAYS = 30


# ── Password helpers ──────────────────────────────────────────────────────────

try:
    import bcrypt as _bcrypt
    def hash_pw(password: str) -> str:
        return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()
    def verify_pw(password: str, hashed: str) -> bool:
        try:
            return _bcrypt.checkpw(password.encode(), hashed.encode())
        except Exception:
            return False
except ImportError:
    def hash_pw(password: str) -> str:
        return hashlib.sha256(password.encode()).hexdigest()
    def verify_pw(password: str, hashed: str) -> bool:
        return hashlib.sha256(password.encode()).hexdigest() == hashed


# ── JWT helpers ───────────────────────────────────────────────────────────────

try:
    from jose import jwt as _jose_jwt, JWTError as _JWTError
    _ALGORITHM = "HS256"

    def create_token(user_id: str) -> str:
        exp = datetime.utcnow() + timedelta(days=EXPIRE_DAYS)
        return _jose_jwt.encode({"sub": user_id, "exp": exp}, SECRET, algorithm=_ALGORITHM)

    def decode_token(token: str) -> Optional[str]:
        try:
            payload = _jose_jwt.decode(token, SECRET, algorithms=[_ALGORITHM])
            return payload.get("sub")
        except _JWTError:
            return None

except ImportError:
    # Minimal fallback: base64-url HMAC token  sub:expiry:sig
    def create_token(user_id: str) -> str:
        exp = int(time.time()) + EXPIRE_DAYS * 86400
        payload = f"{user_id}:{exp}"
        sig = hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()[:16]
        return base64.urlsafe_b64encode(f"{payload}:{sig}".encode()).decode().rstrip("=")

    def decode_token(token: str) -> Optional[str]:
        try:
            padded = token + "=" * (-len(token) % 4)
            raw = base64.urlsafe_b64decode(padded).decode()
            parts = raw.rsplit(":", 2)
            if len(parts) != 3:
                return None
            user_id, exp_str, sig = parts
            if int(exp_str) < time.time():
                return None
            payload = f"{user_id}:{exp_str}"
            expected = hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()[:16]
            if not hmac.compare_digest(sig, expected):
                return None
            return user_id
        except Exception:
            return None


# ── Auth dependency ───────────────────────────────────────────────────────────

def get_current_user_id(creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer)) -> str:
    if not creds:
        raise HTTPException(status_code=401, detail="未提供 Token")
    uid = decode_token(creds.credentials)
    if not uid:
        raise HTTPException(status_code=401, detail="Token 无效或已过期")
    return uid


def get_current_user(uid: str = Depends(get_current_user_id)) -> dict:
    user = find_by_id(uid)
    if not user:
        raise HTTPException(status_code=401, detail="用户不存在")
    return user


# ── Request / Response models ─────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    email:    str
    password: str

class LoginRequest(BaseModel):
    email:    str
    password: str


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/register")
async def register(req: RegisterRequest):
    if not req.username or not req.email or not req.password:
        raise HTTPException(status_code=400, detail="字段不完整")
    try:
        user = create_user(req.username, req.email, hash_pw(req.password))
    except ValueError as e:
        if "email_taken" in str(e):
            raise HTTPException(status_code=409, detail="该邮箱已被注册")
        raise HTTPException(status_code=400, detail=str(e))
    token = create_token(user["id"])
    return {"token": token, "user": public_user(user)}


@router.post("/login")
async def login(req: LoginRequest):
    user = find_by_email(req.email)
    if not user or not verify_pw(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")
    token = create_token(user["id"])
    return {"token": token, "user": public_user(user)}


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    return public_user(user)


@router.put("/platform/{platform}/bind")
async def bind_platform(platform: str, user: dict = Depends(get_current_user)):
    """
    触发 Playwright 登录窗口（复用 session/manager.py），
    登录成功后将 platform_bindings[platform].bound 置为 True。
    """
    from session.manager import save_session
    try:
        success = await save_session(platform)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"登录流程异常: {e}")
    if not success:
        raise HTTPException(status_code=400, detail="登录超时或用户取消")

    updated = update_platform_binding(user["id"], platform, bound=True, nickname=None)
    return {"ok": True, "user": public_user(updated)}


@router.put("/platform/{platform}/unbind")
async def unbind_platform(platform: str, user: dict = Depends(get_current_user)):
    """清除本地 Session，标记为未绑定。"""
    from pathlib import Path
    from session.manager import SESSION_DIR
    try:
        enc_file = SESSION_DIR / f"{platform}.enc"
        if enc_file.exists():
            enc_file.unlink()
    except Exception:
        pass
    updated = update_platform_binding(user["id"], platform, bound=False, nickname=None)
    return {"ok": True, "user": public_user(updated)}
