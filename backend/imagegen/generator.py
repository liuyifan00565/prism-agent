"""
通义万相（Wanx）文生图 + 平台封面裁剪
"""
import asyncio, base64
import httpx
from dashscope import ImageSynthesis
from PIL import Image
from io import BytesIO
from typing import Dict, List

# 各平台封面宽高比（width_ratio, height_ratio）
PLATFORM_SIZES = {
    "xiaohongshu": (3,    4),    # 竖版 3:4
    "wechat":      (2.35, 1),    # 横版 2.35:1
    "bilibili":    (16,   9),    # 横版 16:9
    "zhihu":       (4,    3),    # 横版 4:3
    "weibo":       (1,    1),    # 方形 1:1
    "juejin":      (16,   9),
    "csdn":        (16,   9),    # 横版 16:9
    "douyin":      (9,   16),    # 竖版 9:16
}

OUTPUT_SHORT_SIDE = 800  # 短边像素


def build_image_prompt(title: str, body_excerpt: str) -> str:
    return (
        f"为文章《{title}》生成封面插图。"
        f"文章主题：{body_excerpt[:100]}。"
        "风格：现代简洁，信息图表感，适合新媒体平台，"
        "色调明亮，无文字水印，高清。"
    )


async def generate_image(prompt: str) -> bytes:
    """Call Wanx API; return raw image bytes."""
    resp = ImageSynthesis.call(
        model="wanx2.1-t2i-turbo",
        prompt=prompt,
        n=1,
        size="1024*1024",
    )
    image_url = resp.output.results[0].url
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(image_url)
        r.raise_for_status()
        return r.content


def crop_for_platform(image_bytes: bytes, platform: str) -> bytes:
    """Crop + resize image to the target platform aspect ratio."""
    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    w, h = img.size

    ratio_w, ratio_h = PLATFORM_SIZES.get(platform, (16, 9))
    target_ratio     = ratio_w / ratio_h
    current_ratio    = w / h

    if current_ratio > target_ratio:
        # Too wide — crop left/right
        new_w = int(h * target_ratio)
        left  = (w - new_w) // 2
        img   = img.crop((left, 0, left + new_w, h))
    else:
        # Too tall — crop top/bottom
        new_h = int(w / target_ratio)
        top   = (h - new_h) // 2
        img   = img.crop((0, top, w, top + new_h))

    # Scale to standard output size
    if target_ratio >= 1:
        out_size = (
            int(OUTPUT_SHORT_SIDE * target_ratio),
            OUTPUT_SHORT_SIDE,
        )
    else:
        out_size = (
            OUTPUT_SHORT_SIDE,
            int(OUTPUT_SHORT_SIDE / target_ratio),
        )
    img = img.resize(out_size, Image.LANCZOS)

    buf = BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


async def generate_cover_images(
    title: str,
    body: str,
    platforms: List[str],
) -> Dict[str, str]:
    """
    Generate one base image then crop for each platform.
    Returns {platform: base64_jpeg_string}.
    """
    prompt      = build_image_prompt(title, body[:300])
    image_bytes = await generate_image(prompt)

    result: Dict[str, str] = {}
    for platform in platforms:
        cropped           = crop_for_platform(image_bytes, platform)
        result[platform]  = base64.b64encode(cropped).decode()

    return result
