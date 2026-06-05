from .global_rules import TitleLengthRule, BodyLengthRule, ExcessiveEmojiRule

BILIBILI_RULES = [
    TitleLengthRule(max_len=40),
    BodyLengthRule(max_len=2000),
    ExcessiveEmojiRule(),
]
