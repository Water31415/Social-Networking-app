const fs=require('fs')
const mongoose = require("mongoose")
const {validationResult}=require('express-validator')
const HttpError = require('../models/http-error')
const getCoordsForAddress = require('../utils/location')
const Place =require("../models/places")
const User = require("../models/user")
const path = require('path')
const getStoredUploadPath = imagePath => path.resolve(__dirname, '..', String(imagePath || '').replace(/^[/\\]+/, ''))
const toPlaceListObject = place => {
    const placeObject = place.toObject({ getters: true })
    placeObject.creatorName = place.creator?.name || ''
    return placeObject
}


const getPlaces = async(req,res,next)=>{
    let places
    try {
        places = await Place.find()
            .populate('creator','name')
            .populate('likes','name')
            .populate('comments.author','name')
    } catch (error) {
        return next(new HttpError('Could not find places',500))
    }
    res.json({ places: places.map(toPlaceListObject) })
}

const getPlacesByPlaceId=async(req,res,next)=>{
    const placeId = req.params.pid
    let place
    try { place = await Place.findById(placeId).populate('likes','name').populate('comments.author','name') }
    catch (error) { return next(new HttpError('Could not find place',404)) }
    if (!place) {
        return next(new HttpError(`Could not find place for selected id: ${placeId}`,404))
        
    }
    res.json({
        place
    })}


const getPlacesByUserId=async(req,res,next)=>{
    const userId = req.params.uid
    //const userWithPlaces = await User.find(userId).populate('places')
    let place
    try { place = await Place.find({creator:userId}).populate('creator','name').populate('likes','name').populate('comments.author','name') }
    catch (error) { return next(new HttpError('Could not find places for this user',500)) }
     if (!place) {
        return next(new HttpError(`Could not find places for selected user: ${userId}`,404))
    }
    res.json({
        place:place.map(toPlaceListObject)
    })

}

