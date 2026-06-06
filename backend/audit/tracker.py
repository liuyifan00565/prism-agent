"""
审核状态追踪器
发布成功后，定时回访各平台检查内容是否通过审核。

各平台审核周期：
  小红书：通常 2-24 小时
  知乎：  通常 1-6 小时
  B站：   通常 1-72 小时
  公众号：通常 1-30 分钟
  CSDN：  通常 5-30 分钟
  微博：  通常实时或 1 小时内
  抖音：  通常 1-24 小时
"""
import asyncio, json
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Optional

AUDIT_FILE = Path.home() / ".prism" / "audit_tasks.json"

# 各平台审核成功的页面选择器
AUDIT_SUCCESS_SELECTORS = {
    "xiaohongshu": '[class*="status"]:has-text("已发布"), [class*="published"]',
    "zhihu":       '[class*="status"]:has-text("已发布")',
    "bilibili":    '[class*="status"]:has-text("已审核"), [class*="pass"]',
    "wechat":      '[class*="status"]:has-text("已群发")',
    "csdn":        '[class*="status"]:has-text("已发布"), [class*="article-status"]:has-text("通过")',
    "weibo":       '[class*="status"]:has-text("审核通过")',
    "douyin":      '[class*="status"]:has-text("已发布"), [class*="status"]:has-text("审核通过")',
}

# 审核失败选择器
AUDIT_FAIL_SELECTORS = {
    "xiaohongshu": '[class*="status"]:has-text("审核不通过")',
    "zhihu":       '[class*="status"]:has-text("审核不通过")',
    "bilibili":    '[class*="status"]:has-text("审核不通过")',
    "wechat":      '[class*="status"]:has-text("发布失败")',
    "csdn":        '[class*="status"]:has-text("审核不通过")',
    "weibo":       '[class*="status"]:has-text("审核不通过")',
    "douyin":      '[class*="status"]:has-text("审核不通过")',
}

# 各平台管理后台 URL（用于轮询时导航）
AUDIT_CHECK_URLS = {
    "xiaohongshu": "https://creator.xiaohongshu.com/publish/success",
    "zhihu":       "https://www.zhihu.com/creator/manage/creation/article",
    "bilibili":    "https://member.bilibili.com/platform/upload-manager/article",
    "wechat":      "https://mp.weixin.qq.com/cgi-bin/appmsgpublish",
    "csdn":        "https://mp.csdn.net/mp_blog/manage/article",
    "weibo":       "https://weibo.com/p/aj/mblog/mybloglist",
    "douyin":      "https://creator.douyin.com/creator-micro/content/manage",
}


# ── 持久化读写 ──────────────────────────────────────────────────────────────────

def _load() -> List[dict]:
    if not AUDIT_FILE.exists():
        return []
    try:
        return json.loads(AUDIT_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []


def _save(tasks: List[dict]):
    AUDIT_FILE.parent.mkdir(parents=True, exist_ok=True)
    AUDIT_FILE.write_text(
        json.dumps(tasks, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


# ── 公开 API ────────────────────────────────────────────────────────────────────

def add_audit_task(record_id: str, platform: str,
                   title: str = "", content_url: Optional[str] = None):
    """发布成功后注册审核追踪任务。"""
    tasks = _load()
    # 避免重复注册
    existing_ids = {t["id"] for t in tasks}
    task_id = f"{record_id}__{platform}"
    if task_id in existing_ids:
        return

    tasks.append({
        "id":           task_id,
        "record_id":    record_id,
        "platform":     platform,
        "title":        title[:60] if title else "",
        "content_url":  content_url,
        "status":       "pending",          # pending | approved | rejected | timeout
        "created_at":   datetime.now().isoformat(),
        "checked_at":   None,
        "next_check":   (datetime.now() + timedelta(minutes=30)).isoformat(),
        "check_count":  0,
        "max_checks":   10,
        "is_new_result": False,             # 是否有新的审核结果（用于红色角标）
    })
    _save(tasks)


def get_by_record(record_id: str) -> List[dict]:
    return [t for t in _load() if t["record_id"] == record_id]


def get_summary() -> dict:
    """返回各状态的任务列表，供前端通知面板使用。"""
    all_tasks = _load()
    return {
        "pending":  [t for t in all_tasks if t["status"] == "pending"],
        "approved": [t for t in all_tasks if t["status"] == "approved"],
        "rejected": [t for t in all_tasks if t["status"] == "rejected"],
        "timeout":  [t for t in all_tasks if t["status"] == "timeout"],
    }


def mark_results_seen(record_id: Optional[str] = None):
    """用户查看通知后，清除「新结果」标记。"""
    tasks = _load()
    for t in tasks:
        if record_id is None or t["record_id"] == record_id:
            t["is_new_result"] = False
    _save(tasks)


# ── 后台审核检查协程 ────────────────────────────────────────────────────────────

async def audit_loop():
    """
    后台协程，每 15 分钟检查一次待审核任务。
    使用独立 Playwright 实例，headless 模式，不影响主发布流程。
    """
    while True:
        await asyncio.sleep(900)   # 15 分钟
        try:
            await _run_checks()
        except Exception:
            pass   # 审核检查失败不影响主流程


async def _run_checks():
    """实际执行审核检查的函数。"""
    tasks = _load()
    now_iso = datetime.now().isoformat()
    changed = False

    pending = [
        t for t in tasks
        if t["status"] == "pending"
        and t.get("next_check", "") <= now_iso
        and t.get("check_count", 0) < t.get("max_checks", 10)
    ]

    if not pending:
        return

    try:
        from playwright.async_api import async_playwright
        from session.manager import load_session
    except ImportError:
        return

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)

        for task in pending:
            try:
                ctx  = await browser.new_context()
                await load_session(task["platform"], ctx)
                page = await ctx.new_page()

                url = task.get("content_url") or AUDIT_CHECK_URLS.get(task["platform"], "")
                if url:
                    await page.goto(url, wait_until="domcontentloaded", timeout=15000)
                    await asyncio.sleep(2)

                    success_sel = AUDIT_SUCCESS_SELECTORS.get(task["platform"], "")
                    fail_sel    = AUDIT_FAIL_SELECTORS.get(task["platform"],    "")

                    if success_sel and await page.locator(success_sel).count() > 0:
                        task["status"]       = "approved"
                        task["checked_at"]   = now_iso
                        task["is_new_result"] = True
                        changed = True
                    elif fail_sel and await page.locator(fail_sel).count() > 0:
                        task["status"]       = "rejected"
                        task["checked_at"]   = now_iso
                        task["is_new_result"] = True
                        changed = True

                await page.close()
                await ctx.close()

            except Exception:
                pass   # 单个任务失败不影响其他任务

            # 更新检查计数 & 退避时间（30min → 1h → 2h → 4h → 8h）
            task["check_count"] = task.get("check_count", 0) + 1
            if task["check_count"] >= task.get("max_checks", 10):
                if task["status"] == "pending":
                    task["status"] = "timeout"
                    changed = True
            else:
                delay_min = 30 * (2 ** min(task["check_count"], 4))
                task["next_check"] = (
                    datetime.now() + timedelta(minutes=delay_min)
                ).isoformat()

        await browser.close()

    if changed:
        _save(tasks)
