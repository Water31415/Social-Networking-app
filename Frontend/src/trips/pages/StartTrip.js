import React, { useContext, useEffect, useRef, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { AuthContext } from '../../shared/components/context/auth-context'
import { useTrip } from '../../shared/components/context/trip-context'
import { LoadingText, TripItineraryEditor } from '../../shared/components/UI'
import { backendUrl } from '../../shared/Utils/backend-url'
import { useHttpClient } from '../../shared/hooks/http-hook'
import ErrorModal from '../../shared/components/UIElements/ErrorModal'
import { fetchCurrentLocation } from '../../shared/Utils/current-location'
import './TripPages.css'

const StartTrip = () => {
  const auth = useContext(AuthContext)
  const { activeTrip, setActiveTrip, refreshActiveTrip } = useTrip()
  const { isLoading, error, clearError, sendRequest } = useHttpClient()
  const history = useHistory()
  const storageKey = `snapit-trip-draft-${auth.userId}`
  const [form, setForm] = useState({ title: '', plannedBudget: '', visibility: 'private', itinerary: [], startAddress: '', startLocation: null })
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [addressFetched, setAddressFetched] = useState(false)
  const skipActiveTripRedirect = useRef(false)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null')
      if (saved) {
        const savedForm = saved.form || saved
        const { startAddressFetched: wasFetched, ...restoredForm } = savedForm
        const hadFetchedLocation = wasFetched === true || Boolean(savedForm.startLocation)
        setForm(current => ({ ...current, ...restoredForm, startAddress: hadFetchedLocation ? '' : (savedForm.startAddress || ''), startLocation: null }))
      }
    } catch {}
    setDraftLoaded(true)
  }, [storageKey])
  useEffect(() => {
    if (!draftLoaded) return
    localStorage.setItem(storageKey, JSON.stringify({
      ...form,
      startAddress: addressFetched ? '' : form.startAddress,
      startLocation: null,
      startAddressFetched: addressFetched,
      status: 'draft'
    }))
  }, [storageKey, form, draftLoaded, addressFetched])
  useEffect(() => { if (activeTrip && !skipActiveTripRedirect.current) history.replace(`/trips/${activeTrip.id || activeTrip._id}`) }, [activeTrip, history])
  const change = event => {
    const { name, value } = event.target
    setForm(current => ({ ...current, [name]: value, ...(name === 'startAddress' ? { startLocation: null } : {}) }))
    if (name === 'startAddress') setAddressFetched(false)
  }
  const useMyLocation = async () => {
    setGeoError('')
    setLocationLoading(true)
    try {
      const result = await fetchCurrentLocation(sendRequest, auth.token)
      setForm(current => ({ ...current, startLocation: result.location, ...(result.address ? { startAddress: result.address } : {}) }))
      if (result.address) setAddressFetched(true)
      if (result.error) { clearError(); setGeoError(`${result.error} Your coordinates were saved; enter an address if lookup is unavailable.`) }
    } catch (error) {
      setGeoError(error.message || 'Could not read your location. Enter an address instead.')
    } finally { setLocationLoading(false) }
  }
  const submit = async event => {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      const payload = { ...form, plannedBudget: Number(form.plannedBudget || 0), itinerary: form.itinerary.filter(item => item.plannedPlace.trim()).map(item => ({ ...item, day: Math.max(1, Number(item.day) || 1) })) }
      const response = await sendRequest(backendUrl('api/trips/start'), 'POST', JSON.stringify(payload), { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` })
      const trip = response.trip
      skipActiveTripRedirect.current = true
      setActiveTrip(trip)
      localStorage.removeItem(storageKey)
      history.push({ pathname: '/', state: { postSubmitLoadingText: 'your trip' } })
      refreshActiveTrip().catch(() => {})
    } catch {} finally { setIsSubmitting(false) }
  }
  return <main className="trip-page">
    <ErrorModal error={error} onClear={clearError} />
    <LoadingText isLoading={isSubmitting} asOverlay text="your trip" />
    <header className="trip-page__intro"><span>SNAPIT! JOURNAL</span><h1>Start a trip</h1><p>Capture the places, moments, and spending as you go.</p></header>
    <form className="trip-form" onSubmit={submit}>
      <label>Trip name<input name="title" value={form.title} onChange={change} required maxLength="100" placeholder="A weekend in the mountains" /></label>
      <label>Planned budget<input name="plannedBudget" type="number" min="0" step="0.01" value={form.plannedBudget} onChange={change} placeholder="0.00" /></label>
      <label>Starting address (optional)<input name="startAddress" value={form.startAddress} onChange={change} placeholder="Use your current location or enter an address" /></label>
      <button className="trip-secondary" type="button" onClick={useMyLocation} disabled={locationLoading || isLoading}>{locationLoading ? 'Finding location…' : 'Use my current location'}</button>
      {form.startLocation && !geoError && <small className="trip-location-hint">Current location saved{form.startAddress ? ' and address filled in.' : '.'}</small>}
      {geoError && <small role="alert" className="trip-error">{geoError}</small>}
      <label>Visibility<select name="visibility" value={form.visibility} onChange={change}><option value="private">Private</option><option value="followers">Followers</option><option value="public">Public</option></select></label>
      <TripItineraryEditor items={form.itinerary} onChange={itinerary => setForm(current => ({ ...current, itinerary }))} />
      <button className="trip-primary" type="submit" disabled={!form.title.trim() || isLoading || isSubmitting}>{isSubmitting ? 'Starting trip…' : 'Start Trip'}</button>
    </form>
  </main>
}

export default StartTrip
