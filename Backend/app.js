const bodyParser = require("body-parser")
const path=require('path')
const fs = require('fs')
const { loadEnvironment, validateStartupEnvironment, applyDatabaseDns } = require('./config/environment')
loadEnvironment()
const mongoose =require("mongoose")
const cors = require("cors");
const express = require("express")
const HttpError = require("./models/http-error")
const placesRoutes = require("./routes/places-routes")
const userRoutes=require('./routes/user-routes')
const translationRoutes=require('./routes/translation-routes')
const tripsRoutes=require('./routes/trips-routes')
const Trip = require('./models/trip')


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
    if(res.headersSent){
        return next(error)
    }
    const requestedStatus = error.code || error.status || (error.name === 'MulterError' ? 400 : 500)
    const statusCode = Number.isInteger(requestedStatus) && requestedStatus >= 400 && requestedStatus <= 599 ? requestedStatus : 500
    res.status(statusCode).json({message :error.message || 'Unknown error occurred'})
})


const startServer = async ({ port = process.env.PORT || 5000, host } = {}) => {
    validateStartupEnvironment()
    applyDatabaseDns()
    const listenPort = Number(port)
    if (!Number.isInteger(listenPort) || listenPort < 0 || listenPort > 65535) {
        throw new Error('PORT must be an integer from 0 to 65535')
    }
    let stage = 'connect'
    try {
        await mongoose.connect(process.env.DATABASE_API_KEY)
        stage = 'indexes'
        // Reject startup if the active-trip uniqueness rule cannot be installed.
        await Trip.init()
        stage = 'listen'
        return await new Promise((resolve, reject) => {
            const server = app.listen(listenPort, host)
            server.once('error', reject)
            server.once('listening', () => {
                server.removeListener('error', reject)
                resolve(server)
            })
        })
    } catch (error) {
        await mongoose.disconnect().catch(() => {})
        if (stage === 'connect') {
            throw new Error('Could not connect to MongoDB. Check DATABASE_API_KEY, DNS, and database network access.')
        }
        if (stage === 'indexes') {
            throw new Error(error.code === 11000
                ? 'Could not enforce one active trip per user. Resolve duplicate active trips before starting.'
                : 'Could not prepare database indexes. Check database index permissions and existing data.')
        }
        throw new Error(error.code === 'EADDRINUSE'
            ? 'Could not start the backend because its port is already in use.'
            : 'Could not open the backend port. Check PORT and local network permissions.')
    }
}

module.exports = { app, startServer }

if (require.main === module) {
    startServer().then(server => {
        console.log(`SnapIt backend listening on port ${server.address().port}`)
    }).catch(error => {
        console.error(`SnapIt backend failed to start: ${error.message}`)
        process.exitCode = 1
    })
}

