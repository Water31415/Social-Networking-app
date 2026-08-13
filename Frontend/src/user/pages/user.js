import React,{useEffect,useState} from 'react'
import UserList from '../components/userList.js'
import ErrorModal from "../../shared/components/UIElements/ErrorModal"
import LoadingSpinner from "../../shared/components/UIElements/LoadingSpinner"
import { useHttpClient } from '../../shared/hooks/http-hook.js'

const User = () =>{
    const {isLoading,sendRequest,clearError,error}= useHttpClient()
    const [loadedUser,setLoadedUsers]=useState()
    useEffect(()=>{
        const fetchUsers= async () => {
            try {
                
                const responseData= await sendRequest('http://localhost:5000/api/users')

            
                setLoadedUsers(responseData.users)

            } catch (error) {
            }
        }
    },[sendRequest])
    
    
    
    return <React.Fragment>
        <ErrorModal error={error} onClear={clearError} />
        {isLoading && <div className='center'>
            <LoadingSpinner/>
            </div>}
        {!isLoading && loadedUser&& <UserList items ={loadedUser}/>}
        </React.Fragment>
} 


export default User