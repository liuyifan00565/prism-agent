"""
VLM 截图识别节点
1. run(state, platform) — 原有节点：确认编辑器状态
2. find_and_click(page, desc) — 选择器优先，VLM 兜底
"""
import base64, json, os
from pathlib import Path
from dashscope import MultiModalConversation
from agent.state import AgentState

SCREENSHOT_DIR = Path.home() / ".prism" / "screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)


# ── original node (unchanged) ─────────────────────────────────────────────────

async def run(state: AgentState, platform: str) -> AgentState:
    pages = state.get("_pages", {})
    page  = pages.get(platform)
    if not page:
        return state

    shot_path = str(SCREENSHOT_DIR / f"{platform}_editor.png")
    await page.screenshot(path=shot_path)
    state["adapted_results"][platform]["screenshot_path"] = shot_path

    try:
        with open(shot_path, "rb") as f:
            img_b64 = base64.b64encode(f.read()).decode()

        resp = MultiModalConversation.call(
            model="qwen-vl-max",
            messages=[{
                "role": "user",
                "content": [
                    {"image": f"data:image/png;base64,{img_b64}"},
                    {"text": (
                        f"这是{platform}平台的编辑器页面吗？"
                        "如果是，回复'就绪'；否则描述当前页面状态。"
                    )},
                ],
            }],
        )
        answer = resp.output.choices[0].message.content[0].get("text", "")
        state["execution_log"].append(f"[VLM] {platform}: {answer[:50]}")
    except Exception as e:
        state["execution_log"].append(f"[VLM] {platform}: 识别跳过 ({e})")

    return state


# ── selector → VLM fallback click ────────────────────────────────────────────

# Common element descriptions → CSS selectors
_SELECTOR_MAP: dict[str, str] = {
    "发布按钮":   'button:has-text("发布"), button:has-text("提交")',
    "标题输入框": 'input[placeholder*="标题"], [data-placeholder*="标题"], .WriteIndex-titleInput',
    "正文编辑器": '[contenteditable="true"], .ql-editor',
    "话题标签":   'button:has-text("话题"), [class*="topic"]',
    "确认按钮":   'button:has-text("确定"), button:has-text("确认")',
    "取消按钮":   'button:has-text("取消")',
}


async def find_and_click(
    page,
    element_desc: str,
    fallback_vlm: bool = True,
) -> bool:
    """
    Try a CSS selector first; fall back to VLM screenshot recognition.

    Args:
        page:         Playwright Page object
        element_desc: Natural-language description, e.g. "发布按钮"
        fallback_vlm: Whether to attempt VLM if the selector misses

    Returns:
        True if the element was clicked, False otherwise.
    """
    selector = _SELECTOR_MAP.get(element_desc)
    if selector:
        el = page.locator(selector).first
        if await el.count() > 0:
            await el.click()
            return True

    if not fallback_vlm:
        return False

    return await _vlm_click(page, element_desc)


async def _vlm_click(page, element_desc: str) -> bool:
    """
    Screenshot the page, ask Qwen-VL for the element's centre coordinate,
    then move the mouse there and click.
    """
    screenshot = await page.screenshot()
    b64 = base64.b64encode(screenshot).decode()

    prompt = (
        f"请在截图中找到【{element_desc}】。\n"
        "返回JSON（不要其他内容）：\n"
        '{"found": true, "x": 数字, "y": 数字, "confidence": 0到1的小数}\n'
        "坐标为元素中心点（像素）。找不到返回 {\"found\": false}"
    )

    try:
        resp = MultiModalConversation.call(
            model="qwen-vl-max",
            messages=[{
                "role": "user",
                "content": [
                    {"image": f"data:image/png;base64,{b64}"},
                    {"text": prompt},
                ],
            }],
        )
        raw = resp.output.choices[0].message.content[0]["text"]
        result = json.loads(raw.replace("```json", "").replace("```", "").strip())
    except Exception:
        return False

    if result.get("found") and result.get("confidence", 0) > 0.75:
        await page.mouse.click(result["x"], result["y"])
        return True
    return False
