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
    status: str        # pending | checking | confirmed | publishing | retrying | success | failed | blocked
    compliance: Optional[ComplianceResult]
    error: Optional[str]
    screenshot_path: Optional[str]
    retry_count: int              # 已重试次数，默认 0
    last_retry_at: Optional[str]  # 最后一次重试时间 ISO

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

    # 视频上传
    has_video: bool                # 是否包含视频
    video_path: Optional[str]      # 本地视频文件路径
    video_filename: Optional[str]  # 原始文件名

    # 流程控制
    confirmed: bool
    abort: bool
    skip_blocked: bool             # 跳过不通过的平台继续发布其他平台
    skip_adapt: bool               # 跳过AI适配和合规检查，直接使用原始文本
