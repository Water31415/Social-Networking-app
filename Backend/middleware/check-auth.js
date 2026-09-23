const HttpError = require("../models/http-error")
const jwt = require('jsonwebtoken')
module.exports = (req,res,next)=>{
    try {
        if(req.method==='OPTIONS'){
            return next()
        }
        const token = req.headers.authorization.split(' ')[1] //Authorization :'Bearer token'
        if(!token){
            console.log(token);
            throw new Error('auth failed')
        }
        const decodedToken = jwt.verify(token ,`${process.env.JWT_API_KEY}`)
        req.userData= {userId : decodedToken.userId}
        next()
    } catch (error) {
        
        
        return next(new HttpError('Authentication failed',403))
    }

}