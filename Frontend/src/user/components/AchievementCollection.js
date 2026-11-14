import React, { useContext, useEffect, useId, useRef, useState } from 'react'
import FlipCard from '../../shared/components/UI/Badges/FlipCard'
import { AuthContext } from '../../shared/components/context/auth-context'
import './AchievementCollection.css'

const MILESTONES = {
  'first-place': { category: 'The beginning', rank: 'Ace', artwork: 'ace-spades.png', metric: 'places', target: 1, unit: 'places shared' },
  explorer: { category: 'Out in the world', rank: 'Ten', artwork: 'ten-spades.png', metric: 'places', target: 5, unit: 'places shared' },
  popular: { category: 'A little recognition', rank: 'Jack', artwork: 'jack-spades.png', metric: 'likesReceived', target: 10, unit: 'likes received' },
  conversation: { category: 'Stories that connect', rank: 'Queen', artwork: 'queen-spades.png', metric: 'commentsReceived', target: 10, unit: 'comments received' },
  connector: { category: 'Going a little further', rank: 'King', artwork: 'king-spades.png', metric: 'sharesReceived', target: 10, unit: 'shares received' }
}

const StatusIcon = ({ earned }) => <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">{earned
  ? <path d="m5 10 3 3 7-7" />
  : <><rect x="5" y="8" width="10" height="8" rx="2" /><path d="M7 8V6a3 3 0 0 1 6 0v2" /></>}</svg>

const MilestoneProgress = ({ badge, meta, analytics }) => {
  if (!meta.target) return null
  const current = Math.min(meta.target, Math.max(0, Number(analytics[meta.metric]) || 0))
  return <div className="milestone-progress">
    <div className="milestone-progress__label"><span>{badge.earned ? 'Milestone reached' : meta.unit}</span><strong>{current} <span>/ {meta.target}</span></strong></div>
    <div className="milestone-progress__track" role="progressbar" aria-label={`${badge.label}: ${meta.unit}`} aria-valuemin={0} aria-valuemax={meta.target} aria-valuenow={current}>
      <span style={{ width: `${current / meta.target * 100}%` }} />
    </div>
  </div>
}

