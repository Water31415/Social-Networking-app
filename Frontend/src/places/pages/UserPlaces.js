import React,{useState,useEffect} from "react";
import PlaceList from "../components/PlaceList";
import { useParams } from "react-router-dom";
import { useHttpClient } from "../../shared/hooks/http-hook";
import ErrorModal from "../../shared/components/UIElements/ErrorModal";
import LoadingSpinner from "../../shared/components/UIElements/LoadingSpinner";

const UserPlaces =  props=>{
  const[loadedPlaces,setLoadedPlaces]=useState()
  const userId = useParams().userId
  const {clearError,sendRequest,isLoading,error}= useHttpClient()

  useEffect(()=>{
    try {
      const fetchUser=async () => {
        const responseData=await sendRequest(`http://localhost:5000/api/places/users/${userId}`)
        setLoadedPlaces(responseData.places)
      }
    } catch (error) {
      
    }
  },[sendRequest,userId])
    

    return <React.Fragment>
      <ErrorModal error={error} onClear={clearError} />
      {isLoading && (<div className="center" >
        <LoadingSpinner/>
        </div>)}
      <PlaceList item={loadedPlaces}/>
          
          
          
          
          </React.Fragment>
}
export default UserPlaces