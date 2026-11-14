const axios = require("axios")
const HttpError = require("../models/http-error")
const { validCoords } = require('./request-input')


const getCoordsForAddress= async (address) => {
    if (typeof address !== 'string' || !address.trim()) throw new HttpError('A valid address is required',422)
    if (!process.env.MAP_API_KEY) throw new HttpError('Location service is not configured',503)
    let response
    try {
        response = await axios.get('https://us1.locationiq.com/v1/search', {
            params: { key: process.env.MAP_API_KEY, q: address.trim(), format: 'json' }, timeout: 10000
        })
    } catch { throw new HttpError('Could not look up this address. Please try again.',502) }

    const data =Array.isArray(response.data) ? response.data[0] : null
    //console.log(data);
    
    if(!data){
         const error= new HttpError('location not found',422)
        throw error
        }
        const coordLats=Number(data.lat)
        const coordLong=Number(data.lon)
        if (!validCoords({lat:data.lat,lng:data.lon})) {
            throw new HttpError('Location provider returned invalid coordinates',502)
        }
        const coordinates={
            lat:coordLats,
            lng:coordLong
        } 
    return coordinates
}

const getAddressForCoords = async ({ lat, lng }) => {
    const latitude = Number(lat)
    const longitude = Number(lng)
    if (!validCoords({lat,lng})) {
        throw new HttpError('Valid latitude and longitude are required', 422)
    }
    if (!process.env.MAP_API_KEY) throw new HttpError('Location service is not configured', 503)

    let response
    try {
        response = await axios.get('https://us1.locationiq.com/v1/reverse', {
            params: { key: process.env.MAP_API_KEY, lat: latitude, lon: longitude, format: 'json' }, timeout: 10000
        })
    } catch (error) {
        throw new HttpError('Could not resolve your current location to an address', 502)
    }

    const data = response.data || {}
    const address = String(data.display_name || '').trim()
    if (!address) throw new HttpError('Could not resolve your current location to an address', 422)
    return address
}

// Keep the original callable export for existing forward-geocoding consumers.
getCoordsForAddress.getAddressForCoords = getAddressForCoords
module.exports=getCoordsForAddress
