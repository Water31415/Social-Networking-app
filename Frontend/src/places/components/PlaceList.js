import React from "react";
import "./PlaceList.css"
import Card from "../../shared/components/UIElements/Card";
import PlaceItem from "./PlaceItem";
import Button from "../../shared/components/FormElements/Button";

const PlaceList = props=>{
    
      if ((!props.items || props.items.length)=== 0){
        return (<div className="place-list center">
            <Card>
                <h2>
                    No places found
                </h2>
                <Button to="/places/new" >
                    Share a place
                </Button>
            </Card>
        </div>)
        
     }

     return (<ul className="place-list">
        {props.items.map(place =>(<PlaceItem 
        key ={place.id} 
        id={place.id} 
        image ={place.imageUrl}
        title = {place.title}
        description = {place.description}
        address = {place.address}
        creator = {place.creator}
        coordinates = {place.location}
        onDelete = {props.onDeletePlace}
          />))}
     </ul>)

}
export default PlaceList