import { useState, useEffect } from 'react'

const BASE = '/api'
const PNAMES = { wechat: '公众号', zhihu: '知乎', xiaohongshu: '小红书', bilibili: 'B站' }

const PLATFORM_COLORS = {
  wechat: '#07C160', zhihu: '#0066FF', xiaohongshu: '#FF2442',
  bilibili: '#00AEEC', csdn: '#FC5531', weibo: '#E6162D', douyin: '#FE2C55',
}

/* ── Time formatting ─────────────────────────────────────── */
function relativeTime(iso) {
  if (!iso) return ''
  const diff = new Date(iso) - Date.now()
  const abs  = Math.abs(diff)
  const mins = Math.floor(abs / 60000)
  const hrs  = Math.floor(abs / 3600000)
  const days = Math.floor(abs / 86400000)

  if (diff > 0) {
    if (mins < 60) return `将于 ${mins} 分钟后发布`
    if (hrs  < 24) return `将于 ${hrs} 小时后发布`
    return `将于 ${days} 天后发布`
  } else {
    const d    = new Date(iso)
    const hhmm = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    if (days === 0) return `今天 ${hhmm} 发布`
    if (days === 1) return `昨天 ${hhmm} 发布`
    return `${d.getMonth()+1}/${d.getDate()} ${hhmm} 发布`
  }
}

/* ── StatusBadge ─────────────────────────────────────────── */
function StatusBadge({ status }) {
  const cfg = {
    pending:   { label: '待发布', color: 'var(--orange)',  spin: false },
    running:   { label: '发布中', color: 'var(--accent)',  spin: true  },
    done:      { label: '已完成', color: 'var(--green)',   spin: false },
    failed:    { label: '失败',   color: 'var(--red)',     spin: false },
    cancelled: { label: '已取消', color: 'var(--text-3)', spin: false },
  }[status] ?? { label: status, color: 'var(--text-3)', spin: false }

  return (
    <span style={{
      fontSize: 11, padding: '3px 9px', borderRadius: 20, fontWeight: 500,
      background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
      color: cfg.color,
      border: `1px solid color-mix(in srgb, ${cfg.color} 25%, transparent)`,
      display: 'inline-flex', alignItems: 'center', gap: 5,
      // Fallback for browsers without color-mix:
      backgroundColor: cfg.color === 'var(--orange)' ? 'rgba(251,191,36,0.1)'
        : cfg.color === 'var(--accent)' ? 'rgba(123,110,246,0.1)'
        : cfg.color === 'var(--green)'  ? 'rgba(52,211,153,0.1)'
        : cfg.color === 'var(--red)'    ? 'rgba(248,113,113,0.1)'
        : 'rgba(255,255,255,0.04)',
    }}>
      {cfg.spin && (
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          border: '1.5px solid currentColor', borderTopColor: 'transparent',
          display: 'inline-block', animation: 'spin 0.75s linear infinite',
        }} />
      )}
      {cfg.label}
    </span>
  )
}

