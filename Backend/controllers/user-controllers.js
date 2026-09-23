const HttpError = require("../models/http-error");
const User = require("../models/user")
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')




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

  let hashedPassword
  try {
    hashedPassword= await bcrypt.hash(password,12)
  } catch (error) {
    return next(new HttpError('couldnot create user try again',500))
    
  }
  const createdUser = new User(
    {
      name :name,
      image : req.file.path,
      password: hashedPassword,
      email :email,
      places :[]
    }
  )
  try {
    await createdUser.save()
  } catch (error) {
    //console.error(error);
    
    return next(new HttpError("creating user failed , try again",500))
  }
  let token
  try {
    token = jwt.sign(
      {userId : createdUser.id , email : createdUser.email},`${process.env.JWT_API_KEY}`,{expiresIn :'1h'})
  } catch (error) {
    return next(new HttpError("creating user failed , try again",500))
  }

  res.status(201).json({
    userId : createdUser.id ,email:createdUser.email , token :token})
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

  if(!identifiedUser){
    return next( new HttpError("user not found or incorrect password",401))
  }
  let isValidPassword= false
  try {
    isValidPassword= await bcrypt.compare(password,identifiedUser.password)

  } catch (error) {
    return next(new HttpError('password is incorrect',500))
  }
  if(!isValidPassword){
     return next( new HttpError("could not login",401))
  }
  let token 
  try {
    token = jwt.sign({
      userId:identifiedUser.id, email :identifiedUser.email
    },`${process.env.JWT_API_KEY}`,{expiresIn:'1h'})
  } catch (error) {
     return next(new HttpError("creating user failed , try again",500))
  }
   res.json({
    userId :identifiedUser.id,
    email :identifiedUser.email,
    token:token
  })

}

exports.signUp=signUp
exports.login=login
exports.getUser=getUser