const AchievementCollection = ({ analytics }) => {
  const { userId } = useContext(AuthContext)
  const [filter, setFilter] = useState('all')
  const [newlyEarned, setNewlyEarned] = useState([])
  const previous = useRef(null)
  const artworkFilterId = `milestone-ink-${useId().replace(/:/g, '')}`
  const badges = analytics.badges || []
  const earned = badges.filter(badge => badge.earned).length
  const earnedSignature = JSON.stringify(badges.filter(badge => badge.earned).map(badge => badge.id).sort())
  useEffect(() => {
    if (!badges.length) return
    const ids = JSON.parse(earnedSignature)
    if (previous.current?.userId === userId && previous.current.signature === earnedSignature) return
    let before = previous.current?.userId === userId ? previous.current.ids : null
    const key = userId ? `snapit:revealed-milestones:${userId}` : null
    if (before === null && key) {
      try {
        const stored = JSON.parse(window.localStorage.getItem(key) || 'null')
        if (Array.isArray(stored) && stored.every(id => typeof id === 'string')) before = stored
      } catch {}
    }
    setNewlyEarned(before === null ? [] : ids.filter(id => !before.includes(id)))
    previous.current = { userId, ids, signature:earnedSignature }
    if (key) { try { window.localStorage.setItem(key, earnedSignature) } catch {} }
  }, [userId, earnedSignature, badges.length])
  useEffect(() => {
    if (!newlyEarned.length) return undefined
    const timer = window.setTimeout(() => setNewlyEarned([]), 4500)
    return () => window.clearTimeout(timer)
  }, [newlyEarned])
  const next = badges.filter(badge => !badge.earned && MILESTONES[badge.id]?.target).map(badge => {
    const meta = MILESTONES[badge.id]
    const current = Math.min(meta.target, Math.max(0, Number(analytics[meta.metric]) || 0))
    return { badge, meta, current, ratio:current / meta.target }
  }).sort((a,b) => b.ratio - a.ratio)[0]
  const remaining = next ? next.meta.target - next.current : 0
  const nextUnit = next ? ({ places:'place', likesReceived:'like', commentsReceived:'comment', sharesReceived:'share' }[next.meta.metric]) : ''
  const visible = badges.filter(badge => filter === 'all' || (filter === 'earned' ? badge.earned : !badge.earned))
  const filters = [{ id: 'all', label: 'All milestones', count: badges.length }, { id: 'earned', label: 'Collected', count: earned }, { id: 'locked', label: 'To discover', count: badges.length - earned }]

  return <section className="achievement-section" aria-labelledby="achievements-heading">
    <header className="achievement-section__header">
      <div><p className="achievement-section__eyebrow">02 / SMALL THINGS, WELL EARNED</p><h2 id="achievements-heading">The collection<span>.</span></h2><p className="achievement-section__hint">A few places. A few people. A little proof of the journey.</p></div>
      <div className="achievement-summary">
        <strong>{earned}<span>/{badges.length}</span></strong>
        <div><span>Milestones collected</span><div className="achievement-summary__track" role="progressbar" aria-label="Milestones collected" aria-valuemin={0} aria-valuemax={badges.length || 1} aria-valuenow={earned}>
          {badges.map(badge => <i className={badge.earned ? 'is-filled' : ''} key={badge.id} />)}
        </div></div>
      </div>
    </header>
    {next ? <div className="achievement-next" role="region" aria-label="Next card to unlock">
      <div className="achievement-next__rank" aria-hidden="true">{({ Ace:'A', Ten:'10', Jack:'J', Queen:'Q', King:'K' })[next.meta.rank]}<span>♠</span></div>
      <div className="achievement-next__copy"><span>Next card to unlock</span><strong>{next.badge.label}</strong><p>{remaining} more {nextUnit}{remaining === 1 ? '' : 's'} to collect the {next.meta.rank} of spades.</p></div>
      <div className="achievement-next__progress"><span>{next.current} <span>/ {next.meta.target}</span></span><div role="progressbar" aria-label={`Progress toward ${next.badge.label}`} aria-valuemin={0} aria-valuemax={next.meta.target} aria-valuenow={next.current}><i style={{ width:`${next.ratio * 100}%` }} /></div></div>
    </div> : badges.length > 0 && earned === badges.length && <div className="achievement-next achievement-next--complete"><span aria-hidden="true">♠</span><div><strong>The deck is complete.</strong><p>Every milestone collected. There are still more stories to keep.</p></div></div>}
    {newlyEarned.length > 0 && <p className="achievement-unlock" role="status">Newly collected: {badges.filter(badge => newlyEarned.includes(badge.id)).map(badge => `${badge.label} · ${MILESTONES[badge.id]?.rank || 'New card'} of spades`).join(', ')}.</p>}
    <div className="achievement-section__toolbar">
      <div className="achievement-filters" role="group" aria-label="Filter achievements">{filters.map(item => <button type="button" key={item.id} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}<span>{item.count}</span></button>)}</div>
      <span className="achievement-section__instruction">Ace to King. Turn a card to discover more. <span aria-hidden="true">↗</span></span>
    </div>
    <svg className="achievement-ink-filter" aria-hidden="true" focusable="false">
      <defs>
        <filter id={artworkFilterId} colorInterpolationFilters="sRGB">
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -.2126 -.7152 -.0722 0 1" result="ink" />
          <feComponentTransfer in="ink" result="cleanInk"><feFuncA type="linear" slope="1.35" intercept="-.12" /></feComponentTransfer>
          <feComposite in="cleanInk" in2="SourceAlpha" operator="in" result="inkMask" />
          <feFlood style={{ floodColor: 'var(--accent)' }} result="themeInk" />
          <feComposite in="themeInk" in2="inkMask" operator="in" />
        </filter>
      </defs>
    </svg>
    <div className="achievement-grid" aria-live="polite">
      {visible.map(badge => {
        const meta = MILESTONES[badge.id] || { ...MILESTONES['first-place'], category: 'A moment to keep', target: null }
        return <FlipCard key={badge.id} className={`milestone-card milestone-card--${meta.rank.toLowerCase()} ${badge.earned ? 'is-earned' : 'is-locked'}${newlyEarned.includes(badge.id) ? ' is-unlocking' : ''}`}
          front={<img className="milestone-card__artwork" src={`${process.env.PUBLIC_URL}/images/achievements/${meta.artwork}`} alt={`${meta.rank} of spades`} style={{ filter: `url(#${artworkFilterId})` }} loading="lazy" draggable={false} />}
          back={<div className="milestone-back">
            <div className="milestone-back__top"><span>{meta.rank} of spades</span><StatusIcon earned={badge.earned} /></div>
            <span className="milestone-back__category">{meta.category}</span>
            <h3>{badge.label}</h3><p>{badge.description}</p>
            <span className={`milestone-back__status ${badge.earned ? 'is-earned' : ''}`}>{badge.earned ? 'Collected' : 'To discover'}</span>
            <MilestoneProgress badge={badge} meta={meta} analytics={analytics} />
            <span className="milestone-turn">Back to the collection <span aria-hidden="true">↶</span></span>
          </div>}
          width={220} height={308} radius={8} background="#000" color="#f0ece2" shadowOpacity={0} glareOpacity={0} hoverScale={1.01}
          ariaLabel={`${badge.label} achievement, ${meta.rank} of spades, ${badge.earned ? 'collected' : 'to discover'}. Flip for details.`} />
      })}
    </div>
    {!visible.length && <p className="achievement-section__empty">{filter === 'earned' ? 'Your collection starts with one place. Share a moment to earn your first milestone.' : filter === 'locked' ? 'Every milestone collected. Keep going — there are always more stories to tell.' : 'Your milestones will appear here as your journal grows.'}</p>}
  </section>
}

export default AchievementCollection
