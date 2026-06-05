"""
违规检查节点
在内容适配完成后、用户确认前执行
对每个目标平台并行检查
"""
import asyncio
from compliance.engine import check_platform
from agent.state import AgentState


async def run(state: AgentState) -> AgentState:
    platforms = state.get("target_platforms", [])
    adapted   = state.get("adapted_results", {})

    if not platforms or not adapted:
        state["compliance_summary"]  = {}
        state["has_blocking_issues"] = False
        return state

    state["execution_log"].append("[合规检查] 开始检查各平台...")

    # 并行检查所有平台
    async def check_one(platform):
        result = adapted.get(platform, {})
        title  = result.get("adapted_title", "")
        body   = result.get("adapted_body",  "")
        cr     = await check_platform(platform, title, body)
        # 将合规结果写回 adapted_results
        state["adapted_results"][platform]["compliance"] = cr
        state["adapted_results"][platform]["status"] = (
            "confirmed" if cr["passed"] else "checking"
        )
        return platform, cr

    results = await asyncio.gather(
        *[check_one(p) for p in platforms if p in adapted],
        return_exceptions=True,
    )

    summary = {}
    has_blocking = False

    for item in results:
        if isinstance(item, Exception):
            continue
        platform, cr = item
        summary[platform] = cr
        if cr["risk_level"] == "high":
            has_blocking = True
        if cr["issues"]:
            state["execution_log"].append(
                f"[合规检查] {platform}: {len(cr['issues'])} 个问题，"
                f"风险等级 {cr['risk_level']}"
            )
        else:
            state["execution_log"].append(f"[合规检查] {platform}: 通过 ✓")

    state["compliance_summary"]  = summary
    state["has_blocking_issues"] = has_blocking
    return state
