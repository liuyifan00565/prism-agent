import { useState } from 'react'

const BASE = '/api'
const PNAMES = { wechat: '公众号', zhihu: '知乎', xiaohongshu: '小红书', bilibili: 'B站' }

export default function ScheduleModal({ title, body, platforms, onClose }) {
  const [scheduledAt, setScheduledAt] = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [toast,       setToast]       = useState('')

  function fmtLocalMin(iso) {
    // format "2025-08-01T14:30" → "8月1日 14:30"
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
          title,
          body,
          platforms,
          scheduled_at: new Date(scheduledAt).toISOString(),
        }),
      })
      setToast(`已设定：将于 ${fmtLocalMin(scheduledAt)} 自动发布至 ${platforms.length} 个平台`)
      setTimeout(() => { setToast(''); onClose() }, 2500)
    } finally {
      setSubmitting(false)
    }
  }

  // minimum datetime = now
  const minDt = new Date(Date.now() + 60000).toISOString().slice(0, 16)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* backdrop */}
      <div onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />

      {/* modal */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: '#16161a', border: '1px solid #2a2a30',
        borderRadius: 14, padding: '24px',
        width: 340, display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#eee', marginBottom: 4 }}>
            ⏰ 定时发布
          </div>
          <div style={{ fontSize: 12, color: '#555' }}>
            选择发布时间，Agent 将在后台自动执行
          </div>
        </div>

        {/* datetime picker */}
        <div>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>发布时间</div>
          <input
            type="datetime-local"
            min={minDt}
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#0d0d0f', border: '1px solid #2a2a30',
              borderRadius: 8, color: '#eee', padding: '9px 12px',
              fontSize: 13, outline: 'none',
              accentColor: '#c8f55a',
              colorScheme: 'dark',
            }}
          />
        </div>

        {/* platform list */}
        <div>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>目标平台</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {platforms.map(p => (
              <span key={p} style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 20,
                background: 'rgba(200,245,90,0.08)', border: '1px solid #c8f55a33',
                color: '#c8f55a',
              }}>
                {PNAMES[p] ?? p}
              </span>
            ))}
          </div>
        </div>

        {/* toast */}
        {toast && (
          <div style={{
            fontSize: 12, color: '#69db7c',
            background: 'rgba(105,219,124,0.07)',
            border: '1px solid rgba(105,219,124,0.2)',
            borderRadius: 8, padding: '9px 12px',
          }}>
            ✓ {toast}
          </div>
        )}

        {/* actions */}
        {!toast && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleConfirm}
              disabled={!scheduledAt || submitting}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 13,
                background: (!scheduledAt || submitting) ? '#1a1a1e' : '#c8f55a',
                border: 'none',
                color: (!scheduledAt || submitting) ? '#444' : '#0a0a0c',
                fontWeight: 600,
                cursor: (!scheduledAt || submitting) ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? '设定中...' : '确认定时'}
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '10px 16px', borderRadius: 8, fontSize: 13,
                background: 'transparent', border: '1px solid #2a2a30',
                color: '#666', cursor: 'pointer',
              }}
            >
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
