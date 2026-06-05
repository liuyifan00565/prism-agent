/**
 * PublishModal — full-screen overlay showing real-time publish progress.
 * Replaces the inline progress panel.
 *
 * Props:
 *   open:        bool
 *   onClose:     fn()
 *   taskData:    object (from GET /api/task)
 *   taskId:      string
 *   onRetry:     fn(platform)  — trigger single-platform retry
 */
import { useState, useEffect } from 'react'
import { assistResume } from '../api/client'

const PNAMES = { wechat: '公众号', zhihu: '知乎', xiaohongshu: '小红书', bilibili: 'B站' }
const PICONS = { wechat: '💬', zhihu: '🔵', xiaohongshu: '📕', bilibili: '📺' }

const STEPS = [
  { key: 'logging_in', label: '登录检测'   },
  { key: 'navigating', label: '打开编辑器' },
  { key: 'filling',    label: '填写内容'   },
  { key: 'publishing', label: '点击发布'   },
]

const STATUS_STEP = {
  logging_in:      0,
  navigating:      1,
  filling:         2,
  publishing:      3,
  retrying:        3,
  awaiting_assist: 3,
  success:         4,
  failed:          4,
}

function stepState(stepIdx, platformStatus) {
  const cur     = STATUS_STEP[platformStatus] ?? -1
  const failed  = platformStatus === 'failed'
  const success = platformStatus === 'success'
  if (success) return 'done'
  if (failed) {
    if (stepIdx < cur)  return 'done'
    if (stepIdx === cur) return 'failed'
    return 'pending'
  }
  if (stepIdx < cur)  return 'done'
  if (stepIdx === cur) return 'active'
  return 'pending'
}

function StepIcon({ state }) {
  if (state === 'done')   return <span style={{ color: 'var(--green)',   fontSize: 13 }}>✓</span>
  if (state === 'failed') return <span style={{ color: 'var(--red)',     fontSize: 13 }}>✗</span>
  if (state === 'active') return (
    <span style={{
      display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
      border: '2px solid var(--accent)', borderTopColor: 'transparent',
      animation: 'spin .75s linear infinite',
    }} />
  )
  return <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>○</span>
}

function ProgressBar({ value }) {
  return (
    <div style={{
      height: 3, borderRadius: 2, background: 'var(--bg-hover)',
      overflow: 'hidden', width: '100%',
    }}>
      <div style={{
        height: '100%',
        width: `${value}%`,
        background: value === 100
          ? 'var(--green)'
          : 'linear-gradient(90deg, var(--accent), var(--accent2))',
        transition: 'width .4s ease',
        borderRadius: 2,
      }} />
    </div>
  )
}

