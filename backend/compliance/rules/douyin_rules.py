"""抖音图文平台合规规则"""
from .global_rules import (
    TitleLengthRule, BodyLengthRule,
    PricePromotionRule, NoExternalLinkRule,
)

DOUYIN_RULES = [
    TitleLengthRule(max_len=55),
    BodyLengthRule(max_len=2200),
    NoExternalLinkRule(),
    PricePromotionRule(),
]
