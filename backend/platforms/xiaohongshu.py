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

    async def fill_content(self, page: Page, title: str, body: str, tags: list) -> None:
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

        # ── Step 2: 模板选择页 ───────────────────────────────────
        # 询问用户：Agent帮选 or 用户自己选
        action = "continue"
        has_next = await page.locator('button:has-text("下一步")').count() > 0
        if has_next:
            if assist_fn is not None:
                try:
                    _s64 = ""
                    try:
                        _s = await page.screenshot(full_page=False)
                        _s64 = _b64.b64encode(_s).decode()
                    except Exception:
                        pass
                    action = await assist_fn(
                        "模板选择页已加载。\n"
                        "• 点「🤖 Agent帮我选」→ Agent 根据文章特色自动选择合适模板\n"
                        "• 点「✅ 我已选好」或直接在浏览器点击喜欢的模板 → Agent 立即继续",
                        _s64,
                    )
                except Exception:
                    pass

            # 若 Agent 帮选：扫描模板卡片，选第一个与文章气质匹配的
            if action == "agent_select":
                await _shot("submit2_agent_selecting")
                try:
                    selected = await page.evaluate(r"""
                        (articleTitle) => {
                            // 优先找与文章关键词相关的模板分类名
                            const keywords = {
                                '杂志': ['设计','美食','旅行','学术','科技','产品','商业'],
                                '清新': ['生活','日记','随笔','心情','植物','自然'],
                                '简约': ['知识','经验','教程','分享','干货'],
                                '活泼': ['美妆','穿搭','潮流','娱乐','游戏'],
                            };
                            let matchCategory = null;
                            const titleLower = articleTitle.toLowerCase();
                            for (const [cat, kws] of Object.entries(keywords)) {
                                if (kws.some(k => titleLower.includes(k))) {
                                    matchCategory = cat;
                                    break;
                                }
                            }

                            // 找所有可点击的模板缩略图
                            const cards = Array.from(document.querySelectorAll(
                                '[class*="template"] img, [class*="style"] img, ' +
                                '[class*="Template"] img, [class*="theme"] img, ' +
                                '[class*="card"] img, [class*="preview"] img'
                            )).filter(el => el.offsetWidth > 0 && el.offsetHeight > 0);

                            if (cards.length === 0) return false;

                            // 若找到匹配分类的，点第一张；否则直接点第二张（换个默认）
                            if (matchCategory) {
                                for (const c of cards) {
                                    const parent = c.closest('[class]');
                                    if (parent && parent.className.toLowerCase().includes(matchCategory)) {
                                        c.click();
                                        return true;
                                    }
                                }
                            }
                            // 选第 1 张（下标 0 可能已被选中，选不同的）
                            const idx = cards.length > 1 ? 1 : 0;
                            cards[idx].click();
                            return true;
                        }
                    """, title or "")
                    if selected:
                        await asyncio.sleep(1.5)
                except Exception:
                    pass
                await _shot("submit2_agent_selected")

        # ── Step 3: 等「下一步」按钮可用并点击 ──────────────────
        await _shot("submit3_before_next")
        next_btn = page.locator('button:has-text("下一步")').first
        if await next_btn.count() > 0:
            # 等按钮从「加载中」变为可点击（最多15秒）
            for _ in range(30):
                try:
                    disabled  = await next_btn.get_attribute("disabled")
                    cls       = await next_btn.get_attribute("class") or ""
                    if disabled is None and "loading" not in cls.lower():
                        break
                except Exception:
                    break
                await asyncio.sleep(0.5)
            try:
                await next_btn.click()
                await asyncio.sleep(3.5)   # 等待发布设置页加载
            except Exception:
                pass
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
        # 策略1: 扫描所有可见元素（button / div / span / a），精确匹配「发布」文字
        clicked = False
        try:
            clicked = await page.evaluate("""() => {
                const PUBLISH_TEXTS = ['发布', '立即发布', '确认发布', '发 布'];
                // 优先找 button，再找其他可点击元素
                for (const tag of ['button', 'div', 'span', 'a']) {
                    for (const el of document.querySelectorAll(tag)) {
                        const t = el.textContent.trim();
                        if (!PUBLISH_TEXTS.includes(t)) continue;
                        if (el.offsetWidth === 0 || el.offsetHeight === 0) continue;
                        if (el.disabled || el.getAttribute('disabled') !== null) continue;
                        // 跳过隐藏的（display:none / visibility:hidden）
                        const style = window.getComputedStyle(el);
                        if (style.display === 'none' || style.visibility === 'hidden') continue;
                        el.click();
                        return true;
                    }
                }
                return false;
            }""")
        except Exception:
            pass

        # 策略2: Playwright 文字定位器 (精确 & 包含)
        if not clicked:
            for loc_expr in [
                'button:text-is("发布")',
                'button:has-text("发布"):not(:has-text("暂存")):not(:has-text("预览")):not(:has-text("草稿"))',
                'button:has-text("立即发布")',
                'button:has-text("确认发布")',
            ]:
                try:
                    loc = page.locator(loc_expr).last
                    if await loc.count() > 0:
                        await loc.scroll_into_view_if_needed()
                        await loc.click()
                        clicked = True
                        break
                except Exception:
                    continue

        # 策略3: 找红色/主色背景按钮（XHS 发布按钮通常是红色实色）
        if not clicked:
            try:
                clicked = await page.evaluate("""() => {
                    const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
                    for (const b of btns) {
                        if (b.offsetWidth === 0) continue;
                        const bg = window.getComputedStyle(b).backgroundColor;
                        // 红色系 rgb(255, x, x) 或 XHS 品牌红 ~#ff2442
                        const m = bg.match(/rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)\\)/);
                        if (m && parseInt(m[1]) > 180 && parseInt(m[2]) < 80 && parseInt(m[3]) < 80) {
                            b.click();
                            return true;
                        }
                    }
                    return false;
                }""")
            except Exception:
                pass

        if not clicked:
            # 所有策略均失败 → 记录诊断信息后抛出异常
            try:
                btns = await page.evaluate("""() =>
                    Array.from(document.querySelectorAll('button, div, span, a'))
                    .filter(b => b.offsetWidth > 0 && b.offsetHeight > 0)
                    .filter(b => {
                        const t = b.textContent.trim();
                        return t.length > 0 && t.length < 15;
                    })
                    .slice(0, 20)
                    .map(b => ({t: b.textContent.trim(), tag: b.tagName, d: b.disabled}))
                """)
            except Exception:
                btns = []
            await _shot("submit5_btn_debug")
            raise Exception(f"找不到发布按钮。可见元素: {btns}")

        await asyncio.sleep(0.5)

        # ── Step 6: 二次确认弹窗（如有）────────────────────────
        try:
            confirm_btn = page.locator('button:has-text("确定"), button:has-text("确认发布")')
            if await confirm_btn.count() > 0:
                await confirm_btn.first.click()
                await asyncio.sleep(0.5)
        except Exception:
            pass

        # ── Step 7: 等待成功反馈 ─────────────────────────────────
        await page.wait_for_selector(
            '[class*="success"], text=发布成功, '
            '[class*="toast"]:has-text("成功"), '
            '[class*="toast"]:has-text("发布"), '
            'text=已发布',
            timeout=25000,
        )
