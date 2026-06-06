/**
 * AIWritePanel — the "✨ AI 帮我写" input mode.
 * Shows a topic input → calls /api/voice/generate → fills editor.
 *
 * Props:
 *   onGenerated: fn({ title, body })  — called after AI generates content
 */
import { useState } from 'react'

export default function AIWritePanel({ onGenerated }) {
  const [prompt,  setPrompt]  = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleGenerate() {
    if (!prompt.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/voice/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ transcript: prompt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail || '生成失败')
      onGenerated?.({ title: data.title, body: data.body })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = !!(prompt.trim()) && !loading

  return (
    <div style={{ animation: 'fadeUp .2s ease', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Input card */}
      <div className="glass-panel" style={{ padding: 16 }}>
        <div style={{
          fontSize: 11, color: 'var(--text-3)', marginBottom: 10,
          letterSpacing: '0.05em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ animation: 'float 3s ease-in-out infinite', display: 'inline-block' }}>✨</span>
          描述你想写的内容
        </div>

        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleGenerate() }}
          placeholder={'例：我想写一篇关于 AI 产品经理成长路径的文章，面向应届生，偏实用，结合我自己的经历...'}
          rows={5}
          style={{
            width: '100%', resize: 'none', borderRadius: 'var(--r-md)',
            padding: '10px 12px', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
            color: 'var(--text-2)', fontSize: 13, lineHeight: 1.7,
            outline: 'none',
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

        {error && (
          <div style={{
            marginTop: 8, fontSize: 11, color: 'var(--red)',
            display: 'flex', alignItems: 'center', gap: 5,
            animation: 'shake .4s ease',
          }}>
            <span>⚠</span> {error}
          </div>
        )}
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={!canSubmit}
        style={{
          width: '100%', padding: '12px 0', borderRadius: 'var(--r-md)', border: 'none',
          background: canSubmit
            ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
            : 'rgba(255,255,255,0.04)',
          color: canSubmit ? '#fff' : 'var(--text-3)',
          fontWeight: 700, fontSize: 14,
          cursor: canSubmit ? 'pointer' : 'not-allowed',
          transition: 'all .2s',
          boxShadow: canSubmit ? 'var(--shadow-btn)' : 'none',
          fontFamily: 'var(--font-display)',
          letterSpacing: '0.02em',
        }}
        onMouseEnter={e => {
          if (canSubmit) {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 6px 28px rgba(123,110,246,0.55)'
          }
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'none'
          e.currentTarget.style.boxShadow = canSubmit ? 'var(--shadow-btn)' : 'none'
        }}
      >
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{
              width: 14, height: 14, borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
              display: 'inline-block', animation: 'spin .75s linear infinite',
            }} />
            生成中...
          </span>
        ) : '✨ AI 帮我写'}
      </button>

      <p style={{
        fontSize: 11, color: 'var(--text-3)', textAlign: 'center', margin: 0,
        lineHeight: 1.5,
      }}>
        生成后可继续手动编辑，或对 AI 说「把结尾改得更有力量感」
      </p>
    </div>
  )
}
