# ── Windows: 必须在创建任何 event loop 之前设置 ProactorEventLoop ──────────
import sys, asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
# ──────────────────────────────────────────────────────────────────────────────

import uuid, tempfile, os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv
from agent.graph import graph
from agent.nodes import executor, reporter
from session.manager import save_session, is_session_valid
from task_store import save_tasks, load_tasks

load_dotenv()

app = FastAPI(title="Prism API")

# ── Auth router ───────────────────────────────────────────────────────────────
from auth.router import router as auth_router
app.include_router(auth_router)
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

tasks: dict = load_tasks()   # 启动时从磁盘恢复
ACTIVE_PUBLISH_STATUSES = {"logging_in", "navigating", "filling", "publishing", "retrying", "awaiting_assist"}
TERMINAL_PUBLISH_STATUSES = {"success", "failed", "blocked"}

def make_initial_state(title=None, body=None, platforms=None, audio_path=None, raw_text=None,
                       skip_adapt=False, video_path=None, video_filename=None):
    return {
        "audio_path": audio_path,
        "raw_text": raw_text,
        "original_title": title,
        "original_body":  body,
        "target_platforms": platforms or [],
        "intent": None,
        "needs_confirm": True,
        "adapted_results": {},
        "compliance_summary": {},
        "has_blocking_issues": False,
        "current_platform": None,
        "execution_log": [],
        "final_summary": None,
        "confirmed": False,
        "abort": False,
        "skip_blocked": False,
        "skip_adapt": skip_adapt,
        "has_video": video_path is not None,
        "video_path": video_path,
        "video_filename": video_filename,
    }

class TextRequest(BaseModel):
    title:        Optional[str]       = None
    body:         Optional[str]       = None
    platforms:    Optional[List[str]] = None
    skip_adapt:   bool                = False   # 跳过AI适配和合规检查，直接发布
    video_path:   Optional[str]       = None    # 本地视频文件路径（由 /api/upload/video 返回）
    video_filename: Optional[str]     = None    # 原始视频文件名

class ConfirmRequest(BaseModel):
    task_id:      str
    confirmed:    bool
    skip_blocked: bool = False

class ApplyFixRequest(BaseModel):
    task_id:  str
    platform: str          # 应用自动修复到哪个平台

class PublishPlatformRequest(BaseModel):
    task_id: str
    platform: str

@app.post("/api/publish/voice")
async def publish_voice(audio: UploadFile = File(...)):
    task_id = str(uuid.uuid4())
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
        f.write(await audio.read())
        audio_path = f.name
    state  = make_initial_state(audio_path=audio_path)
    config = {"configurable": {"thread_id": task_id}}
    tasks[task_id] = {"state": state, "config": config, "status": "running"}
    save_tasks(tasks)
    asyncio.create_task(_run(task_id, state, config))
    return {"task_id": task_id}

@app.post("/api/publish/text")
async def publish_text(req: TextRequest):
    task_id = str(uuid.uuid4())
    state   = make_initial_state(
        title=req.title, body=req.body, platforms=req.platforms,
        raw_text=f"标题：{req.title or ''}\n正文：{req.body or ''}",
        skip_adapt=req.skip_adapt,
        video_path=req.video_path,
        video_filename=req.video_filename,
    )
    config  = {"configurable": {"thread_id": task_id}}
    tasks[task_id] = {"state": state, "config": config, "status": "running"}
    save_tasks(tasks)
    asyncio.create_task(_run(task_id, state, config))
    return {"task_id": task_id}

@app.get("/api/task/{task_id}")
async def get_task(task_id: str):
    t = tasks.get(task_id)
    if not t:
        return {"error": "not found"}
    return {
        "status":             t.get("status"),
        "adapted_results":    t["state"].get("adapted_results", {}),
        "compliance_summary": t["state"].get("compliance_summary", {}),
        "has_blocking_issues":t["state"].get("has_blocking_issues", False),
        "execution_log":      t["state"].get("execution_log", []),
        "final_summary":      t["state"].get("final_summary"),
    }

