"""
发布执行节点（实时步骤版 + 重试机制）
浏览器启动 → 登录检测 → 导航 → 内容填写 → 立即发布 → 成功截图存证
"""
import asyncio, base64, sys
from datetime import datetime
from playwright.async_api import async_playwright
from session.manager import ensure_logged_in
from platforms.registry import PLATFORM_REGISTRY
from agent.state import AgentState
from utils.retry import retry_async, RetryExhausted

# ── Global browser instance (reuse across tasks) ──────────────────────────────
_browser = None
_playwright_instance = None

# ── Human-in-the-loop assist registry ─────────────────────────────────────────
# Keyed by task_id.  executor creates the Event; main.py's /api/assist-resume sets it.
_assist_events:  dict = {}   # task_id -> asyncio.Event
_assist_actions: dict = {}   # task_id -> str (action chosen by user, default "continue")


async def get_browser():
    global _browser, _playwright_instance
    if _browser is None or not _browser.is_connected():
        _playwright_instance = await async_playwright().start()
        _browser = await _playwright_instance.chromium.launch(
            headless=False,
            slow_mo=300,
            args=["--start-maximized"],
        )
    return _browser


async def _publish_one(adapter, page, title: str, body: str, tags: list,
                       assist_fn=None, video_path=None):
    """
    Full publish attempt: navigate → fill → submit.
    Used only when a retry needs to restart from scratch (e.g. page navigated away).
    """
    await adapter.navigate_to_editor(page)
    await adapter.fill_content(page, title, body, tags, video_path=video_path)
    await adapter.submit(page, assist_fn=assist_fn, body=body, title=title, tags=tags)


async def _submit_only(adapter, page, title: str, body: str, tags: list, assist_fn=None):
    """
    Submit-only attempt: content is already on the page, just click publish.
    Used for normal retries so we don't re-navigate and re-fill each time.
    """
    await adapter.submit(page, assist_fn=assist_fn, body=body, title=title, tags=tags)


def _make_assist_fn(task_id: str, platform: str, result: dict, state: dict, page=None):
    """
    Returns an async callable that pauses execution until the user responds
    via POST /api/assist-resume, a page click is detected, or a 5-minute
    timeout elapses.

    Signature: async assist_fn(message: str, screenshot_b64: str = "") -> str
    Returns the user's action string ("continue" by default).

    If `page` (a Playwright Page) is supplied, a concurrent task monitors
    the page for any mouse click.  The first click auto-resumes execution
    without requiring the user to press the frontend button.
    """
    async def assist_fn(message: str, screenshot_b64: str = "") -> str:
        # ── Set up the event the HTTP handler will fire ────────
        event = asyncio.Event()
        _assist_events[task_id]  = event
        _assist_actions[task_id] = "continue"   # default if user times out

        # ── Update result so the frontend poll sees the pause ──
        result["status"]           = "awaiting_assist"
        result["assist_message"]   = message
        if screenshot_b64:
            result["assist_screenshot"] = screenshot_b64
        state["execution_log"].append(
            f"[{platform}] ⏸ 等待用户操作: {message[:60]}"
        )

        # ── Optional: monitor the Playwright page for clicks ───
        page_monitor_task = None
        if page is not None:
            async def _monitor_page_clicks():
                # Inject a one-shot click listener into the browser page.
                # The flag is reset at injection time so stale values don't
                # trigger a false positive.
                try:
                    await page.evaluate("""() => {
                        window.__prismClickMonitor = false;
                        document.addEventListener('click', function _prismOnce() {
                            window.__prismClickMonitor = true;
                            document.removeEventListener('click', _prismOnce, true);
                        }, {capture: true});
                    }""")
                except Exception:
                    return

                # Poll every 500 ms; bail out if the event is already set
                # (fired by the HTTP endpoint) or the page errors.
                for _ in range(600):           # max 5 min
                    if event.is_set():
                        return
                    await asyncio.sleep(0.5)
                    try:
                        clicked = await page.evaluate(
                            "() => window.__prismClickMonitor || false"
                        )
                        if clicked:
                            state["execution_log"].append(
                                f"[{platform}] 检测到用户点击页面，自动继续 ✓"
                            )
                            _assist_actions[task_id] = "user_helped"
                            event.set()
                            return
                    except Exception:
                        return   # page navigated away or closed — stop polling

            page_monitor_task = asyncio.create_task(_monitor_page_clicks())

        # ── Wait (with generous timeout so users have time) ────
        try:
            await asyncio.wait_for(event.wait(), timeout=300.0)   # 5 min
        except asyncio.TimeoutError:
            state["execution_log"].append(
                f"[{platform}] 等待超时 (5 min)，自动继续"
            )
        finally:
            # Always cancel the click-monitor task, whether we timed out,
            # the event fired, or an error propagated.
            if page_monitor_task is not None:
                page_monitor_task.cancel()
                try:
                    await page_monitor_task
                except (asyncio.CancelledError, Exception):
                    pass

        # ── Clean up and restore active status ─────────────────
        _assist_events.pop(task_id, None)
        action = _assist_actions.pop(task_id, "continue")

        result["status"] = "publishing"
        result.pop("assist_message",    None)
        result.pop("assist_screenshot", None)
        state["execution_log"].append(
            f"[{platform}] ▶ 继续执行 (操作={action})"
        )
        return action

    return assist_fn


