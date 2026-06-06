/**
 * 发布进度面板 — 实时展示每个平台的执行步骤 + 日志流
 */
import { useState } from 'react'
import { assistResume } from '../api/client'

const PNAMES = { wechat: '公众号', zhihu: '知乎', xiaohongshu: '小红书', bilibili: 'B站' }

const PLATFORM_COLORS = {
  wechat: '#07C160', zhihu: '#0066FF', xiaohongshu: '#FF2442',
  bilibili: '#00AEEC', csdn: '#FC5531', weibo: '#E6162D', douyin: '#FE2C55',
}

const STEPS = [
  { key: 'logging_in', label: '登录检测' },
  { key: 'navigating', label: '打开编辑器' },
  { key: 'filling',    label: '填写内容' },
  { key: 'publishing', label: '提交发布' },
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

/* ── StepDot ─────────────────────────────────────────────── */
function StepDot({ state }) {
  const colors = {
    pending: 'var(--text-3)',
    active:  'var(--accent)',
    done:    'var(--green)',
    failed:  'var(--red)',
  }
  const c = colors[state] ?? 'var(--text-3)'
  return (
    <span style={{
      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: state === 'pending' ? 'transparent' : `${c}18`,
      border: `2px solid ${state === 'pending' ? 'var(--border)' : c}`,
      fontSize: 10, color: c,
      transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      boxShadow: state === 'active' ? `0 0 10px ${c}40` : 'none',
    }}>
      {state === 'active' && (
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          border: '2px solid currentColor', borderTopColor: 'transparent',
          display: 'inline-block',
          animation: 'spin 0.75s linear infinite',
        }} />
      )}
      {state === 'done'   && <span style={{ animation: 'checkIn .3s ease' }}>✓</span>}
      {state === 'failed' && '✗'}
    </span>
  )
}

/* ── PlatformRow ─────────────────────────────────────────── */
function PlatformRow({ platform, result, index }) {
  const status       = result?.status ?? 'pending'
  const stepIdx      = STATUS_STEP[status] ?? -1
  const isFailed     = status === 'failed'
  const isSuccess    = status === 'success'
  const isAwaitAssist = status === 'awaiting_assist'
  const isActive     = ['logging_in','navigating','filling','publishing','retrying','awaiting_assist'].includes(status)
  const pcolor       = PLATFORM_COLORS[platform] ?? 'var(--accent)'

  function stepState(i) {
    if (isFailed) {
      if (i < stepIdx)   return 'done'
      if (i === stepIdx) return 'failed'
      return 'pending'
    }
    if (isSuccess) return 'done'
    if (i < stepIdx)   return 'done'
    if (i === stepIdx) return 'active'
    return 'pending'
  }

  const borderColor = isSuccess     ? 'rgba(52,211,153,0.2)'
    : isFailed      ? 'rgba(248,113,113,0.2)'
    : isActive      ? 'rgba(123,110,246,0.2)'
    : 'var(--border)'

  return (
    <div className="glass-panel" style={{
      padding: '14px 16px',
      border: `1px solid ${borderColor}`,
      transition: 'border-color 0.3s',
      animation: `fadeUp .25s ease ${(index ?? 0) * 60}ms both`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Left color bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: isSuccess ? 'var(--green)'
          : isFailed ? 'var(--red)'
          : isActive ? pcolor
          : 'var(--border)',
        borderRadius: '0 0 0 0',
        boxShadow: isActive ? `0 0 10px ${pcolor}` : 'none',
        transition: 'all 0.3s',
      }} />

      {/* Platform name + status badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingLeft: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: pcolor, flexShrink: 0,
            boxShadow: isActive ? `0 0 6px ${pcolor}` : 'none',
            animation: isActive ? 'pulse-glow 1.5s ease-in-out infinite' : 'none',
          }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
            {PNAMES[platform] ?? platform}
          </span>
        </div>
        <span style={{
          fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 500,
          background: isSuccess     ? 'rgba(52,211,153,0.1)'
            : isFailed  ? 'rgba(248,113,113,0.1)'
            : isAwaitAssist ? 'rgba(251,191,36,0.1)'
            : isActive  ? 'rgba(123,110,246,0.1)'
            : 'rgba(255,255,255,0.04)',
          color: isSuccess     ? 'var(--green)'
            : isFailed  ? 'var(--red)'
            : isAwaitAssist ? 'var(--orange)'
            : isActive  ? 'var(--accent)'
            : 'var(--text-3)',
          border: isSuccess     ? '1px solid rgba(52,211,153,0.2)'
            : isFailed  ? '1px solid rgba(248,113,113,0.2)'
            : isAwaitAssist ? '1px solid rgba(251,191,36,0.2)'
            : isActive  ? '1px solid rgba(123,110,246,0.2)'
            : '1px solid var(--border)',
        }}>
          {isSuccess ? '✓ 发布成功'
            : isFailed ? '✗ 失败'
            : isAwaitAssist ? '⏸ 等待操作'
            : isActive ? '进行中...'
            : '等待发布'}
        </span>
      </div>

      {/* Step indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {STEPS.map((step, i) => (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <StepDot state={stepState(i)} />
              <span style={{
                fontSize: 9, whiteSpace: 'nowrap',
                color: stepState(i) === 'pending' ? 'var(--text-3)' : 'var(--text-2)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.02em',
              }}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: '0 4px', marginBottom: 14,
                background: stepState(i) === 'done'
                  ? 'rgba(52,211,153,0.3)'
                  : 'var(--border)',
                borderRadius: 1,
                transition: 'background 0.3s',
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Error message */}
      {isFailed && result?.error && (
        <div style={{
          marginTop: 10, fontSize: 11, color: 'var(--red)',
          background: 'rgba(248,113,113,0.06)',
          border: '1px solid rgba(248,113,113,0.15)',
          borderRadius: 'var(--r-sm)', padding: '7px 10px',
          wordBreak: 'break-all', lineHeight: 1.5,
        }}>
          ⚠ {result.error}
        </div>
      )}

      {isFailed && (
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-3)' }}>
          💡 可在下方再次点击「确认发布」→「直接发布」重试
        </div>
      )}
    </div>
  )
}

