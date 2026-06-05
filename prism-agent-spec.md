# Prism — 多平台内容发布助手
# 完整实现方案 · 可直接喂给 Claude Code

---

## 0. 给 Claude Code 的指令

```
请按照这份规格文档，从零搭建 Prism 项目。
执行顺序：
1. 创建完整目录结构
2. 安装依赖（requirements.txt + package.json）
3. 按文档顺序逐文件实现，每完成一个文件告诉我
4. 优先实现后端核心链路：state → graph → nodes → platforms
5. 后端跑通后再实现前端

技术栈：Python 3.11 + FastAPI + LangGraph + Playwright + React + Vite
```

---

## 一、项目定位

**Prism — 多平台内容发布助手**

一句话：创作者输入内容（语音或文字），AI 自动适配各平台风格，**发布前检查违规敏感词**，确认后自动发布。

核心链路：
```
语音/文字输入
  → STT 转写
  → 意图理解（目标平台、标题、正文）
  → 多平台格式适配（并行）
  → 违规检查（每平台独立规则）  ← 新增
  → 人工确认预览
  → Playwright 复用 Session 自动发布
  → TTS 播报结果
```

---

## 二、目录结构

```
prism/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── agent/
│   │   ├── __init__.py
│   │   ├── state.py            # AgentState 类型定义
│   │   ├── graph.py            # LangGraph 工作流
│   │   └── nodes/
│   │       ├── __init__.py
│   │       ├── stt.py          # 语音转文字
│   │       ├── intent.py       # 意图理解
│   │       ├── adapter.py      # 内容适配（并行）
│   │       ├── checker.py      # 违规检查（新增）
│   │       ├── navigator.py    # 页面导航
│   │       ├── gui_recognizer.py # VLM 截图识别
│   │       ├── executor.py     # 动作执行
│   │       └── reporter.py     # 结果播报
│   ├── platforms/
│   │   ├── __init__.py
│   │   ├── base.py             # PlatformAdapter 基类
│   │   ├── registry.py         # 平台注册表
│   │   ├── wechat.py
│   │   ├── zhihu.py
│   │   ├── xiaohongshu.py
│   │   └── bilibili.py
│   ├── compliance/
│   │   ├── __init__.py
│   │   ├── engine.py           # 违规检查引擎
│   │   ├── rules/
│   │   │   ├── base.py         # 规则基类
│   │   │   ├── global_rules.py # 通用违禁词规则
│   │   │   ├── wechat_rules.py
│   │   │   ├── zhihu_rules.py
│   │   │   ├── xiaohongshu_rules.py
│   │   │   └── bilibili_rules.py
│   │   └── wordlists/
│   │       ├── global_sensitive.txt   # 通用敏感词库
│   │       ├── wechat_banned.txt
│   │       └── xiaohongshu_banned.txt
│   ├── session/
│   │   ├── __init__.py
│   │   ├── manager.py
│   │   └── crypto.py
│   └── utils/
│       ├── screenshot.py
│       └── tts.py
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api/
        │   └── client.js
        ├── components/
        │   ├── VoiceInput.jsx
        │   ├── ContentEditor.jsx
        │   ├── PlatformSelector.jsx
        │   ├── ComplianceReport.jsx  # 违规报告组件（新增）
        │   ├── AgentTimeline.jsx
        │   └── ResultCard.jsx
        └── hooks/
            ├── useVoice.js
            └── useAgent.js
```

---

## 三、完整代码

### 3.1 requirements.txt

```txt
fastapi==0.111.0
uvicorn[standard]==0.29.0
langgraph==0.1.19
langchain-core==0.2.5
playwright==1.44.0
openai-whisper==20231117
dashscope==1.19.3
pyttsx3==2.90
cryptography==42.0.8
python-multipart==0.0.9
pillow==10.3.0
aiofiles==23.2.1
python-dotenv==1.0.1
httpx==0.27.0
```

---

### 3.2 .env.example

```bash
DASHSCOPE_API_KEY=sk-your-key-here
WHISPER_MODEL=base
# base / small / medium，越大越准但越慢
```

---

### 3.3 backend/agent/state.py

