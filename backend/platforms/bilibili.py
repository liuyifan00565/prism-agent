import asyncio
from playwright.async_api import Page
from .base import PlatformAdapter

EDITOR_URL = "https://member.bilibili.com/platform/upload/text/edit"
LOGIN_URL  = "https://passport.bilibili.com/login"


class BilibiliAdapter(PlatformAdapter):
    platform_id   = "bilibili"
    platform_name = "B站专栏"
    char_limit    = 2000
    has_tags      = True
    style_desc    = "年轻活泼风格，可用梗和网络用语，适当加emoji，配合二次元文化氛围"
    publish_url   = EDITOR_URL

    async def navigate_to_editor(self, page: Page) -> None:
        import pathlib as _pl, datetime as _dt

        async def _shot(label: str):
            try:
                d = _pl.Path.home() / ".prism" / "debug"
                d.mkdir(parents=True, exist_ok=True)
                ts = _dt.datetime.now().strftime("%H%M%S")
                await page.screenshot(
                    path=str(d / f"bili_{ts}_{label}.png"), full_page=False
                )
            except Exception:
                pass

        # 有视频时使用视频投稿入口，否则使用图文专栏入口
        target_url = (
            "https://member.bilibili.com/platform/upload/video/frame"
            if self._has_video else EDITOR_URL
        )
        await page.goto(target_url, wait_until="domcontentloaded", timeout=30000)
        try:
            await page.wait_for_load_state("load", timeout=15000)
        except Exception:
            pass
        await _shot("nav_loaded")
        if "login" in page.url or "passport" in page.url:
            raise Exception("bilibili_session_expired")
        try:
            await page.wait_for_selector(
                '.ql-editor, [contenteditable="true"], input[placeholder*="标题"], '
                '[class*="editor"], [class*="upload"], input[type="text"]',
                timeout=20000,
            )
        except Exception:
            if "login" in page.url or "passport" in page.url:
                raise Exception("bilibili_session_expired")
            raise Exception("bilibili_editor_not_found: 编辑器未能在20秒内加载，请检查网络或页面结构")
        await _shot("nav_editor_ready")

    supports_video = True

    async def fill_content(self, page: Page, title: str, body: str, tags: list, video_path: str = None) -> None:
        import pathlib as _pl, datetime as _dt

        # ── 视频上传（如有）───────────────────────────────────
        if video_path and self._has_video:
            # B站视频投稿入口与图文不同，navigate_to_editor 已根据 _has_video 跳转
            uploaded = await self.upload_video(page, video_path)
            if uploaded:
                # 等待上传进度完成（最多5分钟）
                try:
                    await page.wait_for_selector(
                        '[class*="upload-progress"][style*="100%"], '
                        '[class*="upload-success"], '
                        '[class*="cover-upload"]',
                        timeout=300000,
                    )
                    await asyncio.sleep(2)
                except Exception:
                    pass  # 继续填写其他字段

        # 探测页面可见输入元素（调试）
        try:
            debug_els = await page.evaluate("""() =>
                Array.from(document.querySelectorAll(
                    'input, textarea, [contenteditable="true"]'
                )).filter(el => el.offsetWidth > 0)
                .slice(0, 10).map(el => ({
                    tag: el.tagName, ph: el.placeholder || el.getAttribute('data-placeholder') || '',
                    cls: el.className.slice(0, 60), id: el.id
                }))
            """)
        except Exception:
            debug_els = []

        # Find title input with multiple strategies
        title_input = None
        for sel in [
            'input[placeholder*="标题"]',
            'input[placeholder*="title"]',
            '.title-input',
            'input[class*="title"]',
            'input[class*="Title"]',
            'input[type="text"]',   # fallback: first text input
        ]:
            try:
                loc = page.locator(sel).first
                if await loc.count() > 0:
                    await loc.wait_for(state="visible", timeout=3000)
                    title_input = loc
                    break
            except Exception:
                continue

        if title_input is None:
            raise Exception(
                f"B站找不到标题输入框。可见元素={debug_els} URL={page.url}"
            )

        # ── Click title input with fallback strategies ─────────────────────
        # The element may be temporarily covered by an overlay/animation after
        # page load, so we: scroll it into view, wait briefly, try force-click,
        # and fall back to a JS click if Playwright still can't reach it.
        await title_input.scroll_into_view_if_needed()
        await asyncio.sleep(0.8)   # let page settle / overlays dismiss

        clicked = False
        try:
            await title_input.click(timeout=8000)
            clicked = True
        except Exception:
            pass

        if not clicked:
            # force=True bypasses Playwright's actionability checks
            try:
                await title_input.click(force=True, timeout=5000)
                clicked = True
            except Exception:
                pass

        if not clicked:
            # Last resort: JS click directly on the DOM element
            try:
                await page.evaluate("""(sel) => {
                    const el = document.querySelector(sel);
                    if (el) { el.focus(); el.click(); }
                }""", 'input[placeholder*="标题"], input[class*="title"], input[type="text"]')
                await asyncio.sleep(0.3)
            except Exception:
                pass

        await title_input.fill("")
        await page.keyboard.type(title, delay=30)
        await asyncio.sleep(0.3)

        # Fill body (Quill editor)
        editor = page.locator('.ql-editor, [contenteditable="true"]').first
        await editor.click()
        await asyncio.sleep(0.2)
        await page.keyboard.press("Control+a")
        await page.keyboard.press("Delete")
        await page.keyboard.type(body, delay=12)
        await asyncio.sleep(0.4)

        # Add tags/categories
        for tag in (tags or [])[:5]:
            tag_input = page.locator(
                'input[placeholder*="标签"], '
                'input[placeholder*="分类"]'
            )
            if await tag_input.count() > 0:
                await tag_input.first.fill(tag.lstrip("#"))
                await page.keyboard.press("Enter")
                await asyncio.sleep(0.3)

    async def submit(self, page: Page, assist_fn=None, **kwargs) -> None:
        publish_btn = page.locator(
            'button:has-text("发布文章"), '
            'button:has-text("提交"), '
            'button:has-text("发布")'
        ).first
        await publish_btn.wait_for(state="visible", timeout=5000)
        await publish_btn.click()
        await asyncio.sleep(0.5)

        # Confirm dialog if present
        confirm_btn = page.locator('button:has-text("确定"), button:has-text("确认发布")')
        if await confirm_btn.count() > 0:
            await confirm_btn.first.click()

        # 主检测：轮询 URL 是否离开编辑器（最多 25 秒）
        url_before = page.url
        publish_done = False

        for _ in range(50):
            await asyncio.sleep(0.5)
            cur = page.url
            if (cur != url_before
                    and "edit" not in cur
                    and "upload" not in cur
                    and "login" not in cur):
                print(f"[bilibili] ✓ 发布后已跳转至 {cur}", flush=True)
                publish_done = True
                break
            try:
                found = await page.locator(
                    '[class*="success"], '
                    '[class*="toast"]:has-text("成功"), '
                    '[class*="toast"]:has-text("发布")'
                ).first.is_visible()
                if found:
                    publish_done = True
                    break
            except Exception:
                pass

        if not publish_done:
            try:
                has_text = await page.evaluate("""() => {
                    const t = document.body.innerText || '';
                    return t.includes('发布成功') || t.includes('已发布') || t.includes('审核中');
                }""")
                if has_text:
                    publish_done = True
            except Exception:
                pass

        if not publish_done:
            raise Exception("发布后 25 秒内未检测到跳转或成功提示，请手动确认")
