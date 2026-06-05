import { useRef, useEffect } from 'react'
import { finalConfirm, finalConfirmAll } from '../api/client'

/* ── constants ──────────────────────────────────────────────── */
const PNAMES = {
  wechat: '公众号', zhihu: '知乎',
  xiaohongshu: '小红书', bilibili: 'B站',
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

/* ── tiny helpers ───────────────────────────────────────────── */
function Spinner({ size = 14, color = '#c8f55a' }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      border: `2px solid ${color}`, borderTopColor: 'transparent',
      display: 'inline-block', animation: 'spin 0.75s linear infinite',
    }} />
  )
}

function StepDot({ n, active, done }) {
  const bg = done ? '#69db7c' : active ? '#c8f55a' : '#1e1e24'
  const cl = done || active ? '#0a0a0c' : '#555'
  return (
    <div style={{
      width: 26, height: 26, borderRadius: '50%',
      background: bg, color: cl,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700, flexShrink: 0,
      transition: 'background 0.3s',
    }}>
      {done ? '✓' : n}
    </div>
  )
}

const STEPS = ['登录检测', '内容填写', '预览确认', '发布完成']

function Stepper({ phase }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 22 }}>
      {STEPS.map((label, i) => {
        const n     = i + 1
        const done  = phase > n
        const active = phase === n
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center', flex: n < 4 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <StepDot n={n} active={active} done={done} />
              <span style={{
                fontSize: 10,
                color: done ? '#69db7c' : active ? '#c8f55a' : '#333',
                whiteSpace: 'nowrap',
              }}>
                {label}
              </span>
            </div>
            {n < 4 && (
              <div style={{
                flex: 1, height: 1, margin: '0 4px', marginBottom: 14,
                background: done ? '#69db7c44' : '#1e1e24',
                transition: 'background 0.4s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── per-platform status badge ──────────────────────────────── */
function StatusBadge({ status }) {
  const cfg = {
    logging_in:             { label: '登录检测中',   color: '#c8f55a', spin: true  },
    navigating:             { label: '打开编辑器',   color: '#c8f55a', spin: true  },
    filling:                { label: '填写内容',     color: '#c8f55a', spin: true  },
    awaiting_final_confirm: { label: '等待确认',     color: '#ffa94d', spin: false },
    publishing:             { label: '发布中',       color: '#c8f55a', spin: true  },
    success:                { label: '发布成功 ✓',   color: '#69db7c', spin: false },
    failed:                 { label: '失败',         color: '#ff6b6b', spin: false },
    blocked:                { label: '已跳过',       color: '#555',    spin: false },
    pending:                { label: '等待中',       color: '#444',    spin: false },
  }[status] ?? { label: status, color: '#555', spin: false }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      {cfg.spin && <Spinner size={11} color={cfg.color} />}
      <span style={{ fontSize: 11, color: cfg.color }}>{cfg.label}</span>
    </div>
  )
}

/* ── log pane ───────────────────────────────────────────────── */
function LogPane({ logs }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [logs?.length])

  if (!logs?.length) return null
  return (
    <div
      ref={ref}
      style={{
        background: '#0d0d0f', border: '1px solid #1a1a1e',
        borderRadius: 7, padding: '10px 12px',
        maxHeight: 160, overflow: 'auto',
        fontSize: 11, color: '#555', lineHeight: 1.7,
        fontFamily: 'monospace',
      }}
    >
      {logs.map((l, i) => (
        <div key={i} style={{
          color: l.includes('✓') ? '#69db7c'
               : l.includes('失败') ? '#ff6b6b'
               : '#555',
        }}>
          {l}
        </div>
      ))}
    </div>
  )
}

/* ── preview card for one platform ─────────────────────────── */
function PreviewCard({ platform, result, taskId, onConfirmed }) {
  const status   = result?.status ?? 'pending'
  const pname    = PNAMES[platform] ?? platform
  const confirmed = result?.final_confirmed
  const shot     = result?.preview_screenshot
  const errShot  = result?.error_screenshot
  const sucShot  = result?.success_screenshot

  const displayShot = sucShot || (status === 'failed' ? errShot : shot)

  async function handleConfirm() {
    await finalConfirm(taskId, platform)
    if (onConfirmed) onConfirmed(platform)
  }

  return (
    <div style={{
      background: '#16161a',
      border: `1px solid ${
        status === 'success' ? '#69db7c33'
        : status === 'failed' ? '#ff6b6b33'
        : status === 'awaiting_final_confirm' ? '#ffa94d44'
        : '#1e1e24'
      }`,
      borderRadius: 10, padding: '14px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#ccc', fontWeight: 500 }}>{pname}</span>
        <StatusBadge status={status} />
      </div>

      {/* screenshot */}
      {displayShot && (
        <img
          src={`data:image/png;base64,${displayShot}`}
          alt={`${pname} preview`}
          style={{
            width: '100%', borderRadius: 6,
            border: '1px solid #2a2a30',
            maxHeight: 300, objectFit: 'contain',
          }}
        />
      )}

      {/* error message */}
      {status === 'failed' && result?.error && (
        <div style={{
          fontSize: 11, color: '#ff6b6b',
          background: 'rgba(255,107,107,0.07)',
          borderRadius: 6, padding: '7px 10px',
        }}>
          {result.error}
        </div>
      )}

      {/* confirm button */}
      {status === 'awaiting_final_confirm' && !confirmed && (
        <button
          onClick={handleConfirm}
          style={{
            width: '100%', padding: '9px 0', borderRadius: 7, border: 'none',
            background: '#69db7c', color: '#061006',
            fontWeight: 600, fontSize: 13, cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          ✓ 确认发布到{pname}
        </button>
      )}
      {status === 'awaiting_final_confirm' && confirmed && (
        <div style={{ textAlign: 'center', fontSize: 12, color: '#c8f55a' }}>
          <Spinner size={12} /> &nbsp;已确认，发布中...
        </div>
      )}
    </div>
  )
}

/* ══ main component ════════════════════════════════════════════ */
export default function PublishFlow({ taskId, taskData, onConfirmedAll }) {
  const results  = taskData?.adapted_results ?? {}
  const logs     = taskData?.execution_log   ?? []
  const platforms = Object.keys(results)

  /* Derive current global phase from all platform statuses */
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

  /* Count finished */
  const successCount = allStatuses.filter(s => s === 'success').length
  const totalCount   = platforms.length
  const allDone      = allStatuses.every(s => ['success', 'failed', 'blocked'].includes(s))

  /* Which platforms are awaiting final confirm */
  const awaitingPlatforms = platforms.filter(
    p => results[p]?.status === 'awaiting_final_confirm' && !results[p]?.final_confirmed
  )

  async function handleConfirmAll() {
    await finalConfirmAll(taskId)
    if (onConfirmedAll) onConfirmedAll()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Stepper */}
      <Stepper phase={phase} />

      {/* Phase label */}
      <div style={{ fontSize: 13, color: '#777', marginTop: -8 }}>
        {phase === 1 && '正在检测各平台登录状态...'}
        {phase === 2 && '浏览器自动填写内容中，请勿关闭弹出窗口'}
        {phase === 3 && '内容已就绪，请逐一确认发布'}
        {phase === 4 && (allDone
          ? `已完成：${successCount}/${totalCount} 个平台发布成功`
          : '正在发布中...')}
      </div>

      {/* Confirm-all button (phase 3 only, when multiple platforms await) */}
      {phase === 3 && awaitingPlatforms.length > 1 && (
        <button
          onClick={handleConfirmAll}
          style={{
            width: '100%', padding: '10px 0', borderRadius: 8, border: 'none',
            background: '#69db7c', color: '#061006',
            fontWeight: 700, fontSize: 14, cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          ✓ 全部确认发布（{awaitingPlatforms.length} 个平台）
        </button>
      )}

      {/* Per-platform cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {platforms.map(pid => (
          <PreviewCard
            key={pid}
            platform={pid}
            result={results[pid]}
            taskId={taskId}
            onConfirmed={() => {}} // local state handled by poll
          />
        ))}
      </div>

      {/* Execution log */}
      <LogPane logs={logs} />

      {/* Final summary */}
      {allDone && successCount > 0 && (
        <div style={{
          background: 'rgba(105,219,124,0.07)',
          border: '1px solid rgba(105,219,124,0.2)',
          borderRadius: 10, padding: '14px 18px',
          fontSize: 13, color: '#69db7c',
          textAlign: 'center',
        }}>
          🎉 已成功发布至 {successCount} 个平台
          {successCount < totalCount && `（${totalCount - successCount} 个失败）`}
        </div>
      )}
    </div>
  )
}
