import react from "react";
import "./MainNavigation.css"
import MainHeader from "./MainHeader";
import { Link } from "react-router-dom";

const MainNavigation = props =>{
    return <MainHeader>
        <button className="main-navigation_menu-btn">
            <span/>
            <span/>
            <span/>
        </button>
        <h1 className="main-navigation_tittle">
            <Link>your places</Link>
        </h1>
        <nav>
            ...
        </nav>
    </MainHeader>
}


export default MainNavigation