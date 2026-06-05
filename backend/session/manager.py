"""
Cookie 复用方案。
用户手动登录一次 → 保存加密 Cookie → 后续 Agent 复用。
密码永不经过本系统。
"""
import json, asyncio, time
from pathlib import Path
from playwright.async_api import async_playwright, BrowserContext, Page
from playwright.sync_api import sync_playwright
from session.crypto import encrypt, decrypt

SESSION_DIR = Path.home() / ".prism" / "sessions"
SESSION_DIR.mkdir(parents=True, exist_ok=True)

LOGIN_URLS = {
    "wechat":       "https://mp.weixin.qq.com",
    "zhihu":        "https://www.zhihu.com/signin",
    "xiaohongshu":  "https://creator.xiaohongshu.com/login",
    "bilibili":     "https://passport.bilibili.com/login",
}

# Elements that prove a successful login on each platform
LOGIN_SUCCESS_SELECTORS = {
    "wechat": {
        "url_pattern": "mp.weixin.qq.com/cgi-bin/home",
        "element":     '[id="menubar"]',
    },
    "zhihu": {
        "url_pattern": "zhihu.com",
        "element":     '[class*="AppHeader-userInfo"]',
    },
    "xiaohongshu": {
        "url_pattern": "creator.xiaohongshu.com",
        "element":     '[class*="user-info"], [class*="avatar"]',
    },
    "bilibili": {
        "url_pattern": "bilibili.com",
        "element":     '[class*="header-upload-entry"]',
    },
}

# URL fragments that mean "you are on the login page" (session expired)
LOGIN_PAGE_PATTERNS = {
    "wechat":      ["loginpage", "bizlogin"],
    "zhihu":       ["signin", "account/unhuman"],
    "xiaohongshu": ["creator.xiaohongshu.com/login", "xiaohongshu.com/login"],
    "bilibili":    ["passport.bilibili.com/login"],
}


# ── low-level helpers ──────────────────────────────────────────────────────────

async def is_logged_in(platform: str, page: Page) -> bool:
    """Return True if the current page looks like a logged-in state."""
    spec        = LOGIN_SUCCESS_SELECTORS.get(platform, {})
    url_pat     = spec.get("url_pattern", "")
    element_sel = spec.get("element", "")

    if url_pat and url_pat not in page.url:
        return False

    if element_sel:
        try:
            return await page.locator(element_sel).first.count() > 0
        except Exception:
            return False
    return True


async def wait_for_login(platform: str, page: Page, timeout: int = 120) -> bool:
    """
    Poll every 2 s until login elements appear or timeout expires.
    Returns True when login is detected, False on timeout.
    """
    spec        = LOGIN_SUCCESS_SELECTORS.get(platform, {})
    element_sel = spec.get("element", "")
    login_pats  = LOGIN_PAGE_PATTERNS.get(platform, [])
    elapsed     = 0

    while elapsed < timeout:
        await asyncio.sleep(2)
        elapsed += 2
        try:
            if element_sel:
                if await page.locator(element_sel).first.count() > 0:
                    return True
            else:
                # No element selector – accept leaving the login page
                if not any(p in page.url for p in login_pats):
                    return True
        except Exception:
            continue
    return False


async def verify_session(platform: str, context: BrowserContext) -> bool:
    """
    Load cookies then visit the platform home page.
    Returns False if redirected to a login page (cookie expired).
    """
    home_urls = {
        "wechat":      "https://mp.weixin.qq.com",
        "zhihu":       "https://www.zhihu.com",
        "xiaohongshu": "https://creator.xiaohongshu.com",
        "bilibili":    "https://www.bilibili.com",
    }
    page = await context.new_page()
    try:
        url = home_urls.get(platform, "https://www.google.com")
        await page.goto(url, wait_until="domcontentloaded", timeout=15000)
        await asyncio.sleep(1)

        login_pats = LOGIN_PAGE_PATTERNS.get(platform, [])
        if any(p in page.url for p in login_pats):
            return False

        spec = LOGIN_SUCCESS_SELECTORS.get(platform, {})
        element_sel = spec.get("element", "")
        if element_sel:
            try:
                return await page.locator(element_sel).first.count() > 0
            except Exception:
                pass
        return True
    except Exception:
        return False
    finally:
        await page.close()


