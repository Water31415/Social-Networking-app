import React, { useContext, useState } from 'react'
import { Link, useHistory } from 'react-router-dom'
import { AuthContext } from '../../context/auth-context'
import { useTrip } from '../../context/trip-context'
import { backendUrl } from '../../../Utils/backend-url'
import SpecularButton from '../SpecularButton/SpecularButton'
import './TripBanner.css'

const TripBanner = () => {
  const auth = useContext(AuthContext)
  const { activeTrip, isLoading, error: tripLoadError, setActiveTrip } = useTrip()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const history = useHistory()
  if (!auth.isLoggedIn) return null
  const tripId = activeTrip?.id || activeTrip?._id
  const stopTrip = async () => {
    setBusy(true); setError('')
    try {
      const response = await fetch(backendUrl(`api/trips/${tripId}/stop`), { method: 'PATCH', headers: { Authorization: `Bearer ${auth.token}` } })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Could not stop trip')
      setActiveTrip(null); history.push(`/trips/${tripId}/review`)
    } catch (requestError) { setError(requestError.message) }
    finally { setBusy(false) }
  }
  return <aside className="trip-banner">
    {activeTrip ? <><div><span className="trip-banner__live"><i /> TRIP IN PROGRESS</span><strong>{activeTrip.title}</strong></div><div className="trip-banner__actions"><Link to={`/trips/${tripId}`}>Add a stop</Link><button type="button" onClick={stopTrip} disabled={busy}>{busy ? 'Stopping…' : 'Stop trip'}</button></div>{error && <small role="alert">{error}</small>}</> : isLoading ? <span>Checking for an active trip…</span> : <><div className="trip-banner__start"><SpecularButton to="/places/new/trip" size="sm" radius={999} tint="#a855f7" tintOpacity={0.16} textColor="#f5f3ff" lineColor="#d8b4fe" baseColor="#7e22ce" intensity={0.85} idleIntensity={0.3} shineSize={12} shineFade={36} thickness={1.4} glow={0.65} followMouse>Start Trip</SpecularButton></div>{tripLoadError && <small role="alert">{tripLoadError}</small>}</>}
  </aside>
}

export default TripBanner
