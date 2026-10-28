const HttpError = require("../models/http-error")
const jwt = require('jsonwebtoken')
const { getJwtSecret } = require('../config/environment')
module.exports = (req,res,next)=>{
    try {
        if(req.method==='OPTIONS'){
            return next()
        }
        const authorization = req.headers.authorization || ''
        const match = /^Bearer ([^\s]+)$/i.exec(authorization)
        if (!match) throw new Error('auth failed')
        const decodedToken = jwt.verify(match[1], getJwtSecret(), { algorithms: ['HS256'] })
        if (typeof decodedToken.userId !== 'string' || !decodedToken.userId) throw new Error('auth failed')
        req.userData= {userId : decodedToken.userId}
        next()
    } catch (error) {
        
        
        return next(new HttpError('Authentication failed',403))
    }

}
