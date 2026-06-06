/**
 * NotificationBell — 通知铃铛组件
 * 显示审核状态通知，包含角标计数和下拉面板
 *
 * Props:
 *   summary: { pending:[], approved:[], rejected:[], timeout:[] }
 *   onOpen: () => void  — 打开时回调（用于标记已读）
 */
import { useState, useEffect, useRef } from 'react'

const PNAMES = {
  wechat: '公众号', zhihu: '知乎', xiaohongshu: '小红书',
  bilibili: 'B站', csdn: 'CSDN', weibo: '微博', douyin: '抖音图文',
}

function fmtTime(iso) {
  if (!iso) return ''
  const d    = new Date(iso)
  const now  = new Date()
  const diff = Math.floor((now - d) / 60000)
  if (diff < 1)    return '刚刚'
  if (diff < 60)   return `${diff}分钟前`
  if (diff < 1440) return `${Math.floor(diff / 60)}小时前`
  return `${Math.floor(diff / 1440)}天前`
}

const STATUS_MAP = {
  approved: { icon: '✓', color: 'var(--green)',  label: '审核通过' },
  rejected: { icon: '✗', color: 'var(--red)',    label: '审核不通过' },
  timeout:  { icon: '—', color: 'var(--text-3)', label: '检查超时' },
  pending:  { icon: '⟳', color: 'var(--orange)', label: '审核中...' },
}

