import React, { useEffect, useRef } from 'react'
import * as L from '../../UIElements/leaflet-src.esm'
import '../../UIElements/leaflet.css'
import './TripMap.css'

const TripMap = ({ stops = [] }) => {
  const mapRef = useRef(null)
  const pointKey = stops.map(stop => `${stop.id || stop._id}:${stop.location?.lat},${stop.location?.lng}`).join('|')
  useEffect(() => {
    if (!mapRef.current) return undefined
    const points = stops.filter(stop => Number.isFinite(Number(stop.location?.lat)) && Number.isFinite(Number(stop.location?.lng)))
    const center = points.length ? [Number(points[0].location.lat), Number(points[0].location.lng)] : [20, 0]
    const map = L.map(mapRef.current, { center, zoom: points.length ? 7 : 2 })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map)
    const icon = L.icon({ iconUrl: '/images/marker-icon.png', iconRetinaUrl: '/images/marker-icon-2x.png', shadowUrl: '/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41] })
    const latlngs = points.map(stop => [Number(stop.location.lat), Number(stop.location.lng)])
    points.forEach((stop, index) => {
      const popup = document.createElement('div')
      const title = document.createElement('strong')
      title.textContent = stop.title || 'Trip stop'
      popup.appendChild(title)
      if (stop.address) { const address = document.createElement('div'); address.textContent = stop.address; popup.appendChild(address) }
      L.marker(latlngs[index], { icon }).addTo(map).bindPopup(popup)
    })
    if (latlngs.length > 1) L.polyline(latlngs, { color: '#a855f7', weight: 4, opacity: .8 }).addTo(map)
    if (latlngs.length > 1) map.fitBounds(latlngs, { padding: [30, 30] })
    return () => map.remove()
  // pointKey refreshes the Leaflet map when a stop or its coordinates change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointKey])
  return <div className="trip-map" ref={mapRef} aria-label="Map of trip stops" />
}

export default TripMap
