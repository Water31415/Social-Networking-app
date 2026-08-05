const mongoose =require("mongoose")
const uniqueValidator = require("mongoose-unique-validator")
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
    password :{
        type : String,
        required : true,
        minLength :6
    }

},{timestamps:true})
userSchema.plugin(uniqueValidator)

module.exports= mongoose.model('User',userSchema)