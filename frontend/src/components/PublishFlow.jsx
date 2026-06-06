import { useRef, useEffect } from 'react'
import { finalConfirm, finalConfirmAll } from '../api/client'

const PNAMES = {
  wechat: '公众号', zhihu: '知乎',
  xiaohongshu: '小红书', bilibili: 'B站',
}

const PLATFORM_COLORS = {
  wechat: '#07C160', zhihu: '#0066FF', xiaohongshu: '#FF2442',
  bilibili: '#00AEEC', csdn: '#FC5531', weibo: '#E6162D', douyin: '#FE2C55',
}

const STATUS_PHASE = {
  logging_in:             1,
  navigating:             2,
  filling:                2,
  awaiting_final_confirm: 3,
  publishing:             4,
  success:                4,
  failed:                 4,
  blocked:                4,
}

/* ── Spinner ─────────────────────────────────────────────── */
function Spinner({ size = 14 }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      border: '2px solid rgba(123,110,246,0.3)', borderTopColor: 'var(--accent)',
      display: 'inline-block', animation: 'spin 0.75s linear infinite',
    }} />
  )
}

/* ── StepDot ─────────────────────────────────────────────── */
function StepDot({ n, active, done }) {
  const color = done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--text-3)'
  return (
    <div style={{
      width: 26, height: 26, borderRadius: '50%',
      background: done ? 'rgba(52,211,153,0.15)' : active ? 'rgba(123,110,246,0.15)' : 'transparent',
      border: `2px solid ${done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--border)'}`,
      color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 700, flexShrink: 0,
      transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      boxShadow: active ? '0 0 12px rgba(123,110,246,0.35)' : done ? '0 0 8px rgba(52,211,153,0.2)' : 'none',
    }}>
      {done ? <span style={{ animation: 'checkIn .3s ease' }}>✓</span> : n}
    </div>
  )
}

const STEPS = ['登录检测', '内容填写', '预览确认', '发布完成']

