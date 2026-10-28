import React,{useEffect,useState} from 'react'
import UserList from '../components/userList.js'
import ErrorModal from "../../shared/components/UIElements/ErrorModal"
import { LoadingText } from '../../shared/components/UI'
import { useHttpClient } from '../../shared/hooks/http-hook.js'
import { backendUrl } from '../../shared/Utils/backend-url.js'

const User = () =>{
    const {isLoading,sendRequest,clearError,error}= useHttpClient()
    const [loadedUser,setLoadedUsers]=useState()
    useEffect(()=>{
        const fetchUsers= async () => {
            try {
                
                const responseData= await sendRequest(backendUrl('api/users'))

            
                setLoadedUsers(responseData.users)

            } catch (error) {
            }
        }
        fetchUsers()
    },[sendRequest])
    
    
    
    return <React.Fragment>
        <ErrorModal error={error} onClear={clearError} />
        <LoadingText isLoading={isLoading} text="users" />
        {!isLoading && loadedUser&& <UserList items ={loadedUser}/>}
        </React.Fragment>
} 


export default User
