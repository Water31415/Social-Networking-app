import React,{useState} from 'react'
import PlaceList from '../components/PlaceList'
import Button from '../../shared/components/FormElements/Button'
import Card from '../../shared/components/UIElements/Card'
import ErrorModal from '../../shared/components/UIElements/ErrorModal'
import { LoadingText } from '../../shared/components/UI'
import { useHttpClient } from '../../shared/hooks/http-hook'
import { backendUrl } from '../../shared/Utils/backend-url'
import './NearbyPlaces.css'

const NearbyPlaces=()=>{
    const {isLoading,error,clearError,sendRequest}=useHttpClient()
    const [places,setPlaces]=useState(null)
    const [locationError,setLocationError]=useState('')
    const [searching,setSearching]=useState(false)
    const findingNearby = isLoading || searching
    const placeDeleteHandler = deletedPlaceId => {
        setPlaces(current => current?.filter(place => String(place.id || place._id) !== String(deletedPlaceId)) ?? current)
    }
    const findNearby=()=>{
        if (findingNearby) return
        setLocationError('')
        if(!navigator.geolocation){
            setLocationError('Location services are not available in this browser.')
            return
        }
        setSearching(true)
        try {
            navigator.geolocation.getCurrentPosition(async position=>{
                try {
                    const {latitude,longitude}=position.coords
                    const result=await sendRequest(backendUrl(`api/places/nearby?lat=${latitude}&lng=${longitude}&radius=100`))
                    setPlaces(result.places)
                } catch(error) { setLocationError(error.message || 'Could not load nearby places.') }
                finally { setSearching(false) }
            },
                ()=>{ setLocationError('Location permission is needed to find places near you.'); setSearching(false) },
                {enableHighAccuracy:false,timeout:10000,maximumAge:300000}
            )
        } catch (error) {
            setLocationError(error.message || 'Could not read your location.')
            setSearching(false)
        }
    }
    return <main className="nearby-page">
        <ErrorModal error={error} onClear={clearError}/>
        {places === null && <Card className="nearby-page__intro">
            <h1>Places near me</h1>
            <p>Find shared places within 100 km of your current location.</p>
            <Button type="button" onClick={findNearby} disabled={findingNearby}>{searching && !isLoading ? 'FINDING LOCATION…' : 'FIND NEAR ME'}</Button>
        </Card>}
        {locationError && <p className="nearby-page__message" role="status">{locationError}</p>}
        <LoadingText isLoading={findingNearby} text={searching && !isLoading ? 'your location' : 'nearby places'} />
        {places && !findingNearby && (places.length ? <PlaceList items={places} includeTripFeed={false} onDeletePlace={placeDeleteHandler}/> : <Card className="nearby-page__message"><p>No places found within 100 km. Try again later.</p></Card>)}
    </main>
}

export default NearbyPlaces
