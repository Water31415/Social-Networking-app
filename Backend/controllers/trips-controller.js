const fs = require('fs')
const path = require('path')
const { validationResult } = require('express-validator')
const HttpError = require('../models/http-error')
const Trip = require('../models/trip')
const TripStop = require('../models/trip-stop')
const User = require('../models/user')
const getCoordsForAddress = require('../utils/location')
const getAddressForCoords = getCoordsForAddress.getAddressForCoords

const uploadDirectory = path.resolve(__dirname, '..', 'uploads', 'images')
const uploadPath = value => {
  if (typeof value !== 'string') return null
  const match = /^\/?uploads\/images\/([^/\\]+)$/.exec(value)
  if (!match || match[1] === '.' || match[1] === '..' || /[:\0]/.test(match[1])) return null
  const resolved = path.resolve(uploadDirectory, match[1])
  return path.dirname(resolved) === uploadDirectory ? resolved : null
}
const removeImages = paths => (paths || []).forEach(image => {
  const imagePath = uploadPath(image)
  if (!imagePath) return
  fs.unlink(imagePath, err => {
    if (err && err.code !== 'ENOENT') console.error('Unable to remove trip image:', err)
  })
})
const ownTrip = async (tid, userId) => {
  const trip = await Trip.findById(tid)
  if (!trip) throw new HttpError('Trip not found', 404)
  if (trip.creator.toString() !== userId) throw new HttpError('You cannot edit this trip', 403)
  return trip
}
const validCoords = point => point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng)) && Math.abs(Number(point.lat)) <= 90 && Math.abs(Number(point.lng)) <= 180
const parsePoint = value => {
  if (!value) return null
  try { return typeof value === 'string' ? JSON.parse(value) : value } catch { return null }
}
const toStop = stop => stop.toObject ? stop.toObject({ getters: true }) : stop
const kmBetween = (a, b) => {
  const rad = value => value * Math.PI / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}
const withSummary = async trip => {
  const raw = trip.toObject ? trip.toObject({ getters: true }) : trip
  const stops = await TripStop.find({ trip: raw._id || raw.id }).sort({ visitedAt: 1 })
  const spent = stops.reduce((total, stop) => total + stop.expenses.reduce((sum, expense) => sum + expense.amount, 0), 0)
  const start = new Date(raw.startedAt || raw.createdAt)
  const end = new Date(raw.endedAt || Date.now())
  const days = Math.max(1, Math.floor((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000) + 1)
  const distanceTravelled = stops.slice(1).reduce((sum, stop, index) => sum + kmBetween(stops[index].location, stop.location), 0)
  return { ...raw, stops: stops.map(toStop), summary: { days, stopCount: stops.length, totalSpent: Math.round(spent * 100) / 100, plannedBudget: raw.plannedBudget || 0, distanceTravelled: Math.round(distanceTravelled * 10) / 10 } }
}
const startTrip = async (req, res, next) => {
  let trip = null
  const title = String(req.body.title || '').trim()
  if (!title) return next(new HttpError('Trip title is required', 422))
  const budget = Number(req.body.plannedBudget || 0)
  if (!Number.isFinite(budget) || budget < 0) return next(new HttpError('Enter a valid planned budget', 422))
  const startLocation = parsePoint(req.body.startLocation)
  if (startLocation && !validCoords(startLocation)) return next(new HttpError('Starting location coordinates are invalid', 422))
  try {
    if (await Trip.findOne({ creator: req.userData.userId, status: 'active' })) return next(new HttpError('You already have an active trip', 409))
    const itinerary = typeof req.body.itinerary === 'string' ? JSON.parse(req.body.itinerary) : (req.body.itinerary || [])
    trip = new Trip({ title, creator: req.userData.userId, status: 'draft', startedAt: new Date(), plannedBudget: budget, visibility: req.body.visibility || 'private', itinerary, startAddress: String(req.body.startAddress || '').trim(), startLocation: validCoords(startLocation) ? { lat: Number(startLocation.lat), lng: Number(startLocation.lng) } : undefined })
    const user = await User.findById(req.userData.userId)
    if (!user) return next(new HttpError('User not found', 404))
    await trip.save()
    trip.status = 'active'
    trip.startedAt = new Date()
    await trip.save()
    user.trips.addToSet(trip._id)
    await user.save()
    res.status(201).json({ trip: await withSummary(trip) })
  } catch (error) {
    if (trip?._id) await Trip.findByIdAndDelete(trip._id).catch(() => {})
    return next(error.code === 11000 ? new HttpError('You already have an active trip', 409) : error)
  }
}

const reverseGeocode = async (req, res, next) => {
  const point = parsePoint(req.body.location || req.body)
  if (!validCoords(point)) return next(new HttpError('Valid latitude and longitude are required', 422))
  try {
    const address = await getAddressForCoords(point)
    res.json({ address })
  } catch (error) {
    return next(error instanceof HttpError ? error : new HttpError('Could not resolve your current location to an address', 502))
  }
}

const getActiveTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ creator: req.userData.userId, status: 'active' })
    res.json({ trip: trip ? await withSummary(trip) : null })
  } catch (error) { return next(new HttpError('Could not load active trip', 500)) }
}

