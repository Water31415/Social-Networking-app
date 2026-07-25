import React,{useCallback,useReducer} from "react";
import Input from "../../shared/components/FormElements/Input";
import {validate, VALIDATOR_MINLENGTH, VALIDATOR_REQUIRE} from "../../shared/Utils/Validators"
import "./PlaceForm.css"
import Button from "../../shared/components/FormElements/Button";
import { useForm } from "../../shared/hooks/form-hooks";


const NewPlace = ()=>{
    const [formState,titleInputHandler]=useForm(
        {
            title :{
                value:'',
                isValid:false
            },
            description :{
                value:'',
                isValid:false
            }
        
        },false
    )
     const placeSubmitHandler = event => {
    event.preventDefault();
    console.log(formState.inputs); // send this to the backend!
  }
   
    return <form className="place-form" onSubmit={placeSubmitHandler}>
            <Input id="title"
            element ="input"
             type="text" 
             label="Title"
             validators = {[VALIDATOR_REQUIRE()]}
             errorText ="Please enter a valid title" 
             onInput={titleInputHandler} />
             
            <Input id='description'
            element ="textara"
             label="Description"
             validators = {[VALIDATOR_MINLENGTH(5)]}
             errorText ="Please enter a valid description" 
             onInput={titleInputHandler} />

             <Input id='address '
             element ="input"
             label="Address"
             validators = {[VALIDATOR_REQUIRE()]}
             errorText ="Please enter a valid address" 
             onInput={titleInputHandler} />


            <Button type="submit" disabled={!formState.isValid}>
                ADD PLACE
            </Button>
    </form>

}

export default NewPlace