"""CSDN 平台合规规则"""
from .global_rules import TitleLengthRule, BodyLengthRule, PricePromotionRule

CSDN_RULES = [
    TitleLengthRule(max_len=100),
    BodyLengthRule(max_len=10000),
    PricePromotionRule(),
]
