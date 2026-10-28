const axios = require('axios')
const { validationResult } = require('express-validator')
const HttpError = require('../models/http-error')

const translateText = async (req,res,next) => {
    const errors=validationResult(req)
    if(!errors.isEmpty()) return next(new HttpError('Text and target language are required',422))
    const apiKey=process.env.GOOGLE_TRANSLATE_API_KEY
    if(!apiKey) return next(new HttpError('Google Translate is not configured. Set GOOGLE_TRANSLATE_API_KEY on the backend.',503))
    try {
        const response=await axios.post('https://translation.googleapis.com/language/translate/v2',{
            q:req.body.text,
            target:req.body.target,
            format:'text'
        },{params:{key:apiKey}})
        res.json({translatedText:response.data.data.translations[0].translatedText})
    } catch(error) {
        return next(new HttpError('Google Translate could not translate this text',502))
    }
}

exports.translateText=translateText
