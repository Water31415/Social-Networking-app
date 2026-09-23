import React,{useState,useContext}from "react";
import "./PlaceItem.css"
import Card from "../../shared/components/UIElements/Card";
import Button from "../../shared/components/FormElements/Button"
import Modal from "../../shared/components/UIElements/Modal";
import Map from "../../shared/components/UIElements/Map";
import { AuthContext } from "../../shared/components/context/auth-context";
import { useHttpClient } from "../../shared/hooks/http-hook";
import ErrorModal from "../../shared/components/UIElements/ErrorModal";
import LoadingSpinner from "../../shared/components/UIElements/LoadingSpinner";

const PlaceItem = props=>{
    const {isLoading,sendRequest,error,clearError}= useHttpClient()
    const auth=useContext(AuthContext)

    const [showMap,setShowMap] = useState(false)
    const [showConfirmModal,setShowConfirmModal]=useState(false)

    const openMaphandler= ()=> {
            setShowMap(true)}


    const closeMaphandler= ()=>{
         setShowMap(false)}

    const showDeleteWarningHandler=()=>{
        setShowConfirmModal(true)
    }
    const cancelDeleteWarningHandler=()=>{
        setShowConfirmModal(false)
    }
    const confirmDeleteHandler=async()=>{
        setShowConfirmModal(false)
        try {
            await sendRequest(`${process.env.REACT_APP_BACKEND_URL}api/places/${props.id}`,'DELETE',null,{Authorization : 'Bearer '+auth.token})
       
         props.onDelete(props.id)
         console.log(auth.userId);
         console.log(props.creator);
         
         
        }
         catch (error) {
            
        } }
    let routes 
    if (auth.userId === props.creator) {
         routes=( <div>
                <Button to ={`/places/${props.id}`}>EDIT</Button>
                <Button danger onClick={showDeleteWarningHandler}>DELETE</Button>
                
            </div>)
    }

    return (
        <React.Fragment>
            <ErrorModal error ={error} onClear={clearError} />
            <Modal 
            show ={showMap} 
            onCancel ={closeMaphandler} 
            header ={props.address} 
            contentClass = "place-item__modal-content"
            footerClass ="place-item__modal-content"
            footer ={<Button onClick={closeMaphandler}>CLOSE</Button>}>
                <div className="map-container">
                    <Map center={props.coordinates} zoom={16}/>
                </div>
            </Modal>
            <Modal
            show={showConfirmModal}
            onCancel={cancelDeleteWarningHandler} 
            header="Are you sure" 
            footerClass="place-item__modal-actions" 
            footer={
                <div>
                    <Button inverse onClick={cancelDeleteWarningHandler}>Cancel</Button>
                    <Button danger onClick={confirmDeleteHandler}>Delete</Button>
                </div>
            } >
                Do you want to delete this place?
            </Modal>
        <li className="place-item">
            <Card className ="place-item__content">
                {isLoading && <LoadingSpinner asOverlay />}
                <div className="place-item__image">
                <img src ={`${process.env.REACT_APP_BACKEND_URL}${props.image}`} alt ={props.title}/>
            </div>
            <div className="place-item__info">
                <h2>{props.title}</h2>
                <h3>{props.address}</h3>
                <p>{props.description}</p>
            </div>
            <div className="place-item__actions ">
                <Button inverse onClick={openMaphandler}>VIEW ON MAP</Button>
                {routes}
            </div>
                
            </Card>
        </li>
        </React.Fragment>)
}
export default PlaceItem