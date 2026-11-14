import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { placeKey, useSavedPlaces } from '../../shared/components/context/saved-places-context'
import PlaceList from '../components/PlaceList'
import Modal from '../../shared/components/UIElements/Modal'
import { BookmarkIcon } from '../components/SavePlaceButton'
import './SavedPlaces.css'

const SavedPlaces = () => {
  const library = useSavedPlaces()
  const [selected, setSelected] = useState('all')
  const [editing, setEditing] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const current = library.collections.find(collection => collection.id === selected)
  const selection = selected === 'all' || selected === 'unsorted' || current ? selected : 'all'
  const items = useMemo(() => library.savedPlaces.filter(saved => selection === 'all' || (selection === 'unsorted' ? !saved.collectionId : saved.collectionId === selection)).slice().sort((a,b) => new Date(b.savedAt)-new Date(a.savedAt)).map(saved => ({ ...saved.place, id:placeKey(saved.place) })), [library.savedPlaces, selection])
  const collections = [{ id:'all', name:'All saved', count:library.savedPlaces.length }, { id:'unsorted', name:'Unsorted', count:library.savedPlaces.filter(saved => !saved.collectionId).length }, ...library.collections.map(collection => ({ ...collection, count:library.savedPlaces.filter(saved => saved.collectionId === collection.id).length }))]
  const busy = library.isBusy || library.isLoading
  const { refresh } = library
  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    if (selected !== 'all' && selected !== 'unsorted' && !current && !library.isLoading) {
      setSelected('all'); setEditing(''); setConfirmDelete(false)
      setError('This collection is no longer available. Showing your remaining saved places.')
    }
  }, [selected, current, library.isLoading])
  const edit = mode => { setEditing(mode); setName(mode === 'rename' ? current.name : ''); setError('') }
  const submit = async event => {
    event.preventDefault()
    if (busy || !name.trim()) return
    if (editing === 'rename' && !current) { setEditing(''); return }
    setError('')
    try {
      if (editing === 'rename') await library.renameCollection(current.id, name.trim())
      else { const result = await library.createCollection(name.trim()); setSelected(result.collection.id) }
      setEditing(''); setName('')
    } catch (requestError) { setError(requestError.message) }
  }
  const removeCollection = async () => {
    if (!current || busy) { setConfirmDelete(false); return }
    setError('')
    try { await library.deleteCollection(current.id); setSelected('all'); setConfirmDelete(false) }
    catch (requestError) { setError(requestError.message) }
  }
  return <main className="saved-page">
    <header className="saved-page__intro"><div><span>SNAPIT / PLACES TO COME BACK TO</span><h1>For another day<span>.</span></h1><p>A few discoveries, kept close. Your collections are private.</p></div><div className="saved-page__total"><strong>{library.savedPlaces.length}</strong><span>{library.savedPlaces.length === 1 ? 'place saved' : 'places saved'}</span></div></header>
    <div className="saved-page__layout">
      <aside className="saved-collections" aria-label="Saved place collections">
        <div className="saved-collections__heading"><h2>Your collections</h2><button type="button" onClick={() => edit('create')} disabled={busy || Boolean(library.loadError)} aria-label="Create collection">+</button></div>
        <nav aria-label="Filter saved collections">{collections.map(collection => <button key={collection.id} type="button" className={selection === collection.id ? 'is-selected' : ''} onClick={() => { setSelected(collection.id); setEditing(''); setError('') }} aria-pressed={selection === collection.id}><BookmarkIcon /><span>{collection.name}</span><small>{collection.count}</small></button>)}</nav>
        <p>Open a place and choose “Save place” to keep it here.</p>
      </aside>
      <section className="saved-page__content" aria-label="Saved places">
        <div className="saved-page__collection-heading"><div><span>YOUR PRIVATE ATLAS</span><h2>{current?.name || (selection === 'unsorted' ? 'Unsorted discoveries' : 'All saved places')}</h2></div>{current && <div className="saved-page__collection-actions"><button type="button" onClick={() => edit('rename')} disabled={busy}>Rename</button><button type="button" onClick={() => { setConfirmDelete(true); setError('') }} disabled={busy}>Remove collection</button></div>}</div>
        {editing && <form className="saved-collection-form" onSubmit={submit}><label htmlFor="collection-name">{editing === 'rename' ? 'Rename collection' : 'Start a collection'}</label><div><input id="collection-name" value={name} onChange={event => setName(event.target.value)} maxLength={60} required placeholder="Weekend escapes" disabled={busy} autoFocus /><button type="submit" disabled={busy || !name.trim()}>{library.isBusy ? 'Saving…' : editing === 'rename' ? 'Rename' : 'Create'}</button><button type="button" onClick={() => { setEditing(''); setError('') }} disabled={busy}>Cancel</button></div></form>}
        {error && !confirmDelete && <p className="collection-error" role="alert">{error}</p>}
        {library.loadError && <div className={items.length ? 'saved-page__error' : 'saved-page__empty'} role="alert"><h3>{items.length ? 'Couldn’t refresh your collection.' : 'Couldn’t open your collection.'}</h3><p>{library.loadError}</p><button type="button" className="button button--inverse" onClick={library.refresh} disabled={busy}>Try again</button></div>}
        {library.isLoading && <p className="saved-page__loading" role="status">Opening your saved places…</p>}
        {items.length ? <PlaceList items={items} includeTripFeed={false} onDeletePlace={id => library.removePlace(String(id)).catch(() => {})} /> : !library.isLoading && !library.loadError && <div className="saved-page__empty"><BookmarkIcon /><h3>{selection === 'all' ? 'A little room for possibility.' : 'Your next discovery belongs here.'}</h3><p>{selection === 'all' ? 'Save places that catch your eye, then gather them into collections for a future trip.' : 'Choose this collection when saving a place, or move a saved place here from its details.'}</p><Link className="button button--inverse" to="/">Explore places <span aria-hidden="true">↗</span></Link></div>}
      </section>
    </div>
    <Modal show={confirmDelete} onCancel={() => { if (!library.isBusy) setConfirmDelete(false) }} header="Remove this collection?" footer={<div className="save-place-dialog__actions"><button type="button" className="button button--inverse" onClick={() => setConfirmDelete(false)} disabled={library.isBusy}>Keep collection</button><button type="button" className="button button--danger" onClick={removeCollection} disabled={library.isBusy}>Remove collection</button></div>}><p>All places in “{current?.name}” will also be removed from your saved places.</p>{error && <p className="collection-error" role="alert">{error}</p>}</Modal>
  </main>
}
export default SavedPlaces
