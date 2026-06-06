const RISK_COLOR = {
  safe:   'var(--green)',
  low:    'var(--blue)',
  medium: 'var(--orange)',
  high:   'var(--red)',
}
const RISK_BG = {
  safe:   'rgba(52,211,153,0.08)',
  low:    'rgba(96,165,250,0.08)',
  medium: 'rgba(251,191,36,0.08)',
  high:   'rgba(248,113,113,0.08)',
}
const RISK_BORDER = {
  safe:   'rgba(52,211,153,0.2)',
  low:    'rgba(96,165,250,0.2)',
  medium: 'rgba(251,191,36,0.2)',
  high:   'rgba(248,113,113,0.2)',
}
const RISK_LABEL = { safe: '安全', low: '低风险', medium: '中风险', high: '高风险' }
const SEV_COLOR  = { error: 'var(--red)', warning: 'var(--orange)', info: 'var(--blue)' }
const SEV_LABEL  = { error: '✕ 必须修改', warning: '△ 建议修改', info: 'ℹ 提示' }

const PNAMES = {
  wechat: '公众号', zhihu: '知乎', xiaohongshu: '小红书', bilibili: 'B站',
  csdn: 'CSDN', weibo: '微博', douyin: '抖音图文',
}

export default function ComplianceReport({ summary, taskId, onFixApplied }) {
  if (!summary || Object.keys(summary).length === 0) return null

  async function applyFix(platform) {
    await fetch('/api/apply-fix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, platform }),
    })
    onFixApplied?.(platform)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Object.entries(summary).map(([pid, cr], idx) => {
        const riskColor  = RISK_COLOR[cr.risk_level]  ?? 'var(--text-3)'
        const riskBg     = RISK_BG[cr.risk_level]     ?? 'transparent'
        const riskBorder = RISK_BORDER[cr.risk_level] ?? 'var(--border)'

        return (
          <div key={pid} className="glass-panel" style={{
            borderLeft: `3px solid ${riskColor}`,
            borderColor: riskBorder,
            borderRadius: 'var(--r-lg)',
            padding: '14px 16px',
            animation: `fadeUp .3s ease ${idx * 60}ms both`,
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)' }}>
                {PNAMES[pid] || pid}
              </span>
              <span style={{
                fontSize: 11, padding: '2px 9px', borderRadius: 20, fontWeight: 600,
                background: riskBg,
                border: `1px solid ${riskBorder}`,
                color: riskColor,
              }}>
                {RISK_LABEL[cr.risk_level] ?? cr.risk_level}
              </span>
            </div>

            {/* Issues or OK */}
            {cr.issues.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ animation: 'checkIn .3s ease' }}>✓</span>
                未发现问题，可直接发布
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {cr.issues.map((issue, i) => {
                  const sc = SEV_COLOR[issue.severity] ?? 'var(--text-3)'
                  return (
                    <div key={i} style={{
                      fontSize: 12, padding: '7px 10px',
                      background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--r-sm)',
                      borderLeft: `2px solid ${sc}`,
                      color: 'var(--text-2)', lineHeight: 1.6,
                      transition: 'background .15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    >
                      <span style={{ color: sc, fontWeight: 600 }}>{SEV_LABEL[issue.severity]}</span>
                      {issue.word && (
                        <code style={{
                          margin: '0 6px', padding: '1px 5px', borderRadius: 3,
                          background: 'rgba(248,113,113,0.1)',
                          color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 11,
                        }}>
                          {issue.word}
                        </code>
                      )}
                      <span style={{ marginLeft: issue.word ? 0 : 6 }}>{issue.suggestion}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Auto-fix button */}
            {cr.auto_fixed_text && !cr.passed && (
              <button
                onClick={() => applyFix(pid)}
                style={{
                  marginTop: 10, padding: '7px 14px', fontSize: 12,
                  background: 'rgba(123,110,246,0.1)',
                  border: '1px solid rgba(123,110,246,0.3)',
                  borderRadius: 'var(--r-sm)', color: 'var(--accent)',
                  cursor: 'pointer', width: '100%',
                  transition: 'all .2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(123,110,246,0.18)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(123,110,246,0.25)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(123,110,246,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                ✦ 应用 AI 自动修复版本
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
