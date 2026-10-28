const mongoose =require("mongoose")
const Schema = mongoose.Schema
const Place = require("../models/places")

const userSchema = new Schema({
    name :{
        type : String,
        required : true,
        unique :true
    },
    image :{
        type : String,
        required : true
    },
    places:[{
        type : mongoose.Types.ObjectId,
        ref : 'Place',
        required : true,
    }],
    trips: {
        type: [{ type: mongoose.Types.ObjectId, ref: 'Trip' }],
        default: []
    },
    followers: { type: [{ type: mongoose.Types.ObjectId, ref: 'User' }], default: [] },
    following: { type: [{ type: mongoose.Types.ObjectId, ref: 'User' }], default: [] },
    password :{
        type : String,
        required : true,
        minLength :6
    },
    email :{
        type : String,
        required :true,
        unique :true
    }

},{timestamps:true})

module.exports= mongoose.model('User',userSchema)
