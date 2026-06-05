"""
Prism 后端启动脚本（Windows 专用）

必须用 `python start.py` 启动，原因：
  - Playwright 需要 ProactorEventLoop 才能创建浏览器子进程
  - reload=True 会 spawn 子进程，子进程不继承父进程的 EventLoop Policy
  - reload=False 在同一进程内运行，Policy 设置保证在 uvicorn 创建 Loop 之前生效

修改代码后手动重启：Ctrl+C → python start.py
（task_store 会自动恢复上次任务，无需重新 AI 适配）
"""
import sys, asyncio

# ── 必须在 uvicorn 的任何 import 之前设置 ────────────────────────────────────
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,   # reload=True 与 ProactorEventLoop 在 Windows 上不兼容
    )
