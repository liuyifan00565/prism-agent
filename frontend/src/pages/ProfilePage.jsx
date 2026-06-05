import { useState, useEffect } from 'react'

const PLATFORMS = [
  { id: 'xiaohongshu', name: '小红书', icon: '📕', color: '#ff2442' },
  { id: 'zhihu',       name: '知乎',   icon: '🔵', color: '#1772f6' },
  { id: 'wechat',      name: '公众号', icon: '💬', color: '#07c160' },
  { id: 'bilibili',    name: 'B站',    icon: '📺', color: '#00a1d6' },
]

function AvatarCircle({ username }) {
  const char = (username || '?')[0].toUpperCase()
  return (
    <div style={{
      width: 72, height: 72, borderRadius: '50%',
      background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 28, fontWeight: 700, color: '#fff',
      boxShadow: '0 0 24px var(--accent-glow)',
      flexShrink: 0,
    }}>
      {char}
    </div>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{
      flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '18px 20px',
    }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

export default function ProfilePage({ auth }) {
  const { user, isLoggedIn, bindPlatform, unbindPlatform, refreshMe } = auth
  const [stats, setStats]         = useState(null)
  const [bindingPlatform, setBindingPlatform] = useState(null)
  const [error, setError]         = useState('')

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
        color: 'var(--text-muted)', fontSize: 14,
      }}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: .3 }}>◈</div>
        <p>请先登录以查看账户信息</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px', animation: 'fadeUp .3s ease' }}>

      {/* ── Personal info card ─────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-panel)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '28px 28px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 24,
      }}>
        <AvatarCircle username={user.username} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            {user.username}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user.email}</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
            注册于 {user.created_at?.slice(0, 10)}
          </div>
        </div>
        <button className="btn-outline" style={{ padding: '8px 18px', fontSize: 13 }}>
          编辑资料
        </button>
      </div>

      {/* ── Platform bindings ──────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-panel)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '24px 28px', marginBottom: 20,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 18, letterSpacing: .5 }}>
          已绑定账号
        </div>

        {error && (
          <div style={{
            fontSize: 12, color: 'var(--red)',
            background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)',
            borderRadius: 8, padding: '8px 12px', marginBottom: 14,
          }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PLATFORMS.map(p => {
            const binding  = bindings[p.id] ?? { bound: false, nickname: null }
            const isBound  = binding.bound
            const isLoading = bindingPlatform === p.id

            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: 10,
                background: isBound ? 'rgba(34,211,165,0.04)' : 'var(--bg-card)',
                border: `1px solid ${isBound ? 'rgba(34,211,165,0.2)' : 'var(--border)'}`,
                transition: 'all .2s',
              }}>
                <span style={{ fontSize: 22 }}>{p.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {isBound ? (binding.nickname || '已绑定') : '未绑定'}
                  </div>
                </div>
                {/* Status dot */}
                <span style={{
                  fontSize: 11,
                  color: isBound ? 'var(--green)' : 'var(--text-dim)',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: isBound ? 'var(--green)' : 'var(--text-dim)',
                    display: 'inline-block',
                    boxShadow: isBound ? '0 0 6px var(--green)' : 'none',
                  }} />
                  {isBound ? '已绑定' : '未绑定'}
                </span>
                {/* Action button */}
                {isBound ? (
                  <button
                    onClick={() => handleUnbind(p.id)}
                    style={{
                      padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                      background: 'transparent', border: '1px solid rgba(248,113,113,.3)',
                      color: 'var(--red)', transition: 'all .15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    解绑
                  </button>
                ) : (
                  <button
                    onClick={() => handleBind(p.id)}
                    disabled={isLoading}
                    style={{
                      padding: '6px 14px', borderRadius: 6, fontSize: 12,
                      cursor: isLoading ? 'wait' : 'pointer',
                      background: 'var(--accent-glow)', border: '1px solid var(--border-active)',
                      color: 'var(--accent)', opacity: isLoading ? .6 : 1,
                      transition: 'all .15s',
                    }}
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
            padding: '10px 14px', background: 'var(--accent-glow)',
            borderRadius: 8, border: '1px solid var(--border-active)',
          }}>
            🌐 请在弹出的浏览器窗口中完成登录，系统将自动检测并保存会话...
          </div>
        )}
      </div>

      {/* ── Usage stats ────────────────────────────────────────── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 14, letterSpacing: .5 }}>
          使用统计
        </div>
        {(() => {
          const topPlatform = stats?.platform_counts
            ? Object.entries(stats.platform_counts).sort(([,a],[,b]) => b - a)[0]?.[0]
            : null
          const pMap = { wechat: '公众号', zhihu: '知乎', xiaohongshu: '小红书', bilibili: 'B站' }
          return (
            <div style={{ display: 'flex', gap: 14 }}>
              <StatCard label="累计发布" value={stats?.total_publishes ?? 0} />
              <StatCard label="成功率" value={stats ? `${stats.success_rate ?? 0}%` : '—'} />
              <StatCard label="最活跃平台" value={topPlatform ? (pMap[topPlatform] ?? topPlatform) : '—'} />
            </div>
          )
        })()}
      </div>
    </div>
  )
}