@app.post("/api/confirm")
async def confirm(req: ConfirmRequest):
    t = tasks.get(req.task_id)
    if not t:
        return {"error": "not found"}
    t["state"]["confirmed"]    = req.confirmed
    t["state"]["abort"]        = not req.confirmed
    t["state"]["skip_blocked"] = req.skip_blocked
    asyncio.create_task(_resume(req.task_id))
    return {"ok": True}

@app.post("/api/apply-fix")
async def apply_fix(req: ApplyFixRequest):
    """用户接受自动修复结果，将 auto_fixed_text 写入 adapted_body"""
    t = tasks.get(req.task_id)
    if not t:
        return {"error": "not found"}
    compliance = t["state"]["compliance_summary"].get(req.platform, {})
    fixed_text = compliance.get("auto_fixed_text")
    if fixed_text:
        t["state"]["adapted_results"][req.platform]["adapted_body"] = fixed_text
        t["state"]["adapted_results"][req.platform]["status"] = "confirmed"
        compliance["passed"] = True
        compliance["risk_level"] = "low"
    return {"ok": True, "applied": bool(fixed_text)}

class UpdateContentRequest(BaseModel):
    task_id:       str
    platform:      str
    adapted_title: str
    adapted_body:  str

@app.post("/api/update-content")
async def update_content(req: UpdateContentRequest):
    """前端编辑卡片后同步回后端，确保真实发布时使用最新内容"""
    t = tasks.get(req.task_id)
    if not t:
        return {"error": "not found"}
    results = t["state"].get("adapted_results", {})
    if req.platform in results:
        results[req.platform]["adapted_title"] = req.adapted_title
        results[req.platform]["adapted_body"]  = req.adapted_body
    return {"ok": True}

@app.get("/api/session/{platform}/status")
async def session_status(platform: str):
    return {"valid": await is_session_valid(platform)}

@app.post("/api/session/{platform}/login")
async def login_platform(platform: str):
    success = await save_session(platform)
    return {"success": success}

@app.post("/api/publish-platform")
async def publish_platform(req: PublishPlatformRequest):
    t = tasks.get(req.task_id)
    if not t:
        raise HTTPException(status_code=404, detail="task not found")

    results = t["state"].get("adapted_results", {})
    result = results.get(req.platform)
    if not result:
        raise HTTPException(status_code=404, detail="platform not found")

    if any((r or {}).get("status") in ACTIVE_PUBLISH_STATUSES for r in results.values()):
        raise HTTPException(status_code=409, detail="已有平台正在发布，请稍候")

    if result.get("status") in {"success", "blocked"}:
        raise HTTPException(status_code=409, detail="该平台当前不可重复发布")

    if result.get("status") not in {"confirmed", "failed"}:
        raise HTTPException(status_code=409, detail="该平台尚未准备好发布")

    t["status"] = "running"
    t["state"]["final_summary"] = None
    asyncio.create_task(_publish_single_platform(req.task_id, req.platform))
    return {"ok": True}

# ── Voice Creation endpoints ─────────────────────────────────────────────────

@app.post("/api/voice/transcribe")
async def voice_transcribe(audio: UploadFile = File(...)):
    """音频 → Whisper 精确转写文字"""
    from agent.nodes.stt import get_model
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
        f.write(await audio.read())
        path = f.name
    try:
        model = get_model()
        segments, _ = model.transcribe(path, language="zh")
        text = "".join(seg.text for seg in segments).strip()
    finally:
        os.unlink(path)
    return {"transcript": text}


class VoiceGenerateRequest(BaseModel):
    transcript: str

