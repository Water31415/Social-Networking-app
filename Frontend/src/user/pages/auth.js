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


const AuthUser =()=>{
    const auth=useContext(AuthContext)

    const[isLoginMode,setIsLoginMode]=useState(true)
    const [isLoading,setIsLoading]=useState(false)
    const[error,setError]=useState()

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
            
        } else {
            try {
                const response =await fetch('http://localhost:5000/api/users/signup',{
                    method : 'POST',
                    headers : {
                        'Content-Type': 'application/json'
                    },
                    body : JSON.stringify({
                        name : formState.inputs.name.value,
                        email:formState.inputs.email.value,
                        password:formState.inputs.password.value
                    })})
                    const responseData = await response.json()
                    if (!response.ok) {
                        throw new Error(response.message)
                    }
                    console.log(responseData)
                    setIsLoading(false)
                    auth.login()
            } catch (error) {
                console.error(error);
                setIsLoading(false)
                setError(error.message||'something went wrong')
                
            }
        }
        
        
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
    const errorhandler=()=>{
        setError(null)
    }
    return (
        <React.Fragment>
            <ErrorModal error ={error} onClear={errorhandler} />
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