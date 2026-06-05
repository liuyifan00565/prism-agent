import json
from dashscope import Generation
from agent.state import AgentState

PROMPT = """你是内容发布助手的意图理解模块。
用户输入：{text}

返回JSON（不要有其他内容）：
{{
  "intent": "publish",
  "target_platforms": ["wechat","zhihu","xiaohongshu","bilibili"],
  "title": "提取的标题",
  "body": "提取的正文",
  "needs_confirm": true
}}

platform 枚举：wechat | zhihu | xiaohongshu | bilibili | weibo | juejin
未指定平台则默认全选。"""

async def run(state: AgentState) -> AgentState:
    text = state.get("raw_text", "")
    if state.get("original_title") or state.get("original_body"):
        text += f"\n标题：{state.get('original_title','')}\n正文：{state.get('original_body','')}"

    resp   = Generation.call(model="qwen-max", prompt=PROMPT.format(text=text))
    raw    = resp.output.text.strip()

    try:
        parsed = json.loads(raw.replace("```json","").replace("```",""))
    except Exception:
        parsed = {
            "intent": "publish",
            "target_platforms": ["wechat","zhihu","xiaohongshu","bilibili"],
            "title": state.get("original_title",""),
            "body":  state.get("original_body", text),
            "needs_confirm": True,
        }

    state.update({
        "intent":           parsed.get("intent","publish"),
        "target_platforms": parsed.get("target_platforms",[]),
        "original_title":   parsed.get("title", state.get("original_title","")),
        "original_body":    parsed.get("body",  state.get("original_body","")),
        "needs_confirm":    parsed.get("needs_confirm", True),
        "adapted_results":  {},
        "compliance_summary": {},
        "has_blocking_issues": False,
        "execution_log":    state.get("execution_log",[]),
    })
    return state