function PlatformCard({ platform, result, onRetry, expanded, taskId }) {
  const status   = result?.status ?? 'pending'
  const isFailed = status === 'failed'
  const isDone   = status === 'success'
  const isActive = ['logging_in','navigating','filling','publishing','retrying','awaiting_assist'].includes(status)
  const isWait   = !isActive && !isFailed && !isDone

  const stepIdx  = STATUS_STEP[status] ?? -1
  const progress = isDone ? 100 : Math.round(((stepIdx + 1) / 4) * 100)

  const borderColor = isDone  ? 'rgba(34,211,165,.3)'
    : isFailed ? 'rgba(248,113,113,.3)'
    : isActive  ? 'var(--border-active)'
    : 'var(--border)'

  const statusLabel = isDone   ? '✓ 发布成功'
    : isFailed                 ? '✗ 失败'
    : status === 'awaiting_assist' ? '⏸ 等待操作'
    : isActive                 ? '进行中...'
    : isWait                   ? '等待中'
    : status

  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 12,
      border: `1px solid ${borderColor}`,
      padding: '16px 18px',
      transition: 'border-color .3s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: expanded ? 14 : 10 }}>
        <span style={{ fontSize: 20 }}>{PICONS[platform] ?? '🌐'}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', flex: 1 }}>
          {PNAMES[platform] ?? platform}
        </span>

        {/* Retry button for failed */}
        {isFailed && onRetry && (
          <button
            onClick={() => onRetry(platform)}
            style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
              background: 'var(--accent-glow)', border: '1px solid var(--border-active)',
              color: 'var(--accent)',
            }}
          >
            重试
          </button>
        )}

        <span style={{
          fontSize: 11, padding: '3px 10px', borderRadius: 20,
          background: isDone ? 'rgba(34,211,165,.1)' : isFailed ? 'rgba(248,113,113,.1)'
            : isActive ? 'rgba(99,120,255,.1)' : 'var(--bg-hover)',
          color: isDone ? 'var(--green)' : isFailed ? 'var(--red)'
            : isActive ? 'var(--accent)' : 'var(--text-dim)',
        }}>
          {statusLabel}
        </span>
      </div>

      {/* Progress bar */}
      <ProgressBar value={isWait ? 0 : progress} />

      {/* Step list (shown in expanded mode) */}
      {expanded && !isWait && (
        <div style={{ display: 'flex', gap: 0, marginTop: 14 }}>
          {STEPS.map((step, i) => {
            const ss = stepState(i, status)
            return (
              <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: ss === 'done' ? 'rgba(34,211,165,.12)'
                      : ss === 'active' ? 'rgba(99,120,255,.12)'
                      : ss === 'failed' ? 'rgba(248,113,113,.12)'
                      : 'transparent',
                    border: `2px solid ${ss === 'done' ? 'var(--green)' : ss === 'active' ? 'var(--accent)' : ss === 'failed' ? 'var(--red)' : 'var(--text-dim)'}`,
                  }}>
                    <StepIcon state={ss} />
                  </div>
                  <span style={{
                    fontSize: 9, whiteSpace: 'nowrap',
                    color: ss === 'pending' ? 'var(--text-dim)' : 'var(--text-muted)',
                  }}>
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, margin: '0 3px', marginBottom: 14,
                    background: ss === 'done' ? 'rgba(34,211,165,.3)' : 'var(--bg-hover)',
                    transition: 'background .3s',
                  }} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Error message */}
      {isFailed && result?.error && (
        <div style={{
          marginTop: 10, fontSize: 11, color: 'var(--red)', lineHeight: 1.5,
          background: 'rgba(248,113,113,.06)', border: '1px solid rgba(248,113,113,.2)',
          borderRadius: 6, padding: '7px 10px', wordBreak: 'break-all',
        }}>
          ⚠ {result.error}
        </div>
      )}

      {/* Await assist — show inline popup with screenshot */}
      {status === 'awaiting_assist' && taskId && (
        <AssistPopup
          taskId={taskId}
          platform={platform}
          message={result?.assist_message ?? '请在浏览器中操作后点击「继续」'}
          screenshotB64={result?.assist_screenshot ?? ''}
        />
      )}
    </div>
  )
}

