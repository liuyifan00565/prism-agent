import { useState, useRef, useCallback, useEffect } from 'react'
import { publishText, publishVoice, getTask, confirmTask, applyFix, uploadVideo } from '../api/client'

const LS_KEY = 'prism_last_task_id'

export function useAgent() {
  // 初始化时从 localStorage 读取上次的 taskId
  const [taskId,   setTaskId]   = useState(() => localStorage.getItem(LS_KEY) || null)
  const [taskData, setTaskData] = useState(null)
  const [polling,  setPolling]  = useState(false)
  const timerRef = useRef(null)

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setPolling(false)
  }, [])

  const fetchTaskOnce = useCallback(async (id) => {
    const data = await getTask(id)
    // 后端找不到该任务（数据已被清理）时静默放弃
    if (data?.error === 'not found') {
      stopPolling()
      return data
    }
    setTaskData(data)
    if (['awaiting_confirm', 'done', 'error'].includes(data.status)) {
      stopPolling()
    }
    return data
  }, [stopPolling])

  const poll = useCallback((id) => {
    stopPolling()
    timerRef.current = setInterval(async () => {
      try {
        await fetchTaskOnce(id)
      } catch (err) {
        console.error('poll task failed', err)
        stopPolling()
      }
    }, 1000)
    setPolling(true)
    fetchTaskOnce(id).catch(err => {
      console.error('initial task fetch failed', err)
      stopPolling()
    })
  }, [fetchTaskOnce, stopPolling])

  // 启动时尝试恢复上次任务
  useEffect(() => {
    if (!taskId) return
    getTask(taskId).then(data => {
      if (!data || data.error) {
        // 后端没有这个任务 → 清掉 localStorage，等待用户重新提交
        localStorage.removeItem(LS_KEY)
        setTaskId(null)
        return
      }
      setTaskData(data)
      // 如果任务还在运行中，继续轮询
      if (data.status === 'running') {
        poll(taskId)
      }
    }).catch(() => {
      // 后端未启动或网络错误，不清除 taskId，等下次重试
    })
    // 仅在组件首次挂载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function _setTaskId(id) {
    setTaskId(id)
    if (id) {
      localStorage.setItem(LS_KEY, id)
    } else {
      localStorage.removeItem(LS_KEY)
    }
  }

  async function submitText(title, body, platforms, skipAdapt = false, videoPath = null, videoFilename = null) {
    const res = await publishText(title, body, platforms, skipAdapt, videoPath, videoFilename)
    if (!res?.task_id) throw new Error(res?.error || '未获取到任务ID')
    _setTaskId(res.task_id)
    setTaskData(null)
    poll(res.task_id)
    return res.task_id
  }

  async function submitVoice(blob) {
    const { task_id, error } = await publishVoice(blob)
    if (!task_id) throw new Error(error || '未获取到任务ID')
    _setTaskId(task_id)
    setTaskData(null)
    poll(task_id)
    return task_id
  }

  async function confirm(confirmed, skipBlocked = false) {
    if (!taskId) return
    await confirmTask(taskId, confirmed, skipBlocked)
    setTaskData(d => (d ? { ...d, status: 'running' } : d))
    poll(taskId)
  }

  async function applyFixFor(platform) {
    if (!taskId) return
    await applyFix(taskId, platform)
    const data = await getTask(taskId)
    setTaskData(data)
  }

  function resumePolling() {
    if (!taskId) return
    setTaskData(d => (d ? { ...d, status: 'running' } : d))
    poll(taskId)
  }

  function reset() {
    stopPolling()
    _setTaskId(null)
    setTaskData(null)
  }

  return { taskId, taskData, polling, submitText, submitVoice, confirm, applyFixFor, resumePolling, reset }
}
