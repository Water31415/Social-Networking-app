const mongoose = require("mongoose");
const User = require("../models/user")

const Schema = mongoose.Schema;

const placeSchema = new Schema({
    title :{
        type : String,
        required : true
    },
    description:{
        type : String,
        required : true
    },
    image:{ type : String },
    images:[{ type: String }],
    address:{
        type : String,
        required : true
    },
    location:{
        lat:{type :Number,required:true},
        lng:{type :Number,required:true}
    },
    creator:{
        type :mongoose.Types.ObjectId,
        ref : 'User',
        required:true
    },
    likes:[{type:mongoose.Types.ObjectId,ref:'User'}],
    comments:[{
        author:{type:mongoose.Types.ObjectId,ref:'User',required:true},
        text:{type:String,required:true,maxlength:1000},
        createdAt:{type:Date,default:Date.now}
    }],
    shareCount:{type:Number,default:0,min:0}
},{timestamps:true})

module.exports=mongoose.model("Place",placeSchema)
