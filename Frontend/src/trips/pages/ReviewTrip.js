import React, { useCallback, useContext, useEffect, useState } from 'react'
import { Link, useHistory, useParams } from 'react-router-dom'
import { AuthContext } from '../../shared/components/context/auth-context'
import { useTrip } from '../../shared/components/context/trip-context'
import { LoadingText, TripItineraryEditor, TripMap } from '../../shared/components/UI'
import { backendUrl, backendImageUrl } from '../../shared/Utils/backend-url'
import { useHttpClient } from '../../shared/hooks/http-hook'
import ErrorModal from '../../shared/components/UIElements/ErrorModal'
import './TripPages.css'

const LANGUAGES = [['es','Spanish'],['fr','French'],['de','German'],['hi','Hindi'],['ja','Japanese'],['pt','Portuguese']]

const ReviewTrip = () => {
  const { tripId } = useParams()
  const auth = useContext(AuthContext)
  const { refreshActiveTrip, setActiveTrip } = useTrip()
  const history = useHistory()
  const { isLoading, error, clearError, sendRequest } = useHttpClient()
  const [trip, setTrip] = useState(null)
  const [cover, setCover] = useState(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [message, setMessage] = useState('')
  const [language, setLanguage] = useState('')
  const [translatedTrip, setTranslatedTrip] = useState(null)
  const [translationError, setTranslationError] = useState('')
  const load = useCallback(async () => {
    try { const data = await sendRequest(backendUrl(`api/trips/${tripId}`), 'GET', null, { Authorization: `Bearer ${auth.token}` }); setTrip(data.trip) }
    catch {}
  }, [sendRequest, tripId, auth.token])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (!cover) { setCoverPreview(''); return undefined } const url = URL.createObjectURL(cover); setCoverPreview(url); return () => URL.revokeObjectURL(url) }, [cover])
  const editStop = (id, key, value) => setTrip(current => ({ ...current, stops: current.stops.map(stop => String(stop.id || stop._id) === String(id) ? { ...stop, [key]: value } : stop) }))
  const editExpense = (id, index, key, value) => setTrip(current => ({ ...current, stops: current.stops.map(stop => String(stop.id || stop._id) === String(id) ? { ...stop, expenses: stop.expenses.map((expense, i) => i === index ? { ...expense, [key]: value } : expense) } : stop) }))
  const addExpense = id => setTrip(current => ({ ...current, stops: current.stops.map(stop => String(stop.id || stop._id) === String(id) ? { ...stop, expenses: [...stop.expenses, { amount: 0, category: 'Other', note: '' }] } : stop) }))
  const removeExpense = (id, index) => setTrip(current => ({ ...current, stops: current.stops.map(stop => String(stop.id || stop._id) === String(id) ? { ...stop, expenses: stop.expenses.filter((_, i) => i !== index) } : stop) }))
  const saveStop = async stop => {
    const form = new FormData(); form.append('title', stop.title); form.append('note', stop.note || ''); form.append('address', stop.address || ''); form.append('visitedAt', stop.visitedAt); form.append('keepImages', JSON.stringify(stop.images || [])); form.append('expenses', JSON.stringify(stop.expenses || []))
    try { const data = await sendRequest(backendUrl(`api/trips/${tripId}/stops/${stop.id || stop._id}`), 'PATCH', form, { Authorization: `Bearer ${auth.token}` }); setTrip(data.trip); setMessage('Stop saved.') }
    catch {}
  }
  const deleteStop = async id => {
    try { const data = await sendRequest(backendUrl(`api/trips/${tripId}/stops/${id}`), 'DELETE', null, { Authorization: `Bearer ${auth.token}` }); setTrip(data.trip); setMessage('Stop removed.') }
    catch {}
  }
  const stopTrip = async () => {
    try {
      const data = await sendRequest(backendUrl(`api/trips/${tripId}/stop`), 'PATCH', null, { Authorization: `Bearer ${auth.token}` })
      setTrip(data.trip); setActiveTrip(null); setMessage('Trip stopped. You can resume it or publish it.')
    } catch {}
  }
  const resumeTrip = async () => {
    try {
      const data = await sendRequest(backendUrl(`api/trips/${tripId}/resume`), 'PATCH', null, { Authorization: `Bearer ${auth.token}` })
      setTrip(data.trip); setActiveTrip(data.trip); history.push(`/trips/${tripId}`)
    } catch {}
  }
  const publish = async event => {
    event.preventDefault(); setMessage('')
    const form = new FormData(); form.append('title', trip.title); form.append('visibility', trip.visibility); form.append('itinerary', JSON.stringify(trip.itinerary || [])); if (cover) form.append('coverImage', cover)
    try {
      const data = await sendRequest(backendUrl(`api/trips/${tripId}/publish`), 'PATCH', form, { Authorization: `Bearer ${auth.token}` })
      setTrip(data.trip); localStorage.removeItem(`snapit-stop-draft-${tripId}`); await refreshActiveTrip(); setMessage('Trip published!'); history.push(`/${auth.userId}/places`)
    } catch {}
  }
  const translateTrip = async event => {
    const target = event.target.value
    setLanguage(target)
    setTranslatedTrip(null)
    setTranslationError('')
    if (!target || !trip) return

    const fields = [{ type: 'trip', field: 'title', text: trip.title }]
    ;(trip.itinerary || []).forEach((item, index) => {
      if (String(item.plannedPlace || '').trim()) fields.push({ type: 'itinerary', index, field: 'plannedPlace', text: item.plannedPlace })
    })
    ;(trip.stops || []).forEach(stop => {
      const stopId = String(stop.id || stop._id)
      ;['title', 'address', 'note'].forEach(field => {
        if (String(stop[field] || '').trim()) fields.push({ type: 'stop', stopId, field, text: stop[field] })
      })
    })

    try {
      const results = await Promise.all(fields.map(({ text }) => sendRequest(
        backendUrl('api/translate'), 'POST', JSON.stringify({ text: String(text).slice(0, 5000), target }), { 'Content-Type': 'application/json' }
      )))
      const nextTranslation = { title: trip.title, stops: {}, itinerary: (trip.itinerary || []).map(item => ({ ...item })) }
      fields.forEach((field, index) => {
        if (field.type === 'trip') nextTranslation.title = results[index].translatedText
        else if (field.type === 'itinerary') nextTranslation.itinerary[field.index].plannedPlace = results[index].translatedText
        else {
          nextTranslation.stops[field.stopId] = nextTranslation.stops[field.stopId] || {}
          nextTranslation.stops[field.stopId][field.field] = results[index].translatedText
        }
      })
      setTranslatedTrip(nextTranslation)
    } catch (error) { setTranslationError(error.message || 'Google Translate could not translate this trip.') }
  }
  const deleteTrip = async () => {
    if (!window.confirm('Delete this trip and all of its stop photos?')) return
    try { await sendRequest(backendUrl(`api/trips/${tripId}`), 'DELETE', null, { Authorization: `Bearer ${auth.token}` }); await refreshActiveTrip(); history.push('/') }
    catch {}
  }
  if (!trip) return <main className="trip-page"><ErrorModal error={error} onClear={clearError} /><LoadingText isLoading={isLoading} text="trip" />{!isLoading && <p>Trip not found.</p>}</main>
  const totalExpenses = trip.summary?.totalSpent || 0
  const canPublish = trip.status === 'completed'
  const readOnly = trip.status === 'published'
  const creatorId = trip.creator && typeof trip.creator === 'object' ? (trip.creator.id || trip.creator._id) : trip.creator
  const isCreator = String(creatorId || '') === String(auth.userId || '')
  return <main className="trip-page">
    <ErrorModal error={error} onClear={clearError} /><LoadingText isLoading={isLoading} asOverlay text="trip" />
    <header className="trip-page__intro"><span>{readOnly ? 'PUBLISHED TRIP' : canPublish ? 'READY TO SHARE' : trip.status.toUpperCase()}</span><h1>{readOnly ? (translatedTrip?.title ?? trip.title) : 'Review your trip'}</h1><p>{readOnly ? 'Trip journal and route.' : 'Make any final changes. Publishing is a separate step.'}</p>
      {readOnly && <div className="trip-translate-control"><label>Translate with Google
        <select value={language} onChange={translateTrip}><option value="">Choose language</option>{LANGUAGES.map(([code,name]) => <option key={code} value={code}>{name}</option>)}</select>
      </label>{translationError && <small role="status" className="trip-error">{translationError}</small>}</div>}
    </header>
    <section className="trip-review-stats"><article><span>Days</span><strong>{trip.summary?.days || 1}</strong></article><article><span>Stops</span><strong>{trip.summary?.stopCount || 0}</strong></article><article><span>Spent</span><strong>{totalExpenses.toFixed(2)}</strong></article><article><span>Planned budget</span><strong>{Number(trip.plannedBudget || 0).toFixed(2)}</strong></article><article><span>Distance</span><strong>{trip.summary?.distanceTravelled || 0} km</strong></article></section>
    <section className="trip-review-layout">
      <form className="trip-form" onSubmit={publish}>
        <h2>Trip details</h2>
        <label>Title<input value={readOnly ? (translatedTrip?.title ?? trip.title) : trip.title} disabled={readOnly} onChange={event => setTrip(current => ({ ...current, title: event.target.value }))} required /></label>
        <label>Visibility<select value={trip.visibility} disabled={readOnly} onChange={event => setTrip(current => ({ ...current, visibility: event.target.value }))}><option value="private">Private</option><option value="followers">Followers</option><option value="public">Public</option></select></label>
        {!readOnly && <label>Cover photo<input type="file" accept="image/jpeg,image/png" onChange={event => setCover(event.target.files?.[0] || null)} /></label>}
        {(coverPreview || trip.coverImage) && <img className="trip-review-cover" src={coverPreview || backendImageUrl(trip.coverImage)} alt="Trip cover preview" />}
        <TripItineraryEditor items={readOnly && translatedTrip?.itinerary ? translatedTrip.itinerary : (trip.itinerary || [])} disabled={readOnly} onChange={itinerary => setTrip(current => ({ ...current, itinerary }))} />
        {trip.status === 'active' && <p className="trip-page__hint">Stop the active trip before publishing it.</p>}
        {!readOnly && <div className="trip-review-actions">
          {trip.status === 'active' && <button type="button" onClick={stopTrip} disabled={isLoading}>{isLoading ? 'Stopping…' : 'Stop trip'}</button>}
          {trip.status === 'completed' && <button type="button" onClick={resumeTrip} disabled={isLoading}>{isLoading ? 'Resuming…' : 'Resume trip'}</button>}
          {trip.status === 'completed' && <button type="submit" disabled={isLoading}>{isLoading ? 'Publishing…' : 'Publish Trip'}</button>}
          <button type="button" className="trip-danger" onClick={deleteTrip} disabled={isLoading}>Delete trip</button>
        </div>}
        {readOnly && isCreator && <div className="trip-review-actions"><button type="button" className="trip-danger" onClick={deleteTrip} disabled={isLoading}>Delete trip</button></div>}
        {message && <p role="status">{message}</p>}
      </form>
      <div className="trip-live-details"><TripMap stops={trip.stops || []} /><div className="trip-timeline">{[...(trip.stops || [])].sort((a,b) => new Date(a.visitedAt)-new Date(b.visitedAt)).map(stop => <article className="trip-review-card" key={stop.id || stop._id}>
        <div className="trip-stop-card__images">{stop.images?.map(image => <img src={backendImageUrl(image)} alt="Stop" key={image} />)}</div>
        <label>Stop name<input value={readOnly ? (translatedTrip?.stops?.[String(stop.id || stop._id)]?.title ?? stop.title) : stop.title} disabled={readOnly} onChange={event => editStop(stop.id || stop._id, 'title', event.target.value)} /></label>
        <label>Address<input value={readOnly ? (translatedTrip?.stops?.[String(stop.id || stop._id)]?.address ?? stop.address ?? '') : (stop.address || '')} disabled={readOnly} onChange={event => editStop(stop.id || stop._id, 'address', event.target.value)} /></label>
        <label>Note<textarea rows="3" value={readOnly ? (translatedTrip?.stops?.[String(stop.id || stop._id)]?.note ?? stop.note ?? '') : (stop.note || '')} disabled={readOnly} onChange={event => editStop(stop.id || stop._id, 'note', event.target.value)} /></label>
        <label>Visited at<input type="datetime-local" disabled={readOnly} value={new Date(stop.visitedAt).toISOString().slice(0,16)} onChange={event => editStop(stop.id || stop._id, 'visitedAt', new Date(event.target.value).toISOString())} /></label>
        <strong>Expenses</strong>
        {(stop.expenses || []).map((expense, index) => <div className="trip-expense-row" key={expense._id || index}><input type="number" min="0" step=".01" aria-label="Expense amount" disabled={readOnly} value={expense.amount} onChange={event => editExpense(stop.id || stop._id, index, 'amount', Number(event.target.value))} /><select aria-label="Expense category" disabled={readOnly} value={expense.category} onChange={event => editExpense(stop.id || stop._id, index, 'category', event.target.value)}><option>Other</option><option>Food</option><option>Transport</option><option>Lodging</option><option>Tickets</option><option>Shopping</option></select><input aria-label="Expense note" disabled={readOnly} value={expense.note || ''} onChange={event => editExpense(stop.id || stop._id, index, 'note', event.target.value)} />{!readOnly && <button type="button" onClick={() => removeExpense(stop.id || stop._id, index)}>×</button>}</div>)}
        {!readOnly && <button type="button" className="trip-secondary" onClick={() => addExpense(stop.id || stop._id)}>Add expense</button>}
        <small>{(stop.expenses || []).reduce((sum, expense) => sum + Number(expense.amount), 0).toFixed(2)} total expenses · {new Date(stop.visitedAt).toLocaleString()}</small>
        {!readOnly && <div className="trip-review-actions"><button type="button" onClick={() => saveStop(stop)}>Save stop</button><button type="button" className="trip-danger" onClick={() => deleteStop(stop.id || stop._id)}>Remove stop</button></div>}
      </article>)}</div>{!readOnly && !trip.stops?.length && <Link className="trip-secondary" to={`/trips/${tripId}`}>Add your first stop</Link>}</div>
    </section>
  </main>
}

export default ReviewTrip
