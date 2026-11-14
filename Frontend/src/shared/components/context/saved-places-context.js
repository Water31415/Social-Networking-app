import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AuthContext } from './auth-context'
import { backendUrl } from '../../Utils/backend-url'
import { useHttpClient } from '../../hooks/http-hook'

const emptyLibrary = () => ({ collections:[], savedPlaces:[] })
const endedSession = () => Object.assign(new Error('This saved-place action belongs to an ended session'), { name:'AbortError' })
const SavedPlacesContext = createContext({ ...emptyLibrary(), isLoading:false, isBusy:false, loadError:'', getSavedPlace:() => null, refresh:async () => {}, savePlace:async () => {}, removePlace:async () => {}, createCollection:async () => {}, renameCollection:async () => {}, deleteCollection:async () => {} })
export const useSavedPlaces = () => useContext(SavedPlacesContext)
export const placeKey = place => String(place?.id || place?._id || '')

export const SavedPlacesProvider = ({ children }) => {
  const auth = useContext(AuthContext)
  const { sendRequest } = useHttpClient()
  const [library, setLibrary] = useState(emptyLibrary)
  const [isLoading, setLoading] = useState(Boolean(auth.token))
  const [isBusy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState('')
  const token = useRef(auth.token)
  token.current = auth.token
  const generation = useRef(0)
  const mutationPending = useRef(false)
  const active = useRef(true)
  const reading = useRef(null)
  const loaded = useRef(false)
  const invalidate = useCallback(() => { generation.current++; reading.current = null }, [])
  const headers = useMemo(() => ({ Authorization:`Bearer ${auth.token}`, 'Content-Type':'application/json' }), [auth.token])
  const refresh = useCallback(() => {
    if (!auth.token || !active.current || mutationPending.current) return Promise.resolve()
    if (reading.current?.token === auth.token) return reading.current.promise
    const version = ++generation.current
    if (!loaded.current) setLoading(true)
    setLoadError('')
    const promise = (async () => {
      try {
        const data = await sendRequest(backendUrl('api/users/me/saved'), 'GET', null, headers)
        if (version === generation.current && token.current === auth.token && active.current) {
          loaded.current = true
          setLibrary({ collections:data.collections || [], savedPlaces:data.savedPlaces || [] })
        }
      } catch (error) {
        if (version === generation.current && token.current === auth.token && active.current && error.name !== 'AbortError') setLoadError(error.message)
      } finally {
        if (reading.current?.version === version) reading.current = null
        if (version === generation.current && token.current === auth.token && active.current) setLoading(false)
      }
    })()
    reading.current = { version, token:auth.token, promise }
    return promise
  }, [auth.token, headers, sendRequest])
  useEffect(() => {
    active.current = true
    loaded.current = false
    setLibrary(emptyLibrary())
    setLoadError('')
    setBusy(false)
    mutationPending.current = false
    if (auth.token) refresh()
    else setLoading(false)
    return () => { active.current = false; invalidate() }
  }, [auth.token, refresh, invalidate])

  useEffect(() => {
    const updated = event => {
      const place = event.detail?.place
      if (!placeKey(place)) return
      setLibrary(current => ({ ...current, savedPlaces:current.savedPlaces.map(saved => placeKey(saved.place) === placeKey(place) ? { ...saved, place:{ ...saved.place, ...place } } : saved) }))
      if (reading.current) { invalidate(); refresh() }
    }
    const deleted = event => {
      const id = String(event.detail?.id || '')
      if (id) setLibrary(current => ({ ...current, savedPlaces:current.savedPlaces.filter(saved => placeKey(saved.place) !== id) }))
      if (id && reading.current) { invalidate(); refresh() }
    }
    const refreshVisible = () => { if (!document.hidden) refresh() }
    window.addEventListener('snapit:place-updated', updated)
    window.addEventListener('snapit:place-deleted', deleted)
    window.addEventListener('focus', refreshVisible)
    document.addEventListener('visibilitychange', refreshVisible)
    return () => {
      window.removeEventListener('snapit:place-updated', updated)
      window.removeEventListener('snapit:place-deleted', deleted)
      window.removeEventListener('focus', refreshVisible)
      document.removeEventListener('visibilitychange', refreshVisible)
    }
  }, [refresh, invalidate])

  const mutate = useCallback(async (path, method, body, update) => {
    if (!active.current || token.current !== auth.token) throw endedSession()
    if (!auth.token) throw new Error('Sign in to save places')
    if (mutationPending.current) throw new Error('Wait for your current change to finish')
    mutationPending.current = true
    invalidate()
    setBusy(true)
    setLoading(false)
    try {
      const result = await sendRequest(backendUrl(`api/users/me/saved${path}`), method, body === undefined ? null : JSON.stringify(body), headers)
      if (!active.current || token.current !== auth.token) throw endedSession()
      setLibrary(current => update(current, result))
      return result
    } catch (error) {
      if (active.current && token.current === auth.token && [404,409].includes(error.status)) {
        mutationPending.current = false
        await refresh()
      }
      throw error
    } finally {
      if (active.current && token.current === auth.token) { mutationPending.current = false; setBusy(false) }
    }
  }, [auth.token, headers, sendRequest, invalidate, refresh])
  const savePlace = useCallback((place, collectionId = null) => mutate(`/${placeKey(place)}`, 'PUT', { collectionId }, (current, result) => {
    const existing = current.savedPlaces.find(saved => placeKey(saved.place) === placeKey(place))
    const saved = { place:{ ...existing?.place, ...place }, collectionId:result.collectionId, savedAt:existing?.savedAt || result.savedAt }
    return { ...current, savedPlaces:[saved, ...current.savedPlaces.filter(item => placeKey(item.place) !== placeKey(place))] }
  }), [mutate])
  const removePlace = useCallback(id => mutate(`/${id}`, 'DELETE', undefined, current => ({ ...current, savedPlaces:current.savedPlaces.filter(saved => placeKey(saved.place) !== id) })), [mutate])
  const createCollection = useCallback(name => mutate('/collections', 'POST', { name }, (current, result) => ({ ...current, collections:[...current.collections, result.collection] })), [mutate])
  const renameCollection = useCallback((id, name) => mutate(`/collections/${id}`, 'PATCH', { name }, (current, result) => ({ ...current, collections:current.collections.map(collection => collection.id === id ? { ...collection, name:result.collection.name } : collection) })), [mutate])
  const deleteCollection = useCallback(id => mutate(`/collections/${id}`, 'DELETE', undefined, current => ({
    collections:current.collections.filter(collection => collection.id !== id),
    savedPlaces:current.savedPlaces.filter(saved => saved.collectionId !== id)
  })), [mutate])
  const getSavedPlace = useCallback(id => library.savedPlaces.find(saved => placeKey(saved.place) === id) || null, [library.savedPlaces])
  const value = useMemo(() => ({ ...library, isLoading, isBusy, loadError, refresh, getSavedPlace, savePlace, removePlace, createCollection, renameCollection, deleteCollection }), [library, isLoading, isBusy, loadError, refresh, getSavedPlace, savePlace, removePlace, createCollection, renameCollection, deleteCollection])
  return <SavedPlacesContext.Provider value={value}>{children}</SavedPlacesContext.Provider>
}
export default SavedPlacesContext
