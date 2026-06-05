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
from agent.state import ComplianceIssue, ComplianceResult
from compliance.rules.registry import RULES_REGISTRY

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
