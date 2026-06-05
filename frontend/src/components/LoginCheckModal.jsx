const PNAMES = { wechat: '公众号', zhihu: '知乎', xiaohongshu: '小红书', bilibili: 'B站' }

function Spinner({ size = 14 }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      border: '2px solid #c8f55a', borderTopColor: 'transparent',
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
      <div
        onClick={activePlatform ? undefined : onCancel}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)' }}
      />

      <div style={{
        position: 'relative', zIndex: 1,
        background: '#16161a', border: '1px solid #2a2a30',
        borderRadius: 14, padding: '24px',
        width: 420, display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#eee', marginBottom: 4 }}>
            选择要登录并发布的平台
          </div>
          <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>
            你可以一次只启动一个平台。点击后会自动打开浏览器、检测登录、填写内容并发布，
            右侧会实时显示每一步进度。
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {platforms.map(p => {
            const isActive = activePlatform === p
            const valid = sessionStatus[p]
            return (
              <div key={p} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#0d0d0f', borderRadius: 8, padding: '12px 14px',
                border: `1px solid ${isActive ? '#c8f55a33' : '#1e1e24'}`,
                gap: 12,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 13, color: '#ddd' }}>{PNAMES[p] ?? p}</span>
                  <span style={{ fontSize: 11, color: valid ? '#69db7c' : '#ffa94d' }}>
                    {valid ? '已检测到登录态，可直接发布' : '未检测到登录态，将先打开登录页'}
                  </span>
                </div>

                <button
                  onClick={() => onSelectPlatform?.(p)}
                  disabled={!!activePlatform}
                  style={{
                    minWidth: 110,
                    padding: '8px 12px', borderRadius: 8, border: 'none',
                    background: activePlatform ? '#1a1a1e' : '#c8f55a',
                    color: activePlatform ? '#444' : '#0a0a0c',
                    fontSize: 12, fontWeight: 700,
                    cursor: activePlatform ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {isActive ? <><Spinner size={12} /> 进行中</> : (valid ? '直接发布' : '登录并发布')}
                </button>
              </div>
            )
          })}
        </div>

        <button
          onClick={onCancel}
          disabled={!!activePlatform}
          style={{
            width: '100%', padding: '8px 0', borderRadius: 8, fontSize: 12,
            background: 'transparent', border: '1px solid #1e1e22',
            color: activePlatform ? '#333' : '#555', cursor: activePlatform ? 'not-allowed' : 'pointer',
          }}
        >
          取消
        </button>
      </div>
    </div>
  )
}
