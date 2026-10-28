import React,{useContext,useEffect,useMemo,useState} from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../../shared/components/context/auth-context'
import { useHttpClient } from '../../shared/hooks/http-hook'
import { backendUrl } from '../../shared/Utils/backend-url'
import Card from '../../shared/components/UIElements/Card'
import ErrorModal from '../../shared/components/UIElements/ErrorModal'
import { LoadingText, PlaceServiceBoard } from '../../shared/components/UI'
import './Dashboard.css'
import FlipCard from '../../shared/components/UI/Badges/FlipCard'

const getMonthStart = (date, offset = 0) => new Date(date.getFullYear(), date.getMonth() + offset, 1)
const formatMonth = date => date.toLocaleDateString(undefined, { month: 'short' })

const Sparkline = ({ values, label }) => {
    if (!values.length) return <span className="analytics-card__history" aria-hidden="true">—</span>

    const max = Math.max(...values, 1)
    const points = values.map((value, index) => {
        const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100
        const y = 27 - (value / max) * 23
        return `${x},${y}`
    }).join(' ')

    return <svg className="analytics-card__sparkline" viewBox="0 0 100 30" role="img" aria-label={label}>
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
}

const METRICS=[
    {label:'Places shared',key:'places',series:'monthly'},
    {label:'Likes received',key:'likesReceived',series:'likes'},
    {label:'Comments received',key:'commentsReceived',series:'comments'},
    {label:'Shares received',key:'sharesReceived',series:'shares'},
    {label:'Likes given',key:'likesGiven',series:'none'}
]

const BADGE_META={
    'first-place':{tone:'violet',mark:'M32 55S49 38 49 24a17 17 0 0 0-34 0c0 14 17 31 17 31Z M39 24a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z'},
    explorer:{tone:'blue',mark:'M32 7a25 25 0 1 0 0 50 25 25 0 0 0 0-50Z M42 22l-6 14-14 6 6-14 14-6Z M32 2v9 M32 53v9 M2 32h9 M53 32h9'},
    popular:{tone:'pink',mark:'m32 7 7.5 15.2L56 24.6 44 36.3l2.8 16.5L32 45l-14.8 7.8L20 36.3 8 24.6l16.5-2.4L32 7Z'},
    conversation:{tone:'cyan',mark:'M9 11h39v29H26L13 51V40H9V11Z M48 24h8v27h-7l-9 8V48H27v-8 M18 21h21 M18 29h15'},
    connector:{tone:'amber',mark:'M23 31 42 18 M23 36l19 12 M55 14a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z M25 33a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z M55 51a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z'}
}