```python
from typing import TypedDict, Optional, List, Dict, Any

class ComplianceIssue(TypedDict):
    type: str          # sensitive_word | policy_violation | length_exceeded
    severity: str      # error | warning | info
    word: Optional[str]
    position: Optional[int]
    suggestion: str
    rule_source: str   # 触发该问题的规则名称

class ComplianceResult(TypedDict):
    platform: str
    passed: bool                   # True = 全部通过
    issues: List[ComplianceIssue]
    auto_fixed_text: Optional[str] # AI 自动替换敏感词后的版本
    risk_level: str                # safe | low | medium | high

class PlatformResult(TypedDict):
    platform: str
    adapted_title: str
    adapted_body: str
    tags: List[str]
    tip: str
    status: str        # pending | checking | confirmed | publishing | success | failed | blocked
    compliance: Optional[ComplianceResult]
    error: Optional[str]
    screenshot_path: Optional[str]

class AgentState(TypedDict):
    # 输入
    audio_path: Optional[str]
    raw_text: Optional[str]
    original_title: Optional[str]
    original_body: Optional[str]

    # 意图解析
    intent: Optional[str]
    target_platforms: List[str]
    needs_confirm: bool

    # 适配结果
    adapted_results: Dict[str, PlatformResult]

    # 违规检查汇总
    compliance_summary: Dict[str, ComplianceResult]
    has_blocking_issues: bool      # 是否有必须处理的 error 级问题

    # 执行状态
    current_platform: Optional[str]
    execution_log: List[str]
    final_summary: Optional[str]

    # 流程控制
    confirmed: bool
    abort: bool
    skip_blocked: bool             # 跳过不通过的平台继续发布其他平台
```

---

### 3.4 backend/agent/graph.py

```python
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.errors import NodeInterrupt
from .state import AgentState
from .nodes import stt, intent, adapter, checker, navigator, gui_recognizer, executor, reporter


def build_graph():
    g = StateGraph(AgentState)

    g.add_node("stt",      stt.run)
    g.add_node("intent",   intent.run)
    g.add_node("adapt",    adapter.run)
    g.add_node("check",    checker.run)      # 适配完立即检查
    g.add_node("confirm",  confirm_node)     # Human-in-the-loop
    g.add_node("publish",  publish_loop)
    g.add_node("report",   reporter.run)

    g.set_entry_point("stt")
    g.add_edge("stt",    "intent")
    g.add_edge("intent", "adapt")
    g.add_edge("adapt",  "check")
    g.add_edge("check",  "confirm")

    g.add_conditional_edges("confirm", route_after_confirm, {
        "go":    "publish",
        "abort": "report",
    })

    g.add_edge("publish", "report")
    g.add_edge("report",  END)

    return g.compile(checkpointer=MemorySaver())


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
            state = await navigator.run(state, platform)
            state = await gui_recognizer.run(state, platform)
            state = await executor.run(state, platform)
        except Exception as e:
            state["adapted_results"][platform]["status"] = "failed"
            state["adapted_results"][platform]["error"] = str(e)
            state["execution_log"].append(f"[{platform}] 执行失败: {e}")

    return state


graph = build_graph()
```

---

### 3.5 backend/compliance/engine.py — 违规检查引擎

