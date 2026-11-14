import React, { useRef } from "react";
import "./SlideDrawer.css"
import ReactDom from "react-dom";
import { CSSTransition } from "react-transition-group";

const SlideDrawer = props =>{
    const nodeRef = useRef(null)
    const content= 
    <CSSTransition nodeRef={nodeRef} in = {props.show} timeout={200} classNames={"slide-in-left"} mountOnEnter unmountOnExit>
        <aside ref={nodeRef} className="side-drawer" onClick={props.onClick}>{props.children}</aside>
    </CSSTransition>
        return ReactDom.createPortal(content,document.getElementById('drawer-hook'))
}

export default SlideDrawer
