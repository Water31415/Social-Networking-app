const axios = require("axios")
const HttpError = require("../models/http-error")


const getCoordsForAddress= async (address) => {
    const response = await axios.get(`https://us1.locationiq.com/v1/search?key=${process.env.MAP_API_KEY}&q=${encodeURIComponent(address)}&format=json`)

    const data =response.data[0]
    //console.log(data);
    
    if(!data){
         const error= new HttpError('location not found',422)
        throw error
        }
        const coordLats=data.lat
        const coordLong=data.lon
        const coordinates={
            lat:coordLats,
            lng:coordLong
        } 
    return coordinates
}
module.exports=getCoordsForAddress