/* ── TaskRow ─────────────────────────────────────────────── */
function TaskRow({ task, onCancel, index }) {
  return (
    <div className="glass-panel" style={{
      padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      animation: `fadeUp .25s ease ${index * 50}ms both`,
      transition: 'border-color .2s, transform .2s cubic-bezier(0.34,1.56,0.64,1)',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = 'rgba(123,110,246,0.2)'
      e.currentTarget.style.transform   = 'translateY(-1px)'
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = 'var(--border)'
      e.currentTarget.style.transform   = 'none'
    }}
    >
      {/* Clock icon */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(123,110,246,0.08)',
        border: '1px solid rgba(123,110,246,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15,
      }}>
        ⏰
      </div>

      {/* Title + platforms */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, color: 'var(--text-1)', fontWeight: 500,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginBottom: 5,
        }}>
          {task.title || '（无标题）'}
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {(task.platforms || []).map(p => {
            const pcolor = PLATFORM_COLORS[p] ?? 'var(--text-3)'
            return (
              <span key={p} style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 10,
                background: `${pcolor}12`,
                border: `1px solid ${pcolor}25`,
                color: pcolor,
              }}>
                {PNAMES[p] ?? p}
              </span>
            )
          })}
        </div>
      </div>

      {/* Time */}
      <div style={{
        fontSize: 11, color: 'var(--text-3)', textAlign: 'right',
        flexShrink: 0, minWidth: 130,
        fontFamily: 'var(--font-mono)',
      }}>
        {relativeTime(task.scheduled_at)}
      </div>

      {/* Status */}
      <StatusBadge status={task.status} />

      {/* Cancel */}
      {task.status === 'pending' && (
        <button
          onClick={() => onCancel(task.id)}
          style={{
            fontSize: 11, padding: '4px 10px', borderRadius: 'var(--r-sm)', flexShrink: 0,
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text-3)', cursor: 'pointer', transition: 'all .15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--red)'
            e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)'
            e.currentTarget.style.background  = 'rgba(248,113,113,0.05)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--text-3)'
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.background  = 'transparent'
          }}
        >
          取消
        </button>
      )}
    </div>
  )
}

/* ══ Main page ═════════════════════════════════════════════ */
export default function SchedulePage() {
  const [tasks,   setTasks]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')

  async function load() {
    setLoading(true)
    try {
      const status = filter === 'all' ? undefined : filter
      const url    = status ? `${BASE}/schedule?status=${status}` : `${BASE}/schedule`
      const r      = await fetch(url).then(x => x.json())
      setTasks(r.tasks || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  async function handleCancel(id) {
    await fetch(`${BASE}/schedule/${id}`, { method: 'DELETE' })
    load()
  }

  const filters = [
    { key: 'all',       label: '全部' },
    { key: 'pending',   label: '待发布' },
    { key: 'running',   label: '发布中' },
    { key: 'done',      label: '已完成' },
    { key: 'failed',    label: '失败' },
    { key: 'cancelled', label: '已取消' },
  ]

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px', position: 'relative', zIndex: 1 }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{
            fontSize: 24,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            animation: 'float 4s ease-in-out infinite',
            display: 'inline-block',
          }}>⏰</span>
          <h2 style={{
            fontSize: 20, fontWeight: 700, margin: 0,
            background: 'linear-gradient(90deg, var(--text-1), var(--text-2))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            定时发布
          </h2>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0, paddingLeft: 34 }}>
          在主页选好内容后点击「定时发布」按钮添加新任务
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        marginBottom: 16,
      }}>
        {filters.map(f => {
          const isActive = filter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '8px 14px', fontSize: 12,
                background: 'transparent', border: 'none',
                cursor: 'pointer', transition: 'color 0.2s',
                color: isActive ? 'var(--accent)' : 'var(--text-3)',
                position: 'relative',
                fontFamily: 'var(--font-display)',
              }}
            >
              {f.label}
              <span style={{
                position: 'absolute', bottom: 0, left: '50%',
                transform: 'translateX(-50%)',
                height: 2, width: isActive ? '70%' : '0%',
                background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
                borderRadius: 1,
                transition: 'width .25s cubic-bezier(0.34,1.56,0.64,1)',
              }} />
            </button>
          )
        })}
      </div>

      {/* Task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton" style={{
              height: 72, borderRadius: 'var(--r-lg)',
              border: '1px solid var(--border)',
              animationDelay: `${i * 0.15}s`,
            }} />
          ))
        )}
        {!loading && tasks.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '72px 0',
            animation: 'fadeUp .4s ease',
          }}>
            <div style={{
              fontSize: 40, marginBottom: 12, opacity: 0.2,
              animation: 'float 4s ease-in-out infinite',
              display: 'inline-block',
            }}>⏰</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
              {filter === 'all' ? '暂无定时任务' : `暂无「${filters.find(f => f.key === filter)?.label}」任务`}
            </div>
          </div>
        )}
        {!loading && tasks.map((t, i) => (
          <TaskRow key={t.id} task={t} onCancel={handleCancel} index={i} />
        ))}
      </div>
    </div>
  )
}
