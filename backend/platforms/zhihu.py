import asyncio
from playwright.async_api import Page
from .base import PlatformAdapter

EDITOR_URL = "https://zhuanlan.zhihu.com/write"
LOGIN_URL  = "https://www.zhihu.com/signin"


class ZhihuAdapter(PlatformAdapter):
    platform_id   = "zhihu"
    platform_name = "知乎"
    char_limit    = 10000
    has_tags      = False
    style_desc    = "专业理性风格，引用数据，逻辑清晰，适合问答和专栏，避免口语化表达"
    publish_url   = EDITOR_URL

    async def navigate_to_editor(self, page: Page) -> None:
        await page.goto(EDITOR_URL, wait_until="domcontentloaded", timeout=30000)
        try:
            await page.wait_for_load_state("load", timeout=15000)
        except Exception:
            pass
        if "signin" in page.url or "login" in page.url:
            raise Exception("zhihu_session_expired")
        try:
            await page.wait_for_selector(
                '.WriteIndex-titleInput, .ql-editor, [contenteditable="true"], '
                'textarea[placeholder*="标题"], [class*="editor"]',
                timeout=20000,
            )
        except Exception:
            if "signin" in page.url or "login" in page.url:
                raise Exception("zhihu_session_expired")
            raise Exception("zhihu_editor_not_found: 编辑器未能在20秒内加载，请检查网络或页面结构")

    async def fill_content(self, page: Page, title: str, body: str, tags: list, video_path: str = None) -> None:
        # Fill title
        title_input = page.locator(
            '.WriteIndex-titleInput, '
            'textarea[placeholder*="标题"], '
            'input[placeholder*="标题"]'
        ).first
        await title_input.click()
        await title_input.fill("")
        await page.keyboard.type(title, delay=30)
        await asyncio.sleep(0.3)

        # Fill body (Quill editor)
        editor = page.locator('.ql-editor, [contenteditable="true"]').first
        await editor.click()
        await asyncio.sleep(0.2)
        await page.keyboard.press("Control+a")
        await page.keyboard.press("Delete")
        await page.keyboard.type(body, delay=10)
        await asyncio.sleep(0.4)

    async def submit(self, page: Page, assist_fn=None, **kwargs) -> None:
        # Click the primary "发布" button
        publish_btn = page.locator(
            'button.Button--primary:has-text("发布"), '
            'button:has-text("发布文章"), '
            'button:has-text("发布")'
        ).first
        await publish_btn.wait_for(state="visible", timeout=5000)
        await publish_btn.click()
        await asyncio.sleep(0.5)

        # Confirm in dialog if present
        confirm_btn = page.locator(
            'button:has-text("确认发布"), '
            'button.Button--primary:has-text("确认")'
        )
        if await confirm_btn.count() > 0:
            await confirm_btn.first.click()

        await page.wait_for_selector(
            '[class*="PublishSuccess"], [class*="success"], text=发布成功',
            timeout=15000,
        )
