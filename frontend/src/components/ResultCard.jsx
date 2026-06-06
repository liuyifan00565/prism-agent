import { useRef, useState, useEffect } from 'react'

/* ── constants ───────────────────────────────────────────── */
const STATUS_COLOR = {
  pending:         'var(--text-3)',
  checking:        'var(--orange)',
  confirmed:       'var(--accent)',
  logging_in:      'var(--accent)',
  navigating:      'var(--accent)',
  filling:         'var(--accent)',
  publishing:      'var(--orange)',
  awaiting_assist: 'var(--orange)',
  retrying:        'var(--orange)',
  success:         'var(--green)',
  mock_success:    'var(--green)',
  failed:          'var(--red)',
  blocked:         'var(--text-3)',
}
const STATUS_LABEL = {
  pending:         '等待中',
  checking:        '检查中',
  confirmed:       '已确认',
  logging_in:      '登录中',
  navigating:      '打开编辑器',
  filling:         '填写内容',
  publishing:      '发布中',
  awaiting_assist: '⏸ 等待操作',
  retrying:        '↺ 重试中',
  success:         '✓ 发布成功',
  mock_success:    '✓ 模拟成功',
  failed:          '✗ 失败',
  blocked:         '— 合规跳过',
}

const LOCKED = new Set(['logging_in','navigating','filling','publishing','retrying','awaiting_assist','success','mock_success','failed','blocked'])

