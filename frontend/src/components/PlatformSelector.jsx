/**
 * PlatformSelector — vertical list with binding status dots.
 * Props:
 *   selected: string[]    currently selected platform IDs
 *   onChange: fn(string[])
 *   bindings: { [platformId]: { bound: bool, nickname: string|null } }
 *   onGoBindings: fn()   → navigate to profile page
 */

const PLATFORMS = [
  { id: 'wechat',      name: '公众号',  icon: '💬' },
  { id: 'zhihu',       name: '知乎',    icon: '🔵' },
  { id: 'xiaohongshu', name: '小红书',  icon: '📕' },
  { id: 'bilibili',    name: 'B站',     icon: '📺' },
  { id: 'csdn',        name: 'CSDN',    icon: '📝' },
  { id: 'weibo',       name: '微博',    icon: '🌐' },
  { id: 'douyin',      name: '抖音图文', icon: '🎵' },
]

export default function PlatformSelector({ selected, onChange, bindings = {}, onGoBindings }) {
  function toggle(id) {
    onChange(
      selected.includes(id)
        ? selected.filter(p => p !== id)
        : [...selected, id]
    )
  }

  const anyUnbound = selected.some(id => !bindings[id]?.bound)

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {PLATFORMS.map(p => {
          const active  = selected.includes(p.id)
          const bound   = bindings[p.id]?.bound ?? false
          const nickname = bindings[p.id]?.nickname

          return (
            <div
              key={p.id}
              onClick={() => toggle(p.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                transition: 'all .15s',
                border: active
                  ? '1px solid var(--border-active)'
                  : '1px solid var(--border)',
                background: active ? 'var(--accent-glow)' : 'transparent',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                if (!active) e.currentTarget.style.background = 'var(--bg-hover)'
              }}
              onMouseLeave={e => {
                if (!active) e.currentTarget.style.background = 'transparent'
              }}
            >
              {/* Left accent bar (when active) */}
              {active && (
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: 3,
                  background: 'linear-gradient(to bottom, var(--accent), var(--accent2))',
                  borderRadius: '10px 0 0 10px',
                }} />
              )}

              {/* Icon */}
              <span style={{ fontSize: 18, lineHeight: 1 }}>{p.icon}</span>

              {/* Name + nickname */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  color: active ? 'var(--text)' : 'var(--text-muted)',
                  transition: 'color .15s',
                }}>
                  {p.name}
                </div>
                {bound && nickname && (
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>
                    {nickname}
                  </div>
                )}
              </div>

              {/* Binding status dot */}
              <span style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: bound ? 'var(--green)' : 'var(--text-dim)',
                boxShadow: bound ? '0 0 6px var(--green)' : 'none',
                transition: 'all .2s',
              }} title={bound ? '已绑定' : '未绑定'} />

              {/* Checkbox */}
              <div style={{
                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                border: `2px solid ${active ? 'var(--accent)' : 'var(--border-active)'}`,
                background: active ? 'var(--accent)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .15s',
              }}>
                {active && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1 }}>✓</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Warning for unbound selected platforms */}
      {anyUnbound && (
        <div style={{
          marginTop: 12, padding: '10px 12px',
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 8, fontSize: 12,
          color: 'var(--orange)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>⚠ 部分平台未绑定，发布时需登录</span>
          {onGoBindings && (
            <button
              onClick={e => { e.stopPropagation(); onGoBindings() }}
              style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
                background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                color: 'var(--orange)',
              }}
            >
              去绑定
            </button>
          )}
        </div>
      )}
    </div>
  )
}