```python
"""
违规检查引擎
支持三层检查：
1. 关键词匹配（本地词库，毫秒级）
2. 正则规则（平台特定格式约束）
3. LLM 语义检查（兜底，检查隐晦违规表达）
"""
import re
import asyncio
from pathlib import Path
from typing import List
from dashscope import Generation
from ..agent.state import ComplianceIssue, ComplianceResult
from .rules.registry import RULES_REGISTRY

WORDLIST_DIR = Path(__file__).parent / "wordlists"


def load_wordlist(filename: str) -> set:
    path = WORDLIST_DIR / filename
    if not path.exists():
        return set()
    return set(
        line.strip().lower()
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.startswith("#")
    )


# 预加载词库（启动时执行一次）
GLOBAL_WORDS      = load_wordlist("global_sensitive.txt")
WECHAT_WORDS      = load_wordlist("wechat_banned.txt")
XIAOHONGSHU_WORDS = load_wordlist("xiaohongshu_banned.txt")

PLATFORM_WORDLISTS = {
    "wechat":       GLOBAL_WORDS | WECHAT_WORDS,
    "zhihu":        GLOBAL_WORDS,
    "xiaohongshu":  GLOBAL_WORDS | XIAOHONGSHU_WORDS,
    "bilibili":     GLOBAL_WORDS,
    "weibo":        GLOBAL_WORDS,
    "juejin":       GLOBAL_WORDS,
}


def keyword_check(text: str, platform: str) -> List[ComplianceIssue]:
    """第一层：关键词匹配"""
    issues = []
    words = PLATFORM_WORDLISTS.get(platform, GLOBAL_WORDS)
    text_lower = text.lower()

    for word in words:
        idx = text_lower.find(word)
        if idx != -1:
            issues.append(ComplianceIssue(
                type="sensitive_word",
                severity="error",
                word=word,
                position=idx,
                suggestion=f'请删除或替换词语「{word}」',
                rule_source="keyword_list",
            ))
    return issues


def regex_check(text: str, title: str, platform: str) -> List[ComplianceIssue]:
    """第二层：正则规则（平台特定约束）"""
    rules = RULES_REGISTRY.get(platform, [])
    issues = []
    full_content = title + "\n" + text

    for rule in rules:
        issue = rule.check(full_content, title, text)
        if issue:
            issues.extend(issue if isinstance(issue, list) else [issue])
    return issues


async def llm_semantic_check(text: str, title: str, platform: str) -> List[ComplianceIssue]:
    """第三层：LLM 语义检查（检查隐晦违规）"""
    platform_names = {
        "wechat": "微信公众号", "zhihu": "知乎",
        "xiaohongshu": "小红书", "bilibili": "B站专栏",
    }
    pname = platform_names.get(platform, platform)

    prompt = f"""你是{pname}平台的内容审核专家。
请检查以下内容是否存在违规风险（不包括已明确列出的敏感词，重点检查隐晦表达）。

标题：{title}
正文：{text[:800]}

检查维度：
1. 夸大宣传/虚假承诺（如"绝对有效"、"100%成功"）
2. 隐晦的违禁内容（绕过关键词过滤的表达方式）
3. 未经证实的医疗/金融建议
4. 可能引发平台限流的营销话术

返回JSON数组，无问题返回[]：
[{{"type":"policy_violation","severity":"warning","word":null,"position":null,"suggestion":"具体修改建议","rule_source":"llm_semantic"}}]
只返回JSON，不要其他内容。"""

    resp = Generation.call(model="qwen-max", prompt=prompt)
    raw = resp.output.text.strip().replace("```json", "").replace("```", "")
    try:
        import json
        items = json.loads(raw)
        return [ComplianceIssue(**item) for item in items if isinstance(item, dict)]
    except Exception:
        return []


async def auto_fix(text: str, issues: List[ComplianceIssue], platform: str) -> str:
    """用 LLM 自动替换敏感词，保持语义通顺"""
    if not issues:
        return text

    sensitive_words = [i["word"] for i in issues if i.get("word")]
    if not sensitive_words:
        return text

    prompt = f"""请将以下文本中的敏感词替换为合适的同义表达，保持原意和语感。
敏感词列表：{sensitive_words}
原文：{text}

直接返回替换后的文本，不要解释。"""

    resp = Generation.call(model="qwen-max", prompt=prompt)
    return resp.output.text.strip()


def calculate_risk_level(issues: List[ComplianceIssue]) -> str:
    if not issues:
        return "safe"
    severities = {i["severity"] for i in issues}
    if "error" in severities:
        return "high"
    if "warning" in severities:
        return "medium"
    return "low"


async def check_platform(
    platform: str,
    title: str,
    body: str,
    use_llm: bool = True
) -> ComplianceResult:
    """对单个平台执行完整三层检查"""

    # 第一层：关键词
    kw_issues = keyword_check(body + " " + title, platform)

    # 第二层：正则规则
    rx_issues = regex_check(body, title, platform)

    all_issues = kw_issues + rx_issues

    # 第三层：LLM 语义（仅在前两层无 error 时才调用，节省 token）
    llm_issues = []
    if use_llm and not any(i["severity"] == "error" for i in all_issues):
        llm_issues = await llm_semantic_check(body, title, platform)

    all_issues += llm_issues

    # 自动修复（仅关键词级别）
    auto_fixed = None
    if kw_issues:
        auto_fixed = await auto_fix(body, kw_issues, platform)

    risk = calculate_risk_level(all_issues)
    passed = risk in ("safe", "low")

    return ComplianceResult(
        platform=platform,
        passed=passed,
        issues=all_issues,
        auto_fixed_text=auto_fixed,
        risk_level=risk,
    )
```

---

### 3.6 backend/compliance/rules/base.py

```python
from abc import ABC, abstractmethod
from typing import Optional, List, Union
from ...agent.state import ComplianceIssue


class BaseRule(ABC):
    rule_name: str
    platform: str

    @abstractmethod
    def check(
        self, full_content: str, title: str, body: str
    ) -> Optional[Union[ComplianceIssue, List[ComplianceIssue]]]:
        pass
```

---

### 3.7 backend/compliance/rules/global_rules.py

