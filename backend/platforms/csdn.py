"""
CSDN 社区平台适配器
发布流程：Markdown 编辑器 → 发布文章 → 确认弹窗
"""
import asyncio
from playwright.async_api import Page
from .base import PlatformAdapter

EDITOR_URL = "https://editor.csdn.net/md/"
LOGIN_URL  = "https://passport.csdn.net/login"


class CSDNAdapter(PlatformAdapter):
    platform_id    = "csdn"
    platform_name  = "CSDN"
    char_limit     = 10000
    has_tags       = True
    supports_video = False
    _has_video     = False
    style_desc = (
        "技术博客风格，标题突出技术关键词，"
        "正文结构清晰有代码/案例，"
        "适合开发者阅读，语气专业"
    )
    publish_url = EDITOR_URL
    login_url   = LOGIN_URL

    async def navigate_to_editor(self, page: Page) -> None:
        import pathlib as _pl, datetime as _dt

        async def _shot(label: str):
            try:
                d = _pl.Path.home() / ".prism" / "debug"
                d.mkdir(parents=True, exist_ok=True)
                ts = _dt.datetime.now().strftime("%H%M%S")
                await page.screenshot(
                    path=str(d / f"csdn_{ts}_{label}.png"), full_page=False
                )
            except Exception:
                pass

        await page.goto(EDITOR_URL, wait_until="domcontentloaded", timeout=30000)
        try:
            await page.wait_for_load_state("load", timeout=15000)
        except Exception:
            pass
        await _shot("nav_loaded")

        # 检查是否跳转到登录页
        if "passport" in page.url or "login" in page.url:
            raise Exception("csdn_session_expired")

        # 等待编辑器加载（CodeMirror 或 Monaco）
        try:
            await page.wait_for_selector(
                '.CodeMirror, .monaco-editor, [class*="editor-content"], '
                'textarea[class*="editor"], div[class*="editor"]',
                timeout=20000,
            )
        except Exception:
            if "passport" in page.url or "login" in page.url:
                raise Exception("csdn_session_expired")
            raise Exception("csdn_editor_not_found: 编辑器未能在20秒内加载")
        await _shot("nav_editor_ready")

    async def fill_content(self, page: Page, title: str, body: str, tags: list, video_path: str = None) -> None:
        # ── 填写标题 ──────────────────────────────────────────
        title_input = None
        for sel in [
            'input[placeholder*="请输入文章标题"]',
            'input[class*="title"]',
            'input[id*="title"]',
            'input[type="text"]',
        ]:
            loc = page.locator(sel).first
            if await loc.count() > 0:
                try:
                    await loc.wait_for(state="visible", timeout=3000)
                    title_input = loc
                    break
                except Exception:
                    continue

        if title_input:
            await title_input.click()
            await title_input.fill(title)
            await asyncio.sleep(0.3)

        # ── 填写正文（Markdown 编辑器）────────────────────────
        # 优先使用 CodeMirror，回退到 Monaco，再回退到 contenteditable
        editor_filled = False

        # Strategy 1: CodeMirror — 通过 JS 设置内容
        cm_count = await page.locator(".CodeMirror").count()
        if cm_count > 0:
            try:
                escaped = body.replace("\\", "\\\\").replace("`", "\\`").replace("$", "\\$")
                await page.evaluate(f"""() => {{
                    const cm = document.querySelector('.CodeMirror').CodeMirror;
                    if (cm) {{ cm.setValue(`{escaped}`); }}
                }}""")
                await asyncio.sleep(0.5)
                editor_filled = True
            except Exception:
                pass

        # Strategy 2: Monaco Editor
        if not editor_filled:
            monaco_count = await page.locator(".monaco-editor").count()
            if monaco_count > 0:
                try:
                    await page.evaluate("""() => {
                        const model = window.monaco?.editor?.getModels?.()[0];
                        if (model) model.setValue('');
                    }""")
                    await asyncio.sleep(0.2)
                    editor_area = page.locator(".monaco-editor textarea").first
                    await editor_area.click()
                    await page.keyboard.press("Control+a")
                    await page.keyboard.type(body, delay=8)
                    await asyncio.sleep(0.5)
                    editor_filled = True
                except Exception:
                    pass

        # Strategy 3: contenteditable fallback
        if not editor_filled:
            editor = page.locator('[contenteditable="true"]').first
            if await editor.count() > 0:
                await editor.click()
                await page.keyboard.press("Control+a")
                await page.keyboard.type(body, delay=8)
                await asyncio.sleep(0.4)

        # ── 填写标签 ──────────────────────────────────────────
        if tags:
            tag_input = page.locator(
                'input[placeholder*="标签"], '
                'input[class*="tag"]'
            )
            if await tag_input.count() > 0:
                for tag in (tags or [])[:5]:
                    await tag_input.first.fill(tag.lstrip("#"))
                    await page.keyboard.press("Enter")
                    await asyncio.sleep(0.3)

    async def submit(self, page: Page, assist_fn=None, **kwargs) -> None:
        import pathlib as _pl, datetime as _dt

        async def _shot(label: str):
            try:
                d = _pl.Path.home() / ".prism" / "debug"
                d.mkdir(parents=True, exist_ok=True)
                ts = _dt.datetime.now().strftime("%H%M%S")
                await page.screenshot(
                    path=str(d / f"csdn_{ts}_{label}.png"), full_page=False
                )
            except Exception:
                pass

        await _shot("submit_before")

        # ── 点击发布按钮 ──────────────────────────────────────
        publish_btn = page.locator(
            'button:has-text("发布文章"), '
            'button:has-text("发布"), '
            '[class*="publish"]:has-text("发布")'
        ).first
        await publish_btn.wait_for(state="visible", timeout=10000)
        await publish_btn.click()
        await asyncio.sleep(0.8)

        # ── 处理确认弹窗（如有）──────────────────────────────
        confirm_btn = page.locator(
            'button:has-text("确定发布"), '
            'button:has-text("确认"), '
            'button:has-text("确定")'
        )
        if await confirm_btn.count() > 0:
            await confirm_btn.first.click()
            await asyncio.sleep(0.5)

        await _shot("submit_after_click")

        # ── 等待发布成功 ──────────────────────────────────────
        try:
            await page.wait_for_selector(
                'text=发布成功, [class*="success"], '
                '[class*="toast"]:has-text("成功"), '
                'text=文章发布成功',
                timeout=20000,
            )
        except Exception:
            # 部分情况下 URL 会变化表示成功
            if "blog" in page.url or "article" in page.url:
                return
            await _shot("submit_fail")
            raise Exception("CSDN 发布超时，未检测到成功提示")
