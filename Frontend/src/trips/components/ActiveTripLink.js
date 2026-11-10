import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../../shared/components/context/auth-context'
import { useTrip } from '../../shared/components/context/trip-context'

const ActiveTripLink = () => {
  const auth = useContext(AuthContext)
  const { activeTrip, isLoading } = useTrip()
  const tripId = activeTrip?.id || activeTrip?._id
  if (!auth.isLoggedIn || isLoading || activeTrip?.status !== 'active' || !tripId) return null

  return <Link className="places-page__active-trip" to={`/trips/${tripId}`}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><path d="M6 9v7a2 2 0 0 0 2 2h7M12 6h6m-3-3 3 3-3 3" /></svg>
    <span>Trip in progress</span><span aria-hidden="true">↗</span>
  </Link>
}

export default ActiveTripLink
