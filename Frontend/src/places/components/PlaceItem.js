import React,{useCallback,useContext,useMemo,useRef,useState} from 'react'
import './PlaceItem.css'
import Card from '../../shared/components/UIElements/Card'
import Button from '../../shared/components/FormElements/Button'
import Modal from '../../shared/components/UIElements/Modal'
import Map from '../../shared/components/UIElements/Map'
import GoogleSearchButton from '../../shared/components/UIElements/GoogleSearchButton'
import { AuthContext } from '../../shared/components/context/auth-context'
import { useHttpClient } from '../../shared/hooks/http-hook'
import ErrorModal from '../../shared/components/UIElements/ErrorModal'
import { backendUrl,backendImageUrl } from '../../shared/Utils/backend-url'
import { MorphSlider, PulseHeart } from '../../shared/components/UI'

const LANGUAGES=[['es','Spanish'],['fr','French'],['de','German'],['hi','Hindi'],['ja','Japanese'],['pt','Portuguese']]
const formatCount=count=>count>=1000?`${(count/1000).toFixed(count>=10000?0:1).replace(/\.0$/,'')}K`:String(count)

const PlaceItem=props=>{
    const auth=useContext(AuthContext)
    const {sendRequest,error,clearError}=useHttpClient()
    const [showMap,setShowMap]=useState(false)
    const [showDeleteWarning,setShowDeleteWarning]=useState(false)
    const [showDetails,setShowDetails]=useState(Boolean(props.initiallyExpanded))
    const [mediaHeight,setMediaHeight]=useState(null)
    const [likes,setLikes]=useState(props.likes || [])
    const [comments,setComments]=useState(props.comments || [])
    const [shares,setShares]=useState(props.shareCount || 0)
    const [commentText,setCommentText]=useState('')
    const [language,setLanguage]=useState('')
    const [translated,setTranslated]=useState(null)
    const [translateError,setTranslateError]=useState('')
    const [shareError,setShareError]=useState('')
    const commentInputRef=useRef(null)
    const handleMediaHeightChange=useCallback(height=>setMediaHeight(height),[])
    const photos=useMemo(()=>props.images && props.images.length ? props.images : [props.image], [props.images,props.image])
    const photoSlides=useMemo(()=>photos.filter(Boolean).map((photo,index)=>({
        id:`${props.id}-photo-${index}`,
        image:backendImageUrl(photo),
        caption:photos.length>1 ? `${props.title} · ${index+1} / ${photos.length}` : props.title
    })),[photos,props.id,props.title])
    const liked=likes.some(like=>(like._id || like).toString()===auth.userId)

    const toggleLike=async()=>{
        if(!auth.token) return
        try {
            const result=await sendRequest(backendUrl(`api/places/${props.id}/like`),'POST',null,{Authorization:`Bearer ${auth.token}`})
            if(result.liked) setLikes(current=>[...current,auth.userId])
            else setLikes(current=>current.filter(like=>(like._id || like).toString()!==auth.userId))
        } catch(error) {}
    }
    const addComment=async event=>{
        event.preventDefault()
        if(!auth.token || !commentText.trim()) return
        try {
            const result=await sendRequest(backendUrl(`api/places/${props.id}/comments`),'POST',JSON.stringify({text:commentText}),{
                'Content-Type':'application/json',Authorization:`Bearer ${auth.token}`
            })
            setComments(current=>[...current,result.comment])
            setCommentText('')
        } catch(error) {}
    }
    const sharePlace=async()=>{
        if(!auth.isLoggedIn || !auth.token) return
        setShareError('')
        const url=`${window.location.origin}/${props.creator}/places#place-${props.id}`
        try {
            if(navigator.share) await navigator.share({title:props.title,text:props.description,url})
            else await navigator.clipboard.writeText(url)
            const result=await sendRequest(backendUrl(`api/places/${props.id}/share`),'POST',null,{Authorization:`Bearer ${auth.token}`})
            setShares(result.shares)
        } catch(error) { if(error.name!=='AbortError') setShareError('Unable to share this place from this browser.') }
    }
    const translate=async event=>{
        const target=event.target.value
        setLanguage(target)
        setTranslated(null)
        setTranslateError('')
        if(!target) return
        try {
            const fields=await Promise.all([props.title,props.address,props.description].map(text=>
                sendRequest(backendUrl('api/translate'),'POST',JSON.stringify({text,target}),{'Content-Type':'application/json'})
            ))
            setTranslated(fields.map(field=>field.translatedText))
        } catch(error) { setTranslateError(error.message) }
    }
    const confirmDelete=async()=>{
        setShowDeleteWarning(false)
        try {
            await sendRequest(backendUrl(`api/places/${props.id}`),'DELETE',null,{Authorization:`Bearer ${auth.token}`})
            props.onDelete?.(props.id)
        } catch(error) {}
    }

    return <React.Fragment>
        <ErrorModal error={error} onClear={clearError}/>
        <Modal show={showMap} onCancel={()=>setShowMap(false)} header={props.address} contentClass="place-item__modal-content" footerClass="place-item__modal-content" footer={<Button onClick={()=>setShowMap(false)}>CLOSE</Button>}>
            <div className="map-container"><Map center={props.coordinates} zoom={16}/></div>
        </Modal>
        <Modal show={showDeleteWarning} onCancel={()=>setShowDeleteWarning(false)} header="Are you sure" footerClass="place-item__modal-actions" footer={<div><Button inverse onClick={()=>setShowDeleteWarning(false)}>Cancel</Button><Button danger onClick={confirmDelete}>Delete</Button></div>}>
            Do you want to delete this place?
        </Modal>
        <article className="place-item" id={`place-${props.id}`}>
            <Card className="place-item__content">
                <div className={`place-item__layout${showDetails?' is-expanded':''}`}>
                    <div className="place-item__media">
                        <MorphSlider items={photoSlides} label={`Photos of ${props.title}`} onSelect={props.initiallyExpanded ? undefined : ()=>setShowDetails(current=>!current)} onHeightChange={handleMediaHeightChange} />
                        <button className="place-item__open-details" type="button" onClick={()=>setShowDetails(current=>!current)}>
                            {showDetails ? 'Hide post details' : 'View post details'}
                        </button>
                    </div>
                    {showDetails && <section className="place-item__details" style={mediaHeight ? {'--place-media-height': `${mediaHeight}px`} : undefined} aria-label={`${props.title} details`}>
                        <button className="place-item__close-details" type="button" onClick={()=>setShowDetails(false)} aria-label="Close post details">×</button>
                        <div className="place-item__info">
                            <h2>{translated ? translated[0] : props.title}</h2>
                            {props.creatorName && <p className="place-item__creator">Posted by <strong>{props.creatorName}</strong></p>}
                            <h3>{translated ? translated[1] : props.address}</h3>
                            <p>{translated ? translated[2] : props.description}</p>
                            {Number.isFinite(props.distanceKm) && <small>{props.distanceKm} km away</small>}
                            <div className="place-item__search">
                                <GoogleSearchButton query={[props.title, props.address].filter(Boolean).join(' ')} />
                            </div>
                            <label className="place-item__translate">Translate with Google
                                <select value={language} onChange={translate}><option value="">Choose language</option>{LANGUAGES.map(([code,name])=><option key={code} value={code}>{name}</option>)}</select>
                            </label>
                            {translateError && <small role="status">{translateError}</small>}
                        </div>
                        <div className="place-item__actions">
                            {auth.userId===props.creator && <><Button to={`/places/${props.id}`}>EDIT</Button><Button danger onClick={()=>setShowDeleteWarning(true)}>DELETE</Button></>}
                        </div>
                        <div className="place-item__engagement" aria-label="Post engagement">
                    <PulseHeart className="place-item__engagement-button place-item__like-button" liked={liked} count={likes.length} onChange={()=>toggleLike()} disabled={!auth.isLoggedIn} size={24} label={liked?'Unlike':'Like'} title={likes.length.toLocaleString()+' likes'} />
                    {auth.isLoggedIn && <button className="place-item__engagement-button" type="button" onClick={()=>commentInputRef.current?.focus()} aria-label="View or add comments" title={comments.length.toLocaleString()+' comments'}>
                        <svg viewBox="0 0 28 28" aria-hidden="true"><path d="M24.5 13.2a10.6 10.6 0 0 1-11 10.2 11.7 11.7 0 0 1-5.1-1.2L3 24l1.8-4.5a9.8 9.8 0 0 1-2.3-6.3A10.6 10.6 0 0 1 13.5 3a10.6 10.6 0 0 1 11 10.2Z"/></svg>
                        <span>{formatCount(comments.length)}</span>
                    </button>}
                    <button className="place-item__engagement-button" type="button" onClick={sharePlace} disabled={!auth.isLoggedIn} aria-label="Share this place" title={shares.toLocaleString()+' shares'}>
                        <svg viewBox="0 0 28 28" aria-hidden="true"><path d="m4 13 19-9-6.5 20-3.7-8.2L4 13Z"/><path d="m12.8 15.8 5.3-5.2"/></svg>
                        <span>{formatCount(shares)}</span>
                    </button>
                    <a className="place-item__engagement-button place-item__directions-button" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${props.coordinates.lat},${props.coordinates.lng}`)}`} target="_blank" rel="noopener noreferrer" aria-label="Get directions" title="Get directions">
                        <svg viewBox="0 0 28 28" aria-hidden="true"><path d="M14 2.5 25.5 14 14 25.5 2.5 14 14 2.5Z"/><path d="M9 18.5 18.5 9M11 9h7.5v7.5"/></svg>
                    </a>
                    <button className="place-item__engagement-button place-item__map-button" type="button" onClick={()=>setShowMap(true)} aria-label="View on map" title="View on map">
                        <svg viewBox="0 0 28 28" aria-hidden="true"><path className="map-pin__shape" d="M14 2.5a9 9 0 0 0-9 9c0 6.1 9 14 9 14s9-7.9 9-14a9 9 0 0 0-9-9Z"/><circle className="map-pin__hole" cx="14" cy="11.5" r="5"/><circle className="map-pin__center" cx="14" cy="11.5" r="2.1"/></svg>
                    </button>
                    {shareError && <small role="status">{shareError}</small>}
                        </div>
                        {auth.isLoggedIn && <section className="place-item__comments">
                            <h3>Comments ({comments.length})</h3>
                            {comments.map((comment,index)=><p key={comment._id || `${comment.text}-${index}`}><strong>{comment.author?.name || 'User'}:</strong> {comment.text}</p>)}
                            <form onSubmit={addComment}><input ref={commentInputRef} aria-label="Write a comment" maxLength="1000" value={commentText} onChange={event=>setCommentText(event.target.value)} placeholder="Write a comment…"/><Button type="submit" disabled={!commentText.trim()}>POST</Button></form>
                        </section>}
                    </section>}
                </div>
            </Card>
        </article>
    </React.Fragment>
}

export default PlaceItem