# ── session persistence ────────────────────────────────────────────────────────

def _save_session_sync(platform: str) -> bool:
    """Run interactive login in a worker thread to avoid ASGI event-loop subprocess limits."""
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=False)
        ctx = browser.new_context()
        page = ctx.new_page()

        try:
            page.goto(LOGIN_URLS.get(platform, "https://www.google.com"), wait_until="domcontentloaded", timeout=15000)
            print(f"[Prism] 请在弹出窗口完成 {platform} 登录，系统将自动检测并保存会话…")

            spec = LOGIN_SUCCESS_SELECTORS.get(platform, {})
            element_sel = spec.get("element", "")
            login_pats = LOGIN_PAGE_PATTERNS.get(platform, [])
            success = False

            for _ in range(60):
                time.sleep(2)
                try:
                    if element_sel:
                        if page.locator(element_sel).first.count() > 0:
                            success = True
                            break
                    elif not any(p in page.url for p in login_pats):
                        success = True
                        break
                except Exception:
                    continue

            if not success:
                print(f"[Prism] {platform} 登录超时")
                return False

            data = json.dumps({
                "cookies": ctx.cookies(),
                "storage": page.evaluate("()=>JSON.stringify(localStorage)"),
            })
            (SESSION_DIR / f"{platform}.enc").write_bytes(encrypt(data.encode()))
            print(f"[Prism] {platform} Session 已保存")
            return True
        finally:
            browser.close()


async def save_session(platform: str) -> bool:
    """Open a visible browser, wait for the user to complete login, then save cookies."""
    return await asyncio.to_thread(_save_session_sync, platform)


async def load_session(platform: str, context: BrowserContext) -> bool:
    """Inject saved cookies into context. Returns False if no session file."""
    path = SESSION_DIR / f"{platform}.enc"
    if not path.exists():
        return False
    try:
        data = json.loads(decrypt(path.read_bytes()))
        await context.add_cookies(data["cookies"])
        return True
    except Exception:
        return False


async def save_session_from_context(
    platform: str, context: BrowserContext, page: Page
) -> None:
    """Persist cookies from an already-logged-in context."""
    try:
        data = json.dumps({
            "cookies": await context.cookies(),
            "storage": await page.evaluate("()=>JSON.stringify(localStorage)"),
        })
        (SESSION_DIR / f"{platform}.enc").write_bytes(encrypt(data.encode()))
    except Exception as e:
        print(f"[Prism] Warning: could not save session for {platform}: {e}")


async def is_session_valid(platform: str) -> bool:
    """Quick check: does a session file exist on disk?"""
    return (SESSION_DIR / f"{platform}.enc").exists()


# ── high-level entry point ─────────────────────────────────────────────────────

async def ensure_logged_in(
    platform: str,
    context: BrowserContext,
    page: Page,
    status_callback=None,
) -> bool:
    """
    Unified entry point – guarantees the context is logged in.

    Flow:
      1. Try to load local session cookies.
      2. Verify they are still valid.
      3. If not, open the login page and wait for the user to log in.
      4. Save the fresh cookies.
      5. Return True on success, False on timeout / error.
    """
    def cb(msg: str):
        if status_callback:
            status_callback(msg)

    # 1. Try cached session
    has_session = await load_session(platform, context)

    if has_session:
        cb("已加载本地 Session，验证中...")
        if await verify_session(platform, context):
            cb("Session 有效，直接进入 ✓")
            return True
        cb("Session 已过期，需要重新登录")
    else:
        cb("未找到本地 Session，需要登录")

    # 2. Open login page
    login_url = LOGIN_URLS.get(platform, "https://www.google.com")
    cb(f"打开登录页面...")
    try:
        await page.goto(login_url, wait_until="domcontentloaded", timeout=15000)
    except Exception:
        pass  # navigation might already be in progress

    cb("请在弹出的浏览器窗口完成登录，等待中（最多 2 分钟）...")

    # 3. Poll for login success
    success = await wait_for_login(platform, page, timeout=120)
    if not success:
        cb("登录超时，请重试")
        return False

    # 4. Persist new cookies
    cb("登录成功，保存 Session...")
    await save_session_from_context(platform, context, page)
    cb("Session 已保存 ✓")
    return True
