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
app.disable('x-powered-by')
let shuttingDown = false
app.get('/healthz', (req, res) => res.set('Cache-Control', 'no-store').status(shuttingDown ? 503 : 200).json({ status:shuttingDown ? 'stopping' : 'ok' }))
app.get('/readyz', (req, res) => {
    const ready = !shuttingDown && mongoose.connection.readyState === 1
    res.set('Cache-Control', 'no-store').status(ready ? 200 : 503).json({ status:ready ? 'ready' : 'unavailable' })
})
app.use(
  cors({
    origin: (process.env.FRONTEND_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000").split(",").map(origin => origin.trim()),
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(bodyParser.json())
app.use((req, res, next) => { req.body ??= {}; next() })

app.use('/uploads/images',express.static(path.join(__dirname, 'uploads', 'images')))
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next() })

app.use('/api/places',placesRoutes)
app.use('/api/users',userRoutes)
app.use('/api/translate',translationRoutes)
app.use('/api/trips',tripsRoutes)
require('./config/frontend')(app, express)
app.use((req,res,next)=>{
    const error = new HttpError('Route not found',404)
    throw error
})

app.use((error,req,res,next)=>{
    const uploadedFiles = req.uploadsCommitted ? [] : req.files || (req.file ? [req.file] : [])
    uploadedFiles.forEach(file=>{
        fs.unlink(file.path,err=>{
            if (err && err.code !== 'ENOENT') console.error(err)
            
        })
    })
    if(res.headersSent){
        return next(error)
    }
    const requestedStatus = error.name === 'MulterError' ? 400 : ['ValidationError', 'CastError'].includes(error.name) ? 422 : error.status || error.code || 500
    const statusCode = Number.isInteger(requestedStatus) && requestedStatus >= 400 && requestedStatus <= 599 ? requestedStatus : 500
    const message = ['ValidationError', 'CastError'].includes(error.name) ? 'Invalid request data. Check the field values and try again.'
        : process.env.NODE_ENV === 'production' && statusCode >= 500 && !(error instanceof HttpError) ? 'The server could not complete this request. Please try again.' : error.message
    res.status(statusCode).json({message :message || 'Unknown error occurred'})
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

const shutdownServer = async (server, timeoutMs = 10000) => {
    shuttingDown = true
    const timer = setTimeout(() => server.closeAllConnections?.(), timeoutMs)
    timer.unref()
    try {
        await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
        await mongoose.disconnect()
    } finally { clearTimeout(timer) }
}

const runServer = () => startServer().then(server => {
        console.log(`SnapIt backend listening on port ${server.address().port}`)
        let stopping = false
        const stop = () => {
            if (stopping) return
            stopping = true
            shutdownServer(server).catch(() => {
                console.error('SnapIt backend could not finish shutdown cleanly')
                process.exitCode = 1
            })
        }
        process.once('SIGTERM', stop)
        process.once('SIGINT', stop)
        return server
    }).catch(error => {
        console.error(`SnapIt backend failed to start: ${error.message}`)
        process.exitCode = 1
    })

module.exports = { app, startServer, shutdownServer, runServer }
if (require.main === module) runServer()

