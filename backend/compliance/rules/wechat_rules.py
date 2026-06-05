from .global_rules import TitleLengthRule, BodyLengthRule, ExcessiveEmojiRule, PricePromotionRule

WECHAT_RULES = [
    TitleLengthRule(max_len=64),
    BodyLengthRule(max_len=20000),
    ExcessiveEmojiRule(),
    PricePromotionRule(),
]
