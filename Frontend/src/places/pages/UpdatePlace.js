import React ,{useEffect,useState,useContext} from "react";
import { AuthContext } from "../../shared/components/context/auth-context";

import { useParams,useHistory } from "react-router-dom";  
import Input from "../../shared/components/FormElements/Input"
import Button from "../../shared/components/FormElements/Button";
import { validate, VALIDATOR_MINLENGTH, VALIDATOR_REQUIRE } from "../../shared/Utils/Validators";
import "./PlaceForm.css"
import { useForm } from "../../shared/hooks/form-hooks";
import { useHttpClient } from "../../shared/hooks/http-hook";
import ErrorModal from "../../shared/components/UIElements/ErrorModal";
import LoadingSpinner from "../../shared/components/UIElements/LoadingSpinner";
import Card from "../../shared/components/UIElements/Card";

const UpdatePlace =()=>{
    const {auth}=useContext(AuthContext)
    const history = useHistory()
    const{isLoading,sendRequest,error,clearError}=useHttpClient()
    const[loadedPlaces,setLoadedPlaces]=useState()
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
         
             
                 const responseData = await sendRequest(`http://localhost:5000/api/places/${placeId}`)
                     
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
        
       }}
       fetchUser()
     
      

},[setFormData,sendRequest,placeId])

    const placeUpdateSubmitHandler= async event=>{
        event.preventDefault()
        try {
            
                await sendRequest(`http://localhost:5000/api/places/${placeId}`,
                    'PATCH',
                    JSON.stringify({
                        title : formState.inputs.title.value,
                        description : formState.inputs.description.value
                    }),
                    {'Content-Type': 'application/json'}
                )
                
                history.push('/'+  auth.userId + '/places')
                console.log(formState);

            
        } catch (error) {
            
        }
    }   

  if(isLoading){
    
    
        return(
            
            <div className="center">
                <LoadingSpinner/>
            </div>

        )
    }
    if (!loadedPlaces &&!error ) {
    
        return(
        
            <div className="center">
                <Card>
                    <h2>
                        Could not find place
                    </h2>
                </Card>
            </div>
        )
        
    }
  
    return ( 
    <React.Fragment>
        <ErrorModal error={error} onClear={clearError} />
        {!isLoading && loadedPlaces && (<form className="place-form" onSubmit={placeUpdateSubmitHandler} >
            <Input
            id="title"
            element ="input"
            type="text"
            label="Title"
            validators={[VALIDATOR_REQUIRE()]}
            errorText="Please enter valid title"
            onInput ={titleInputHandler}
            value={loadedPlaces.title}
            valid ={true}
            />
            <Input
            id="description"
            element ="textarea"
            label="Description"
            validators={[VALIDATOR_MINLENGTH(5)]}
            errorText="Please enter description"
            onInput ={titleInputHandler}
            value={loadedPlaces.description}
            valid ={true}
            />
            <Button  type="submit" disabled={!formState.isValid}>Submit</Button>
        </form>)}
  </React.Fragment>  )
}

export default UpdatePlace   