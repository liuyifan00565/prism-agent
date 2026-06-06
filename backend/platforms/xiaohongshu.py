import asyncio
from playwright.async_api import Page
from .base import PlatformAdapter

EDITOR_URL = "https://creator.xiaohongshu.com/publish/publish"
LOGIN_URL  = "https://creator.xiaohongshu.com/login"


class XiaohongshuAdapter(PlatformAdapter):
    platform_id   = "xiaohongshu"
    platform_name = "小红书"
    char_limit    = 1000
    has_tags      = True
    style_desc    = "种草笔记风格，语气亲切，标题加emoji，多分点列举，字数800字以内"
    publish_url   = EDITOR_URL

    async def navigate_to_editor(self, page: Page) -> None:
        import pathlib as _pl, datetime as _dt

        async def _shot(label: str):
            try:
                d = _pl.Path.home() / ".prism" / "debug"
                d.mkdir(parents=True, exist_ok=True)
                ts = _dt.datetime.now().strftime("%H%M%S")
                await page.screenshot(
                    path=str(d / f"xhs_{ts}_{label}.png"), full_page=False
                )
            except Exception:
                pass

        await page.goto(EDITOR_URL, wait_until="domcontentloaded", timeout=30000)
        try:
            await page.wait_for_load_state("load", timeout=15000)
        except Exception:
            pass
        if "login" in page.url or "signin" in page.url:
            raise Exception("xiaohongshu_session_expired")

        await _shot("nav1_loaded")

        # ── Step 1: 只在「新的创作」尚不可见时才点「写长文」tab ──
        # （如果页面已记住上次 tab，直接停在落地页就不用再点）
        try:
            already_there = await page.locator("text=新的创作").count() > 0
        except Exception:
            already_there = False

        if not already_there:
            try:
                await page.wait_for_selector("text=写长文", timeout=15000)
                await page.evaluate("""() => {
                    for (const el of document.querySelectorAll('*')) {
                        if (el.childElementCount === 0 &&
                            el.textContent.trim() === '写长文') {
                            el.click(); return;
                        }
                    }
                }""")
                await asyncio.sleep(2.5)
            except Exception:
                pass

        await _shot("nav2_after_tab")

        # ── Step 2: 等「新的创作」按钮出现后点击进编辑器 ─────────
        try:
            await page.wait_for_selector("text=新的创作", timeout=10000)
            await page.evaluate("""() => {
                for (const el of document.querySelectorAll(
                        'button, a, [role="button"]')) {
                    if (el.textContent.includes('新的创作')) {
                        el.click(); return;
                    }
                }
            }""")
            try:
                await page.wait_for_load_state("domcontentloaded", timeout=10000)
            except Exception:
                pass
            await asyncio.sleep(2.5)
        except Exception:
            pass

        await _shot("nav3_after_create")

        # ── Step 3: 等编辑器出现 ──────────────────────────────────
        if "login" in page.url or "signin" in page.url:
            raise Exception("xiaohongshu_session_expired")
        try:
            await page.wait_for_selector(
                'input, textarea, [contenteditable="true"], .ql-editor',
                timeout=15000,
            )
        except Exception:
            if "login" in page.url or "signin" in page.url:
                raise Exception("xiaohongshu_session_expired")
            raise Exception(
                f"xiaohongshu_editor_not_found: URL={page.url} "
                f"截图保存于 ~/.prism/debug/"
            )

    async def fill_content(self, page: Page, title: str, body: str, tags: list, video_path: str = None) -> None:
        # navigate_to_editor 已完成：写长文 tab → 新的创作 → 编辑器加载好
        # 直接填写内容即可

        # 1. 找标题输入框
        title_el     = None
        title_is_inp = False
        for sel in [
            'input[placeholder*="标题"]',
            'textarea[placeholder*="标题"]',
            '[contenteditable][placeholder*="标题"]',
            '[contenteditable][data-placeholder*="标题"]',
            '[class*="title"] input',
            '[class*="title"] textarea',
            '[class*="title"][contenteditable="true"]',
            '[class*="Title"] input',
            '[class*="Title"][contenteditable="true"]',
            'input[type="text"]',
        ]:
            try:
                loc = page.locator(sel).first
                if await loc.count() > 0:
                    await loc.wait_for(state="visible", timeout=3000)
                    tn = await loc.evaluate("el => el.tagName")
                    title_el     = loc
                    title_is_inp = tn in ("INPUT", "TEXTAREA")
                    break
            except Exception:
                continue

        if title_el is None:
            # 探测可见输入元素辅助调试
            try:
                debug_els = await page.evaluate("""() =>
                    Array.from(document.querySelectorAll('input,textarea,[contenteditable="true"]'))
                    .filter(el => el.offsetWidth > 0)
                    .slice(0,8).map(el => ({
                        tag: el.tagName,
                        ph: el.placeholder || el.getAttribute('data-placeholder') || '',
                        cls: el.className.slice(0, 60)
                    }))
                """)
            except Exception:
                debug_els = []
            raise Exception(
                f"找不到标题输入框。URL={page.url} "
                f"可见元素={debug_els}"
            )

        # 2. 填写标题
        await title_el.click()
        if title_is_inp:
            await title_el.fill("")
        else:
            await page.keyboard.press("Control+a")
            await page.keyboard.press("Delete")
        await page.keyboard.type(title, delay=30)
        await asyncio.sleep(0.3)

        # 3. 填写正文（Quill 编辑器；若标题也是 contenteditable 则取第二个）
        editor_loc = page.locator('.ql-editor').first
        if await editor_loc.count() == 0:
            all_ce = page.locator('[contenteditable="true"]')
            cnt    = await all_ce.count()
            editor_loc = all_ce.nth(1) if cnt >= 2 else all_ce.first
        try:
            await editor_loc.wait_for(state="visible", timeout=10000)
        except Exception:
            pass
        await editor_loc.click()
        await asyncio.sleep(0.2)
        await page.keyboard.press("Control+a")
        await page.keyboard.press("Delete")
        await page.keyboard.type(body, delay=15)
        await asyncio.sleep(0.5)

        # 4. 插入话题标签
        for tag in (tags or [])[:5]:
            tag_btn = page.locator(
                'button:has-text("话题"), [class*="topic"], [placeholder*="话题"]'
            )
            if await tag_btn.count() > 0:
                await tag_btn.first.click()
                await asyncio.sleep(0.3)
                search_input = page.locator('input[placeholder*="搜索话题"]')
                if await search_input.count() > 0:
                    await search_input.fill(tag.lstrip("#"))
                    await asyncio.sleep(0.8)
                    first_result = page.locator('[class*="topic-item"]').first
                    if await first_result.count() > 0:
                        await first_result.click()
                        await asyncio.sleep(0.3)

    async def submit(self, page: Page, assist_fn=None, body: str = "", title: str = "", tags=None, **kwargs) -> None:
        import pathlib as _pl, datetime as _dt, base64 as _b64

        async def _shot(label: str):
            try:
                d = _pl.Path.home() / ".prism" / "debug"
                d.mkdir(parents=True, exist_ok=True)
                ts = _dt.datetime.now().strftime("%H%M%S")
                await page.screenshot(
                    path=str(d / f"xhs_{ts}_{label}.png"), full_page=False
                )
            except Exception:
                pass

        # ── 小红书长文发布流程 ────────────────────────────────────
        # 编辑器 →[一键排版]→ 选择模板页 →[下一步]→ 发布设置页 →[发布]→ 成功

        # ── Step 1: 点「一键排版」 ───────────────────────────────
        layout_btn = page.locator('button:has-text("一键排版")').first
        if await layout_btn.count() > 0:
            try:
                await layout_btn.wait_for(state="visible", timeout=10000)
                await layout_btn.click()
                # 等待模板加载完成（「下一步」按钮出现）
                await page.wait_for_selector(
                    'button:has-text("下一步")', timeout=20000
                )
                await asyncio.sleep(1.5)
            except Exception:
                await asyncio.sleep(2.5)
        await _shot("submit1_after_layout")

        # ── Step 2: 模板选择 — 通过点击右侧面板的分类标题切换风格 ──
        # 关键约束：只在视口右半部分操作，避免误触左侧文章内容预览图
        has_next = await page.locator('button:has-text("下一步")').count() > 0
        if has_next:
            await _shot("submit2_before_template")
            try:
                sel_result = await page.evaluate("""
                    ([articleTitle, articleBody]) => {
                        const text = (articleTitle + ' ' + articleBody).toLowerCase();
                        // 映射：内容特征关键词 → XHS 模板分类名称（右侧面板显示的真实文字）
                        const styleMap = [
                            { style: '杂志先锋', kws: ['设计','科技','产品','商业','学术','研究',
                                                       '数据','比赛','答辩','算法','开发','工程','系统'] },
                            { style: '交叉拼补', kws: ['美妆','穿搭','潮流','时尚','护肤','彩妆',
                                                       '种草','旅行','美食','生活','日记'] },
                            { style: '黑白段落', kws: ['知识','经验','教程','教学','干货','方法',
                                                       '技巧','攻略','指南','总结','心理','健康'] },
                        ];

                        let targetStyle = null;
                        for (const { style, kws } of styleMap) {
                            if (kws.some(k => text.includes(k))) {
                                targetStyle = style; break;
                            }
                        }
                        if (!targetStyle) return 'no_match';

                        // 只在视口右半部分（x > 50%）查找分类标题元素
                        const halfW = window.innerWidth / 2;
                        const candidates = Array.from(
                            document.querySelectorAll('div,span,p,button,li,a')
                        );
                        for (const el of candidates) {
                            if (el.textContent.trim() !== targetStyle) continue;
                            if (el.offsetWidth === 0 || el.offsetHeight === 0) continue;
                            const rect = el.getBoundingClientRect();
                            if (rect.x < halfW) continue;   // 必须在右半区
                            el.click();
                            return 'clicked:' + targetStyle;
                        }
                        return 'not_found:' + targetStyle;
                    }
                """, [title or "", body[:300] if body else ""])
                if sel_result and sel_result.startswith("clicked:"):
                    await asyncio.sleep(1.2)
                    print(f"[xiaohongshu] ✓ Agent 切换模板分类: {sel_result}", flush=True)
                else:
                    print(f"[xiaohongshu] 模板分类未切换 ({sel_result})，保留默认", flush=True)
            except Exception as _te:
                print(f"[xiaohongshu] 模板选择异常: {_te}，使用默认模板", flush=True)
            await _shot("submit2_after_template")

        # ── Step 3: 点击「下一步」并验证已到达发布设置页 ──────────
        # 验证依据：发布设置页有描述文本框；模板页的「下一步」会消失
        await _shot("submit3_before_next")
        next_btn = page.locator('button:has-text("下一步")').first
        navigated_to_settings = False

        if await next_btn.count() > 0:
            # 等按钮从「加载/禁用」态变为可点击（最多12秒）
            for _ in range(24):
                try:
                    disabled = await next_btn.get_attribute("disabled")
                    cls      = await next_btn.get_attribute("class") or ""
                    if disabled is None and "loading" not in cls.lower() and "disabled" not in cls.lower():
                        break
                except Exception:
                    break
                await asyncio.sleep(0.5)

            # 最多尝试3次点击，每次验证是否成功跳转
            for _attempt in range(3):
                try:
                    await next_btn.click(timeout=5000)
                except Exception:
                    try:
                        await next_btn.click(force=True, timeout=3000)
                    except Exception:
                        pass
                await asyncio.sleep(4.0)    # 等页面渲染

                # 验证是否到达发布设置页
                # 唯一可靠标准：「下一步」按钮消失（已离开模板选择页）
                # 注意：不能用「发布」按钮出现作为依据，因为侧边栏「发布笔记」始终存在
                next_gone = await page.evaluate("""() =>
                    !Array.from(document.querySelectorAll('button')).some(
                        b => b.textContent.trim() === '下一步' && b.offsetWidth > 0
                    )
                """)

                if next_gone:
                    navigated_to_settings = True
                    print(f"[xiaohongshu] ✓ 已进入发布设置页（第{_attempt+1}次点击）", flush=True)
                    break
                print(f"[xiaohongshu] 下一步第{_attempt+1}次点击后仍在模板页，重试...", flush=True)

        if not navigated_to_settings:
            if await next_btn.count() > 0:
                raise Exception("「下一步」点击3次后未能离开模板页，请检查是否有模板被正确选中")
        await _shot("submit3_after_next")

        # ── Step 4: 发布设置页 → 填写正文描述（若为空）───────────
        # 此页有单独的「正文描述」文本框，需要把文章内容填入
        if body:
            try:
                desc_sel = (
                    'textarea[placeholder*="正文"],'
                    'textarea[placeholder*="描述"],'
                    '[contenteditable][placeholder*="描述"],'
                    '[contenteditable][placeholder*="正文"]'
                )
                desc_el = page.locator(desc_sel).first
                if await desc_el.count() > 0:
                    await desc_el.wait_for(state="visible", timeout=8000)
                    current = await desc_el.input_value() if await desc_el.evaluate(
                        "el => el.tagName"
                    ) == "TEXTAREA" else await desc_el.inner_text()
                    if not current.strip():
                        # 截断到平台允许的描述字数上限（1000字）
                        desc_text = body[:1000]
                        await desc_el.click()
                        await page.keyboard.press("Control+a")
                        await page.keyboard.press("Delete")
                        await page.keyboard.type(desc_text, delay=8)
                        await asyncio.sleep(0.5)
            except Exception:
                pass

        # ── Step 4.5: 失焦 + 滚动到底部，确保发布按钮可见 ──────
        # 说明：描述文本框的工具栏（话题/用户/表情）激活时会遮挡底部操作栏。
        # 必须先 blur 再滚动，才能让「发布」按钮出现在可见区域。
        try:
            await page.evaluate("() => { document.activeElement?.blur() }")
            await asyncio.sleep(0.4)
            await page.keyboard.press("Escape")   # 关闭任何浮层
            await asyncio.sleep(0.3)
            await page.evaluate(
                "() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })"
            )
            await asyncio.sleep(0.5)
        except Exception:
            pass
        await _shot("submit5_before_publish")

        # ── Step 5: 点「发布」按钮 ──────────────────────────────
        # 安全检查：如果仍处于模板选择页（存在「下一步」按钮），禁止继续
        # 否则会误触侧边栏「发布笔记」按钮导致跳到视频上传页
        on_template_page = await page.evaluate("""() =>
            Array.from(document.querySelectorAll('button')).some(
                b => b.textContent.trim() === '下一步' && b.offsetWidth > 0
            )
        """)
        if on_template_page:
            raise Exception("仍处于模板选择页，「下一步」未能成功跳转到发布设置页")

        # ── 等待「笔记图片生成中」toast 消失（最多 30 秒）──────
        # XHS 在排版后需要生成封面图片，此时「发布」按钮通常为禁用态。
        # 必须等生成完成后才能点击，否则点击无效。
        print("[xiaohongshu] 等待图片生成完成...", flush=True)
        for _ in range(60):        # 最多 30 秒
            try:
                has_toast = await page.evaluate("""() =>
                    document.body.innerText.includes('笔记图片生成中') ||
                    document.body.innerText.includes('图片生成中')
                """)
                if not has_toast:
                    break
            except Exception:
                break
            await asyncio.sleep(0.5)
        await asyncio.sleep(1.0)   # 额外稳定等待
        await _shot("submit5_after_image_gen")

        # ── 按 Escape 关闭任何浮层/弹窗（包括浏览器权限弹窗残留影响）──
        try:
            await page.keyboard.press("Escape")
            await asyncio.sleep(0.3)
            await page.evaluate("() => { document.activeElement?.blur() }")
            await asyncio.sleep(0.2)
        except Exception:
            pass

        # ── 滚动到页面底部（window + 所有滚动容器），确保底部操作栏可见 ──
        await page.evaluate("""() => {
            window.scrollTo({top: document.body.scrollHeight, behavior: 'instant'});
            // 同时滚动所有可滚动容器
            document.querySelectorAll('*').forEach(el => {
                if (el.scrollHeight > el.clientHeight + 10) {
                    el.scrollTop = el.scrollHeight;
                }
            });
        }""")
        await asyncio.sleep(0.6)

        # ── 等待主内容区的「发布」按钮出现（最多 10 秒）──────────
        # NAV_WIDTH = 230: 左侧导航宽约 220px，主内容从 230px 开始
        # 精确匹配：只接受文字完全等于「发布」「立即发布」「确认发布」的元素
        try:
            await page.wait_for_function("""() => {
                const NAV_WIDTH = 230;
                return Array.from(document.querySelectorAll('*')).some(el => {
                    const t = (el.innerText || el.textContent || '').trim();
                    if (t !== '发布' && t !== '立即发布' && t !== '确认发布') return false;
                    if (el.offsetWidth === 0 || el.offsetHeight === 0) return false;
                    const rect = el.getBoundingClientRect();
                    return rect.x >= NAV_WIDTH;
                });
            }""", timeout=10000)
            print("[xiaohongshu] ✓ 发布按钮已出现在主内容区", flush=True)
        except Exception:
            print("[xiaohongshu] ⚠ 等待发布按钮超时，尝试直接点击...", flush=True)

        # ── 诊断：打印所有含「发布」的短文字元素（含坐标、背景色）──
        # 诊断用宽松过滤（仅用于打印日志，不用于点击）
        _pub_diag = []
        try:
            _pub_diag = await page.evaluate("""() => {
                return Array.from(document.querySelectorAll('*'))
                    .filter(el => {
                        const t = (el.innerText || el.textContent || '').trim();
                        return t.includes('发布') && t.length <= 10;
                    })
                    .filter(el => el.offsetWidth > 0 && el.offsetHeight > 0)
                    .map(el => {
                        const rect = el.getBoundingClientRect();
                        const bg = window.getComputedStyle(el).backgroundColor;
                        return {
                            tag: el.tagName, cls: el.className.slice(0, 40),
                            text: (el.innerText || el.textContent || '').trim().slice(0, 12),
                            x: Math.round(rect.x), y: Math.round(rect.y),
                            w: Math.round(rect.width), h: Math.round(rect.height),
                            bg: bg,
                        };
                    });
            }""")
            print(f"[xiaohongshu] 发布候选元素(含导航): {_pub_diag}", flush=True)
        except Exception as _de:
            print(f"[xiaohongshu] 诊断失败: {_de}", flush=True)

        # ── 点击策略 ──────────────────────────────────────────────
        # ⚠ 关键原则：全程使用 page.mouse.click() 而非 el.click()。
        #   el.click() 产生 event.isTrusted=false，XHS React 事件处理会忽略不信任事件。
        #   page.mouse.click() 产生真实 OS 鼠标事件，isTrusted=true，React 正常响应。
        #
        # 导航约束：XHS 左侧导航宽约 220px，发布按钮在 x >= 230 的主内容区。
        # 精确文字匹配：只接受 '发布'/'立即发布'/'确认发布'，避免误触「定时发布」等。
        NAV_W = 230
        clicked = False

        # ── 获取发布按钮坐标的公共 JS（精确文字 + 位置过滤 + Y 排序）──
        _FIND_JS = """(navW) => {
            const isTarget = t => t === '发布' || t === '立即发布' || t === '确认发布';
            const cands = Array.from(document.querySelectorAll('*'))
                .filter(el => isTarget((el.innerText || el.textContent || '').trim()))
                .filter(el => el.offsetWidth > 0 && el.offsetHeight > 0)
                .map(el => {
                    const r = el.getBoundingClientRect();
                    return { cx: r.x + r.width/2, cy: r.y + r.height/2,
                             x: Math.round(r.x), y: Math.round(r.y),
                             w: Math.round(r.width), h: Math.round(r.height) };
                })
                .filter(c => c.x >= navW && c.y >= 0 && c.y < window.innerHeight + 100);
            if (!cands.length) return null;
            cands.sort((a, b) => b.y - a.y);   // 选 Y 最大（最靠底部）的元素
            return { x: Math.round(cands[0].cx), y: Math.round(cands[0].cy) };
        }"""

        # 策略1: JS 精确文字匹配 → 坐标 → page.mouse.click()（isTrusted=true）
        if not clicked:
            try:
                coords = await page.evaluate(_FIND_JS, NAV_W)
                if coords:
                    print(f"[xiaohongshu] 策略1: mouse.click({coords['x']}, {coords['y']})", flush=True)
                    await page.mouse.move(coords['x'], coords['y'])
                    await asyncio.sleep(0.1)
                    await page.mouse.click(coords['x'], coords['y'])
                    clicked = True
            except Exception as _e:
                print(f"[xiaohongshu] 策略1失败: {_e}", flush=True)

        # 策略2: Playwright locator（Playwright 内置鼠标事件，isTrusted=true）
        # 逐个检查位置，跳过导航区元素
        if not clicked:
            for loc_expr in [
                'button:has-text("立即发布")',
                'button:has-text("确认发布")',
                'button:text-is("发布")',
                '[class*="publish"]:text-is("发布")',
                '[class*="btn"]:text-is("发布")',
                'div:text-is("发布")',
                'span:text-is("发布")',
            ]:
                try:
                    loc = page.locator(loc_expr)
                    cnt = await loc.count()
                    for i in range(cnt - 1, -1, -1):
                        try:
                            bbox = await loc.nth(i).bounding_box()
                            if bbox and bbox['x'] >= NAV_W:
                                await loc.nth(i).scroll_into_view_if_needed()
                                await loc.nth(i).click(timeout=5000)
                                clicked = True
                                print(f"[xiaohongshu] 策略2: {loc_expr} [{i}] clicked", flush=True)
                                break
                        except Exception:
                            continue
                    if clicked:
                        break
                except Exception:
                    continue

        # 策略3: 红色背景（XHS 品牌红 #FF2442）→ 坐标 → page.mouse.click()
        if not clicked:
            try:
                coords = await page.evaluate("""(navW) => {
                    const all = Array.from(document.querySelectorAll('*')).reverse();
                    for (const el of all) {
                        if (el.offsetWidth === 0 || el.offsetHeight === 0) continue;
                        const t = (el.innerText || el.textContent || '').trim();
                        if (t !== '发布' && t !== '立即发布' && t !== '确认发布') continue;
                        const rect = el.getBoundingClientRect();
                        if (rect.x < navW || rect.y < 0 || rect.y > window.innerHeight + 100) continue;
                        const bg = window.getComputedStyle(el).backgroundColor;
                        const m = bg.match(/rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)\\)/);
                        if (m && parseInt(m[1]) > 180 && parseInt(m[2]) < 80 && parseInt(m[3]) < 80) {
                            return { x: Math.round(rect.x + rect.width/2),
                                     y: Math.round(rect.y + rect.height/2) };
                        }
                    }
                    return null;
                }""", NAV_W)
                if coords:
                    print(f"[xiaohongshu] 策略3(红色): mouse.click({coords['x']}, {coords['y']})", flush=True)
                    await page.mouse.move(coords['x'], coords['y'])
                    await asyncio.sleep(0.1)
                    await page.mouse.click(coords['x'], coords['y'])
                    clicked = True
            except Exception as _e:
                print(f"[xiaohongshu] 策略3失败: {_e}", flush=True)

        # 策略4: 固定坐标兜底 — 按 1280×800 视口中发布按钮的已知位置点击
        # XHS 发布设置页底部操作栏是 position:fixed，发布按钮始终在视口底部右侧。
        # 从截图实测：视口 1280×800，发布按钮中心约在 (693, 754)。
        if not clicked:
            try:
                vw = await page.evaluate("() => window.innerWidth")
                vh = await page.evaluate("() => window.innerHeight")
                # 发布按钮约在宽度 54%、距底部 46px 处
                fx = int(vw * 0.54)
                fy = vh - 46
                print(f"[xiaohongshu] 策略4(固定坐标): mouse.click({fx}, {fy})", flush=True)
                await page.mouse.move(fx, fy)
                await asyncio.sleep(0.1)
                await page.mouse.click(fx, fy)
                clicked = True
            except Exception as _e:
                print(f"[xiaohongshu] 策略4失败: {_e}", flush=True)

        if not clicked:
            await _shot("submit5_btn_debug")
            raise Exception(f"找不到发布按钮。诊断信息: {_pub_diag}")

        await asyncio.sleep(1.0)
        await _shot("submit6_after_click")    # 点击后立即截图，看是否有弹窗/错误

        # ── Step 6: 处理可能出现的确认/原创声明弹窗 ────────────
        for _popup_try in range(3):
            try:
                popup_btn = page.locator(
                    'button:has-text("确定"), '
                    'button:has-text("确认发布"), '
                    'button:has-text("同意"), '
                    'button:has-text("我知道了"), '
                    'button:has-text("继续发布")'
                )
                if await popup_btn.count() > 0:
                    await popup_btn.first.click()
                    await asyncio.sleep(0.8)
                else:
                    break
            except Exception:
                break
        await _shot("submit6_after_popup")

        # ── Step 7: 等待发布完成 ─────────────────────────────────
        # XHS 发布后行为多样：可能跳转、可能同 URL 显示成功态、可能显示 toast。
        # 策略：轮询 URL 变化 + 发布按钮消失 + toast 元素 + 页面文字，最多等 30 秒。
        #
        # ⚠ URL 变化规则：必须「离开」发布设置页才算成功。
        #   仅仅参数变化（仍在 publish/publish）不算成功，可能只是弹窗关闭。
        #
        # ⚠ 超时后抛出异常：全程使用 page.mouse.click()（isTrusted=true），
        #   若按钮被命中，React 会在 1~2 秒内响应（按钮消失 / 页面跳转）。
        #   30 秒无响应说明点击未命中目标，触发 executor 重试是安全的。
        url_before = page.url
        print(f"[xiaohongshu] 发布后开始轮询，当前 URL: {url_before}", flush=True)
        publish_done = False

        # 记录点击前「发布」按钮的位置，用于检测按钮是否消失（表示点击已被 React 处理）
        _btn_coords_before = None
        try:
            _btn_coords_before = await page.evaluate(_FIND_JS, NAV_W)
        except Exception:
            pass

        for tick in range(60):                 # 最多等 30 秒（60 × 0.5s）
            await asyncio.sleep(0.5)
            cur = page.url
            if cur != url_before:
                # 只有「离开发布设置页」才视为真正跳转成功
                # publish/publish 是发布设置页，停留在此页内的 URL 变化不算
                if "publish/publish" not in cur:
                    print(f"[xiaohongshu] ✓ 已离开发布页: {url_before} → {cur}", flush=True)
                    publish_done = True
                    break
                else:
                    # 仍在发布页（可能是弹窗关闭后 URL 参数变化），更新基准继续等
                    print(f"[xiaohongshu] URL 在发布页内变化，继续等待...", flush=True)
                    url_before = cur

            # 检测「发布」按钮是否消失 —— 说明点击已被 React 接收，正在处理中
            if _btn_coords_before:
                try:
                    _btn_now = await page.evaluate(_FIND_JS, NAV_W)
                    if _btn_now is None:
                        # 按钮消失：已进入提交/加载状态，继续等待跳转（但不立即 break）
                        print(f"[xiaohongshu] ✓ 发布按钮已消失，等待页面跳转...", flush=True)
                        _btn_coords_before = None   # 停止重复检测
                        # 给额外 5 秒等跳转
                        for _ in range(10):
                            await asyncio.sleep(0.5)
                            cur2 = page.url
                            if "publish/publish" not in cur2:
                                print(f"[xiaohongshu] ✓ 按钮消失后跳转: {cur2}", flush=True)
                                publish_done = True
                                break
                        if not publish_done:
                            # 按钮消失但未跳转 → 大概率已提交，视为成功
                            print("[xiaohongshu] ✓ 发布按钮消失，视为提交成功", flush=True)
                            publish_done = True
                        break
                except Exception:
                    pass

            # 页面文字含明确成功字样（精确：排除「已发布」「审核中」等发布前就存在的文字）
            try:
                body_text = await page.evaluate("() => document.body.innerText || ''")
                if any(kw in body_text for kw in ['发布成功', '提交成功', '笔记已发布']):
                    print(f"[xiaohongshu] ✓ 检测到成功文字", flush=True)
                    publish_done = True
                    break
                # 若页面出现明确失败提示，立刻报错（只有这种情况才重试才有意义）
                if any(kw in body_text for kw in ['发布失败', '提交失败', '网络异常', '系统错误']):
                    await _shot("submit7_error")
                    raise Exception(f"XHS 发布失败：页面出现错误提示")
            except Exception as _e:
                if '发布失败' in str(_e) or '提交失败' in str(_e):
                    raise
            # Toast/success 元素即时检查
            try:
                if await page.locator(
                    '[class*="success"], '
                    '[class*="toast"]:has-text("成功")'
                ).first.is_visible():
                    publish_done = True
                    break
            except Exception:
                pass
            # 每隔 5 秒保存一次截图
            if tick % 10 == 9:
                await _shot(f"submit7_waiting_{tick // 10}")

        if not publish_done:
            await _shot("submit7_timeout")
            # ⚠ 30 秒内无任何响应（URL 未变、按钮未消失、无成功文字）
            # → 点击未命中目标。抛出异常让 executor 重试（重试仍在同页面，会再次尝试点击）。
            raise Exception(
                "发布按钮点击后 30 秒内页面无跳转、按钮未消失、无成功提示，"
                "疑似点击未命中目标，触发重试"
            )
