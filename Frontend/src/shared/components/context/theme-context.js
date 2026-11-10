import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export const THEME_STORAGE_KEY = 'snapit:theme'
const isTheme = value => value === 'light' || value === 'dark'
const readPreference = () => {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(value) ? value : null
  } catch { return null }
}
const systemTheme = () => window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} })

export const ThemeProvider = ({ children }) => {
  const [preference, setPreference] = useState(readPreference)
  const [system, setSystem] = useState(systemTheme)
  const theme = preference || system

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setPreference(next)
    try { window.localStorage.setItem(THEME_STORAGE_KEY, next) } catch {}
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'light' ? '#f5f1e8' : '#0b0d0c')
  }, [theme])

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: light)')
    const onSystemChange = event => setSystem(event.matches ? 'light' : 'dark')
    const onStorageChange = event => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) setPreference(readPreference())
    }
    media?.addEventListener('change', onSystemChange)
    window.addEventListener('storage', onStorageChange)
    return () => {
      media?.removeEventListener('change', onSystemChange)
      window.removeEventListener('storage', onStorageChange)
    }
  }, [])

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
