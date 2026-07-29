const uuid = require('uuid/v4')
const HttpError = require('../models/http-error')



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
const createPlace =(req,res,next)=>{
    const {title , description , address,coordinates,creator}=req.body
    const createdPlace={
        id : uuid(),
        title : title,
        description :description,
        address : address,
        location :coordinates,
        creator:creator

    }
    res.status(201).json({place :createdPlace})

}
const updatePlace = (req,res,next)=>{
    const {title,description}=req.body
    const placeId = req.params.pid
    const updatedPlace = {...DUMMY_PLACES.find(p=>p.id===placeId)} 
    const placeIndex = DUMMY_PLACES.find(p=>p.id===placeId)
    updatePlace.title=title
    updatePlace.description=description
    DUMMY_PLACES[placeIndex]=updatePlace
    res.status(201).json({placeId:updatedPlace})
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