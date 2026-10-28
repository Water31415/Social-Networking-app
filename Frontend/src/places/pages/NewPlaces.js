import React,{useContext,useState} from "react";
import { useHistory } from "react-router-dom/cjs/react-router-dom";
import Input from "../../shared/components/FormElements/Input";
import {validate, VALIDATOR_MINLENGTH, VALIDATOR_REQUIRE} from "../../shared/Utils/Validators"
import "./PlaceForm.css"
import Button from "../../shared/components/FormElements/Button";
import { useForm } from "../../shared/hooks/form-hooks";
import { useHttpClient } from "../../shared/hooks/http-hook";
import { AuthContext } from "../../shared/components/context/auth-context";
import { LoadingText } from '../../shared/components/UI';
import ErrorModal from "../../shared/components/UIElements/ErrorModal";
import ImageUpload from "../../shared/components/FormElements/imageUpload";
import { backendUrl } from "../../shared/Utils/backend-url";
import { fetchCurrentLocation } from "../../shared/Utils/current-location"

const NewPlace = ()=>{
    const auth=useContext(AuthContext)
    const {isLoading,sendRequest,error,clearError}= useHttpClient()
    const [address, setAddress] = useState('')
    const [locationLoading, setLocationLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [locationError, setLocationError] = useState('')
    const [formState,titleInputHandler]=useForm(
        {
            title :{
                value:'',
                isValid:false
            },
            description :{
                value:'',
                isValid:false
            },
            address : {
                value :'',
                isValid: false
            }
        
        },false
    )
    const history = useHistory()
    const addressChangeHandler = event => {
        const value = event.target.value
        setAddress(value)
        titleInputHandler('address', value, validate(value, [VALIDATOR_REQUIRE()]))
        setLocationError('')
    }
    const useMyLocationHandler = async () => {
        setLocationError('')
        setLocationLoading(true)
        try {
            const result = await fetchCurrentLocation(sendRequest, auth.token)
            if (result.address) {
                setAddress(result.address)
                titleInputHandler('address', result.address, validate(result.address, [VALIDATOR_REQUIRE()]))
            }
            if (result.error) {
                clearError()
                setLocationError(result.error)
            }
        } catch (locationError) {
            setLocationError(locationError.message || 'Could not read your location. Enter an address instead.')
        } finally {
            setLocationLoading(false)
        }
    }
     const placeSubmitHandler = async event => {
    event.preventDefault();
    setIsSubmitting(true)
    try {
        const formData = new FormData()
        formData.append('title',formState.inputs.title.value)
        formData.append('description',formState.inputs.description.value)
        formData.append('address',formState.inputs.address.value)
        formState.inputs.images.value.forEach(image=>formData.append('images',image))
        await sendRequest(backendUrl('api/places'),
            'POST',
        formData ,{
            Authorization : 'Bearer ' + auth.token
        }
    )
    history.push({ pathname: '/', state: { postSubmitLoadingText: 'your place' } })
    } catch (error) {
        
    } finally {
        setIsSubmitting(false)
    }
        
    
  }
   
    return(<React.Fragment>
        <ErrorModal error={error} onClear={clearError} />
        
         <form className="place-form" onSubmit={placeSubmitHandler}>
            <LoadingText isLoading={isSubmitting} asOverlay text="your place" />
            <Input id="title"
            element ="input"
             type="text" 
             label="Title"
             validators = {[VALIDATOR_REQUIRE()]}
             errorText ="Please enter a valid title" 
             onInput={titleInputHandler} />
            <ImageUpload center multiple id="images" onInput={titleInputHandler}/>
        
             
            <Input id='description'
            element ="textarea"
            type = "text"
             label="Description"
             validators = {[VALIDATOR_MINLENGTH(5)]}
             errorText ="Please enter a valid description" 
             onInput={titleInputHandler} />

             <div className="form-control">
                <label htmlFor="address">Address</label>
                <input id="address" type="text" value={address} onChange={addressChangeHandler} placeholder="Address or place name" required />
             </div>
             <Button type="button" inverse onClick={useMyLocationHandler} disabled={locationLoading || isLoading}>
                {locationLoading ? 'Finding location…' : 'Use my current location'}
             </Button>
             {locationError && <small className="place-location-error" role="alert">{locationError}</small>}


            <Button type="submit" disabled={!formState.isValid || isLoading}>
                {isSubmitting ? 'ADDING PLACE…' : 'ADD PLACE'}
            </Button>
    </form>
</React.Fragment>
    )}

export default NewPlace
