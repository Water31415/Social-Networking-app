import React,{useState,useContext} from "react";
import Input from "../../shared/components/FormElements/Input";
import { useForm } from "../../shared/hooks/form-hooks";
import {VALIDATOR_REQUIRE,VALIDATOR_EMAIL,VALIDATOR_MINLENGTH} from "../../shared/Utils/Validators"
import ErrorModal from "../../shared/components/UIElements/ErrorModal"
import { LoadingText } from '../../shared/components/UI'
import Button from "../../shared/components/FormElements/Button";
import "./auth.css"
import Card from "../../shared/components/UIElements/Card";
import { AuthContext } from "../../shared/components/context/auth-context";
import { useHttpClient } from "../../shared/hooks/http-hook";
import ImageUpload from "../../shared/components/FormElements/imageUpload";
import { backendUrl } from "../../shared/Utils/backend-url";


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
                    backendUrl('api/users/login'),
                    'POST',
                    JSON.stringify({
                        email : formState.inputs.email.value,
                        password: formState.inputs.password.value
                    }),
                    {'Content-Type':'application/json'}
                )
                auth.login(responseData.userId,responseData.token)
                
            } catch (error) {
                
            }
        
        } else {
            try {
                const formData = new FormData()
                formData.append('email',formState.inputs.email.value)
                formData.append('name',formState.inputs.name.value)
                formData.append('password',formState.inputs.password.value)
                formData.append('image',formState.inputs.image.value)
                const responseData=await sendRequest(backendUrl('api/users/signup'), 'POST',
                    formData,{Authorization : 'Bearer '+ auth.token}
                     )
                    auth.login(responseData.userId , responseData.token)
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
                    name :undefined,
                    image:undefined
                },
                formState.inputs.password.isValid && formState.inputs.email.isValid
            )
            
        } else {
            setFormData({
                ...formState.inputs,
                name:{
                    value :'',
                    isValid :false
                },
                image:{
                    value:null,
                    isValid:false
                }
            },false)
            
        }
        setIsLoginMode(prevMode=>!prevMode)
    }
    
    return (
        <React.Fragment>
            <ErrorModal error ={error} onClear={clearError} />
        <Card className="authentication" >
            <LoadingText isLoading={isLoading} asOverlay text="your account" />
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
            {!isLoginMode && <ImageUpload center id="image" onInput={titleInputHandler}/> }
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
             validators = {[VALIDATOR_REQUIRE(), ...(isLoginMode ? [] : [VALIDATOR_MINLENGTH(6)])]}
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
