import React,{useCallback,useContext,useEffect,useRef,useState} from "react";
import "./MainNavigation.css"
import MainHeader from "./MainHeader";
import { Link, useHistory, useLocation } from "react-router-dom";
import NavLinks from "./NavLinks";
import SlideDrawer from "./SlideDrawer";
import Backdrop from "../UIElements/Backdrop";
import { ShinyText } from "../UI";
import { PlaceSearchContext } from "../context/place-search-context";
import { AuthContext } from "../context/auth-context";
import { useHttpClient } from "../../hooks/http-hook";
import { backendUrl } from "../../Utils/backend-url";

const MainNavigation = props =>{
        const[drawerIsOpen,setDrawerIsOpen] = useState(false)
        const auth = useContext(AuthContext)
        const { searchTerm, setSearchTerm } = useContext(PlaceSearchContext)
        const history = useHistory()
        const location = useLocation()
        const { sendRequest } = useHttpClient()
        const [hasNewMilestone,setHasNewMilestone] = useState(false)
        const earnedMilestonesRef = useRef([])
        const acknowledgeMilestones = useCallback(() => {
            if (!auth.userId) return
            const storageKey = `snapit:seen-milestones:${auth.userId}`
            try {
                const previouslySeen = JSON.parse(window.localStorage.getItem(storageKey) || '[]')
                const seen = new Set([...previouslySeen, ...earnedMilestonesRef.current])
                window.localStorage.setItem(storageKey, JSON.stringify([...seen]))
            } catch (error) {}
            setHasNewMilestone(false)
        },[auth.userId])

        useEffect(() => {
            if (!auth.token || !auth.userId) {
                earnedMilestonesRef.current = []
                setHasNewMilestone(false)
                return undefined
            }

            let cancelled = false
            const storageKey = `snapit:seen-milestones:${auth.userId}`
            const checkForMilestones = async () => {
                try {
                    const data = await sendRequest(backendUrl('api/places/analytics'),'GET',null,{Authorization:`Bearer ${auth.token}`})
                    if (cancelled) return
                    const earned = (data.badges || []).filter(badge => badge.earned).map(badge => badge.id)
                    earnedMilestonesRef.current = earned

                    let saved = null
                    try { saved = window.localStorage.getItem(storageKey) } catch (error) {}
                    if (saved === null) {
                        try { window.localStorage.setItem(storageKey, JSON.stringify(earned)) } catch (error) {}
                        setHasNewMilestone(false)
                        return
                    }

                    let seen = []
                    try {
                        const parsed = JSON.parse(saved)
                        if (Array.isArray(parsed)) seen = parsed
                    } catch (error) {}
                    setHasNewMilestone(earned.some(id => !seen.includes(id)))
                } catch (error) {}
            }

            checkForMilestones()
            const refreshTimer = window.setInterval(checkForMilestones, 15000)
            const refreshWhenVisible = () => {
                if (!document.hidden) checkForMilestones()
            }
            window.addEventListener('focus',refreshWhenVisible)
            document.addEventListener('visibilitychange',refreshWhenVisible)
            return () => {
                cancelled = true
                window.clearInterval(refreshTimer)
                window.removeEventListener('focus',refreshWhenVisible)
                document.removeEventListener('visibilitychange',refreshWhenVisible)
            }
        },[auth.token,auth.userId,location.pathname,sendRequest])
        const openDrawerHandler = ()=>{
            setDrawerIsOpen(true)
        }
         const closeDrawerHandler = ()=>{
            setDrawerIsOpen(false)
        }
        useEffect(() => {
            if (!drawerIsOpen) return undefined
            const closeOnEscape = event => { if (event.key === 'Escape') setDrawerIsOpen(false) }
            window.addEventListener('keydown', closeOnEscape)
            return () => window.removeEventListener('keydown', closeOnEscape)
        }, [drawerIsOpen])
        const submitSearch = event => {
            event.preventDefault()
            const isPlacesRoute = location.pathname === '/'
                || location.pathname === '/near-me'
                || /^\/[^/]+\/places$/.test(location.pathname)
            if (!isPlacesRoute && searchTerm.trim()) history.push('/')
        }
    return( 
    <React.Fragment>
        {drawerIsOpen && <Backdrop onClick={closeDrawerHandler}/>}
         <SlideDrawer show ={drawerIsOpen} onClick={closeDrawerHandler}>
        <nav className="main-navigation__drawer-nav">
        <NavLinks variant="drawer" hasNewMilestone={hasNewMilestone} onDashboardOpen={acknowledgeMilestones}/>

        </nav>
    </SlideDrawer> 
    <MainHeader className={auth.isLoggedIn ? 'main-header--signed-in' : ''}>
        <button type="button" className="main-navigation__menu-btn" onClick={openDrawerHandler} aria-label="Open navigation" aria-expanded={drawerIsOpen}>
            <span/>
            <span/>
            <span/>
        </button>
        <div className="main-navigation__title">
            <Link to="/" aria-label="SnapIt — view all places" title="View all places">
                <ShinyText text="SnapIt!" className="main-navigation__brand-shine" color="#c5a2fa" shineColor="#f0ece2" speed={3.8} shineWidth={24} softness={0.45} glow={0.08} trigger="hover" />
            </Link>
            <span className="main-navigation__edition">A journal of places</span>
        </div>
        {location.pathname !== '/auth' && <form className="main-navigation__search" role="search" onSubmit={submitSearch}>
            <label className="main-navigation__search-label" htmlFor="main-place-search">Search places</label>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg>
            <input
                id="main-place-search"
                type="search"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Search places or creators"
                autoComplete="off"
            />
            {searchTerm && <button type="button" onClick={() => setSearchTerm('')} aria-label="Clear place search">×</button>}
        </form>}
        {!auth.isLoggedIn && location.pathname !== '/auth' && <Link className="main-navigation__join" to="/auth" aria-label="Join the journal">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
            <span>Join the journal</span>
        </Link>}
    </MainHeader>
    <aside className="main-navigation__icon-sidebar"><NavLinks variant="sidebar" hasNewMilestone={hasNewMilestone} onDashboardOpen={acknowledgeMilestones}/></aside>
    </React.Fragment> )
}


export default MainNavigation
