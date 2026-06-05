import { useEffect, useMemo, useRef, useState } from 'react'
import HistoryPage          from './pages/HistoryPage'
import SchedulePage         from './pages/SchedulePage'
import ProfilePage          from './pages/ProfilePage'
import ScheduleModal        from './components/ScheduleModal'
import ContentEditor        from './components/ContentEditor'
import PlatformSelector     from './components/PlatformSelector'
import VoiceInput           from './components/VoiceInput'
import VoiceCreate          from './components/VoiceCreate'
import AIWritePanel         from './components/AIWritePanel'
import ComplianceReport     from './components/ComplianceReport'
import AgentTimeline        from './components/AgentTimeline'
import ResultCard           from './components/ResultCard'
import TemplatePanel        from './components/TemplatePanel'
import ImageGenPanel        from './components/ImageGenPanel'
import LoginCheckModal      from './components/LoginCheckModal'
import PolishDrawer         from './components/PolishDrawer'
import PublishModal         from './components/PublishModal'
import { useAgent }         from './hooks/useAgent'
import { useVoiceCreate }   from './hooks/useVoiceCreate'
import { useAuth }          from './hooks/useAuth'
import { getTask, publishPlatform, updateContent, refineContent } from './api/client'

const ALL_PLATFORMS = ['wechat', 'zhihu', 'xiaohongshu', 'bilibili', 'csdn', 'weibo', 'douyin']
const PNAMES = { wechat: '公众号', zhihu: '知乎', xiaohongshu: '小红书', bilibili: 'B站', csdn: 'CSDN', weibo: '微博', douyin: '抖音图文' }
const PICONS = { wechat: '💬', zhihu: '🔵', xiaohongshu: '📕', bilibili: '📺', csdn: '📝', weibo: '🌐', douyin: '🎵' }

/* ── Auth Modal ────────────────────────────────────────────────────────────── */
function AuthModal({ onClose, auth }) {
  const [tab,      setTab]      = useState('login')
  const [username, setUsername] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      if (tab === 'login') {
        await auth.login(email, password)
      } else {
        await auth.register(username, email, password)
      }
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg-panel)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '32px 32px 28px', width: 400,
        animation: 'modalIn .2s ease',
        boxShadow: '0 24px 80px rgba(0,0,0,.7)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            fontSize: 28,
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            fontWeight: 800, letterSpacing: '-1px',
          }}>◈ Prism</div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', borderRadius: 8, overflow: 'hidden',
          border: '1px solid var(--border)', marginBottom: 24,
        }}>
          {['login','register'].map(t => (
            <button key={t} onClick={() => { setTab(t); setError('') }}
              style={{
                flex: 1, padding: '9px 0', fontSize: 13, border: 'none',
                cursor: 'pointer', transition: 'all .15s',
                background: tab === t ? 'var(--accent-glow)' : 'transparent',
                color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: tab === t ? 600 : 400,
              }}
            >
              {t === 'login' ? '登录' : '注册'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tab === 'register' && (
            <input className="prism-input" placeholder="用户名"
              value={username} onChange={e => setUsername(e.target.value)} required />
          )}
          <input className="prism-input" type="email" placeholder="邮箱"
            value={email} onChange={e => setEmail(e.target.value)} required />
          <input className="prism-input" type="password" placeholder="密码"
            value={password} onChange={e => setPassword(e.target.value)} required />

          {error && (
            <div style={{ fontSize: 12, color: 'var(--red)', padding: '8px 12px',
              background: 'rgba(248,113,113,.08)', borderRadius: 6 }}>
              ⚠ {error}
            </div>
          )}

          <button type="submit" className="btn-primary"
            disabled={loading}
            style={{ padding: '11px 0', fontSize: 14, marginTop: 4 }}
          >
            {loading ? '处理中...' : tab === 'login' ? '登录' : '注册'}
          </button>
        </form>

        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16,
          width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
          background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)',
          fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
      </div>
    </div>
  )
}

