import asyncio, json
from dashscope import Generation
from platforms.registry import PLATFORM_REGISTRY
from agent.state import AgentState

async def adapt_single(platform: str, title: str, body: str) -> dict:
    cfg    = PLATFORM_REGISTRY[platform]
    prompt = cfg.get_adapt_prompt(title, body)
    resp   = Generation.call(model="qwen-max", prompt=prompt)
    raw    = resp.output.text.strip().replace("```json","").replace("```","")
    try:
        result = json.loads(raw)
    except Exception:
        result = {"adapted_title": title, "adapted_body": body, "tags": [], "tip": "适配失败，使用原文"}
    result.update({"platform": platform, "status": "pending", "compliance": None, "error": None, "screenshot_path": None})
    # normalise keys
    if "title" in result and "adapted_title" not in result:
        result["adapted_title"] = result.pop("title")
    if "body" in result and "adapted_body" not in result:
        result["adapted_body"] = result.pop("body")
    return result

async def run(state: AgentState) -> AgentState:
    platforms = state.get("target_platforms", [])
    title     = state.get("original_title", "")
    body      = state.get("original_body",  "")

    tasks   = [adapt_single(p, title, body) for p in platforms if p in PLATFORM_REGISTRY]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    adapted = {}
    for p, r in zip(platforms, results):
        adapted[p] = r if not isinstance(r, Exception) else {
            "platform": p, "adapted_title": title, "adapted_body": body,
            "tags": [], "tip": "", "status": "failed", "error": str(r),
            "compliance": None, "screenshot_path": None,
        }
    state["adapted_results"] = adapted
    return state
