import React from 'react'
import UserList from '../components/userList.js'

const User = () =>{
    const USERS = [{id :'1',name : 'sarthak',image :'https://unsplash.com/photos/sunflower-field-during-day-time-lk3F07BN8T8',places : 3}]
    return <UserList items ={USERS}/>
} 


export default User