/**
 * PublishModal — glassmorphism overlay showing real-time publish progress.
 * Props: open, onClose, taskData, taskId, onRetry
 */
import { useState, useEffect, useRef } from 'react'
import { assistResume } from '../api/client'

const PNAMES = {
  wechat: '公众号', zhihu: '知乎', xiaohongshu: '小红书', bilibili: 'B站',
  csdn: 'CSDN', weibo: '微博', douyin: '抖音图文',
}
const PICONS = {
  wechat: '💬', zhihu: '🔵', xiaohongshu: '📕', bilibili: '📺',
  csdn: '📝', weibo: '🌐', douyin: '🎵',
}

const STEPS = [
  { key: 'logging_in', label: '登录检测'   },
  { key: 'navigating', label: '打开编辑器' },
  { key: 'filling',    label: '填写内容'   },
  { key: 'publishing', label: '点击发布'   },
]

const STATUS_STEP = {
  logging_in: 0, navigating: 1, filling: 2, publishing: 3,
  retrying: 3, awaiting_assist: 3, success: 4, failed: 4,
}

function stepState(stepIdx, platformStatus) {
  const cur    = STATUS_STEP[platformStatus] ?? -1
  const failed = platformStatus === 'failed'
  const done   = platformStatus === 'success'
  if (done)   return 'done'
  if (failed) return stepIdx < cur ? 'done' : stepIdx === cur ? 'failed' : 'pending'
  if (stepIdx < cur)   return 'done'
  if (stepIdx === cur) return 'active'
  return 'pending'
}

function StepDot({ state }) {
  const color = state === 'done'   ? 'var(--green)'
    : state === 'failed' ? 'var(--red)'
    : state === 'active' ? 'var(--accent)'
    : 'var(--text-4)'

  return (
    <div style={{
      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: state === 'done'   ? 'rgba(52,211,153,0.12)'
        : state === 'active' ? 'rgba(123,110,246,0.12)'
        : state === 'failed' ? 'rgba(248,113,113,0.12)'
        : 'transparent',
      border: `2px solid ${color}`,
      transition: 'all .3s',
    }}>
      {state === 'done'   && <span style={{ color: 'var(--green)', fontSize: 11, animation: 'checkIn .3s ease' }}>✓</span>}
      {state === 'failed' && <span style={{ color: 'var(--red)',   fontSize: 11 }}>✗</span>}
      {state === 'active' && (
        <span style={{
          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
          border: '2px solid var(--accent)', borderTopColor: 'transparent',
          animation: 'spin .75s linear infinite',
        }} />
      )}
      {state === 'pending' && <span style={{ color: 'var(--text-4)', fontSize: 9 }}>○</span>}
    </div>
  )
}