/* ── Stepper ─────────────────────────────────────────────── */
function Stepper({ phase }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 18 }}>
      {STEPS.map((label, i) => {
        const n      = i + 1
        const done   = phase > n
        const active = phase === n
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center', flex: n < 4 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <StepDot n={n} active={active} done={done} />
              <span style={{
                fontSize: 10, whiteSpace: 'nowrap',
                color: done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--text-3)',
                fontFamily: 'var(--font-mono)',
                transition: 'color 0.3s',
              }}>
                {label}
              </span>
            </div>
            {n < 4 && (
              <div style={{
                flex: 1, height: 2, margin: '0 4px', marginBottom: 14,
                background: done ? 'rgba(52,211,153,0.25)' : 'var(--border)',
                borderRadius: 1,
                transition: 'background 0.4s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── StatusBadge ─────────────────────────────────────────── */
function StatusBadge({ status }) {
  const cfg = {
    logging_in:             { label: '登录检测中', color: 'var(--accent)',  spin: true  },
    navigating:             { label: '打开编辑器', color: 'var(--accent)',  spin: true  },
    filling:                { label: '填写内容',   color: 'var(--accent)',  spin: true  },
    awaiting_final_confirm: { label: '等待确认',   color: 'var(--orange)', spin: false },
    publishing:             { label: '发布中',     color: 'var(--accent)',  spin: true  },
    success:                { label: '发布成功 ✓', color: 'var(--green)',  spin: false },
    failed:                 { label: '失败',       color: 'var(--red)',    spin: false },
    blocked:                { label: '已跳过',     color: 'var(--text-3)', spin: false },
    pending:                { label: '等待中',     color: 'var(--text-3)', spin: false },
  }[status] ?? { label: status, color: 'var(--text-3)', spin: false }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      {cfg.spin && <Spinner size={11} />}
      <span style={{ fontSize: 11, color: cfg.color, fontWeight: 500 }}>{cfg.label}</span>
    </div>
  )
}

/* ── LogPane ─────────────────────────────────────────────── */
function LogPane({ logs }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [logs?.length])

  if (!logs?.length) return null
  return (
    <div ref={ref} style={{
      background: 'rgba(0,0,0,0.3)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)', padding: '10px 12px',
      maxHeight: 160, overflow: 'auto',
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
          LOG
        </span>
      </div>
      {logs.map((l, i) => (
        <div key={i} style={{
          fontSize: 11, lineHeight: 1.7,
          fontFamily: 'var(--font-mono)',
          color: l.includes('✓') ? 'var(--green)'
               : l.includes('失败') ? 'var(--red)'
               : 'var(--text-3)',
        }}>
          {l}
        </div>
      ))}
    </div>
  )
}

/* ── PreviewCard ─────────────────────────────────────────── */
function PreviewCard({ platform, result, taskId, onConfirmed, index }) {
  const status    = result?.status ?? 'pending'
  const pname     = PNAMES[platform] ?? platform
  const pcolor    = PLATFORM_COLORS[platform] ?? 'var(--accent)'
  const confirmed = result?.final_confirmed
  const shot      = result?.preview_screenshot
  const errShot   = result?.error_screenshot
  const sucShot   = result?.success_screenshot
  const displayShot = sucShot || (status === 'failed' ? errShot : shot)

  async function handleConfirm() {
    await finalConfirm(taskId, platform)
    if (onConfirmed) onConfirmed(platform)
  }

  const borderColor = status === 'success' ? 'rgba(52,211,153,0.2)'
    : status === 'failed' ? 'rgba(248,113,113,0.2)'
    : status === 'awaiting_final_confirm' ? 'rgba(251,191,36,0.2)'
    : 'var(--border)'

  return (
    <div className="glass-panel" style={{
      padding: 14,
      display: 'flex', flexDirection: 'column', gap: 10,
      border: `1px solid ${borderColor}`,
      animation: `fadeUp .25s ease ${(index ?? 0) * 60}ms both`,
      transition: 'border-color 0.3s',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Left color bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: status === 'success' ? 'var(--green)'
          : status === 'failed' ? 'var(--red)'
          : status === 'awaiting_final_confirm' ? 'var(--orange)'
          : pcolor,
        transition: 'background 0.3s',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: pcolor, flexShrink: 0,
          }} />
          <span style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 600 }}>{pname}</span>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Screenshot */}
      {displayShot && (
        <img
          src={`data:image/png;base64,${displayShot}`}
          alt={`${pname} preview`}
          style={{
            width: '100%', borderRadius: 'var(--r-sm)',
            border: '1px solid var(--border)',
            maxHeight: 300, objectFit: 'contain',
          }}
        />
      )}

      {/* Error message */}
      {status === 'failed' && result?.error && (
        <div style={{
          fontSize: 11, color: 'var(--red)',
          background: 'rgba(248,113,113,0.06)',
          border: '1px solid rgba(248,113,113,0.15)',
          borderRadius: 'var(--r-sm)', padding: '7px 10px',
          wordBreak: 'break-all', lineHeight: 1.5,
        }}>
          {result.error}
        </div>
      )}

      {/* Confirm button */}
      {status === 'awaiting_final_confirm' && !confirmed && (
        <button
          onClick={handleConfirm}
          style={{
            width: '100%', padding: '10px 0', borderRadius: 'var(--r-md)', border: 'none',
            background: 'linear-gradient(135deg, var(--green), rgba(52,211,153,0.8))',
            color: '#041a0c',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
            transition: 'all .2s',
            boxShadow: '0 4px 16px rgba(52,211,153,0.25)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(52,211,153,0.4)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(52,211,153,0.25)'
          }}
        >
          ✓ 确认发布到{pname}
        </button>
      )}
      {status === 'awaiting_final_confirm' && confirmed && (
        <div style={{
          textAlign: 'center', fontSize: 12, color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Spinner size={12} />
          已确认，发布中...
        </div>
      )}
    </div>
  )
}

/* ══ Main component ════════════════════════════════════════ */
export default function PublishFlow({ taskId, taskData, onConfirmedAll }) {
  const results  = taskData?.adapted_results ?? {}
  const logs     = taskData?.execution_log   ?? []
  const platforms = Object.keys(results)

  const allStatuses = platforms.map(p => results[p]?.status ?? 'pending')

  function globalPhase() {
    if (allStatuses.every(s => ['success', 'failed', 'blocked'].includes(s))) return 4
    if (allStatuses.some(s => s === 'awaiting_final_confirm')) return 3
    if (allStatuses.some(s => ['navigating', 'filling'].includes(s))) return 2
    if (allStatuses.some(s => s === 'logging_in')) return 1
    if (allStatuses.some(s => ['publishing'].includes(s))) return 4
    return 1
  }

  const phase = globalPhase()

  const successCount = allStatuses.filter(s => s === 'success').length
  const totalCount   = platforms.length
  const allDone      = allStatuses.every(s => ['success', 'failed', 'blocked'].includes(s))

  const awaitingPlatforms = platforms.filter(
    p => results[p]?.status === 'awaiting_final_confirm' && !results[p]?.final_confirmed
  )

  async function handleConfirmAll() {
    await finalConfirmAll(taskId)
    if (onConfirmedAll) onConfirmedAll()
  }

  const phaseLabels = {
    1: '正在检测各平台登录状态...',
    2: '浏览器自动填写内容中，请勿关闭弹出窗口',
    3: '内容已就绪，请逐一确认发布',
    4: allDone
      ? `已完成：${successCount}/${totalCount} 个平台发布成功`
      : '正在发布中...',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Stepper */}
      <Stepper phase={phase} />

      {/* Phase label */}
      <div style={{
        fontSize: 12, color: 'var(--text-3)', marginTop: -8,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {(phase === 1 || phase === 2) && (
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--accent)', display: 'inline-block',
            animation: 'pulse 1s infinite',
          }} />
        )}
        {phaseLabels[phase]}
      </div>

      {/* Confirm-all button */}
      {phase === 3 && awaitingPlatforms.length > 1 && (
        <button
          onClick={handleConfirmAll}
          style={{
            width: '100%', padding: '11px 0', borderRadius: 'var(--r-md)', border: 'none',
            background: 'linear-gradient(135deg, var(--green), rgba(52,211,153,0.8))',
            color: '#041a0c',
            fontWeight: 700, fontSize: 14, cursor: 'pointer',
            transition: 'all .2s',
            boxShadow: '0 4px 16px rgba(52,211,153,0.25)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 8px 28px rgba(52,211,153,0.4)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(52,211,153,0.25)'
          }}
        >
          ✓ 全部确认发布（{awaitingPlatforms.length} 个平台）
        </button>
      )}

      {/* Per-platform cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {platforms.map((pid, i) => (
          <PreviewCard
            key={pid}
            platform={pid}
            result={results[pid]}
            taskId={taskId}
            index={i}
            onConfirmed={() => {}}
          />
        ))}
      </div>

      {/* Execution log */}
      <LogPane logs={logs} />

      {/* Final summary */}
      {allDone && successCount > 0 && (
        <div style={{
          background: 'rgba(52,211,153,0.06)',
          border: '1px solid rgba(52,211,153,0.2)',
          borderRadius: 'var(--r-md)', padding: '14px 18px',
          fontSize: 13, color: 'var(--green)',
          textAlign: 'center',
          animation: 'fadeUp .4s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          🎉 已成功发布至 {successCount} 个平台
          {successCount < totalCount && (
            <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>
              （{totalCount - successCount} 个失败）
            </span>
          )}
        </div>
      )}
    </div>
  )
}
