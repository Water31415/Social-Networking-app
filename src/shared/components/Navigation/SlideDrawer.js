import React from "react";
import "./SlideDrawer.css"
import ReactDom from "react-dom";

const SlideDrawer = props =>{
    const content= <aside className="side-drawer">{props.children}</aside>

        return ReactDom.createPortal(content,document.getElementById('drawer-hook'))
}

export default SlideDrawer