@app.post("/api/voice/generate")
async def voice_generate(req: VoiceGenerateRequest):
    """转写文字 → 标题 + 正文（Qwen-max）"""
    import json as _json
    from dashscope import Generation
    prompt = f"""用户口述了以下内容，请理解其核心意图，生成一篇适合多平台发布的文章。
用户说：{req.transcript}

要求：
- 标题：简洁有力，20字以内
- 正文：结构清晰，600-1000字，分段落，有观点有例子
- 语气：自然流畅，像作者亲自写的，不要AI腔

返回JSON（只返回JSON，不要其他内容）：
{{"title":"...","body":"...","summary":"10字内内容摘要"}}"""
    resp = Generation.call(model="qwen-max", prompt=prompt)
    raw  = resp.output.text.strip().replace("```json","").replace("```","")
    try:
        return _json.loads(raw)
    except Exception:
        return {"title": "生成失败，请重试", "body": raw, "summary": ""}


class VoiceTitlesRequest(BaseModel):
    summary:       str
    body:          str
    current_title: str

@app.post("/api/voice/titles")
async def voice_titles(req: VoiceTitlesRequest):
    """生成 3 个不同风格的备选标题"""
    import json as _json
    from dashscope import Generation
    prompt = f"""基于以下文章，生成3个风格各异的备选标题（与当前标题不同）。

当前标题：{req.current_title}
内容摘要：{req.summary}
正文节选：{req.body[:300]}

要求：
- 每个标题20字以内
- 3个标题风格不同（如：疑问式、数字式、情感式）
- 不要重复当前标题

返回JSON（只返回JSON）：{{"titles":["标题1","标题2","标题3"]}}"""
    resp = Generation.call(model="qwen-max", prompt=prompt)
    raw  = resp.output.text.strip().replace("```json","").replace("```","")
    try:
        return _json.loads(raw)
    except Exception:
        return {"titles": []}


class VoiceRefineRequest(BaseModel):
    instruction:   str
    current_title: str
    current_body:  str
    summary:       str

@app.post("/api/voice/refine")
async def voice_refine(req: VoiceRefineRequest):
    """语音优化指令 → 修改后的标题 + 正文"""
    import json as _json
    from dashscope import Generation
    prompt = f"""你是专业内容编辑。请按用户要求修改文章，只改动有必要的部分。

当前标题：{req.current_title}
当前正文：
{req.current_body}

用户修改要求：{req.instruction}

要求：
- 准确理解修改意图，只修改需要改动的部分
- 未修改的字段原样返回
- change_desc 用一句话说明做了什么改动

返回JSON（只返回JSON）：
{{"title":"...","body":"...","changed":["title","body"],"change_desc":"..."}}"""
    resp = Generation.call(model="qwen-max", prompt=prompt)
    raw  = resp.output.text.strip().replace("```json","").replace("```","")
    try:
        return _json.loads(raw)
    except Exception:
        return {
            "title": req.current_title, "body": req.current_body,
            "changed": [], "change_desc": "修改失败，请重试",
        }


class FinalConfirmRequest(BaseModel):
    task_id:  str
    platform: str


class AssistResumeRequest(BaseModel):
    task_id:  str
    platform: str
    action:   str = "continue"   # "continue" | "user_helped"


@app.post("/api/assist-resume")
async def assist_resume(req: AssistResumeRequest):
    """
    Called by the frontend when the user has finished interacting at a decision
    point (e.g. template selection on xiaohongshu) and wants the Agent to continue.
    Fires the asyncio.Event that executor._make_assist_fn is waiting on.
    """
    from agent.nodes.executor import _assist_events, _assist_actions
    event = _assist_events.get(req.task_id)
    if event:
        _assist_actions[req.task_id] = req.action
        event.set()
        return {"ok": True}
    return {"ok": False, "detail": "该任务当前没有待处理的暂停点"}


@app.post("/api/final-confirm")
async def final_confirm(req: FinalConfirmRequest):
    """User has reviewed the preview screenshot and approves publishing this platform."""
    t = tasks.get(req.task_id)
    if not t:
        return {"error": "not found"}
    results = t["state"].get("adapted_results", {})
    if req.platform in results:
        results[req.platform]["final_confirmed"] = True
    return {"ok": True}


