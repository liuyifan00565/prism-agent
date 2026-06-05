const BASE = '/api'

async function parseJsonSafely(response) {
  const text = await response.text()
  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(text || `请求失败：${response.status}`)
  }
}

/**
 * fetch with automatic retry for transient network errors (ECONNREFUSED / 502 / 503).
 * Useful when the backend reloads and is briefly unavailable.
 */
async function requestJson(url, options, retries = 3, retryDelayMs = 800) {
  let lastError
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, options)
      const data = await parseJsonSafely(response)
      if (!response.ok) {
        // 409 = conflict (e.g. already publishing) — don't retry, surface immediately
        if (response.status === 409) {
          throw new Error(data?.detail || data?.message || `冲突：${response.status}`)
        }
        // 5xx — retry
        if (response.status >= 500 && attempt < retries - 1) {
          await new Promise(r => setTimeout(r, retryDelayMs * (attempt + 1)))
          continue
        }
        throw new Error(data?.detail || data?.message || `请求失败：${response.status}`)
      }
      return data
    } catch (err) {
      lastError = err
      // Network-level failures (ECONNREFUSED, proxy error) — retry
      const isNetworkErr = err instanceof TypeError && err.message.includes('fetch')
      const isRetryable  = isNetworkErr || err.message?.includes('ECONNREFUSED')
      if (isRetryable && attempt < retries - 1) {
        await new Promise(r => setTimeout(r, retryDelayMs * (attempt + 1)))
        continue
      }
      throw err
    }
  }
  throw lastError
}

export async function publishText(title, body, platforms, skipAdapt = false) {
  return requestJson(`${BASE}/publish/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body, platforms, skip_adapt: skipAdapt }),
  })
}

export async function publishVoice(audioBlob) {
  const fd = new FormData()
  fd.append('audio', audioBlob, 'recording.wav')
  return requestJson(`${BASE}/publish/voice`, { method: 'POST', body: fd })
}

export async function getTask(taskId) {
  return requestJson(`${BASE}/task/${taskId}`)
}

export async function confirmTask(taskId, confirmed, skipBlocked = false) {
  return requestJson(`${BASE}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId, confirmed, skip_blocked: skipBlocked }),
  })
}

export async function applyFix(taskId, platform) {
  return requestJson(`${BASE}/apply-fix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId, platform }),
  })
}

export async function updateContent(taskId, platform, adaptedTitle, adaptedBody) {
  return requestJson(`${BASE}/update-content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task_id: taskId,
      platform,
      adapted_title: adaptedTitle,
      adapted_body: adaptedBody,
    }),
  })
}

export async function finalConfirm(taskId, platform) {
  return requestJson(`${BASE}/final-confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId, platform }),
  })
}

export async function finalConfirmAll(taskId) {
  return requestJson(`${BASE}/final-confirm-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId }),
  })
}

export async function getSessionStatus(platform) {
  return requestJson(`${BASE}/session/${platform}/status`)
}

export async function loginPlatform(platform) {
  return requestJson(`${BASE}/session/${platform}/login`, { method: 'POST' })
}

export async function publishPlatform(taskId, platform) {
  return requestJson(`${BASE}/publish-platform`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId, platform }),
  })
}

export async function assistResume(taskId, platform, action = 'continue') {
  return requestJson(`${BASE}/assist-resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId, platform, action }),
  })
}

export async function refineContent(instruction, currentTitle, currentBody, summary) {
  return requestJson(`${BASE}/voice/refine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instruction,
      current_title: currentTitle,
      current_body:  currentBody,
      summary:       summary || '',
    }),
  })
}
