const axios = require("axios")
const HttpError = require("../models/http-error")
const API_KEY = "pk.19c506c285d5721fa9bae41d7ea999a4"

const getCoordsForAddress= async (address) => {
    const response = await axios.get(`https://us1.locationiq.com/v1/search?key=${API_KEY}&q=${encodeURIComponent(address)}&format=json`)

    const data =response.data[0]
    console.log(data);
    
    if(!data){
         const error= new HttpError('location not found',422)
        throw error
        }
        const coordLats=data.lat
        const coordLong=data.lon
        const coordinates={
            lat:coordLats,
            long:coordLong
        } 
    return coordinates
}
module.exports=getCoordsForAddress