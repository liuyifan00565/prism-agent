export default function AgentTimeline({ logs = [] }) {
  if (logs.length === 0) return null

  function logColor(line) {
    if (line.includes('重试') || line.includes('等待用户')) return 'var(--orange)'
    if (line.includes('失败') || line.includes('error'))     return 'var(--red)'
    if (line.includes('✓') || line.includes('成功'))         return 'var(--green)'
    if (line.includes('继续执行'))                           return 'var(--accent)'
    return 'var(--text-dim)'
  }

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px',
      maxHeight: 180, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12,
    }}>
      {logs.map((line, i) => (
        <div key={i} style={{ lineHeight: 1.8 }}>
          <span style={{ color: 'var(--text-dim)', marginRight: 8 }}>{String(i + 1).padStart(2, '0')}</span>
          <span style={{ color: logColor(line) }}>{line}</span>
        </div>
      ))}
    </div>
  )
}
