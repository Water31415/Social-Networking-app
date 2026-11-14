import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AuthContext } from './auth-context'
import { backendUrl } from '../../Utils/backend-url'
import { notifySessionRejected } from '../../Utils/session'

const TripContext = createContext({ activeTrip: null, activeTripId: null, isLoading: false, error: '', refreshActiveTrip: async () => {}, setActiveTrip: () => {} })

export const TripProvider = ({ children }) => {
  const auth = useContext(AuthContext)
  const [activeTrip, setTrip] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const sequence = useRef(0)
  const request = useRef(null)
  const cancelPending = useCallback(() => {
    sequence.current++
    request.current?.abort()
    request.current = null
  }, [])
  const setActiveTrip = useCallback(value => {
    cancelPending()
    setTrip(value)
    setIsLoading(false)
  }, [cancelPending])
  const refreshActiveTrip = useCallback(async () => {
    cancelPending()
    const id = sequence.current
    if (!auth.token) { setTrip(null); setIsLoading(false); setError(''); return null }
    const controller = new AbortController()
    request.current = controller
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch(backendUrl('api/trips/active'), { headers: { Authorization: `Bearer ${auth.token}` }, signal: controller.signal })
      const data = await response.json()
      if (id !== sequence.current) return null
      notifySessionRejected(response, { Authorization: `Bearer ${auth.token}` }, data)
      if (!response.ok) throw new Error(data.message || 'Could not load active trip')
      setTrip(data.trip || null)
      return data.trip || null
    } catch (requestError) {
      if (id === sequence.current && requestError.name !== 'AbortError') setError(requestError.message)
      return null
    } finally {
      if (id === sequence.current) { request.current = null; setIsLoading(false) }
    }
  }, [auth.token, cancelPending])
  useEffect(() => {
    setTrip(null)
    refreshActiveTrip()
    return cancelPending
  }, [refreshActiveTrip, cancelPending])
  useEffect(() => {
    if (!auth.token) return undefined
    const refreshWhenVisible = () => { if (!document.hidden) refreshActiveTrip() }
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [auth.token, refreshActiveTrip])
  const value = useMemo(() => ({ activeTrip, activeTripId: activeTrip?.id || activeTrip?._id || null, isLoading, error, refreshActiveTrip, setActiveTrip }), [activeTrip, isLoading, error, refreshActiveTrip, setActiveTrip])
  return <TripContext.Provider value={value}>{children}</TripContext.Provider>
}

export const useTrip = () => useContext(TripContext)
export default TripContext
