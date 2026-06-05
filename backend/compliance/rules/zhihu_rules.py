from .global_rules import TitleLengthRule, BodyLengthRule, NoExternalLinkRule

ZHIHU_RULES = [
    TitleLengthRule(max_len=50),
    BodyLengthRule(max_len=10000),
    NoExternalLinkRule(),
]
