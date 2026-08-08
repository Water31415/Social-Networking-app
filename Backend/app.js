const bodyParser = require("body-parser")
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
`${process.env.DATABASE_API_KEY}`
).then(()=>{
    app.listen(5000)}
).catch(err=>{
    console.error(err);
    
}
      
)

