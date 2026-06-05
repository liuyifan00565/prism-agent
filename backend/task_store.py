"""
任务持久化 — 将 tasks 字典序列化为 JSON 文件保存到 ~/.prism/tasks.json
每次后端启动时自动加载，中断的发布任务自动回退到可重试状态。
"""
import json
from pathlib import Path

TASKS_FILE    = Path.home() / ".prism" / "tasks.json"

# 正在进行中的平台状态（后端重启后这些状态对应的浏览器会话已死）
_ACTIVE_PUB   = {"logging_in", "navigating", "filling", "publishing", "retrying"}
# 终态（不需要重置）
_TERMINAL     = {"success", "failed", "blocked"}


def _to_json(obj):
    """递归转换为 JSON 安全类型，跳过无法序列化的对象。"""
    if isinstance(obj, dict):
        return {k: _to_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_to_json(v) for v in obj]
    if isinstance(obj, (str, int, float, bool)) or obj is None:
        return obj
    return str(obj)  # 兜底：转字符串


def save_tasks(tasks: dict) -> None:
    """将当前内存中的 tasks 快照写到磁盘。"""
    TASKS_FILE.parent.mkdir(parents=True, exist_ok=True)
    snapshot: dict = {}
    for tid, t in tasks.items():
        try:
            snapshot[tid] = {
                "state":  _to_json(t.get("state",  {})),
                "config": _to_json(t.get("config", {})),
                "status": t.get("status", "unknown"),
            }
        except Exception as e:
            print(f"[task_store] 跳过任务 {tid}（序列化失败: {e}）")
    try:
        with open(TASKS_FILE, "w", encoding="utf-8") as f:
            json.dump(snapshot, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[task_store] 写盘失败: {e}")


def load_tasks() -> dict:
    """从磁盘加载任务，并修复中断任务的状态。"""
    if not TASKS_FILE.exists():
        return {}
    try:
        with open(TASKS_FILE, "r", encoding="utf-8") as f:
            data: dict = json.load(f)
    except Exception as e:
        print(f"[task_store] 读取失败（忽略，使用空任务表）: {e}")
        return {}

    tasks: dict = {}
    for tid, t in data.items():
        status = t.get("status", "unknown")
        state  = t.get("state",  {})

        # ── 修复中断的平台状态 ───────────────────────────────
        needs_restart_note = False
        for result in state.get("adapted_results", {}).values():
            if (result or {}).get("status") in _ACTIVE_PUB:
                # 浏览器会话已断开，重置为 confirmed 让用户重新触发
                result["status"] = "confirmed"
                needs_restart_note = True

        if status == "running":
            status = "awaiting_confirm"
            needs_restart_note = True

        if needs_restart_note:
            state.setdefault("execution_log", []).append(
                "[系统] 后端已重启，浏览器会话已断开，可点击「直接发布」重新发起"
            )

        tasks[tid] = {
            "state":  state,
            "config": t.get("config", {}),
            "status": status,
        }

    print(f"[task_store] 已加载 {len(tasks)} 个历史任务")
    return tasks
