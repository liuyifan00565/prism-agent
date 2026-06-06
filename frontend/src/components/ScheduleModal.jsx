import { useState } from 'react'

const BASE = '/api'
const PNAMES = { wechat: '公众号', zhihu: '知乎', xiaohongshu: '小红书', bilibili: 'B站' }

const PLATFORM_COLORS = {
  wechat: '#07C160', zhihu: '#0066FF', xiaohongshu: '#FF2442',
  bilibili: '#00AEEC', csdn: '#FC5531', weibo: '#E6162D', douyin: '#FE2C55',
}

export default function ScheduleModal({ title, body, platforms, onClose }) {
  const [scheduledAt, setScheduledAt] = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [toast,       setToast]       = useState('')

  function fmtLocalMin(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  async function handleConfirm() {
    if (!scheduledAt) return
    setSubmitting(true)
    try {
      await fetch(`${BASE}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, body, platforms,
          scheduled_at: new Date(scheduledAt).toISOString(),
        }),
      })
      setToast(`已设定：将于 ${fmtLocalMin(scheduledAt)} 自动发布至 ${platforms.length} 个平台`)
      setTimeout(() => { setToast(''); onClose() }, 2500)
    } finally {
      setSubmitting(false)
    }
  }

  const minDt = new Date(Date.now() + 60000).toISOString().slice(0, 16)
  const canSubmit = !!(scheduledAt) && !submitting

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.6)',
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
        borderRadius: 'var(--r-xl)',
        padding: '24px',
        width: 360,
        display: 'flex', flexDirection: 'column', gap: 18,
        boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03) inset',
        animation: 'modalIn .3s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{
              fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ animation: 'float 3s ease-in-out infinite', display: 'inline-block' }}>⏰</span>
              定时发布
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
              选择发布时间，Agent 将在后台自动执行
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 26, height: 26, borderRadius: 'var(--r-sm)',
              border: '1px solid var(--border)',
              background: 'transparent', cursor: 'pointer',
              color: 'var(--text-3)', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .15s', flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(248,113,113,0.1)'
              e.currentTarget.style.color = 'var(--red)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-3)'
            }}
          >×</button>
        </div>

        {/* Datetime picker */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 7, letterSpacing: '0.05em' }}>
            发布时间
          </div>
          <input
            type="datetime-local"
            min={minDt}
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              color: 'var(--text-1)', padding: '9px 12px',
              fontSize: 13, outline: 'none',
              accentColor: 'var(--accent)',
              colorScheme: 'dark',
              transition: 'border-color .2s, box-shadow .2s',
              fontFamily: 'var(--font-display)',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.boxShadow   = '0 0 0 2px var(--accent-glow)'
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.boxShadow   = 'none'
            }}
          />
        </div>

        {/* Platform tags */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 7, letterSpacing: '0.05em' }}>
            目标平台
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {platforms.map(p => {
              const pcolor = PLATFORM_COLORS[p] ?? 'var(--accent)'
              return (
                <span key={p} style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 20,
                  background: `${pcolor}18`,
                  border: `1px solid ${pcolor}40`,
                  color: pcolor,
                  fontWeight: 500,
                }}>
                  {PNAMES[p] ?? p}
                </span>
              )
            })}
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            fontSize: 12, color: 'var(--green)',
            background: 'rgba(52,211,153,0.07)',
            border: '1px solid rgba(52,211,153,0.2)',
            borderRadius: 'var(--r-md)', padding: '10px 12px',
            display: 'flex', alignItems: 'center', gap: 7,
            animation: 'fadeUp .3s ease',
          }}>
            <span style={{ animation: 'checkIn .3s ease' }}>✓</span>
            {toast}
          </div>
        )}

        {/* Actions */}
        {!toast && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleConfirm}
              disabled={!canSubmit}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 'var(--r-md)', fontSize: 13,
                background: canSubmit
                  ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
                  : 'rgba(255,255,255,0.04)',
                border: 'none',
                color: canSubmit ? '#fff' : 'var(--text-3)',
                fontWeight: 600,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                transition: 'all .2s',
                boxShadow: canSubmit ? 'var(--shadow-btn)' : 'none',
              }}
              onMouseEnter={e => {
                if (canSubmit) {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 6px 28px rgba(123,110,246,0.55)'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = canSubmit ? 'var(--shadow-btn)' : 'none'
              }}
            >
              {submitting ? '设定中...' : '确认定时'}
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '10px 16px', borderRadius: 'var(--r-md)', fontSize: 13,
                background: 'transparent', border: '1px solid var(--border)',
                color: 'var(--text-3)', cursor: 'pointer', transition: 'all .15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-2)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
            >
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
