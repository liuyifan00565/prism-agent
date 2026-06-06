import { useState, useEffect } from 'react'

const PLATFORMS = [
  { id: 'xiaohongshu', name: '小红书', icon: '📕', color: '#FF2442' },
  { id: 'zhihu',       name: '知乎',   icon: '🔵', color: '#0066FF' },
  { id: 'wechat',      name: '公众号', icon: '💬', color: '#07C160' },
  { id: 'bilibili',    name: 'B站',    icon: '📺', color: '#00AEEC' },
]

/* ── AvatarCircle ─────────────────────────────────────────── */
function AvatarCircle({ username }) {
  const char = (username || '?')[0].toUpperCase()
  return (
    <div style={{
      width: 72, height: 72, borderRadius: '50%',
      background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 28, fontWeight: 700, color: '#fff',
      boxShadow: '0 0 30px var(--accent-glow), 0 0 0 3px rgba(123,110,246,0.15)',
      flexShrink: 0,
      animation: 'glow-pulse 3s ease-in-out infinite',
    }}>
      {char}
    </div>
  )
}

/* ── StatCard ─────────────────────────────────────────────── */
function StatCard({ label, value, sub, index = 0 }) {
  return (
    <div className="glass-panel" style={{
      flex: 1, padding: '18px 20px',
      animation: `fadeUp .3s ease ${index * 80}ms both`,
      transition: 'border-color .2s, transform .2s cubic-bezier(0.34,1.56,0.64,1)',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = 'rgba(123,110,246,0.2)'
      e.currentTarget.style.transform   = 'translateY(-3px)'
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = 'var(--border)'
      e.currentTarget.style.transform   = 'none'
    }}
    >
      <div style={{
        fontSize: 28, fontWeight: 700,
        color: 'var(--text-1)', marginBottom: 4,
        fontFamily: 'var(--font-mono)',
        background: 'linear-gradient(90deg, var(--text-1), var(--accent))',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

/* ══ Main page ═════════════════════════════════════════════ */
export default function ProfilePage({ auth }) {
  const { user, isLoggedIn, bindPlatform, unbindPlatform, refreshMe } = auth
  const [stats,           setStats]           = useState(null)
  const [bindingPlatform, setBindingPlatform] = useState(null)
  const [error,           setError]           = useState('')

  useEffect(() => {
    fetch('/api/history/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (isLoggedIn) refreshMe()
  }, [isLoggedIn])

  async function handleBind(platform) {
    setBindingPlatform(platform)
    setError('')
    try {
      await bindPlatform(platform)
    } catch (e) {
      setError(e.message)
    } finally {
      setBindingPlatform(null)
    }
  }

  async function handleUnbind(platform) {
    setError('')
    try {
      await unbindPlatform(platform)
    } catch (e) {
      setError(e.message)
    }
  }

  const bindings = user?.platform_bindings ?? {}

  if (!isLoggedIn) {
    return (
      <div style={{
        maxWidth: 540, margin: '80px auto', textAlign: 'center',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{
          fontSize: 52, marginBottom: 16,
          animation: 'float 4s ease-in-out infinite', display: 'inline-block',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>◈</div>
        <p style={{ color: 'var(--text-3)', fontSize: 14 }}>请先登录以查看账户信息</p>
      </div>
    )
  }

  return (
    <div style={{
      maxWidth: 720, margin: '0 auto', padding: '32px 24px',
      animation: 'fadeUp .3s ease',
      position: 'relative', zIndex: 1,
    }}>

      {/* ── Personal info card ────────────────────────────────── */}
      <div className="glass-panel" style={{
        padding: '28px', marginBottom: 18,
        display: 'flex', alignItems: 'center', gap: 24,
        background: 'linear-gradient(135deg, rgba(123,110,246,0.04) 0%, rgba(12,15,29,0.85) 100%)',
      }}>
        <AvatarCircle username={user.username} />
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 20, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4,
            fontFamily: 'var(--font-display)',
          }}>
            {user.username}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{user.email}</div>
          <div style={{
            fontSize: 11, color: 'var(--text-3)', marginTop: 6,
            fontFamily: 'var(--font-mono)',
          }}>
            注册于 {user.created_at?.slice(0, 10)}
          </div>
        </div>
        <button
          style={{
            padding: '8px 18px', borderRadius: 'var(--r-md)', fontSize: 12,
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text-3)', cursor: 'pointer',
            transition: 'all .2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(123,110,246,0.3)'
            e.currentTarget.style.color = 'var(--accent)'
            e.currentTarget.style.background = 'rgba(123,110,246,0.05)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text-3)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          编辑资料
        </button>
      </div>

      {/* ── Platform bindings ──────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '24px 28px', marginBottom: 18 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: 'var(--text-3)',
          marginBottom: 18, letterSpacing: '0.08em', textTransform: 'uppercase',
          fontFamily: 'var(--font-mono)',
        }}>
          已绑定账号
        </div>

        {error && (
          <div style={{
            fontSize: 12, color: 'var(--red)',
            background: 'rgba(248,113,113,0.06)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 'var(--r-md)', padding: '9px 12px', marginBottom: 14,
            animation: 'shake .4s ease',
          }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PLATFORMS.map((p, i) => {
            const binding   = bindings[p.id] ?? { bound: false, nickname: null }
            const isBound   = binding.bound
            const isLoading = bindingPlatform === p.id

            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: 'var(--r-md)',
                background: isBound ? `${p.color}06` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isBound ? `${p.color}20` : 'var(--border)'}`,
                transition: 'all .2s',
                animation: `fadeUp .2s ease ${i * 60}ms both`,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = isBound ? `${p.color}0a` : 'rgba(255,255,255,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = isBound ? `${p.color}06` : 'rgba(255,255,255,0.02)')}
              >
                {/* Platform icon */}
                <span style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: `${p.color}15`,
                  border: `1px solid ${p.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>
                  {p.icon}
                </span>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                    {isBound ? (binding.nickname || '已绑定') : '未绑定'}
                  </div>
                </div>

                {/* Status dot */}
                <span style={{
                  fontSize: 11,
                  color: isBound ? 'var(--green)' : 'var(--text-3)',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: isBound ? 'var(--green)' : 'var(--text-3)',
                    display: 'inline-block',
                    boxShadow: isBound ? '0 0 6px var(--green)' : 'none',
                    animation: isBound ? 'pulse-glow 2s ease-in-out infinite' : 'none',
                  }} />
                  {isBound ? '已绑定' : '未绑定'}
                </span>

                {/* Action button */}
                {isBound ? (
                  <button
                    onClick={() => handleUnbind(p.id)}
                    style={{
                      padding: '6px 14px', borderRadius: 'var(--r-sm)', fontSize: 12,
                      cursor: 'pointer',
                      background: 'transparent',
                      border: '1px solid rgba(248,113,113,0.3)',
                      color: 'var(--red)', transition: 'all .15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    解绑
                  </button>
                ) : (
                  <button
                    onClick={() => handleBind(p.id)}
                    disabled={isLoading}
                    style={{
                      padding: '6px 14px', borderRadius: 'var(--r-sm)', fontSize: 12,
                      cursor: isLoading ? 'wait' : 'pointer',
                      background: 'rgba(123,110,246,0.1)',
                      border: '1px solid rgba(123,110,246,0.3)',
                      color: 'var(--accent)',
                      opacity: isLoading ? 0.6 : 1,
                      transition: 'all .15s',
                    }}
                    onMouseEnter={e => { if (!isLoading) e.currentTarget.style.background = 'rgba(123,110,246,0.18)' }}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(123,110,246,0.1)')}
                  >
                    {isLoading ? '登录中...' : '绑定'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {bindingPlatform && (
          <div style={{
            marginTop: 14, fontSize: 12, color: 'var(--accent)',
            padding: '10px 14px',
            background: 'rgba(123,110,246,0.06)',
            borderRadius: 'var(--r-md)',
            border: '1px solid rgba(123,110,246,0.2)',
            display: 'flex', alignItems: 'center', gap: 8,
            animation: 'fadeUp .2s ease',
          }}>
            <span style={{
              width: 14, height: 14, borderRadius: '50%',
              border: '2px solid rgba(123,110,246,0.3)', borderTopColor: 'var(--accent)',
              display: 'inline-block', animation: 'spin .75s linear infinite', flexShrink: 0,
            }} />
            请在弹出的浏览器窗口中完成登录，系统将自动检测并保存会话...
          </div>
        )}
      </div>

      {/* ── Usage stats ───────────────────────────────────────── */}
      <div>
        <div style={{
          fontSize: 11, fontWeight: 600, color: 'var(--text-3)',
          marginBottom: 14, letterSpacing: '0.08em', textTransform: 'uppercase',
          fontFamily: 'var(--font-mono)',
        }}>
          使用统计
        </div>
        {(() => {
          const topPlatform = stats?.platform_counts
            ? Object.entries(stats.platform_counts).sort(([,a],[,b]) => b - a)[0]?.[0]
            : null
          const pMap = { wechat: '公众号', zhihu: '知乎', xiaohongshu: '小红书', bilibili: 'B站' }
          return (
            <div style={{ display: 'flex', gap: 14 }}>
              <StatCard label="累计发布" value={stats?.total_publishes ?? 0} index={0} />
              <StatCard label="成功率"   value={stats ? `${stats.success_rate ?? 0}%` : '—'} index={1} />
              <StatCard label="最活跃平台" value={topPlatform ? (pMap[topPlatform] ?? topPlatform) : '—'} index={2} />
            </div>
          )
        })()}
      </div>
    </div>
  )
}
