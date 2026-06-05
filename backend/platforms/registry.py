from .wechat       import WechatAdapter
from .zhihu        import ZhihuAdapter
from .xiaohongshu  import XiaohongshuAdapter
from .bilibili     import BilibiliAdapter
from .csdn         import CSDNAdapter
from .weibo        import WeiboAdapter
from .douyin       import DouyinAdapter

PLATFORM_REGISTRY = {
    "wechat":       WechatAdapter(),
    "zhihu":        ZhihuAdapter(),
    "xiaohongshu":  XiaohongshuAdapter(),
    "bilibili":     BilibiliAdapter(),
    "csdn":         CSDNAdapter(),
    "weibo":        WeiboAdapter(),
    "douyin":       DouyinAdapter(),
}
