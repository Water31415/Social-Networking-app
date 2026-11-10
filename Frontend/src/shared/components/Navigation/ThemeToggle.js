import React from 'react'
import { useTheme } from '../context/theme-context'
import './ThemeToggle.css'

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'
  return <button type="button" className="theme-toggle" role="switch" aria-label="Dark mode" aria-checked={dark}
    title={`Switch to ${dark ? 'light' : 'dark'} mode`} onClick={toggleTheme}>
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {dark ? <path d="M20.4 14a8.6 8.6 0 0 1-10.5-10.4A8.7 8.7 0 1 0 20.4 14Z" />
        : <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>}
    </svg>
    <span>{dark ? 'Dark' : 'Light'}</span>
  </button>
}

export default ThemeToggle
