import React, { useContext, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AuthContext } from '../../shared/components/context/auth-context'
import { placeKey, useSavedPlaces } from '../../shared/components/context/saved-places-context'
import Modal from '../../shared/components/UIElements/Modal'
import './SavePlaceButton.css'

export const BookmarkIcon = () => <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-4-6 4V4Z" /></svg>

const SavePlaceButton = ({ place }) => {
  const auth = useContext(AuthContext)
  const location = useLocation()
  const library = useSavedPlaces()
  const saved = library.getSavedPlace(placeKey(place))
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const disabled = library.isBusy || library.isLoading
  useEffect(() => {
    if (open && selected && !disabled && !library.collections.some(collection => collection.id === selected)) setSelected('')
  }, [open, selected, disabled, library.collections])
  const showPicker = () => { setSelected(saved?.collectionId || ''); setName(''); setError(''); setOpen(true) }
  const close = () => { if (!library.isBusy) setOpen(false) }
  const save = async event => {
    event.preventDefault()
    if (disabled) return
    setError('')
    try {
      let collectionId = selected || null
      let collectionName = library.collections.find(collection => collection.id === collectionId)?.name || 'Unsorted'
      if (name.trim()) {
        const result = await library.createCollection(name.trim())
        collectionId = result.collection.id
        collectionName = result.collection.name
        setSelected(collectionId)
        setName('')
      }
      await library.savePlace(place, collectionId)
      setOpen(false)
      setMessage(`Saved to ${collectionName}.`)
    } catch (requestError) { setError(requestError.message) }
  }
  const remove = async () => {
    setError('')
    try { await library.removePlace(placeKey(place)); setOpen(false); setMessage('Removed from saved places.') }
    catch (requestError) { setError(requestError.message) }
  }
  if (!auth.isLoggedIn) return <Link className="save-place-button" to="/auth"><BookmarkIcon />Sign in to save</Link>
  return <div className="save-place-control">
    <button className={`save-place-button${saved ? ' is-saved' : ''}`} type="button" onClick={showPicker} disabled={disabled} aria-label={saved ? 'Manage saved place' : 'Save place'}><BookmarkIcon />{saved ? 'Saved' : 'Save place'}</button>
    {message && <small role="status">{message}</small>}
    <Modal show={open} onCancel={close} onSubmit={save} className="save-place-dialog" dialogLabel="Save place to a collection" header={<span>Keep this for another day.</span>} footer={<div className="save-place-dialog__actions"><button className="button button--inverse" type="button" onClick={close} disabled={library.isBusy}>Cancel</button><button className="button" type="submit" disabled={disabled || Boolean(library.loadError)}>{library.isBusy ? 'Saving…' : saved ? 'Save changes' : 'Save place'}</button></div>}>
      <p className="save-place-dialog__place">{place.title}</p>
      <fieldset className="collection-picker" disabled={disabled}>
        <legend>Choose a collection</legend>
        {[{ id:'', name:'Unsorted' }, ...library.collections].map(collection => <label key={collection.id}><input type="radio" name={`save-collection-${placeKey(place)}`} value={collection.id} checked={selected === collection.id} onChange={() => { setSelected(collection.id); setName('') }} /><span>{collection.name}</span>{selected === collection.id && <span aria-hidden="true">↗</span>}</label>)}
      </fieldset>
      <label className="collection-new">Or start a new collection<input value={name} onChange={event => setName(event.target.value)} maxLength={60} placeholder="Weekend escapes" disabled={disabled} /></label>
      {library.loadError && <p className="collection-error" role="alert">{library.loadError} <button type="button" onClick={library.refresh} disabled={disabled}>Try again</button></p>}
      {error && <p className="collection-error" role="alert">{error}</p>}
      {saved && <button type="button" className="collection-remove" onClick={remove} disabled={disabled}>Remove from saved places</button>}
      {location.pathname !== '/saved' && <Link className="collection-library-link" to="/saved">Open saved places <span aria-hidden="true">↗</span></Link>}
    </Modal>
  </div>
}
export default SavePlaceButton