/* ── Assist dialog (embedded in modal) ───────────────────────────────────── */
function AssistPopup({ taskId, platform, message, screenshotB64 }) {
  const [loading, setLoading] = useState(null)   // null | 'agent' | 'user'

  async function resume(action, which) {
    setLoading(which)
    try { await assistResume(taskId, platform, action) }
    catch {}
    finally { setLoading(null) }
  }

  const busy = loading !== null

  return (
    <div style={{
      marginTop: 12,
      background: 'rgba(245,158,11,.07)', border: '1px solid rgba(245,158,11,.25)',
      borderRadius: 10, padding: '14px 16px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>⏸</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>
          模板选择
        </span>
      </div>

      {/* Screenshot */}
      {screenshotB64 && (
        <img
          src={`data:image/png;base64,${screenshotB64}`}
          alt="browser"
          style={{
            width: '100%', borderRadius: 6, border: '1px solid var(--border)',
            marginBottom: 12, maxHeight: 220, objectFit: 'contain', background: '#000',
          }}
        />
      )}

      {/* Question */}
      <div style={{
        textAlign: 'center', fontSize: 13, fontWeight: 700,
        color: 'var(--text)', marginBottom: 4,
      }}>
        如何选择排版模板？
      </div>
      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-dim)', marginBottom: 14 }}>
        选好后 Agent 将自动进入发布设置页完成发布
      </div>

      {/* Two main choice buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {/* Agent auto-select */}
        <button
          onClick={() => resume('agent_select', 'agent')}
          disabled={busy}
          style={{
            flex: 1, padding: '12px 8px', borderRadius: 9, fontSize: 12,
            cursor: busy ? 'default' : 'pointer', fontWeight: 600,
            background: loading === 'agent'
              ? 'rgba(99,120,255,.3)'
              : 'linear-gradient(135deg, var(--accent), var(--accent2))',
            border: 'none', color: '#fff',
            opacity: busy && loading !== 'agent' ? .45 : 1,
            transition: 'opacity .2s',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}
        >
          <span style={{ fontSize: 20 }}>🤖</span>
          <span>{loading === 'agent' ? '选择中...' : 'Agent 帮我选'}</span>
          <span style={{ fontSize: 10, opacity: .8, fontWeight: 400 }}>根据文章特色推荐</span>
        </button>

        {/* User manual select */}
        <button
          onClick={() => resume('user_helped', 'user')}
          disabled={busy}
          style={{
            flex: 1, padding: '12px 8px', borderRadius: 9, fontSize: 12,
            cursor: busy ? 'default' : 'pointer', fontWeight: 600,
            background: loading === 'user'
              ? 'rgba(34,211,165,.2)'
              : 'rgba(34,211,165,.08)',
            border: `1px solid ${loading === 'user' ? 'var(--green)' : 'rgba(34,211,165,.3)'}`,
            color: 'var(--green)',
            opacity: busy && loading !== 'user' ? .45 : 1,
            transition: 'opacity .2s',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}
        >
          <span style={{ fontSize: 20 }}>✋</span>
          <span>{loading === 'user' ? '继续中...' : '我已选好'}</span>
          <span style={{ fontSize: 10, opacity: .8, fontWeight: 400 }}>在浏览器手动点击</span>
        </button>
      </div>

      {/* Hint about browser click auto-detection */}
      <div style={{
        textAlign: 'center', fontSize: 10, color: 'var(--text-dim)',
        background: 'rgba(255,255,255,.03)', borderRadius: 6, padding: '6px 8px',
      }}>
        💡 也可直接在浏览器中点击模板，Agent 检测到后自动继续
      </div>
    </div>
  )
}

export default function PublishModal({ open, onClose, taskData, taskId, onRetry }) {
  const [expanded, setExpanded] = useState(true)

  // ESC key
  useEffect(() => {
    if (!open) return
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  const results = taskData?.adapted_results ?? {}
  const entries = Object.entries(results).filter(([, r]) =>
    ['logging_in','navigating','filling','publishing','retrying','awaiting_assist','success','failed','blocked'].includes(r?.status)
  )

  const activeCount  = entries.filter(([, r]) =>
    ['logging_in','navigating','filling','publishing','retrying','awaiting_assist'].includes(r?.status)
  ).length
  const successCount = entries.filter(([, r]) => r?.status === 'success').length
  const failCount    = entries.filter(([, r]) => r?.status === 'failed').length
  const total        = entries.length
  const allDone      = total > 0 && activeCount === 0 && entries.every(([, r]) => ['success','failed','blocked'].includes(r?.status))

  const summaryText = allDone
    ? `已完成：${successCount} 成功 ${failCount > 0 ? `/ ${failCount} 失败` : ''}`
    : activeCount > 0
      ? `正在发布 ${activeCount}/${total}...`
      : `等待发布...`

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)',
    }}>
      <div style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        width: '92%', maxWidth: 560,
        maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
        animation: 'modalIn .25s ease',
        boxShadow: '0 24px 80px rgba(0,0,0,.7)',
      }}>
        {/* Modal header */}
        <div style={{
          padding: '18px 22px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', flexShrink: 0,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>发布进度</div>
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              marginRight: 10, padding: '4px 12px', borderRadius: 6, fontSize: 11,
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-muted)', cursor: 'pointer',
            }}
          >
            {expanded ? '− 折叠' : '＋ 展开'}
          </button>
          {allDone && (
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
                fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Platform cards */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)', fontSize: 13 }}>
              等待发布任务启动...
            </div>
          ) : (
            entries.map(([pid, r]) => (
              <PlatformCard
                key={pid}
                platform={pid}
                result={r}
                onRetry={onRetry}
                expanded={expanded}
                taskId={taskId}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 22px', borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {activeCount > 0 && (
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--accent)', display: 'inline-block',
                animation: 'pulse 1s ease-in-out infinite',
              }} />
            )}
            <span style={{
              fontSize: 13, fontWeight: 500,
              color: allDone && failCount === 0 ? 'var(--green)'
                : allDone && failCount > 0 ? 'var(--orange)'
                : 'var(--text-muted)',
            }}>
              {allDone && successCount > 0 && `✓ `}
              {summaryText}
            </span>
          </div>
          {allDone && (
            <button
              onClick={onClose}
              className="btn-primary"
              style={{ padding: '8px 20px', fontSize: 13 }}
            >
              关闭
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
