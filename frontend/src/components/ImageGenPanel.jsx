import { useRef, useState } from 'react'

const BASE = '/api'

const PLATFORM_SPEC = {
  xiaohongshu: { label: '小红书 3:4',   ratio: '3:4'    },
  wechat:      { label: '公众号 2.35:1', ratio: '2.35:1' },
  bilibili:    { label: 'B站 16:9',      ratio: '16:9'   },
  zhihu:       { label: '知乎 4:3',      ratio: '4:3'    },
  weibo:       { label: '微博 1:1',      ratio: '1:1'    },
  csdn:        { label: 'CSDN 16:9',     ratio: '16:9'   },
  douyin:      { label: '抖音 9:16',     ratio: '9:16'   },
}

function downloadBase64(b64, filename) {
  const a = document.createElement('a')
  a.href = `data:image/jpeg;base64,${b64}`
  a.download = filename
  a.click()
}

/* ── Image card ──────────────────────────────────────────── */
function ImageCard({ platform, b64, isSelected, onUse }) {
  const [hovered, setHovered] = useState(false)
  const spec = PLATFORM_SPEC[platform] ?? { label: platform, ratio: '' }

  return (
    <div
      style={{
        borderRadius: 'var(--r-md)', overflow: 'hidden',
        border: isSelected ? '1px solid rgba(123,110,246,0.5)' : '1px solid var(--border)',
        background: 'rgba(255,255,255,0.02)',
        boxShadow: isSelected ? '0 0 12px rgba(123,110,246,0.2)' : 'none',
        transition: 'all .25s cubic-bezier(0.4,0,0.2,1)',
        transform: hovered ? 'scale(1.02)' : 'scale(1)',
        position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* image */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <img
          src={`data:image/jpeg;base64,${b64}`}
          alt={spec.label}
          style={{ width: '100%', display: 'block', objectFit: 'cover' }}
        />
        {/* bottom gradient overlay */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
          background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
          pointerEvents: 'none',
        }} />
        {/* platform label overlay */}
        <div style={{
          position: 'absolute', bottom: 6, left: 8,
          fontSize: 10, color: 'rgba(255,255,255,0.85)',
          fontFamily: 'var(--font-mono)',
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
        }}>
          {spec.label}
        </div>
      </div>

      {/* actions */}
      <div style={{
        padding: '8px 10px',
        display: 'flex', justifyContent: 'flex-end', gap: 6, alignItems: 'center',
      }}>
        {onUse && (
          <button
            onClick={() => onUse(platform, b64)}
            style={{
              fontSize: 10, padding: '4px 10px', borderRadius: 'var(--r-sm)',
              background: isSelected ? 'rgba(123,110,246,0.15)' : 'transparent',
              border: isSelected ? '1px solid rgba(123,110,246,0.4)' : '1px solid var(--border)',
              color: isSelected ? 'var(--accent)' : 'var(--text-3)',
              cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'rgba(123,110,246,.35)' }}}
            onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--border)' }}}
          >
            {isSelected ? '✓ 已选' : '✓ 使用'}
          </button>
        )}
        <button
          onClick={() => downloadBase64(b64, `prism_${platform}_cover.jpg`)}
          style={{
            fontSize: 11, padding: '4px 8px', borderRadius: 'var(--r-sm)',
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text-3)', cursor: 'pointer', transition: 'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.3)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          title="下载"
        >↓</button>
      </div>
    </div>
  )
}

/* ── Source button card ──────────────────────────────────── */
function SourceCard({ icon, title, subtitle, onClick, disabled, loading }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '18px 12px', borderRadius: 'var(--r-lg)',
        background: hovered && !disabled ? 'var(--bg-glass-hover)' : 'var(--bg-glass)',
        border: hovered && !disabled ? '1px solid rgba(123,110,246,0.3)' : '1px solid var(--border)',
        cursor: disabled ? (loading ? 'wait' : 'not-allowed') : 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        transition: 'all .25s cubic-bezier(0.4,0,0.2,1)',
        transform: hovered && !disabled ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered && !disabled ? '0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(123,110,246,0.1)' : 'none',
        opacity: disabled && !loading ? 0.45 : 1,
        width: '100%',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: 'rgba(123,110,246,0.1)',
        border: '1px solid rgba(123,110,246,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20,
        transform: hovered && !disabled ? 'scale(1.1)' : 'scale(1)',
        transition: 'transform .25s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {loading
          ? <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin .75s linear infinite' }} />
          : icon}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: disabled && !loading ? 'var(--text-3)' : 'var(--text-1)' }}>
          {loading ? '处理中...' : title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{subtitle}</div>
        )}
      </div>
    </button>
  )
}

/* ══ Main component ════════════════════════════════════════ */
export default function ImageGenPanel({ title, body, platforms, selectedImages = {}, onUse }) {
  const [images,  setImages]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [source,  setSource]  = useState(null)   // 'ai' | 'upload'
  const fileInputRef = useRef(null)

  async function handleGenerate() {
    setLoading(true); setError(''); setImages(null); setSource('ai')
    try {
      const r = await fetch(`${BASE}/imagegen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, platforms }),
      }).then(x => x.json())

      if (r.error) {
        setError(
          r.error.includes('auth') || r.error.includes('key') || r.error.includes('permission')
            ? '需要通义万相权限，请确认 API Key'
            : `生成失败：${r.error}`
        )
      } else {
        setImages(r.images ?? {})
      }
    } catch (e) {
      setError(`网络错误：${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {
      setError('仅支持 JPG / PNG / WebP 格式')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('图片超过 10MB 限制')
      return
    }
    setLoading(true); setError(''); setImages(null); setSource('upload')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('platforms', platforms.join(','))
      const r = await fetch(`${BASE}/imagegen/upload`, { method: 'POST', body: fd }).then(x => x.json())
      if (r.error) {
        setError(`上传失败：${r.error}`)
      } else {
        setImages(Object.fromEntries(Object.entries(r.images ?? {}).filter(([, v]) => v != null)))
      }
    } catch (e) {
      setError(`网络错误：${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const hasContent = !!(title || body)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Card-style source buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <SourceCard
          icon="✨"
          title="AI 生成配图"
          subtitle="通义万相自动绘制"
          onClick={handleGenerate}
          disabled={loading || !hasContent}
          loading={loading && source === 'ai'}
        />
        <SourceCard
          icon="📁"
          title="上传本地图片"
          subtitle="JPG / PNG / WebP · 10MB"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          loading={loading && source === 'upload'}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {error && (
        <div style={{
          fontSize: 12, color: 'var(--orange)',
          background: 'rgba(251,191,36,0.06)',
          border: '1px solid rgba(251,191,36,0.18)',
          borderRadius: 'var(--r-md)', padding: '9px 12px',
        }}>
          ⚠ {error}
        </div>
      )}

      {images && Object.keys(images).length > 0 && (
        <>
          {onUse && (
            <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.4 }}>
              点击「✓ 使用」将图片设为平台封面，发布时自动上传
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 10 }}>
            {Object.entries(images).map(([pid, b64]) => (
              <ImageCard key={pid} platform={pid} b64={b64}
                isSelected={selectedImages[pid] === b64} onUse={onUse} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
