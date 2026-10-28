import React,{useContext,useEffect,useState}from "react";
import "./NavLinks.css"
import { NavLink, useHistory, useLocation } from "react-router-dom";
import { AuthContext } from "../context/auth-context";
import Button from "../FormElements/Button";

const NavIcon = ({name}) => {
    const common={viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'1.7',strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true};
    const icons={
        'MY PLACES':<><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
        'FIND NEAR ME':<><circle cx="12" cy="12" r="9"/><path d="m15.6 8.4-2.2 5-5 2.2 2.2-5 5-2.2Z"/></>,
        'SHOW ALL PLACES':<><circle cx="12" cy="12" r="9"/><path d="m15.6 8.4-2.2 5-5 2.2 2.2-5 5-2.2Z"/></>,
        'ADD PLACE':<><path d="M12 5v14M5 12h14"/><rect x="3" y="3" width="18" height="18" rx="5"/></>,
        'DASHBOARD':<><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M7 15v-3m5 3V7m5 8v-5"/></>,
        'AUTHENTICATE':<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
        'LOGOUT':<><path d="M10 17l5-5-5-5m5 5H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></>
    };
    return <svg {...common}>{icons[name]}</svg>;
};

const NavLinks = props =>{
    const auth=useContext(AuthContext)
    const location=useLocation()
    const history=useHistory()
    const [nearbyActive,setNearbyActive]=useState(false)
    const createPanelOpen=location.pathname==='/' && new URLSearchParams(location.search).get('create')==='1'
    const captions = {'MY PLACES':'My places','FIND NEAR ME':'Nearby','SHOW ALL PLACES':'Explore','ADD PLACE':'New entry','DASHBOARD':'Field notes','AUTHENTICATE':'Join in','LOGOUT':'Sign out'}

    useEffect(()=>{
        const handleNearbyState=event=>setNearbyActive(Boolean(event.detail && event.detail.active))
        window.addEventListener('snapit:nearby-state',handleNearbyState)
        return ()=>window.removeEventListener('snapit:nearby-state',handleNearbyState)
    },[])

    useEffect(()=>{
        if(location.pathname!=='/') setNearbyActive(false)
    },[location.pathname])

    const items=[]
    if(auth.isLoggedIn) items.push(
        {label:'MY PLACES',to:`/${auth.userId}/places`,exact:true},
        {label:'ADD PLACE',action:true,active:createPanelOpen,onClick:()=>history.push(createPanelOpen?'/':'/?create=1')},
        {label:'DASHBOARD',to:'/dashboard'},
        {label:'LOGOUT',onClick:auth.logout}
    )
    else items.push({label:'AUTHENTICATE',to:'/auth'})
    if(props.variant !== 'sidebar' && auth.isLoggedIn && location.pathname==='/') items.unshift({
        label:nearbyActive?'SHOW ALL PLACES':'FIND NEAR ME',
        action:true,
        active:nearbyActive,
        onClick:()=>window.dispatchEvent(new Event('snapit:find-nearby'))
    })
    if(props.variant==='sidebar') {
        const logoutItem=items.find(item=>item.label==='LOGOUT');
        const mainItems=items.filter(item=>item.label!=='LOGOUT');
        return <nav className="icon-sidebar" aria-label="Main navigation">
            <NavLink to="/" exact className="icon-sidebar__brand" aria-label="SnapIt — all places" title="All places">S<span aria-hidden="true">.</span></NavLink>
            <ul className="icon-sidebar__items">
                {mainItems.map(item=><li key={item.label}>
                    {item.to ? <NavLink to={item.to} exact={item.exact} className={`icon-sidebar__link${item.label==='DASHBOARD'&&props.hasNewMilestone?' is-milestone-new':''}`} activeClassName="is-active" onClick={item.label==='DASHBOARD'?props.onDashboardOpen:undefined} title={item.label==='DASHBOARD'&&props.hasNewMilestone?'Dashboard — new milestone':item.label} aria-label={item.label==='DASHBOARD'&&props.hasNewMilestone?'Dashboard, new milestone':item.label}><NavIcon name={item.label}/><span className="icon-sidebar__caption" aria-hidden="true">{captions[item.label]}</span><span className="icon-sidebar__tooltip">{item.label==='DASHBOARD'&&props.hasNewMilestone?'New milestone':item.label}</span></NavLink> : <button type="button" className={`icon-sidebar__link${item.active?' is-active':''}`} onClick={item.onClick} title={item.label} aria-label={item.label} aria-pressed={item.action?item.active:undefined}><NavIcon name={item.label}/><span className="icon-sidebar__caption" aria-hidden="true">{captions[item.label]}</span><span className="icon-sidebar__tooltip">{item.label}</span></button>}
                </li>)}
            </ul>
            <div className="icon-sidebar__bottom">
                {logoutItem && <button type="button" className="icon-sidebar__link" onClick={logoutItem.onClick} title={logoutItem.label} aria-label={logoutItem.label}><NavIcon name={logoutItem.label}/><span className="icon-sidebar__caption" aria-hidden="true">{captions[logoutItem.label]}</span><span className="icon-sidebar__tooltip">{logoutItem.label}</span></button>}
            </div>
        </nav>;
    }
    return  <ul className="nav-links">
        {items.map(item=>{
            const milestoneAlert=item.label==='DASHBOARD'&&props.hasNewMilestone
            return <li key={item.label}>{item.to?<NavLink to={item.to} exact={item.exact} className={milestoneAlert?'is-milestone-new':''} onClick={item.label==='DASHBOARD'?props.onDashboardOpen:undefined} title={milestoneAlert?'Dashboard — new milestone':undefined}>{item.label}</NavLink>:<Button onClick={item.onClick}>{item.label}</Button>}</li>
        })}
    </ul>
}

export default NavLinks
