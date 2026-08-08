const uuid = require('uuid/v4')
const mongoose = require("mongoose")
const {validationResult}=require('express-validator')
const HttpError = require('../models/http-error')
const getCoordsForAddress = require('../utils/location')
const Place =require("../models/places")
const User = require("../models/user")



const getPlacesByPlaceId=async(req,res,next)=>{
    const placeId = req.params.pid
    const place = await Place.findById(placeId)
    if (!place) {
        throw new HttpError(`could not find place for selected id:${placeId}`,404)
        
    }
    res.json({
        place
    })}


const getPlacesByUserId=async(req,res,next)=>{
    const userId = req.params.uid
    //const userWithPlaces = await User.find(userId).populate('places')
    const place =  await Place.find({creator:userId})
     if (!place) {
        throw new HttpError(`could not find place for selected id:${userId}`,404)
    }
    res.json({
        place:place.map(place=>place.toObject({getters:true}))
    })

}
const createPlace =async(req,res,next)=>{
    const errors=validationResult(req)
    if (!errors.isEmpty()) {
        console.error(errors);
        
        next( new HttpError("Invalid data entry",422))
        
    }
    const {title , description ,address,creator}=req.body

    let coordinates; 
    try {
        coordinates = await getCoordsForAddress(address)
    } catch (error) {
            return next(error)
    }
    const createdPlace= new Place({
        title:title,
        description :description,
        address :address,
        location:coordinates,
        image :"https://www.bucketlistly.blog/posts/best-free-travel-images",
        creator:creator
    })
    let user
    try {
        await User.findById(creator)
    } catch (err) {
        //console.error(err);
        
        const error = new HttpError("creating place failed",500)
        return next(error)
    }

    if(!user){
        return next(new HttpError("user not found",404))
    }
    try {
        const sess = await mongoose.startSession()
        sess.startTransaction()
        await createdPlace.save({session :sess})
        user.places.push(createdPlace)
        await user.save({session :sess})
        await user.commitTransaction()
    } catch (error) {
         //console.error(err);
        return next(new HttpError("creating place failed",500))
    }

    
    res.status(201).json({place :createdPlace})

}
const updatePlace = async(req,res,next)=>{
    const errors=validationResult(req)
    if (!errors.isEmpty()) {
        console.error(errors);
        
        throw new HttpError("Invalid data entry",422)
        
    }
    const {title,description}=req.body
    const placeId = req.params.pid
    let updatedPlace
    try {
         updatedPlace = await Place.findById(placeId)
        
    } catch (error) {
        return next(new HttpError("something went wrong",500))
    }
    place.title=title,
    place.description=description
    try {
        await Place.save()
    } catch (error) {
        return next(new HttpError("saving failed",500))
    }
    res.status(200).json({place:place.toObject({getters:true})})
}
const deletePlace =async(req,res,next)=>{
    const placeId = req.params.pid
    let place
    try {
         place= await Place.findById(placeId).populate('creator')
    } catch (error) {
        return next(new HttpError("could not find user",404))
    }
    if(!place){
        return next(new HttpError("place does not exits"))
    }
    try{
        const sess = mongoose.startSession()
            (await sess).startTransaction()
            await place.remove({session :sess})
            place.creator.places.pull(place)
            await place.creator.save({session:sess})
            await sess.commitTransaction()
        }
    catch(error){
        return next(new HttpError("could not delete user",404))
    }
    res.status(200).json({message : 'deleted place'})

}
exports.getPlacesByPlaceId=getPlacesByPlaceId
exports.getPlacesByUserId=getPlacesByUserId
exports.createPlace=createPlace
exports.deletePlace=deletePlace
exports.updatePlace=updatePlace