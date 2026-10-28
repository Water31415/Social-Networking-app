const express = require("express")
const {check}=require("express-validator")
const userControllers =require('../controllers/user-controllers')
const fileUpload = require("../middleware/file-upload")
const checkAuth = require('../middleware/check-auth')

const router =express.Router()



router.get("/",userControllers.getUser)



router.post("/signup",fileUpload.single('image'),[check('name').not().isEmpty(),
    check('email').normalizeEmail().isEmail(),
    check('password').isLength({min:6})
],userControllers.signUp)

router.post("/login",[
    check('email').normalizeEmail().isEmail(),
    check('password').not().isEmpty()
],userControllers.login)

router.post('/:uid/follow',checkAuth,userControllers.followUser)
router.delete('/:uid/follow',checkAuth,userControllers.unfollowUser)

module.exports = router