```python
import re
from typing import Optional, List
from .base import BaseRule
from ...agent.state import ComplianceIssue


class NoExternalLinkRule(BaseRule):
    """部分平台禁止正文中出现外链"""
    rule_name = "no_external_link"

    def check(self, full, title, body):
        urls = re.findall(r'https?://[^\s]+', body)
        if urls:
            return [ComplianceIssue(
                type="policy_violation",
                severity="warning",
                word=url,
                position=body.find(url),
                suggestion=f"平台可能屏蔽外链，建议删除：{url}",
                rule_source=self.rule_name,
            ) for url in urls]
        return None


class TitleLengthRule(BaseRule):
    """标题长度检查"""
    rule_name = "title_length"

    def __init__(self, max_len: int):
        self.max_len = max_len

    def check(self, full, title, body):
        if len(title) > self.max_len:
            return ComplianceIssue(
                type="length_exceeded",
                severity="error",
                word=None,
                position=None,
                suggestion=f"标题超过{self.max_len}字限制（当前{len(title)}字），请缩短",
                rule_source=self.rule_name,
            )
        return None


class BodyLengthRule(BaseRule):
    """正文长度检查"""
    rule_name = "body_length"

    def __init__(self, max_len: int):
        self.max_len = max_len

    def check(self, full, title, body):
        if len(body) > self.max_len:
            return ComplianceIssue(
                type="length_exceeded",
                severity="warning",
                word=None,
                position=None,
                suggestion=f"正文超过{self.max_len}字建议上限（当前{len(body)}字）",
                rule_source=self.rule_name,
            )
        return None


class ExcessiveEmojiRule(BaseRule):
    """过多 emoji 可能被判定为营销号"""
    rule_name = "excessive_emoji"

    def check(self, full, title, body):
        import unicodedata
        emoji_count = sum(
            1 for c in full
            if unicodedata.category(c) in ('So', 'Sm') or ord(c) > 0x1F300
        )
        if emoji_count > 20:
            return ComplianceIssue(
                type="policy_violation",
                severity="info",
                word=None,
                position=None,
                suggestion=f"检测到 {emoji_count} 个 emoji，过多可能触发营销号检测",
                rule_source=self.rule_name,
            )
        return None


class PricePromotionRule(BaseRule):
    """过度促销话术检查"""
    rule_name = "price_promotion"
    PATTERNS = [
        r'(限时|秒杀|抢购|最低价|史低|白菜价).{0,5}(折|元|￥)',
        r'(买.送|第.件.折)',
        r'(0元|免费领|白嫖)',
    ]

    def check(self, full, title, body):
        issues = []
        for p in self.PATTERNS:
            m = re.search(p, full)
            if m:
                issues.append(ComplianceIssue(
                    type="policy_violation",
                    severity="warning",
                    word=m.group(),
                    position=m.start(),
                    suggestion=f'促销话术「{m.group()}」可能触发平台限流，建议改为自然表达',
                    rule_source=self.rule_name,
                ))
        return issues or None
```

---

### 3.8 backend/compliance/rules/xiaohongshu_rules.py

```python
from .base import BaseRule
from .global_rules import NoExternalLinkRule, TitleLengthRule, BodyLengthRule, PricePromotionRule
from ...agent.state import ComplianceIssue
import re


class XiaohongshuContactRule(BaseRule):
    """小红书禁止留联系方式"""
    rule_name = "xhs_no_contact"

    PATTERNS = [
        r'v信|威信|V信|微.{0,2}号',
        r'\d{5,}',        # 5位以上纯数字（可能是手机号变体）
        r'加我|联系我|私信我',
    ]

    def check(self, full, title, body):
        issues = []
        for p in self.PATTERNS:
            m = re.search(p, body)
            if m:
                issues.append(ComplianceIssue(
                    type="policy_violation",
                    severity="error",
                    word=m.group(),
                    position=m.start(),
                    suggestion=f'小红书禁止引流，请删除「{m.group()}」',
                    rule_source=self.rule_name,
                ))
        return issues or None


class XiaohongshuTagCountRule(BaseRule):
    """小红书话题标签数量检查"""
    rule_name = "xhs_tag_count"

    def check(self, full, title, body):
        tags = re.findall(r'#[^#\s]+', full)
        if len(tags) > 10:
            return ComplianceIssue(
                type="policy_violation",
                severity="warning",
                word=None,
                position=None,
                suggestion=f"标签过多（{len(tags)}个），建议不超过10个",
                rule_source=self.rule_name,
            )
        return None


# 注册该平台所有规则
XIAOHONGSHU_RULES = [
    NoExternalLinkRule(),
    TitleLengthRule(max_len=20),
    BodyLengthRule(max_len=1000),
    PricePromotionRule(),
    XiaohongshuContactRule(),
    XiaohongshuTagCountRule(),
]
```

---

### 3.9 backend/compliance/rules/registry.py

```python
from .global_rules import NoExternalLinkRule, TitleLengthRule, BodyLengthRule, PricePromotionRule, ExcessiveEmojiRule
from .xiaohongshu_rules import XIAOHONGSHU_RULES

# 扩展平台只需在这里添加规则列表
RULES_REGISTRY = {
    "wechat": [
        TitleLengthRule(max_len=64),
        BodyLengthRule(max_len=20000),
        ExcessiveEmojiRule(),
        PricePromotionRule(),
    ],
    "zhihu": [
        TitleLengthRule(max_len=50),
        BodyLengthRule(max_len=10000),
        NoExternalLinkRule(),
    ],
    "xiaohongshu": XIAOHONGSHU_RULES,
    "bilibili": [
        TitleLengthRule(max_len=40),
        BodyLengthRule(max_len=2000),
        ExcessiveEmojiRule(),
    ],
    "weibo": [
        BodyLengthRule(max_len=2000),
    ],
    "juejin": [
        TitleLengthRule(max_len=60),
        BodyLengthRule(max_len=8000),
    ],
}
```

