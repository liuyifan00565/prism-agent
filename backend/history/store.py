"""
发布历史本地存储
数据保存在 ~/.prism/history.json
最多保留 200 条记录
"""
import json
from pathlib import Path
from typing import List, Optional
from .models import PublishRecord

HISTORY_FILE = Path.home() / ".prism" / "history.json"
MAX_RECORDS  = 200


def _load_all() -> List[dict]:
    if not HISTORY_FILE.exists():
        return []
    try:
        return json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []


def _save_all(records: List[dict]):
    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    HISTORY_FILE.write_text(
        json.dumps(records, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def save_record(record: PublishRecord):
    records = _load_all()
    records.insert(0, record.to_dict())
    _save_all(records[:MAX_RECORDS])


def get_all(limit: int = 50, offset: int = 0) -> List[dict]:
    return _load_all()[offset: offset + limit]


def get_by_id(record_id: str) -> Optional[dict]:
    return next((r for r in _load_all() if r["id"] == record_id), None)


def get_stats() -> dict:
    records = _load_all()
    if not records:
        return {
            "total_publishes": 0,
            "total_success":   0,
            "success_rate":    0,
            "platform_counts": {},
            "recent_7_days":   0,
        }

    from datetime import datetime, timedelta
    week_ago = (datetime.now() - timedelta(days=7)).isoformat()

    platform_counts: dict = {}
    total_success   = 0
    total_attempts  = 0
    recent          = 0

    for r in records:
        if r.get("created_at", "") > week_ago:
            recent += 1
        for pid, res in r.get("platform_results", {}).items():
            platform_counts[pid] = platform_counts.get(pid, 0) + 1
            total_attempts += 1
            if res.get("status") == "success":
                total_success += 1

    return {
        "total_publishes": len(records),
        "total_success":   total_success,
        "success_rate":    round(total_success / total_attempts * 100, 1)
                           if total_attempts > 0 else 0,
        "platform_counts": platform_counts,
        "recent_7_days":   recent,
    }


def delete_record(record_id: str) -> bool:
    records = _load_all()
    new_records = [r for r in records if r["id"] != record_id]
    if len(new_records) == len(records):
        return False
    _save_all(new_records)
    return True
