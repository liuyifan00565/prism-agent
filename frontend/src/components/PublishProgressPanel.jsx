/**
 * 发布进度面板 — 实时展示每个平台的执行步骤 + 日志流
 * 当任意平台进入发布流程后自动显示，替代普通的执行日志区域
 * 支持 human-in-the-loop：当平台状态为 awaiting_assist 时弹出辅助操作浮层
 */
import { useState } from 'react'
import { assistResume } from '../api/client'

const PNAMES = { wechat: '公众号', zhihu: '知乎', xiaohongshu: '小红书', bilibili: 'B站' }

const STEPS = [
  { key: 'logging_in', label: '登录检测' },
  { key: 'navigating', label: '打开编辑器' },
  { key: 'filling',    label: '填写内容' },
  { key: 'publishing', label: '提交发布' },
]

// 各状态对应"走到了哪一步"（-1 = 未开始，0~3 = 步骤索引，4 = 全部完成）
const STATUS_STEP = {
  logging_in:      0,
  navigating:      1,
  filling:         2,
  publishing:      3,
  retrying:        3,
  awaiting_assist: 3,   // 暂停在发布步骤，等用户操作
  success:         4,
  failed:          4,   // 停在最后完成的那步
}

function StepDot({ state }) {
  // state: 'pending' | 'active' | 'done' | 'failed'
  const colors = { pending: '#333', active: '#c8f55a', done: '#69db7c', failed: '#ff6b6b' }
  const c = colors[state] ?? '#333'
  return (
    <span style={{
      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: state === 'pending' ? 'transparent' : `${c}22`,
      border: `2px solid ${c}`,
      fontSize: 10, color: c,
      transition: 'all 0.3s',
    }}>
      {state === 'active' && (
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          border: '2px solid currentColor', borderTopColor: 'transparent',
          display: 'inline-block',
          animation: 'spin 0.75s linear infinite',
        }} />
      )}
      {state === 'done'    && '✓'}
      {state === 'failed'  && '✗'}
    </span>
  )
}

function PlatformRow({ platform, result }) {
  const status    = result?.status ?? 'pending'
  const stepIdx   = STATUS_STEP[status] ?? -1
  const isFailed     = status === 'failed'
  const isSuccess    = status === 'success'
  const isAwaitAssist = status === 'awaiting_assist'
  const isActive     = ['logging_in','navigating','filling','publishing','retrying','awaiting_assist'].includes(status)

  // Derive each step's visual state
  function stepState(i) {
    if (isFailed) {
      if (i < stepIdx)  return 'done'
      if (i === stepIdx) return 'failed'
      return 'pending'
    }
    if (isSuccess) return 'done'
    if (i < stepIdx)   return 'done'
    if (i === stepIdx) return 'active'
    return 'pending'
  }

  const borderColor = isSuccess ? '#69db7c44'
    : isFailed  ? '#ff6b6b44'
    : isActive  ? '#c8f55a33'
    : '#1e1e24'

  return (
    <div style={{
      background: '#0d0d0f', borderRadius: 10, padding: '14px 16px',
      border: `1px solid ${borderColor}`,
      transition: 'border-color 0.3s',
    }}>
      {/* platform name + overall status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#ccc' }}>
          {PNAMES[platform] ?? platform}
        </span>
        <span style={{
          fontSize: 11, padding: '2px 10px', borderRadius: 20,
          background: isSuccess ? '#69db7c22'
            : isFailed ? '#ff6b6b22'
            : isAwaitAssist ? '#ffa94d22'
            : isActive ? '#c8f55a22'
            : '#2a2a30',
          color: isSuccess ? '#69db7c'
            : isFailed ? '#ff6b6b'
            : isAwaitAssist ? '#ffa94d'
            : isActive ? '#c8f55a'
            : '#555',
        }}>
          {isSuccess ? '✓ 发布成功'
            : isFailed ? '✗ 失败'
            : isAwaitAssist ? '⏸ 等待操作'
            : isActive ? '进行中...'
            : '等待发布'}
        </span>
      </div>

      {/* step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {STEPS.map((step, i) => (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <StepDot state={stepState(i)} />
              <span style={{ fontSize: 9, color: stepState(i) === 'pending' ? '#333' : '#888', whiteSpace: 'nowrap' }}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: '0 4px', marginBottom: 14,
                background: stepState(i) === 'done' ? '#69db7c44' : '#1e1e24',
                transition: 'background 0.3s',
              }} />
            )}
          </div>
        ))}
      </div>

      {/* error message */}
      {isFailed && result?.error && (
        <div style={{
          marginTop: 10, fontSize: 11, color: '#ff6b6b',
          background: 'rgba(255,107,107,0.07)',
          border: '1px solid rgba(255,107,107,0.2)',
          borderRadius: 6, padding: '7px 10px',
          wordBreak: 'break-all', lineHeight: 1.5,
        }}>
          ⚠ {result.error}
        </div>
      )}

      {/* retry hint */}
      {isFailed && (
        <div style={{ marginTop: 6, fontSize: 11, color: '#555' }}>
          💡 可在下方再次点击「确认发布」→「直接发布」重试
        </div>
      )}
    </div>
  )
}

