import { useEffect, useState, useCallback, useRef } from 'react'
import { getSessionExpiration } from '../Utils/session'

export const CheckAuth = () => {
  const [userId, setUserId] = useState(null)
  const [token, setToken] = useState(null)
  const [tokenExpirationDate, setTokenExpirationDate] = useState(null)
  const [isAuthReady, setIsAuthReady] = useState(false)
  const expiryHandled = useRef(false)

  const logout = useCallback(() => {
    setToken(null)
    setTokenExpirationDate(null)
    setUserId(null)
    window.localStorage.removeItem('userData')
  }, [])

  const expireSession = useCallback(() => {
    if (expiryHandled.current) return
    expiryHandled.current = true
    logout()
    // Full navigation discards private page state and reloads All places.
    window.location.replace('/')
  }, [logout])

  const login = useCallback((uid, nextToken, expirationDate) => {
    const expires = getSessionExpiration(nextToken, expirationDate)
    if (!uid || !expires || expires.getTime() <= Date.now()) {
      expireSession()
      return
    }
    expiryHandled.current = false
    setToken(nextToken)
    setUserId(uid)
    setTokenExpirationDate(expires)
    window.localStorage.setItem('userData', JSON.stringify({
      userId: uid, token: nextToken, expirationDate: expires.toISOString()
    }))
  }, [expireSession])

  useEffect(() => {
    if (!token || !tokenExpirationDate) return undefined
    const checkExpiration = () => {
      if (tokenExpirationDate.getTime() <= Date.now()) expireSession()
    }
    const timer = window.setTimeout(expireSession, Math.max(0, tokenExpirationDate.getTime() - Date.now()))
    window.addEventListener('focus', checkExpiration)
    document.addEventListener('visibilitychange', checkExpiration)
    window.addEventListener('snapit:session-expired', expireSession)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', checkExpiration)
      document.removeEventListener('visibilitychange', checkExpiration)
      window.removeEventListener('snapit:session-expired', expireSession)
    }
  }, [token, tokenExpirationDate, expireSession])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('userData')
      if (!saved) return
      const stored = JSON.parse(saved)
      login(stored?.userId, stored?.token, stored?.expirationDate)
    } catch {
      expireSession()
    } finally {
      setIsAuthReady(true)
    }
  }, [login, expireSession])

  return { token, login, logout, userId, isAuthReady }
}
