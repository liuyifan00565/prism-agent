/**
 * PlatformSelector — glassmorphism vertical list with binding status dots.
 * Props:
 *   selected: string[]    currently selected platform IDs
 *   onChange: fn(string[])
 *   bindings: { [platformId]: { bound: bool, nickname: string|null } }
 *   onGoBindings: fn()   → navigate to profile page
 */

const PLATFORMS = [
  { id: 'wechat',      name: '公众号',   icon: '💬', color: '#07C160' },
  { id: 'zhihu',       name: '知乎',     icon: '🔵', color: '#0066FF' },
  { id: 'xiaohongshu', name: '小红书',   icon: '📕', color: '#FF2442' },
  { id: 'bilibili',    name: 'B站',      icon: '📺', color: '#00AEEC' },
  { id: 'csdn',        name: 'CSDN',     icon: '📝', color: '#FC5531' },
  { id: 'weibo',       name: '微博',     icon: '🌐', color: '#E6162D' },
  { id: 'douyin',      name: '抖音图文', icon: '🎵', color: '#FE2C55' },
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {PLATFORMS.map((p, idx) => {
          const active   = selected.includes(p.id)
          const bound    = bindings[p.id]?.bound ?? false
          const nickname = bindings[p.id]?.nickname

          return (
            <div
              key={p.id}
              onClick={() => toggle(p.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 'var(--r-md)',
                cursor: 'pointer', position: 'relative', overflow: 'hidden',
                border: active
                  ? '1px solid rgba(123,110,246,0.4)'
                  : '1px solid var(--border)',
                background: active
                  ? 'linear-gradient(135deg, rgba(123,110,246,0.10), rgba(96,165,250,0.05))'
                  : 'transparent',
                boxShadow: active
                  ? '0 0 16px rgba(123,110,246,0.12), inset 0 1px 0 rgba(255,255,255,0.06)'
                  : 'none',
                transition: 'all .2s cubic-bezier(0.4,0,0.2,1)',
                animation: `fadeUp .3s ease ${idx * 50}ms both`,
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = 'var(--bg-glass-hover)'
                  e.currentTarget.style.transform  = 'translateX(3px)'
                  e.currentTarget.style.borderColor = 'rgba(123,110,246,0.2)'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background  = 'transparent'
                  e.currentTarget.style.transform   = 'translateX(0)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }
              }}
            >
              {/* Left accent bar (selected) */}
              {active && (
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                  background: `linear-gradient(to bottom, #7B6EF6, #60A5FA)`,
                  borderRadius: '10px 0 0 10px',
                }} />
              )}

              {/* Platform icon in colored bg */}
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: `${p.color}18`,
                border: `1px solid ${p.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15,
              }}>
                {p.icon}
              </div>

              {/* Name + nickname */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  color: active ? 'var(--text-1)' : 'var(--text-2)',
                  transition: 'color .15s',
                  lineHeight: 1.2,
                }}>
                  {p.name}
                </div>
                {bound && nickname && (
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>
                    {nickname}
                  </div>
                )}
              </div>

              {/* Binding status dot */}
              <span style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: bound ? 'var(--green)' : 'var(--text-4)',
                boxShadow: bound ? '0 0 6px var(--green-glow)' : 'none',
                animation: bound ? 'pulse-glow 2.5s ease-in-out infinite' : 'none',
              }} title={bound ? '已绑定' : '未绑定'} />

              {/* Custom checkbox */}
              <div style={{
                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                border: `2px solid ${active ? 'var(--accent)' : 'rgba(148,163,184,0.25)'}`,
                background: active ? 'var(--accent)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .25s cubic-bezier(0.34,1.56,0.64,1)',
                transform: active ? 'scale(1)' : 'scale(0.85)',
              }}>
                {active && (
                  <span style={{
                    color: '#fff', fontSize: 9, lineHeight: 1,
                    animation: 'checkIn .2s cubic-bezier(0.34,1.56,0.64,1)',
                  }}>✓</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Warning for unbound selected platforms */}
      {anyUnbound && (
        <div style={{
          marginTop: 12, padding: '10px 12px',
          background: 'rgba(251,191,36,0.06)',
          border: '1px solid rgba(251,191,36,0.18)',
          borderRadius: 'var(--r-md)', fontSize: 12,
          color: 'var(--orange)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>⚠ 部分平台未绑定</span>
          {onGoBindings && (
            <button
              onClick={e => { e.stopPropagation(); onGoBindings() }}
              style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.28)',
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
