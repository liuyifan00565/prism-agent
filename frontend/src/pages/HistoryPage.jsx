import { useState, useEffect } from 'react'

const BASE = '/api'
const PNAMES = { wechat: '公众号', zhihu: '知乎', xiaohongshu: '小红书', bilibili: 'B站' }

/* ── helpers ─────────────────────────────────────────────── */
function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function statusIcon(status) {
  if (status === 'success') return { icon: '✓', color: '#69db7c' }
  if (status === 'failed')  return { icon: '✗', color: '#ff6b6b' }
  return                           { icon: '—', color: '#555'    }
}

/* ── stat card ───────────────────────────────────────────── */
function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: '#16161a', border: '1px solid #1e1e24', borderRadius: 10,
      padding: '16px 18px', flex: 1, minWidth: 0,
    }}>
      <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent || '#eee', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: '#444', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

/* ── success-rate bar ────────────────────────────────────── */
function RateCard({ rate }) {
  return (
    <div style={{
      background: '#16161a', border: '1px solid #1e1e24', borderRadius: 10,
      padding: '16px 18px', flex: 1, minWidth: 0,
    }}>
      <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>总发布成功率</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#69db7c', lineHeight: 1 }}>
        {rate}%
      </div>
      <div style={{
        marginTop: 10, height: 4, background: '#1e1e24', borderRadius: 2, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${rate}%`, background: '#69db7c',
          borderRadius: 2, transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  )
}

/* ── single history record ───────────────────────────────── */
function HistoryRow({ record, onReuse, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const platforms = Object.entries(record.platform_results || {})

  return (
    <div style={{
      background: '#16161a', border: '1px solid #1e1e24',
      borderRadius: 10, overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      {/* summary row */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', cursor: 'pointer', userSelect: 'none',
        }}
      >
        {/* expand chevron */}
        <span style={{
          fontSize: 10, color: '#444', flexShrink: 0,
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s', display: 'inline-block',
        }}>▶</span>

        {/* title */}
        <span style={{ fontSize: 13, color: '#ccc', flex: 1, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {record.original_title || '（无标题）'}
        </span>

        {/* platform status icons */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {platforms.map(([pid, res]) => {
            const { icon, color } = statusIcon(res.status)
            return (
              <span key={pid} title={`${PNAMES[pid] ?? pid}: ${res.status}`}
                style={{ fontSize: 11, color, fontWeight: 600 }}>
                {icon}
              </span>
            )
          })}
        </div>

        {/* date */}
        <span style={{ fontSize: 11, color: '#444', flexShrink: 0, minWidth: 68 }}>
          {fmtDate(record.created_at)}
        </span>

        {/* actions */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}
          onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onReuse(record)}
            style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 6,
              background: 'transparent', border: '1px solid #2a2a30',
              color: '#888', cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#c8f55a'; e.currentTarget.style.borderColor = '#c8f55a44' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#888';    e.currentTarget.style.borderColor = '#2a2a30' }}
          >
            复用
          </button>
          <button
            onClick={() => onDelete(record.id)}
            style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 6,
              background: 'transparent', border: '1px solid #1e1e24',
              color: '#555', cursor: 'pointer', transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ff6b6b')}
            onMouseLeave={e => (e.currentTarget.style.color = '#555')}
          >
            删除
          </button>
        </div>
      </div>

      {/* expanded detail */}
      {expanded && (
        <div style={{ borderTop: '1px solid #1e1e24', padding: '12px 16px',
          display: 'flex', flexDirection: 'column', gap: 10 }}>
          {platforms.map(([pid, res]) => {
            const { icon, color } = statusIcon(res.status)
            return (
              <div key={pid} style={{
                background: '#0d0d0f', borderRadius: 8, padding: '10px 12px',
                border: `1px solid ${color}22`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#aaa', fontWeight: 500 }}>
                    {PNAMES[pid] ?? pid}
                  </span>
                  <span style={{ fontSize: 11, color }}>{icon} {res.status}</span>
                </div>
                {res.adapted_title && (
                  <div style={{ fontSize: 12, color: '#777', marginBottom: 4,
                    fontWeight: 500 }}>
                    {res.adapted_title}
                  </div>
                )}
                {res.adapted_body && (
                  <div style={{ fontSize: 11, color: '#555', lineHeight: 1.6,
                    maxHeight: 80, overflow: 'hidden',
                    WebkitMaskImage: 'linear-gradient(to bottom,#fff 55%,transparent)',
                    maskImage: 'linear-gradient(to bottom,#fff 55%,transparent)',
                  }}>
                    {res.adapted_body}
                  </div>
                )}
                {res.error && (
                  <div style={{ fontSize: 11, color: '#ff6b6b', marginTop: 4 }}>
                    ⚠ {res.error}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ══ main page ══════════════════════════════════════════════ */
export default function HistoryPage({ onReuse }) {
  const [stats,   setStats]   = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [offset,  setOffset]  = useState(0)
  const LIMIT = 20

  async function fetchData(off = 0) {
    setLoading(true)
    try {
      const [s, r] = await Promise.all([
        fetch(`${BASE}/history/stats`).then(x => x.json()),
        fetch(`${BASE}/history?limit=${LIMIT}&offset=${off}`).then(x => x.json()),
      ])
      setStats(s)
      setRecords(off === 0 ? r.records : prev => [...prev, ...r.records])
      setOffset(off)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData(0) }, [])

  async function handleDelete(id) {
    await fetch(`${BASE}/history/${id}`, { method: 'DELETE' })
    fetchData(0)
  }

  /* top platform */
  const topPlatform = stats
    ? Object.entries(stats.platform_counts ?? {})
        .sort((a, b) => b[1] - a[1])[0]
    : null

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px' }}>

      {/* header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#eee', margin: 0 }}>
          发布历史
        </h2>
        <p style={{ fontSize: 12, color: '#444', margin: '4px 0 0' }}>
          记录每次发布，复用历史内容
        </p>
      </div>

      {/* stat cards */}
      {stats && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <StatCard
            label="累计发布次数"
            value={stats.total_publishes}
            accent="#c8f55a"
          />
          <RateCard rate={stats.success_rate} />
          <StatCard
            label="最活跃平台"
            value={topPlatform ? (PNAMES[topPlatform[0]] ?? topPlatform[0]) : '—'}
            sub={topPlatform ? `共 ${topPlatform[1]} 次` : undefined}
            accent="#74c0fc"
          />
          <StatCard
            label="近 7 天发布"
            value={stats.recent_7_days}
            accent="#ffa94d"
          />
        </div>
      )}

      {/* list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && records.length === 0 && (
          <div style={{ textAlign: 'center', color: '#444', padding: '40px 0', fontSize: 13 }}>
            加载中...
          </div>
        )}

        {!loading && records.length === 0 && (
          <div style={{ textAlign: 'center', color: '#333', padding: '60px 0', fontSize: 13 }}>
            暂无发布记录
          </div>
        )}

        {records.map(r => (
          <HistoryRow
            key={r.id}
            record={r}
            onReuse={onReuse}
            onDelete={handleDelete}
          />
        ))}

        {records.length > 0 && records.length % LIMIT === 0 && (
          <button
            onClick={() => fetchData(offset + LIMIT)}
            disabled={loading}
            style={{
              width: '100%', padding: '9px 0', borderRadius: 8, marginTop: 4,
              background: 'transparent', border: '1px solid #1e1e24',
              color: '#555', fontSize: 12, cursor: loading ? 'wait' : 'pointer',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#888')}
            onMouseLeave={e => (e.currentTarget.style.color = '#555')}
          >
            {loading ? '加载中...' : '加载更多'}
          </button>
        )}
      </div>
    </div>
  )
}
