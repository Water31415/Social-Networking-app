const express = require("express")
const {check}=require("express-validator")
const userControllers =require('../controllers/user-controllers')
const fileUpload = require("../middleware/file-upload")
const checkAuth = require('../middleware/check-auth')

const router =express.Router()
router.param('uid', require('../middleware/validate-id'))



router.get("/",userControllers.getUser)
router.use('/me/saved', checkAuth, require('./saved-places-routes'))



router.post("/signup",fileUpload.single('image'),[check('name').isString().bail().trim().notEmpty(),
    check('email').normalizeEmail().isEmail(),
    check('password').isString().bail().isLength({min:6})
],userControllers.signUp)

router.post("/login",[
    check('email').normalizeEmail().isEmail(),
    check('password').isString().bail().notEmpty()
],userControllers.login)

router.post('/:uid/follow',checkAuth,userControllers.followUser)
router.delete('/:uid/follow',checkAuth,userControllers.unfollowUser)

module.exports = router
