import { useState, useEffect } from 'react'

const BASE = '/api'

/* ── helpers ─────────────────────────────────────────────── */
function fmtNum(n) {
  if (n == null || n === 0) return '0'
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000)  return (n / 1000).toFixed(1)  + 'k'
  return String(n)
}

function fmtAgo(iso) {
  if (!iso) return ''
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (diff < 1)    return '刚刚'
  if (diff < 60)   return `${diff}分钟前`
  if (diff < 1440) return `${Math.floor(diff / 60)}小时前`
  return `${Math.floor(diff / 1440)}天前`
}

/* ── analytics panel ─────────────────────────────────────── */
const STAT_COLS = [
  { key: 'views',     icon: '👁',  label: '阅读'  },
  { key: 'likes',     icon: '❤️',  label: '点赞'  },
  { key: 'comments',  icon: '💬',  label: '评论'  },
  { key: 'favorites', icon: '⭐',  label: '收藏'  },
  { key: 'shares',    icon: '🔁',  label: '转发'  },
]

function AnalyticsPanel({ recordId, successPlatforms }) {
  const [data,    setData]    = useState(null)   // { platform: {stats, fetched_at} }
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function fetchData() {
    if (loading) return
    setLoading(true); setError('')
    try {
      const r = await fetch(`${BASE}/analytics/${recordId}`).then(x => x.json())
      if (r.error) throw new Error(r.error)
      setData(r.analytics ?? {})
    } catch (e) {
      setError(e.message || '获取失败')
    } finally {
      setLoading(false)
    }
  }

  // 如果已展开就自动加载一次
  useEffect(() => { fetchData() }, [])  // eslint-disable-line

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '16px 0', fontSize: 12, color: 'var(--text-3)',
    }}>
      <span style={{
        width: 14, height: 14, borderRadius: '50%',
        border: '2px solid var(--accent)', borderTopColor: 'transparent',
        animation: 'spin .75s linear infinite', display: 'inline-block', flexShrink: 0,
      }} />
      获取数据中，约 10-30 秒...
    </div>
  )

  if (error) return (
    <div style={{ fontSize: 11, color: 'var(--red)', padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
      ⚠ {error}
      <button onClick={fetchData} style={{
        fontSize: 11, padding: '2px 8px', borderRadius: 'var(--r-sm)',
        background: 'transparent', border: '1px solid rgba(248,113,113,.3)',
        color: 'var(--red)', cursor: 'pointer',
      }}>重试</button>
    </div>
  )

  if (!data) return null

  const entries = successPlatforms.filter(p => data[p])

  if (entries.length === 0) return (
    <div style={{ fontSize: 11, color: 'var(--text-3)', padding: '8px 0' }}>
      暂无数据（发布后稍等片刻再查询）
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'fadeUp .25s ease' }}>
      {entries.map(pid => {
        const { stats, fetched_at } = data[pid]
        return (
          <div key={pid} className="glass-panel" style={{ padding: '14px 16px' }}>
            {/* header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>
                {PNAMES[pid] ?? pid}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                {fmtAgo(fetched_at)}
              </span>
            </div>

            {/* stats grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${STAT_COLS.length}, 1fr)`,
              gap: 8,
            }}>
              {STAT_COLS.map(col => (
                <div key={col.key} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, marginBottom: 4 }}>{col.icon}</div>
                  <div style={{
                    fontSize: 18, fontWeight: 700,
                    color: stats[col.key] > 0 ? 'var(--text-1)' : 'var(--text-4)',
                    lineHeight: 1, fontFamily: 'var(--font-mono)',
                  }}>
                    {fmtNum(stats[col.key])}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>
                    {col.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <button onClick={fetchData} style={{
        alignSelf: 'flex-end', fontSize: 11, padding: '4px 12px', borderRadius: 'var(--r-sm)',
        background: 'transparent', border: '1px solid var(--border)',
        color: 'var(--text-3)', cursor: 'pointer', transition: 'all .15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'rgba(123,110,246,.35)' }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--border)' }}
      >
        ↻ 刷新数据
      </button>
    </div>
  )
}
const PNAMES = {
  wechat: '公众号', zhihu: '知乎', xiaohongshu: '小红书', bilibili: 'B站',
  csdn: 'CSDN', weibo: '微博', douyin: '抖音图文',
}

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
    <div className="glass-panel" style={{
      padding: '16px 18px', flex: 1, minWidth: 0,
      transition: 'transform .25s cubic-bezier(0.34,1.56,0.64,1), box-shadow .25s',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)' }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '' }}
    >
      <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent || 'var(--text-1)', lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

/* ── success-rate card ───────────────────────────────────── */
function RateCard({ rate }) {
  return (
    <div className="glass-panel" style={{
      padding: '16px 18px', flex: 1, minWidth: 0,
      transition: 'transform .25s cubic-bezier(0.34,1.56,0.64,1)',
    }}
    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-4px)')}
    onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
    >
      <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.08em' }}>总发布成功率</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--green)', lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
        {rate}%
      </div>
      <div style={{ marginTop: 10, height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${rate}%`,
          background: 'linear-gradient(90deg, var(--green), #059669)',
          borderRadius: 2, transition: 'width .8s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '0 0 6px var(--green-glow)',
        }} />
      </div>
    </div>
  )
}

/* ── audit badge ─────────────────────────────────────────── */
function AuditBadge({ status }) {
  if (!status || status === 'pending') return (
    <span title="审核中" style={{
      fontSize: 10, padding: '1px 7px', borderRadius: 6,
      background: 'rgba(251,191,36,.1)', color: 'var(--orange)',
      border: '1px solid rgba(251,191,36,.25)', flexShrink: 0,
    }}>⟳ 审核中</span>
  )
  if (status === 'approved') return (
    <span title="审核通过" style={{
      fontSize: 10, padding: '1px 7px', borderRadius: 6,
      background: 'rgba(52,211,153,.1)', color: 'var(--green)',
      border: '1px solid rgba(52,211,153,.25)', flexShrink: 0,
    }}>✓ 已通过</span>
  )
  if (status === 'rejected') return (
    <span title="审核不通过" style={{
      fontSize: 10, padding: '1px 7px', borderRadius: 6,
      background: 'rgba(248,113,113,.1)', color: 'var(--red)',
      border: '1px solid rgba(248,113,113,.25)', flexShrink: 0,
    }}>✗ 未通过</span>
  )
  return null
}

/* ── single history record ───────────────────────────────── */
function HistoryRow({ record, onReuse, onDelete }) {
  const [expanded,      setExpanded]      = useState(false)
  const [auditTasks,    setAuditTasks]    = useState(null)   // null = 未加载
  const [showAnalytics, setShowAnalytics] = useState(false)
  const platforms = Object.entries(record.platform_results || {})
  const successPlatforms = platforms.filter(([, r]) => r.status === 'success').map(([pid]) => pid)

  async function loadAudit() {
    if (auditTasks !== null) return   // 已加载过
    try {
      const r = await fetch(`${BASE}/audit/${record.id}`).then(x => x.json())
      setAuditTasks(r.tasks ?? [])
    } catch {
      setAuditTasks([])
    }
  }

  function handleExpand() {
    setExpanded(e => !e)
    if (!expanded) loadAudit()   // 展开时懒加载
  }

  return (
    <div className="glass-panel" style={{
      overflow: 'hidden',
      transition: 'border-color .2s, box-shadow .2s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(123,110,246,0.18)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {/* summary row */}
      <div
        onClick={handleExpand}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', cursor: 'pointer', userSelect: 'none',
        }}
      >
        {/* expand chevron */}
        <span style={{
          fontSize: 10, color: 'var(--text-3)', flexShrink: 0,
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform .25s cubic-bezier(0.34,1.56,0.64,1)',
          display: 'inline-block',
        }}>▶</span>

        {/* title */}
        <span style={{ fontSize: 13, color: 'var(--text-1)', flex: 1, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
          {record.original_title || '（无标题）'}
        </span>

        {/* platform status dots */}
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          {platforms.map(([pid, res]) => {
            const { icon, color } = statusIcon(res.status)
            return (
              <span key={pid} title={`${PNAMES[pid] ?? pid}: ${res.status}`}
                style={{
                  fontSize: 11, color, fontWeight: 700,
                  filter: res.status === 'success' ? 'drop-shadow(0 0 4px rgba(52,211,153,0.5))' : 'none',
                }}>
                {icon}
              </span>
            )
          })}
        </div>

        {/* date */}
        <span style={{ fontSize: 10, color: 'var(--text-3)', flexShrink: 0, minWidth: 68, fontFamily: 'var(--font-mono)' }}>
          {fmtDate(record.created_at)}
        </span>

        {/* actions */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}
          onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onReuse(record)}
            style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 'var(--r-sm)',
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-3)', cursor: 'pointer', transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'rgba(123,110,246,0.4)'; e.currentTarget.style.background = 'rgba(123,110,246,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}
          >
            复用
          </button>
          <button
            onClick={() => onDelete(record.id)}
            style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 'var(--r-sm)',
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-3)', cursor: 'pointer', transition: 'color .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
          >
            删除
          </button>
        </div>
      </div>

      {/* expanded detail */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '12px 16px',
          display: 'flex', flexDirection: 'column', gap: 8, animation: 'fadeUp .2s ease' }}>
          {platforms.map(([pid, res]) => {
            const { icon, color } = statusIcon(res.status)
            const auditTask = auditTasks?.find(t => t.platform === pid)
            return (
              <div key={pid} style={{
                background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--r-md)', padding: '10px 12px',
                border: `1px solid ${color === '#69db7c' ? 'rgba(52,211,153,0.15)' : color === '#ff6b6b' ? 'rgba(248,113,113,0.15)' : 'var(--border)'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 6, gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>
                    {PNAMES[pid] ?? pid}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color }}>{icon} {res.status}</span>
                    {res.status === 'success' && auditTask && (
                      <AuditBadge status={auditTask.status} />
                    )}
                  </div>
                </div>
                {res.adapted_title && (
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4, fontWeight: 500 }}>
                    {res.adapted_title}
                  </div>
                )}
                {res.adapted_body && (
                  <div style={{ fontSize: 11, color: 'var(--text-4)', lineHeight: 1.6,
                    maxHeight: 80, overflow: 'hidden',
                    WebkitMaskImage: 'linear-gradient(to bottom,#fff 55%,transparent)',
                    maskImage: 'linear-gradient(to bottom,#fff 55%,transparent)',
                  }}>
                    {res.adapted_body}
                  </div>
                )}
                {res.error && (
                  <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>
                    ⚠ {res.error}
                  </div>
                )}
              </div>
            )
          })}

          {/* ── 数据看板入口 ── */}
          {successPlatforms.length > 0 && (
            <div>
              <button
                onClick={() => setShowAnalytics(v => !v)}
                style={{
                  fontSize: 11, padding: '5px 14px', borderRadius: 'var(--r-sm)',
                  background: showAnalytics ? 'rgba(123,110,246,.1)' : 'transparent',
                  border: `1px solid ${showAnalytics ? 'rgba(123,110,246,.4)' : 'var(--border)'}`,
                  color: showAnalytics ? 'var(--accent)' : 'var(--text-3)',
                  cursor: 'pointer', transition: 'all .15s',
                }}
                onMouseEnter={e => {
                  if (!showAnalytics) {
                    e.currentTarget.style.color = 'var(--accent)'
                    e.currentTarget.style.borderColor = 'rgba(123,110,246,.35)'
                    e.currentTarget.style.background = 'rgba(123,110,246,.08)'
                  }
                }}
                onMouseLeave={e => {
                  if (!showAnalytics) {
                    e.currentTarget.style.color = 'var(--text-3)'
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                📊 {showAnalytics ? '收起数据' : '查看数据'}
              </button>

              {showAnalytics && (
                <div style={{ marginTop: 10 }}>
                  <AnalyticsPanel
                    recordId={record.id}
                    successPlatforms={successPlatforms}
                  />
                </div>
              )}
            </div>
          )}
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
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 4 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', margin: 0, letterSpacing: '-0.5px' }}>
            发布历史
          </h2>
          {stats && (
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
              {stats.total_publishes}
            </span>
          )}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
          记录每次发布，复用历史内容
        </p>
      </div>

      {/* stat cards */}
      {stats && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
          <StatCard label="累计发布次数" value={stats.total_publishes} accent="var(--accent)" />
          <RateCard rate={stats.success_rate} />
          <StatCard
            label="最活跃平台"
            value={topPlatform ? (PNAMES[topPlatform[0]] ?? topPlatform[0]) : '—'}
            sub={topPlatform ? `共 ${topPlatform[1]} 次` : undefined}
            accent="var(--blue)"
          />
          <StatCard label="近 7 天发布" value={stats.recent_7_days} accent="var(--orange)" />
        </div>
      )}

      {/* list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && records.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3].map(i => (
              <div key={i} className="skeleton" style={{ height: 52, borderRadius: 'var(--r-lg)', animationDelay: `${i*.1}s` }} />
            ))}
          </div>
        )}

        {!loading && records.length === 0 && (
          <div style={{ textAlign: 'center', padding: '72px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 12, animation: 'float 3s ease-in-out infinite', color: 'var(--accent)' }}>◆</div>
            <div style={{ fontSize: 14, color: 'var(--text-3)' }}>还没有发布记录</div>
            <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 4 }}>去发布第一篇内容吧</div>
          </div>
        )}

        {records.map((r, idx) => (
          <div key={r.id} style={{ animation: `fadeUp .3s ease ${idx * 40}ms both` }}>
            <HistoryRow record={r} onReuse={onReuse} onDelete={handleDelete} />
          </div>
        ))}

        {records.length > 0 && records.length % LIMIT === 0 && (
          <button
            onClick={() => fetchData(offset + LIMIT)}
            disabled={loading}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 'var(--r-md)', marginTop: 4,
              background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
              color: 'var(--text-3)', fontSize: 12, cursor: loading ? 'wait' : 'pointer',
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.borderColor = 'rgba(123,110,246,.3)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            {loading ? '加载中...' : '加载更多'}
          </button>
        )}
      </div>
    </div>
  )
}
