import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useHistory, useParams } from 'react-router-dom'
import { AuthContext } from '../../shared/components/context/auth-context'
import { useTrip } from '../../shared/components/context/trip-context'
import { LoadingText, TripItineraryEditor, TripMap } from '../../shared/components/UI'
import { backendUrl, backendImageUrl } from '../../shared/Utils/backend-url'
import readExifGps from '../../shared/Utils/exif-gps'
import { useHttpClient } from '../../shared/hooks/http-hook'
import ErrorModal from '../../shared/components/UIElements/ErrorModal'
import { fetchCurrentLocation } from '../../shared/Utils/current-location'
import './TripPages.css'

const ActiveTrip = () => {
  const { tripId } = useParams()
  const auth = useContext(AuthContext)
  const { activeTrip, setActiveTrip } = useTrip()
  const { isLoading, error, clearError, sendRequest } = useHttpClient()
  const history = useHistory()
  const [trip, setTrip] = useState(activeTrip)
  const [form, setForm] = useState({ title: '', note: '', address: '' })
  const [images, setImages] = useState([])
  const imageInputRef = useRef(null)
  const [previews, setPreviews] = useState([])
  const [exifLocation, setExifLocation] = useState(null)
  const [browserLocation, setBrowserLocation] = useState(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [expenses, setExpenses] = useState([{ amount: '', category: 'Other', note: '' }])
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [itinerary, setItinerary] = useState([])
  const storageKey = `snapit-stop-draft-${tripId}`
  const loadTrip = useCallback(async () => {
    try {
      const data = await sendRequest(backendUrl(`api/trips/${tripId}`), 'GET', null, { Authorization: `Bearer ${auth.token}` })
      setTrip(data.trip); setItinerary(data.trip.itinerary || [])
      if (data.trip.status !== 'active') history.replace(`/trips/${tripId}/review`)
    }
    catch {}
  }, [sendRequest, tripId, auth.token, history])
  useEffect(() => { loadTrip() }, [loadTrip])
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(storageKey) || 'null'); if (saved) { setForm(current => ({ ...current, ...(saved.form || saved) })); if (saved.expenses) setExpenses(saved.expenses) } } catch {}
    setDraftLoaded(true)
  }, [storageKey])
  useEffect(() => { if (draftLoaded) localStorage.setItem(storageKey, JSON.stringify({ status: 'draft', form, expenses })) }, [storageKey, form, expenses, draftLoaded])
  useEffect(() => { const urls = images.map(file => URL.createObjectURL(file)); setPreviews(urls); return () => urls.forEach(URL.revokeObjectURL) }, [images])
  const change = event => {
    const { name, value } = event.target
    setForm(current => ({ ...current, [name]: value }))
    if (name === 'address') { setBrowserLocation(null); setGeoError('') }
  }
  const spent = useMemo(() => (trip?.stops || []).reduce((sum, stop) => sum + (stop.expenses || []).reduce((total, expense) => total + Number(expense.amount || 0), 0), 0) + expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0), [trip, expenses])
  const pickImages = async event => {
    const files = Array.from(event.target.files || []).slice(0, 10)
    setImages(files)
    setExifLocation(null)
    for (const file of files) { const coords = await readExifGps(file); if (coords) { setExifLocation(coords); break } }
  }
  const useMyLocation = async () => {
    setGeoError('')
    setLocationLoading(true)
    try {
      const result = await fetchCurrentLocation(sendRequest, auth.token)
      setBrowserLocation(result.location)
      if (result.address) setForm(current => ({ ...current, address: result.address }))
      if (result.error) { clearError(); setGeoError(`${result.error} Your coordinates were saved; enter an address if lookup is unavailable.`) }
    } catch (error) {
      setGeoError(error.message || 'Could not read your location. Enter an address instead.')
    } finally { setLocationLoading(false) }
  }
  const addExpense = () => setExpenses(current => [...current, { amount: '', category: 'Other', note: '' }])
  const updateExpense = (index, key, value) => setExpenses(current => current.map((item, i) => i === index ? { ...item, [key]: value } : item))
  const addStop = async event => {
    event.preventDefault()
    if (!images.length) return
    const data = new FormData()
    data.append('title', form.title); data.append('note', form.note); data.append('address', form.address)
    data.append('expenses', JSON.stringify(expenses.filter(item => item.amount !== '').map(item => ({ ...item, amount: Number(item.amount) }))))
    if (exifLocation) data.append('exifLocation', JSON.stringify(exifLocation))
    if (browserLocation) data.append('browserLocation', JSON.stringify(browserLocation))
    images.forEach(file => data.append('images', file))
    try {
      const response = await sendRequest(backendUrl(`api/trips/${tripId}/stops`), 'POST', data, { Authorization: `Bearer ${auth.token}` })
      setTrip(response.trip); setActiveTrip(response.trip); setForm({ title: '', note: '', address: '' }); setImages([]); setExifLocation(null); setBrowserLocation(null); setGeoError(''); setExpenses([{ amount: '', category: 'Other', note: '' }]); if (imageInputRef.current) imageInputRef.current.value = ''; localStorage.removeItem(storageKey)
    } catch {}
  }
  const stopTrip = async () => {
    try {
      const response = await sendRequest(backendUrl(`api/trips/${tripId}/stop`), 'PATCH', null, { Authorization: `Bearer ${auth.token}` })
      setTrip(response.trip); setActiveTrip(null); history.push(`/trips/${tripId}/review`)
    } catch {}
  }
  const saveItinerary = async () => {
    try {
      const data = await sendRequest(backendUrl(`api/trips/${tripId}`), 'PATCH', JSON.stringify({ itinerary: itinerary.filter(item => item.plannedPlace.trim()).map(item => ({ ...item, day: Math.max(1, Number(item.day) || 1) })) }), { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` })
      setTrip(data.trip)
    } catch {}
  }
  if (!trip) return <main className="trip-page"><ErrorModal error={error} onClear={clearError} /><LoadingText isLoading={isLoading} text="trip" />{!isLoading && <p>Trip not found or unavailable.</p>}</main>
  return <main className="trip-page">
    <ErrorModal error={error} onClear={clearError} /><LoadingText isLoading={isLoading} asOverlay text="trip" />
    <header className="trip-page__intro trip-page__intro--active"><span>TRIP IN PROGRESS</span><h1>{trip.title}</h1><p>{trip.summary?.days || 1} days · {trip.stops?.length || 0} stops · Spent {spent.toFixed(2)} / {Number(trip.plannedBudget || 0).toFixed(2)}</p><button className="trip-primary" type="button" onClick={stopTrip} disabled={isLoading}>{isLoading ? 'Stopping…' : 'Stop trip'}</button></header>
    <section className="trip-active-layout">
      <form className="trip-form" onSubmit={addStop}>
        <h2>Add a stop</h2>
        <label>Stop name<input name="title" value={form.title} onChange={change} required placeholder="Waterfall lookout" /></label>
        <label>Photos<input ref={imageInputRef} type="file" accept="image/jpeg,image/png" multiple onChange={pickImages} required /></label>
        {previews.length > 0 && <div className="trip-photo-preview">{previews.map(url => <img src={url} alt="Stop preview" key={url} />)}</div>}
        <label>Note<textarea name="note" value={form.note} onChange={change} rows="3" placeholder="What do you want to remember?" /></label>
        <label>Address<input name="address" value={form.address} onChange={change} placeholder="Address or place name" /></label>
        <button className="trip-secondary" type="button" onClick={useMyLocation} disabled={locationLoading || isLoading}>{locationLoading ? 'Finding location…' : 'Use my current location'}</button>
        {(exifLocation || browserLocation) && <small className="trip-location-hint">{exifLocation ? 'GPS found in photo and will be used.' : `Current location ready${form.address ? ' and address filled in.' : '.'}`}</small>}
        {geoError && <small role="alert" className="trip-error">{geoError}</small>}
        <div className="trip-expenses"><div className="trip-itinerary__heading"><h3>Expenses</h3><button type="button" onClick={addExpense}>Add expense</button></div>
          {expenses.map((item, index) => <div className="trip-expense-row" key={index}><input aria-label="Expense amount" type="number" min="0" step=".01" value={item.amount} placeholder="Amount" onChange={event => updateExpense(index, 'amount', event.target.value)} /><select aria-label="Expense category" value={item.category} onChange={event => updateExpense(index, 'category', event.target.value)}><option>Other</option><option>Food</option><option>Transport</option><option>Lodging</option><option>Tickets</option><option>Shopping</option></select><input aria-label="Expense note" value={item.note} placeholder="Note" onChange={event => updateExpense(index, 'note', event.target.value)} /></div>)}
        </div>
        <strong className="trip-budget-live">Live trip spend: {spent.toFixed(2)}</strong>
        <button className="trip-primary" type="submit" disabled={!form.title.trim() || !images.length || (!form.address.trim() && !exifLocation && !browserLocation) || isLoading}>Save stop</button>
      </form>
      <div className="trip-live-details"><h2>Route so far</h2><TripMap stops={trip.stops || []} /><TripItineraryEditor items={itinerary} onChange={setItinerary} /><button className="trip-secondary" type="button" onClick={saveItinerary}>Save itinerary</button><div className="trip-timeline">{[...(trip.stops || [])].sort((a,b) => new Date(a.visitedAt)-new Date(b.visitedAt)).map(stop => <article className="trip-stop-card" key={stop.id || stop._id}><div className="trip-stop-card__images">{stop.images?.map(image => <img src={backendImageUrl(image)} alt="" key={image} />)}</div><div><time>{new Date(stop.visitedAt).toLocaleString()}</time><h3>{stop.title}</h3><p>{stop.address}</p><p>{stop.note}</p><small>Spent: {(stop.expenses || []).reduce((sum, expense) => sum + Number(expense.amount), 0).toFixed(2)}</small></div></article>)}</div><Link className="trip-secondary trip-review-link" to={`/trips/${tripId}/review`}>Review trip</Link></div>
    </section>
  </main>
}

export default ActiveTrip
