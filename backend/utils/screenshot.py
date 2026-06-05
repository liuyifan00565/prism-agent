from pathlib import Path
from playwright.async_api import Page

SCREENSHOT_DIR = Path.home() / ".prism" / "screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)


async def take(page: Page, name: str) -> str:
    path = str(SCREENSHOT_DIR / f"{name}.png")
    await page.screenshot(path=path, full_page=False)
    return path
