import React, { useContext, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../../shared/components/context/auth-context'
import { useHttpClient } from '../../shared/hooks/http-hook'
import { backendUrl, backendImageUrl } from '../../shared/Utils/backend-url'
import { PulseHeart } from '../../shared/components/UI'
import GoogleSearchButton from '../../shared/components/UIElements/GoogleSearchButton'
import './TripFeed.css'

const LANGUAGES = [['es','Spanish'],['fr','French'],['de','German'],['hi','Hindi'],['ja','Japanese'],['pt','Portuguese']]
const formatCount = count => count >= 1000 ? `${(count / 1000).toFixed(count >= 10000 ? 0 : 1).replace(/\.0$/,'')}K` : String(count)

export const TripFeedCard = ({ trip }) => {
  const auth = useContext(AuthContext)
  const { sendRequest } = useHttpClient()
  const commentInputRef = useRef(null)
  const id = trip.id || trip._id
  const [likes, setLikes] = useState(trip.likes || [])
  const [comments, setComments] = useState(trip.comments || [])
  const [shares, setShares] = useState(trip.shareCount || 0)
  const [commentText, setCommentText] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [actionError, setActionError] = useState('')
  const [language, setLanguage] = useState('')
  const [translatedTitle, setTranslatedTitle] = useState('')
  const [translateError, setTranslateError] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)

  useEffect(() => {
    setLikes(trip.likes || [])
    setComments(trip.comments || [])
    setShares(trip.shareCount || 0)
  }, [trip.id, trip._id, trip.likes, trip.comments, trip.shareCount])

  if (!id) return null

  const cover = trip.coverImage || trip.stops?.find(stop => stop.images?.length)?.images?.[0]
  const stopCount = trip.summary?.stopCount ?? trip.stops?.length ?? 0
  const days = trip.summary?.days || 1
  const distance = trip.summary?.distanceTravelled || 0
  const searchStop = trip.stops?.find(stop => stop.title || stop.address)
  const searchQuery = [trip.title, searchStop?.title, searchStop?.address || trip.startAddress].filter(Boolean).join(' ')
  const liked = likes.some(like => String(like?._id || like) === String(auth.userId))

  const toggleLike = async () => {
    if (!auth.token) return
    setActionError('')
    try {
      const result = await sendRequest(backendUrl(`api/trips/${id}/like`), 'POST', null, { Authorization: `Bearer ${auth.token}` })
      setLikes(result.likes || [])
    } catch (error) { setActionError(error.message || 'Could not update like.') }
  }

  const addComment = async event => {
    event.preventDefault()
    if (!auth.token || !commentText.trim()) return
    setActionError('')
    try {
      const result = await sendRequest(backendUrl(`api/trips/${id}/comments`), 'POST', JSON.stringify({ text: commentText }), {
        'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}`
      })
      setComments(current => [...current, result.comment])
      setCommentText('')
    } catch (error) { setActionError(error.message || 'Could not add comment.') }
  }

  const shareTrip = async () => {
    if (!auth.token) return
    setActionError('')
    const url = `${window.location.origin}/trips/${id}/review`
    try {
      if (navigator.share) await navigator.share({ title: trip.title, text: `Trip journal by ${trip.creator?.name || 'a SnapIt! traveler'}`, url })
      else await navigator.clipboard.writeText(url)
      const result = await sendRequest(backendUrl(`api/trips/${id}/share`), 'POST', null, { Authorization: `Bearer ${auth.token}` })
      setShares(result.shares)
    } catch (error) {
      if (error.name !== 'AbortError') setActionError(error.message || 'Unable to share this trip from this browser.')
    }
  }

  const translateTitle = async event => {
    const target = event.target.value
    setLanguage(target)
    setTranslatedTitle('')
    setTranslateError('')
    if (!target) return
    setIsTranslating(true)
    try {
      const result = await sendRequest(backendUrl('api/translate'), 'POST', JSON.stringify({ text: trip.title, target }), { 'Content-Type': 'application/json' })
      setTranslatedTitle(result.translatedText)
    } catch (error) { setTranslateError(error.message || 'Could not translate this trip.') }
    finally { setIsTranslating(false) }
  }

  return <article className="trip-feed__post">
    <Link className="trip-feed__inline-card" to={`/trips/${id}/review`}>
      {cover
        ? <img src={backendImageUrl(cover)} alt="" />
        : <div className="trip-feed__inline-placeholder">Trip journal</div>}
      <div className="trip-feed__inline-content">
        <span className="trip-feed__eyebrow">TRIP JOURNAL</span>
        <h2>{translatedTitle || trip.title}</h2>
        <p className="trip-feed__byline">{trip.creator?.name || 'SnapIt! traveler'}</p>
        <small className="trip-feed__route-stats"><span><strong>{days}</strong> days</span><span><strong>{stopCount}</strong> stops</span><span><strong>{distance}</strong> km</span></small>
        <span className="trip-feed__open">View trip journal <span aria-hidden="true">↗</span></span>
      </div>
    </Link>

    <div className="trip-feed__actions" aria-label="Trip engagement">
      <GoogleSearchButton query={searchQuery} />
      <PulseHeart className="trip-feed__action trip-feed__like" liked={liked} count={likes.length} onChange={toggleLike} disabled={!auth.isLoggedIn} size={22} label={liked ? 'Unlike trip' : 'Like trip'} title={`${likes.length} likes`} />
      {auth.isLoggedIn && <button className="trip-feed__action" type="button" onClick={() => { setShowComments(value => !value); setTimeout(() => commentInputRef.current?.focus(), 0) }} aria-expanded={showComments} aria-label="Show trip comments" title={`${comments.length} comments`}>
        <svg viewBox="0 0 28 28" aria-hidden="true"><path d="M24.5 13.2a10.6 10.6 0 0 1-11 10.2 11.7 11.7 0 0 1-5.1-1.2L3 24l1.8-4.5a9.8 9.8 0 0 1-2.3-6.3A10.6 10.6 0 0 1 13.5 3a10.6 10.6 0 0 1 11 10.2Z" /></svg>
        <span>{formatCount(comments.length)}</span>
      </button>}
      <button className="trip-feed__action" type="button" onClick={shareTrip} disabled={!auth.isLoggedIn} aria-label="Share trip" title={auth.isLoggedIn ? `${shares} shares` : 'Sign in to share this trip'}>
        <svg viewBox="0 0 28 28" aria-hidden="true"><path d="m4 13 19-9-6.5 20-3.7-8.2L4 13Z" /><path d="m12.8 15.8 5.3-5.2" /></svg>
        <span>{formatCount(shares)}</span>
      </button>
      <label className="trip-feed__translate">Translate
        <select value={language} onChange={translateTitle} aria-label="Translate trip title">
          <option value="">Google Translate</option>
          {LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
        </select>
      </label>
      {isTranslating && <span className="trip-feed__action-note" role="status">Translating…</span>}
    </div>

    {translatedTitle && <p className="trip-feed__translation" lang={language}>{translatedTitle}</p>}
    {(actionError || translateError) && <p className="trip-feed__error" role="status">{actionError || translateError}</p>}

    {auth.isLoggedIn && showComments && <section className="trip-feed__comments" aria-label={`Comments on ${trip.title}`}>
      <h3>Comments ({comments.length})</h3>
      {comments.length ? <div className="trip-feed__comment-list">{comments.map((comment, index) => <p key={comment._id || `${comment.text}-${index}`}><strong>{comment.author?.name || 'Traveler'}:</strong> {comment.text}</p>)}</div> : <p className="trip-feed__empty-comments">No comments yet.</p>}
      <form onSubmit={addComment}>
        <input ref={commentInputRef} aria-label="Write a trip comment" maxLength="1000" value={commentText} onChange={event => setCommentText(event.target.value)} placeholder="Write a comment…" />
        <button type="submit" disabled={!commentText.trim()}>Post</button>
      </form>
    </section>}
  </article>
}

export default TripFeedCard