---

### 3.10 backend/compliance/wordlists/global_sensitive.txt

```
# 全局通用敏感词（示例，实际使用请补充完整词库）
# 格式：每行一个词，# 开头为注释

# 赌博类
赌博
赌场
博彩

# 诈骗类
刷单
套现
洗钱

# 虚假宣传类
包过
保证赚钱
躺赚

# 医疗夸大类
根治
特效药
祖传秘方
```

---

### 3.11 backend/agent/nodes/checker.py

```python
"""
违规检查节点
在内容适配完成后、用户确认前执行
对每个目标平台并行检查
"""
import asyncio
from ...compliance.engine import check_platform
from ..state import AgentState


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
```

---

### 3.12 backend/agent/nodes/stt.py

```python
import whisper, os
from ..state import AgentState

_model = None

def get_model():
    global _model
    if _model is None:
        model_name = os.getenv("WHISPER_MODEL", "base")
        _model = whisper.load_model(model_name)
    return _model

async def run(state: AgentState) -> AgentState:
    if state.get("raw_text"):
        return state

    audio_path = state.get("audio_path")
    if not audio_path or not os.path.exists(audio_path):
        state["raw_text"] = ""
        return state

    result = get_model().transcribe(audio_path, language="zh")
    state["raw_text"] = result["text"].strip()
    state["execution_log"].append(f"[STT] {state['raw_text'][:60]}...")
    return state
```

---

### 3.13 backend/agent/nodes/intent.py

```python
import json
from dashscope import Generation
from ..state import AgentState

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
```

---

### 3.14 backend/agent/nodes/adapter.py

```python
import asyncio, json
from dashscope import Generation
from ...platforms.registry import PLATFORM_REGISTRY
from ..state import AgentState

async def adapt_single(platform: str, title: str, body: str) -> dict:
    cfg    = PLATFORM_REGISTRY[platform]
    prompt = cfg.get_adapt_prompt(title, body)
    resp   = Generation.call(model="qwen-max", prompt=prompt)
    raw    = resp.output.text.strip().replace("```json","").replace("```","")
    try:
        result = json.loads(raw)
    except Exception:
        result = {"title": title, "body": body, "tags": [], "tip": "适配失败，使用原文"}
    result.update({"platform": platform, "status": "pending", "compliance": None})
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
            "tags": [], "status": "failed", "error": str(r), "compliance": None
        }
    state["adapted_results"] = adapted
    return state
```

---

### 3.15 backend/agent/nodes/reporter.py

```python
import pyttsx3
from ..state import AgentState

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
```

---

### 3.16 backend/platforms/base.py

```python
from abc import ABC, abstractmethod
from playwright.async_api import Page


class PlatformAdapter(ABC):
    platform_id:   str
    platform_name: str
    char_limit:    int
    has_tags:      bool
    style_desc:    str
    publish_url:   str

    def get_adapt_prompt(self, title: str, body: str) -> str:
        return f"""请将以下内容适配为{self.platform_name}平台风格。
风格要求：{self.style_desc}
字数限制：{self.char_limit}字以内
{'需要3-5个话题标签' if self.has_tags else '不需要标签'}

标题：{title}
正文：{body}

严格返回JSON：
{{"adapted_title":"...","adapted_body":"...","tags":[],"tip":"10字内适配说明"}}"""

    @abstractmethod
    async def navigate_to_editor(self, page: Page) -> None:
        pass

    @abstractmethod
    async def fill_content(self, page: Page, title: str, body: str, tags: list) -> None:
        pass

    @abstractmethod
    async def submit(self, page: Page) -> None:
        pass
```

---

### 3.17 backend/platforms/xiaohongshu.py（完整示例）