function LogStream({ logs }) {
  if (!logs?.length) return null
  // 只显示跟发布执行相关的行（跳过AI适配日志）
  const pubLogs = logs.filter(l =>
    l.includes('登录') || l.includes('编辑器') || l.includes('填写') ||
    l.includes('发布') || l.includes('重试') || l.includes('失败') ||
    l.includes('成功') || l.includes('系统') || l.includes('异常') ||
    l.includes('等待用户') || l.includes('继续执行') || l.includes('超时')
  )
  if (!pubLogs.length) return null

  return (
    <div style={{
      marginTop: 12,
      background: '#070709',
      borderRadius: 8,
      border: '1px solid #1a1a20',
      padding: '10px 12px',
      maxHeight: 180,
      overflow: 'auto',
    }}>
      <div style={{ fontSize: 10, color: '#333', marginBottom: 6, letterSpacing: 1 }}>
        EXECUTION LOG
      </div>
      {pubLogs.map((line, i) => {
        const color = line.includes('失败') || line.includes('异常') ? '#ff6b6b'
          : line.includes('成功') || line.includes('✓') ? '#69db7c'
          : line.includes('重试') || line.includes('等待用户') ? '#ffa94d'
          : line.includes('继续执行') ? '#c8f55a'
          : '#555'
        return (
          <div key={i} style={{ fontSize: 11, color, lineHeight: 1.7, fontFamily: 'monospace' }}>
            <span style={{ color: '#2a2a35', marginRight: 8 }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            {line}
          </div>
        )
      })}
    </div>
  )
}

/**
 * 辅助操作浮层 — 当 Agent 在决策点暂停时显示
 * 展示当前浏览器截图 + 操作提示，让用户选择模板后点击「继续」
 */
function AssistDialog({ taskId, platform, message, screenshotB64, onDone }) {
  const [loading, setLoading] = useState(false)

  async function handleResume(action) {
    setLoading(true)
    try {
      await assistResume(taskId, platform, action)
    } catch (e) {
      console.error('assist-resume failed', e)
    } finally {
      setLoading(false)
      onDone?.()
    }
  }

  const pname = PNAMES[platform] ?? platform

  return (
    /* Fullscreen dimmed overlay */
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: '#13131a',
        border: '1px solid #ffa94d55',
        borderRadius: 14,
        padding: '24px 24px 20px',
        maxWidth: 560,
        width: '90vw',
        boxShadow: '0 0 40px rgba(255,169,77,0.15)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 22 }}>🤔</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#ffa94d' }}>
              Agent 需要你帮一个忙
            </div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
              {pname} · 等待操作
            </div>
          </div>
        </div>

        {/* Message */}
        <div style={{
          fontSize: 13, color: '#bbb', lineHeight: 1.6,
          background: '#0d0d12', borderRadius: 8,
          padding: '10px 14px', marginBottom: 16,
          border: '1px solid #1e1e2a',
        }}>
          {message}
        </div>

        {/* Browser screenshot preview */}
        {screenshotB64 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#333', marginBottom: 6, letterSpacing: 1 }}>
              当前浏览器页面
            </div>
            <img
              src={`data:image/png;base64,${screenshotB64}`}
              alt="browser preview"
              style={{
                width: '100%', borderRadius: 8,
                border: '1px solid #1e1e28',
                maxHeight: 280, objectFit: 'contain',
                background: '#000',
              }}
            />
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => handleResume('user_helped')}
            disabled={loading}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 8,
              background: '#ffa94d22', border: '1px solid #ffa94d66',
              color: '#ffa94d', fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            {loading ? '发送中...' : '✅ 我已选好，继续发布'}
          </button>
          <button
            onClick={() => handleResume('continue')}
            disabled={loading}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 8,
              background: '#1e1e28', border: '1px solid #2a2a38',
              color: '#666', fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            使用默认，继续
          </button>
        </div>

        <div style={{ marginTop: 12, fontSize: 10, color: '#333', textAlign: 'center' }}>
          5 分钟内不操作将自动使用默认选项继续
        </div>
      </div>
    </div>
  )
}


