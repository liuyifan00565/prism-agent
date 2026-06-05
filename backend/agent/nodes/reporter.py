import pyttsx3
from agent.state import AgentState

def speak(text: str):
    try:
        engine = pyttsx3.init()
        engine.setProperty("rate", 180)
        engine.say(text)
        engine.runAndWait()
    except Exception:
        pass  # TTS 失败不阻断流程

async def run(state: AgentState) -> AgentState:
    results = state.get("adapted_results", {})
    success = [p for p, r in results.items() if r.get("status") == "success"]
    failed  = [p for p, r in results.items() if r.get("status") == "failed"]
    blocked = [p for p, r in results.items() if r.get("status") == "blocked"]

    platform_names = {
        "wechat":"公众号","zhihu":"知乎",
        "xiaohongshu":"小红书","bilibili":"B站",
    }

    parts = []
    if success:
        names = "、".join(platform_names.get(p,p) for p in success)
        parts.append(f"{names} 发布成功")
    if blocked:
        names = "、".join(platform_names.get(p,p) for p in blocked)
        parts.append(f"{names} 因合规问题已跳过")
    if failed:
        names = "、".join(platform_names.get(p,p) for p in failed)
        parts.append(f"{names} 发布失败")

    summary = "；".join(parts) or "任务已完成"
    state["final_summary"] = summary
    state["execution_log"].append(f"[完成] {summary}")
    speak(summary)
    return state
