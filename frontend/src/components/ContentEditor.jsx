export default function ContentEditor({ title, body, onTitleChange, onBodyChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input
        value={title}
        onChange={e => onTitleChange(e.target.value)}
        placeholder="文章标题..."
        className="prism-input"
        style={{ fontSize: 15, fontWeight: 500 }}
      />
      <textarea
        value={body}
        onChange={e => onBodyChange(e.target.value)}
        placeholder="正文内容..."
        rows={8}
        className="prism-input"
        style={{
          resize: 'vertical', lineHeight: 1.7,
          fontFamily: 'inherit', fontSize: 14,
        }}
      />
    </div>
  )
}
