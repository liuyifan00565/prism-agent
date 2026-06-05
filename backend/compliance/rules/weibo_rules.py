"""微博平台合规规则"""
import re
from typing import Optional, Union, List
from .base import BaseRule
from .global_rules import BodyLengthRule, PricePromotionRule
from agent.state import ComplianceIssue


class WeiboAtRule(BaseRule):
    """微博禁止批量@用户（营销行为）"""
    rule_name = "weibo_no_mass_at"

    def check(self, full_content: str, title: str, body: str) -> Optional[ComplianceIssue]:
        at_count = len(re.findall(r'@\S+', full_content))
        if at_count > 5:
            return ComplianceIssue(
                type="policy_violation",
                severity="warning",
                word=None,
                position=None,
                suggestion=f"@提及过多（{at_count}个），可能被判定为营销内容",
                rule_source=self.rule_name,
            )
        return None


WEIBO_RULES = [
    BodyLengthRule(max_len=2000),
    PricePromotionRule(),
    WeiboAtRule(),
]
