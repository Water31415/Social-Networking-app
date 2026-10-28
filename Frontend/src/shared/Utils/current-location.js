import { backendUrl } from './backend-url'

const readBrowserLocation = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error('Location is unavailable in this browser.'))
    return
  }

  navigator.geolocation.getCurrentPosition(
    position => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
    () => reject(new Error('Could not read your location. Check your browser permissions and try again.')),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
  )
})

export const fetchCurrentLocation = async (sendRequest, token) => {
  const location = await readBrowserLocation()
  try {
    const response = await sendRequest(
      backendUrl('api/trips/location/reverse-geocode'),
      'POST',
      JSON.stringify(location),
      { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    )
    return { location, address: String(response.address || '').trim(), error: '' }
  } catch (error) {
    return { location, address: '', error: error.message || 'Could not look up the address for your location.' }
  }
}
