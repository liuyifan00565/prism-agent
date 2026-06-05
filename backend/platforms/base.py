from abc import ABC, abstractmethod
from playwright.async_api import Page


class PlatformAdapter(ABC):
    platform_id:    str
    platform_name:  str
    char_limit:     int
    has_tags:       bool
    style_desc:     str
    publish_url:    str
    supports_video: bool = False   # 子类覆盖为 True 表示该平台支持视频发布
    _has_video:     bool = False   # executor 运行时按需设置

    def get_adapt_prompt(self, title: str, body: str) -> str:
        return f"""请将以下内容适配为{self.platform_name}平台风格。
风格要求：{self.style_desc}
字数限制：{self.char_limit}字以内
{'需要3-5个话题标签' if self.has_tags else '不需要标签'}

标题：{title}
正文：{body}

严格返回JSON：
{{"adapted_title":"...","adapted_body":"...","tags":[],"tip":"10字内适配说明"}}"""

    async def upload_video(self, page: Page, video_path: str) -> bool:
        """
        默认实现：找到页面上第一个 video 类型的 file input 并设置文件。
        各平台可覆盖此方法实现更精确的上传逻辑。
        返回是否上传成功。
        """
        try:
            file_input = page.locator('input[type="file"][accept*="video"]')
            if await file_input.count() > 0:
                await file_input.set_input_files(video_path)
                return True
            return False
        except Exception:
            return False

    @abstractmethod
    async def navigate_to_editor(self, page: Page) -> None:
        pass

    @abstractmethod
    async def fill_content(self, page: Page, title: str, body: str, tags: list,
                           video_path: str = None) -> None:
        pass

    @abstractmethod
    async def submit(self, page: Page, assist_fn=None, **kwargs) -> None:
        """
        Submit/publish the content already filled on the page.
        assist_fn: optional async callable(message: str, screenshot_b64: str) -> str
            When provided, adapters can call it at decision points (e.g. template
            selection) to pause execution and let the user intervene via the UI.
            Returns the user's action string ("continue" by default).
        **kwargs: optional extra context passed by the executor
            body  (str) – original adapted body text
            title (str) – original adapted title
            tags  (list) – hashtag list
        """
        pass
