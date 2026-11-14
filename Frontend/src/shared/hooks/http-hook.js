import { useEffect, useState, useCallback, useRef } from 'react'
import { notifySessionRejected } from '../Utils/session'

export const useHttpClient = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const requests = useRef(new Set())
  const mounted = useRef(true)

  const sendRequest = useCallback(async (url, method = 'GET', body = null, headers = {}) => {
    const controller = new AbortController()
    requests.current.add(controller)
    if (mounted.current) setIsLoading(true)
    try {
      const response = await fetch(url, { method, body, headers, signal: controller.signal })
      let data = null
      if (response.status !== 204) {
        try { data = await response.json() }
        catch {
          notifySessionRejected(response, headers)
          const responseError = new Error('The server returned an unreadable response. Please try again.')
          responseError.status = response.status
          throw responseError
        }
      }
      notifySessionRejected(response, headers, data || {})
      if (!response.ok) {
        const responseError = new Error(data?.message || `Request failed (${response.status}). Please try again.`)
        responseError.status = response.status
        throw responseError
      }
      return data
    } catch (requestError) {
      if (mounted.current && requestError.name !== 'AbortError') setError(requestError.message || 'Could not reach the server.')
      throw requestError
    } finally {
      requests.current.delete(controller)
      if (mounted.current) setIsLoading(requests.current.size > 0)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])
  useEffect(() => {
    mounted.current = true
    const active = requests.current
    return () => {
      mounted.current = false
      active.forEach(controller => controller.abort())
      active.clear()
    }
  }, [])
  return { isLoading, error, sendRequest, clearError }
}
