const bodyParser = require("body-parser")
const path=require('path')
const fs = require('fs')
require('dotenv').config();
const mongoose =require("mongoose")
const cors = require("cors");
const express = require("express")
const HttpError = require("./models/http-error")
const placesRoutes = require("./routes/places-routes")
const userRoutes=require('./routes/user-routes')


const app=express()

app.use(bodyParser.json()) //reads json incoming req and convert to js 


app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use('uploads/images',express.static(path.join('uploads','images')))


app.use('/api/places',placesRoutes)
app.use('/api/users',userRoutes)
app.use((req,res,next)=>{
    const error = new HttpError('something unexpected happen',404)
    throw error
})

app.use((error,req,res,next)=>{
    if(req.file){
        fs.unlink(req.file.path,err=>{
            console.error(err);
            
        })
    }
    if(res.headerSent){
        return next(error)
    }
    res.status(error.code || 500).json({message :error.message} || 'unknown error occured')
})


mongoose.connect(  
`${process.env.DATABASE_API_KEY}`
).then(()=>{
    app.listen(process.env.PORT || 5000)}
).catch(err=>{
    console.error(err);
    
}
      
)

