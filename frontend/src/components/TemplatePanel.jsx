import { useState, useEffect } from 'react'

const BASE = '/api'
const PNAMES = { wechat: '公众号', zhihu: '知乎', xiaohongshu: '小红书', bilibili: 'B站' }

/* ── Spinner ─────────────────────────────────────────────── */
function Spinner() {
  return (
    <span style={{
      width: 14, height: 14, borderRadius: '50%', display: 'inline-block',
      border: '2px solid #c8f55a', borderTopColor: 'transparent',
      animation: 'spin 0.75s linear infinite', flexShrink: 0,
    }} />
  )
}

/* ── single template card ────────────────────────────────── */
function TemplateCard({ tmpl, onApply, onDelete, applying }) {
  const previewLines = tmpl.structure.split('\n').slice(0, 3).join('\n')
  const pname = PNAMES[tmpl.target_platform] ?? tmpl.target_platform

  return (
    <div style={{
      background: '#16161a', border: '1px solid #1e1e24',
      borderRadius: 10, padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, color: '#ccc', fontWeight: 500 }}>{tmpl.name}</div>
          {pname && (
            <span style={{
              fontSize: 10, color: '#74c0fc', background: 'rgba(116,192,252,0.1)',
              borderRadius: 4, padding: '1px 6px', marginTop: 4, display: 'inline-block',
            }}>
              {pname}
            </span>
          )}
        </div>
        {tmpl.is_builtin && (
          <span style={{ fontSize: 10, color: '#444', padding: '2px 6px',
            border: '1px solid #222', borderRadius: 4 }}>内置</span>
        )}
      </div>

      {/* structure preview */}
      <div style={{
        fontSize: 11, color: '#555', lineHeight: 1.6,
        background: '#0d0d0f', borderRadius: 6, padding: '7px 10px',
        whiteSpace: 'pre-wrap', fontFamily: 'monospace',
      }}>
        {previewLines}
        {tmpl.structure.split('\n').length > 3 && (
          <span style={{ color: '#333' }}>{'\n'}...</span>
        )}
      </div>

      {/* actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onApply(tmpl)}
          disabled={applying}
          style={{
            flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 12,
            background: applying ? '#1a1a1e' : 'rgba(200,245,90,0.08)',
            border: `1px solid ${applying ? '#222' : '#c8f55a33'}`,
            color: applying ? '#444' : '#c8f55a',
            cursor: applying ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          {applying ? <><Spinner /> 套用中...</> : '套用'}
        </button>
        {!tmpl.is_builtin && (
          <button
            onClick={() => onDelete(tmpl.id)}
            style={{
              padding: '6px 12px', borderRadius: 6, fontSize: 12,
              background: 'transparent', border: '1px solid #1e1e24',
              color: '#555', cursor: 'pointer', transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ff6b6b')}
            onMouseLeave={e => (e.currentTarget.style.color = '#555')}
          >
            删除
          </button>
        )}
      </div>
    </div>
  )
}

/* ══ main panel ════════════════════════════════════════════ */
export default function TemplatePanel({ title, body, onApplied, onClose }) {
  const [templates,    setTemplates]    = useState([])
  const [applyingId,   setApplyingId]   = useState(null)
  const [savingName,   setSavingName]   = useState('')
  const [showSaveBox,  setShowSaveBox]  = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [tab,          setTab]          = useState('builtin')  // 'builtin' | 'custom'

  async function load() {
    const r = await fetch(`${BASE}/templates`).then(x => x.json())
    setTemplates(r.templates || [])
  }
  useEffect(() => { load() }, [])

  async function handleApply(tmpl) {
    setApplyingId(tmpl.id)
    try {
      const r = await fetch(`${BASE}/templates/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: tmpl.id, title, body }),
      }).then(x => x.json())
      if (r.title !== undefined) {
        onApplied(r.title, r.body)
        onClose()
      }
    } finally {
      setApplyingId(null)
    }
  }

  async function handleDelete(id) {
    await fetch(`${BASE}/templates/${id}`, { method: 'DELETE' })
    load()
  }

  async function handleSave() {
    if (!savingName.trim()) return
    setSaving(true)
    try {
      await fetch(`${BASE}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: savingName.trim(), structure: body }),
      })
      setSavingName('')
      setShowSaveBox(false)
      setTab('custom')
      load()
    } finally {
      setSaving(false)
    }
  }

  const builtin = templates.filter(t => t.is_builtin)
  const custom  = templates.filter(t => !t.is_builtin)
  const shown   = tab === 'builtin' ? builtin : custom

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
    }}>
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}
      />

      {/* drawer */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: 380, height: '100vh',
        background: '#0d0d0f', borderLeft: '1px solid #1e1e24',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* drawer header */}
        <div style={{
          padding: '16px 18px', borderBottom: '1px solid #1e1e24',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#eee' }}>📋 模板库</span>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: '#555',
            fontSize: 18, cursor: 'pointer', lineHeight: 1,
          }}>✕</button>
        </div>

        {/* tabs */}
        <div style={{
          display: 'flex', borderBottom: '1px solid #1e1e24', padding: '0 18px',
        }}>
          {[
            { key: 'builtin', label: `内置 (${builtin.length})` },
            { key: 'custom',  label: `自定义 (${custom.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '10px 14px', fontSize: 12, background: 'transparent',
              border: 'none', cursor: 'pointer', transition: 'color 0.15s',
              color: tab === t.key ? '#c8f55a' : '#555',
              borderBottom: tab === t.key ? '2px solid #c8f55a' : '2px solid transparent',
              marginBottom: -1,
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* template list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px',
          display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shown.length === 0 && (
            <div style={{ textAlign: 'center', color: '#333', padding: '40px 0', fontSize: 12 }}>
              {tab === 'custom' ? '还没有自定义模板' : '无内置模板'}
            </div>
          )}
          {shown.map(t => (
            <TemplateCard
              key={t.id}
              tmpl={t}
              onApply={handleApply}
              onDelete={handleDelete}
              applying={applyingId === t.id}
            />
          ))}
        </div>

        {/* save current as template */}
        <div style={{ padding: '14px 18px', borderTop: '1px solid #1e1e24' }}>
          {!showSaveBox ? (
            <button
              onClick={() => setShowSaveBox(true)}
              disabled={!body.trim()}
              style={{
                width: '100%', padding: '8px 0', borderRadius: 8, fontSize: 12,
                background: 'transparent',
                border: `1px solid ${body.trim() ? '#2a2a30' : '#1a1a1e'}`,
                color: body.trim() ? '#777' : '#333',
                cursor: body.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              💾 将当前正文保存为模板
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                value={savingName}
                onChange={e => setSavingName(e.target.value)}
                placeholder="模板名称..."
                autoFocus
                style={{
                  background: '#16161a', border: '1px solid #2a2a30', borderRadius: 6,
                  color: '#eee', padding: '8px 10px', fontSize: 12, outline: 'none',
                }}
                onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleSave}
                  disabled={saving || !savingName.trim()}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 6, fontSize: 12,
                    background: '#c8f55a', border: 'none',
                    color: '#0a0a0c', cursor: saving ? 'wait' : 'pointer', fontWeight: 600,
                  }}
                >
                  {saving ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={() => setShowSaveBox(false)}
                  style={{
                    padding: '7px 14px', borderRadius: 6, fontSize: 12,
                    background: 'transparent', border: '1px solid #1e1e24',
                    color: '#555', cursor: 'pointer',
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
