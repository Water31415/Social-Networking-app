import React ,{useEffect,useState} from "react";
import { useParams } from "react-router-dom";  
import Input from "../../shared/components/FormElements/Input"
import Button from "../../shared/components/FormElements/Button";
import { validate, VALIDATOR_MINLENGTH, VALIDATOR_REQUIRE } from "../../shared/Utils/Validators";
import "./PlaceForm.css"
import { useForm } from "../../shared/hooks/form-hooks";

const DUMMY_PLACES = [
  {
    id: 'p1',
    title: 'Empire State Building',
    description: 'One of the most famous sky scrapers in the world!',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/NYC_Empire_State_Building.jpg/640px-NYC_Empire_State_Building.jpg',
    address: '20 W 34th St, New York, NY 10001',
    location: {
      lat: 40.7484405,
      lng: -73.9878584
    },
    creator: 'u1'
  },
  {
    id: 'p2',
    title: 'Empire State Building',
    description: 'One of the most famous sky scrapers in the world!',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/NYC_Empire_State_Building.jpg/640px-NYC_Empire_State_Building.jpg',
    address: '20 W 34th St, New York, NY 10001',
    location: {
      lat: 40.7484405,
      lng: -73.9878584
    },
    creator: 'u2'
  }
];

const UpdatePlace =()=>{
    const[isLoading,setIsLoading]=useState(true)
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
      const identifiedPlace =DUMMY_PLACES.find(p=>p.id===placeId)
      useEffect(()=>{
        if(identifiedPlace){
        setFormData({
        title:{
            value:identifiedPlace.title,
            isValid:true
        },
        description:{
            value:identifiedPlace.description,
            isValid:true
        }
      },true)
      setIsLoading(false)

}},[setFormData,identifiedPlace])

    if (!identifiedPlace) {
        return(
            <div className="center">
                <h2>Could not find place</h2>
            </div>
        )
        
    }
    if(!isLoading){
        return(
            <div className="center">
                <h2>Loading...</h2>
            </div>

        )
    }
    return ( 
        <form className="place-form">
            <Input
            id="title"
            element ="input"
            type="text"
            label="Title"
            validators={[VALIDATOR_REQUIRE()]}
            errorText="Please enter valid title"
            onInput ={titleInputHandler}
            value={formState.inputs.title.value}
            valid ={formState.inputs.title.isValid}
            />
            <Input
            id="description"
            element ="textarea"
            label="Description"
            validators={[VALIDATOR_MINLENGTH(5)]}
            errorText="Please enter description"
            onInput ={titleInputHandler}
            value={formState.inputs.description.value}
            valid ={formState.inputs.description.isValid}
            />
            <Button  type="submit" disabled={!formState.isValid}>Submit</Button>
        </form>
    )
}

export default UpdatePlace   