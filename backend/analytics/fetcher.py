"""
各平台互动数据抓取
通过 Playwright 加载已登录会话，访问创作者后台，截图后用通义 VLM 识别数据指标。

返回格式统一为：
{"likes": 0, "comments": 0, "favorites": 0, "views": 0, "shares": 0}
"""
import asyncio, base64, json
from typing import Optional

# 各平台数据页面 URL（以 content_url 优先；无 content_url 时降级到此处）
ANALYTICS_URLS = {
    "xiaohongshu": "https://creator.xiaohongshu.com/new-creator/data-center",
    "zhihu":       "https://www.zhihu.com/creator/manage/creation/article",
    "bilibili":    "https://member.bilibili.com/platform/upload-manager/article",
    "wechat":      "https://mp.weixin.qq.com/cgi-bin/appmsgpublish",
    "csdn":        "https://mp.csdn.net/mp_blog/manage/article",
    "weibo":       "https://weibo.com/p/aj/mblog/mybloglist",
    "douyin":      "https://creator.douyin.com/creator-micro/content/manage",
}

EMPTY_STATS = {"likes": 0, "comments": 0, "favorites": 0, "views": 0, "shares": 0}

VLM_PROMPT = (
    "请识别截图中的互动数据指标（点赞数、评论数、收藏数、阅读/播放量、转发/分享数）。"
    "找不到某项时填 0。"
    "只返回 JSON，不要其他任何内容：\n"
    '{"likes":0,"comments":0,"favorites":0,"views":0,"shares":0}'
)


async def fetch_platform_stats(
    platform: str,
    context,               # Playwright BrowserContext（已注入 Cookie）
    content_url: Optional[str] = None,
) -> dict:
    """
    访问平台页面，截图后用 VLM 识别互动数据。
    返回 {"likes", "comments", "favorites", "views", "shares"}，失败时全部返回 0。
    """
    url = content_url or ANALYTICS_URLS.get(platform, "")
    if not url:
        return dict(EMPTY_STATS)

    page  = await context.new_page()
    stats = dict(EMPTY_STATS)
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=20000)
        await asyncio.sleep(3)   # 等待数字渲染完毕
        screenshot_bytes = await page.screenshot(full_page=False)
        b64 = base64.b64encode(screenshot_bytes).decode()
        stats = await _vlm_extract(b64)
    except Exception:
        pass
    finally:
        await page.close()
    return stats


async def _vlm_extract(b64_image: str) -> dict:
    """调用通义 VLM (qwen-vl-max) 解析截图中的互动数据。"""
    try:
        from dashscope import MultiModalConversation
        resp = MultiModalConversation.call(
            model="qwen-vl-max",
            messages=[{
                "role": "user",
                "content": [
                    {"image": f"data:image/png;base64,{b64_image}"},
                    {"text":  VLM_PROMPT},
                ],
            }],
        )
        raw = resp.output.choices[0].message.content[0]["text"]
        raw = raw.strip().replace("```json", "").replace("```", "").strip()
        parsed = json.loads(raw)
        # 确保所有键都存在且为整数
        return {
            "likes":     int(parsed.get("likes",     0)),
            "comments":  int(parsed.get("comments",  0)),
            "favorites": int(parsed.get("favorites", 0)),
            "views":     int(parsed.get("views",     0)),
            "shares":    int(parsed.get("shares",    0)),
        }
    except Exception:
        return dict(EMPTY_STATS)


async def fetch_record_analytics(record: dict) -> dict:
    """
    为一条历史记录的所有成功平台抓取互动数据。
    每个平台独立抓取，失败不影响其他平台。

    record: PublishRecord.to_dict() 格式
    返回: {platform: {stats_dict, fetched_at}}
    """
    from datetime import datetime
    from playwright.async_api import async_playwright
    from session.manager import load_session

    platform_results = record.get("platform_results", {})
    targets = {
        pid: res.get("content_url")
        for pid, res in platform_results.items()
        if res.get("status") == "success"
    }

    if not targets:
        return {}

    result = {}
    fetched_at = datetime.now().isoformat()

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)

        for platform, content_url in targets.items():
            try:
                ctx = await browser.new_context(viewport={"width": 1280, "height": 800})
                await load_session(platform, ctx)
                stats = await fetch_platform_stats(platform, ctx, content_url)
                result[platform] = {"stats": stats, "fetched_at": fetched_at}
                await ctx.close()
            except Exception:
                result[platform] = {"stats": dict(EMPTY_STATS), "fetched_at": fetched_at}

        await browser.close()

    return result
