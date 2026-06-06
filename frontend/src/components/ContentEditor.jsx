export default function ContentEditor({ title, body, onTitleChange, onBodyChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Title input */}
      <div style={{ position: 'relative' }}>
        <input
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          placeholder="文章标题..."
          style={{
            width: '100%', boxSizing: 'border-box',
            fontSize: 15, fontWeight: 600,
            padding: '11px 14px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            color: 'var(--text-1)',
            outline: 'none',
            transition: 'border-color .2s, box-shadow .2s',
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.01em',
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
        {/* Decorative left accent bar on focus — via border-left trick */}
      </div>

      {/* Body textarea */}
      <textarea
        value={body}
        onChange={e => onBodyChange(e.target.value)}
        placeholder="正文内容..."
        rows={10}
        style={{
          width: '100%', boxSizing: 'border-box',
          resize: 'vertical', lineHeight: 1.75,
          fontFamily: 'var(--font-display)', fontSize: 13,
          padding: '12px 14px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          color: 'var(--text-2)',
          outline: 'none',
          transition: 'border-color .2s, box-shadow .2s',
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
  )
}
