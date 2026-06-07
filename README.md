# Prism — 多平台内容一键发布助手

> 创作者输入内容，AI 自动适配各平台风格，合规检查后一键发布。

---

## 目录

- [项目简介](#项目简介)
- [功能特性](#功能特性)
- [技术架构](#技术架构)
- [目录结构](#目录结构)
- [快速开始](#快速开始)
- [首次使用流程](#首次使用流程)
- [核心工作流](#核心工作流)
- [支持平台](#支持平台)
- [合规检查体系](#合规检查体系)
- [发布引擎详解](#发布引擎详解)
- [API 接口文档](#api-接口文档)
- [扩展新平台](#扩展新平台)
- [调试与日志](#调试与日志)
- [常见问题](#常见问题)

---

## 项目简介

Prism 是一个本地运行的多平台内容发布自动化工具。你只需写好一篇文章（或语音输入），Prism 会：

1. 用 AI 将内容**自动改写**为各平台最优风格
2. 对每个平台做**违规合规检查**，发现问题即时提示并提供自动修复
3. 你确认内容后，用 Playwright **自动控制浏览器**完成发布，无需手动操作每个平台

所有操作在**本地完成**，Cookie 经 AES 加密保存，密码不经过本系统。

---

## 功能特性

| 功能 | 说明 |
|------|------|
| 🎙️ 语音输入 | 支持麦克风录音，Whisper STT 自动转写 |
| ✍️ 文字输入 | 直接粘贴标题+正文，AI 适配各平台 |
| 🤖 AI 内容适配 | Qwen-max 按平台风格重写，控制字数、标签、语气 |
| 🛡️ 三层合规检查 | 关键词 → 正则规则 → LLM 语义，覆盖明确与隐晦违规 |
| 🔧 AI 自动修复 | 检测到敏感词时，一键生成替换版本，保留原语义 |
| 📸 发布前预览 | 自动截图编辑器状态，发布前可人工确认内容 |
| 🔄 智能重试 | 发布失败自动指数退避重试（5s → 10s → 20s） |
| ⏸️ 人工介入 | 发布过程中可暂停等待用户操作，支持页面点击自动继续 |
| 📹 视频支持 | B站、小红书支持视频文件上传投稿 |
| 📅 定时发布 | 前端支持设定发布时间，后端自动调度 |
| 📜 发布历史 | 记录每次发布的平台、内容、截图和结果 |
| 🔊 TTS 播报 | 发布完成后语音播报结果 |

---

## 技术架构

```
前端 (React + Vite)
    │  HTTP/REST
    ▼
后端 (FastAPI)
    │
    ├── LangGraph Agent 工作流
    │   ├── STT 节点        ← Whisper 语音转文字
    │   ├── Intent 节点     ← Qwen-max 意图解析
    │   ├── Adapter 节点    ← Qwen-max 并行多平台适配
    │   ├── Checker 节点    ← 三层合规检查
    │   └── Executor 节点   ← Playwright 浏览器自动化
    │
    ├── Compliance Engine
    │   ├── Layer 1: 本地词库关键词匹配
    │   ├── Layer 2: 平台定制正则规则
    │   └── Layer 3: Qwen-max LLM 语义检查
    │
    └── Session Manager
        └── Fernet 加密 Cookie 持久化
```

**核心依赖版本：**

| 依赖 | 版本 | 用途 |
|------|------|------|
| Python | 3.11+ | 运行时 |
| FastAPI | 0.111+ | HTTP API 服务 |
| LangGraph | 0.1+ | Agent 状态机工作流 |
| Playwright | 1.44+ | 浏览器自动化 |
| Whisper | 20231117 | 语音识别 |
| DashScope | 1.19+ | Qwen-max API |
| React | 18.3+ | 前端 UI |
| Vite | 5.3+ | 前端构建 |

---

## 目录结构

```
Prism/
├── backend/
│   ├── main.py                     # FastAPI 入口，所有 HTTP 路由
│   ├── requirements.txt
│   ├── .env                        # 环境变量（DASHSCOPE_API_KEY 等）
│   ├── task_store.py               # 任务持久化（磁盘读写）
│   │
│   ├── agent/
│   │   ├── state.py                # AgentState TypedDict 定义
│   │   ├── graph.py                # LangGraph 工作流图
│   │   └── nodes/
│   │       ├── intent.py           # Qwen-max 意图解析
│   │       ├── adapter.py          # 多平台内容适配（并行）
│   │       ├── checker.py          # 合规检查节点
│   │       ├── executor.py         # Playwright 执行 + 重试 + 人工介入
│   │       ├── navigator.py        # 页面导航辅助
│   │       └── reporter.py         # TTS 结果播报
│   │
│   ├── platforms/
│   │   ├── base.py                 # PlatformAdapter 抽象基类
│   │   ├── registry.py             # 平台注册表
│   │   ├── wechat.py               # 微信公众号适配器
│   │   ├── zhihu.py                # 知乎适配器
│   │   ├── xiaohongshu.py          # 小红书适配器（长文）
│   │   └── bilibili.py             # B站专栏/视频适配器
│   │
│   ├── compliance/
│   │   ├── engine.py               # 三层检查引擎 + 自动修复
│   │   ├── rules/
│   │   │   ├── base.py             # BaseRule 抽象类
│   │   │   ├── global_rules.py     # 通用规则（外链/长度/emoji/促销）
│   │   │   ├── registry.py         # 平台规则注册表
│   │   │   ├── wechat_rules.py
│   │   │   ├── zhihu_rules.py
│   │   │   ├── xiaohongshu_rules.py
│   │   │   └── bilibili_rules.py
│   │   └── wordlists/
│   │       ├── global_sensitive.txt
│   │       ├── wechat_banned.txt
│   │       └── xiaohongshu_banned.txt
│   │
│   ├── session/
│   │   ├── manager.py              # Cookie 保存/加载/登录检测
│   │   └── crypto.py               # Fernet AES 加密
│   │
│   └── utils/
│       ├── retry.py                # 异步指数退避重试执行器
│       ├── tts.py                  # pyttsx3 语音播报
│       └── screenshot.py           # 截图工具
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx                 # 主应用，路由与全局状态
        ├── api/
        │   └── client.js           # 所有后端 API 调用（含自动重试）
        ├── hooks/
        │   ├── useAgent.js         # 任务轮询与状态管理
        │   ├── useVoice.js         # 麦克风录音
        │   ├── useVoiceCreate.js   # 语音创作模式
        │   └── useAuth.js          # 用户登录状态
        ├── components/
        │   ├── ContentEditor.jsx   # 内容编辑区（标题+正文）
        │   ├── PlatformSelector.jsx# 目标平台选择
        │   ├── ComplianceReport.jsx# 合规报告展示 + 一键修复
        │   ├── AgentTimeline.jsx   # 执行日志时间轴
        │   ├── ResultCard.jsx      # 单平台发布结果卡片
        │   ├── PublishModal.jsx    # 发布确认弹窗
        │   ├── PublishFlow.jsx     # 发布流程编排
        │   ├── LoginCheckModal.jsx # 登录状态检测弹窗
        │   ├── VoiceInput.jsx      # 语音输入组件
        │   ├── VoiceCreate.jsx     # 语音创作模式
        │   ├── AIWritePanel.jsx    # AI 辅助写作面板
        │   ├── PolishDrawer.jsx    # 内容润色抽屉
        │   ├── TemplatePanel.jsx   # 写作模板面板
        │   ├── ImageGenPanel.jsx   # AI 配图生成
        │   ├── ScheduleModal.jsx   # 定时发布设置
        │   ├── NotificationBell.jsx# 消息通知
        │   └── ParticleBackground.jsx # 粒子动效背景
        └── pages/
            ├── HistoryPage.jsx     # 发布历史记录
            ├── SchedulePage.jsx    # 定时任务管理
            └── ProfilePage.jsx     # 用户设置
```

---

## 快速开始

### 环境要求

- Python 3.11+
- Node.js 18+
- Windows 10/11（Mac/Linux 需去掉 `WindowsProactorEventLoopPolicy` 设置）
- Chrome 浏览器（Playwright 自动安装 Chromium）

### 1. 克隆项目

```bash
git clone <repo-url>
cd Prism
```

### 2. 后端安装

```bash
cd backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 安装 Playwright 浏览器
playwright install chromium
```

### 3. 配置环境变量

```bash
# 编辑 backend/.env，填入你的 DashScope API Key
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
WHISPER_MODEL=base
# Whisper 模型大小: base（快）/ small / medium（准）
```

获取 DashScope API Key：访问 [DashScope 控制台](https://dashscope.aliyun.com/)，注册后在「API-KEY 管理」中创建。

### 4. 启动后端

```bash
# 在 backend/ 目录下
uvicorn main:app --reload --port 8000
```

后端启动后访问：`http://localhost:8000/docs` 可查看 Swagger 接口文档。

### 5. 前端安装与启动

```bash
cd frontend
npm install
npm run dev
```

访问 `http://localhost:5173` 打开 Prism 界面。

---

## 首次使用流程

首次使用前需要为每个目标平台完成一次登录授权：

1. 在 Prism 界面点击右上角**头像 → 账号设置**
2. 对每个平台点击**「登录」**按钮
3. Chromium 浏览器自动弹出，**手动完成平台登录**（扫码、账号密码等）
4. 登录成功后回到 Prism，Prism 会检测登录状态并保存加密 Cookie

> **安全说明**：Cookie 使用 Fernet（AES-128）对称加密保存于 `~/.prism/sessions/`，密钥文件 `~/.prism/key.bin` 仅本地存储。密码从不经过 Prism 系统。

---

## 核心工作流

### 发布流程

```
用户输入（语音 / 文字）
    │
    ▼
[意图解析]  ←  Qwen-max
    识别目标平台、提取标题/正文
    │
    ▼
[多平台适配]  ←  Qwen-max（并行）
    按各平台风格重写内容、生成标签
    │
    ▼
[合规检查]  ←  词库 + 规则 + LLM（并行）
    标注违规点，生成自动修复版本
    │
    ▼
[用户确认]  ←  Human-in-the-loop
    预览各平台内容 + 合规报告
    选择接受修复 / 手动编辑 / 跳过平台
    │
    ▼
[逐平台发布]  ←  Playwright 浏览器自动化
    登录检测 → 导航编辑器 → 填写内容 → 提交
    │（失败自动重试，最多 3 次）
    ▼
[TTS 播报结果]
    "小红书、B站 发布成功；知乎 因合规问题已跳过"
```

### AgentState 关键字段

```python
class AgentState(TypedDict):
    # 输入
    raw_text:         str           # 原始文字输入或 STT 结果
    original_title:   str
    original_body:    str
    target_platforms: List[str]     # ["xiaohongshu", "bilibili", ...]

    # 适配结果
    adapted_results:  Dict[str, PlatformResult]
    # 每个 PlatformResult 包含:
    #   adapted_title, adapted_body, tags, status,
    #   preview_screenshot, success_screenshot, error, retry_count

    # 合规汇总
    compliance_summary:    Dict[str, ComplianceResult]
    has_blocking_issues:   bool

    # 执行追踪
    execution_log:    List[str]     # 实时日志，前端轮询展示
    has_video:        bool
    video_path:       str
```

---

## 支持平台

| 平台 | 内容类型 | 字数上限 | 标签 | 视频 |
|------|---------|---------|------|------|
| 微信公众号 | 图文 | 20,000 | ✗ | ✗ |
| 知乎 | 文章 | 10,000 | ✗ | ✗ |
| 小红书 | 长文笔记 | 1,000 | ✓ | ✓ |
| B站 | 专栏 / 视频投稿 | 2,000 | ✓ | ✓ |
| CSDN | 技术博客 | — | ✓ | ✗ |
| 微博 | 短文 | 2,000 | ✓ | ✗ |
| 抖音 | 图文 | — | ✓ | ✗ |

### 各平台 AI 适配风格

| 平台 | 风格描述 |
|------|---------|
| 微信公众号 | 深度长文，逻辑严谨，适合知识分享 |
| 知乎 | 专业答题口吻，引用数据，有说服力 |
| 小红书 | 种草笔记，语气亲切，标题加 emoji，分点列举 |
| B站 | 年轻活泼，可用梗和网络用语，配合二次元氛围 |

---

## 合规检查体系

### 三层检查架构

```
Layer 1  关键词匹配   本地词库      < 5ms    覆盖明确违禁词
Layer 2  正则规则     平台定制      < 5ms    格式/长度/引流/促销话术
Layer 3  LLM 语义    Qwen-max     ~ 2s     隐晦违规（仅前两层无 error 时触发）

自动修复  LLM 替换    Qwen-max     ~ 1s     敏感词替换，保留原语义
```

### 内置规则示例

| 规则 | 适用平台 | 级别 |
|------|---------|------|
| 标题超长（小红书 > 20 字） | 小红书 | error |
| 正文含外链 | 知乎、小红书 | warning |
| 含引流话术（V信/加我/私信我） | 小红书 | error |
| 过度促销话术（秒杀/史低/白嫖） | 所有 | warning |
| Emoji 数量超过 20 个 | 微信、B站 | info |
| 标签数量超过 10 个 | 小红书 | warning |
| LLM 检测夸大宣传 / 虚假承诺 | 所有 | warning |

### 风险等级

| 等级 | 条件 | 是否阻断发布 |
|------|------|------------|
| safe | 无问题 | 否 |
| low | 仅 info 级 | 否 |
| medium | 含 warning 级 | 否（提示） |
| high | 含 error 级 | 是（需修复后才能发布） |

### 自定义词库

在 `backend/compliance/wordlists/` 中编辑对应 `.txt` 文件，每行一词，`#` 开头为注释：

```
# backend/compliance/wordlists/global_sensitive.txt
赌博
刷单
保证赚钱
```

---

## 发布引擎详解

### Playwright 发布流程（以小红书为例）

```
1. 浏览器启动（复用已有实例，避免重复开关）
2. 恢复加密 Cookie，检测登录状态
3. 跳转编辑器 → 选「写长文」Tab → 点「新的创作」
4. 填写标题、正文（keyboard.type，保留格式）
5. 点「一键排版」→ AI 根据文章内容选择最适配的排版模板
6. 点「下一步」进入发布设置页
7. 填写描述文字
8. 截图预览（返回给前端展示）
9. 点「发布」按钮（page.mouse.click，触发 isTrusted=true 事件）
10. 轮询检测：URL 变化 / 按钮消失 / 成功文字，最多等待 30 秒
11. 失败自动重试（最多 3 次，5s → 10s → 20s 退避）
```

### 关键技术决策

**为什么用 `page.mouse.click()` 而非 `el.click()`？**

`el.click()` 触发的事件 `event.isTrusted = false`，小红书等平台的 React 事件处理器会静默忽略不信任的程序化点击。`page.mouse.click()` 模拟真实 OS 鼠标事件，`isTrusted = true`，React 正常响应。

**Cookie 自动恢复**

每次发布前调用 `ensure_logged_in()`：先尝试从 `~/.prism/sessions/<platform>.enc` 加载 Cookie，加载后访问平台首页检测实际登录状态。若未登录，打开登录页面等待用户手动完成（最多 5 分钟）。

**人工介入（Human-in-the-loop Assist）**

发布过程中遇到验证码、异常弹窗等情况，`assist_fn` 会暂停执行、截图并通过 SSE 通知前端。用户点击前端「继续」按钮或直接在浏览器页面点击，执行自动恢复。

**调试截图**

发布过程中自动保存关键节点截图到 `~/.prism/debug/`，命名格式：`xhs_HHMMSS_<label>.png`。

---

## API 接口文档

所有接口均有 Swagger 文档，启动后访问 `http://localhost:8000/docs`。

### 主要接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/publish/text` | 文字内容发布任务 |
| POST | `/api/publish/voice` | 语音内容发布任务 |
| POST | `/api/upload/video` | 上传视频文件 |
| GET | `/api/task/{task_id}` | 轮询任务状态 |
| POST | `/api/confirm` | 用户确认发布 |
| POST | `/api/publish-platform` | 单独触发某平台发布 |
| POST | `/api/apply-fix` | 应用 AI 自动修复 |
| POST | `/api/update-content` | 更新某平台适配内容 |
| POST | `/api/final-confirm` | 最终确认单平台 |
| POST | `/api/final-confirm-all` | 最终确认所有平台 |
| POST | `/api/assist-resume` | 恢复人工介入暂停 |
| GET | `/api/session/{platform}/status` | 检测平台登录状态 |
| POST | `/api/session/{platform}/login` | 触发平台登录流程 |
| POST | `/api/voice/refine` | AI 语音稿润色 |

### 任务状态流转

```
pending → checking → confirmed → publishing → success
                               ↘ failed（触发重试）
          checking → blocked（高风险，需修复）
          publishing → retrying → publishing（自动重试）
          publishing → awaiting_assist（等待用户操作）
```

### 请求示例

```bash
# 发起文字发布任务
curl -X POST http://localhost:8000/api/publish/text \
  -H "Content-Type: application/json" \
  -d '{
    "title": "我的第一篇文章",
    "body": "这里是正文内容...",
    "platforms": ["xiaohongshu", "bilibili"]
  }'
# 返回: {"task_id": "uuid-xxx"}

# 轮询任务状态
curl http://localhost:8000/api/task/uuid-xxx

# 确认发布
curl -X POST http://localhost:8000/api/confirm \
  -H "Content-Type: application/json" \
  -d '{"task_id": "uuid-xxx", "confirmed": true, "skip_blocked": false}'
```

---

## 扩展新平台

只需三步即可接入新平台，核心代码无需改动。

### Step 1：实现平台适配器

```python
# backend/platforms/weibo.py
from .base import PlatformAdapter
from playwright.async_api import Page

class WeiboAdapter(PlatformAdapter):
    platform_id   = "weibo"
    platform_name = "微博"
    char_limit    = 2000
    has_tags      = True
    style_desc    = "短平快，情绪化表达，配合热点话题，加话题标签"
    publish_url   = "https://weibo.com/newpost"

    async def navigate_to_editor(self, page: Page) -> None:
        await page.goto(self.publish_url, wait_until="domcontentloaded")
        await page.wait_for_selector('textarea', timeout=15000)

    async def fill_content(self, page: Page, title: str, body: str,
                           tags: list, video_path: str = None) -> None:
        editor = page.locator('textarea').first
        await editor.click()
        await page.keyboard.type(body, delay=15)
        # 插入话题标签...

    async def submit(self, page: Page, assist_fn=None, **kwargs) -> None:
        await page.locator('button:has-text("发布")').click()
        await page.wait_for_url('**/detail/**', timeout=15000)
```

### Step 2：注册平台

```python
# backend/platforms/registry.py
from .weibo import WeiboAdapter

PLATFORM_REGISTRY = {
    # ... 已有平台 ...
    "weibo": WeiboAdapter(),
}
```

### Step 3：添加合规规则

```python
# backend/compliance/rules/registry.py
RULES_REGISTRY = {
    # ... 已有平台 ...
    "weibo": [
        BodyLengthRule(max_len=2000),
        PricePromotionRule(),
    ],
}
```

完成。AI 适配、合规检查、发布重试等全部自动生效。

---

## 调试与日志

### 调试截图

发布过程中自动保存截图，路径：`~/.prism/debug/`

| 截图文件名 | 保存时机 |
|-----------|---------|
| `xhs_HHMMSS_submit1_after_layout.png` | 点「一键排版」后 |
| `xhs_HHMMSS_submit2_before_template.png` | 模板选择前 |
| `xhs_HHMMSS_submit3_after_next.png` | 点「下一步」后 |
| `xhs_HHMMSS_submit5_before_publish.png` | 点「发布」前 |
| `xhs_HHMMSS_submit6_after_click.png` | 点「发布」后 1 秒 |
| `xhs_HHMMSS_submit7_waiting_N.png` | 等待期间每 5 秒 |
| `xhs_HHMMSS_submit7_timeout.png` | 30 秒超时时 |
| `xhs_HHMMSS_submit7_error.png` | 检测到错误时 |

### 后端实时日志

```bash
# 后端 stdout 输出所有关键步骤，例如：
[xiaohongshu] 检查登录状态...
[xiaohongshu] 登录成功 ✓
[xiaohongshu] 打开发布编辑器...
[xiaohongshu] ✓ Agent 切换模板分类: clicked:黑白段落
[xiaohongshu] ✓ 已进入发布设置页（第1次点击）
[xiaohongshu] 策略1: mouse.click(693, 754)
[xiaohongshu] ✓ 发布按钮已消失，等待页面跳转...
[xiaohongshu] ✓ 已离开发布页: .../publish → .../notes/xxx
[xiaohongshu] 发布成功 ✓
```

### 前端 execution_log

前端每 1 秒轮询 `/api/task/{id}`，`execution_log` 数组实时展示在 AgentTimeline 组件中。

---

## 常见问题

**Q: 报错「找不到发布按钮」**  
A: 通常由浏览器权限弹窗（定位/通知）遮挡页面导致。已在 `executor.py` 中通过 `permissions=[]` 预禁用所有权限请求。若仍出现，检查 `~/.prism/debug/` 中的 `submit5_before_publish.png`，确认发布按钮是否在截图中可见。

**Q: Prism 显示发布成功，但平台上看不到内容**  
A: 此问题已修复（v0.2+）。原因是 `el.click()` 触发 `isTrusted=false` 事件被 React 静默忽略，当前版本已全面改用 `page.mouse.click()` 并增加「按钮消失检测」和 30 秒超时强制重试机制。

**Q: 登录 Cookie 失效**  
A: Cookie 有效期取决于各平台策略（通常 7-30 天）。失效后重新点击「登录」按钮，完成一次手动登录即可刷新 Cookie。

**Q: 小红书排版模板选择不对**  
A: 模板选择基于文章内容关键词自动匹配（`styleMap` 在 `xiaohongshu.py` 的 `submit()` 方法中），可在该方法中修改映射规则。若无关键词匹配则保留默认模板。

**Q: Whisper 速度太慢**  
A: 在 `.env` 中设置 `WHISPER_MODEL=base`（最快），或升级到 `small` / `medium` 获得更高准确率。首次使用会自动下载对应模型文件。

**Q: Windows 环境下 asyncio 报错**  
A: `main.py` 顶部已设置 `WindowsProactorEventLoopPolicy`，确保在其他任何导入之前执行。若仍有问题，确认 Python 版本 ≥ 3.11。

**Q: 如何只发布到部分平台不经过 AI 适配？**  
A: 在调用 `/api/publish/text` 时设置 `"skip_adapt": true`，跳过 AI 改写和合规检查，直接使用原文发布。

---

## 数据存储说明

| 路径 | 内容 | 说明 |
|------|------|------|
| `~/.prism/sessions/<platform>.enc` | 加密 Cookie | Fernet AES 加密，仅本机可解 |
| `~/.prism/key.bin` | 加密密钥 | 自动生成，请勿删除或外传 |
| `~/.prism/debug/*.png` | 调试截图 | 可定期清理，不影响功能 |
| `backend/tasks.json` | 任务历史 | 重启后任务状态可恢复 |

---

## License

MIT