const addStop = async (req, res, next) => {
  let createdStop = null
  try {
    const trip = await ownTrip(req.params.tid, req.userData.userId)
    if (trip.status !== 'active') return next(new HttpError('Stops can only be added to an active trip', 409))
    const title = String(req.body.title || '').trim()
    if (!title) return next(new HttpError('Stop title is required', 422))
    if (!req.files || req.files.length === 0) return next(new HttpError('Add at least one photo for this stop', 422))
    const exif = parsePoint(req.body.exifLocation)
    const browser = parsePoint(req.body.browserLocation)
    let location = validCoords(exif) ? exif : validCoords(browser) ? browser : null
    const address = String(req.body.address || '').trim()
    if (!location) {
      if (!address) return next(new HttpError('Provide an address or allow location access', 422))
      location = await getCoordsForAddress(address)
    }
    let expenses = typeof req.body.expenses === 'string' ? JSON.parse(req.body.expenses || '[]') : (req.body.expenses || [])
    expenses = expenses.map(item => ({ amount: Number(item.amount), category: String(item.category || 'Other'), note: String(item.note || '') }))
    if (expenses.some(item => !Number.isFinite(item.amount) || item.amount < 0)) return next(new HttpError('Expense amounts must be valid non-negative numbers', 422))
    createdStop = new TripStop({ trip: trip._id, title, note: req.body.note || '', images: (req.files || []).map(file => `/uploads/images/${file.filename}`), location, address, visitedAt: req.body.visitedAt ? new Date(req.body.visitedAt) : new Date(), expenses })
    await createdStop.save()
    trip.stops.addToSet(createdStop._id)
    await trip.save()
    res.status(201).json({ stop: toStop(createdStop), trip: await withSummary(trip) })
  } catch (error) {
    if (createdStop?._id) await TripStop.findByIdAndDelete(createdStop._id).catch(() => {})
    return next(error instanceof HttpError ? error : new HttpError(error.message || 'Could not add stop', error.status || 500))
  }
}

