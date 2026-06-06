import { useEffect, useMemo, useRef, useState } from 'react'
import ParticleBackground   from './components/ParticleBackground'
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
import NotificationBell    from './components/NotificationBell'
import { useAgent }         from './hooks/useAgent'
import { useVoiceCreate }   from './hooks/useVoiceCreate'
import { useAuth }          from './hooks/useAuth'
import { getTask, publishPlatform, updateContent, refineContent, uploadVideo } from './api/client'

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
      background: 'rgba(0,0,0,.75)',
      WebkitBackdropFilter: 'blur(12px)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn .2s ease',
    }}>
      <div style={{
        background: 'rgba(8,11,18,0.97)',
        border: '1px solid rgba(123,110,246,0.2)',
        borderRadius: 'var(--r-xl)', padding: '36px 32px 28px', width: 400,
        animation: 'modalIn .3s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: '0 25px 80px rgba(0,0,0,.8), 0 0 60px rgba(123,110,246,0.08), 0 0 0 1px rgba(255,255,255,0.04) inset',
        position: 'relative',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 26, marginBottom: 4, animation: 'float 3s ease-in-out infinite' }}>
            <span style={{
              background: 'linear-gradient(135deg, #7B6EF6, #60A5FA)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>◆</span>
          </div>
          <div style={{
            fontSize: 20, fontWeight: 800,
            background: 'linear-gradient(90deg, #7B6EF6, #A78BFA, #60A5FA)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px',
          }}>Prism</div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', borderRadius: 'var(--r-md)', overflow: 'hidden',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border)', marginBottom: 24,
        }}>
          {['login','register'].map(t => (
            <button key={t} onClick={() => { setTab(t); setError('') }}
              style={{
                flex: 1, padding: '9px 0', fontSize: 13, border: 'none',
                cursor: 'pointer', transition: 'all .2s',
                background: tab === t
                  ? 'linear-gradient(135deg, rgba(123,110,246,0.2), rgba(96,165,250,0.1))'
                  : 'transparent',
                color: tab === t ? 'var(--text-1)' : 'var(--text-3)',
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
              background: 'rgba(248,113,113,.08)', borderRadius: 6, animation: 'shake .4s ease' }}>
              ⚠ {error}
            </div>
          )}

          <button type="submit" className="btn-primary"
            disabled={loading}
            style={{ padding: '12px 0', fontSize: 14, marginTop: 4, borderRadius: 'var(--r-md)' }}
          >
            {loading ? '处理中...' : tab === 'login' ? '登录' : '注册'}
          </button>
        </form>

        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16,
          width: 28, height: 28, borderRadius: 'var(--r-sm)',
          border: '1px solid var(--border)',
          background: 'transparent', cursor: 'pointer', color: 'var(--text-3)',
          fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; e.currentTarget.style.color = 'var(--red)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)' }}
        >×</button>
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
  const [auditSummary,     setAuditSummary]      = useState(null)    // { pending, approved, rejected, timeout }
  const [contentType,      setContentType]       = useState('text')  // 'text' | 'video'
  const [videoFile,        setVideoFile]         = useState(null)    // File 对象
  const [videoMeta,        setVideoMeta]         = useState(null)    // { name, sizeMB, duration }
  const [videoPath,        setVideoPath]         = useState(null)    // 后端返回的服务端路径
  const [videoUploading,   setVideoUploading]    = useState(false)
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

  // 轮询审核状态（首次加载 + 每 5 分钟）
  useEffect(() => {
    async function fetchAudit() {
      try {
        const r = await fetch('/api/audit/summary').then(x => x.json())
        if (!r?.error) setAuditSummary(r)
      } catch { /* 后端未启动时静默失败 */ }
    }
    fetchAudit()
    const iv = setInterval(fetchAudit, 5 * 60 * 1000)
    return () => clearInterval(iv)
  }, [])

  function appendUiLog(line) {
    setUiLogs(prev => prev.includes(line) ? prev : [...prev, line])
  }

  function freshState() {
    setLocalEdits({}); setLoginModal(null); setUiLogs([])
    seenStatusRef.current = {}; voiceCreate.reset()
    setActiveResultTab(null); setShowPublishModal(false)
    setSelectedImages({})
    setVideoFile(null); setVideoMeta(null); setVideoPath(null)
  }

  function handleReset() { freshState(); reset() }

  /* ── Video helpers ──────────────────────────────────────────────────────── */
  async function handleVideoFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    // Read duration via hidden video element
    const url = URL.createObjectURL(file)
    const duration = await new Promise(resolve => {
      const v = document.createElement('video')
      v.preload = 'metadata'
      v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(v.duration) }
      v.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
      v.src = url
    })

    setVideoFile(file)
    setVideoPath(null)   // 清除旧路径，等待新上传
    setVideoMeta({
      name: file.name,
      sizeMB: (file.size / 1024 / 1024).toFixed(1),
      duration: duration ? formatDuration(duration) : null,
    })
  }

  function formatDuration(secs) {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  async function ensureVideoUploaded() {
    if (!videoFile) return null
    if (videoPath) return videoPath   // already uploaded
    setVideoUploading(true)
    try {
      const res = await uploadVideo(videoFile)
      if (res?.error) throw new Error(res.error)
      setVideoPath(res.video_path)
      return res.video_path
    } finally {
      setVideoUploading(false)
    }
  }

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
      let vpath = null, vname = null
      if (contentType === 'video' && videoFile) {
        vpath = await ensureVideoUploaded()
        vname = videoFile.name
      }
      await submitText(activeTitle, activeBody, platforms, false, vpath, vname)
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

    // Step 1: Upload video if needed
    let vpath = null, vname = null
    if (contentType === 'video' && videoFile) {
      try {
        vpath = await ensureVideoUploaded()
        vname = videoFile.name
      } catch(e) {
        window.alert(e?.message || '视频上传失败'); return
      }
    }

    // Step 2: Create task with skip_adapt=true (backend runs skip_node, very fast)
    let newTaskId
    try {
      newTaskId = await submitText(activeTitle, activeBody, platforms, true, vpath, vname)
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
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', color: 'var(--text-1)', position: 'relative' }}>
      <ParticleBackground />

      {/* ── Top navbar ──────────────────────────────────────────────────────── */}
      <header style={{
        height: 56, borderBottom: '1px solid rgba(123,110,246,0.12)',
        padding: '0 28px', display: 'flex', alignItems: 'center', gap: 0,
        background: 'rgba(5,6,10,0.82)',
        position: 'sticky', top: 0, zIndex: 100,
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        backdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: '0 1px 0 rgba(123,110,246,0.08)',
      }}>
        {/* Logo */}
        <div
          onClick={() => setPage('home')}
          style={{
            marginRight: 36, cursor: 'pointer', userSelect: 'none',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <span style={{
            fontSize: 18,
            background: 'linear-gradient(135deg, #7B6EF6, #60A5FA)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            animation: 'float 3s ease-in-out infinite',
            display: 'inline-block',
          }}>◆</span>
          <span style={{
            fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px',
            background: 'linear-gradient(90deg, #7B6EF6, #A78BFA, #60A5FA)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Prism</span>
        </div>

        {/* Nav tabs */}
        {[
          { key: 'home',     label: '发布' },
          { key: 'history',  label: '历史' },
          { key: 'schedule', label: '定时' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setPage(tab.key)}
            style={{
              padding: '0 18px', height: 56, fontSize: 13, background: 'transparent',
              border: 'none', cursor: 'pointer', position: 'relative',
              color: page === tab.key ? 'var(--accent)' : 'var(--text-muted)',
              fontWeight: page === tab.key ? 600 : 400,
              transition: 'color .2s',
            }}
            onMouseEnter={e => { if (page !== tab.key) e.currentTarget.style.color = 'var(--text-1)' }}
            onMouseLeave={e => { if (page !== tab.key) e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            {tab.label}
            {/* animated underline indicator */}
            <span style={{
              position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
              height: 2, width: page === tab.key ? '60%' : '0%',
              background: 'linear-gradient(90deg, #7B6EF6, #60A5FA)',
              borderRadius: '2px 2px 0 0',
              transition: 'width .25s cubic-bezier(0.4, 0, 0.2, 1)',
            }} />
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* Notification bell */}
        <div style={{ marginRight: 8 }}>
          <NotificationBell
            summary={auditSummary}
            onOpen={async () => {
              try { await fetch('/api/audit/mark-seen', { method: 'POST' }) } catch {}
              // 重新拉取以更新角标
              try {
                const r = await fetch('/api/audit/summary').then(x => x.json())
                if (!r?.error) setAuditSummary(r)
              } catch {}
            }}
          />
        </div>

        {/* User area */}
        {auth.isLoggedIn ? (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowUserMenu(m => !m)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 12px 5px 5px', borderRadius: 20, cursor: 'pointer',
                background: showUserMenu ? 'rgba(123,110,246,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${showUserMenu ? 'rgba(123,110,246,0.35)' : 'rgba(255,255,255,0.08)'}`,
                transition: 'all .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(123,110,246,0.1)'; e.currentTarget.style.borderColor = 'rgba(123,110,246,0.3)' }}
              onMouseLeave={e => { if (!showUserMenu) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' } }}
            >
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'linear-gradient(135deg, #7B6EF6, #60A5FA)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff',
                boxShadow: '0 0 10px rgba(123,110,246,0.4)',
              }}>
                {(auth.user?.username || '?')[0].toUpperCase()}
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-1)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {auth.user?.username}
              </span>
              <span style={{ color: 'var(--text-3)', fontSize: 9 }}>▾</span>
            </button>

            {showUserMenu && (
              <>
                <div onClick={() => setShowUserMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 8,
                  background: 'rgba(8,11,18,0.96)',
                  WebkitBackdropFilter: 'blur(20px)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(123,110,246,0.15)',
                  borderRadius: 12, overflow: 'hidden', zIndex: 50,
                  boxShadow: '0 16px 48px rgba(0,0,0,.65)', minWidth: 168,
                }}>
                  {[
                    { label: '我的账户', action: () => { setPage('profile'); setShowUserMenu(false) } },
                    { label: '历史记录', action: () => { setPage('history'); setShowUserMenu(false) } },
                    { label: '退出登录', action: () => { auth.logout(); setShowUserMenu(false) }, danger: true },
                  ].map(item => (
                    <button key={item.label} onClick={item.action} style={{
                      width: '100%', padding: '11px 16px', textAlign: 'left', fontSize: 13,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: item.danger ? 'var(--red)' : 'var(--text-1)', transition: 'background .15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(123,110,246,0.08)'}
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
            style={{
              padding: '7px 20px', fontSize: 13, borderRadius: 20,
              background: 'rgba(123,110,246,0.12)', fontWeight: 600,
              border: '1px solid rgba(123,110,246,0.4)', color: 'var(--accent)',
              cursor: 'pointer', transition: 'all .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(123,110,246,0.2)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(123,110,246,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(123,110,246,0.12)'; e.currentTarget.style.boxShadow = 'none' }}
          >
            登录
          </button>
        )}
      </header>

      {/* ── Page content ────────────────────────────────────────────────────── */}

      {page === 'history' && (
        <div style={{ position: 'relative', zIndex: 1 }}>
        <HistoryPage onReuse={record => {
          setTitle(record.original_title || ''); setBody(record.original_body || '')
          setInputMode('manual'); setPage('home')
        }} />
        </div>
      )}
      {page === 'schedule' && <div style={{ position: 'relative', zIndex: 1 }}><SchedulePage /></div>}
      {page === 'profile'  && <div style={{ position: 'relative', zIndex: 1 }}><ProfilePage auth={auth} /></div>}

      {page === 'home' && (
        <div style={{
          maxWidth: 1440, margin: '0 auto', padding: '24px 24px',
          display: 'flex', gap: 20, alignItems: 'flex-start',
          position: 'relative', zIndex: 1,
        }}>

          {/* ── LEFT COLUMN: Platform selector ─────────────────────────────── */}
          <div style={{ width: 300, flexShrink: 0, position: 'sticky', top: 80 }}>
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{
                fontSize: 10, fontWeight: 600, color: 'var(--text-3)',
                marginBottom: 16, letterSpacing: '0.12em', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ width: 2, height: 14, background: 'var(--accent)', borderRadius: 1, display: 'inline-block' }} />
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
            <div className="glass-panel" style={{ padding: '20px', marginBottom: 16 }}>
              {/* Input mode tabs */}
              <div style={{
                display: 'flex', borderRadius: 10, overflow: 'hidden',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border)', marginBottom: 16, position: 'relative',
              }}>
                {[
                  { key: 'manual',  label: '✏️ 手动输入' },
                  { key: 'aiwrite', label: '✨ AI 帮我写' },
                  { key: 'voice',   label: '🎤 语音创作' },
                ].map(tab => (
                  <button key={tab.key} onClick={() => setInputMode(tab.key)} style={{
                    flex: 1, padding: '10px 0', fontSize: 12, border: 'none', cursor: 'pointer',
                    background: inputMode === tab.key
                      ? 'linear-gradient(135deg, rgba(123,110,246,0.18), rgba(96,165,250,0.08))'
                      : 'transparent',
                    borderRight: '1px solid var(--border)',
                    color: inputMode === tab.key ? 'var(--text-1)' : 'var(--text-3)',
                    fontWeight: inputMode === tab.key ? 600 : 400,
                    transition: 'all .2s',
                    position: 'relative',
                  }}>
                    {tab.label}
                    {inputMode === tab.key && (
                      <span style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
                        background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
                      }} />
                    )}
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

            {/* ── Content type selector + video upload ──────────── */}
            <div className="glass-panel" style={{
              padding: '14px 16px', marginBottom: 0,
              display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              {/* Radio toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>内容类型</span>
                {[
                  { key: 'text',  label: '📄 图文' },
                  { key: 'video', label: '🎬 图文+视频' },
                ].map(opt => (
                  <label key={opt.key} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    cursor: 'pointer', userSelect: 'none', fontSize: 13,
                    color: contentType === opt.key ? 'var(--text)' : 'var(--text-muted)',
                  }}>
                    <span style={{
                      width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${contentType === opt.key ? 'var(--accent)' : 'var(--border-active)'}`,
                      background: contentType === opt.key ? 'var(--accent)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all .15s',
                    }}
                      onClick={() => setContentType(opt.key)}
                    >
                      {contentType === opt.key && (
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />
                      )}
                    </span>
                    <span onClick={() => setContentType(opt.key)}>{opt.label}</span>
                  </label>
                ))}
              </div>

              {/* Video upload area */}
              {contentType === 'video' && (() => {
                const videoFileInputRef_id = 'prism-video-file-input'
                return (
                  <div style={{
                    border: '1px dashed var(--border-active)', borderRadius: 10,
                    padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
                  }}>
                    {!videoMeta ? (
                      /* Empty state */
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 28, marginBottom: 6 }}>🎬</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                          拖拽视频文件到这里，或点击选择
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10 }}>
                          支持 MP4 / MOV，最大 500MB
                        </div>
                        <button
                          onClick={() => document.getElementById(videoFileInputRef_id)?.click()}
                          style={{
                            padding: '7px 18px', borderRadius: 7, fontSize: 12,
                            background: 'transparent',
                            border: '1px solid var(--border-active)',
                            color: 'var(--text-muted)', cursor: 'pointer',
                          }}
                        >
                          选择视频文件
                        </button>
                      </div>
                    ) : (
                      /* File selected */
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 22 }}>🎬</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {videoMeta.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                            {videoMeta.sizeMB} MB
                            {videoMeta.duration && ` · ${videoMeta.duration}`}
                            {videoPath && <span style={{ color: 'var(--green)', marginLeft: 8 }}>✓ 已上传</span>}
                            {videoUploading && <span style={{ color: 'var(--orange)', marginLeft: 8 }}>⟳ 上传中...</span>}
                          </div>
                          {/* Platform video limits hint */}
                          <div style={{ fontSize: 10, color: '#444', marginTop: 3, lineHeight: 1.5 }}>
                            B站：无限制 · 抖音：15秒-15分钟 · 微博：≤60分钟 · 小红书：≤15分钟
                          </div>
                        </div>
                        <button
                          onClick={() => { setVideoFile(null); setVideoMeta(null); setVideoPath(null) }}
                          style={{
                            padding: '4px 10px', borderRadius: 6, fontSize: 11,
                            background: 'transparent', border: '1px solid var(--border)',
                            color: 'var(--text-dim)', cursor: 'pointer', flexShrink: 0,
                          }}
                        >
                          删除
                        </button>
                      </div>
                    )}
                    <input
                      id={videoFileInputRef_id}
                      type="file"
                      accept="video/mp4,video/quicktime,.mp4,.mov"
                      style={{ display: 'none' }}
                      onChange={handleVideoFileChange}
                    />
                  </div>
                )
              })()}
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
                  flex: 1, padding: '12px 0', borderRadius: 10, border: 'none',
                  background: (skipAdapt || polling || (!editorTitle && !editorBody))
                    ? 'rgba(255,255,255,0.04)'
                    : 'linear-gradient(135deg, #7B6EF6, #A78BFA)',
                  color: (skipAdapt || polling || (!editorTitle && !editorBody)) ? 'var(--text-3)' : '#fff',
                  fontWeight: 600, fontSize: 14,
                  cursor: (skipAdapt || polling || (!editorTitle && !editorBody)) ? 'not-allowed' : 'pointer',
                  boxShadow: (skipAdapt || polling || (!editorTitle && !editorBody))
                    ? 'none' : '0 4px 20px rgba(123,110,246,0.4)',
                  transition: 'all .25s cubic-bezier(0.4,0,0.2,1)',
                  opacity: skipAdapt ? .45 : 1,
                  position: 'relative', overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  if (!skipAdapt && !polling && (editorTitle || editorBody)) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 6px 28px rgba(123,110,246,0.55)'
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.boxShadow = (skipAdapt || polling || (!editorTitle && !editorBody))
                    ? 'none' : '0 4px 20px rgba(123,110,246,0.4)'
                }}
              >
                {polling && !hasResults
                  ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #fff', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin .75s linear infinite' }} />
                      分析中...
                    </span>
                  : '✨ AI 适配 + 检查'}
              </button>

              {/* Normal publish button (only when AI adapt ran) */}
              {!skipAdapt && canPublishFromCards && (
                <button
                  onClick={handlePublish}
                  disabled={isLivePublishing}
                  style={{
                    padding: '12px 26px', borderRadius: 10, border: 'none', flexShrink: 0,
                    background: isLivePublishing
                      ? 'rgba(255,255,255,0.04)'
                      : 'linear-gradient(135deg, #34D399, #059669)',
                    color: isLivePublishing ? 'var(--text-3)' : '#fff',
                    fontWeight: 700, fontSize: 14,
                    cursor: isLivePublishing ? 'not-allowed' : 'pointer',
                    boxShadow: isLivePublishing ? 'none' : '0 4px 20px rgba(52,211,153,0.35)',
                    transition: 'all .25s cubic-bezier(0.4,0,0.2,1)',
                  }}
                  onMouseEnter={e => { if (!isLivePublishing) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(52,211,153,0.5)' } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = isLivePublishing ? 'none' : '0 4px 20px rgba(52,211,153,0.35)' }}
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
                    padding: '12px 26px', borderRadius: 10, border: 'none', flexShrink: 0,
                    background: (isLivePublishing || (!editorTitle && !editorBody))
                      ? 'rgba(255,255,255,0.04)'
                      : 'linear-gradient(135deg, #FBBF24, #f97316)',
                    color: (isLivePublishing || (!editorTitle && !editorBody)) ? 'var(--text-3)' : '#fff',
                    fontWeight: 700, fontSize: 14,
                    cursor: (isLivePublishing || (!editorTitle && !editorBody)) ? 'not-allowed' : 'pointer',
                    transition: 'all .25s cubic-bezier(0.4,0,0.2,1)',
                    boxShadow: (isLivePublishing || (!editorTitle && !editorBody))
                      ? 'none' : '0 4px 20px rgba(251,191,36,0.35)',
                  }}
                  onMouseEnter={e => { if (!(isLivePublishing || (!editorTitle && !editorBody))) { e.currentTarget.style.transform = 'translateY(-2px)' } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
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
          <div style={{ width: 380, flexShrink: 0, position: 'relative', zIndex: 1 }}>

            {/* Loading skeleton */}
            {polling && !hasResults && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[120, 100, 100, 120].map((h, i) => (
                  <div key={i} className="skeleton" style={{
                    height: h, borderRadius: 12,
                    border: '1px solid var(--border)',
                    animationDelay: `${i * .18}s`,
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
              <div className="glass-panel" style={{ overflow: 'hidden' }}>
                {/* Tab bar with sliding indicator */}
                <div style={{
                  display: 'flex', borderBottom: '1px solid var(--border)',
                  background: 'rgba(255,255,255,0.02)',
                  position: 'relative',
                }}>
                  {Object.keys(taskData.adapted_results).map(pid => {
                    const r = taskData.adapted_results[pid]
                    const isActive = pid === activeResultTab
                    const status   = r?.status
                    const dotColor = status === 'success' ? 'var(--green)'
                      : status === 'failed' ? 'var(--red)'
                      : ['logging_in','navigating','filling','publishing','retrying','awaiting_assist'].includes(status) ? 'var(--accent)'
                      : 'var(--text-3)'
                    return (
                      <button key={pid} onClick={() => setActiveResultTab(pid)} style={{
                        flex: 1, padding: '10px 0', fontSize: 11, border: 'none',
                        background: 'transparent',
                        color: isActive ? 'var(--text-1)' : 'var(--text-3)',
                        cursor: 'pointer', fontWeight: isActive ? 600 : 400,
                        transition: 'all .2s', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: 4, position: 'relative',
                      }}>
                        <span style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: dotColor, display: 'inline-block', flexShrink: 0,
                          boxShadow: isActive ? `0 0 6px ${dotColor}` : 'none',
                          transition: 'box-shadow .2s',
                        }} />
                        {PNAMES[pid] ?? pid}
                        {/* per-tab underline */}
                        <span style={{
                          position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                          height: 2, width: isActive ? '70%' : '0%',
                          background: 'linear-gradient(90deg, #7B6EF6, #60A5FA)',
                          borderRadius: '2px 2px 0 0',
                          transition: 'width .25s cubic-bezier(0.34,1.56,0.64,1)',
                        }} />
                      </button>
                    )
                  })}
                </div>

                {/* ── Active platform result — FIXED LAYOUT (no overlap) ── */}
                {activeResult && (
                  <div style={{ padding: '16px' }}>
                    {/* Card header: status label + polish button — side by side, NOT absolute */}
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', marginBottom: 12,
                    }}>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        {!['logging_in','navigating','filling','publishing','retrying','awaiting_assist','success','failed','blocked'].includes(activeResult.status)
                          ? '点击标题或正文可直接编辑' : ''}
                      </span>
                      <button
                        onClick={() => setPolish({ open: true, platform: activeResultTab })}
                        style={{
                          padding: '4px 12px', borderRadius: 'var(--r-sm)', fontSize: 11,
                          cursor: 'pointer',
                          background: 'rgba(123,110,246,0.1)',
                          border: '1px solid rgba(123,110,246,0.3)',
                          color: 'var(--accent)',
                          transition: 'all .2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(123,110,246,0.2)'; e.currentTarget.style.boxShadow = '0 0 12px var(--accent-glow)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(123,110,246,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
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
