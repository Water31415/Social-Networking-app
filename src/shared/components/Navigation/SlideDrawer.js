import React from "react";
import "./SlideDrawer.css"
import ReactDom from "react-dom";
import { CSSTransition } from "react-transition-group";

const SlideDrawer = props =>{
    const content= 
    <CSSTransition in = {props.show} timeout={200} classNames={"slide-in-left"} mountOnEnter unmountOnExit>
        <aside className="side-drawer"onClick={props.onClick}>{props.children}</aside>
    </CSSTransition>
        return ReactDom.createPortal(content,document.getElementById('drawer-hook'))
}

export default SlideDrawer