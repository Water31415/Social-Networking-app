const express = require("express")
const userControllers =require('../controllers/user-controllers')

const router =express.Router()


router.get("/",userControllers.getUser)

router.post("/signup",userControllers.signUp)

router.post("/login",userControllers.login)

module.exports = router