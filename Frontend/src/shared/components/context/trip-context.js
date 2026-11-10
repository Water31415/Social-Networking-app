import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './auth-context'
import { backendUrl } from '../../Utils/backend-url'
import { notifySessionRejected } from '../../Utils/session'

const TripContext = createContext({ activeTrip: null, activeTripId: null, isLoading: false, error: '', refreshActiveTrip: async () => {}, setActiveTrip: () => {} })

export const TripProvider = ({ children }) => {
  const auth = useContext(AuthContext)
  const [activeTrip, setActiveTrip] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const refreshActiveTrip = useCallback(async () => {
    if (!auth.token) { setActiveTrip(null); return null }
    setIsLoading(true); setError('')
    try {
      const response = await fetch(backendUrl('api/trips/active'), { headers: { Authorization: `Bearer ${auth.token}` } })
      const data = await response.json()
      notifySessionRejected(response, { Authorization: `Bearer ${auth.token}` }, data)
      if (!response.ok) throw new Error(data.message || 'Could not load active trip')
      setActiveTrip(data.trip || null); return data.trip || null
    } catch (requestError) { setError(requestError.message); return null }
    finally { setIsLoading(false) }
  }, [auth.token])
  useEffect(() => { refreshActiveTrip() }, [refreshActiveTrip])
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
  const value = useMemo(() => ({ activeTrip, activeTripId: activeTrip?.id || activeTrip?._id || null, isLoading, error, refreshActiveTrip, setActiveTrip }), [activeTrip, isLoading, error, refreshActiveTrip])
  return <TripContext.Provider value={value}>{children}</TripContext.Provider>
}

export const useTrip = () => useContext(TripContext)
export default TripContext
