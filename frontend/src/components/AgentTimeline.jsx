export default function AgentTimeline({ logs = [] }) {
  if (logs.length === 0) return null

  function logColor(line) {
    if (line.includes('重试') || line.includes('等待用户')) return 'var(--orange)'
    if (line.includes('失败') || line.includes('error'))     return 'var(--red)'
    if (line.includes('✓')   || line.includes('成功'))       return 'var(--green)'
    if (line.includes('继续执行'))                           return 'var(--accent)'
    return 'var(--text-3)'
  }

  function logIcon(line) {
    if (line.includes('重试') || line.includes('等待用户')) return '△'
    if (line.includes('失败') || line.includes('error'))     return '✕'
    if (line.includes('✓')   || line.includes('成功'))       return '✓'
    if (line.includes('继续执行'))                           return '→'
    return '·'
  }

  return (
    <div style={{
      background: 'rgba(0,0,0,0.3)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)',
      padding: '10px 14px',
      maxHeight: 200, overflowY: 'auto',
      fontFamily: 'var(--font-mono)', fontSize: 11,
      scrollbarWidth: 'thin',
      scrollbarColor: 'var(--border) transparent',
    }}>
      {/* Terminal header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8,
        paddingBottom: 7, borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        {['var(--red)', 'var(--orange)', 'var(--green)'].map((c, i) => (
          <span key={i} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: c, opacity: 0.6,
          }} />
        ))}
        <span style={{ fontSize: 9, color: 'var(--text-3)', marginLeft: 4, letterSpacing: '0.05em' }}>
          AGENT LOG
        </span>
      </div>

      {logs.map((line, i) => (
        <div key={i} style={{
          display: 'flex', gap: 8, lineHeight: 1.7,
          animation: `fadeUp .15s ease ${i * 30}ms both`,
        }}>
          <span style={{ color: 'var(--text-3)', flexShrink: 0, userSelect: 'none' }}>
            {String(i + 1).padStart(2, '0')}
          </span>
          <span style={{ color: logColor(line), flexShrink: 0, width: 12 }}>
            {logIcon(line)}
          </span>
          <span style={{ color: logColor(line), flex: 1 }}>{line}</span>
        </div>
      ))}

      {/* Blinking cursor */}
      <div style={{ display: 'flex', gap: 8, lineHeight: 1.7, marginTop: 2 }}>
        <span style={{ color: 'var(--text-3)', flexShrink: 0, userSelect: 'none' }}>
          {String(logs.length + 1).padStart(2, '0')}
        </span>
        <span style={{
          color: 'var(--accent)',
          animation: 'pulse 1.2s ease-in-out infinite',
          opacity: 0.7,
        }}>▋</span>
      </div>
    </div>
  )
}
