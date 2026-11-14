const mongoose = require('mongoose')
const User = require('../models/user')
const Place = require('../models/places')
const HttpError = require('../models/http-error')

const collectionObject = collection => ({ id:String(collection._id), name:collection.name, createdAt:collection.createdAt })
const readName = value => {
  if (typeof value !== 'string') throw new HttpError('Enter a collection name', 422)
  const name = value.trim().replace(/\s+/g, ' ')
  if (!name || name.length > 60) throw new HttpError('Collection names must contain 1–60 characters', 422)
  return { name, key:name.toLowerCase() }
}
const loadUser = async userId => {
  const user = await User.findById(userId).select('placeCollections savedPlaces')
  if (!user) throw new HttpError('User not found', 404)
  return user
}
const action = (handler, message) => async (req, res, next) => {
  try { await handler(req, res) }
  catch (error) { next(error instanceof HttpError ? error : new HttpError(message, 500)) }
}

exports.getSavedPlaces = action(async (req, res) => {
  const user = await loadUser(req.userData.userId)
  await user.populate({ path:'savedPlaces.place', populate:[
    { path:'creator', select:'name image' },
    { path:'likes', select:'name' },
    { path:'comments.author', select:'name' }
  ] })
  const collections = (user.placeCollections || []).map(collectionObject)
  const collectionIds = new Set(collections.map(collection => collection.id))
  const savedPlaces = (user.savedPlaces || []).filter(saved => saved?.place).map(saved => {
    const place = saved.place.toObject({ getters:true })
    place.creatorName = saved.place.creator?.name || ''
    const collectionId = saved.collectionId ? String(saved.collectionId) : null
    return { place, collectionId:collectionIds.has(collectionId) ? collectionId : null, savedAt:saved.savedAt }
  })
  res.json({ collections, savedPlaces })
}, 'Could not load saved places')

exports.createCollection = action(async (req, res) => {
  const { name, key } = readName(req.body.name)
  await loadUser(req.userData.userId)
  // Initialize legacy accounts without overwriting an array created by another request.
  await User.updateOne({ _id:req.userData.userId, savedPlaces:{ $exists:false } }, { $set:{ savedPlaces:[] } })
  const collection = { _id:new mongoose.Types.ObjectId(), name, key, createdAt:new Date() }
  const result = await User.updateOne({ _id:req.userData.userId, 'placeCollections.key':{ $ne:key } }, { $push:{ placeCollections:collection } }, { runValidators:true })
  if (!result.matchedCount) throw new HttpError('You already have a collection with this name', 409)
  res.status(201).json({ collection:collectionObject(collection) })
}, 'Could not create collection')

exports.renameCollection = action(async (req, res) => {
  const { name, key } = readName(req.body.name)
  const collectionId = req.params.cid.toLowerCase()
  const user = await loadUser(req.userData.userId)
  if (!(user.placeCollections || []).some(collection => String(collection._id) === collectionId)) throw new HttpError('Collection not found', 404)
  const result = await User.updateOne({
    _id:req.userData.userId,
    'placeCollections._id':collectionId,
    placeCollections:{ $not:{ $elemMatch:{ key, _id:{ $ne:new mongoose.Types.ObjectId(collectionId) } } } }
  }, { $set:{ 'placeCollections.$[collection].name':name, 'placeCollections.$[collection].key':key } }, {
    arrayFilters:[{ 'collection._id':collectionId }], runValidators:true
  })
  if (!result.matchedCount) throw new HttpError('This collection changed or its name is already in use. Refresh and try again.', 409)
  res.json({ collection:{ id:collectionId, name } })
}, 'Could not rename collection')

exports.deleteCollection = action(async (req, res) => {
  const collectionId = req.params.cid.toLowerCase()
  const result = await User.updateOne({ _id:req.userData.userId, 'placeCollections._id':collectionId }, {
    $pull:{ placeCollections:{ _id:collectionId }, savedPlaces:{ collectionId } }
  })
  if (!result.matchedCount) throw new HttpError('Collection not found', 404)
  res.status(204).end()
}, 'Could not remove collection')

exports.savePlace = action(async (req, res) => {
  const input = req.body.collectionId ?? null
  if (input !== null && (typeof input !== 'string' || !/^[a-f\d]{24}$/i.test(input))) throw new HttpError('Choose a valid collection', 422)
  const collectionId = input?.toLowerCase() ?? null
  const user = await loadUser(req.userData.userId)
  if (collectionId && !(user.placeCollections || []).some(collection => String(collection._id) === collectionId)) throw new HttpError('Collection not found', 404)
  if (!await Place.exists({ _id:req.params.pid })) throw new HttpError('This place is no longer available', 404)
  const owner = { _id:req.userData.userId, ...(collectionId ? { 'placeCollections._id':collectionId } : {}) }
  const savedAt = (user.savedPlaces || []).find(saved => String(saved.place).toLowerCase() === req.params.pid.toLowerCase())?.savedAt || new Date()
  // The predicate makes repeated/concurrent saves idempotent.
  const created = await User.updateOne({ ...owner, 'savedPlaces.place':{ $ne:req.params.pid } }, {
    $push:{ savedPlaces:{ place:req.params.pid, collectionId, savedAt } }
  }, { runValidators:true })
  if (!created.matchedCount) {
    const moved = await User.updateOne({ ...owner, 'savedPlaces.place':req.params.pid }, {
      $set:{ 'savedPlaces.$[saved].collectionId':collectionId }
    }, { arrayFilters:[{ 'saved.place':req.params.pid }], runValidators:true })
    if (!moved.matchedCount) throw new HttpError('The collection changed. Refresh and try again.', 409)
  }
  res.status(created.matchedCount ? 201 : 200).json({ placeId:req.params.pid, collectionId, savedAt })
}, 'Could not save place')

exports.removeSavedPlace = action(async (req, res) => {
  const result = await User.updateOne({ _id:req.userData.userId }, { $pull:{ savedPlaces:{ place:req.params.pid } } })
  if (!result.matchedCount) throw new HttpError('User not found', 404)
  res.status(204).end()
}, 'Could not remove saved place')
