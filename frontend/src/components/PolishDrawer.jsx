/**
 * PolishDrawer — slides in from the right when user clicks "✨ 润色"
 * on a platform card.
 *
 * Props:
 *   open:     bool
 *   onClose:  fn()
 *   platform: string
 *   title:    string (current adapted title)
 *   body:     string (current adapted body)
 *   onUpdate: fn({ title, body })   — called when AI returns refined content
 */
import { useState, useRef, useEffect } from 'react'
import { useVoice } from '../hooks/useVoice'

const PNAMES = { wechat: '公众号', zhihu: '知乎', xiaohongshu: '小红书', bilibili: 'B站' }

function Bubble({ role, text }) {
  const isUser = role === 'user'
  return (
    <div style={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 10,
    }}>
      <div style={{
        maxWidth: '82%', padding: '9px 13px', borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
        fontSize: 12, lineHeight: 1.6,
        background: isUser
          ? 'linear-gradient(135deg, var(--accent), var(--accent2))'
          : 'var(--bg-card)',
        border: isUser ? 'none' : '1px solid var(--border)',
        color: isUser ? '#fff' : 'var(--text)',
      }}>
        {text}
      </div>
    </div>
  )
}

export default function PolishDrawer({ open, onClose, platform, title, body, onUpdate }) {
  const [messages,    setMessages]    = useState([])
  const [input,       setInput]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const scrollRef = useRef(null)
  const { recording, audioBlob, start, stop, reset: resetVoice } = useVoice()

  // ESC key to close
  useEffect(() => {
    if (!open) return
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Auto-scroll messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Voice recorded → transcribe → send
  useEffect(() => {
    if (!audioBlob) return
    ;(async () => {
      try {
        const fd = new FormData()
        fd.append('audio', audioBlob, 'polish.wav')
        const res  = await fetch('/api/voice/transcribe', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.transcript) {
          resetVoice()
          await sendMessage(data.transcript)
        }
      } catch (e) { console.error(e) }
    })()
  }, [audioBlob])

  // Greet when platform changes
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
        body:    JSON.stringify({
          instruction:   text,
          current_title: title,
          current_body:  body,
          summary:       `为${PNAMES[platform] ?? platform}平台润色`,
        }),
      })
      const data = await res.json()
      onUpdate?.({ title: data.title, body: data.body })
      setMessages(prev => [
        ...prev,
        { role: 'ai', text: data.change_desc || '已按你的要求修改完成 ✓' },
      ])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: '修改失败，请重试' }])
    } finally {
      setLoading(false)
    }
  }

  const pname = PNAMES[platform] ?? platform

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 199,
            background: 'rgba(0,0,0,0.4)',
          }}
        />
      )}

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 360,
        zIndex: 200,
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border-active)',
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .3s cubic-bezier(.4,0,.2,1)',
        boxShadow: open ? '-8px 0 32px rgba(99,120,255,0.12)' : 'none',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
              ✨ 润色助手
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              当前：{pname}版本
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
              background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)',
              fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{
          flex: 1, overflowY: 'auto', padding: '16px 16px 8px',
        }}>
          {messages.map((m, i) => <Bubble key={i} role={m.role} text={m.text} />)}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
              <div style={{
                padding: '9px 14px', borderRadius: '12px 12px 12px 2px',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                fontSize: 12, color: 'var(--accent)',
              }}>
                <span style={{ animation: 'pulse 1s infinite' }}>✦ 修改中...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div style={{
          padding: '12px 16px', borderTop: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            {/* Voice button */}
            <button
              onClick={recording ? stop : () => { resetVoice(); start() }}
              style={{
                width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: recording ? 'var(--red)' : 'var(--accent-glow)',
                fontSize: 16, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: recording ? '0 0 0 4px rgba(248,113,113,.25)' : 'none',
                transition: 'all .2s',
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
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage(input)
                }
              }}
              placeholder="告诉 AI 哪里需要调整..."
              rows={2}
              style={{
                flex: 1, resize: 'none', borderRadius: 8, padding: '8px 12px',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: 12, lineHeight: 1.5, outline: 'none',
                transition: 'border-color .15s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />

            {/* Send */}
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              style={{
                height: 36, padding: '0 14px', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
                opacity: (!input.trim() || loading) ? .4 : 1,
                flexShrink: 0,
              }}
            >
              发送
            </button>
          </div>
          {recording && (
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--red)', animation: 'pulse 1s infinite' }}>
              ● 录音中，再次点击停止...
            </div>
          )}
        </div>
      </div>
    </>
  )
}
