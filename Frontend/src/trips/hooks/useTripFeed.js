import { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../../shared/components/context/auth-context'
import { backendUrl } from '../../shared/Utils/backend-url'
import { useHttpClient } from '../../shared/hooks/http-hook'

const useTripFeed = ({ userId, enabled = true } = {}) => {
  const auth = useContext(AuthContext)
  const { sendRequest } = useHttpClient()
  const [trips, setTrips] = useState([])

  useEffect(() => {
    let cancelled = false
    if (!enabled || !auth.isLoggedIn || !auth.token) {
      setTrips([])
      return () => { cancelled = true }
    }

    const path = userId ? `api/trips/user/${userId}` : 'api/trips/feed'
    sendRequest(backendUrl(path), 'GET', null, { Authorization: `Bearer ${auth.token}` })
      .then(data => {
        if (!cancelled) setTrips((data.trips || []).filter(trip => trip.status === 'published'))
      })
      .catch(() => {
        if (!cancelled) setTrips([])
      })

    return () => { cancelled = true }
  }, [auth.isLoggedIn, auth.token, enabled, sendRequest, userId])

  return trips
}

export default useTripFeed