const updateStop = async (req, res, next) => {
  try {
    const trip = await ownTrip(req.params.tid, req.userData.userId)
    if (trip.status === 'published') return next(new HttpError('Published trips cannot be edited', 409))
    const stop = await TripStop.findOne({ _id: req.params.sid, trip: trip._id })
    if (!stop) return next(new HttpError('Stop not found', 404))
    const old = [...stop.images]
    let kept = old
    if (req.body.keepImages !== undefined) {
      try {
        kept = typeof req.body.keepImages === 'string' ? JSON.parse(req.body.keepImages) : req.body.keepImages
      } catch {
        return next(new HttpError('Retained images must be a valid array of existing image paths', 422))
      }
      if (!Array.isArray(kept) || kept.some(image => typeof image !== 'string' || !old.includes(image) || !uploadPath(image))) {
        return next(new HttpError('Retained images must be a valid array of existing image paths', 422))
      }
    }
    const visitedAt = req.body.visitedAt !== undefined ? new Date(req.body.visitedAt) : null
    if (visitedAt && !Number.isFinite(visitedAt.getTime())) return next(new HttpError('Visited time must be a valid date', 422))
    const previousAddress = String(stop.address || '').trim()
    const address = req.body.address !== undefined ? String(req.body.address || '').trim() : previousAddress
    if (req.body.title !== undefined) stop.title = String(req.body.title).trim()
    if (req.body.note !== undefined) stop.note = req.body.note
    if (req.body.address !== undefined) stop.address = address
    if (visitedAt) stop.visitedAt = visitedAt
    if (req.body.expenses !== undefined) stop.expenses = typeof req.body.expenses === 'string' ? JSON.parse(req.body.expenses) : req.body.expenses
    const exif = parsePoint(req.body.exifLocation)
    const browser = parsePoint(req.body.browserLocation)
    if (validCoords(exif)) stop.location = exif
    else if (validCoords(browser)) stop.location = browser
    else if (address && address !== previousAddress) stop.location = await getCoordsForAddress(address)
    const added = (req.files || []).map(file => `/uploads/images/${file.filename}`)
    stop.images = [...kept, ...added]
    await stop.save()
    removeImages(old.filter(image => !stop.images.includes(image)))
    res.json({ stop: toStop(stop), trip: await withSummary(trip) })
  } catch (error) { return next(error instanceof HttpError ? error : new HttpError(error.message || 'Could not update stop', error.status || 500)) }
}

const deleteStop = async (req, res, next) => {
  try {
    const trip = await ownTrip(req.params.tid, req.userData.userId)
    if (trip.status === 'published') return next(new HttpError('Published trips cannot be edited', 409))
    const stop = await TripStop.findOneAndDelete({ _id: req.params.sid, trip: trip._id })
    if (!stop) return next(new HttpError('Stop not found', 404))
    trip.stops.pull(stop._id)
    await trip.save()
    removeImages(stop.images)
    res.json({ trip: await withSummary(trip) })
  } catch (error) { return next(error instanceof HttpError ? error : new HttpError('Could not delete stop', 500)) }
}

const endTrip = async (req, res, next) => {
  try {
    const trip = await ownTrip(req.params.tid, req.userData.userId)
    if (trip.status !== 'active') return next(new HttpError('Only an active trip can be stopped', 409))
    trip.status = 'completed'
    trip.endedAt = new Date()
    await trip.save()
    res.json({ trip: await withSummary(trip) })
  } catch (error) { return next(error instanceof HttpError ? error : new HttpError('Could not stop trip', 500)) }
}

const resumeTrip = async (req, res, next) => {
  try {
    const trip = await ownTrip(req.params.tid, req.userData.userId)
    if (trip.status !== 'completed') return next(new HttpError('Only a completed trip can be resumed', 409))
    const activeTrip = await Trip.findOne({ creator: req.userData.userId, status: 'active', _id: { $ne: trip._id } })
    if (activeTrip) return next(new HttpError('Stop your other active trip before resuming this one', 409))
    trip.status = 'active'
    trip.endedAt = null
    await trip.save()
    res.json({ trip: await withSummary(trip) })
  } catch (error) {
    return next(error.code === 11000 ? new HttpError('Stop your other active trip before resuming this one', 409) : error instanceof HttpError ? error : new HttpError(error.message || 'Could not resume trip', 500))
  }
}

