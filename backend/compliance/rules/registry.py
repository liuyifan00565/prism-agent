from .global_rules import NoExternalLinkRule, TitleLengthRule, BodyLengthRule, PricePromotionRule, ExcessiveEmojiRule
from .xiaohongshu_rules import XIAOHONGSHU_RULES
from .csdn_rules         import CSDN_RULES
from .weibo_rules        import WEIBO_RULES
from .douyin_rules       import DOUYIN_RULES

# 扩展平台只需在这里添加规则列表
RULES_REGISTRY = {
    "wechat": [
        TitleLengthRule(max_len=64),
        BodyLengthRule(max_len=20000),
        ExcessiveEmojiRule(),
        PricePromotionRule(),
    ],
    "zhihu": [
        TitleLengthRule(max_len=50),
        BodyLengthRule(max_len=10000),
        NoExternalLinkRule(),
    ],
    "xiaohongshu": XIAOHONGSHU_RULES,
    "bilibili": [
        TitleLengthRule(max_len=40),
        BodyLengthRule(max_len=2000),
        ExcessiveEmojiRule(),
    ],
    "csdn":   CSDN_RULES,
    "weibo":  WEIBO_RULES,
    "douyin": DOUYIN_RULES,
    "juejin": [
        TitleLengthRule(max_len=60),
        BodyLengthRule(max_len=8000),
    ],
}
