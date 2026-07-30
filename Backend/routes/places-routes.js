const express = require("express")
const {check}=require("express-validator")
const placesControllers =require('../controllers/places-controller')

const router =express.Router()


router.get("/:pid",placesControllers.getPlacesByPlaceId)

router.get("/user/:uid",placesControllers.getPlacesByUserId)

router.post("/",[check('tittle').not().isEmpty(),check('description').isLength({min:5}),
    check('address').not().isEmpty()],placesControllers.createPlace)

router.patch("/:pid",placesControllers.updatePlace)

router.delete("/:pid",placesControllers.deletePlace)
module.exports = router