const publishTrip = async (req, res, next) => {
  try {
    const trip = await ownTrip(req.params.tid, req.userData.userId)
    if (trip.status !== 'completed') return next(new HttpError('Stop the trip before publishing it', 409))
    if (req.body.title !== undefined) trip.title = String(req.body.title).trim()
    if (req.body.visibility) trip.visibility = req.body.visibility
    if (req.body.itinerary) trip.itinerary = typeof req.body.itinerary === 'string' ? JSON.parse(req.body.itinerary) : req.body.itinerary
    const previousCover = trip.coverImage
    if (req.file) trip.coverImage = `/uploads/images/${req.file.filename}`
    trip.status = 'published'
    await trip.save()
    if (req.file) removeImages([previousCover])
    res.json({ trip: await withSummary(trip) })
  } catch (error) { return next(error instanceof HttpError ? error : new HttpError(error.message || 'Could not publish trip', error.status || 500)) }
}

const updateTrip = async (req, res, next) => {
  try {
    const trip = await ownTrip(req.params.tid, req.userData.userId)
    if (trip.status === 'published') return next(new HttpError('Published trips cannot be edited', 409))
    for (const field of ['title', 'visibility']) if (req.body[field] !== undefined) trip[field] = req.body[field]
    if (req.body.plannedBudget !== undefined) trip.plannedBudget = Number(req.body.plannedBudget)
    if (!Number.isFinite(trip.plannedBudget) || trip.plannedBudget < 0) return next(new HttpError('Enter a valid planned budget', 422))
    if (req.body.itinerary !== undefined) trip.itinerary = typeof req.body.itinerary === 'string' ? JSON.parse(req.body.itinerary) : req.body.itinerary
    await trip.save()
    res.json({ trip: await withSummary(trip) })
  } catch (error) { return next(error instanceof HttpError ? error : new HttpError(error.message || 'Could not update trip', error.status || 500)) }
}

const deleteTrip = async (req, res, next) => {
  try {
    const trip = await ownTrip(req.params.tid, req.userData.userId)
    const stops = await TripStop.find({ trip: trip._id })
    const user = await User.findById(trip.creator)
    await TripStop.deleteMany({ trip: trip._id })
    await trip.deleteOne()
    if (user) { user.trips.pull(trip._id); await user.save() }
    removeImages([...stops.flatMap(stop => stop.images), trip.coverImage])
    res.json({ message: 'Trip deleted' })
  } catch (error) { return next(error instanceof HttpError ? error : new HttpError('Could not delete trip', 500)) }
}

const getTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findById(req.params.tid).populate('creator', 'name image')
    if (!trip) return next(new HttpError('Trip not found', 404))
    const owner = trip.creator._id.toString() === req.userData.userId
    const isFollower = owner ? false : Boolean(await User.exists({ _id: trip.creator._id, followers: req.userData.userId }))
    if (trip.status !== 'published' && !owner) return next(new HttpError('Trip not found', 404))
    if (trip.visibility === 'private' && !owner) return next(new HttpError('Trip not found', 404))
    if (trip.visibility === 'followers' && !owner && !isFollower) return next(new HttpError('Trip not found', 404))
    await trip.populate('comments.author', 'name image')
    res.json({ trip: await withSummary(trip) })
  } catch (error) { return next(new HttpError('Could not load trip', 500)) }
}

const getVisiblePublishedTrip = async (tid, userId) => {
  const trip = await Trip.findById(tid)
  if (!trip || trip.status !== 'published') throw new HttpError('Trip not found', 404)

  const owner = trip.creator.toString() === userId
  if (trip.visibility === 'private' && !owner) throw new HttpError('Trip not found', 404)
  if (trip.visibility === 'followers' && !owner) {
    const isFollower = await User.exists({ _id: trip.creator, followers: userId })
    if (!isFollower) throw new HttpError('Trip not found', 404)
  }
  return trip
}

