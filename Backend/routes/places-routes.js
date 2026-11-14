const express = require("express")
const {check}=require("express-validator")
const placesControllers =require('../controllers/places-controller')
const fileUpload = require("../middleware/file-upload")
const checkAuth = require("../middleware/check-auth")


const router =express.Router()
router.param('pid', require('../middleware/validate-id'))
router.param('uid', require('../middleware/validate-id'))

router.get("/",placesControllers.getPlaces)
router.get('/analytics',checkAuth,placesControllers.getAnalytics)
router.get('/nearby',placesControllers.getNearbyPlaces)
router.get("/:pid",placesControllers.getPlacesByPlaceId)


router.get("/user/:uid",placesControllers.getPlacesByUserId)

router.use(checkAuth)

router.post("/",fileUpload.array('images',10) ,[
    check('title').isString().bail().trim().notEmpty(),
    check('description').isString().bail().trim().isLength({min:5}),
    check('address').isString().bail().trim().notEmpty()],placesControllers.createPlace)

router.patch("/:pid",[check('title').isString().bail().trim().notEmpty(),
    check('description').isString().bail().trim().isLength({min:5})
],placesControllers.updatePlace)

router.post('/:pid/like',placesControllers.toggleLike)
router.post('/:pid/comments',[check('text').isString().bail().trim().notEmpty().isLength({max:1000})],placesControllers.addComment)
router.post('/:pid/share',placesControllers.sharePlace)

router.delete("/:pid",placesControllers.deletePlace)
module.exports = router
