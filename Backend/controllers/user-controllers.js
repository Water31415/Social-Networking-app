const HttpError = require("../models/http-error");
const User = require("../models/user")
const { validationResult } = require('express-validator');





const getUser =async(req,res,next)=>{
  let users  
  try {
     users = await User.find({},"-password")
    } catch (error) {
      return next(new HttpError("Fetching user failed , try again ",500))
    }
    res.status(200).json( {users : users.map(user=>user.toObject({getters:true}))})
    
}

const signUp = async(req,res,next)=>{
  const {name,email,password}=req.body
  if(!(name && email && password)){
    next( new httpError("Enter all the fields",404))
  }
  const existingUser = await User.findOne({email :email})
  if(existingUser){
    return next(new HttpError("User already exist,try diff email",500))
  }
  const createdUser = new User(
    {
      name :name,
      image : "dafafafaf",
      password: password,
      email :email,
      places :[]
    }
  )
  try {
    await createdUser.save()
  } catch (error) {
    console.error(error);
    
    return next(new HttpError("creating user failed , try again",500))
  }
  res.status(201).json({
    user: createdUser.toObject({getters:true})
  })
}

const login =async(req,res,next)=>{
  const errors=validationResult(req)
    if (!errors.isEmpty()) {
        console.error(errors);
        
        return next(new  HttpError("Invalid data entry",422))
        
    }
  const {email,password}=req.body
  if(!(email || password)){
    return next( new HttpError("Enter all the fields"||404))
  }
  const identifiedUser = await User.findOne({email:email})

  if(!identifiedUser||!identifiedUser.password===password){
    return next( new HttpError("user not found or incorrect password",401))
  }
   res.json({
    message: 'Logged in!',
    user: identifiedUser.toObject({ getters: true })
  })

}

exports.signUp=signUp
exports.login=login
exports.getUser=getUser