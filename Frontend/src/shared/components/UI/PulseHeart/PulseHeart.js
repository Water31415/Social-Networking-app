import React, { useEffect, useRef, useState } from 'react'
import './PulseHeart.css'

const OUT = 0.4
const back = (k, c) => {
  const u = k - 1
  return 1 + (c + 1) * u ** 3 + c * u ** 2
}
const swellOf = (t, c) => t <= 0 ? 0 : t < OUT ? 1 - (1 - t / OUT) ** 3 : 1 - back((t - OUT) / (1 - OUT), c)
const format = value => new Intl.NumberFormat().format(value)
const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const PulseHeart = ({ liked = false, count = 0, onChange, disabled = false, size = 24,
  likedColor = '#ff4d6d', idleColor = '#aab4c0', pillColor = 'transparent', textColor = '#e6edf3',
  duration = 560, dotSize = 0.3, overshoot = 1.7, beat = 3, rollDuration = 350,
  label = 'Like', title, className = '' }) => {
  const rootRef = useRef(null)
  const heartRef = useRef(null)
  const pillRef = useRef(null)
  const rafRef = useRef(0)
  const pointerRef = useRef(false)
  const [roll, setRoll] = useState(null)
  const rollRef = useRef(null)
  const rollTimerRef = useRef(0)
  const shownRef = useRef({ liked, count })
  const likedRef = useRef(liked)
  likedRef.current = liked

  useEffect(() => { shownRef.current = { liked, count } }, [liked, count])
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    clearTimeout(rollTimerRef.current)
  }, [])
  useEffect(() => {
    if (!rollRef.current || !roll) return
    const node = rollRef.current
    node.style.transition = 'none'
    node.style.transform = `translateY(${roll.up ? '0' : '-1em'})`
    node.getBoundingClientRect()
    node.style.transition = ''
    node.style.transform = `translateY(${roll.up ? '-1em' : '0'})`
  }, [roll])

  const startRoll = (from, to) => {
    if (from === to) return
    const a = format(from)
    const b = format(to)
    const changed = a.length === b.length ? [...b].flatMap((char, index) => char !== a[index] ? [index] : []) : []
    setRoll({ a, b, at: changed.length === 1 ? changed[0] : -1, up: to > from })
    clearTimeout(rollTimerRef.current)
    rollTimerRef.current = setTimeout(() => setRoll(null), rollDuration)
  }

  const animate = (nextLiked, nextCount) => {
    if (!rootRef.current || !heartRef.current || !pillRef.current) return
    const start = performance.now()
    let previous = 0
    let swapped = false
    rootRef.current.dataset.running = ''
    const tick = now => {
      const t = Math.min(1, (now - start) / duration)
      const step = previous ? now - previous : 1000 / 60
      previous = now
      const swell = swellOf(t, overshoot)
      const scale = 1 - (1 - dotSize) * swell
      heartRef.current.style.transform = `scale(${scale})`
      pillRef.current.style.transform = `scale(${1 - (beat / 100) * swell})`
      if (!swapped && t + step / 2 / duration >= OUT) {
        swapped = true
        rootRef.current.dataset.liked = String(nextLiked)
        startRoll(shownRef.current.count, nextCount)
      }
      if (t < 1) { rafRef.current = requestAnimationFrame(tick); return }
      rafRef.current = 0
      heartRef.current.style.transform = ''
      pillRef.current.style.transform = ''
      delete rootRef.current.dataset.running
      rootRef.current.dataset.liked = String(likedRef.current)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const handleClick = () => {
    if (disabled || rafRef.current) return
    const nextLiked = !liked
    const nextCount = Math.max(0, count + (nextLiked ? 1 : -1))
    if (pointerRef.current && !prefersReducedMotion()) animate(nextLiked, nextCount)
    else startRoll(count, nextCount)
    pointerRef.current = false
    onChange?.(nextLiked, nextCount)
  }

  const displayCount = roll?.b ?? format(count)
  const cells = roll
    ? roll.at === -1
      ? [{ top: roll.up ? roll.a : roll.b, bottom: roll.up ? roll.b : roll.a }]
      : [...roll.b].map((char, index) => index === roll.at
        ? { top: roll.up ? roll.a[index] : char, bottom: roll.up ? char : roll.a[index] }
        : { char })
    : [...displayCount].map(char => ({ char }))

  return <button ref={rootRef} type="button" title={title} aria-label={`${label}, ${format(count)}`} aria-pressed={liked} data-liked={String(liked)} disabled={disabled}
    className={`pulse-heart${className ? ` ${className}` : ''}`}
    style={{ '--ph-size': `${size}px`, '--ph-pill': pillColor, '--ph-idle': idleColor, '--ph-liked': likedColor, '--ph-text': textColor, '--ph-roll': `${rollDuration}ms` }}
    onPointerDown={event => { pointerRef.current = event.button === 0; if (!prefersReducedMotion()) rootRef.current.dataset.pressed = '' }}
    onPointerUp={() => { if (rootRef.current) delete rootRef.current.dataset.pressed }}
    onPointerLeave={() => { pointerRef.current = false; if (rootRef.current) delete rootRef.current.dataset.pressed }}
    onKeyDown={() => { pointerRef.current = false }} onClick={handleClick}>
    <span ref={pillRef} className="pulse-heart__pill">
      <span ref={heartRef} className="pulse-heart__heart" aria-hidden="true">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" /></svg>
      </span>
      <span className="pulse-heart__count" aria-hidden="true">{cells.map((cell, index) => 'char' in cell
        ? <span key={`count-${index}`}>{cell.char}</span>
        : <span key={`roll-${index}`} className="pulse-heart__slot"><span ref={rollRef} className="pulse-heart__roll"><span>{cell.top}</span><span>{cell.bottom}</span></span></span>)}</span>
    </span>
  </button>
}

export default PulseHeart
