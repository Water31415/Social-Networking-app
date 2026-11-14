const mongoose =require("mongoose")
const Schema = mongoose.Schema

const collectionSchema = new Schema({
    name: { type:String, required:true, trim:true, maxlength:60 },
    key: { type:String, required:true },
    createdAt: { type:Date, default:Date.now }
})
const savedPlaceSchema = new Schema({
    place: { type:mongoose.Types.ObjectId, ref:'Place', required:true },
    collectionId: { type:mongoose.Types.ObjectId, default:null },
    savedAt: { type:Date, default:Date.now }
}, { _id:false })

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
    placeCollections: { type:[collectionSchema], default:[] },
    savedPlaces: { type:[savedPlaceSchema], default:[] },
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