@app.post("/api/final-confirm-all")
async def final_confirm_all(req: dict):
    """Approve all platforms at once."""
    task_id = req.get("task_id", "")
    t = tasks.get(task_id)
    if not t:
        return {"error": "not found"}
    for platform, result in t["state"].get("adapted_results", {}).items():
        result["final_confirmed"] = True
    return {"ok": True}


# ── Image generation ──────────────────────────────────────────────────────────

from imagegen.generator import generate_cover_images, crop_for_platform
import base64 as _base64


class ImageGenRequest(BaseModel):
    title:     str
    body:      str
    platforms: List[str]


@app.post("/api/imagegen")
async def gen_images(req: ImageGenRequest):
    """
    Generate cover images for each platform using Wanx.
    Takes ~10-20 s; frontend should show a loading indicator.
    Returns {"images": {"platform": "base64_jpeg", ...}}
    """
    try:
        images = await generate_cover_images(req.title, req.body[:300], req.platforms)
        return {"images": images}
    except Exception as e:
        return {"error": str(e)}


@app.post("/api/imagegen/upload")
async def upload_and_crop(
    file: UploadFile = File(...),
    platforms: str = "xiaohongshu,wechat,bilibili,zhihu",
):
    """
    接收用户上传图片，按各平台规格裁剪后返回 base64。
    platforms: 逗号分隔的平台列表。
    """
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        return {"error": "图片超过 10MB 限制"}

    platform_list = [p.strip() for p in platforms.split(",") if p.strip()]
    result = {}
    for platform in platform_list:
        try:
            cropped = crop_for_platform(content, platform)
            result[platform] = _base64.b64encode(cropped).decode()
        except Exception as exc:
            result[platform] = None  # 裁剪失败跳过该平台

    return {"images": result}


# ── Video upload ──────────────────────────────────────────────────────────────

from pathlib import Path as _Path

_UPLOAD_DIR = _Path.home() / ".prism" / "uploads"
_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@app.post("/api/upload/video")
async def upload_video(file: UploadFile = File(...)):
    """
    接收视频文件，保存到本地临时目录，返回服务端路径供 Agent 使用。
    支持 MP4 / MOV，最大 500MB。
    """
    max_size = 500 * 1024 * 1024  # 500MB
    content  = await file.read()
    if len(content) > max_size:
        from fastapi.responses import JSONResponse
        return JSONResponse({"error": "视频超过 500MB 限制"}, status_code=400)

    filename = f"{uuid.uuid4()}_{file.filename}"
    filepath = _UPLOAD_DIR / filename
    filepath.write_bytes(content)

    return {
        "video_path":    str(filepath),
        "video_filename": file.filename,
        "size_mb":        round(len(content) / 1024 / 1024, 1),
    }


# ── Scheduler ─────────────────────────────────────────────────────────────────

from scheduler.manager import (
    add_task     as _sched_add,
    get_tasks    as _sched_get,
    cancel_task  as _sched_cancel,
    scheduler_loop,
)


class ScheduleRequest(BaseModel):
    title:        str
    body:         str
    platforms:    List[str]
    scheduled_at: str   # ISO: "2025-08-01T14:30:00"


@app.on_event("startup")
async def start_scheduler():
    asyncio.create_task(scheduler_loop(tasks))
    asyncio.create_task(_auto_save_loop())
    asyncio.create_task(audit_loop())   # 审核状态追踪后台协程


async def _auto_save_loop():
    """每 10 秒将 tasks 兜底写盘，补充关键节点即时保存的空隙。"""
    while True:
        await asyncio.sleep(10)
        save_tasks(tasks)


@app.post("/api/schedule")
async def create_schedule(req: ScheduleRequest):
    return _sched_add(req.title, req.body, req.platforms, req.scheduled_at)


@app.get("/api/schedule")
async def list_schedules(status: Optional[str] = None):
    return {"tasks": _sched_get(status)}


@app.delete("/api/schedule/{task_id}")
async def cancel_schedule(task_id: str):
    return {"ok": _sched_cancel(task_id)}


# ── History ──────────────────────────────────────────────────────────────────

