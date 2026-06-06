import { useState, useEffect } from 'react'

const BASE = '/api'
const PNAMES = { wechat: '公众号', zhihu: '知乎', xiaohongshu: '小红书', bilibili: 'B站' }

const PLATFORM_COLORS = {
  wechat: '#07C160', zhihu: '#0066FF', xiaohongshu: '#FF2442',
  bilibili: '#00AEEC', csdn: '#FC5531', weibo: '#E6162D', douyin: '#FE2C55',
}

/* ── Spinner ─────────────────────────────────────────────── */
function Spinner() {
  return (
    <span style={{
      width: 13, height: 13, borderRadius: '50%', display: 'inline-block',
      border: '2px solid rgba(123,110,246,0.3)', borderTopColor: 'var(--accent)',
      animation: 'spin 0.75s linear infinite', flexShrink: 0,
    }} />
  )
}

/* ── TemplateCard ────────────────────────────────────────── */
function TemplateCard({ tmpl, onApply, onDelete, applying, index }) {
  const previewLines = tmpl.structure.split('\n').slice(0, 3).join('\n')
  const pname  = PNAMES[tmpl.target_platform] ?? tmpl.target_platform
  const pcolor = PLATFORM_COLORS[tmpl.target_platform] ?? 'var(--accent)'

  return (
    <div className="glass-panel" style={{
      padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 9,
      animation: `fadeUp .25s ease ${index * 50}ms both`,
      transition: 'border-color .2s, transform .2s cubic-bezier(0.34,1.56,0.64,1)',
    }}
    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(123,110,246,0.2)')}
    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 600 }}>{tmpl.name}</div>
          {pname && (
            <span style={{
              fontSize: 10, color: pcolor,
              background: `${pcolor}18`,
              border: `1px solid ${pcolor}30`,
              borderRadius: 4, padding: '1px 6px', marginTop: 4, display: 'inline-block',
            }}>
              {pname}
            </span>
          )}
        </div>
        {tmpl.is_builtin && (
          <span style={{
            fontSize: 9, color: 'var(--text-3)',
            padding: '2px 7px', border: '1px solid var(--border)',
            borderRadius: 4, letterSpacing: '0.05em',
          }}>
            内置
          </span>
        )}
      </div>

      {/* structure preview */}
      <div style={{
        fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6,
        background: 'rgba(0,0,0,0.2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-sm)', padding: '7px 10px',
        whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)',
      }}>
        {previewLines}
        {tmpl.structure.split('\n').length > 3 && (
          <span style={{ color: 'var(--text-3)', opacity: 0.5 }}>{'\n'}...</span>
        )}
      </div>

      {/* actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onApply(tmpl)}
          disabled={applying}
          style={{
            flex: 1, padding: '6px 0', borderRadius: 'var(--r-sm)', fontSize: 12,
            background: applying ? 'rgba(255,255,255,0.02)' : 'rgba(123,110,246,0.1)',
            border: `1px solid ${applying ? 'var(--border)' : 'rgba(123,110,246,0.3)'}`,
            color: applying ? 'var(--text-3)' : 'var(--accent)',
            cursor: applying ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all .15s',
          }}
          onMouseEnter={e => {
            if (!applying) e.currentTarget.style.background = 'rgba(123,110,246,0.18)'
          }}
          onMouseLeave={e => {
            if (!applying) e.currentTarget.style.background = 'rgba(123,110,246,0.1)'
          }}
        >
          {applying ? <><Spinner /> 套用中...</> : '✓ 套用'}
        </button>
        {!tmpl.is_builtin && (
          <button
            onClick={() => onDelete(tmpl.id)}
            style={{
              padding: '6px 12px', borderRadius: 'var(--r-sm)', fontSize: 12,
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-3)', cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--red)'
              e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)'
              e.currentTarget.style.background  = 'rgba(248,113,113,0.05)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-3)'
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.background  = 'transparent'
            }}
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
  const [templates,   setTemplates]   = useState([])
  const [applyingId,  setApplyingId]  = useState(null)
  const [savingName,  setSavingName]  = useState('')
  const [showSaveBox, setShowSaveBox] = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [tab,         setTab]         = useState('builtin')

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

  const builtin = templates.filter(t =>  t.is_builtin)
  const custom  = templates.filter(t => !t.is_builtin)
  const shown   = tab === 'builtin' ? builtin : custom

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          WebkitBackdropFilter: 'blur(4px)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: 380, height: '100vh',
        background: 'rgba(8,11,18,0.97)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        backdropFilter: 'blur(20px) saturate(180%)',
        borderLeft: '1px solid rgba(123,110,246,0.15)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
        animation: 'slideInRight .35s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Drawer header */}
        <div style={{
          padding: '16px 18px',
          background: 'linear-gradient(to bottom, rgba(123,110,246,0.06), transparent)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>📋</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>模板库</span>
            <span style={{
              fontSize: 10, color: 'var(--text-3)',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)',
              borderRadius: 4, padding: '1px 6px',
              fontFamily: 'var(--font-mono)',
            }}>
              {templates.length}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 'var(--r-sm)',
              border: '1px solid var(--border)',
              background: 'transparent', cursor: 'pointer',
              color: 'var(--text-3)', fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .15s',
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

        {/* Tabs */}
        <div style={{
          display: 'flex', padding: '0 18px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          {[
            { key: 'builtin', label: `内置`, count: builtin.length },
            { key: 'custom',  label: `自定义`, count: custom.length },
          ].map(t => {
            const isActive = tab === t.key
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '10px 14px', fontSize: 12,
                background: 'transparent', border: 'none',
                cursor: 'pointer', transition: 'color 0.2s',
                color: isActive ? 'var(--accent)' : 'var(--text-3)',
                position: 'relative',
              }}>
                {t.label}
                <span style={{
                  marginLeft: 5, fontSize: 10,
                  color: isActive ? 'var(--accent)' : 'var(--text-3)',
                  opacity: 0.7,
                }}>
                  {t.count}
                </span>
                {/* Underline indicator */}
                <span style={{
                  position: 'absolute', bottom: 0, left: '50%',
                  transform: 'translateX(-50%)',
                  height: 2, width: isActive ? '70%' : '0%',
                  background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
                  borderRadius: 1,
                  transition: 'width .25s cubic-bezier(0.34,1.56,0.64,1)',
                }} />
              </button>
            )
          })}
        </div>

        {/* Template list */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '14px 18px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {shown.length === 0 ? (
            <div style={{
              textAlign: 'center', color: 'var(--text-3)',
              padding: '40px 0', fontSize: 12,
              animation: 'fadeUp .3s ease',
            }}>
              <div style={{ fontSize: 28, opacity: 0.2, marginBottom: 10 }}>📋</div>
              {tab === 'custom' ? '还没有自定义模板' : '无内置模板'}
            </div>
          ) : (
            shown.map((t, i) => (
              <TemplateCard
                key={t.id}
                tmpl={t}
                index={i}
                onApply={handleApply}
                onDelete={handleDelete}
                applying={applyingId === t.id}
              />
            ))
          )}
        </div>

        {/* Save current as template */}
        <div style={{
          padding: '14px 18px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          {!showSaveBox ? (
            <button
              onClick={() => setShowSaveBox(true)}
              disabled={!body.trim()}
              style={{
                width: '100%', padding: '9px 0', borderRadius: 'var(--r-md)', fontSize: 12,
                background: 'transparent',
                border: `1px solid ${body.trim() ? 'var(--border)' : 'rgba(255,255,255,0.04)'}`,
                color: body.trim() ? 'var(--text-3)' : 'var(--text-3)',
                cursor: body.trim() ? 'pointer' : 'not-allowed',
                opacity: body.trim() ? 1 : 0.4,
                transition: 'all .15s',
              }}
              onMouseEnter={e => {
                if (body.trim()) {
                  e.currentTarget.style.borderColor = 'rgba(123,110,246,0.3)'
                  e.currentTarget.style.color = 'var(--accent)'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--text-3)'
              }}
            >
              💾 将当前正文保存为模板
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, animation: 'fadeUp .2s ease' }}>
              <input
                value={savingName}
                onChange={e => setSavingName(e.target.value)}
                placeholder="模板名称..."
                autoFocus
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-sm)',
                  color: 'var(--text-1)', padding: '8px 10px',
                  fontSize: 12, outline: 'none',
                  transition: 'border-color .2s',
                  fontFamily: 'var(--font-display)',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e  => (e.currentTarget.style.borderColor = 'var(--border)')}
                onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleSave}
                  disabled={saving || !savingName.trim()}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 'var(--r-sm)', fontSize: 12,
                    background: (saving || !savingName.trim())
                      ? 'rgba(255,255,255,0.04)'
                      : 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                    border: 'none',
                    color: (saving || !savingName.trim()) ? 'var(--text-3)' : '#fff',
                    cursor: saving ? 'wait' : 'pointer', fontWeight: 600,
                    transition: 'all .2s',
                  }}
                >
                  {saving ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={() => setShowSaveBox(false)}
                  style={{
                    padding: '8px 14px', borderRadius: 'var(--r-sm)', fontSize: 12,
                    background: 'transparent', border: '1px solid var(--border)',
                    color: 'var(--text-3)', cursor: 'pointer', transition: 'all .15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-2)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
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
