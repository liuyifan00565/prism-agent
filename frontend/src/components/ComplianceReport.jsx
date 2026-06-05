const RISK_COLOR = {
  safe:   '#69db7c',
  low:    '#a9e34b',
  medium: '#ffa94d',
  high:   '#ff6b6b',
}
const RISK_LABEL = { safe: '安全', low: '低风险', medium: '中风险', high: '高风险' }
const SEV_COLOR  = { error: '#ff6b6b', warning: '#ffa94d', info: '#74c0fc' }
const SEV_LABEL  = { error: '❌ 必须修改', warning: '⚠ 建议修改', info: 'ℹ 提示' }

const PNAMES = { wechat: '公众号', zhihu: '知乎', xiaohongshu: '小红书', bilibili: 'B站' }

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Object.entries(summary).map(([pid, cr]) => (
        <div key={pid} style={{
          background: '#16161a',
          border: `1px solid ${RISK_COLOR[cr.risk_level]}33`,
          borderRadius: 10, padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 500, fontSize: 14 }}>{PNAMES[pid] || pid}</span>
            <span style={{
              fontSize: 11, padding: '3px 9px', borderRadius: 20, fontWeight: 600,
              background: `${RISK_COLOR[cr.risk_level]}22`,
              color: RISK_COLOR[cr.risk_level],
            }}>
              {RISK_LABEL[cr.risk_level]}
            </span>
          </div>

          {cr.issues.length === 0 ? (
            <div style={{ fontSize: 12, color: '#69db7c' }}>✓ 未发现问题，可直接发布</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {cr.issues.map((issue, i) => (
                <div key={i} style={{
                  fontSize: 12, padding: '6px 10px',
                  background: '#0d0d0f', borderRadius: 6,
                  borderLeft: `2px solid ${SEV_COLOR[issue.severity]}`,
                  color: '#aaa', lineHeight: 1.6,
                }}>
                  <span style={{ color: SEV_COLOR[issue.severity], fontWeight: 500 }}>
                    {SEV_LABEL[issue.severity]}
                  </span>
                  {issue.word && (
                    <span style={{
                      margin: '0 6px', padding: '1px 6px', borderRadius: 4,
                      background: '#ffffff11', color: '#ff9999', fontFamily: 'monospace',
                    }}>
                      {issue.word}
                    </span>
                  )}
                  <span>{issue.suggestion}</span>
                </div>
              ))}
            </div>
          )}

          {cr.auto_fixed_text && !cr.passed && (
            <button
              onClick={() => applyFix(pid)}
              style={{
                marginTop: 10, padding: '7px 14px', fontSize: 12,
                background: 'rgba(200,245,90,0.1)', border: '1px solid #c8f55a55',
                borderRadius: 6, color: '#c8f55a', cursor: 'pointer', width: '100%',
              }}
            >
              ✦ 应用 AI 自动修复版本
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