from history.store  import (save_record, get_all as _hist_get_all,
                             get_by_id as _hist_get_by_id,
                             get_stats  as _hist_get_stats,
                             delete_record as _hist_delete)
from history.models import PublishRecord

# ── Audit tracker ─────────────────────────────────────────────────────────────

from audit.tracker import (
    audit_loop,
    add_audit_task,
    get_by_record  as _audit_by_record,
    get_summary    as _audit_summary,
    mark_results_seen as _audit_mark_seen,
)


# ── Templates ─────────────────────────────────────────────────────────────────

from templates.store import (
    get_all      as _tmpl_get_all,
    save_template as _tmpl_save,
    delete_template as _tmpl_delete,
)


class SaveTemplateRequest(BaseModel):
    name:            str
    structure:       str
    target_platform: Optional[str] = None


class ApplyTemplateRequest(BaseModel):
    template_id: str
    title:       str
    body:        str


@app.get("/api/templates")
async def list_templates():
    return {"templates": _tmpl_get_all()}


@app.post("/api/templates")
async def create_template(req: SaveTemplateRequest):
    return _tmpl_save(req.name, req.structure, req.target_platform)


@app.delete("/api/templates/{template_id}")
async def remove_template(template_id: str):
    return {"ok": _tmpl_delete(template_id)}


@app.post("/api/templates/apply")
async def apply_template(req: ApplyTemplateRequest):
    """Merge user content with a template structure via LLM."""
    import json as _json
    from dashscope import Generation
    tmpl = next((t for t in _tmpl_get_all() if t["id"] == req.template_id), None)
    if not tmpl:
        return {"error": "template not found"}

    prompt = f"""请将以下内容按照指定模板结构重新组织，生成一篇完整文章。

用户原始标题：{req.title}
用户原始内容：{req.body}

模板结构：
{tmpl["structure"]}

要求：
- 保留用户内容的核心观点和信息
- 严格按照模板结构填充内容
- 语气自然，不要有 AI 腔
- 返回JSON：{{"title":"新标题","body":"按模板重组后的正文"}}
只返回JSON，不要其他内容。"""

    resp = Generation.call(model="qwen-max", prompt=prompt)
    raw  = resp.output.text.strip().replace("```json", "").replace("```", "")
    try:
        return _json.loads(raw)
    except Exception:
        return {"title": req.title, "body": req.body}


async def _save_history(task_id: str):
    t = tasks.get(task_id)
    if not t:
        return
    s       = t["state"]
    results = s.get("adapted_results", {})
    record  = PublishRecord(
        original_title   = s.get("original_title", "") or "",
        original_body    = s.get("original_body",  "") or "",
        platform_results = {
            pid: {
                "status":        r.get("status"),
                "adapted_title": r.get("adapted_title", ""),
                "adapted_body":  r.get("adapted_body",  ""),
                "tags":          r.get("tags", []),
                "error":         r.get("error"),
                "content_url":   r.get("content_url"),   # 发布成功后的页面URL，供数据看板使用
            }
            for pid, r in results.items()
        },
        total_platforms = len(results),
        success_count   = sum(1 for r in results.values() if r.get("status") == "success"),
        failed_count    = sum(1 for r in results.values() if r.get("status") == "failed"),
        blocked_count   = sum(1 for r in results.values() if r.get("status") == "blocked"),
    )
    save_record(record)

    # 为每个发布成功的平台注册审核追踪任务
    title = s.get("original_title", "") or ""
    for pid, r in results.items():
        if r.get("status") == "success":
            try:
                add_audit_task(
                    record_id=record.id,
                    platform=pid,
                    title=title,
                )
            except Exception:
                pass   # 审核注册失败不阻断历史保存


def _all_terminal(state: dict) -> bool:
    """True when every platform that was ever targeted has reached a terminal state."""
    results = state.get("adapted_results", {})
    if not results:
        return False
    return all(
        (r or {}).get("status") in TERMINAL_PUBLISH_STATUSES
        for r in results.values()
    )


