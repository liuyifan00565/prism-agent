"""
定时任务管理器
asyncio 轻量级定时队列，每 30 秒扫描一次。
任务持久化到 ~/.prism/scheduled_tasks.json
"""
import asyncio, json, uuid
from pathlib import Path
from datetime import datetime
from typing import List, Optional

TASKS_FILE = Path.home() / ".prism" / "scheduled_tasks.json"


def _load() -> List[dict]:
    if not TASKS_FILE.exists():
        return []
    try:
        return json.loads(TASKS_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []


def _save(tasks: List[dict]):
    TASKS_FILE.parent.mkdir(parents=True, exist_ok=True)
    TASKS_FILE.write_text(
        json.dumps(tasks, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def add_task(
    title: str,
    body: str,
    platforms: List[str],
    scheduled_at: str,
) -> dict:
    """scheduled_at: ISO 格式，如 '2025-08-01T14:30:00'"""
    task = {
        "id":           str(uuid.uuid4()),
        "title":        title,
        "body":         body,
        "platforms":    platforms,
        "scheduled_at": scheduled_at,
        "status":       "pending",   # pending | running | done | failed | cancelled
        "created_at":   datetime.now().isoformat(),
        "result":       None,
    }
    tasks = _load()
    tasks.append(task)
    _save(tasks)
    return task


def get_tasks(status: Optional[str] = None) -> List[dict]:
    tasks = _load()
    if status:
        return [t for t in tasks if t["status"] == status]
    return tasks


def update_task(task_id: str, **kwargs) -> bool:
    tasks = _load()
    for t in tasks:
        if t["id"] == task_id:
            t.update(kwargs)
            _save(tasks)
            return True
    return False


def cancel_task(task_id: str) -> bool:
    return update_task(task_id, status="cancelled")


async def scheduler_loop(app_tasks: dict):
    """
    Background coroutine — scan for due tasks every 30 s.
    Launched in FastAPI startup event; app_tasks is the shared tasks dict.
    """
    # Import inside function to avoid circular imports at module load time
    from agent.graph import graph

    while True:
        await asyncio.sleep(30)
        now     = datetime.now().isoformat()
        pending = [
            t for t in _load()
            if t["status"] == "pending" and t["scheduled_at"] <= now
        ]

        for task in pending:
            update_task(task["id"], status="running")
            try:
                task_id = task["id"]
                state = {
                    "audio_path":          None,
                    "raw_text":            f"标题：{task['title']}\n正文：{task['body']}",
                    "original_title":      task["title"],
                    "original_body":       task["body"],
                    "target_platforms":    task["platforms"],
                    "intent":              "publish",
                    "needs_confirm":       False,
                    "confirmed":           True,   # auto-confirm for scheduled tasks
                    "adapted_results":     {},
                    "compliance_summary":  {},
                    "has_blocking_issues": False,
                    "execution_log":       [],
                    "final_summary":       None,
                    "abort":               False,
                    "skip_blocked":        True,
                    "current_platform":    None,
                }
                config = {"configurable": {"thread_id": task_id}}
                app_tasks[task_id] = {
                    "state": state, "config": config, "status": "running",
                }
                async for chunk in graph.astream(state, config):
                    app_tasks[task_id]["state"].update(
                        list(chunk.values())[-1]
                    )
                update_task(task["id"], status="done",   result={"task_id": task_id})
                app_tasks[task_id]["status"] = "done"
            except Exception as e:
                update_task(task["id"], status="failed", result={"error": str(e)})