/* ── LogStream ───────────────────────────────────────────── */
function LogStream({ logs }) {
  if (!logs?.length) return null
  const pubLogs = logs.filter(l =>
    l.includes('登录') || l.includes('编辑器') || l.includes('填写') ||
    l.includes('发布') || l.includes('重试')   || l.includes('失败') ||
    l.includes('成功') || l.includes('系统')   || l.includes('异常') ||
    l.includes('等待用户') || l.includes('继续执行') || l.includes('超时')
  )
  if (!pubLogs.length) return null

  return (
    <div style={{
      marginTop: 12,
      background: 'rgba(0,0,0,0.3)',
      borderRadius: 'var(--r-md)',
      border: '1px solid var(--border)',
      padding: '10px 12px',
      maxHeight: 180,
      overflow: 'auto',
    }}>
      {/* Terminal header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        marginBottom: 7, paddingBottom: 6,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        {['var(--red)', 'var(--orange)', 'var(--green)'].map((c, i) => (
          <span key={i} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: c, opacity: 0.5,
          }} />
        ))}
        <span style={{ fontSize: 9, color: 'var(--text-3)', marginLeft: 4, letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
          EXECUTION LOG
        </span>
      </div>
      {pubLogs.map((line, i) => {
        const color = line.includes('失败') || line.includes('异常') ? 'var(--red)'
          : line.includes('成功') || line.includes('✓')             ? 'var(--green)'
          : line.includes('重试') || line.includes('等待用户')       ? 'var(--orange)'
          : line.includes('继续执行')                                ? 'var(--accent)'
          : 'var(--text-3)'
        return (
          <div key={i} style={{
            fontSize: 11, color, lineHeight: 1.7,
            fontFamily: 'var(--font-mono)',
            display: 'flex', gap: 8,
          }}>
            <span style={{ color: 'var(--text-3)', flexShrink: 0, opacity: 0.5 }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            {line}
          </div>
        )
      })}
    </div>
  )
}

/* ── AssistDialog ────────────────────────────────────────── */
function AssistDialog({ taskId, platform, message, screenshotB64, onDone }) {
  const [loading, setLoading] = useState(false)

  async function handleResume(action) {
    setLoading(true)
    try {
      await assistResume(taskId, platform, action)
    } catch (e) {
      console.error('assist-resume failed', e)
    } finally {
      setLoading(false)
      onDone?.()
    }
  }

  const pname  = PNAMES[platform] ?? platform
  const pcolor = PLATFORM_COLORS[platform] ?? 'var(--accent)'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      WebkitBackdropFilter: 'blur(8px)',
      backdropFilter: 'blur(8px)',
      animation: 'fadeIn .2s ease',
    }}>
      <div style={{
        background: 'rgba(8,11,18,0.97)',
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(251,191,36,0.25)',
        borderRadius: 'var(--r-xl)',
        padding: '24px',
        maxWidth: 560,
        width: '90vw',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 40px rgba(251,191,36,0.08)',
        animation: 'modalIn .35s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(251,191,36,0.1)',
            border: '1px solid rgba(251,191,36,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, flexShrink: 0,
            animation: 'float 3s ease-in-out infinite',
          }}>🤔</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--orange)' }}>
              Agent 需要你帮一个忙
            </div>
            <div style={{
              fontSize: 11, marginTop: 3,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 4,
                background: `${pcolor}18`, border: `1px solid ${pcolor}30`,
                color: pcolor,
              }}>{pname}</span>
              <span style={{ color: 'var(--text-3)' }}>· 等待操作</span>
            </div>
          </div>
        </div>

        {/* Message */}
        <div style={{
          fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          padding: '11px 14px', marginBottom: 16,
        }}>
          {message}
        </div>

        {/* Screenshot preview */}
        {screenshotB64 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 10, color: 'var(--text-3)', marginBottom: 6,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              fontFamily: 'var(--font-mono)',
            }}>
              当前浏览器页面
            </div>
            <img
              src={`data:image/png;base64,${screenshotB64}`}
              alt="browser preview"
              style={{
                width: '100%', borderRadius: 'var(--r-md)',
                border: '1px solid var(--border)',
                maxHeight: 280, objectFit: 'contain',
                background: '#000',
              }}
            />
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => handleResume('user_helped')}
            disabled={loading}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 'var(--r-md)',
              background: 'rgba(251,191,36,0.1)',
              border: '1px solid rgba(251,191,36,0.3)',
              color: 'var(--orange)', fontSize: 13,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600, transition: 'all .2s',
            }}
            onMouseEnter={e => {
              if (!loading) e.currentTarget.style.background = 'rgba(251,191,36,0.18)'
            }}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(251,191,36,0.1)')}
          >
            {loading ? '发送中...' : '✅ 我已选好，继续发布'}
          </button>
          <button
            onClick={() => handleResume('continue')}
            disabled={loading}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 'var(--r-md)',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border)',
              color: 'var(--text-3)', fontSize: 13,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-2)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
          >
            使用默认，继续
          </button>
        </div>

        <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text-3)', textAlign: 'center' }}>
          5 分钟内不操作将自动使用默认选项继续
        </div>
      </div>
    </div>
  )
}

