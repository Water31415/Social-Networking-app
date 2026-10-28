import React from 'react'
import './GoogleSearchButton.css'

const GoogleSearchButton = ({ query = '' }) => {
  const searchQuery = query.trim().replace(/\s+/g, ' ')
  if (!searchQuery) return null

  return <a
    className="google-search-button"
    href={`https://www.google.com/search?${new URLSearchParams({ q: searchQuery })}`}
    target="_blank"
    rel="noopener noreferrer"
    title="Search with Google (opens in a new tab)"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </svg>
    <span>Search with Google</span>
  </a>
}

export default GoogleSearchButton
