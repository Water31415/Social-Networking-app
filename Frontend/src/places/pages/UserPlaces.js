import React,{useState,useEffect} from "react";
import PlaceList from "../components/PlaceList";
import { useParams } from "react-router-dom";
import { useHttpClient } from "../../shared/hooks/http-hook";
import ErrorModal from "../../shared/components/UIElements/ErrorModal";
import LoadingSpinner from "../../shared/components/UIElements/LoadingSpinner";

const UserPlaces =  props=>{
  const[loadedPlaces,setLoadedPlaces]=useState()
  const {userId} = useParams()
  const {clearError,sendRequest,isLoading,error}= useHttpClient()
  console.log("plscess----->>>>", userId);

  useEffect(() => {
  const fetchUser = async () => {
    try {
      const responseData = await sendRequest(
        `${process.env.REACT_APP_BACKEND_URL}api/places/user/${userId}`
      );

     // console.log("responseData:", responseData);
      //console.log("responseData1", responseData.place);
      //console.log("responseData1", responseData.places);

    setLoadedPlaces(responseData.place);
    } catch (error) {
      console.log(error);
    }
  };

  fetchUser();
}, [sendRequest, userId]);

  const placeDeleteHandler= (deletedPlaceId)=>{
    setLoadedPlaces(prevPlaces=>prevPlaces.filter(place=>place.id!==deletedPlaceId))
  }
    

    return (<React.Fragment>
      <ErrorModal error={error} onClear={clearError} />
      {isLoading && (<div className="center" >
        <LoadingSpinner/>
        </div>)}
      {!isLoading && loadedPlaces && <PlaceList items={loadedPlaces} onDeletePlace={placeDeleteHandler} />}
          
          
          
          
          </React.Fragment>)
}
export default UserPlaces