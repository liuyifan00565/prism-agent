import asyncio
from playwright.async_api import Page
from .base import PlatformAdapter

EDITOR_URL = (
    "https://mp.weixin.qq.com/cgi-bin/appmsg"
    "?t=media/appmsg_edit_v2&action=edit&type=77"
)
LOGIN_URL = "https://mp.weixin.qq.com"


class WechatAdapter(PlatformAdapter):
    platform_id   = "wechat"
    platform_name = "微信公众号"
    char_limit    = 20000
    has_tags      = False
    style_desc    = "深度长文风格，逻辑严谨，段落清晰，适合知识分享和深度解析，标题吸引人"
    publish_url   = EDITOR_URL

    async def navigate_to_editor(self, page: Page) -> None:
        await page.goto(EDITOR_URL, wait_until="domcontentloaded", timeout=30000)
        try:
            await page.wait_for_load_state("load", timeout=15000)
        except Exception:
            pass
        if "mp.weixin.qq.com/cgi-bin/loginpage" in page.url or "login" in page.url:
            raise Exception("wechat_session_expired")
        try:
            await page.wait_for_selector(
                '#title, #ueditor_0, [id*="editor"], [class*="editor"]',
                timeout=20000,
            )
        except Exception:
            if "login" in page.url:
                raise Exception("wechat_session_expired")
            raise Exception("wechat_editor_not_found: 编辑器未能在20秒内加载，请检查网络或页面结构")

    async def fill_content(self, page: Page, title: str, body: str, tags: list, video_path: str = None) -> None:
        # Fill title field
        title_input = page.locator('#title, input[id*="title"]').first
        await title_input.click()
        await title_input.fill("")
        await page.keyboard.type(title, delay=30)
        await asyncio.sleep(0.3)

        # The editor is inside an iframe
        frame = page.frame_locator('#ueditor_0')
        editor = frame.locator('body[contenteditable="true"], .ql-editor, body')

        # Try iframe approach first
        iframe_count = 0
        try:
            el = frame.locator("body")
            iframe_count = await el.count()
        except Exception:
            pass

        if iframe_count > 0:
            body_el = frame.locator("body")
            await body_el.click()
            await asyncio.sleep(0.2)
            await page.keyboard.press("Control+a")
            await page.keyboard.press("Delete")
            await page.keyboard.type(body, delay=10)
        else:
            # Fallback: contenteditable outside iframe
            content_el = page.locator(
                '[contenteditable="true"], #ueditor_0'
            ).first
            await content_el.click()
            await asyncio.sleep(0.2)
            await page.keyboard.press("Control+a")
            await page.keyboard.press("Delete")
            await page.keyboard.type(body, delay=10)

        await asyncio.sleep(0.4)

    async def submit(self, page: Page, assist_fn=None, **kwargs) -> None:
        # Click the publish / save-and-send button
        publish_btn = page.locator(
            'a:has-text("保存并群发"), '
            'button:has-text("发表"), '
            'span:has-text("保存并群发"), '
            'a.btn_publish'
        ).first
        await publish_btn.wait_for(state="visible", timeout=5000)
        await publish_btn.click()
        await asyncio.sleep(1)

        # Confirm dialog if it appears
        confirm_btn = page.locator(
            'button:has-text("确定"), '
            'a:has-text("群发给所有用户")'
        )
        if await confirm_btn.count() > 0:
            await confirm_btn.first.click()

        await page.wait_for_timeout(4000)