```python
import asyncio
from playwright.async_api import Page
from .base import PlatformAdapter


class XiaohongshuAdapter(PlatformAdapter):
    platform_id   = "xiaohongshu"
    platform_name = "小红书"
    char_limit    = 1000
    has_tags      = True
    style_desc    = "种草笔记风格，语气亲切，标题加emoji，多分点列举，字数800字以内"
    publish_url   = "https://creator.xiaohongshu.com/publish/publish"

    async def navigate_to_editor(self, page: Page) -> None:
        await page.goto(self.publish_url, wait_until="networkidle")
        await page.wait_for_selector('[class*="editor"], [contenteditable]', timeout=15000)

    async def fill_content(self, page: Page, title: str, body: str, tags: list) -> None:
        # 填标题
        await page.fill('[placeholder*="标题"], input[class*="title"]', title)
        await asyncio.sleep(0.3)

        # 填正文
        editor = page.locator('[contenteditable="true"]').first
        await editor.click()
        await page.keyboard.type(body, delay=15)
        await asyncio.sleep(0.4)

        # 填标签
        for tag in tags[:5]:
            inp = page.locator('input[placeholder*="话题"]')
            if await inp.count() > 0:
                await inp.fill(tag.lstrip("#"))
                await page.keyboard.press("Enter")
                await asyncio.sleep(0.2)

    async def submit(self, page: Page) -> None:
        await page.click('button:has-text("发布"), [class*="publish-btn"]')
        await page.wait_for_selector('[class*="success"], [class*="toast"]', timeout=10000)
```

---

### 3.18 backend/platforms/registry.py

```python
from .wechat       import WechatAdapter
from .zhihu        import ZhihuAdapter
from .xiaohongshu  import XiaohongshuAdapter
from .bilibili     import BilibiliAdapter

PLATFORM_REGISTRY = {
    "wechat":       WechatAdapter(),
    "zhihu":        ZhihuAdapter(),
    "xiaohongshu":  XiaohongshuAdapter(),
    "bilibili":     BilibiliAdapter(),
    # 新增平台：实现 base.py 三个方法后在此注册
}
```

---

### 3.19 backend/session/manager.py

```python
"""
Cookie 复用方案。
用户手动登录一次 → 保存加密 Cookie → 后续 Agent 复用。
密码永不经过本系统。
"""
import json
from pathlib import Path
from playwright.async_api import async_playwright
from .crypto import encrypt, decrypt

SESSION_DIR = Path.home() / ".prism" / "sessions"
SESSION_DIR.mkdir(parents=True, exist_ok=True)

LOGIN_URLS = {
    "wechat":       "https://mp.weixin.qq.com",
    "zhihu":        "https://www.zhihu.com/signin",
    "xiaohongshu":  "https://creator.xiaohongshu.com",
    "bilibili":     "https://account.bilibili.com/login",
}

async def save_session(platform: str) -> bool:
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=False)
        ctx     = await browser.new_context()
        page    = await ctx.new_page()
        await page.goto(LOGIN_URLS.get(platform, "https://www.google.com"))
        print(f"[Prism] 请在弹出窗口完成 {platform} 登录，完成后按回车...")
        input()
        data = json.dumps({
            "cookies": await ctx.cookies(),
            "storage": await page.evaluate("()=>JSON.stringify(localStorage)"),
        })
        (SESSION_DIR / f"{platform}.enc").write_bytes(encrypt(data.encode()))
        await browser.close()
    return True

async def load_session(platform: str, context) -> bool:
    path = SESSION_DIR / f"{platform}.enc"
    if not path.exists():
        return False
    data = json.loads(decrypt(path.read_bytes()))
    await context.add_cookies(data["cookies"])
    return True

async def is_session_valid(platform: str) -> bool:
    return (SESSION_DIR / f"{platform}.enc").exists()
```

---

### 3.20 backend/session/crypto.py

```python
from cryptography.fernet import Fernet
from pathlib import Path

KEY_FILE = Path.home() / ".prism" / "key.bin"

def _get_key() -> bytes:
    if KEY_FILE.exists():
        return KEY_FILE.read_bytes()
    key = Fernet.generate_key()
    KEY_FILE.parent.mkdir(parents=True, exist_ok=True)
    KEY_FILE.write_bytes(key)
    return key

def encrypt(data: bytes) -> bytes:
    return Fernet(_get_key()).encrypt(data)

def decrypt(data: bytes) -> bytes:
    return Fernet(_get_key()).decrypt(data)
```

---

### 3.21 backend/main.py

