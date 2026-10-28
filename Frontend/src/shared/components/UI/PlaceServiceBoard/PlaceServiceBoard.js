import React, { useMemo, useState } from 'react'
import { backendImageUrl } from '../../../Utils/backend-url'
import './PlaceServiceBoard.css'

const count = value => Number(value || 0).toLocaleString()

const PlaceServiceBoard = ({ places = [] }) => {
  const [selectedId, setSelectedId] = useState(places[0]?.id || places[0]?._id || null)
  const selectedPlace = useMemo(() => places.find(place => String(place.id || place._id) === String(selectedId)) || places[0], [places, selectedId])

  if (!places.length) return <section className="place-service-board place-service-board--empty"><h2>Your places</h2><p>Share a place to see its activity here.</p></section>

  const selectedIdValue = String(selectedPlace.id || selectedPlace._id)
  const likes = selectedPlace.likes?.length || 0
  const comments = selectedPlace.comments?.length || 0
  const shares = selectedPlace.shareCount || 0
  const maxActivity = Math.max(likes, comments, shares, 1)
  const image = selectedPlace.images?.[0] || selectedPlace.image

  return <section className="place-service-board" aria-label="Place activity board">
    <div className="place-service-board__header">
      <div><p className="place-service-board__eyebrow">PLACES / IN DETAIL</p><h2>Place activity</h2></div>
      <span>{places.length} {places.length === 1 ? 'place' : 'places'}</span>
    </div>
    <div className="place-service-board__layout">
      <nav className="place-service-board__list" aria-label="Select a place">
        {places.map(place => {
          const id = String(place.id || place._id)
          const cover = place.images?.[0] || place.image
          return <button className={`place-service-board__item ${id === selectedIdValue ? 'is-active' : ''}`} key={id} type="button" onClick={() => setSelectedId(id)} aria-pressed={id === selectedIdValue}>
            {cover ? <img src={backendImageUrl(cover)} alt="" /> : <span className="place-service-board__placeholder">⌖</span>}
            <span className="place-service-board__item-copy"><strong>{place.title}</strong><small>{place.address}</small></span>
            <span className="place-service-board__item-count">♥ {place.likes?.length || 0}</span>
          </button>
        })}
      </nav>
      <article className="place-service-board__detail" aria-live="polite">
        <div className="place-service-board__place-heading">
          {image && <img className="place-service-board__cover" src={backendImageUrl(image)} alt={selectedPlace.title} />}
          <div><p className="place-service-board__eyebrow">SELECTED PLACE</p><h3>{selectedPlace.title}</h3><p>{selectedPlace.address}</p></div>
        </div>
        {selectedPlace.description && <p className="place-service-board__description">{selectedPlace.description}</p>}
        <div className="place-service-board__stats">
          <div><span>Likes</span><strong>{count(likes)}</strong></div>
          <div><span>Comments</span><strong>{count(comments)}</strong></div>
          <div><span>Shares</span><strong>{count(shares)}</strong></div>
        </div>
        <div className="place-service-board__activity">
          <div className="place-service-board__activity-heading"><h4>Engagement</h4><span>By interaction</span></div>
          {[['Likes', likes], ['Comments', comments], ['Shares', shares]].map(([label, value]) => <div className="place-service-board__bar-row" key={label}>
            <span>{label}</span><div className="place-service-board__track"><i style={{ width: `${Math.max(value ? 6 : 0, value / maxActivity * 100)}%` }} /></div><strong>{count(value)}</strong>
          </div>)}
        </div>
        <div className="place-service-board__comments">
          <div className="place-service-board__activity-heading"><h4>Recent comments</h4><span>{comments} total</span></div>
          {comments ? selectedPlace.comments.slice(-3).reverse().map((comment, index) => <div className="place-service-board__comment" key={comment._id || `${comment.text}-${index}`}>
            <span className="place-service-board__avatar">{(comment.author?.name || 'V').slice(0, 1).toUpperCase()}</span>
            <div><strong>{comment.author?.name || 'Visitor'}</strong><p>{comment.text}</p></div>
          </div>) : <p className="place-service-board__muted">No comments yet.</p>}
        </div>
      </article>
    </div>
  </section>
}

export default PlaceServiceBoard