const toggleTripLike = async (req, res, next) => {
  try {
    const trip = await getVisiblePublishedTrip(req.params.tid, req.userData.userId)
    const userId = req.userData.userId
    trip.likes = trip.likes || []
    const alreadyLiked = trip.likes.some(id => id.toString() === userId)
    if (alreadyLiked) trip.likes.pull(userId)
    else trip.likes.addToSet(userId)
    await trip.save()
    res.json({ liked: !alreadyLiked, likes: trip.likes, likeCount: trip.likes.length })
  } catch (error) { return next(error instanceof HttpError ? error : new HttpError('Could not update trip like', 500)) }
}

const addTripComment = async (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return next(new HttpError('Comment cannot be empty or exceed 1000 characters', 422))
  try {
    const trip = await getVisiblePublishedTrip(req.params.tid, req.userData.userId)
    trip.comments = trip.comments || []
    trip.comments.push({ author: req.userData.userId, text: req.body.text.trim() })
    await trip.save()
    await trip.populate('comments.author', 'name image')
    const comment = trip.comments[trip.comments.length - 1]
    res.status(201).json({ comment, commentCount: trip.comments.length })
  } catch (error) { return next(error instanceof HttpError ? error : new HttpError('Could not add trip comment', 500)) }
}

const shareTrip = async (req, res, next) => {
  try {
    const trip = await getVisiblePublishedTrip(req.params.tid, req.userData.userId)
    const updatedTrip = await Trip.findByIdAndUpdate(trip._id, { $inc: { shareCount: 1 } }, { new: true })
    if (!updatedTrip) return next(new HttpError('Trip not found', 404))
    res.json({ shares: updatedTrip.shareCount })
  } catch (error) { return next(error instanceof HttpError ? error : new HttpError('Could not share trip', 500)) }
}

const getUserTrips = async (req, res, next) => {
  try {
    const own = req.params.uid === req.userData.userId
    const creator = await User.findById(req.params.uid).select('followers')
    if (!creator) return next(new HttpError('User not found', 404))
    const isFollowing = creator.followers.some(follower => follower.toString() === req.userData.userId)
    const query = { creator: req.params.uid }
    if (!own) {
      query.status = 'published'
      query.visibility = isFollowing ? { $in: ['public', 'followers'] } : 'public'
    }
    const trips = await Trip.find(query).sort({ startedAt: -1 }).populate('creator', 'name image').populate('comments.author', 'name image')
    res.json({ trips: await Promise.all(trips.map(withSummary)), isFollowing })
  } catch (error) { return next(new HttpError('Could not load trips', 500)) }
}

const getFeed = async (req, res, next) => {
  try {
    const followed = await User.find({ followers: req.userData.userId }).select('_id')
    const followedIds = followed.map(user => user._id)
    const visibility = [{ visibility: 'public' }]
    if (followedIds.length) visibility.push({ visibility: 'followers', creator: { $in: followedIds } })
    const trips = await Trip.find({ status: 'published', $or: visibility }).sort({ endedAt: -1 }).limit(30).populate('creator', 'name image').populate('comments.author', 'name image')
    res.json({ trips: await Promise.all(trips.map(withSummary)) })
  } catch (error) { return next(new HttpError('Could not load trip feed', 500)) }
}

exports.startTrip = startTrip
exports.reverseGeocode = reverseGeocode
exports.getActiveTrip = getActiveTrip
exports.addStop = addStop
exports.updateStop = updateStop
exports.deleteStop = deleteStop
exports.endTrip = endTrip
exports.resumeTrip = resumeTrip
exports.publishTrip = publishTrip
exports.updateTrip = updateTrip
exports.deleteTrip = deleteTrip
exports.getTrip = getTrip
exports.toggleTripLike = toggleTripLike
exports.addTripComment = addTripComment
exports.shareTrip = shareTrip
exports.getUserTrips = getUserTrips
exports.getFeed = getFeed
