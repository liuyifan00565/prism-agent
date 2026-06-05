from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.errors import NodeInterrupt
from agent.state import AgentState
from agent.nodes import stt, intent, adapter, checker, navigator, gui_recognizer, executor, reporter


def build_graph():
    g = StateGraph(AgentState)

    g.add_node("stt",       stt.run)
    g.add_node("intent",    intent.run)
    g.add_node("skip_node", skip_node)   # 跳过适配时直接复制原文
    g.add_node("adapt",     adapter.run)
    g.add_node("check",     checker.run)      # 适配完立即检查
    g.add_node("confirm",   confirm_node)     # Human-in-the-loop
    g.add_node("publish",   publish_loop)
    g.add_node("report",    reporter.run)

    g.set_entry_point("stt")
    g.add_edge("stt", "intent")

    # intent 后根据 skip_adapt 标志决定走哪条路
    g.add_conditional_edges("intent", route_after_intent, {
        "adapt":           "adapt",
        "skip_to_confirm": "skip_node",
    })

    g.add_edge("skip_node", "confirm")  # skip_node 直接进入 confirm（会触发 NodeInterrupt）
    g.add_edge("adapt",  "check")
    g.add_edge("check",  "confirm")

    g.add_conditional_edges("confirm", route_after_confirm, {
        "go":    "publish",
        "abort": "report",
    })

    g.add_edge("publish", "report")
    g.add_edge("report",  END)

    return g.compile(checkpointer=MemorySaver())


def route_after_intent(state: AgentState) -> str:
    """intent 节点后的路由：有 skip_adapt 标志则跳过 AI 适配和检查。"""
    if state.get("skip_adapt"):
        return "skip_to_confirm"
    return "adapt"


async def skip_node(state: AgentState) -> AgentState:
    """
    跳过 AI 适配节点：直接将原始标题/正文填入所有平台的 adapted_results，
    status 置为 confirmed（前端看到后即可触发发布）。
    注意：不设 state["confirmed"]=True，让 confirm_node 正常触发 NodeInterrupt，
    使 _run 将任务状态设为 awaiting_confirm，前端看到 confirmed 平台后显示发布按钮。
    """
    for platform in state["target_platforms"]:
        state["adapted_results"][platform] = {
            "platform":        platform,
            "adapted_title":   state.get("original_title") or "",
            "adapted_body":    state.get("original_body")  or "",
            "tags":            [],
            "tip":             "直接发布，未经AI适配",
            "status":          "confirmed",
            "compliance":      None,
            "error":           None,
            "screenshot_path": None,
            "retry_count":     0,
            "last_retry_at":   None,
        }
    state["compliance_summary"]  = {}
    state["has_blocking_issues"] = False
    return state


def route_after_confirm(state: AgentState) -> str:
    if state.get("abort"):
        return "abort"
    return "go"


def confirm_node(state: AgentState) -> AgentState:
    """等待用户在前端预览合规报告后确认"""
    if not state.get("confirmed"):
        raise NodeInterrupt("等待用户确认：请检查合规报告后点击确认发布")
    return state


async def publish_loop(state: AgentState) -> AgentState:
    for platform in state["target_platforms"]:
        result = state["adapted_results"].get(platform)
        if not result:
            continue

        # 跳过 blocked 且用户没选 skip_blocked 的平台
        compliance = state["compliance_summary"].get(platform, {})
        if not compliance.get("passed") and compliance.get("risk_level") == "high":
            if not state.get("skip_blocked"):
                result["status"] = "blocked"
                state["execution_log"].append(f"[{platform}] 跳过：存在高风险违规内容")
                continue

        try:
            # executor now owns the full flow:
            # browser launch → login → navigate → fill → screenshot → confirm → submit
            state = await executor.run(state, platform)
        except Exception as e:
            state["adapted_results"][platform]["status"] = "failed"
            state["adapted_results"][platform]["error"] = str(e)
            state["execution_log"].append(f"[{platform}] 执行失败: {e}")

    return state


graph = build_graph()
