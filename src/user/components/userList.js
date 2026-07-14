import React from "react";
import './userList.css'
import UserItem from "./userItem.js";
import Card from "../../shared/components/UIElements/Card.js";


const UserList = props =>{
    if(props.items.lenght === 0){
        return (
            <Card className="center">
                <h2>
                    No users found
                </h2>
            </Card>
        )
    }
    return <ul>
        {props.items.map(user =>{
            return <UserItem
            key ={user.id}
            id = {user.id}
            image = {user.image}
            name = {user.name}
            placeCount = {user.places} 
            />
        })}
    </ul>

} 
export default UserList 
