import React,{useState,useEffect} from "react";
import PlaceList from "../components/PlaceList";
import { useParams } from "react-router-dom";
import { useHttpClient } from "../../shared/hooks/http-hook";
import ErrorModal from "../../shared/components/UIElements/ErrorModal";
import { LoadingText } from '../../shared/components/UI';
import { backendUrl } from "../../shared/Utils/backend-url";
import './places.css';

const UserPlaces =  props=>{
  const[loadedPlaces,setLoadedPlaces]=useState()
  const {userId} = useParams()
  const {clearError,sendRequest,isLoading,error}= useHttpClient()

  useEffect(() => {
  const fetchUser = async () => {
    try {
      const responseData = await sendRequest(
        backendUrl(`api/places/user/${userId}`)
      );


    const places=(responseData.place || []).map(place=>({...place,id:(place.id || place._id).toString()}))
    setLoadedPlaces(places)
    const placeAnchor=window.location.hash.slice(1)
    if(placeAnchor) setTimeout(()=>document.getElementById(placeAnchor)?.scrollIntoView({behavior:'smooth'}),0)
    } catch (error) {
      console.log(error);
    }
  };

  fetchUser();
}, [sendRequest, userId]);

  const placeDeleteHandler= (deletedPlaceId)=>{
    const deletedId=deletedPlaceId.toString()
    setLoadedPlaces(prevPlaces=>prevPlaces.filter(place=>place.id!==deletedId))
  }
    

    return (<React.Fragment>
      <ErrorModal error={error} onClear={clearError} />
      <LoadingText isLoading={isLoading} text="places" />
      {!isLoading && loadedPlaces && <PlaceList items={loadedPlaces} onDeletePlace={placeDeleteHandler} tripFeedUserId={userId} />}
          
          
          
          
          </React.Fragment>)
}
export default UserPlaces