```python
import uuid, tempfile, asyncio, os
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv
from agent.graph import graph
from session.manager import save_session, is_session_valid

load_dotenv()

app = FastAPI(title="Prism API")
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

tasks: dict = {}

def make_initial_state(title=None, body=None, platforms=None, audio_path=None, raw_text=None):
    return {
        "audio_path": audio_path,
        "raw_text": raw_text,
        "original_title": title,
        "original_body":  body,
        "target_platforms": platforms or [],
        "intent": None,
        "needs_confirm": True,
        "adapted_results": {},
        "compliance_summary": {},
        "has_blocking_issues": False,
        "current_platform": None,
        "execution_log": [],
        "final_summary": None,
        "confirmed": False,
        "abort": False,
        "skip_blocked": False,
    }

class TextRequest(BaseModel):
    title:     Optional[str] = None
    body:      Optional[str] = None
    platforms: Optional[List[str]] = None

class ConfirmRequest(BaseModel):
    task_id:      str
    confirmed:    bool
    skip_blocked: bool = False

class ApplyFixRequest(BaseModel):
    task_id:  str
    platform: str          # 应用自动修复到哪个平台

@app.post("/api/publish/voice")
async def publish_voice(audio: UploadFile = File(...)):
    task_id = str(uuid.uuid4())
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
        f.write(await audio.read())
        audio_path = f.name
    state  = make_initial_state(audio_path=audio_path)
    config = {"configurable": {"thread_id": task_id}}
    tasks[task_id] = {"state": state, "config": config, "status": "running"}
    asyncio.create_task(_run(task_id, state, config))
    return {"task_id": task_id}

@app.post("/api/publish/text")
async def publish_text(req: TextRequest):
    task_id = str(uuid.uuid4())
    state   = make_initial_state(
        title=req.title, body=req.body, platforms=req.platforms,
        raw_text=f"标题：{req.title or ''}\n正文：{req.body or ''}",
    )
    config  = {"configurable": {"thread_id": task_id}}
    tasks[task_id] = {"state": state, "config": config, "status": "running"}
    asyncio.create_task(_run(task_id, state, config))
    return {"task_id": task_id}

@app.get("/api/task/{task_id}")
async def get_task(task_id: str):
    t = tasks.get(task_id)
    if not t:
        return {"error": "not found"}
    return {
        "status":             t.get("status"),
        "adapted_results":    t["state"].get("adapted_results", {}),
        "compliance_summary": t["state"].get("compliance_summary", {}),
        "has_blocking_issues":t["state"].get("has_blocking_issues", False),
        "execution_log":      t["state"].get("execution_log", []),
        "final_summary":      t["state"].get("final_summary"),
    }

@app.post("/api/confirm")
async def confirm(req: ConfirmRequest):
    t = tasks.get(req.task_id)
    if not t:
        return {"error": "not found"}
    t["state"]["confirmed"]    = req.confirmed
    t["state"]["abort"]        = not req.confirmed
    t["state"]["skip_blocked"] = req.skip_blocked
    asyncio.create_task(_resume(req.task_id))
    return {"ok": True}

@app.post("/api/apply-fix")
async def apply_fix(req: ApplyFixRequest):
    """用户接受自动修复结果，将 auto_fixed_text 写入 adapted_body"""
    t = tasks.get(req.task_id)
    if not t:
        return {"error": "not found"}
    compliance = t["state"]["compliance_summary"].get(req.platform, {})
    fixed_text = compliance.get("auto_fixed_text")
    if fixed_text:
        t["state"]["adapted_results"][req.platform]["adapted_body"] = fixed_text
        t["state"]["adapted_results"][req.platform]["status"] = "confirmed"
        compliance["passed"] = True
        compliance["risk_level"] = "low"
    return {"ok": True, "applied": bool(fixed_text)}

@app.get("/api/session/{platform}/status")
async def session_status(platform: str):
    return {"valid": await is_session_valid(platform)}

@app.post("/api/session/{platform}/login")
async def login_platform(platform: str):
    success = await save_session(platform)
    return {"success": success}

async def _run(task_id, state, config):
    try:
        async for chunk in graph.astream(state, config):
            tasks[task_id]["state"].update(list(chunk.values())[-1])
        tasks[task_id]["status"] = "awaiting_confirm"
    except Exception as e:
        tasks[task_id]["status"] = "error"
        tasks[task_id]["error"]  = str(e)

async def _resume(task_id):
    t = tasks[task_id]
    try:
        async for chunk in graph.astream(None, t["config"]):
            t["state"].update(list(chunk.values())[-1])
        t["status"] = "done"
    except Exception as e:
        t["status"] = "error"
```

---

### 3.22 frontend/src/components/ComplianceReport.jsx

