import React,{useContext,useEffect,useMemo,useRef,useState} from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../../shared/components/context/auth-context'
import { useHttpClient } from '../../shared/hooks/http-hook'
import { backendUrl } from '../../shared/Utils/backend-url'
import Card from '../../shared/components/UIElements/Card'
import ErrorModal from '../../shared/components/UIElements/ErrorModal'
import { LoadingText, PlaceServiceBoard } from '../../shared/components/UI'
import './Dashboard.css'
import AchievementCollection from '../components/AchievementCollection'

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

const Dashboard=()=>{
    const auth=useContext(AuthContext)
    const {isLoading,error,clearError,sendRequest}=useHttpClient()
    const [analytics,setAnalytics]=useState(null)
    const [places,setPlaces]=useState([])
    const [monthRange,setMonthRange]=useState(6)
    const analyticsVersion = useRef(0)
    useEffect(() => {
        const update = event => {
            if (event.detail?.userId === auth.userId && event.detail.analytics) {
                analyticsVersion.current++
                setAnalytics(event.detail.analytics)
            }
        }
        window.addEventListener('snapit:analytics-updated', update)
        return () => window.removeEventListener('snapit:analytics-updated', update)
    }, [auth.userId])
    useEffect(()=>{
        let cancelled = false
        const version = analyticsVersion.current
        const load=async()=>{
            try {
                const headers={Authorization:`Bearer ${auth.token}`}
                const [data,placeData]=await Promise.all([
                    sendRequest(backendUrl('api/places/analytics'),'GET',null,headers),
                    sendRequest(backendUrl(`api/places/user/${auth.userId}`),'GET',null,headers)
                ])
                if (cancelled) return
                if (version === analyticsVersion.current) setAnalytics(data)
                setPlaces((placeData.place || []).map(place=>({...place,id:String(place.id || place._id)})))
            } catch(error) {}
        }
        if(auth.token && auth.userId) load()
        return () => { cancelled = true }
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
                            <strong title={Number(analytics[key] || 0).toLocaleString()}>{Number(analytics[key] || 0).toLocaleString(undefined, { notation:Number(analytics[key]) >= 10000 ? 'compact' : 'standard', maximumFractionDigits:1 })}</strong>
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
            <AchievementCollection analytics={analytics} />
        </>}
    </main>
}

export default Dashboard
