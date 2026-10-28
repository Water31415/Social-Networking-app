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
const translationRoutes=require('./routes/translation-routes')
const tripsRoutes=require('./routes/trips-routes')


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

app.use('/uploads/images',express.static(path.join(__dirname, 'uploads', 'images')))


app.use('/api/places',placesRoutes)
app.use('/api/users',userRoutes)
app.use('/api/translate',translationRoutes)
app.use('/api/trips',tripsRoutes)
app.use((req,res,next)=>{
    const error = new HttpError('something unexpected happen',404)
    throw error
})

app.use((error,req,res,next)=>{
    const uploadedFiles = req.files || (req.file ? [req.file] : [])
    uploadedFiles.forEach(file=>{
        fs.unlink(file.path,err=>{
            if (err && err.code !== 'ENOENT') console.error(err)
            
        })
    })
    if(res.headerSent){
        return next(error)
    }
    const statusCode = Number.isInteger(error.code) ? error.code : (error.status || (error.name === 'MulterError' ? 400 : 500))
    res.status(statusCode).json({message :error.message || 'Unknown error occurred'})
})


mongoose.connect(  
`${process.env.DATABASE_API_KEY}`
).then(()=>{
    app.listen(process.env.PORT || 5000)}
).catch(err=>{
    console.error(err);
    
}
      
)

