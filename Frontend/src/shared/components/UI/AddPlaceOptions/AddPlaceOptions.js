import React from 'react'
import { Link } from 'react-router-dom'
import './AddPlaceOptions.css'

const AddPlaceOptions = ({ onClose }) => <section className="add-place-options" aria-label="Create">
  <header className="add-place-options__header">
    <h2>Create</h2>
    <button type="button" onClick={onClose} aria-label="Close create panel">×</button>
  </header>
  <div className="add-place-options__list">
    <Link className="add-place-option" to="/places/new/place">
      <span className="add-place-option__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
      </span>
      <span className="add-place-option__copy">
        <strong>Add a place</strong>
        <span className="add-place-option__description">Post a place with photos, details, and its location.</span>
      </span>
    </Link>
    <Link className="add-place-option add-place-option--trip" to="/places/new/trip">
      <span className="add-place-option__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none"><path d="M3 17.5 8.5 12l4 3.5L21 6"/><path d="M15.5 6H21v5.5"/><circle cx="5" cy="18" r="1"/><circle cx="19" cy="18" r="1"/></svg>
      </span>
      <span className="add-place-option__copy">
        <strong>Start a trip</strong>
        <span className="add-place-option__description">Add stops, photos, notes, and expenses along your route.</span>
      </span>
    </Link>
  </div>
</section>

export default AddPlaceOptions