const Dashboard=()=>{
    const auth=useContext(AuthContext)
    const {isLoading,error,clearError,sendRequest}=useHttpClient()
    const [analytics,setAnalytics]=useState(null)
    const [places,setPlaces]=useState([])
    const [monthRange,setMonthRange]=useState(6)
    useEffect(()=>{
        const load=async()=>{
            try {
                const headers={Authorization:`Bearer ${auth.token}`}
                const [data,placeData]=await Promise.all([
                    sendRequest(backendUrl('api/places/analytics'),'GET',null,headers),
                    sendRequest(backendUrl(`api/places/user/${auth.userId}`),'GET',null,headers)
                ])
                setAnalytics(data)
                setPlaces((placeData.place || []).map(place=>({...place,id:String(place.id || place._id)})))
            } catch(error) {}
        }
        if(auth.token && auth.userId) load()
    },[auth.token,auth.userId,sendRequest])

    const monthlyPlaces = useMemo(() => {
        const now = new Date()
        const months = Array.from({length:monthRange}, (_, index) => getMonthStart(now, index - monthRange + 1))
        const counts = months.map(month => ({month,label:formatMonth(month),value:0}))

        places.forEach(place => {
            const createdAt = place.createdAt && new Date(place.createdAt)
            if (!createdAt || Number.isNaN(createdAt.getTime())) return
            const index = counts.findIndex(({month}, monthIndex) =>
                createdAt >= month && createdAt < getMonthStart(now, monthIndex - monthRange + 2)
            )
            if (index >= 0) counts[index].value += 1
        })

        return counts
    },[monthRange,places])

    const orderedPlaces = useMemo(() => [...places].sort((a,b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)),[places])
    const metricSeries = {
        monthly: monthlyPlaces.map(item => item.value),
        likes: orderedPlaces.map(place => place.likes?.length || 0),
        comments: orderedPlaces.map(place => place.comments?.length || 0),
        shares: orderedPlaces.map(place => place.shareCount || 0)
    }
    const chartMax = Math.max(4, ...monthlyPlaces.map(item => item.value))

    const earnedBadgeCount = (analytics?.badges || []).filter(badge => badge.earned).length
    const badges=(analytics?.badges || []).map((badge,index)=>{
        const meta=BADGE_META[badge.id] || {tone:'violet'}

        return <FlipCard
            key={badge.id}
            className={`achievement-flip-card achievement-flip-card--${meta.tone} ${badge.earned ? 'is-earned' : 'is-locked'}`}
            front={<div className="achievement-face achievement-face--front">
                <div className="achievement-face__topline"><span>NO. {String(index + 1).padStart(2,'0')}</span><span className="achievement-face__status">{badge.earned ? 'COLLECTED' : 'TO DISCOVER'}</span></div>
                <div className="achievement-face__mark"><svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d={meta.mark || BADGE_META['first-place'].mark} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                <h3>{badge.label}</h3>
                <p>{badge.earned ? 'A little proof of your journey.' : 'Your next chapter is waiting.'}</p>
                <span className="achievement-face__flip-hint">View milestone <span aria-hidden="true">↗</span></span>
            </div>}
            back={<div className="achievement-face achievement-face--back">
                <span className="achievement-face__eyebrow">MILESTONE DETAILS</span>
                <h3>{badge.label}</h3>
                <p>{badge.description}</p>
                <div className={`achievement-face__result ${badge.earned ? 'is-earned' : ''}`}>
                    {badge.earned ? 'In your collection. Keep exploring.' : 'Keep exploring to collect this milestone.'}
                </div>
                <span className="achievement-face__flip-hint">Tap to flip back</span>
            </div>}
            axis="y"
            flipOnClick
            glareOpacity={0}
            hoverScale={1.015}
            width={220}
            height={270}
            radius={4}
            background="#131714"
            color="#f0ece2"
            shadowColor="#000000"
            shadowOpacity={0}
            ariaLabel={`${badge.label} achievement, ${badge.earned ? 'earned' : 'not yet earned'}. Flip for details.`}
        />
    })
    
    return <main className="analytics-page">
        <ErrorModal error={error} onClear={clearError}/>
        <header className="analytics-header">
            <div className="analytics-header__intro">
                <span className="analytics-header__eyebrow">SNAPIT / YOUR FIELD NOTES</span>
                <h1>Every place leaves a trace.</h1>
                <p>A record of the places you kept, the stories you shared, and the people you reached.</p>
            </div>
            <div className="analytics-header__tools">
            <Link className="analytics-header__journal-link" to={`/${auth.userId}/places`}>Open my journal <span aria-hidden="true">↗</span></Link>
            <label className="analytics-range">
                <span className="analytics-range__label">Looking back</span>
                <select value={monthRange} onChange={event=>setMonthRange(Number(event.target.value))} aria-label="Chart time range">
                    <option value={3}>Last 3 months</option>
                    <option value={6}>Last 6 months</option>
                    <option value={12}>Last 12 months</option>
                </select>
            </label>
            </div>
        </header>
        <LoadingText isLoading={isLoading} text="your dashboard" className="loading-text--dashboard" />
        {analytics && <>
            <div className="analytics-dashboard">
                <section className="analytics-grid" aria-label="Your engagement totals">{METRICS.map(({label,key,series})=>{
                    const values = metricSeries[series] || []
                    return <Card key={key} className="analytics-card">
                        <span className="analytics-card__label">{label}</span>
                        <div className="analytics-card__value-row">
                            <strong>{Number(analytics[key] || 0).toLocaleString()}</strong>
                            <Sparkline values={values} label={`${label} by ${series === 'monthly' ? 'month' : 'place'}`}/>
                        </div>
                        <span className="analytics-card__caption">All-time total</span>
                    </Card>
                })}</section>
                <div className="analytics-dashboard__content">
                    <section className="analytics-chart" aria-label="Places shared by month">
                        <div className="analytics-chart__header">
                            <div><p className="analytics-chart__eyebrow">01 / THE LONG VIEW</p><h2>Your rhythm, by month.</h2></div>
                            <span>New entries</span>
                        </div>
                        <div className="analytics-chart__plot">
                            <div className="analytics-chart__axis" aria-hidden="true">
                                <span>{chartMax}</span><span>{Math.round(chartMax * .75)}</span><span>{Math.round(chartMax * .5)}</span><span>{Math.round(chartMax * .25)}</span><span>0</span>
                            </div>
                            <div className="analytics-chart__bars" style={{'--month-count':monthRange}}>
                                {monthlyPlaces.map(({month,label,value})=><div className="analytics-chart__bar-column" key={month.toISOString()}>
                                    <div className="analytics-chart__bar-track"><div className="analytics-chart__bar" style={{height:`${value ? (value / chartMax) * 100 : 0}%`}} title={`${value} ${value === 1 ? 'place' : 'places'} shared in ${label}`}/></div>
                                    <span>{label}</span>
                                </div>)}
                            </div>
                        </div>
                    </section>
                    <PlaceServiceBoard places={places}/>
                </div>
            </div>
            <section className="achievement-section" aria-labelledby="achievements-heading">
                <header className="achievement-section__header">
                    <div>
                        <p className="achievement-section__eyebrow">02 / SMALL THINGS, WELL EARNED</p>
                        <h2 id="achievements-heading">The collection.</h2>
                    </div>
                    <span className="achievement-section__count">{earnedBadgeCount} / {(analytics.badges || []).length} collected</span>
                </header>
                <p className="achievement-section__hint">Places become memories. Moments become milestones. Turn a card to see its story.</p>
                <div className="badge-grid">{badges}</div>
            </section>
        </>}
    </main>
}

export default Dashboard
