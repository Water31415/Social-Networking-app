import React from "react";
import "./PlaceItem.css"
import Card from "../../shared/components/UIElements/Card";


const PlaceItem = props=>{
    return (
        <li className="place-item">
            <Card>
                <div className="place-item_image">
                <image src ={props.image} alt ={props.tittle}/>
            </div>
            <div className="place-item_info">
                <h2>{props.tittle}</h2>
                <h3>{props.address}</h3>
                <p>{props.description}</p>
            </div>
            <div className="place-item_actions ">
                <button>VIEW ON MAP</button>
                <button>EDIT</button>
                <button>DELETE</button>
            </div>
            </Card>
        </li>)
}
export default PlaceItem