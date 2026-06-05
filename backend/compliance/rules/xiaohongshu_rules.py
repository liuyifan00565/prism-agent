from .base import BaseRule
from .global_rules import NoExternalLinkRule, TitleLengthRule, BodyLengthRule, PricePromotionRule
from agent.state import ComplianceIssue
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