# ── Main execution entry point ────────────────────────────────────────────────

async def run(state: AgentState, platform: str, task_id: str = "") -> AgentState:
    adapter = PLATFORM_REGISTRY.get(platform)
    if not adapter:
        state["execution_log"].append(f"[{platform}] 未找到适配器，跳过")
        return state

    result = state["adapted_results"][platform]
    title  = result.get("adapted_title", "")
    body   = result.get("adapted_body",  "")
    tags   = result.get("tags", [])

    # Initialise retry counters
    result.setdefault("retry_count",   0)
    result.setdefault("last_retry_at", None)

    # If user accepted an auto-fix, use the fixed text
    compliance = state.get("compliance_summary", {}).get(platform, {})
    if compliance.get("auto_fixed_text") and compliance.get("passed"):
        body = compliance["auto_fixed_text"]

    browser = await get_browser()
    context = await browser.new_context(viewport={"width": 1280, "height": 800})
    page    = await context.new_page()

    try:
        # ── Step 1: Ensure logged in ──────────────────────────
        result["status"] = "logging_in"
        state["execution_log"].append(f"[{platform}] 检查登录状态...")

        logged_in = await ensure_logged_in(
            platform=platform,
            context=context,
            page=page,
            status_callback=lambda msg: state["execution_log"].append(
                f"[{platform}] {msg}"
            ),
        )

        if not logged_in:
            raise Exception("登录超时或用户取消")

        state["execution_log"].append(f"[{platform}] 登录成功 ✓")

        # ── Step 2: Configure video context on adapter ────────
        video_path = None
        if state.get("has_video") and getattr(adapter, "supports_video", False):
            video_path = state.get("video_path")
            adapter._has_video = True
            state["execution_log"].append(f"[{platform}] 检测到视频，将使用视频发布流程")
        else:
            adapter._has_video = False

        # ── Step 3: Navigate to editor (for preview) ──────────
        result["status"] = "navigating"
        state["execution_log"].append(f"[{platform}] 打开发布编辑器...")
        await adapter.navigate_to_editor(page)

        # ── Step 4: Fill content (for preview) ───────────────
        result["status"] = "filling"
        state["execution_log"].append(f"[{platform}] 填写内容中...")
        await adapter.fill_content(page, title, body, tags, video_path=video_path)

        # ── Step 4: Save preview screenshot ───────────────────
        screenshot = await page.screenshot(full_page=False)
        result["preview_screenshot"] = base64.b64encode(screenshot).decode()
        state["execution_log"].append(f"[{platform}] 内容填写完成，准备发布...")

        # ── Step 5: Publish with retry (navigate+fill+submit) ─
        result["status"] = "publishing"
        state["execution_log"].append(f"[{platform}] 开始发布...")

        # Build the human-in-the-loop assist callback for this task/platform.
        # Pass `page` so the assist_fn can auto-resume on browser clicks.
        assist_fn = _make_assist_fn(task_id, platform, result, state, page=page)

        async def on_retry(attempt: int, error: Exception, delay: float):
            result["status"]        = "retrying"
            result["retry_count"]   = attempt
            result["last_retry_at"] = datetime.now().isoformat()
            state["execution_log"].append(
                f"[{platform}] 第{attempt}次重试，等待{delay:.0f}秒... "
                f"(原因: {str(error)[:50]})"
            )

        await retry_async(
            _submit_only,           # 内容已填好，只重试提交步骤
            adapter, page, title, body, tags,
            assist_fn=assist_fn,    # 传递给 submit，决策点可暂停等用户操作
            max_attempts=3,
            base_delay=5.0,
            backoff=2.0,
            on_retry=on_retry,
        )

        # ── Step 7: Success screenshot for evidence ───────────
        final_shot = await page.screenshot(full_page=False)
        result["success_screenshot"] = base64.b64encode(final_shot).decode()
        result["status"] = "success"
        state["execution_log"].append(f"[{platform}] 发布成功 ✓")

    except RetryExhausted as e:
        result["status"] = "failed"
        result["error"]  = f"重试{e.attempts}次后失败: {e.last_error}"
        state["execution_log"].append(
            f"[{platform}] 重试耗尽，最终失败: {e.last_error}"
        )
        try:
            err_shot = await page.screenshot(full_page=False)
            result["error_screenshot"] = base64.b64encode(err_shot).decode()
        except Exception:
            pass

    except Exception as e:
        result["status"] = "failed"
        result["error"]  = str(e)
        state["execution_log"].append(f"[{platform}] 失败: {e}")
        try:
            err_shot = await page.screenshot(full_page=False)
            result["error_screenshot"] = base64.b64encode(err_shot).decode()
        except Exception:
            pass

    finally:
        await context.close()

    return state
