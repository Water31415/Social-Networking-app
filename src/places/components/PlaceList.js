import React from "react";
import "./PlaceList.css"
import Card from "../../shared/components/UIElements/Card";
import PlaceItem from "./PlaceItem";

const PlaceList = props=>{
     if (props.item.length === 0) {
        return (<div className="place-list-center">
            <Card>
                <h2>
                    No places found
                </h2>
                <button>
                    Share a place
                </button>
            </Card>
        </div>)
        
     }
     return <ul className="place-list">
        {props.item.map(place =><PlaceItem 
        key ={place.id} 
        id={place.id} 
        image ={place.image}
        tittle = {place.tittle}
        description = {place.description}
        address = {place.address}
        creatorId = {place.creator}
        coordinates = {place.location}
          />)}
     </ul>

}
export default PlaceList