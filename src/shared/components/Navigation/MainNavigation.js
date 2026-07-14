import react,{useState} from "react";
import "./MainNavigation.css"
import MainHeader from "./MainHeader";
import { Link } from "react-router-dom";
import NavLinks from "./NavLinks";
import SlideDrawer from "./SlideDrawer";
import Backdrop from "../UIElements/Backdrop";

const MainNavigation = props =>{
        const[drawerIsOpen,setDrawerIsOpen] = useState(false)
        const openDrawer = ()=>{
            setDrawerIsOpen(true)
        }
         const closeDrawer = ()=>{
            setDrawerIsOpen(false)
        }
    return 
    <react.Fragment>
        {drawerIsOpen && <Backdrop onClick={closeDrawer}/>}
    {drawerIsOpen ? <SlideDrawer>
        <nav className="main-navigation_drawer-nav">
        <NavLinks/>

        </nav>
    </SlideDrawer> :null }
    <MainHeader>
        <button className="main-navigation_menu-btn" onClick={openDrawer}>
            <span/>
            <span/>
            <span/>
        </button>
        <h1 className="main-navigation_tittle">
            <Link>your places</Link>
        </h1>
        <nav className="main-navigation_header">
            <NavLinks/>
        </nav>
        
    </MainHeader>
    </react.Fragment> 
}


export default MainNavigation