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
        <div className="authentication-page">
        <section className="authentication-story" aria-labelledby="authentication-story-title">
            <span className="authentication-story__eyebrow">SNAPIT / THE FIELD JOURNAL</span>
            <h1 id="authentication-story-title">For the places<br/>you <em>remember.</em></h1>
            <p>A photo, a small discovery, a story from the road. Keep the details that make a place yours.</p>
            <ol className="authentication-story__notes">
                <li><span>01</span><div><strong>Find your somewhere</strong><p>Discover places through the people who know them.</p></div></li>
                <li><span>02</span><div><strong>Keep a little of it</strong><p>Collect photographs, stops, and notes along the way.</p></div></li>
                <li><span>03</span><div><strong>Pass the story on</strong><p>Share the places you would go back to.</p></div></li>
            </ol>
            <span className="authentication-story__footer">PHOTOGRAPHS / PLACES / TRIP NOTES</span>
        </section>
        <Card className="authentication" >
            <LoadingText isLoading={isLoading} asOverlay text="your account" />
            <header className="authentication__header">
                <span>{isLoginMode ? 'YOUR JOURNAL IS WAITING' : 'OPEN A NEW CHAPTER'}</span>
                <h2>{isLoginMode ? 'LOGIN' : 'SIGN UP'}</h2>
                <p>{isLoginMode ? 'Welcome back. There is more to explore.' : 'Make a little room for your next adventure.'}</p>
            </header>
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
        <div className="authentication__switch">
            <span>{isLoginMode ? 'New to SnapIt?' : 'Already have an account?'}</span>
        <Button inverse onClick={switchModeHandler}>{isLoginMode?'SignUp':'Login'}</Button>
        </div>
        </Card>
        </div>
        </React.Fragment>
        
    )
}



export default AuthUser
