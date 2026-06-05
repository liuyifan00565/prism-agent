/**
 * useAuth — JWT auth state stored in localStorage.
 * Exposes: user, token, login, register, logout, refreshMe
 */
import { useState, useCallback } from 'react'

const LS_TOKEN = 'prism_auth_token'
const LS_USER  = 'prism_auth_user'
const BASE     = '/api/auth'

async function apiFetch(path, body) {
  const res = await fetch(BASE + path, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.detail || data?.message || `请求失败 ${res.status}`)
  return data
}

async function apiGet(path, token) {
  const res = await fetch(BASE + path, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.detail || `请求失败 ${res.status}`)
  return data
}

async function apiPut(path, token, body = {}) {
  const res = await fetch(BASE + path, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body:    JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.detail || `请求失败 ${res.status}`)
  return data
}

function loadStored() {
  try {
    const token = localStorage.getItem(LS_TOKEN)
    const user  = JSON.parse(localStorage.getItem(LS_USER) || 'null')
    return { token, user }
  } catch { return { token: null, user: null } }
}

export function useAuth() {
  const [{ token, user }, setAuth] = useState(loadStored)

  function _persist(token, user) {
    localStorage.setItem(LS_TOKEN, token)
    localStorage.setItem(LS_USER, JSON.stringify(user))
    setAuth({ token, user })
  }

  const login = useCallback(async (email, password) => {
    const data = await apiFetch('/login', { email, password })
    _persist(data.token, data.user)
    return data.user
  }, [])

  const register = useCallback(async (username, email, password) => {
    const data = await apiFetch('/register', { username, email, password })
    _persist(data.token, data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(LS_TOKEN)
    localStorage.removeItem(LS_USER)
    setAuth({ token: null, user: null })
  }, [])

  const refreshMe = useCallback(async () => {
    if (!token) return null
    try {
      const data = await apiGet('/me', token)
      localStorage.setItem(LS_USER, JSON.stringify(data))
      setAuth(prev => ({ ...prev, user: data }))
      return data
    } catch { return null }
  }, [token])

  const bindPlatform = useCallback(async (platform) => {
    if (!token) throw new Error('未登录')
    const data = await apiPut(`/platform/${platform}/bind`, token)
    localStorage.setItem(LS_USER, JSON.stringify(data.user))
    setAuth(prev => ({ ...prev, user: data.user }))
    return data.user
  }, [token])

  const unbindPlatform = useCallback(async (platform) => {
    if (!token) throw new Error('未登录')
    const data = await apiPut(`/platform/${platform}/unbind`, token)
    localStorage.setItem(LS_USER, JSON.stringify(data.user))
    setAuth(prev => ({ ...prev, user: data.user }))
    return data.user
  }, [token])

  return { user, token, isLoggedIn: !!token, login, register, logout, refreshMe, bindPlatform, unbindPlatform }
}
