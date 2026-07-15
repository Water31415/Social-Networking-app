import React,{useState} from "react";
import "./MainNavigation.css"
import MainHeader from "./MainHeader";
import { Link } from "react-router-dom";
import NavLinks from "./NavLinks";
import SlideDrawer from "./SlideDrawer";
import Backdrop from "../UIElements/Backdrop";

const MainNavigation = props =>{
        const[drawerIsOpen,setDrawerIsOpen] = useState(false)
        const openDrawerHandler = ()=>{
            setDrawerIsOpen(true)
        }
         const closeDrawerHandler = ()=>{
            setDrawerIsOpen(false)
        }
    return( 
    <React.Fragment>
        {drawerIsOpen && <Backdrop onClick={closeDrawerHandler}/>}
         <SlideDrawer show ={drawerIsOpen} onClick={closeDrawerHandler}>
        <nav className="main-navigation_drawer-nav">
        <NavLinks/>

        </nav>
    </SlideDrawer> 
    <MainHeader>
        <button className="main-navigation_menu-btn" onClick={openDrawerHandler}>
            <span/>
            <span/>
            <span/>
        </button>
        <h1 className="main-navigation_tittle">
            <Link to ="/">your places</Link>
        </h1>
        <nav className="main-navigation_header">
            <NavLinks/>
        </nav>
        
    </MainHeader>
    </React.Fragment> )
}


export default MainNavigation