/**
 * PolishDrawer — slides in from the right with spring animation.
 * Props: open, onClose, platform, title, body, onUpdate
 */
import { useState, useRef, useEffect } from 'react'
import { useVoice } from '../hooks/useVoice'

const PNAMES = {
  wechat: '公众号', zhihu: '知乎', xiaohongshu: '小红书',
  bilibili: 'B站', csdn: 'CSDN', weibo: '微博', douyin: '抖音图文',
}
const PLATFORM_COLORS = {
  wechat: '#07C160', zhihu: '#0066FF', xiaohongshu: '#FF2442',
  bilibili: '#00AEEC', csdn: '#FC5531', weibo: '#E6162D', douyin: '#FE2C55',
}

function Bubble({ role, text }) {
  const isUser = role === 'user'
  return (
    <div style={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 10, animation: 'fadeUp .25s ease',
    }}>
      <div style={{
        maxWidth: '84%', padding: '9px 13px',
        borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
        fontSize: 12, lineHeight: 1.6,
        background: isUser
          ? 'linear-gradient(135deg, rgba(123,110,246,0.3), rgba(96,165,250,0.2))'
          : 'rgba(255,255,255,0.04)',
        border: isUser
          ? '1px solid rgba(123,110,246,0.3)'
          : '1px solid var(--border)',
        color: isUser ? 'var(--text-1)' : 'var(--text-1)',
      }}>
        {text}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
      <div style={{
        padding: '10px 14px', borderRadius: '12px 12px 12px 2px',
        background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
        display: 'flex', gap: 4, alignItems: 'center',
      }}>
        {[0, 0.2, 0.4].map((d, i) => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--accent)',
            animation: `float 1s ease-in-out ${d}s infinite`,
            display: 'inline-block',
          }} />
        ))}
      </div>
    </div>
  )
}

export default function PolishDrawer({ open, onClose, platform, title, body, onUpdate }) {
  const [messages, setMessages] = useState([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const scrollRef = useRef(null)
  const { recording, audioBlob, start, stop, reset: resetVoice } = useVoice()

  useEffect(() => {
    if (!open) return
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  useEffect(() => {
    if (!audioBlob) return
    ;(async () => {
      try {
        const fd = new FormData()
        fd.append('audio', audioBlob, 'polish.wav')
        const res  = await fetch('/api/voice/transcribe', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.transcript) { resetVoice(); await sendMessage(data.transcript) }
      } catch {}
    })()
  }, [audioBlob])

  useEffect(() => {
    if (!open || !platform) return
    setMessages([{
      role: 'ai',
      text: `已为你加载「${PNAMES[platform] ?? platform}」版本，有什么需要调整？`,
    }])
  }, [platform, open])

  async function sendMessage(text) {
    if (!text.trim()) return
    setMessages(prev => [...prev, { role: 'user', text }])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/voice/refine', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction:   text,
          current_title: title,
          current_body:  body,
          summary:       `为${PNAMES[platform] ?? platform}平台润色`,
        }),
      })
      const data = await res.json()
      onUpdate?.({ title: data.title, body: data.body })
      setMessages(prev => [...prev, { role: 'ai', text: data.change_desc || '已按你的要求修改完成 ✓' }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: '修改失败，请重试' }])
    } finally {
      setLoading(false)
    }
  }

  const pname = PNAMES[platform] ?? platform
  const pcolor = PLATFORM_COLORS[platform] ?? 'var(--accent)'

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 199,
          background: 'rgba(0,0,0,0.45)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity .3s ease',
          WebkitBackdropFilter: open ? 'blur(4px)' : 'none',
          backdropFilter: open ? 'blur(4px)' : 'none',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 360,
        zIndex: 200,
        background: 'rgba(8,11,18,0.97)',
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
        borderLeft: '1px solid rgba(123,110,246,0.2)',
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .38s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: open ? '-20px 0 60px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,0.03) inset' : 'none',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px 16px',
          borderBottom: '1px solid transparent',
          background: 'linear-gradient(to bottom, rgba(123,110,246,0.06), transparent)',
          flexShrink: 0, position: 'relative',
        }}>
          {/* gradient divider */}
          <div style={{
            position: 'absolute', bottom: 0, left: '10%', right: '10%', height: 1,
            background: 'linear-gradient(90deg, transparent, var(--border-glow), transparent)',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 18,
                animation: 'float 3s ease-in-out infinite',
                display: 'inline-block',
              }}>✨</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>润色助手</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{
                    fontSize: 10, padding: '1px 8px', borderRadius: 10,
                    background: `${pcolor}18`,
                    border: `1px solid ${pcolor}40`,
                    color: pcolor,
                  }}>
                    {pname}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 'var(--r-sm)',
                border: '1px solid var(--border)',
                background: 'transparent', cursor: 'pointer', color: 'var(--text-3)',
                fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; e.currentTarget.style.color = 'var(--red)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)' }}
            >×</button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{
          flex: 1, overflowY: 'auto', padding: '16px 16px 8px',
        }}>
          {messages.map((m, i) => <Bubble key={i} role={m.role} text={m.text} />)}
          {loading && <TypingIndicator />}
        </div>

        {/* Input area */}
        <div style={{
          padding: '12px 14px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.02)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            {/* Voice button */}
            <button
              onClick={recording ? stop : () => { resetVoice(); start() }}
              style={{
                width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: recording ? 'var(--red)' : 'rgba(123,110,246,0.15)',
                fontSize: 15, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: recording ? '0 0 0 4px rgba(248,113,113,.25), 0 0 16px rgba(248,113,113,.3)' : 'none',
                transition: 'all .2s',
                animation: recording ? 'pulse-glow 1.5s infinite' : 'none',
              }}
              title={recording ? '停止录音' : '语音输入'}
            >
              {recording ? '■' : '🎙'}
            </button>

            {/* Text input */}
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
              }}
              placeholder="告诉 AI 哪里需要调整..."
              rows={2}
              style={{
                flex: 1, resize: 'none', borderRadius: 'var(--r-md)', padding: '8px 12px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)',
                color: 'var(--text-1)', fontSize: 12, lineHeight: 1.5, outline: 'none',
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

            {/* Send button */}
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              style={{
                height: 36, padding: '0 14px', borderRadius: 'var(--r-md)', border: 'none',
                background: (!input.trim() || loading)
                  ? 'rgba(255,255,255,0.05)'
                  : 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                color: (!input.trim() || loading) ? 'var(--text-3)' : '#fff',
                fontSize: 13, fontWeight: 600,
                cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
                transition: 'all .2s',
                flexShrink: 0,
                boxShadow: (!input.trim() || loading) ? 'none' : '0 2px 12px rgba(123,110,246,0.35)',
              }}
              onMouseEnter={e => {
                if (input.trim() && !loading) {
                  e.currentTarget.style.transform = 'translateX(2px)'
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(123,110,246,0.5)'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = (!input.trim() || loading) ? 'none' : '0 2px 12px rgba(123,110,246,0.35)'
              }}
            >
              →
            </button>
          </div>

          {recording && (
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--red)', animation: 'pulse 1s infinite', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />
              录音中，再次点击停止...
            </div>
          )}
        </div>
      </div>
    </>
  )
}
