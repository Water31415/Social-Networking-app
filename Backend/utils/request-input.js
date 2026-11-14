const HttpError = require('../models/http-error')

const isNumeric = value => (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) && Number.isFinite(Number(value))
const validCoords = point => point && !Array.isArray(point) && isNumeric(point.lat) && isNumeric(point.lng) && Math.abs(Number(point.lat)) <= 90 && Math.abs(Number(point.lng)) <= 180
const readPoint = (value, label = 'Location') => {
  if (value === undefined || value === null || value === '') return null
  let point = value
  try { if (typeof value === 'string') point = JSON.parse(value) } catch { throw new HttpError(`${label} coordinates are invalid`, 422) }
  if (!validCoords(point)) throw new HttpError(`${label} coordinates are invalid`, 422)
  return { lat: Number(point.lat), lng: Number(point.lng) }
}
const readArray = (value, label) => {
  let items = value
  try { if (typeof value === 'string') items = JSON.parse(value) } catch { throw new HttpError(`${label} must be a valid array`, 422) }
  if (!Array.isArray(items)) throw new HttpError(`${label} must be a valid array`, 422)
  return items
}
const readExpenses = value => readArray(value, 'Expenses').map(item => {
  if (!item || typeof item !== 'object' || !isNumeric(item.amount) || Number(item.amount) < 0
      || (item.category !== undefined && typeof item.category !== 'string') || (item.note !== undefined && typeof item.note !== 'string')) {
    throw new HttpError('Expenses require a valid non-negative amount and text category/note', 422)
  }
  return { amount: Number(item.amount), category: item.category?.trim() || 'Other', note: item.note || '' }
})
const readItinerary = value => readArray(value, 'Itinerary').map(item => {
  if (!item || typeof item !== 'object' || !isNumeric(item.day) || !Number.isInteger(Number(item.day)) || Number(item.day) < 1
      || typeof item.plannedPlace !== 'string' || !item.plannedPlace.trim()
      || (item.plannedTime !== undefined && typeof item.plannedTime !== 'string') || (item.done !== undefined && typeof item.done !== 'boolean')) {
    throw new HttpError('Itinerary entries require a whole day number and a planned place', 422)
  }
  const entry = { day: Number(item.day), plannedPlace: item.plannedPlace.trim(), plannedTime: item.plannedTime || '', done: item.done || false }
  if (typeof item._id === 'string' && /^[a-f\d]{24}$/i.test(item._id)) entry._id = item._id
  return entry
})
const readVisitedAt = value => {
  const date = ((typeof value === 'string' && value.trim()) || typeof value === 'number') ? new Date(value) : null
  if (!date || !Number.isFinite(date.getTime())) throw new HttpError('Visited time must be a valid date', 422)
  return date
}

module.exports = { isNumeric, validCoords, readPoint, readExpenses, readItinerary, readVisitedAt }