export default function PublishProgressPanel({ taskData, taskId }) {
  const results = taskData?.adapted_results ?? {}

  // 只展示已进入发布流程的平台
  const publishPlatforms = Object.entries(results).filter(([, r]) =>
    ['logging_in','navigating','filling','publishing','retrying','awaiting_assist','success','failed'].includes(r?.status)
  )

  if (publishPlatforms.length === 0) return null

  const anyActive  = publishPlatforms.some(([,r]) =>
    ['logging_in','navigating','filling','publishing','retrying','awaiting_assist'].includes(r?.status))
  const allSuccess = publishPlatforms.every(([,r]) => r?.status === 'success')
  const anyFailed  = publishPlatforms.some(([,r]) => r?.status === 'failed')

  // Detect any platform waiting for human assist
  const assistEntry = publishPlatforms.find(([,r]) => r?.status === 'awaiting_assist')

  return (
    <>
    {/* Human-in-the-loop assist dialog */}
    {assistEntry && taskId && (
      <AssistDialog
        taskId={taskId}
        platform={assistEntry[0]}
        message={assistEntry[1]?.assist_message ?? '请在浏览器中完成操作后点击「继续」'}
        screenshotB64={assistEntry[1]?.assist_screenshot ?? ''}
        onDone={() => {/* panel will auto-update on next poll */}}
      />
    )}

    <div style={{
      background: '#0a0a0c',
      border: `1px solid ${allSuccess ? '#69db7c44' : anyFailed ? '#ff6b6b33' : '#1e1e28'}`,
      borderRadius: 12, padding: '16px',
      marginBottom: 18,
      transition: 'border-color 0.3s',
    }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        {anyActive && (
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#c8f55a', display: 'inline-block',
            animation: 'pulse 1s ease-in-out infinite',
          }} />
        )}
        <span style={{ fontSize: 12, fontWeight: 600, color: '#888', letterSpacing: 1 }}>
          {allSuccess ? '✓ 发布完成' : anyActive ? 'AGENT 执行中...' : '发布结果'}
        </span>
      </div>

      {/* per-platform rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {publishPlatforms.map(([pid, r]) => (
          <PlatformRow key={pid} platform={pid} result={r} />
        ))}
      </div>

      {/* log stream */}
      <LogStream logs={taskData?.execution_log} />
    </div>
    </>
  )
}