const getNearbyPlaces=async(req,res,next)=>{
    const latitude=Number(req.query.lat)
    const longitude=Number(req.query.lng)
    const radiusKm=Math.min(Number(req.query.radius) || 100,100)
    if(!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude)>90 || Math.abs(longitude)>180){
        return next(new HttpError('Valid latitude and longitude are required',422))
    }
    try {
        const places=await Place.find().populate('creator','name').populate('likes','name').populate('comments.author','name')
        const toRadians=value=>value*Math.PI/180
        const distanceKm=(location)=>{
            if(!location) return Infinity
            const lat=Number(location.lat)
            const lng=Number(location.lng)
            const dLat=toRadians(lat-latitude)
            const dLng=toRadians(lng-longitude)
            const a=Math.sin(dLat/2)**2+Math.cos(toRadians(latitude))*Math.cos(toRadians(lat))*Math.sin(dLng/2)**2
            return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
        }
        const nearby=places.map(place=>({place,distance:distanceKm(place.location)}))
            .filter(item=>Number.isFinite(item.distance) && item.distance<=radiusKm)
            .sort((a,b)=>a.distance-b.distance)
            .map(({place,distance})=>({...toPlaceListObject(place),distanceKm:Math.round(distance*10)/10}))
        res.json({places:nearby,radiusKm})
    } catch(error) { return next(new HttpError('Could not load nearby places',500)) }
}
const createPlace =async(req,res,next)=>{
    const errors=validationResult(req)
    if (!errors.isEmpty()) {
        console.error(errors);
         
        return next( new HttpError("Invalid data entry",422))
        
    }
    const {title , description ,address}=req.body
    if (!req.files || req.files.length === 0) return next(new HttpError('Please select at least one image',422))

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
        image :`/uploads/images/${req.files[0].filename}`,
        images:req.files.map(file=>`/uploads/images/${file.filename}`),
        creator:req.userData.userId
    })
    let user
    try {
        user =await User.findById(req.userData.userId)
    } catch (error) {
        //console.error(err);
        return next(new HttpError("creating place failed",500))
    }

    if(!user){
        return next(new HttpError("user not found",404))
    }
    let sess
    try {
        sess = await mongoose.startSession()
        sess.startTransaction()
        await createdPlace.save({session :sess})
        user.places.push(createdPlace)
        await user.save({session :sess})
        await sess.commitTransaction()
        await sess.endSession()
    } catch (error) {
        if (sess) { await sess.abortTransaction(); await sess.endSession() }
         //console.error(err);
        return next(new HttpError("creating place failed",500))
    }

    
    res.status(201).json({place :createdPlace})

}
const updatePlace = async(req,res,next)=>{
    const errors=validationResult(req)
    if (!errors.isEmpty()) {
        console.error(errors);
        
        return next(new HttpError("Invalid data entry",422))
        
    }
    const {title,description}=req.body
    const placeId = req.params.pid
    let place
    try {
         place = await Place.findById(placeId)
        
    } catch (error) {
        return next(new HttpError("Could not load place",500))
    }
    if (!place) return next(new HttpError('Place not found',404))
    if (place.creator.toString() !== req.userData.userId ) {
        return next(new HttpError('not allowed to edit this place',401))
    }
    place.title=title,
    place.description=description
    try {
        await place.save()
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
        return next(new HttpError("Place does not exist",404))
    }
    if (place.creator.id !== req.userData.userId ) {
        return next(new HttpError('not allowed to edit this place',401))
    }
    

    const imagePaths=(place.images && place.images.length ? place.images : [place.image]).filter(Boolean)
        .map(getStoredUploadPath)

    let sess
    try{
        sess = await mongoose.startSession()
             sess.startTransaction()
            await place.deleteOne({session :sess})
            place.creator.places.pull(place)
            await place.creator.save({session:sess})
            await sess.commitTransaction()
            await sess.endSession()
        }
    catch(error){
        if (sess) { await sess.abortTransaction(); await sess.endSession() }
        return next(new HttpError("Could not delete place",500))
    }
    imagePaths.forEach(imagePath=>fs.unlink(imagePath, err=>{ if (err) console.error('Unable to remove uploaded image:',err) }))
    res.status(200).json({message : 'deleted place'})

}
const toggleLike=async(req,res,next)=>{
    try {
        const place=await Place.findById(req.params.pid)
        if(!place) return next(new HttpError('Place not found',404))
        const userId=req.userData.userId
        const alreadyLiked=place.likes.some(id=>id.toString()===userId)
        if(alreadyLiked) place.likes.pull(userId)
        else place.likes.addToSet(userId)
        await place.save()
        res.json({liked:!alreadyLiked,likes:place.likes.length})
    } catch(error) { return next(new HttpError('Could not update like',500)) }
}
const addComment=async(req,res,next)=>{
    const errors=validationResult(req)
    if(!errors.isEmpty()) return next(new HttpError('Comment cannot be empty or exceed 1000 characters',422))
    try {
        const place=await Place.findById(req.params.pid)
        if(!place) return next(new HttpError('Place not found',404))
        place.comments.push({author:req.userData.userId,text:req.body.text.trim()})
        await place.save()
        await place.populate('comments.author','name')
        res.status(201).json({comment:place.comments[place.comments.length-1]})
    } catch(error) { return next(new HttpError('Could not add comment',500)) }
}
const sharePlace=async(req,res,next)=>{
    try {
        const place=await Place.findByIdAndUpdate(req.params.pid,{$inc:{shareCount:1}},{new:true})
        if(!place) return next(new HttpError('Place not found',404))
        res.json({shares:place.shareCount})
    } catch(error) { return next(new HttpError('Could not record share',500)) }
}
const getAnalytics=async(req,res,next)=>{
    try {
        const places=await Place.find({creator:req.userData.userId})
        const likesReceived=places.reduce((total,place)=>total+place.likes.length,0)
        const commentsReceived=places.reduce((total,place)=>total+place.comments.length,0)
        const sharesReceived=places.reduce((total,place)=>total+place.shareCount,0)
        const likesGiven=await Place.countDocuments({likes:req.userData.userId})
        const milestones=[
            {id:'first-place',label:'First Place',description:'Shared your first place',earned:places.length>=1},
            {id:'explorer',label:'Explorer',description:'Shared 5 places',earned:places.length>=5},
            {id:'popular',label:'Crowd Favorite',description:'Received 10 likes',earned:likesReceived>=10},
            {id:'conversation',label:'Conversation Starter',description:'Received 10 comments',earned:commentsReceived>=10},
            {id:'connector',label:'Connector',description:'Your places were shared 10 times',earned:sharesReceived>=10}
        ]
        res.json({places:places.length,likesReceived,commentsReceived,sharesReceived,likesGiven,badges:milestones})
    } catch(error) { return next(new HttpError('Could not load analytics',500)) }
}
exports.getPlacesByPlaceId=getPlacesByPlaceId
exports.getPlacesByUserId=getPlacesByUserId
exports.getNearbyPlaces=getNearbyPlaces
exports.createPlace=createPlace
exports.deletePlace=deletePlace
exports.updatePlace=updatePlace
exports.toggleLike=toggleLike
exports.addComment=addComment
exports.sharePlace=sharePlace
exports.getAnalytics=getAnalytics
exports.getPlaces=getPlaces
