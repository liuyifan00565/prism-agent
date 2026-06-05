"""
页面导航节点
使用 Playwright 打开平台编辑器页面，复用已保存的 session
"""
from playwright.async_api import async_playwright
from platforms.registry import PLATFORM_REGISTRY
from session.manager import load_session
from agent.state import AgentState

# 全局 browser/context 复用（进程级别）
_browser = None
_contexts: dict = {}


async def _get_context(platform: str):
    global _browser
    if _browser is None or not _browser.is_connected():
        pw = await async_playwright().start()
        _browser = await pw.chromium.launch(headless=False)

    if platform not in _contexts:
        ctx = await _browser.new_context()
        await load_session(platform, ctx)
        _contexts[platform] = ctx

    return _contexts[platform]


async def run(state: AgentState, platform: str) -> AgentState:
    state["adapted_results"][platform]["status"] = "publishing"
    state["execution_log"].append(f"[导航] 打开 {platform} 编辑器...")

    ctx = await _get_context(platform)
    page = await ctx.new_page()

    adapter = PLATFORM_REGISTRY[platform]
    await adapter.navigate_to_editor(page)

    # 将 page 对象暂存到 state 方便后续节点使用
    state.setdefault("_pages", {})[platform] = page
    return state
