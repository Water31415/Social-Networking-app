import React,{useState} from "react";
import Input from "../../shared/components/FormElements/Input";
import { useForm } from "../../shared/hooks/form-hooks";
import {VALIDATOR_REQUIRE,VALIDATOR_EMAIL} from "../../shared/Utils/Validators"
import Button from "../../shared/components/FormElements/Button";
import "./auth.css"
import Card from "../../shared/components/UIElements/Card";



const AuthUser =()=>{
    const[isLoginMode,setIsLoginMode]=useState(true)

    const [formState,titleInputHandler,setFormData]=useForm({
        email :{
            value : '' ,
            isValid : false
        },
        password :{
            value : '' ,
            isValid : false

        }
    })
    const authSubmitHandler=event =>{
        event.preventDefault()
        console.log(formState)
    }
    const switchModeHandler=()=>{
        if (!isLoginMode) {
            setFormData(
                {
                    ...formState.inputs,
                    name :undefined
                },
                formState.inputs.password.isValid && formState.inputs.email.isValid
            )
            
        } else {
            setFormData({
                ...formState.inputs,
                name:{
                    value :'',
                    isValid :false
                }
            },false)
            
        }
        setIsLoginMode(prevMode=>!prevMode)
    }

    return (
        <Card className="authentication" >
            <h2>LOGIN</h2>
        <form onSubmit={authSubmitHandler}>
            {!isLoginMode && (<Input
                element ="Input"
                id="name"
                type="text"
                label ="Your Name"
                validators={VALIDATOR_REQUIRE()}
                errorText="Please enter a name"
                onInput ={titleInputHandler}
            />)}

            <Input id="email"
            element ="input"
             type="email" 
             label="Email Address"
             validators = {[VALIDATOR_REQUIRE(),VALIDATOR_EMAIL()]}
             errorText ="Please enter a valid email" 
            onInput={titleInputHandler} />

            <Input id="password"
            element ="input"
             type="password" 
             label="Password"
             validators = {[VALIDATOR_REQUIRE()]}
             errorText ="Please enter password" 
             onInput={titleInputHandler} />
        
            <Button type ="submit" disabled={!formState.isValid}>{isLoginMode?'Login':'SignUp'}</Button>
        </form>
        <Button inverse onClick={switchModeHandler}>{isLoginMode?'SignUp':'Login'}</Button>
        </Card>
        
    )
}



export default AuthUser