/* ══ Main component ════════════════════════════════════════ */
export default function PublishProgressPanel({ taskData, taskId }) {
  const results = taskData?.adapted_results ?? {}

  const publishPlatforms = Object.entries(results).filter(([, r]) =>
    ['logging_in','navigating','filling','publishing','retrying','awaiting_assist','success','failed'].includes(r?.status)
  )

  if (publishPlatforms.length === 0) return null

  const anyActive  = publishPlatforms.some(([,r]) =>
    ['logging_in','navigating','filling','publishing','retrying','awaiting_assist'].includes(r?.status))
  const allSuccess = publishPlatforms.every(([,r]) => r?.status === 'success')
  const anyFailed  = publishPlatforms.some(([,r]) => r?.status === 'failed')

  const assistEntry = publishPlatforms.find(([,r]) => r?.status === 'awaiting_assist')

  return (
    <>
      {/* Human-in-the-loop assist dialog */}
      {assistEntry && taskId && (
        <AssistDialog
          taskId={taskId}
          platform={assistEntry[0]}
          message={assistEntry[1]?.assist_message ?? '请在浏览器中完成操作后点击「继续」'}
          screenshotB64={assistEntry[1]?.assist_screenshot ?? ''}
          onDone={() => {}}
        />
      )}

      <div className="glass-panel" style={{
        padding: '16px',
        marginBottom: 18,
        border: allSuccess  ? '1px solid rgba(52,211,153,0.2)'
          : anyFailed ? '1px solid rgba(248,113,113,0.15)'
          : anyActive ? '1px solid rgba(123,110,246,0.15)'
          : '1px solid var(--border)',
        transition: 'border-color 0.3s',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          {anyActive && (
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--accent)', display: 'inline-block',
              boxShadow: '0 0 8px var(--accent)',
              animation: 'pulse 1s ease-in-out infinite',
            }} />
          )}
          {allSuccess && (
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--green)', display: 'inline-block',
              animation: 'checkIn .3s ease',
            }} />
          )}
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: allSuccess ? 'var(--green)' : anyFailed ? 'var(--red)' : 'var(--text-3)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            fontFamily: 'var(--font-mono)',
          }}>
            {allSuccess ? '✓ 发布完成' : anyActive ? 'Agent 执行中...' : '发布结果'}
          </span>
        </div>

        {/* Per-platform rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {publishPlatforms.map(([pid, r], i) => (
            <PlatformRow key={pid} platform={pid} result={r} index={i} />
          ))}
        </div>

        {/* Log stream */}
        <LogStream logs={taskData?.execution_log} />
      </div>
    </>
  )
}
