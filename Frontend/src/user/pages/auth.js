import React,{useState,useContext} from "react";
import Input from "../../shared/components/FormElements/Input";
import { useForm } from "../../shared/hooks/form-hooks";
import {VALIDATOR_REQUIRE,VALIDATOR_EMAIL} from "../../shared/Utils/Validators"
import ErrorModal from "../../shared/components/UIElements/ErrorModal"
import LoadingSpinner from "../../shared/components/UIElements/LoadingSpinner"
import Button from "../../shared/components/FormElements/Button";
import "./auth.css"
import Card from "../../shared/components/UIElements/Card";
import { AuthContext } from "../../shared/components/context/auth-context";
import { useHttpClient } from "../../shared/hooks/http-hook";


const AuthUser =()=>{
    const auth=useContext(AuthContext)

    const[isLoginMode,setIsLoginMode]=useState(true)
    
    const {isLoading,error,sendRequest,clearError}=useHttpClient()

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
    const authSubmitHandler= async event =>{
        event.preventDefault()
        if (isLoginMode) {
            try {
                const responseData=await sendRequest(
                    'http://localhost:5000/api/users/login',
                    'POST',
                    JSON.stringify({
                        email : formState.inputs.email.value,
                        password: formState.inputs.password.value
                    }),
                    {'Content-Type':'application/json'}
                )
                auth.login(responseData.user.id)
                console.log(responseData);
                
            } catch (error) {
                
            }
        
        } else {
            try {
                const responseData=await sendRequest('http://localhost:5000/api/users/signup', 'POST',JSON.stringify({
                        name : formState.inputs.name.value,
                        email:formState.inputs.email.value,
                        password:formState.inputs.password.value
                     }),
                    {
                        'Content-Type': 'application/json'
                    },
                     )
                    auth.login(responseData.user.id)
            } catch (error) {

                
            }
        }
        
        
    }
    const switchModeHandler=async event=>{
        event.preventDefault()
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
        <React.Fragment>
            <ErrorModal error ={error} onClear={clearError} />
        <Card className="authentication" >
            {isLoading && <LoadingSpinner asOverlay />}
            <h2>LOGIN</h2>
        <form onSubmit={authSubmitHandler}>
            {!isLoginMode && (<Input
                element ="input"
                id="name"
                type="text"
                label ="Your Name"
                validators={[VALIDATOR_REQUIRE()]}
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
        </React.Fragment>
        
    )
}



export default AuthUser