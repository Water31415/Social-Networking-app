import React, { useState } from 'react'
import './FlipCard.css'

export default function FlipCard({
  front = null, back = null, flipped, defaultFlipped = false, onFlipChange,
  axis = 'y', flipOnClick = true, width = 300, height = 400, radius = 22,
  background = '#27272a', color = '#f5f5f5', shadowColor = '#000000',
  shadowOpacity = 0.45, glareOpacity = 0.22, hoverScale = 1.03,
  disabled = false, ariaLabel = 'Flip card', className = ''
}) {
  const controlled = flipped !== undefined
  const [localFlipped, setLocalFlipped] = useState(defaultFlipped)
  const isFlipped = controlled ? flipped : localFlipped
  const toggle = () => {
    if (disabled || !flipOnClick) return
    const next = !isFlipped
    if (!controlled) setLocalFlipped(next)
    onFlipChange?.(next)
  }
  const setTilt = event => {
    if (disabled || event.pointerType === 'touch') return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    event.currentTarget.style.setProperty('--fc-tilt-x', `${(0.5 - y) * 12}deg`)
    event.currentTarget.style.setProperty('--fc-tilt-y', `${(x - 0.5) * 12}deg`)
    event.currentTarget.style.setProperty('--fc-scale', String(hoverScale))
    event.currentTarget.style.setProperty('--fc-gx', `${x * 100}%`)
    event.currentTarget.style.setProperty('--fc-gy', `${y * 100}%`)
  }
  const resetTilt = event => {
    event.currentTarget.style.setProperty('--fc-tilt-x', '0deg')
    event.currentTarget.style.setProperty('--fc-tilt-y', '0deg')
    event.currentTarget.style.setProperty('--fc-scale', '1')
  }
  return <div
    role="button" tabIndex={disabled ? -1 : 0} aria-pressed={isFlipped} aria-label={ariaLabel}
    aria-disabled={disabled || undefined} className={`flip-card${className ? ` ${className}` : ''}`}
    data-axis={axis} data-flipped={isFlipped ? 'true' : 'false'} data-disabled={disabled ? '' : undefined}
    onClick={toggle} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle() } }}
    onPointerMove={setTilt} onPointerLeave={resetTilt}
    style={{ '--fc-w': `${width}px`, '--fc-h': `${height}px`, '--fc-radius': `${radius}px`, '--fc-bg': background, '--fc-ink': color, '--fc-shadow': shadowColor, '--fc-shadow-o': shadowOpacity, '--fc-glare': glareOpacity }}
  >
    <div className="flip-card__shadow" aria-hidden="true" />
    <div className="flip-card__rotor">
      <div className="flip-card__face flip-card__face--front" aria-hidden={isFlipped}>{front}<span className="flip-card__glare" aria-hidden="true" /></div>
      <div className="flip-card__face flip-card__face--back" aria-hidden={!isFlipped}>{back}<span className="flip-card__glare" aria-hidden="true" /></div>
    </div>
  </div>
}
