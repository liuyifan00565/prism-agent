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

  return (
    <div style={{ animation: 'fadeUp .2s ease' }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '16px',
        marginBottom: 14,
      }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
          你想写什么主题？描述越具体，AI 效果越好
        </div>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleGenerate() }}
          placeholder={'例：我想写一篇关于 AI 产品经理成长路径的文章，面向应届生，偏实用，结合我自己的经历...'}
          rows={5}
          style={{
            width: '100%', resize: 'none', borderRadius: 8,
            padding: '10px 12px',
            background: 'var(--bg-panel)', border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: 13, lineHeight: 1.6,
            outline: 'none', boxSizing: 'border-box',
            transition: 'border-color .15s',
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
        />

        {error && (
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--red)' }}>⚠ {error}</div>
        )}
      </div>

      <button
        onClick={handleGenerate}
        disabled={!prompt.trim() || loading}
        style={{
          width: '100%', padding: '11px 0', borderRadius: 8, border: 'none',
          background: (!prompt.trim() || loading)
            ? 'var(--bg-card)'
            : 'linear-gradient(135deg, var(--accent), var(--accent2))',
          color: (!prompt.trim() || loading) ? 'var(--text-dim)' : '#fff',
          fontWeight: 600, fontSize: 14,
          cursor: (!prompt.trim() || loading) ? 'not-allowed' : 'pointer',
          transition: 'all .2s',
          boxShadow: (!prompt.trim() || loading) ? 'none' : '0 0 20px var(--accent-glow)',
        }}
      >
        {loading ? '✦ 生成中...' : '✨ AI 帮我写'}
      </button>

      <p style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', marginTop: 8 }}>
        生成后可继续手动编辑，或对 AI 说「把结尾改得更有力量感」
      </p>
    </div>
  )
}
