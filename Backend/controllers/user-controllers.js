const HttpError = require("../models/http-error");
const User = require("../models/user")
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')




const getUser =async(req,res,next)=>{
  let users  
  try {
     users = await User.find({},"-password -followers -following")
    } catch (error) {
      return next(new HttpError("Fetching user failed , try again ",500))
    }
    res.status(200).json( {users : users.map(user=>user.toObject({getters:true}))})
    
}

const followUser = async (req, res, next) => {
  const followerId = req.userData.userId
  const targetId = req.params.uid
  if (followerId === targetId) return next(new HttpError('You cannot follow yourself', 422))
  try {
    const [target, follower] = await Promise.all([User.findById(targetId), User.findById(followerId)])
    if (!target || !follower) return next(new HttpError('User not found', 404))
    await Promise.all([
      User.updateOne({ _id: targetId }, { $addToSet: { followers: followerId } }),
      User.updateOne({ _id: followerId }, { $addToSet: { following: targetId } })
    ])
    res.json({ following: true })
  } catch (error) { return next(new HttpError('Could not follow user', 500)) }
}

const unfollowUser = async (req, res, next) => {
  const followerId = req.userData.userId
  const targetId = req.params.uid
  try {
    await Promise.all([
      User.updateOne({ _id: targetId }, { $pull: { followers: followerId } }),
      User.updateOne({ _id: followerId }, { $pull: { following: targetId } })
    ])
    res.json({ following: false })
  } catch (error) { return next(new HttpError('Could not unfollow user', 500)) }
}

const signUp = async(req,res,next)=>{
  const {name,email,password}=req.body
  const errors=validationResult(req)
  if (!errors.isEmpty()) return next(new HttpError("Invalid data entry",422))
  if(!(name && email && password && req.file)){
    return next(new HttpError("Enter all fields and select a profile image",422))
  }
  let existingUser
  try { existingUser = await User.findOne({email :email}) }
  catch (error) { return next(new HttpError("Could not verify the account",500)) }
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
    image : `/uploads/images/${req.file.filename}`,
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
  if(!(email && password)){
    return next(new HttpError("Enter all the fields",422))
  }
  let identifiedUser
  try { identifiedUser = await User.findOne({email:email}) }
  catch (error) { return next(new HttpError("Could not find account",500)) }

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
exports.followUser=followUser
exports.unfollowUser=unfollowUser
