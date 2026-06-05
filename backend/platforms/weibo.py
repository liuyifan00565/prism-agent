"""
微博平台适配器
发布流程：打开 weibo.com → 点击发博输入框 → 输入内容 → 点击发送
"""
import asyncio
from playwright.async_api import Page
from .base import PlatformAdapter

COMPOSE_URL = "https://weibo.com"
LOGIN_URL   = "https://passport.weibo.com/signin/login"


class WeiboAdapter(PlatformAdapter):
    platform_id    = "weibo"
    platform_name  = "微博"
    char_limit     = 2000
    has_tags       = True
    supports_video = True
    _has_video     = False
    style_desc = (
        "微博风格：口语化，情绪鲜明，"
        "140字内核心观点，结尾加话题#tag#，"
        "适合引发转发讨论"
    )
    publish_url = COMPOSE_URL
    login_url   = LOGIN_URL

    async def navigate_to_editor(self, page: Page) -> None:
        import pathlib as _pl, datetime as _dt

        async def _shot(label: str):
            try:
                d = _pl.Path.home() / ".prism" / "debug"
                d.mkdir(parents=True, exist_ok=True)
                ts = _dt.datetime.now().strftime("%H%M%S")
                await page.screenshot(
                    path=str(d / f"weibo_{ts}_{label}.png"), full_page=False
                )
            except Exception:
                pass

        await page.goto(COMPOSE_URL, wait_until="domcontentloaded", timeout=30000)
        try:
            await page.wait_for_load_state("load", timeout=15000)
        except Exception:
            pass
        await _shot("nav_loaded")

        # 检查登录状态
        if "passport" in page.url or "signin" in page.url:
            raise Exception("weibo_session_expired")

        # 等待发博输入区出现
        try:
            await page.wait_for_selector(
                'textarea[placeholder*="有什么新鲜事"], '
                '[class*="Form_input"], '
                '[class*="compose"], '
                'textarea[class*="textarea"]',
                timeout=20000,
            )
        except Exception:
            if "passport" in page.url:
                raise Exception("weibo_session_expired")
            raise Exception("weibo_editor_not_found: 发博输入框未能在20秒内加载")

        # 点击激活编辑区
        editor = page.locator(
            'textarea[placeholder*="有什么新鲜事"], '
            '[class*="Form_input"], '
            'textarea[class*="textarea"]'
        ).first
        await editor.click()
        await asyncio.sleep(0.5)
        await _shot("nav_editor_ready")

    async def fill_content(self, page: Page, title: str, body: str, tags: list, video_path: str = None) -> None:
        # 微博没有独立标题，合并标题+正文
        full_text = f"{title}\n\n{body}" if title else body
        # 字数限制
        if len(full_text) > 1990:
            full_text = full_text[:1990] + "..."

        # 追加话题标签
        if tags:
            tag_str = " " + " ".join(f"#{t.lstrip('#')}#" for t in tags[:3])
            if len(full_text) + len(tag_str) <= 2000:
                full_text += tag_str

        # 定位编辑框
        editor = page.locator(
            'textarea[placeholder*="有什么新鲜事"], '
            '[class*="Form_input"], '
            '[contenteditable="true"][class*="textarea"], '
            'textarea[class*="textarea"]'
        ).first

        await editor.click()
        await asyncio.sleep(0.2)
        # 先清空再输入
        await page.keyboard.press("Control+a")
        await page.keyboard.type(full_text, delay=10)
        await asyncio.sleep(0.5)

        # ── 视频上传（如有）───────────────────────────────────
        if video_path and self._has_video:
            video_btn = page.locator(
                'button[title*="视频"], '
                '[class*="video-upload"], '
                '[class*="toolbar"] button:has-text("视频")'
            )
            if await video_btn.count() > 0:
                await video_btn.first.click()
                await asyncio.sleep(1)
            # 通用 file input 上传
            await self.upload_video(page, video_path)
            await asyncio.sleep(2)

    async def submit(self, page: Page, assist_fn=None, **kwargs) -> None:
        import pathlib as _pl, datetime as _dt

        async def _shot(label: str):
            try:
                d = _pl.Path.home() / ".prism" / "debug"
                d.mkdir(parents=True, exist_ok=True)
                ts = _dt.datetime.now().strftime("%H%M%S")
                await page.screenshot(
                    path=str(d / f"weibo_{ts}_{label}.png"), full_page=False
                )
            except Exception:
                pass

        await _shot("submit_before")

        # ── 发送按钮 ──────────────────────────────────────────
        send_btn = page.locator(
            'button:has-text("发布"), '
            'button:has-text("发送"), '
            '[class*="send"]:has-text("发布"), '
            '[class*="submit"]:has-text("发布")'
        ).first
        await send_btn.wait_for(state="visible", timeout=10000)
        await send_btn.click()
        await asyncio.sleep(1)

        await _shot("submit_after_click")

        # ── 等待成功反馈 ──────────────────────────────────────
        # 微博发布成功后通常有 toast 提示或输入框被清空
        try:
            await page.wait_for_selector(
                'text=发布成功, [class*="success"], '
                '[class*="toast"]:has-text("成功"), '
                '[class*="toast"]:has-text("发布")',
                timeout=10000,
            )
        except Exception:
            # 备选：检查输入框是否已清空（发布后微博会清空输入框）
            try:
                editor = page.locator(
                    'textarea[placeholder*="有什么新鲜事"], '
                    '[class*="Form_input"]'
                ).first
                val = await editor.input_value()
                if not val or len(val) < 5:
                    return   # 输入框已清空，认为发布成功
            except Exception:
                pass
            await _shot("submit_fail")
            raise Exception("微博发布超时，未检测到成功提示")