async def _publish_single_platform(task_id: str, platform: str):
    """
    Run the full publish flow for one platform directly in the FastAPI event loop
    (required — Playwright's async API must stay in the same loop it was created in).
    State dict is mutated in-place so every GET /api/task poll sees live updates.
    """
    t = tasks.get(task_id)
    if not t:
        return

    t["status"] = "running"
    t["state"]["current_platform"] = platform

    try:
        # executor.run mutates state in-place AND returns it
        await executor.run(t["state"], platform, task_id=task_id)
    except Exception as e:
        log = t["state"].setdefault("execution_log", [])
        log.append(f"[{platform}] 未捕获异常: {e}")
        result = t["state"].get("adapted_results", {}).get(platform)
        if result is not None:
            result["status"] = "failed"
            result["error"]  = str(e)
    finally:
        t["state"]["current_platform"] = None

    # When all platforms are done, generate summary and persist history
    if _all_terminal(t["state"]):
        await reporter.run(t["state"])
        t["status"] = "done"
        await _save_history(task_id)
    else:
        # More platforms still pending — stay in awaiting_confirm
        # so the user can trigger the next one
        t["status"] = "awaiting_confirm"

    save_tasks(tasks)   # 每个平台发布结束 → 立即写盘


@app.get("/api/history")
async def list_history(limit: int = 20, offset: int = 0):
    return {"records": _hist_get_all(limit, offset)}


@app.get("/api/history/stats")
async def history_stats():
    return _hist_get_stats()


@app.get("/api/history/{record_id}")
async def get_history(record_id: str):
    r = _hist_get_by_id(record_id)
    return r if r else {"error": "not found"}


@app.delete("/api/history/{record_id}")
async def delete_history(record_id: str):
    return {"ok": _hist_delete(record_id)}


# ── Audit API ─────────────────────────────────────────────────────────────────

@app.get("/api/audit/summary")
async def get_audit_summary():
    """获取所有平台的审核状态汇总（用于首页通知角标）。"""
    return _audit_summary()


@app.get("/api/audit/{record_id}")
async def get_audit_by_record(record_id: str):
    """获取某次发布的所有平台审核状态。"""
    return {"tasks": _audit_by_record(record_id)}


@app.post("/api/audit/mark-seen")
async def mark_audit_seen():
    """用户点开通知面板后清除新结果角标。"""
    _audit_mark_seen()
    return {"ok": True}


# ── Analytics API ─────────────────────────────────────────────────────────────

from analytics.fetcher import fetch_record_analytics


@app.get("/api/analytics/{record_id}")
async def get_analytics(record_id: str):
    """
    获取某次发布各平台的最新互动数据（点赞/评论/收藏/阅读/转发）。
    通过 Playwright 截图 + VLM 识别，约 10-30 秒，前端需显示 loading。
    建议每次手动触发，不做自动轮询（避免触发平台风控）。
    """
    record = _hist_get_by_id(record_id)
    if not record:
        return {"error": "not found"}
    try:
        analytics = await fetch_record_analytics(record)
        return {"analytics": analytics, "record_id": record_id}
    except Exception as e:
        return {"error": str(e), "analytics": {}}


async def _run(task_id, state, config):
    try:
        async for chunk in graph.astream(state, config):
            tasks[task_id]["state"].update(list(chunk.values())[-1])
        tasks[task_id]["status"] = "awaiting_confirm"
    except Exception as e:
        tasks[task_id]["status"] = "error"
        tasks[task_id]["error"]  = str(e)
    finally:
        save_tasks(tasks)   # AI 适配完成 → 立即写盘

async def _resume(task_id):
    t = tasks[task_id]
    try:
        async for chunk in graph.astream(None, t["config"]):
            t["state"].update(list(chunk.values())[-1])
        t["status"] = "done"
        await _save_history(task_id)
    except Exception as e:
        t["status"] = "error"
    finally:
        save_tasks(tasks)   # 旧版确认发布路径完成 → 写盘
