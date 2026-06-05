import { useState, useEffect } from 'react'

const BASE = '/api'
const PNAMES = { wechat: '公众号', zhihu: '知乎', xiaohongshu: '小红书', bilibili: 'B站' }

/* ── time formatting ─────────────────────────────────────── */
function relativeTime(iso) {
  if (!iso) return ''
  const diff = new Date(iso) - Date.now()  // ms
  const abs  = Math.abs(diff)
  const mins = Math.floor(abs / 60000)
  const hrs  = Math.floor(abs / 3600000)
  const days = Math.floor(abs / 86400000)

  if (diff > 0) {
    // future
    if (mins < 60)  return `将于 ${mins} 分钟后发布`
    if (hrs  < 24)  return `将于 ${hrs} 小时后发布`
    return `将于 ${days} 天后发布`
  } else {
    // past
    const d = new Date(iso)
    const hhmm = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    if (days === 0)  return `今天 ${hhmm} 发布`
    if (days === 1)  return `昨天 ${hhmm} 发布`
    return `${d.getMonth()+1}/${d.getDate()} ${hhmm} 发布`
  }
}

/* ── status badge ────────────────────────────────────────── */
function StatusBadge({ status }) {
  const cfg = {
    pending:   { label: '待发布', color: '#ffd43b', spin: false },
    running:   { label: '发布中', color: '#74c0fc', spin: true  },
    done:      { label: '已完成', color: '#69db7c', spin: false },
    failed:    { label: '失败',   color: '#ff6b6b', spin: false },
    cancelled: { label: '已取消', color: '#555',    spin: false },
  }[status] ?? { label: status, color: '#555', spin: false }

  return (
    <span style={{
      fontSize: 11, padding: '3px 9px', borderRadius: 20,
      background: `${cfg.color}18`, color: cfg.color,
      display: 'inline-flex', alignItems: 'center', gap: 5,
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

/* ── task row ────────────────────────────────────────────── */
function TaskRow({ task, onCancel }) {
  return (
    <div style={{
      background: '#16161a', border: '1px solid #1e1e24',
      borderRadius: 10, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      {/* title + platforms */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, color: '#ccc', fontWeight: 500,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginBottom: 5,
        }}>
          {task.title || '（无标题）'}
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {(task.platforms || []).map(p => (
            <span key={p} style={{
              fontSize: 10, padding: '2px 7px', borderRadius: 10,
              background: '#1e1e24', color: '#666',
            }}>
              {PNAMES[p] ?? p}
            </span>
          ))}
        </div>
      </div>

      {/* time */}
      <div style={{ fontSize: 11, color: '#555', textAlign: 'right', flexShrink: 0, minWidth: 130 }}>
        {relativeTime(task.scheduled_at)}
      </div>

      {/* status */}
      <StatusBadge status={task.status} />

      {/* cancel button */}
      {task.status === 'pending' && (
        <button
          onClick={() => onCancel(task.id)}
          style={{
            fontSize: 11, padding: '4px 10px', borderRadius: 6, flexShrink: 0,
            background: 'transparent', border: '1px solid #1e1e24',
            color: '#555', cursor: 'pointer', transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ff6b6b')}
          onMouseLeave={e => (e.currentTarget.style.color = '#555')}
        >
          取消
        </button>
      )}
    </div>
  )
}

/* ══ main page ══════════════════════════════════════════════ */
export default function SchedulePage() {
  const [tasks,   setTasks]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')  // all | pending | done | failed

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
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px' }}>

      {/* header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#eee', margin: 0 }}>
          定时发布
        </h2>
        <p style={{ fontSize: 12, color: '#444', margin: '4px 0 0' }}>
          在主页选好内容后点击「定时发布」按钮添加新任务
        </p>
      </div>

      {/* filter tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1e1e24', marginBottom: 16 }}>
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '8px 14px', fontSize: 12, background: 'transparent',
              border: 'none', cursor: 'pointer', transition: 'color 0.15s',
              color: filter === f.key ? '#c8f55a' : '#555',
              borderBottom: filter === f.key ? '2px solid #c8f55a' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && (
          <div style={{ textAlign: 'center', color: '#444', padding: '40px 0', fontSize: 13 }}>
            加载中...
          </div>
        )}
        {!loading && tasks.length === 0 && (
          <div style={{ textAlign: 'center', color: '#333', padding: '60px 0', fontSize: 13 }}>
            暂无定时任务
          </div>
        )}
        {tasks.map(t => (
          <TaskRow key={t.id} task={t} onCancel={handleCancel} />
        ))}
      </div>
    </div>
  )
}
