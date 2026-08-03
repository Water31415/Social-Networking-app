const uuid = require('uuid/v4')
const {validationResult}=require('express-validator')
const HttpError = require('../models/http-error')
const getCoordsForAddress = require('../utils/location')



let DUMMY_PLACES = [
  {
    id: 'p1',
    title: 'Empire State Building',
    description: 'One of the most famous sky scrapers in the world!',
    address: '20 W 34th St, New York, NY 10001',
    location: {
      lat: 40.7484405,
      lng: -73.9878584
    },
    creator: 'u1'}]




const getPlacesByPlaceId=(req,res,next)=>{
    const placeId = req.params.pid
    const place = DUMMY_PLACES.find(p=>{
        return p.id === placeId
    })
    if (!place) {
        throw new HttpError(`could not find place for selected id:${placeId}`,404)
        
    }
    res.json({
        place
    })}


const getPlacesByUserId=(req,res,next)=>{
    const userId = req.params.uid
    const users = DUMMY_PLACES.filter(u=>{
        return u.creator ===userId
    })
     if (!users) {
        throw new HttpError(`could not find place for selected id:${userId}`,404)
    }
    res.json({
        users
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
    const createdPlace={
        id : uuid(),
        title : title,
        description :description,
        address : address,
        location :{coordinates:coordinates},
        creator:creator

    }
    res.status(201).json({place :createdPlace})

}
const updatePlace = (req,res,next)=>{
    const errors=validationResult(req)
    if (!errors.isEmpty()) {
        console.error(errors);
        
        throw new HttpError("Invalid data entry",422)
        
    }
    const {title,description}=req.body
    const placeId = req.params.pid
    const updatedPlace = {...DUMMY_PLACES.find(p=>p.id===placeId)} 
    const placeIndex = DUMMY_PLACES.findIndex(p=>p.id===placeId)
    updatedPlace.title=title
    updatedPlace.description=description
    DUMMY_PLACES[placeIndex]=updatedPlace
    res.status(200).json({place:updatedPlace})
}
const deletePlace =(req,res,next)=>{
    const placeId = req.params.pid
    DUMMY_PLACES =DUMMY_PLACES.filter(p=>!pid===placeId)
    res.status(200).json({message : 'deleted place'})

}
exports.getPlacesByPlaceId=getPlacesByPlaceId
exports.getPlacesByUserId=getPlacesByUserId
exports.createPlace=createPlace
exports.deletePlace=deletePlace
exports.updatePlace=updatePlace