import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import GradientText from '../GradientText'
import './LoadingText.css'

const LOADING_QUOTES = [
  { quote: 'Photography is still a very new medium and everything must be tried and dared. Photography is not a sport. It has no rules. It’s the result that counts, no matter how it’s achieved.', author: 'Bill Brandt' },
  { quote: 'You don’t make a photograph just with a camera. You bring to the act of photography all the pictures you have seen, the books you have read, the music you have heard, the people you have loved.', author: 'Ansel Adams' },
  { quote: 'The camera is an instrument that teaches people how to see without a camera.', author: 'Dorothea Lange' },
  { quote: 'If you haven’t viewed a photograph for at least 30 minutes, you haven’t really seen it.', author: 'Minor White' },
  { quote: 'There are no rules for good photographs. There are only good photographs.', author: 'Ansel Adams' },
  { quote: 'I am seeking. I am striving. I am in it with all my heart.', author: 'Vincent van Gogh' },
  { quote: 'If I could say it in words there would be no reason to paint.', author: 'Edward Hopper' },
  { quote: 'The only time I feel alive is when I’m painting.', author: 'Vincent van Gogh' },
  { quote: 'Painting is just another way of keeping a diary.', author: 'Pablo Picasso' },
  { quote: 'We don’t read and write poetry because it’s cute. We read and write poetry because we are members of the human race. And the human race is filled with passion.', author: 'Dead Poets Society' }
]

const randomQuoteIndex = previousIndex => {
  const nextIndex = Math.floor(Math.random() * LOADING_QUOTES.length)
  return nextIndex === previousIndex ? (nextIndex + 1) % LOADING_QUOTES.length : nextIndex
}

const LoadingText = ({ asOverlay = false, isLoading = true, minDuration = 1500, className = '' }) => {
  const [visible, setVisible] = useState(isLoading)
  const startedAt = useRef(isLoading ? Date.now() : 0)
  const wasLoading = useRef(isLoading)
  const hideTimer = useRef(null)
  const [quoteIndex, setQuoteIndex] = useState(() => randomQuoteIndex(-1))

  useEffect(() => {
    window.clearTimeout(hideTimer.current)
    if (isLoading) {
      if (!wasLoading.current || !startedAt.current) {
        startedAt.current = Date.now()
        setQuoteIndex(currentIndex => randomQuoteIndex(currentIndex))
      }
      wasLoading.current = true
      setVisible(true)
    } else {
      wasLoading.current = false
      if (!startedAt.current) {
        setVisible(false)
        return undefined
      }

      const remaining = Math.max(0, minDuration - (Date.now() - startedAt.current))
      hideTimer.current = window.setTimeout(() => {
        startedAt.current = 0
        setVisible(false)
      }, remaining)
    }

    return () => window.clearTimeout(hideTimer.current)
  }, [isLoading, minDuration])

  if (typeof document === 'undefined') return null
  const { quote, author } = LOADING_QUOTES[quoteIndex]

  return createPortal((
    <div
      className={`loading-text${asOverlay ? ' loading-text--overlay' : ''}${visible ? '' : ' loading-text--hidden'}${className ? ` ${className}` : ''}`}
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
    >
      <span className="loading-text__message">
        {visible && <span className="loading-text__quote"><GradientText colors={['#f5f3ff', '#c084fc', '#f0abfc', '#f5f3ff']} animationSpeed={7} variant="flow" scale={3} glow={0.12} className="loading-text__gradient" style={{ display: 'block', width: '100%' }}>“{quote}”</GradientText></span>}
        <strong className="loading-text__author">— {author}</strong>
      </span>
    </div>
  ), document.body)
}

export default LoadingText
