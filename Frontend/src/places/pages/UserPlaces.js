import React,{useState,useEffect} from "react";
import PlaceList from "../components/PlaceList";
import { useParams } from "react-router-dom";
import { useHttpClient } from "../../shared/hooks/http-hook";
import ErrorModal from "../../shared/components/UIElements/ErrorModal";
import { LoadingText } from '../../shared/components/UI';
import { backendUrl } from "../../shared/Utils/backend-url";
import './places.css';
import './UserPlaces.css';

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
      {!isLoading && loadedPlaces && <header className="user-journal-header">
        <div className="user-journal-header__intro">
          <span className="user-journal-header__eyebrow">SNAPIT / A TRAVELER'S FIELD NOTES</span>
          <h1>{loadedPlaces[0]?.creatorName ? `${loadedPlaces[0].creatorName}’s journal.` : 'A travel journal.'}</h1>
          <p>A collection of places, little discoveries, and days worth remembering.</p>
        </div>
        <div className="user-journal-header__count"><strong>{String(loadedPlaces.length).padStart(2, '0')}</strong><span>{loadedPlaces.length === 1 ? 'place kept' : 'places kept'}</span></div>
      </header>}
      {!isLoading && loadedPlaces && <PlaceList items={loadedPlaces} onDeletePlace={placeDeleteHandler} tripFeedUserId={userId} />}
          
          
          
          
          </React.Fragment>)
}
export default UserPlaces
