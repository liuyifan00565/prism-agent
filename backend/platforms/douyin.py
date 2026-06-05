"""
抖音图文平台适配器
发布流程：creator.douyin.com → 选图文 Tab → 填写内容 → 发布
"""
import asyncio
from playwright.async_api import Page
from .base import PlatformAdapter

UPLOAD_URL = "https://creator.douyin.com/creator-micro/content/upload"
LOGIN_URL  = "https://www.douyin.com"


class DouyinAdapter(PlatformAdapter):
    platform_id    = "douyin"
    platform_name  = "抖音图文"
    char_limit     = 2200
    has_tags       = True
    supports_video = True
    _has_video     = False
    style_desc = (
        "抖音图文风格：短句为主，节奏感强，"
        "前3行必须吸引眼球，多用数字和悬念，"
        "话题标签3-5个，字数1000字以内"
    )
    publish_url = UPLOAD_URL
    login_url   = LOGIN_URL

    async def navigate_to_editor(self, page: Page) -> None:
        import pathlib as _pl, datetime as _dt

        async def _shot(label: str):
            try:
                d = _pl.Path.home() / ".prism" / "debug"
                d.mkdir(parents=True, exist_ok=True)
                ts = _dt.datetime.now().strftime("%H%M%S")
                await page.screenshot(
                    path=str(d / f"douyin_{ts}_{label}.png"), full_page=False
                )
            except Exception:
                pass

        await page.goto(UPLOAD_URL, wait_until="domcontentloaded", timeout=30000)
        try:
            await page.wait_for_load_state("load", timeout=15000)
        except Exception:
            pass
        await asyncio.sleep(1)
        await _shot("nav_loaded")

        # 检查登录状态
        if "login" in page.url or "passport" in page.url:
            raise Exception("douyin_session_expired")

        # 尝试切换到「图文」Tab（如果页面上有的话）
        # 视频模式选择视频 Tab，图文模式选择图文 Tab
        if self._has_video:
            video_tab_sels = [
                'text=上传视频',
                '[class*="tab"]:has-text("视频")',
                '[class*="upload-video"]',
                'li:has-text("视频")',
            ]
            for tab_sel in video_tab_sels:
                tab = page.locator(tab_sel).first
                if await tab.count() > 0:
                    try:
                        await tab.wait_for(state="visible", timeout=3000)
                        await tab.click()
                        await asyncio.sleep(0.8)
                        break
                    except Exception:
                        continue
        else:
            for tab_sel in [
                'text=图文',
                '[class*="tab"]:has-text("图文")',
                '[class*="image-text"]',
                'li:has-text("图文")',
            ]:
                tab = page.locator(tab_sel).first
                if await tab.count() > 0:
                    try:
                        await tab.wait_for(state="visible", timeout=3000)
                        await tab.click()
                        await asyncio.sleep(0.8)
                        break
                    except Exception:
                        continue

        # 等待编辑区加载
        try:
            await page.wait_for_selector(
                '[contenteditable="true"], '
                'textarea[placeholder*="添加正文"], '
                'textarea[placeholder*="描述"], '
                '[class*="editor"]',
                timeout=20000,
            )
        except Exception:
            if "login" in page.url or "passport" in page.url:
                raise Exception("douyin_session_expired")
            raise Exception("douyin_editor_not_found: 编辑器未能在20秒内加载")

        await _shot("nav_editor_ready")

    async def fill_content(self, page: Page, title: str, body: str, tags: list, video_path: str = None) -> None:
        # ── 视频上传（如有）───────────────────────────────────
        if video_path and self._has_video:
            uploaded = await self.upload_video(page, video_path)
            if uploaded:
                # 等待视频处理完成
                try:
                    await page.wait_for_selector(
                        '[class*="upload-success"], '
                        '[class*="video-ready"], '
                        '[class*="upload-done"]',
                        timeout=300000,
                    )
                    await asyncio.sleep(2)
                except Exception:
                    pass

        # ── 填写标题 ──────────────────────────────────────────
        title_input = None
        for sel in [
            'input[placeholder*="标题"]',
            'input[class*="title"]',
            'input[id*="title"]',
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
            await title_input.fill(title)
            await asyncio.sleep(0.3)

        # ── 填写正文 ──────────────────────────────────────────
        editor = page.locator(
            '[contenteditable="true"], '
            'textarea[placeholder*="添加正文"], '
            'textarea[placeholder*="描述"]'
        ).first
        await editor.click()
        await asyncio.sleep(0.2)
        await page.keyboard.press("Control+a")
        await page.keyboard.type(body[:2000], delay=10)
        await asyncio.sleep(0.5)

        # ── 添加话题标签 ──────────────────────────────────────
        # 方法1：通过编辑区直接输入 # 触发话题搜索
        for tag in (tags or [])[:5]:
            clean_tag = tag.lstrip("#").strip()
            if not clean_tag:
                continue
            # 尝试点击话题按钮（工具栏）
            hashtag_btn = page.locator(
                'button[title*="话题"], '
                '[class*="hashtag"], '
                '[class*="topic"]'
            ).first
            if await hashtag_btn.count() > 0:
                try:
                    await hashtag_btn.click()
                    await asyncio.sleep(0.4)
                    search = page.locator('input[placeholder*="搜索话题"]').first
                    if await search.count() > 0:
                        await search.fill(clean_tag)
                        await asyncio.sleep(0.8)
                        first_item = page.locator(
                            '[class*="topic-item"], '
                            '[class*="suggestion"], '
                            '[class*="list-item"]'
                        ).first
                        if await first_item.count() > 0:
                            await first_item.click()
                            await asyncio.sleep(0.3)
                            continue
                except Exception:
                    pass
            # 回退：直接在正文末尾追加 #tag
            try:
                await editor.click()
                await page.keyboard.press("End")
                await page.keyboard.type(f" #{clean_tag}", delay=10)
                await asyncio.sleep(0.2)
            except Exception:
                pass

    async def submit(self, page: Page, assist_fn=None, **kwargs) -> None:
        import pathlib as _pl, datetime as _dt

        async def _shot(label: str):
            try:
                d = _pl.Path.home() / ".prism" / "debug"
                d.mkdir(parents=True, exist_ok=True)
                ts = _dt.datetime.now().strftime("%H%M%S")
                await page.screenshot(
                    path=str(d / f"douyin_{ts}_{label}.png"), full_page=False
                )
            except Exception:
                pass

        await _shot("submit_before")

        # ── 发布按钮 ──────────────────────────────────────────
        publish_btn = page.locator(
            'button:has-text("发布"), '
            'button[class*="publish"]:not([disabled]), '
            'button:has-text("立即发布")'
        ).first
        try:
            await publish_btn.wait_for(state="visible", timeout=10000)
        except Exception:
            await _shot("submit_btn_not_found")
            raise Exception("抖音发布按钮未找到")

        await publish_btn.scroll_into_view_if_needed()
        await asyncio.sleep(0.3)
        await publish_btn.click()
        await asyncio.sleep(1)

        await _shot("submit_after_click")

        # ── 等待发布成功 ──────────────────────────────────────
        try:
            await page.wait_for_selector(
                'text=发布成功, '
                '[class*="success"], '
                '[class*="toast"]:has-text("成功"), '
                '[class*="toast"]:has-text("发布")',
                timeout=30000,
            )
        except Exception:
            # 备选：URL 变化到内容管理页
            if "manage" in page.url or "success" in page.url:
                return
            await _shot("submit_fail")
            raise Exception("抖音发布超时，未检测到成功提示")