function AuditItem({ task, index }) {
  const isPending = task.status === 'pending'
  const { icon, color, label } = STATUS_MAP[task.status] ?? STATUS_MAP.pending
  const isNew = task.is_new_result

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 14px',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      background: isNew ? 'rgba(123,110,246,0.04)' : 'transparent',
      transition: 'background .15s',
      animation: `fadeUp .2s ease ${index * 40}ms both`,
      position: 'relative',
    }}
    onMouseEnter={e => (e.currentTarget.style.background = isNew ? 'rgba(123,110,246,0.07)' : 'rgba(255,255,255,0.02)')}
    onMouseLeave={e => (e.currentTarget.style.background = isNew ? 'rgba(123,110,246,0.04)' : 'transparent')}
    >
      {/* New indicator */}
      {isNew && (
        <span style={{
          position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)',
          width: 3, height: 20, borderRadius: 2,
          background: 'var(--accent)',
          boxShadow: '0 0 6px var(--accent-glow)',
        }} />
      )}

      {/* Status icon */}
      <span style={{
        fontSize: 12, color, flexShrink: 0, marginTop: 2, fontWeight: 700,
        ...(isPending ? { display: 'inline-block', animation: 'spin 1.2s linear infinite' } : {}),
      }}>
        {icon}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, color: 'var(--text-2)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          <span style={{
            fontSize: 10, color: 'var(--text-3)',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)',
            borderRadius: 4, padding: '1px 5px', marginRight: 6,
            fontFamily: 'var(--font-mono)',
          }}>
            {PNAMES[task.platform] ?? task.platform}
          </span>
          {task.title || '（无标题）'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <span style={{ fontSize: 11, color, fontWeight: 500 }}>{label}</span>
          <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            {fmtTime(task.checked_at || task.created_at)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function NotificationBell({ summary, onOpen }) {
  const [open,    setOpen]    = useState(false)
  const [animate, setAnimate] = useState(false)
  const panelRef = useRef(null)
  const btnRef   = useRef(null)

  const pendingCount  = summary?.pending?.length  ?? 0
  const approvedCount = summary?.approved?.length ?? 0
  const rejectedCount = summary?.rejected?.length ?? 0
  const hasNewResult  = (summary?.approved ?? []).some(t => t.is_new_result)
                     || (summary?.rejected ?? []).some(t => t.is_new_result)

  const badgeCount = pendingCount + approvedCount + rejectedCount

  // Shake bell when there's a new result
  useEffect(() => {
    if (hasNewResult) {
      setAnimate(true)
      const t = setTimeout(() => setAnimate(false), 600)
      return () => clearTimeout(t)
    }
  }, [hasNewResult])

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleOpen() {
    setOpen(v => !v)
    if (!open && onOpen) onOpen()
  }

  const allItems = [
    ...(summary?.rejected ?? []),
    ...(summary?.approved ?? []),
    ...(summary?.pending  ?? []),
    ...(summary?.timeout  ?? []),
  ].sort((a, b) =>
    (b.checked_at || b.created_at || '').localeCompare(a.checked_at || a.created_at || '')
  )

  // Badge color logic
  const badgeColor = hasNewResult
    ? 'var(--red)'
    : pendingCount > 0
    ? 'var(--orange)'
    : 'var(--green)'

  const badgeBg = hasNewResult
    ? 'rgba(248,113,113,0.9)'
    : pendingCount > 0
    ? 'rgba(251,191,36,0.9)'
    : 'rgba(52,211,153,0.9)'

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        ref={btnRef}
        onClick={handleOpen}
        title="审核通知"
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: 'var(--r-md)', cursor: 'pointer',
          background: open ? 'rgba(123,110,246,0.12)' : 'transparent',
          border: open ? '1px solid rgba(123,110,246,0.3)' : '1px solid var(--border)',
          transition: 'all .2s cubic-bezier(0.4,0,0.2,1)',
          flexShrink: 0,
          animation: animate ? 'shake .5s ease' : 'none',
        }}
        onMouseEnter={e => {
          if (!open) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
            e.currentTarget.style.borderColor = 'rgba(148,163,184,0.15)'
          }
        }}
        onMouseLeave={e => {
          if (!open) {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.borderColor = 'var(--border)'
          }
        }}
      >
        <span style={{ fontSize: 15 }}>🔔</span>

        {badgeCount > 0 && (
          <span style={{
            position: 'absolute', top: -5, right: -5,
            minWidth: 16, height: 16, borderRadius: 8,
            background: badgeBg,
            color: '#fff',
            fontSize: 9, fontWeight: 700, lineHeight: '16px',
            textAlign: 'center', padding: '0 4px',
            boxShadow: `0 0 10px ${badgeColor}`,
            animation: hasNewResult ? 'pulseGlow 1.5s ease-in-out infinite' : 'none',
          }}>
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          width: 320, maxHeight: 460,
          background: 'rgba(8,11,18,0.97)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          backdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(123,110,246,0.15)',
          borderRadius: 'var(--r-lg)', overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03) inset',
          zIndex: 300,
          display: 'flex', flexDirection: 'column',
          animation: 'fadeUp .2s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 14px 11px',
            background: 'linear-gradient(to bottom, rgba(123,110,246,0.06), transparent)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>🔔</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                审核通知
              </span>
              {badgeCount > 0 && (
                <span style={{
                  fontSize: 10, padding: '1px 7px', borderRadius: 10,
                  background: 'rgba(123,110,246,0.12)',
                  border: '1px solid rgba(123,110,246,0.2)',
                  color: 'var(--accent)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {badgeCount}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, fontSize: 10 }}>
              {pendingCount  > 0 && (
                <span style={{ color: 'var(--orange)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ display: 'inline-block', animation: 'spin 1.2s linear infinite' }}>⟳</span>
                  {pendingCount}
                </span>
              )}
              {approvedCount > 0 && <span style={{ color: 'var(--green)' }}>✓ {approvedCount}</span>}
              {rejectedCount > 0 && <span style={{ color: 'var(--red)' }}>✗ {rejectedCount}</span>}
            </div>
          </div>

          {/* Items */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {allItems.length === 0 ? (
              <div style={{
                padding: '36px 16px', textAlign: 'center',
                animation: 'fadeUp .3s ease',
              }}>
                <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.3 }}>🔔</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>暂无审核记录</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, opacity: 0.7, lineHeight: 1.5 }}>
                  发布成功后，Prism 会自动追踪各平台审核状态
                </div>
              </div>
            ) : (
              allItems.map((task, i) => (
                <AuditItem key={task.id} task={task} index={i} />
              ))
            )}
          </div>

          {/* Footer */}
          {allItems.length > 0 && (
            <div style={{
              padding: '8px 14px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              fontSize: 10, color: 'var(--text-3)', textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              background: 'rgba(255,255,255,0.01)',
              flexShrink: 0,
            }}>
              每 15 分钟自动检查 · 首次检查约 30 分钟
            </div>
          )}
        </div>
      )}
    </div>
  )
}
