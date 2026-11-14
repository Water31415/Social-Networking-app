import React, { useEffect, useRef } from "react";
import ReactDom from "react-dom"
import { CSSTransition } from "react-transition-group";
import "./Modal.css"
import Backdrop from "./Backdrop"
const openModals = new Set()
let previousBodyOverflow = ''

const ModelOverlay = props =>{
    const ContentWrapper = props.noForm ? 'div' : 'form';
    const wrapperProps = props.noForm ? {} : { onSubmit: props.onSubmit ? props.onSubmit : event => event.preventDefault() };
    const content = (
    <div ref={props.nodeRef} tabIndex={-1} className={`modal ${props.className || ''}`} style={props.style} role="dialog" aria-modal="true" aria-label={props.dialogLabel || (typeof props.header === 'string' ? props.header : 'Dialog')}>
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
    const nodeRef = useRef(null)
    const onCancelRef = useRef(props.onCancel)
    useEffect(() => { onCancelRef.current = props.onCancel }, [props.onCancel])
    useEffect(() => {
        if (!props.show) return undefined
        const identity = {}
        const previousFocus = document.activeElement
        if (!openModals.size) {
            previousBodyOverflow = document.body.style.overflow
            document.body.style.overflow = 'hidden'
        }
        openModals.add(identity)
        const handleKey = event => {
            if ([...openModals].at(-1) !== identity) return
            if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                onCancelRef.current?.()
            }
            if (event.key !== 'Tab') return
            const controls = [...(nodeRef.current?.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') || [])]
                .filter(control => control.getClientRects().length && control.getAttribute('aria-hidden') !== 'true')
            const first = controls[0], last = controls.at(-1)
            if (!first) { event.preventDefault(); nodeRef.current?.focus(); return }
            if (event.shiftKey && (document.activeElement === first || document.activeElement === nodeRef.current)) { event.preventDefault(); last.focus() }
            else if (!event.shiftKey && (document.activeElement === last || document.activeElement === nodeRef.current)) { event.preventDefault(); first.focus() }
        }
        document.addEventListener('keydown', handleKey)
        nodeRef.current?.focus({ preventScroll: true })
        return () => {
            document.removeEventListener('keydown', handleKey)
            openModals.delete(identity)
            if (!openModals.size) document.body.style.overflow = previousBodyOverflow
            if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
        }
    }, [props.show])
    return (
        <React.Fragment>
            {props.show && <Backdrop onClick={props.onCancel} className={props.backdropClass}/>}
            <CSSTransition
            nodeRef={nodeRef}
            in={props.show}
            mountOnEnter
            unmountOnExit
            timeout={200}
            classNames={"modal"}>

                <ModelOverlay {...props} nodeRef={nodeRef} />

            </CSSTransition>


        </React.Fragment>
    )

}




export default Modal
