"""
本地用户存储 — 以 ~/.prism/users.json 作为数据文件。
无需数据库，适合本地单机 / 小团队使用。
"""
import json, uuid
from pathlib import Path
from datetime import datetime

DATA_FILE = Path.home() / ".prism" / "users.json"

_DEFAULT_BINDINGS = {
    "xiaohongshu": {"bound": False, "nickname": None},
    "zhihu":       {"bound": False, "nickname": None},
    "wechat":      {"bound": False, "nickname": None},
    "bilibili":    {"bound": False, "nickname": None},
}


def _load() -> list:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not DATA_FILE.exists():
        DATA_FILE.write_text("[]", encoding="utf-8")
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def _save(users: list) -> None:
    DATA_FILE.write_text(
        json.dumps(users, indent=2, ensure_ascii=False), encoding="utf-8"
    )


def find_by_email(email: str):
    for u in _load():
        if u.get("email") == email:
            return u
    return None


def find_by_id(uid: str):
    for u in _load():
        if u.get("id") == uid:
            return u
    return None


def create_user(username: str, email: str, password_hash: str) -> dict:
    users = _load()
    # Guard duplicate email
    if any(u.get("email") == email for u in users):
        raise ValueError("email_taken")
    user = {
        "id": str(uuid.uuid4()),
        "username": username,
        "email": email,
        "password_hash": password_hash,
        "created_at": datetime.now().isoformat(),
        "platform_bindings": {k: dict(v) for k, v in _DEFAULT_BINDINGS.items()},
    }
    users.append(user)
    _save(users)
    return user


def update_platform_binding(uid: str, platform: str, bound: bool, nickname: str = None) -> dict:
    users = _load()
    for i, u in enumerate(users):
        if u["id"] == uid:
            u.setdefault("platform_bindings", {k: dict(v) for k, v in _DEFAULT_BINDINGS.items()})
            u["platform_bindings"][platform] = {"bound": bound, "nickname": nickname}
            _save(users)
            return u
    raise KeyError("user_not_found")


def public_user(user: dict) -> dict:
    """Strip password_hash before returning to frontend."""
    return {k: v for k, v in user.items() if k != "password_hash"}