function GlowBar({ value, success }) {
  return (
    <div style={{
      height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.05)',
      overflow: 'hidden', width: '100%',
    }}>
      <div style={{
        height: '100%', width: `${value}%`,
        background: success
          ? 'linear-gradient(90deg, var(--green), #059669)'
          : 'linear-gradient(90deg, #7B6EF6, #60A5FA)',
        transition: 'width .5s cubic-bezier(0.4,0,0.2,1)',
        borderRadius: 2,
        boxShadow: value > 0 ? `0 0 8px ${success ? 'var(--green-glow)' : 'var(--accent-glow)'}` : 'none',
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

  const borderColor = isDone  ? 'rgba(52,211,153,.22)'
    : isFailed ? 'rgba(248,113,113,.22)'
    : isActive  ? 'rgba(123,110,246,.3)'
    : 'var(--border)'

  const leftBarColor = isDone  ? 'var(--green)'
    : isFailed ? 'var(--red)'
    : isActive  ? 'linear-gradient(to bottom, #7B6EF6, #60A5FA)'
    : 'var(--text-4)'

  const statusLabel = isDone   ? '✓ 发布成功'
    : isFailed                 ? '✗ 失败'
    : status === 'awaiting_assist' ? '⏸ 等待操作'
    : status === 'retrying'   ? '↺ 重试中'
    : isActive                 ? '进行中'
    : '等待中'

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      borderRadius: 'var(--r-lg)',
      border: `1px solid ${borderColor}`,
      padding: '14px 16px',
      transition: 'border-color .35s',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* left status bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: leftBarColor,
        borderRadius: '16px 0 0 16px',
        boxShadow: isDone  ? '0 0 8px var(--green-glow)'
          : isActive ? '0 0 8px var(--accent-glow)'
          : 'none',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingLeft: 4 }}>
        <span style={{ fontSize: 18 }}>{PICONS[platform] ?? '🌐'}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', flex: 1 }}>
          {PNAMES[platform] ?? platform}
        </span>

        {isFailed && onRetry && (
          <button
            onClick={() => onRetry(platform)}
            style={{
              padding: '3px 10px', borderRadius: 'var(--r-sm)', fontSize: 11, cursor: 'pointer',
              background: 'rgba(123,110,246,0.1)', border: '1px solid rgba(123,110,246,0.3)',
              color: 'var(--accent)', transition: 'all .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(123,110,246,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(123,110,246,0.1)' }}
          >↺ 重试</button>
        )}

        <span style={{
          fontSize: 11, padding: '2px 9px', borderRadius: 20,
          background: isDone ? 'rgba(52,211,153,.1)'  : isFailed ? 'rgba(248,113,113,.1)'
            : isActive ? 'rgba(123,110,246,.1)' : 'rgba(255,255,255,0.04)',
          color: isDone ? 'var(--green)' : isFailed ? 'var(--red)'
            : isActive ? 'var(--accent)' : 'var(--text-3)',
          border: isDone ? '1px solid rgba(52,211,153,.2)' : isFailed ? '1px solid rgba(248,113,113,.2)'
            : isActive ? '1px solid rgba(123,110,246,.2)' : '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {isActive && !isDone && !isFailed && (
            <span style={{
              width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)',
              display: 'inline-block', animation: 'pulse 1s infinite',
            }} />
          )}
          {statusLabel}
        </span>
      </div>

      {/* Progress bar */}
      <GlowBar value={isWait ? 0 : progress} success={isDone} />

      {/* Step list */}
      {expanded && !isWait && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, marginTop: 14 }}>
          {STEPS.map((step, i) => {
            const ss = stepState(i, status)
            return (
              <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <StepDot state={ss} />
                  <span style={{ fontSize: 9, whiteSpace: 'nowrap', color: ss === 'pending' ? 'var(--text-4)' : 'var(--text-3)' }}>
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{
                    flex: 1, height: 1, margin: '0 4px', marginBottom: 20,
                    background: ss === 'done' ? 'rgba(52,211,153,.35)' : 'rgba(255,255,255,0.06)',
                    borderStyle: ss === 'done' ? 'solid' : 'dashed',
                    borderTop: '1px',
                    transition: 'background .3s',
                  }} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Error */}
      {isFailed && result?.error && (
        <div style={{
          marginTop: 10, fontSize: 11, color: 'var(--red)', lineHeight: 1.5,
          background: 'rgba(248,113,113,.06)', border: '1px solid rgba(248,113,113,.15)',
          borderRadius: 'var(--r-sm)', padding: '7px 10px', wordBreak: 'break-all',
        }}>
          ⚠ {result.error}
        </div>
      )}

      {/* Await assist */}
      {status === 'awaiting_assist' && taskId && (
        <AssistPopup
          taskId={taskId} platform={platform}
          message={result?.assist_message ?? '请在浏览器中操作后点击「继续」'}
          screenshotB64={result?.assist_screenshot ?? ''}
        />
      )}
    </div>
  )
}

/* ── Assist dialog ─────────────────────────────────────────────────────────── */
function AssistPopup({ taskId, platform, message, screenshotB64 }) {
  const [loading, setLoading] = useState(null)

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
      background: 'rgba(251,191,36,.06)', border: '1px solid rgba(251,191,36,.22)',
      borderRadius: 'var(--r-md)', padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>⏸</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>模板选择</span>
      </div>

      {screenshotB64 && (
        <img src={`data:image/png;base64,${screenshotB64}`} alt="browser"
          style={{ width: '100%', borderRadius: 6, border: '1px solid var(--border)',
            marginBottom: 12, maxHeight: 220, objectFit: 'contain', background: '#000' }} />
      )}

      <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
        如何选择排版模板？
      </div>
      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)', marginBottom: 14 }}>
        选好后 Agent 将自动完成发布
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button onClick={() => resume('agent_select', 'agent')} disabled={busy} style={{
          flex: 1, padding: '11px 8px', borderRadius: 10, fontSize: 12,
          cursor: busy ? 'default' : 'pointer', fontWeight: 600,
          background: loading === 'agent' ? 'rgba(123,110,246,.3)'
            : 'linear-gradient(135deg, #7B6EF6, #A78BFA)',
          border: 'none', color: '#fff',
          opacity: busy && loading !== 'agent' ? .45 : 1,
          transition: 'opacity .2s',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          boxShadow: '0 4px 16px rgba(123,110,246,0.35)',
        }}>
          <span style={{ fontSize: 20 }}>🤖</span>
          <span>{loading === 'agent' ? '选择中...' : 'Agent 帮我选'}</span>
          <span style={{ fontSize: 10, opacity: .75, fontWeight: 400 }}>根据文章特色推荐</span>
        </button>

        <button onClick={() => resume('user_helped', 'user')} disabled={busy} style={{
          flex: 1, padding: '11px 8px', borderRadius: 10, fontSize: 12,
          cursor: busy ? 'default' : 'pointer', fontWeight: 600,
          background: loading === 'user' ? 'rgba(52,211,153,.2)' : 'rgba(52,211,153,.07)',
          border: `1px solid ${loading === 'user' ? 'var(--green)' : 'rgba(52,211,153,.3)'}`,
          color: 'var(--green)',
          opacity: busy && loading !== 'user' ? .45 : 1,
          transition: 'all .2s',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}>
          <span style={{ fontSize: 20 }}>✋</span>
          <span>{loading === 'user' ? '继续中...' : '我已选好'}</span>
          <span style={{ fontSize: 10, opacity: .75, fontWeight: 400 }}>在浏览器手动点击</span>
        </button>
      </div>

      <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-3)',
        background: 'rgba(255,255,255,.03)', borderRadius: 6, padding: '5px 8px' }}>
        💡 也可直接在浏览器中点击模板，Agent 检测到后自动继续
      </div>
    </div>
  )
}

