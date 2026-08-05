const bodyParser = require("body-parser")
const mongoose =require("mongoose")
const express = require("express")
const HttpError = require("./models/http-error")
const placesRoutes = require("./routes/places-routes")
const userRoutes=require('./routes/user-routes')


const app=express()

app.use(bodyParser.json()) //reads json incoming req and convert to js 
app.use('/api/places',placesRoutes)
app.use('/api/users',userRoutes)
app.use((req,res,next)=>{
    const error = new HttpError('something unexpected happen',404)
    throw error
})

app.use((error,req,res,next)=>{
    if(res.headerSent){
        return next(error)
    }
    res.status(error.code || 500).json({message :error.message} || 'unknown error occured')
})

mongoose.connect(  
    "mongodb+srv://dhimansarthak96_db_user:LJKMgrG2xS3pMrU8@social.kw4qfnz.mongodb.net"

).then(()=>{
    app.listen(5000)}
).catch(err=>{
    console.error(err);
    
}
      
)