/* ── Unbound warning modal ─────────────────────────────────────────────────── */
function UnboundWarning({ platforms, onSkip, onGoProfile, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg-panel)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '28px', width: 420,
        animation: 'modalIn .2s ease',
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>
          ⚠ 部分平台未绑定账号
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          以下平台未绑定，发布时将自动跳过：
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {platforms.map(p => (
            <span key={p} style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12,
              background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.2)',
              color: 'var(--orange)',
            }}>
              {PICONS[p]} {PNAMES[p] ?? p}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onGoProfile} style={{
            flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 13, cursor: 'pointer',
            background: 'var(--accent-glow)', border: '1px solid var(--border-active)',
            color: 'var(--accent)', fontWeight: 500,
          }}>去绑定</button>
          <button onClick={onSkip} style={{
            flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 13, cursor: 'pointer',
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            border: 'none', color: '#fff', fontWeight: 600,
          }}>跳过，继续发布</button>
          <button onClick={onCancel} style={{
            padding: '10px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text-muted)',
          }}>取消</button>
        </div>
      </div>
    </div>
  )
}


/* ── Main App ──────────────────────────────────────────────────────────────── */
export default function App() {
  const [page, setPage]           = useState('home')
  const [inputMode, setInputMode] = useState('manual')   // 'manual' | 'aiwrite' | 'voice'
  const [title, setTitle]         = useState('')
  const [body,  setBody]          = useState('')
  const [platforms, setPlatforms] = useState(ALL_PLATFORMS)
  const [skipBlocked, setSkipBlocked] = useState(false)
  const voiceCreate = useVoiceCreate()

  // UI state
  const [showTemplates,    setShowTemplates]    = useState(false)
  const [showSchedule,     setShowSchedule]     = useState(false)
  const [showAuthModal,    setShowAuthModal]     = useState(false)
  const [showUserMenu,     setShowUserMenu]      = useState(false)
  const [showPublishModal, setShowPublishModal]  = useState(false)
  const [skipAdapt,        setSkipAdapt]         = useState(false)
  const [unboundWarning,   setUnboundWarning]    = useState(null)  // string[]
  const [loginModal,       setLoginModal]        = useState(null)
  const [localEdits,       setLocalEdits]        = useState({})
  const [activeResultTab,  setActiveResultTab]   = useState(null)
  const [polish,           setPolish]            = useState({ open: false, platform: null })
  const [uiLogs,           setUiLogs]            = useState([])
  const [selectedImages,   setSelectedImages]    = useState({})  // { platform: base64 } 用户选中的封面图
  const seenStatusRef = useRef({})

  const auth = useAuth()

  const {
    taskId, taskData, polling,
    submitText, submitVoice, applyFixFor, resumePolling, reset,
  } = useAgent()

  /* ── Derived ──────────────────────────────────────────────────────────────── */
  const isAwaitingConfirm = taskData?.status === 'awaiting_confirm'
  const isDone            = taskData?.status === 'done'
  const hasResults        = !!taskData?.adapted_results && Object.keys(taskData.adapted_results).length > 0
  const platformEntries   = Object.entries(taskData?.adapted_results ?? {})

  const publishablePlatforms = platformEntries
    .filter(([, r]) => ['confirmed', 'failed'].includes(r?.status))
    .map(([pid]) => pid)
  const canPublishFromCards = publishablePlatforms.length > 0

  const livePublishingPlatforms = platformEntries
    .filter(([, r]) => ['logging_in','navigating','filling','publishing','retrying','awaiting_assist'].includes(r?.status))
    .map(([pid]) => pid)
  const isLivePublishing = livePublishingPlatforms.length > 0

  const hasPublishAttempted = platformEntries.some(([, r]) =>
    ['logging_in','navigating','filling','publishing','retrying','awaiting_assist','success','failed'].includes(r?.status))

  const allLogs = useMemo(() => [...(taskData?.execution_log ?? []), ...uiLogs], [taskData?.execution_log, uiLogs])

  // Auto-set active tab when results come in
  useEffect(() => {
    if (hasResults && !activeResultTab) {
      const first = Object.keys(taskData.adapted_results)[0]
      setActiveResultTab(first)
    }
  }, [hasResults, taskData?.adapted_results])

  // Track status changes for UI logs
  useEffect(() => {
    if (!taskData?.adapted_results) return
    for (const [platform, result] of Object.entries(taskData.adapted_results)) {
      const next = result?.status
      const prev = seenStatusRef.current[platform]
      if (!next || next === prev) continue
      const name = PNAMES[platform] ?? platform
      if (next === 'success') appendUiLog(`[${name}] 发布成功 ✓`)
      if (next === 'failed')  appendUiLog(`[${name}] 发布失败: ${result?.error || '未知错误'}`)
      seenStatusRef.current[platform] = next
    }
  }, [taskData])

  // Auto-open publish modal when live publishing starts
  useEffect(() => {
    if (isLivePublishing && !showPublishModal) setShowPublishModal(true)
  }, [isLivePublishing])

  function appendUiLog(line) {
    setUiLogs(prev => prev.includes(line) ? prev : [...prev, line])
  }

  function freshState() {
    setLocalEdits({}); setLoginModal(null); setUiLogs([])
    seenStatusRef.current = {}; voiceCreate.reset()
    setActiveResultTab(null); setShowPublishModal(false)
    setSelectedImages({})
  }

  function handleReset() { freshState(); reset() }

  function handleCardEdit(platform, field, value) {
    setLocalEdits(prev => ({ ...prev, [platform]: { ...(prev[platform] ?? {}), [field]: value } }))
  }

  /* ── Submit (AI adapt) ────────────────────────────────────────────────────── */
  async function handleSubmit() {
    const activeTitle = inputMode === 'voice' ? voiceCreate.generatedTitle : title
    const activeBody  = inputMode === 'voice' ? voiceCreate.generatedBody  : body
    if (!activeTitle && !activeBody) return
    freshState()
    try {
      await submitText(activeTitle, activeBody, platforms)
    } catch (e) {
      window.alert(e?.message || '提交失败，请检查后端是否正常启动')
    }
  }

  async function handleVoice(blob) {
    freshState()
    try { await submitVoice(blob) }
    catch (e) { window.alert(e?.message || '语音提交失败') }
  }

  /* ── Publish flow ─────────────────────────────────────────────────────────── */
  async function handlePublish() {
    if (!taskId || !canPublishFromCards) {
      if (!taskId) window.alert('请先点击「AI 适配 + 检查」')
      return
    }

    // Check for unbound selected platforms
    const unboundSelected = publishablePlatforms.filter(p =>
      auth.user?.platform_bindings && !auth.user.platform_bindings[p]?.bound
    )
    if (unboundSelected.length > 0) {
      setUnboundWarning(unboundSelected)
      return
    }

    await _triggerPublish(publishablePlatforms)
  }

  /* ── Direct publish (skip AI adapt) ────────────────────────────────────── */
  async function handleDirectPublish() {
    const activeTitle = inputMode === 'voice' ? voiceCreate.generatedTitle : title
    const activeBody  = inputMode === 'voice' ? voiceCreate.generatedBody  : body
    if (!activeTitle && !activeBody) { window.alert('请先输入标题和正文'); return }
    if (platforms.length === 0)      { window.alert('请先选择发布平台');   return }

    freshState()

    // Step 1: Create task with skip_adapt=true (backend runs skip_node, very fast)
    let newTaskId
    try {
      newTaskId = await submitText(activeTitle, activeBody, platforms, true)
    } catch(e) {
      window.alert(e?.message || '提交失败，请检查后端是否正常启动')
      return
    }

    setShowPublishModal(true)

    // Step 2: Poll until skip_node has populated adapted_results with "confirmed" status
    await new Promise((resolve) => {
      const deadline = Date.now() + 15000   // max 15 s
      const iv = setInterval(async () => {
        if (Date.now() > deadline) { clearInterval(iv); resolve(); return }
        try {
          const data = await getTask(newTaskId)
          const results = data?.adapted_results ?? {}
          const ready = platforms.length > 0
            && Object.keys(results).length > 0
            && platforms.every(p => ['confirmed','failed','blocked'].includes(results[p]?.status))
          if (ready) { clearInterval(iv); resolve() }
        } catch { clearInterval(iv); resolve() }
      }, 400)
    })

    // Step 3: Publish each platform sequentially using the returned task_id directly
    for (const p of platforms) {
      appendUiLog(`[${PNAMES[p] ?? p}] 启动直接发布...`)
      try {
        await publishPlatform(newTaskId, p)
      } catch(err) {
        if (!err.message?.includes('已有平台')) {
          appendUiLog(`[${PNAMES[p] ?? p}] 启动失败: ${err.message}`)
        }
        continue
      }
      await new Promise(resolve => {
        const iv = setInterval(async () => {
          try {
            const data = await getTask(newTaskId)
            const st = data?.adapted_results?.[p]?.status
            if (['success','failed','blocked'].includes(st)) { clearInterval(iv); resolve() }
          } catch { clearInterval(iv); resolve() }
        }, 1500)
      })
    }

    resumePolling()
  }

  async function _triggerPublish(platformsToPublish) {
    setShowPublishModal(true)

    // Sync any local edits first
    for (const p of platformsToPublish) {
      const edits = localEdits[p]
      if (edits) {
        const cur = taskData?.adapted_results?.[p] ?? {}
        try {
          await updateContent(taskId, p, edits.adapted_title ?? cur.adapted_title ?? '', edits.adapted_body ?? cur.adapted_body ?? '')
        } catch {}
      }
    }

    // Trigger platforms one by one (backend allows only one at a time).
    // We poll between platforms to know when each has finished.
    for (const p of platformsToPublish) {
      appendUiLog(`[${PNAMES[p] ?? p}] 启动发布...`)
      try {
        await publishPlatform(taskId, p)
      } catch (err) {
        // 409 = already publishing (concurrent guard), skip for now
        if (!err.message?.includes('已有平台')) {
          appendUiLog(`[${PNAMES[p] ?? p}] 启动失败: ${err.message}`)
        }
        continue
      }

      // Poll until this platform reaches a terminal state before starting the next
      await new Promise(resolve => {
        const iv = setInterval(async () => {
          try {
            const data = await getTask(taskId)
            const st = data?.adapted_results?.[p]?.status
            if (['success','failed','blocked'].includes(st)) {
              clearInterval(iv)
              resolve()
            }
          } catch {
            clearInterval(iv)
            resolve()
          }
        }, 1500)
      })
    }

    resumePolling()
  }

  async function handleRetryPlatform(platform) {
    if (!taskId) return
    try {
      await publishPlatform(taskId, platform)
      resumePolling()
    } catch (err) {
      window.alert(`重试失败: ${err.message}`)
    }
  }

  /* ── Polish drawer ────────────────────────────────────────────────────────── */
  function handlePolishUpdate(platform, { title: newTitle, body: newBody }) {
    handleCardEdit(platform, 'adapted_title', newTitle)
    handleCardEdit(platform, 'adapted_body', newBody)
    // Sync to backend
    const cur = taskData?.adapted_results?.[platform] ?? {}
    updateContent(taskId, platform, newTitle || cur.adapted_title || '', newBody || cur.adapted_body || '')
      .catch(() => {})
  }

  /* ── AI Write ─────────────────────────────────────────────────────────────── */
  function handleAIGenerated({ title: t, body: b }) {
    setTitle(t); setBody(b)
    setInputMode('manual')
  }

  /* ── Active result for tabs ───────────────────────────────────────────────── */
  const activeResult = taskData?.adapted_results?.[activeResultTab]
  const polishResult = polish.platform
    ? {
        title: localEdits[polish.platform]?.adapted_title ?? taskData?.adapted_results?.[polish.platform]?.adapted_title ?? '',
        body:  localEdits[polish.platform]?.adapted_body  ?? taskData?.adapted_results?.[polish.platform]?.adapted_body  ?? '',
      }
    : { title: '', body: '' }

  /* ── Active title/body for content editor ─────────────────────────────────── */
  const editorTitle = inputMode === 'voice' ? voiceCreate.generatedTitle : title
  const editorBody  = inputMode === 'voice' ? voiceCreate.generatedBody  : body

  /* ────────────────────────────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text)' }}>

      {/* ── Top navbar ──────────────────────────────────────────────────────── */}
      <header style={{
        height: 64, borderBottom: '1px solid var(--border)',
        padding: '0 28px', display: 'flex', alignItems: 'center', gap: 0,
        background: 'var(--bg-panel)',
        position: 'sticky', top: 0, zIndex: 100,
        backdropFilter: 'blur(12px)',
      }}>
        {/* Logo */}
        <div
          onClick={() => setPage('home')}
          style={{
            fontSize: 17, fontWeight: 800, letterSpacing: '-0.5px',
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginRight: 36, cursor: 'pointer', userSelect: 'none',
            display: 'flex', alignItems: 'center', gap: 7,
          }}
        >
          ◈ Prism
        </div>

        {/* Nav tabs */}
        {[
          { key: 'home',    label: '发布'  },
          { key: 'history', label: '历史'  },
          { key: 'schedule',label: '定时'  },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setPage(tab.key)}
            style={{
              padding: '0 18px', height: 64, fontSize: 13, background: 'transparent',
              border: 'none', cursor: 'pointer', transition: 'color .15s',
              color: page === tab.key ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: page === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
              fontWeight: page === tab.key ? 600 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* User area */}
        {auth.isLoggedIn ? (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowUserMenu(m => !m)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                background: showUserMenu ? 'var(--bg-hover)' : 'transparent',
                border: '1px solid var(--border)', transition: 'all .15s',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#fff',
              }}>
                {(auth.user?.username || '?')[0].toUpperCase()}
              </div>
              <span style={{ fontSize: 13, color: 'var(--text)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {auth.user?.username}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>▾</span>
            </button>

            {showUserMenu && (
              <>
                <div onClick={() => setShowUserMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 6,
                  background: 'var(--bg-panel)', border: '1px solid var(--border)',
                  borderRadius: 10, overflow: 'hidden', zIndex: 50,
                  boxShadow: '0 12px 40px rgba(0,0,0,.5)', minWidth: 160,
                }}>
                  {[
                    { label: '我的账户', action: () => { setPage('profile'); setShowUserMenu(false) } },
                    { label: '历史记录', action: () => { setPage('history'); setShowUserMenu(false) } },
                    { label: '退出登录', action: () => { auth.logout(); setShowUserMenu(false) }, danger: true },
                  ].map(item => (
                    <button key={item.label} onClick={item.action} style={{
                      width: '100%', padding: '11px 16px', textAlign: 'left', fontSize: 13,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: item.danger ? 'var(--red)' : 'var(--text)', transition: 'background .1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="btn-primary"
            style={{ padding: '8px 20px', fontSize: 13 }}
          >
            登录
          </button>
        )}
      </header>

      {/* ── Page content ────────────────────────────────────────────────────── */}

      {page === 'history'  && (
        <HistoryPage onReuse={record => {
          setTitle(record.original_title || ''); setBody(record.original_body || '')
          setInputMode('manual'); setPage('home')
        }} />
      )}
      {page === 'schedule' && <SchedulePage />}
      {page === 'profile'  && <ProfilePage auth={auth} />}

      {page === 'home' && (
        <div style={{
          maxWidth: 1440, margin: '0 auto', padding: '24px 24px',
          display: 'flex', gap: 20, alignItems: 'flex-start',
        }}>

          {/* ── LEFT COLUMN: Platform selector ─────────────────────────────── */}
          <div style={{ width: 300, flexShrink: 0, position: 'sticky', top: 88 }}>
            <div style={{
              background: 'var(--bg-panel)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '20px',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 14, letterSpacing: .5 }}>
                目标平台
              </div>
              <PlatformSelector
                selected={platforms}
                onChange={setPlatforms}
                bindings={auth.user?.platform_bindings ?? {}}
                onGoBindings={() => setPage('profile')}
              />
            </div>
          </div>

          {/* ── MIDDLE COLUMN: Content editor ──────────────────────────────── */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              background: 'var(--bg-panel)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '20px', marginBottom: 16,
            }}>
              {/* Input mode tabs */}
              <div style={{
                display: 'flex', borderRadius: 8, overflow: 'hidden',
                border: '1px solid var(--border)', marginBottom: 16,
              }}>
                {[
                  { key: 'manual',  label: '✏️ 手动输入' },
                  { key: 'aiwrite', label: '✨ AI 帮我写' },
                  { key: 'voice',   label: '🎤 语音创作' },
                ].map(tab => (
                  <button key={tab.key} onClick={() => setInputMode(tab.key)} style={{
                    flex: 1, padding: '9px 0', fontSize: 12, border: 'none', cursor: 'pointer',
                    background: inputMode === tab.key ? 'var(--accent-glow)' : 'transparent',
                    color: inputMode === tab.key ? 'var(--accent)' : 'var(--text-muted)',
                    fontWeight: inputMode === tab.key ? 600 : 400, transition: 'all .15s',
                  }}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Manual input */}
              {inputMode === 'manual' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <button onClick={() => setShowTemplates(true)} style={{
                      fontSize: 11, padding: '4px 10px', borderRadius: 6,
                      background: 'transparent', border: '1px solid var(--border)',
                      color: 'var(--text-muted)', cursor: 'pointer',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--border-active)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                    >
                      📋 套用模板
                    </button>
                  </div>
                  <ContentEditor title={title} body={body} onTitleChange={setTitle} onBodyChange={setBody} />
                </>
              )}

              {/* AI write */}
              {inputMode === 'aiwrite' && (
                <AIWritePanel onGenerated={handleAIGenerated} />
              )}

              {/* Voice create */}
              {inputMode === 'voice' && (
                <>
                  <VoiceCreate vc={voiceCreate} />
                </>
              )}

              {/* Conversation refine (shown only in manual mode with content) */}
              {inputMode === 'manual' && (title || body) && (
                <RefineBar
                  title={title} body={body}
                  onUpdate={(t, b) => { setTitle(t); setBody(b) }}
                />
              )}
            </div>

            {/* Skip-adapt toggle */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 10,
                cursor: 'pointer', userSelect: 'none',
              }}>
                {/* Toggle track */}
                <div
                  onClick={() => setSkipAdapt(v => !v)}
                  style={{
                    width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                    background: skipAdapt ? 'var(--accent)' : 'var(--bg-hover)',
                    border: `1px solid ${skipAdapt ? 'var(--border-active)' : 'var(--border)'}`,
                    position: 'relative', transition: 'background .2s, border-color .2s',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 2,
                    left: skipAdapt ? 17 : 2,
                    width: 14, height: 14, borderRadius: '50%',
                    background: skipAdapt ? '#fff' : 'var(--text-dim)',
                    transition: 'left .2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,.3)',
                  }} />
                </div>
                <span style={{ fontSize: 12, color: skipAdapt ? 'var(--text)' : 'var(--text-muted)' }}>
                  跳过 AI 适配，直接发布
                </span>
              </label>
              {skipAdapt && (
                <div style={{ fontSize: 11, color: 'var(--orange)', lineHeight: 1.5, paddingLeft: 46 }}>
                  将使用原始标题和正文发布到所有选中平台，不做格式适配
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              {inputMode === 'manual' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <VoiceInput onAudio={handleVoice} />
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={skipAdapt || polling || (!editorTitle && !editorBody)}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 8, border: 'none',
                  background: (skipAdapt || polling || (!editorTitle && !editorBody))
                    ? 'var(--bg-card)'
                    : 'linear-gradient(135deg, var(--accent), var(--accent2))',
                  color: (skipAdapt || polling || (!editorTitle && !editorBody)) ? 'var(--text-dim)' : '#fff',
                  fontWeight: 600, fontSize: 14, cursor: skipAdapt ? 'not-allowed' : 'pointer',
                  boxShadow: (skipAdapt || polling || (!editorTitle && !editorBody)) ? 'none' : '0 0 20px var(--accent-glow)',
                  transition: 'all .2s',
                  opacity: skipAdapt ? .45 : 1,
                }}
              >
                {polling && !hasResults ? '✦ 分析中...' : '✨ AI 适配 + 检查'}
              </button>

              {/* Normal publish button (only when AI adapt ran) */}
              {!skipAdapt && canPublishFromCards && (
                <button
                  onClick={handlePublish}
                  disabled={isLivePublishing}
                  style={{
                    padding: '11px 24px', borderRadius: 8, border: 'none',
                    background: isLivePublishing
                      ? 'var(--bg-card)'
                      : 'linear-gradient(135deg, #22d3a5, #6378ff)',
                    color: isLivePublishing ? 'var(--text-dim)' : '#fff',
                    fontWeight: 700, fontSize: 14, cursor: isLivePublishing ? 'not-allowed' : 'pointer',
                    transition: 'all .2s', flexShrink: 0,
                  }}
                >
                  {isLivePublishing ? '发布中...' : '↑ 发布'}
                </button>
              )}

              {/* Direct-publish button (only when skip-adapt toggle is ON) */}
              {skipAdapt && (
                <button
                  onClick={handleDirectPublish}
                  disabled={isLivePublishing || (!editorTitle && !editorBody)}
                  style={{
                    padding: '11px 24px', borderRadius: 8, border: 'none', flexShrink: 0,
                    background: (isLivePublishing || (!editorTitle && !editorBody))
                      ? 'var(--bg-card)'
                      : 'linear-gradient(135deg, var(--orange), #f97316)',
                    color: (isLivePublishing || (!editorTitle && !editorBody)) ? 'var(--text-dim)' : '#fff',
                    fontWeight: 700, fontSize: 14,
                    cursor: (isLivePublishing || (!editorTitle && !editorBody)) ? 'not-allowed' : 'pointer',
                    transition: 'all .2s',
                    boxShadow: (isLivePublishing || (!editorTitle && !editorBody))
                      ? 'none' : '0 0 20px rgba(245,158,11,.35)',
                  }}
                >
                  {isLivePublishing ? '发布中...' : '↑ 直接发布'}
                </button>
              )}
            </div>

            {/* Reset button */}
            {isDone && (
              <button onClick={handleReset} style={{
                marginTop: 12, width: '100%', padding: '9px 0', borderRadius: 8,
                background: 'transparent', border: '1px solid var(--border)',
                color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13,
              }}>
                ＋ 新建任务
              </button>
            )}
          </div>

          {/* ── RIGHT COLUMN: Results ─────────────────────────────────────── */}
          <div style={{ width: 380, flexShrink: 0 }}>

            {/* Loading skeleton */}
            {polling && !hasResults && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[120, 100, 100, 120].map((h, i) => (
                  <div key={i} style={{
                    height: h, background: 'var(--bg-card)', borderRadius: 12,
                    border: '1px solid var(--border)',
                    animation: `shimmer 1.6s ease-in-out ${i * .18}s infinite`,
                  }} />
                ))}
              </div>
            )}

            {/* Agent logs (before results) */}
            {allLogs.length > 0 && !hasResults && !polling && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8, letterSpacing: .5 }}>
                  EXECUTION LOG
                </div>
                <AgentTimeline logs={allLogs} />
              </div>
            )}

            {/* Compliance report */}
            {taskData?.compliance_summary && Object.keys(taskData.compliance_summary).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <ComplianceReport
                  summary={taskData.compliance_summary}
                  taskId={taskId}
                  onFixApplied={platform => {
                    setLocalEdits(prev => { const n = {...prev}; delete n[platform]; return n })
                    applyFixFor(platform)
                  }}
                />
              </div>
            )}

            {/* AI image gen / upload */}
            {hasResults && (
              <div style={{ marginBottom: 16 }}>
                <ImageGenPanel
                  title={editorTitle || Object.values(taskData.adapted_results)[0]?.adapted_title || ''}
                  body={editorBody || Object.values(taskData.adapted_results)[0]?.adapted_body || ''}
                  platforms={Object.keys(taskData.adapted_results)}
                  selectedImages={selectedImages}
                  onUse={(platform, b64) =>
                    setSelectedImages(prev => ({ ...prev, [platform]: b64 }))
                  }
                />
              </div>
            )}

            {/* Platform result tabs */}
            {hasResults && (
              <div style={{
                background: 'var(--bg-panel)', border: '1px solid var(--border)',
                borderRadius: 14, overflow: 'hidden',
              }}>
                {/* Tab bar */}
                <div style={{
                  display: 'flex', borderBottom: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                }}>
                  {Object.keys(taskData.adapted_results).map(pid => {
                    const r = taskData.adapted_results[pid]
                    const isActive = pid === activeResultTab
                    const status   = r?.status
                    const dotColor = status === 'success' ? 'var(--green)'
                      : status === 'failed' ? 'var(--red)'
                      : ['logging_in','navigating','filling','publishing','retrying','awaiting_assist'].includes(status) ? 'var(--accent)'
                      : 'var(--text-dim)'
                    return (
                      <button key={pid} onClick={() => setActiveResultTab(pid)} style={{
                        flex: 1, padding: '10px 0', fontSize: 12, border: 'none',
                        borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                        background: isActive ? 'var(--bg-panel)' : 'transparent',
                        color: isActive ? 'var(--text)' : 'var(--text-muted)',
                        cursor: 'pointer', fontWeight: isActive ? 600 : 400,
                        transition: 'all .15s', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: 5,
                      }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: dotColor, display: 'inline-block', flexShrink: 0,
                        }} />
                        {PICONS[pid]} {PNAMES[pid] ?? pid}
                      </button>
                    )
                  })}
                </div>

                {/* Active platform result */}
                {activeResult && (
                  <div style={{ padding: '16px', position: 'relative' }}>
                    {/* Polish button (top-right of body area) */}
                    <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 2 }}>
                      <button
                        onClick={() => setPolish({ open: true, platform: activeResultTab })}
                        style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                          background: 'var(--accent-glow)', border: '1px solid var(--border-active)',
                          color: 'var(--accent)',
                        }}
                      >
                        ✨ 润色
                      </button>
                    </div>

                    <ResultCard
                      platform={activeResultTab}
                      result={{
                        ...activeResult,
                        adapted_title: localEdits[activeResultTab]?.adapted_title ?? activeResult.adapted_title,
                        adapted_body:  localEdits[activeResultTab]?.adapted_body  ?? activeResult.adapted_body,
                      }}
                      onEdit={handleCardEdit}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Success / done summary */}
            {isDone && taskData?.final_summary && (
              <div style={{
                marginTop: 14, padding: '14px 16px',
                background: 'rgba(34,211,165,.07)',
                border: '1px solid rgba(34,211,165,.2)',
                borderRadius: 10, fontSize: 13, color: 'var(--green)',
              }}>
                ✓ {taskData.final_summary}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modals / drawers ─────────────────────────────────────────────────── */}

      {showTemplates && (
        <TemplatePanel
          title={title} body={body}
          onApplied={(t, b) => { setTitle(t); setBody(b) }}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {loginModal && (
        <LoginCheckModal
          platforms={loginModal.platforms}
          sessionStatus={loginModal.sessionStatus}
          activePlatform={loginModal.activePlatform}
          onSelectPlatform={async (platform) => {
            setLoginModal(prev => prev ? { ...prev, activePlatform: platform } : prev)
            try {
              await publishPlatform(taskId, platform)
              setLoginModal(null); resumePolling()
            } catch (err) {
              setLoginModal(prev => prev ? { ...prev, activePlatform: null } : prev)
              window.alert(err?.message || '启动发布失败')
            }
          }}
          onCancel={() => setLoginModal(null)}
        />
      )}

      {showSchedule && (
        <ScheduleModal
          title={editorTitle} body={editorBody} platforms={platforms}
          onClose={() => setShowSchedule(false)}
        />
      )}

      {showAuthModal && (
        <AuthModal auth={auth} onClose={() => setShowAuthModal(false)} />
      )}

      {unboundWarning && (
        <UnboundWarning
          platforms={unboundWarning}
          onGoProfile={() => { setUnboundWarning(null); setPage('profile') }}
          onSkip={async () => {
            setUnboundWarning(null)
            const boundOnly = publishablePlatforms.filter(p =>
              !unboundWarning.includes(p)
            )
            if (boundOnly.length > 0) await _triggerPublish(boundOnly)
            else window.alert('所有已选平台均未绑定，请先去「我的账户」绑定账号')
          }}
          onCancel={() => setUnboundWarning(null)}
        />
      )}

      {/* Publish modal */}
      <PublishModal
        open={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        taskData={taskData}
        taskId={taskId}
        onRetry={handleRetryPlatform}
      />

      {/* Polish drawer */}
      <PolishDrawer
        open={polish.open}
        onClose={() => setPolish({ open: false, platform: null })}
        platform={polish.platform}
        title={polishResult.title}
        body={polishResult.body}
        onUpdate={upd => polish.platform && handlePolishUpdate(polish.platform, upd)}
      />
    </div>
  )
}

/* ── Inline refine bar (conversation modifier in editor) ────────────────────── */
function RefineBar({ title, body, onUpdate }) {
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])   // { user, ai }[]
  const [prevVer, setPrevVer] = useState(null) // for undo

  async function handleSend() {
    if (!input.trim() || loading) return
    setLoading(true)
    const instruction = input.trim()
    setInput('')
    try {
      const data = await refineContent(instruction, title, body, '')
      setPrevVer({ title, body })
      setHistory(prev => [...prev.slice(-2), { user: instruction, ai: data.change_desc || '已修改' }])
      onUpdate(data.title, data.body)
    } catch (e) {
      setHistory(prev => [...prev, { user: instruction, ai: '修改失败，请重试' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
      {/* History */}
      {history.length > 0 && (
        <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {history.map((h, i) => (
            <div key={i} style={{ fontSize: 11, lineHeight: 1.5 }}>
              <span style={{ color: 'var(--text-muted)' }}>你：</span>
              <span style={{ color: 'var(--text)' }}>「{h.user}」</span>
              <br />
              <span style={{ color: 'var(--text-muted)' }}>AI：</span>
              <span style={{ color: 'var(--green)' }}>{h.ai}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
        💬 告诉 AI 哪里需要调整
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
          placeholder="把结尾改得更有力量感，加一个行动号召..."
          className="prism-input"
          style={{ flex: 1, padding: '8px 12px', fontSize: 12 }}
        />
        <button onClick={handleSend} disabled={!input.trim() || loading}
          style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: (!input.trim() || loading) ? 'var(--bg-card)' : 'var(--accent)',
            color: (!input.trim() || loading) ? 'var(--text-dim)' : '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
          }}
        >
          {loading ? '...' : '发送'}
        </button>
        {prevVer && (
          <button onClick={() => { onUpdate(prevVer.title, prevVer.body); setPrevVer(null) }}
            style={{
              padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer',
            }}
            title="撤销上次修改"
          >
            ↩
          </button>
        )}
      </div>
    </div>
  )
}
