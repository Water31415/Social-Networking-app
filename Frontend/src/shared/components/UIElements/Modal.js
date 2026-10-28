import React from "react";
import ReactDom from "react-dom"
import { CSSTransition } from "react-transition-group";
import "./Modal.css"
import Backdrop from "./Backdrop"
const ModelOverlay = props =>{
    const ContentWrapper = props.noForm ? 'div' : 'form';
    const wrapperProps = props.noForm ? {} : { onSubmit: props.onSubmit ? props.onSubmit : event => event.preventDefault() };
    const content = (
    <div className={`modal ${props.className}`} style={props.style} role="dialog" aria-modal="true" aria-label={props.dialogLabel || (typeof props.header === 'string' ? props.header : 'Dialog')}>
        <header className={`modal__header ${props.headerClass || ''}`}>
            <h2>{props.header}</h2>
         </header>
         <ContentWrapper {...wrapperProps}>
            <div className={`modal__content ${props.contentClass}`}>
                {props.children}
            </div>
            <footer className={`modal__footer ${props.footerClass}`}>
                {props.footer}
            </footer>
         </ContentWrapper>
    </div>
    )
    
    
    
    return ReactDom.createPortal(content , document.getElementById('modal-hook'))
}

const Modal = props=>{
    return (
        <React.Fragment>
            {props.show && <Backdrop onClick={props.onCancel} className={props.backdropClass}/>}
            <CSSTransition
            in={props.show}
            mountOnEnter
            unmountOnExit
            timeout={200}
            classNames={"modal"}>

                <ModelOverlay {...props} />

            </CSSTransition>


        </React.Fragment>
    )

}




export default Modal