/* ── Confetti canvas ─────────────────────────────────────────────────────── */
function Confetti({ active }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!active || !ref.current) return
    const canvas = ref.current
    const ctx    = canvas.getContext('2d')
    canvas.width  = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    const pieces  = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: -10,
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 4 + 2,
      color: ['#7B6EF6','#A78BFA','#60A5FA','#34D399','#FBBF24'][Math.floor(Math.random()*5)],
      r: Math.random() * 4 + 2,
      rot: Math.random() * 360,
      vrot: (Math.random() - 0.5) * 10,
    }))
    let raf
    let t = 0
    function draw() {
      t++
      if (t > 120) { cancelAnimationFrame(raf); return }
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      pieces.forEach(p => {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot * Math.PI / 180)
        ctx.fillStyle = p.color
        ctx.globalAlpha = Math.max(0, 1 - t / 120)
        ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2)
        ctx.restore()
        p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.rot += p.vrot
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [active])

  if (!active) return null
  return (
    <canvas ref={ref} style={{
      position: 'absolute', inset: 0, width: '100%', height: '100%',
      pointerEvents: 'none', borderRadius: 'var(--r-xl)',
    }} />
  )
}

/* ── Main component ─────────────────────────────────────────────────────── */
export default function PublishModal({ open, onClose, taskData, taskId, onRetry }) {
  const [expanded, setExpanded] = useState(true)

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
  const allSuccess   = allDone && failCount === 0 && successCount > 0

  const overallPct = total === 0 ? 0 : Math.round(
    (entries.filter(([, r]) => ['success','failed','blocked'].includes(r?.status)).length / total) * 100
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)',
      animation: 'fadeIn .2s ease',
    }}>
      <div style={{
        background: 'rgba(8,11,18,0.97)',
        border: '1px solid rgba(123,110,246,0.2)',
        borderRadius: 'var(--r-xl)',
        width: '92%', maxWidth: 540,
        maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
        animation: 'modalIn .35s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: '0 25px 80px rgba(0,0,0,.75), 0 0 60px rgba(123,110,246,0.08), 0 0 0 1px rgba(255,255,255,0.04) inset',
        position: 'relative', overflow: 'hidden',
      }}>
        <Confetti active={allSuccess} />

        {/* Header */}
        <div style={{
          padding: '18px 22px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          flexShrink: 0,
        }}>
          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
                {allSuccess ? '🎉 发布完成' : '发布进度'}
              </div>
              {total > 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                  {successCount} / {total} 平台
                </div>
              )}
            </div>
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                marginRight: 10, padding: '4px 12px', borderRadius: 'var(--r-sm)', fontSize: 11,
                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                color: 'var(--text-3)', cursor: 'pointer', transition: 'all .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
            >
              {expanded ? '− 折叠' : '＋ 展开'}
            </button>
            {allDone && (
              <button onClick={onClose} style={{
                width: 28, height: 28, borderRadius: 'var(--r-sm)',
                border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-3)', cursor: 'pointer',
                fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; e.currentTarget.style.color = 'var(--red)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)' }}
              >×</button>
            )}
          </div>

          {/* Overall progress bar */}
          <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 1, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${overallPct}%`,
              background: allSuccess
                ? 'linear-gradient(90deg, var(--green), #059669)'
                : 'linear-gradient(90deg, #7B6EF6, #60A5FA)',
              borderRadius: 1, transition: 'width .5s ease',
              boxShadow: overallPct > 0 ? '0 0 6px rgba(123,110,246,0.5)' : 'none',
            }} />
          </div>
        </div>

        {/* Cards */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 8, animation: 'pulse 2s infinite' }}>⟳</div>
              等待发布任务启动...
            </div>
          ) : (
            entries.map(([pid, r]) => (
              <PlatformCard key={pid} platform={pid} result={r}
                onRetry={onRetry} expanded={expanded} taskId={taskId} />
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 22px 16px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {activeCount > 0 && (
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--accent)', display: 'inline-block',
                animation: 'pulse-glow 1.5s infinite',
              }} />
            )}
            <span style={{
              fontSize: 13, fontWeight: 500,
              color: allDone && failCount === 0 ? 'var(--green)'
                : allDone && failCount > 0 ? 'var(--orange)'
                : 'var(--text-2)',
            }}>
              {allDone && successCount > 0 && '✓ '}
              {allDone
                ? `已完成：${successCount} 成功${failCount > 0 ? ` / ${failCount} 失败` : ''}`
                : activeCount > 0
                  ? `正在发布 ${activeCount}/${total}...`
                  : '等待发布...'}
            </span>
          </div>
          {allDone && (
            <button onClick={onClose} className="btn-primary"
              style={{ padding: '8px 22px', fontSize: 13 }}>
              关闭
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
