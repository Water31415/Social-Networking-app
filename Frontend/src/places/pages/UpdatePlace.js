import React ,{useEffect,useState,useContext} from "react";
import { AuthContext } from "../../shared/components/context/auth-context";

import { useParams,useHistory } from "react-router-dom";  
import Input from "../../shared/components/FormElements/Input"
import Button from "../../shared/components/FormElements/Button";
import { VALIDATOR_MINLENGTH, VALIDATOR_REQUIRE } from "../../shared/Utils/Validators";
import "./PlaceForm.css"
import { useForm } from "../../shared/hooks/form-hooks";
import { useHttpClient } from "../../shared/hooks/http-hook";
import ErrorModal from "../../shared/components/UIElements/ErrorModal";
import { LoadingText } from '../../shared/components/UI';
import Card from "../../shared/components/UIElements/Card";
import { backendUrl } from "../../shared/Utils/backend-url";

const UpdatePlace =()=>{
    const auth=useContext(AuthContext)
    const history = useHistory()
    const{isLoading,sendRequest,error,clearError}=useHttpClient()
    const[loadedPlaces,setLoadedPlaces]=useState()
    const[placeLookupComplete,setPlaceLookupComplete]=useState(false)
    const {placeId} = useParams()

    const [formState,titleInputHandler ,setFormData]=useForm({
        title:{
            value:'',
            isValid:false
        },
        description:{
            value:'',
            isValid:false
        }

    },false)
      
      useEffect(()=>{
        const fetchUser = async () => {
       try {
         
             
                 const responseData = await sendRequest(backendUrl(`api/places/${placeId}`))
                     
                 setLoadedPlaces(responseData.place)
                 setFormData({
              title:{
                 value:responseData.place.title,
                 isValid:true
             },
             description:{
             value:responseData.place.description,
             isValid:true}
         },true)
         
       } catch (error) {
       } finally {
          setPlaceLookupComplete(true)
       }}
       fetchUser()
     
      

},[setFormData,sendRequest,placeId])

    const placeUpdateSubmitHandler= async event=>{
        event.preventDefault()
 
        try {
            
                await sendRequest(backendUrl(`api/places/${placeId}`),
                    'PATCH',
                    JSON.stringify({
                        title : formState.inputs.title.value,
                        description : formState.inputs.description.value
                    }),
                    {'Content-Type': 'application/json',Authorization : 'Bearer '+ auth.token }
                    
                    
                )
                
                
                history.push('/'+  auth.userId + '/places')

            
        } catch (error) {
        }
    }   

    return ( 
    <React.Fragment>
        <ErrorModal error={error} onClear={clearError} />
        <LoadingText isLoading={!placeLookupComplete || isLoading} text="place" />
        {placeLookupComplete && !loadedPlaces && !error && <div className="center"><Card><h2>Could not find place</h2></Card></div>}
        {!isLoading && loadedPlaces && (<form className="place-form" onSubmit={placeUpdateSubmitHandler} >
            <header className="place-form__header">
                <span>FIELD NOTE / EDIT PLACE</span>
                <h1>Refine the details.</h1>
                <p>A fresh title or a little more of the story.</p>
            </header>
            <Input
            id="title"
            element ="input"
            type="text"
            label="Title"
            validators={[VALIDATOR_REQUIRE()]}
            errorText="Please enter valid title"
            onInput ={titleInputHandler}
            value={loadedPlaces.title}
            isValid ={true}
            />
            <Input
            id="description"
            element ="textarea"
            label="Description"
            validators={[VALIDATOR_MINLENGTH(5)]}
            errorText="Please enter description"
            onInput ={titleInputHandler}
            value={loadedPlaces.description}
            isValid ={true}
            />
            <Button  type="submit" disabled={!formState.isValid}>Submit</Button>
        </form>)}
  </React.Fragment>  )
}

export default UpdatePlace
