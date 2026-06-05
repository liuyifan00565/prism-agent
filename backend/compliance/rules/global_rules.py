import re
from typing import Optional, List
from .base import BaseRule
from agent.state import ComplianceIssue


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
