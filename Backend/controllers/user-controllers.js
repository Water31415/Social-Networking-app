const httpError=require("../models/http-error")
const uuid = require("uuid/v4")

const DUMMY_USERS = [
  {
    id: 'u1',
    name: 'Max Schwarz',
    email: 'test@test.com',
    password: 'testers'
  }
];




const getUser =(req,res,next)=>{
    res.status(200).json({users : DUMMY_PLACES})
    
}

const signUp = (req,res,next)=>{
  const {name,email,password}=req.body
  if(!(name && email && password)){
    throw new httpError("Enter all the fields",404)
  }
  const createdUser={
    id : uuid(),
    name,
    email,
    password
  }
  DUMMY_USERS.push(createdUser)
  res.status(201).json({
    message : "user created",
    createdUser
  })
}

const login =(req,res,next)=>{
  const {email,password}=req.body
  if(!(email || password)){
    throw new httpError("Enter all the fields"||404)
  }
  const identifiedUser = DUMMY_USERS.find(p=>p.email===email)
  if(!identifiedUser||!identifiedUser.password===password){
    throw new httpError("no valid info",401)
  }

}

exports.signUp=signUp
exports.login=login
exports.getUser=getUser