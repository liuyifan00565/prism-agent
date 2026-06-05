"""
内容模板存储
内置模板 + 用户自定义模板，保存在 ~/.prism/templates.json
"""
import json, uuid
from pathlib import Path
from datetime import datetime
from typing import List, Optional

TEMPLATES_FILE = Path.home() / ".prism" / "templates.json"

BUILTIN_TEMPLATES = [
    {
        "id":              "builtin_xhs",
        "name":            "小红书种草笔记",
        "is_builtin":      True,
        "target_platform": "xiaohongshu",
        "created_at":      "2025-01-01T00:00:00",
        "structure": (
            "【标题】吸引眼球的种草标题 ✨\n\n"
            "【开头】1-2句引起共鸣的场景描述\n\n"
            "【正文】\n"
            "✅ 亮点一：\n"
            "✅ 亮点二：\n"
            "✅ 亮点三：\n\n"
            "【使用感受】真实体验描述\n\n"
            "【总结】一句话推荐语\n\n"
            "#话题标签1 #话题标签2 #话题标签3"
        ),
    },
    {
        "id":              "builtin_zhihu",
        "name":            "知乎深度回答",
        "is_builtin":      True,
        "target_platform": "zhihu",
        "created_at":      "2025-01-01T00:00:00",
        "structure": (
            "【结论先行】直接给出核心观点\n\n"
            "【背景】为什么这个问题值得回答\n\n"
            "【分析】\n"
            "一、第一个论点\n（展开说明，附数据或案例）\n\n"
            "二、第二个论点\n（展开说明，附数据或案例）\n\n"
            "三、第三个论点\n（展开说明，附数据或案例）\n\n"
            "【总结】回扣结论，给出建议"
        ),
    },
    {
        "id":              "builtin_wechat",
        "name":            "公众号深度长文",
        "is_builtin":      True,
        "target_platform": "wechat",
        "created_at":      "2025-01-01T00:00:00",
        "structure": (
            "【引子】用一个故事或问题开头，引发读者共鸣\n\n"
            "【核心问题】点出本文要解决的问题\n\n"
            "【第一部分：现状】\n描述现状和痛点\n\n"
            "【第二部分：原因分析】\n深入分析为什么会这样\n\n"
            "【第三部分：解决方案】\n给出具体可行的方法\n\n"
            "【结尾】总结升华，引导关注"
        ),
    },
]


def _load_custom() -> List[dict]:
    if not TEMPLATES_FILE.exists():
        return []
    try:
        return json.loads(TEMPLATES_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []


def _save_custom(templates: List[dict]):
    TEMPLATES_FILE.parent.mkdir(parents=True, exist_ok=True)
    TEMPLATES_FILE.write_text(
        json.dumps(templates, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def get_all() -> List[dict]:
    return BUILTIN_TEMPLATES + _load_custom()


def save_template(
    name: str,
    structure: str,
    target_platform: Optional[str] = None,
) -> dict:
    t = {
        "id":              str(uuid.uuid4()),
        "name":            name,
        "is_builtin":      False,
        "structure":       structure,
        "target_platform": target_platform,
        "created_at":      datetime.now().isoformat(),
    }
    custom = _load_custom()
    custom.append(t)
    _save_custom(custom)
    return t


def delete_template(template_id: str) -> bool:
    custom = _load_custom()
    new = [t for t in custom if t["id"] != template_id]
    if len(new) == len(custom):
        return False        # builtin or not found
    _save_custom(new)
    return True