/* ── component ───────────────────────────────────────────── */
export default function ResultCard({ platform, result, onEdit, mockOverride, polished }) {
  const [modified,  setModified]  = useState(false)
  const titleRef     = useRef(null)
  const bodyRef      = useRef(null)
  const prevTitleRef = useRef(undefined)
  const prevBodyRef  = useRef(undefined)

  useEffect(() => {
    const t = result?.adapted_title ?? ''
    const b = result?.adapted_body  ?? ''
    if (t !== prevTitleRef.current || b !== prevBodyRef.current) {
      prevTitleRef.current = t
      prevBodyRef.current  = b
      if (titleRef.current) titleRef.current.textContent = t
      if (bodyRef.current)  bodyRef.current.textContent  = b
      setModified(false)
    }
  }, [result?.adapted_title, result?.adapted_body])

  if (!result) return null

  const displayStatus = mockOverride ?? result.status
  const canEdit       = !mockOverride && !LOCKED.has(result.status)

  const color      = modified && canEdit ? 'var(--orange)'   : (STATUS_COLOR[displayStatus] ?? 'var(--text-3)')
  const label      = modified && canEdit ? '✏ 已修改'        : (STATUS_LABEL[displayStatus] ?? displayStatus)
  const isSpinning = ['logging_in','navigating','filling','publishing'].includes(displayStatus)
  const isPulsing  = displayStatus === 'retrying'

  // status badge bg/border from color
  const badgeBg    = color === 'var(--orange)' ? 'rgba(251,191,36,0.1)'
    : color === 'var(--green)'  ? 'rgba(52,211,153,0.1)'
    : color === 'var(--red)'    ? 'rgba(248,113,113,0.1)'
    : color === 'var(--accent)' ? 'rgba(123,110,246,0.1)'
    : 'transparent'
  const badgeBorder = color === 'var(--orange)' ? 'rgba(251,191,36,0.3)'
    : color === 'var(--green)'  ? 'rgba(52,211,153,0.3)'
    : color === 'var(--red)'    ? 'rgba(248,113,113,0.3)'
    : color === 'var(--accent)' ? 'rgba(123,110,246,0.3)'
    : 'rgba(148,163,184,0.15)'

  return (
    <div>
      {/* Status badge — lives here so the parent flex-header works */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <span style={{
          fontSize: 11, padding: '3px 10px', borderRadius: 20,
          background: badgeBg,
          border: `1px solid ${badgeBorder}`,
          color, display: 'flex', alignItems: 'center', gap: 5,
        }}>
          {isSpinning && (
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              border: '2px solid currentColor', borderTopColor: 'transparent',
              display: 'inline-block', animation: 'spin .75s linear infinite',
            }} />
          )}
          {isPulsing && (
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'currentColor', display: 'inline-block',
              animation: 'pulse 1s ease-in-out infinite',
            }} />
          )}
          {label}
          {polished && <span style={{ color: 'var(--accent-2)', marginLeft: 2 }}>✨</span>}
        </span>
      </div>

      {/* Editable title — full-width, no overlap */}
      <div style={{
        background: 'rgba(123,110,246,0.04)',
        borderLeft: '3px solid var(--accent)',
        borderRadius: '0 var(--r-sm) var(--r-sm) 0',
        marginBottom: 10, padding: '6px 10px',
      }}>
        <div
          ref={titleRef}
          contentEditable={canEdit}
          suppressContentEditableWarning
          data-ph="标题..."
          onInput={e => { setModified(true); onEdit?.(platform, 'adapted_title', e.currentTarget.textContent) }}
          onFocus={e => {
            if (canEdit) {
              e.currentTarget.parentElement.style.borderColor = 'var(--accent)'
              e.currentTarget.parentElement.style.boxShadow  = '0 0 0 2px var(--accent-glow)'
            }
          }}
          onBlur={e => {
            if (canEdit) {
              e.currentTarget.parentElement.style.borderColor = 'var(--accent)'
              e.currentTarget.parentElement.style.boxShadow  = 'none'
            }
          }}
          style={{
            fontSize: 14, fontWeight: 600, color: 'var(--text-1)',
            minHeight: 20, outline: 'none',
            cursor: canEdit ? 'text' : 'default',
          }}
        />
      </div>

      {/* Editable body */}
      <div
        ref={bodyRef}
        contentEditable={canEdit}
        suppressContentEditableWarning
        data-ph="正文..."
        onInput={e => { setModified(true); onEdit?.(platform, 'adapted_body', e.currentTarget.textContent) }}
        onFocus={e => {
          if (canEdit) {
            e.currentTarget.style.outline     = `1px solid var(--border-active)`
            e.currentTarget.style.boxShadow   = '0 0 0 2px var(--accent-glow)'
            e.currentTarget.style.borderRadius = 'var(--r-sm)'
            e.currentTarget.style.maxHeight    = '240px'
            e.currentTarget.style.overflow     = 'auto'
            e.currentTarget.style.webkitMaskImage = 'none'
            e.currentTarget.style.maskImage       = 'none'
          }
        }}
        onBlur={e => {
          if (canEdit) {
            e.currentTarget.style.outline     = 'none'
            e.currentTarget.style.boxShadow   = 'none'
            e.currentTarget.style.maxHeight   = '100px'
            e.currentTarget.style.overflow    = 'hidden'
            e.currentTarget.style.webkitMaskImage = 'linear-gradient(to bottom,#fff 55%,transparent)'
            e.currentTarget.style.maskImage       = 'linear-gradient(to bottom,#fff 55%,transparent)'
          }
        }}
        style={{
          fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7,
          maxHeight: 100, overflow: 'hidden', padding: '4px 6px',
          borderRadius: 4, outline: 'none',
          WebkitMaskImage: 'linear-gradient(to bottom,#fff 55%,transparent)',
          maskImage: 'linear-gradient(to bottom,#fff 55%,transparent)',
          cursor: canEdit ? 'text' : 'default',
          transition: 'border-color .2s, box-shadow .2s',
        }}
      />

      {/* Tip */}
      {result.tip && !mockOverride && (
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8, fontStyle: 'italic' }}>
          💡 {result.tip}
        </div>
      )}

      {/* Error */}
      {result.error && (
        <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 8, wordBreak: 'break-all',
          background: 'rgba(248,113,113,.06)', borderRadius: 6, padding: '6px 10px',
          border: '1px solid rgba(248,113,113,.15)' }}>
          ⚠ {result.error}
        </div>
      )}
    </div>
  )
}
