import React,{useState,useContext}from "react";
import "./PlaceItem.css"
import Card from "../../shared/components/UIElements/Card";
import Button from "../../shared/components/FormElements/Button"
import Modal from "../../shared/components/UIElements/Modal";
import Map from "../../shared/components/UIElements/Map";
import { AuthContext } from "../../shared/components/context/auth-context";

const PlaceItem = props=>{
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
    const cancelDeleteHandler=()=>{
        setShowConfirmModal(false)
    }
    const confirmDeleteHandler=()=>{
        setShowConfirmModal(false)
        console.log("....deleting")
    }
    let routes 
    if (auth.isLoggedIn) {
         routes=( <div>
                <Button to ={`/places/${props.id}`}>EDIT</Button>
                <Button danger onClick={showDeleteWarningHandler}>DELETE</Button>
                
            </div>)
    }

    return (
        <React.Fragment>
            <Modal 
            show ={showMap} 
            onCancel ={closeMaphandler} 
            header ={props.address} 
            contentClass = "place-item__modal-content"
            footerClass ="place-item__modal-content"
            footer ={<Button onClick={closeMaphandler}>CLOSE</Button>}>
                <div className="map-container">
                    <Map center={props.coordiantes} zoom={16}/>
                </div>
            </Modal>
            <Modal
            show={showConfirmModal}
            onCancel={cancelDeleteHandler} 
            header="Are you sure" 
            footerClass="place-item__modal-actions" 
            footer={
                <React.Fragment>
                    <Button inverse onClick={cancelDeleteHandler}>Cancel</Button>
                    <Button danger onClick={confirmDeleteHandler}>Delete</Button>
                </React.Fragment>
            } >
                Do you want to delete this place?
            </Modal>
        <li className="place-item">
            <Card className ="place-item__content">
                <div className="place-item__image">
                <image src ={props.image} alt ={props.tittle}/>
            </div>
            <div className="place-item__info">
                <h2>{props.tittle}</h2>
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