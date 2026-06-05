import { useRef, useState } from 'react'

const BASE = '/api'

const PLATFORM_SPEC = {
  xiaohongshu: { label: '小红书 3:4 竖版',   ratio: '3:4'    },
  wechat:      { label: '公众号 2.35:1 横版', ratio: '2.35:1' },
  bilibili:    { label: 'B站 16:9 横版',      ratio: '16:9'   },
  zhihu:       { label: '知乎 4:3 横版',      ratio: '4:3'    },
  weibo:       { label: '微博 1:1 方形',      ratio: '1:1'    },
  csdn:        { label: 'CSDN 16:9 横版',     ratio: '16:9'   },
  douyin:      { label: '抖音 9:16 竖版',     ratio: '9:16'   },
}

function downloadBase64(b64, filename) {
  const a = document.createElement('a')
  a.href     = `data:image/jpeg;base64,${b64}`
  a.download = filename
  a.click()
}

/* ── Spinner ─────────────────────────────────────────────── */
function Spinner({ size = 16 }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', display: 'inline-block',
      border: `2px solid #c8f55a`, borderTopColor: 'transparent',
      animation: 'spin 0.75s linear infinite', flexShrink: 0,
    }} />
  )
}

/* ── Single image card ───────────────────────────────────── */
function ImageCard({ platform, b64, isSelected, onUse }) {
  const spec = PLATFORM_SPEC[platform] ?? { label: platform, ratio: '' }
  return (
    <div style={{
      background: '#16161a',
      border: `1px solid ${isSelected ? '#c8f55a55' : '#1e1e24'}`,
      borderRadius: 10, overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      <img
        src={`data:image/jpeg;base64,${b64}`}
        alt={spec.label}
        style={{ width: '100%', display: 'block', objectFit: 'cover' }}
      />
      <div style={{
        padding: '10px 12px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 6,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: '#ccc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {spec.label}
          </div>
          {spec.ratio && (
            <div style={{ fontSize: 10, color: '#444', marginTop: 2 }}>{spec.ratio}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {/* 使用按钮 */}
          {onUse && (
            <button
              onClick={() => onUse(platform, b64)}
              style={{
                fontSize: 11, padding: '5px 10px', borderRadius: 6,
                background: isSelected ? 'rgba(200,245,90,0.15)' : 'transparent',
                border: `1px solid ${isSelected ? '#c8f55a88' : '#2a2a30'}`,
                color: isSelected ? '#c8f55a' : '#777',
                cursor: 'pointer', transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.color = '#c8f55a'; e.currentTarget.style.borderColor = '#c8f55a44' }}}
              onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.color = '#777';    e.currentTarget.style.borderColor = '#2a2a30' }}}
            >
              {isSelected ? '✓ 已选' : '✓ 使用'}
            </button>
          )}
          {/* 下载按钮 */}
          <button
            onClick={() => downloadBase64(b64, `prism_${platform}_cover.jpg`)}
            style={{
              fontSize: 11, padding: '5px 10px', borderRadius: 6,
              background: 'transparent', border: '1px solid #2a2a30',
              color: '#888', cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#c8f55a'; e.currentTarget.style.borderColor = '#c8f55a44' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#888';    e.currentTarget.style.borderColor = '#2a2a30' }}
          >
            ↓
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══ Main component ════════════════════════════════════════ */
/**
 * Props:
 *   title, body, platforms  — content & target platforms (for AI gen)
 *   selectedImages          — { platform: b64 } — externally tracked "使用中" images
 *   onUse(platform, b64)    — called when user clicks "✓ 使用"
 */
export default function ImageGenPanel({ title, body, platforms, selectedImages = {}, onUse }) {
  const [images,    setImages]    = useState(null)   // { platform: base64 }
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [source,    setSource]    = useState(null)   // 'ai' | 'upload'
  const fileInputRef = useRef(null)

  /* ── AI generate ──────────────────────────────────────── */
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
            ? '配图生成需要开通通义万相，请在 .env 中确认 API Key 权限'
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

  /* ── Upload local image ───────────────────────────────── */
  function handleUploadClick() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    // reset input so same file can be re-selected
    e.target.value = ''

    // Validate
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
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

      const r = await fetch(`${BASE}/imagegen/upload`, {
        method: 'POST',
        body: fd,
      }).then(x => x.json())

      if (r.error) {
        setError(`上传失败：${r.error}`)
      } else {
        // Filter out null values (failed crops)
        const filtered = Object.fromEntries(
          Object.entries(r.images ?? {}).filter(([, v]) => v != null)
        )
        setImages(filtered)
      }
    } catch (e) {
      setError(`网络错误：${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const hasContent = !!(title || body)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* ── Two source buttons ─────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {/* AI 生成 */}
        <button
          onClick={handleGenerate}
          disabled={loading || !hasContent}
          style={{
            padding: '9px 0', borderRadius: 8, fontSize: 13,
            background: 'transparent',
            border: `1px solid ${loading || !hasContent ? '#222' : '#c8f55a44'}`,
            color:  loading || !hasContent ? '#333' : '#c8f55a',
            cursor: loading ? 'wait' : !hasContent ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 0.15s',
          }}
        >
          {loading && source === 'ai' ? (
            <><Spinner size={13} /> AI 绘图中...</>
          ) : (
            '✨ AI 生成配图'
          )}
        </button>

        {/* 上传本地 */}
        <button
          onClick={handleUploadClick}
          disabled={loading}
          style={{
            padding: '9px 0', borderRadius: 8, fontSize: 13,
            background: 'transparent',
            border: `1px solid ${loading ? '#222' : '#3a3a44'}`,
            color:  loading ? '#333' : '#aaa',
            cursor: loading ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.color = '#ddd'; e.currentTarget.style.borderColor = '#55556a' }}}
          onMouseLeave={e => { if (!loading) { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.borderColor = '#3a3a44' }}}
        >
          {loading && source === 'upload' ? (
            <><Spinner size={13} /> 处理中...</>
          ) : (
            '📁 上传本地图片'
          )}
        </button>
      </div>

      {/* 上传说明 */}
      <div style={{ fontSize: 11, color: '#444', lineHeight: 1.4 }}>
        支持 JPG / PNG / WebP，最大 10MB；上传后自动裁剪为各平台规格
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Error */}
      {error && (
        <div style={{
          fontSize: 12, color: '#ffa94d',
          background: 'rgba(255,169,77,0.07)',
          border: '1px solid rgba(255,169,77,0.2)',
          borderRadius: 8, padding: '9px 12px',
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Image grid */}
      {images && Object.keys(images).length > 0 && (
        <>
          {onUse && (
            <div style={{ fontSize: 11, color: '#555', lineHeight: 1.4 }}>
              点击「✓ 使用」将该图片设为对应平台的封面，发布时 Agent 会自动上传
            </div>
          )}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 10,
          }}>
            {Object.entries(images).map(([pid, b64]) => (
              <ImageCard
                key={pid}
                platform={pid}
                b64={b64}
                isSelected={selectedImages[pid] === b64}
                onUse={onUse}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
