const express=require('express')
const {body}=require('express-validator')
const translationController=require('../controllers/translation-controller')

const router=express.Router()
router.post('/',[
    body('text').isString().trim().notEmpty().isLength({max:5000}),
    body('target').isString().isLength({min:2,max:5})
],translationController.translateText)

module.exports=router
