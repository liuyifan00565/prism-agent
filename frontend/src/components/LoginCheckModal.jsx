const PNAMES = { wechat: '公众号', zhihu: '知乎', xiaohongshu: '小红书', bilibili: 'B站' }

const PLATFORM_COLORS = {
  wechat: '#07C160', zhihu: '#0066FF', xiaohongshu: '#FF2442',
  bilibili: '#00AEEC', csdn: '#FC5531', weibo: '#E6162D', douyin: '#FE2C55',
}

function Spinner({ size = 14 }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      border: '2px solid rgba(123,110,246,0.3)', borderTopColor: 'var(--accent)',
      display: 'inline-block', animation: 'spin 0.75s linear infinite',
    }} />
  )
}

export default function LoginCheckModal({
  platforms = [],
  sessionStatus = {},
  activePlatform = null,
  onSelectPlatform,
  onCancel,
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Backdrop */}
      <div
        onClick={activePlatform ? undefined : onCancel}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.65)',
          WebkitBackdropFilter: 'blur(6px)',
          backdropFilter: 'blur(6px)',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'rgba(8,11,18,0.97)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        backdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(123,110,246,0.2)',
        borderRadius: 'var(--r-xl)', padding: '24px',
        width: 440,
        display: 'flex', flexDirection: 'column', gap: 18,
        boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03) inset',
        animation: 'modalIn .3s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Header */}
        <div>
          <div style={{
            fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'rgba(123,110,246,0.1)',
              border: '1px solid rgba(123,110,246,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
            }}>🌐</span>
            选择要登录并发布的平台
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6, paddingLeft: 38 }}>
            点击后会自动打开浏览器、检测登录、填写内容并发布，右侧会实时显示进度
          </div>
        </div>

        {/* Platform list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {platforms.map((p, i) => {
            const isActive = activePlatform === p
            const valid    = sessionStatus[p]
            const pcolor   = PLATFORM_COLORS[p] ?? 'var(--accent)'

            return (
              <div key={p} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: isActive ? `${pcolor}08` : 'rgba(255,255,255,0.02)',
                borderRadius: 'var(--r-md)', padding: '12px 14px',
                border: isActive
                  ? `1px solid ${pcolor}30`
                  : '1px solid var(--border)',
                gap: 12, transition: 'all .2s',
                animation: `fadeUp .2s ease ${i * 60}ms both`,
              }}>
                {/* Left: platform + status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  {/* Color dot */}
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: pcolor, flexShrink: 0,
                    boxShadow: isActive ? `0 0 8px ${pcolor}` : 'none',
                    animation: isActive ? 'pulse-glow 1.5s ease-in-out infinite' : 'none',
                  }} />
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }}>
                      {PNAMES[p] ?? p}
                    </div>
                    <div style={{
                      fontSize: 11, marginTop: 2,
                      color: valid ? 'var(--green)' : 'var(--orange)',
                    }}>
                      {valid ? '✓ 已检测到登录态' : '△ 未检测到登录态，将先打开登录页'}
                    </div>
                  </div>
                </div>

                {/* Action button */}
                <button
                  onClick={() => onSelectPlatform?.(p)}
                  disabled={!!activePlatform}
                  style={{
                    minWidth: 110,
                    padding: '8px 12px', borderRadius: 'var(--r-sm)',
                    border: activePlatform
                      ? '1px solid var(--border)'
                      : valid ? 'none' : '1px solid rgba(123,110,246,0.3)',
                    background: activePlatform
                      ? 'rgba(255,255,255,0.03)'
                      : valid
                      ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
                      : 'rgba(123,110,246,0.1)',
                    color: activePlatform
                      ? 'var(--text-3)'
                      : valid ? '#fff' : 'var(--accent)',
                    fontSize: 12, fontWeight: 600,
                    cursor: activePlatform ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    transition: 'all .2s',
                    boxShadow: (!activePlatform && valid) ? 'var(--shadow-btn)' : 'none',
                  }}
                >
                  {isActive ? <><Spinner size={11} /> 进行中</> : valid ? '直接发布' : '登录并发布'}
                </button>
              </div>
            )
          })}
        </div>

        {/* Cancel */}
        <button
          onClick={onCancel}
          disabled={!!activePlatform}
          style={{
            width: '100%', padding: '9px 0', borderRadius: 'var(--r-md)', fontSize: 12,
            background: 'transparent', border: '1px solid var(--border)',
            color: activePlatform ? 'var(--text-3)' : 'var(--text-3)',
            cursor: activePlatform ? 'not-allowed' : 'pointer',
            opacity: activePlatform ? 0.4 : 1,
            transition: 'all .15s',
          }}
          onMouseEnter={e => { if (!activePlatform) e.currentTarget.style.color = 'var(--text-2)' }}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
        >
          取消
        </button>
      </div>
    </div>
  )
}