```jsx
/**
 * 合规检查报告组件
 * 展示每个平台的检查结果，支持一键应用自动修复
 */
const RISK_COLOR = {
  safe:   "#69db7c",
  low:    "#a9e34b",
  medium: "#ffa94d",
  high:   "#ff6b6b",
};
const RISK_LABEL = { safe:"安全", low:"低风险", medium:"中风险", high:"高风险" };
const SEV_COLOR  = { error:"#ff6b6b", warning:"#ffa94d", info:"#74c0fc" };
const SEV_LABEL  = { error:"❌ 必须修改", warning:"⚠ 建议修改", info:"ℹ 提示" };

export default function ComplianceReport({ summary, taskId, onFixApplied }) {
  if (!summary || Object.keys(summary).length === 0) return null;

  const PNAMES = {
    wechat:"公众号", zhihu:"知乎", xiaohongshu:"小红书", bilibili:"B站"
  };

  async function applyFix(platform) {
    await fetch(`/api/apply-fix`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: taskId, platform }),
    });
    onFixApplied?.(platform);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {Object.entries(summary).map(([pid, cr]) => (
        <div key={pid} style={{
          background:"#16161a",
          border:`1px solid ${RISK_COLOR[cr.risk_level]}33`,
          borderRadius:10, padding:"14px 16px",
        }}>
          {/* 平台标题行 */}
          <div style={{ display:"flex", justifyContent:"space-between",
                        alignItems:"center", marginBottom:10 }}>
            <span style={{ fontWeight:500, fontSize:14 }}>
              {PNAMES[pid] || pid}
            </span>
            <span style={{
              fontSize:11, padding:"3px 9px", borderRadius:20, fontWeight:600,
              background:`${RISK_COLOR[cr.risk_level]}22`,
              color: RISK_COLOR[cr.risk_level],
            }}>
              {RISK_LABEL[cr.risk_level]}
            </span>
          </div>

          {/* 问题列表 */}
          {cr.issues.length === 0 ? (
            <div style={{ fontSize:12, color:"#69db7c" }}>✓ 未发现问题，可直接发布</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {cr.issues.map((issue, i) => (
                <div key={i} style={{
                  fontSize:12, padding:"6px 10px",
                  background:"#0d0d0f", borderRadius:6,
                  borderLeft:`2px solid ${SEV_COLOR[issue.severity]}`,
                  color:"#aaa", lineHeight:1.6,
                }}>
                  <span style={{ color: SEV_COLOR[issue.severity], fontWeight:500 }}>
                    {SEV_LABEL[issue.severity]}
                  </span>
                  {issue.word && (
                    <span style={{
                      margin:"0 6px", padding:"1px 6px", borderRadius:4,
                      background:"#ffffff11", color:"#ff9999",
                      fontFamily:"monospace",
                    }}>
                      {issue.word}
                    </span>
                  )}
                  <span>{issue.suggestion}</span>
                </div>
              ))}
            </div>
          )}

          {/* 自动修复按钮 */}
          {cr.auto_fixed_text && !cr.passed && (
            <button
              onClick={() => applyFix(pid)}
              style={{
                marginTop:10, padding:"7px 14px", fontSize:12,
                background:"rgba(200,245,90,0.1)", border:"1px solid #c8f55a55",
                borderRadius:6, color:"#c8f55a", cursor:"pointer", width:"100%",
              }}
            >
              ✦ 应用 AI 自动修复版本
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

### 3.23 frontend/package.json

```json
{
  "name": "prism-frontend",
  "version": "0.1.0",
  "scripts": {
    "dev":   "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react":     "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.3.0"
  }
}
```

---

## 四、扩展新平台（3步）

```
Step 1  backend/platforms/[name].py
        继承 PlatformAdapter，实现：
        - navigate_to_editor(page)
        - fill_content(page, title, body, tags)
        - submit(page)

Step 2  backend/platforms/registry.py
        from .[name] import [Name]Adapter
        PLATFORM_REGISTRY["[name]"] = [Name]Adapter()

Step 3  backend/compliance/rules/registry.py
        添加该平台的规则列表（可复用 global_rules.py 中的规则）
        RULES_REGISTRY["[name]"] = [TitleLengthRule(50), ...]

完成。其余代码无需改动。
```

---

## 五、安装与启动

```bash
# 1. 克隆 / 初始化项目
cd prism

# 2. 后端依赖
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，填入 DASHSCOPE_API_KEY

# 4. 启动后端
uvicorn main:app --reload --port 8000

# 5. 前端
cd ../frontend
npm install && npm run dev
# 访问 http://localhost:5173
```

---

## 六、首次使用流程

```
1. 打开 http://localhost:5173
2. 进入"账号管理"，对每个平台点击"登录"
   → 浏览器弹窗，用户手动登录
   → 完成后按回车，Cookie 加密保存
3. 输入内容（文字 或 按住麦克风语音）
4. 点击「AI 适配 + 检查」
5. 查看各平台适配预览 + 合规报告
   → 有问题：点「AI 自动修复」或手动编辑
6. 确认后自动发布，TTS 播报结果
```

---

## 七、合规检查三层架构总结

```
Layer 1  关键词匹配   本地词库    <5ms    覆盖明确违禁词
Layer 2  正则规则     平台定制    <5ms    覆盖格式/长度/引流等规则
Layer 3  LLM语义      Qwen-max   ~2s     覆盖隐晦违规（仅前两层无error时触发）

自动修复  LLM替换      Qwen-max   ~1s     敏感词替换，保留原语义
```

