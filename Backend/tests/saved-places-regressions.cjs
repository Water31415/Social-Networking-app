const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const mongoose = require('../node_modules/mongoose')
const HttpError = require('../models/http-error')
const owner = 'aaaaaaaaaaaaaaaaaaaaaaaa', placeId = 'bbbbbbbbbbbbbbbbbbbbbbbb', otherPlace = 'cccccccccccccccccccccccc'
const id = value => String(value)

function harness() {
  const user = { _id:owner, placeCollections:[], savedPlaces:[] }
  const places = new Map([[placeId, { id:placeId, title:'A quiet beach', creator:{ name:'Traveler' } }]])
  const updates = []
  const User = {
    findById: userId => ({ select: projection => {
      assert.equal(projection, 'placeCollections savedPlaces')
      return Promise.resolve(userId === owner ? Object.assign(user, { populate:async () => {
        // Return a separate populated view, as a database query would.
        user.savedPlaces = user.savedPlaces.map(saved => ({ ...saved, place:places.has(id(saved.place)) ? { ...places.get(id(saved.place)), toObject() { const { toObject, ...data } = this; return data } } : null }))
      } }) : null)
    } }),
    updateOne: async (filter, update, options = {}) => {
      updates.push({ filter, update, options })
      let matches = filter._id === owner
      if (filter.savedPlaces?.$exists === false) matches = matches && !Array.isArray(user.savedPlaces)
      if (filter['placeCollections.key']) matches = matches && !user.placeCollections.some(c => c.key === filter['placeCollections.key'].$ne)
      if (filter['placeCollections._id']) matches = matches && user.placeCollections.some(c => id(c._id) === id(filter['placeCollections._id']))
      if (filter.placeCollections?.$not) {
        const { key, _id } = filter.placeCollections.$not.$elemMatch
        matches = matches && !user.placeCollections.some(c => c.key === key && id(c._id) !== id(_id.$ne))
      }
      if (filter['savedPlaces.place']) {
        const value = filter['savedPlaces.place']
        const exists = user.savedPlaces.some(saved => id(saved.place) === id(value.$ne || value))
        matches = matches && (value.$ne ? !exists : exists)
      }
      if (!matches) return { matchedCount:0, modifiedCount:0 }
      if (update.$push?.placeCollections) user.placeCollections.push(update.$push.placeCollections)
      if (update.$push?.savedPlaces) user.savedPlaces.push(update.$push.savedPlaces)
      if (update.$pull?.placeCollections) user.placeCollections = user.placeCollections.filter(c => id(c._id) !== id(update.$pull.placeCollections._id))
      if (update.$pull?.savedPlaces) user.savedPlaces = user.savedPlaces.filter(saved => !Object.entries(update.$pull.savedPlaces).every(([field, value]) => id(saved[field]) === id(value)))
      for (const [key, value] of Object.entries(update.$set || {})) {
        if (key === 'savedPlaces') user.savedPlaces = value
        else if (key.startsWith('placeCollections.')) {
          const collection = user.placeCollections.find(c => id(c._id) === id(options.arrayFilters[0]['collection._id']))
          collection[key.split('.').at(-1)] = value
        } else {
          const condition = options.arrayFilters[0]
          for (const saved of user.savedPlaces) if (Object.entries(condition).every(([field, expected]) => id(saved[field.split('.')[1]]) === id(expected))) saved.collectionId = value
        }
      }
      return { matchedCount:1, modifiedCount:1 }
    }
  }
  const controller = {}
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../controllers/saved-places-controller.js'), 'utf8'), {
    exports:controller, Date, Set,
    require: name => ({ mongoose, '../models/user':User, '../models/places':{ exists:async query => places.has(query._id) }, '../models/http-error':HttpError })[name]
  })
  const invoke = async (method, body = {}, params = {}, userId = owner) => {
    const response = { status:200 }
    await controller[method]({ body, params:{ pid:placeId, ...params }, userData:{ userId } }, {
      status(code) { response.status = code; return this }, json(data) { response.data = data }, end() {}
    }, error => { response.error = error })
    return response
  }
  const collection = async name => (await invoke('createCollection', { name })).data.collection
  return { user, places, updates, invoke, collection }
}

test('saved collections normalize names and reject case-insensitive duplicates', async () => {
  const h = harness()
  const first = await h.collection('  Weekend   escapes  ')
  assert.equal(first.name, 'Weekend escapes')
  assert.equal((await h.invoke('createCollection', { name:'weekend ESCAPES' })).error.code, 409)
  for (const name of ['', ' ', {}, 'x'.repeat(61)]) assert.equal((await h.invoke('createCollection', { name })).error.code, 422)
})
test('repeated and concurrent saves produce one bookmark, and moving preserves it', async () => {
  const h = harness()
  const a = await h.collection('Weekend escapes'), b = await h.collection('Next trip')
  const results = await Promise.all([h.invoke('savePlace', { collectionId:a.id }), h.invoke('savePlace', { collectionId:a.id })])
  assert.ok(results.every(result => !result.error))
  assert.equal(h.user.savedPlaces.length, 1)
  await h.invoke('savePlace', { collectionId:b.id })
  assert.equal(h.user.savedPlaces.length, 1)
  assert.equal(h.user.savedPlaces[0].collectionId, b.id)
})
test('another account cannot read or modify the owner’s saved collections', async () => {
  const h = harness(), collection = await h.collection('Private')
  await h.invoke('savePlace', { collectionId:collection.id })
  for (const method of ['getSavedPlaces', 'savePlace', 'renameCollection', 'deleteCollection', 'removeSavedPlace']) {
    const response = await h.invoke(method, { name:'Changed', collectionId:collection.id }, { cid:collection.id }, otherPlace)
    assert.equal(response.error.code, 404)
  }
  assert.equal(h.user.placeCollections[0].name, 'Private')
  assert.equal(h.user.savedPlaces.length, 1)
  assert.equal(h.user.savedPlaces[0].collectionId, collection.id)
})
test('foreign collections and missing places cannot be bookmarked', async () => {
  const h = harness()
  assert.equal((await h.invoke('savePlace', { collectionId:otherPlace })).error.code, 404)
  assert.equal((await h.invoke('savePlace', { collectionId:{} })).error.code, 422)
  assert.equal((await h.invoke('savePlace', {}, { pid:otherPlace })).error.code, 404)
  assert.equal(h.user.savedPlaces.length, 0)
})
test('renaming checks duplicates without changing the collection bookmarks', async () => {
  const h = harness(), a = await h.collection('Weekend')
  await h.collection('Next')
  await h.invoke('savePlace', { collectionId:a.id })
  assert.equal((await h.invoke('renameCollection', { name:'next' }, { cid:a.id })).error.code, 409)
  assert.equal((await h.invoke('renameCollection', { name:'Weekend away' }, { cid:a.id })).status, 200)
  assert.equal(h.user.savedPlaces.length, 1)
  assert.equal(h.user.savedPlaces[0].collectionId, a.id)
})
test('deleting a collection unsaves all its places and preserves other collections and Unsorted', async () => {
  const h = harness(), a = await h.collection('Weekend'), b = await h.collection('Next')
  const secondPlace = 'dddddddddddddddddddddddd', unsortedPlace = 'eeeeeeeeeeeeeeeeeeeeeeee'
  for (const pid of [secondPlace, otherPlace, unsortedPlace]) h.places.set(pid, { id:pid })
  for (const [pid, collectionId] of [[placeId,a.id], [secondPlace,a.id], [otherPlace,b.id], [unsortedPlace,null]]) {
    assert.equal((await h.invoke('savePlace', { collectionId }, { pid })).status, 201)
  }
  assert.equal((await h.invoke('deleteCollection', {}, { cid:a.id.toUpperCase() })).status, 204)
  assert.deepEqual(h.user.savedPlaces.map(saved => [id(saved.place), saved.collectionId]), [[otherPlace,b.id], [unsortedPlace,null]])
  assert.equal(h.user.placeCollections.length, 1)
  assert.equal(id(h.user.placeCollections[0]._id), b.id)
  assert.ok(h.places.has(placeId) && h.places.has(secondPlace), 'Published places remain available')
  assert.equal((await h.invoke('deleteCollection', {}, { cid:a.id })).error.code, 404)
  assert.equal(h.user.savedPlaces.length, 2, 'Deleting a missing collection leaves the remaining library intact')
})
test('deleting an empty collection leaves unrelated bookmarks intact', async () => {
  const h = harness(), empty = await h.collection('Empty')
  await h.invoke('savePlace')
  assert.equal((await h.invoke('deleteCollection', {}, { cid:empty.id })).status, 204)
  assert.equal(h.user.placeCollections.length, 0)
  assert.equal(h.user.savedPlaces.length, 1)
  assert.equal(h.user.savedPlaces[0].collectionId, null)
})
test('removing a bookmark is idempotent and does not delete its place', async () => {
  const h = harness()
  await h.invoke('savePlace')
  for (let i=0; i<2; i++) assert.equal((await h.invoke('removeSavedPlace')).status, 204)
  assert.equal(h.user.savedPlaces.length, 0)
  assert.ok(h.places.has(placeId))
})

test('moving or re-saving a place returns its original save timestamp', async () => {
  const h = harness(), collection = await h.collection('Weekend')
  await h.invoke('savePlace')
  const original = new Date('2026-01-01T10:00:00Z')
  h.user.savedPlaces[0].savedAt = original
  const result = await h.invoke('savePlace', { collectionId:collection.id })
  assert.equal(new Date(result.data.savedAt).getTime(), original.getTime())
  assert.equal(h.user.savedPlaces[0].savedAt.getTime(), original.getTime())
})

test('uppercase valid collection IDs work when saving, renaming, and removing', async () => {
  const h = harness()
  const collectionId = 'abcdefabcdefabcdefabcdef'
  h.user.placeCollections.push({ _id:new mongoose.Types.ObjectId(collectionId), name:'Weekend', key:'weekend' })
  const saved = await h.invoke('savePlace', { collectionId:collectionId.toUpperCase() })
  assert.equal(saved.error, undefined)
  assert.equal(saved.data.collectionId, collectionId)
  const renamed = await h.invoke('renameCollection', { name:'Coast' }, { cid:collectionId.toUpperCase() })
  assert.equal(renamed.error, undefined)
  assert.equal(renamed.data.collection.id, collectionId)
  assert.equal((await h.invoke('deleteCollection', {}, { cid:collectionId.toUpperCase() })).status, 204)
  assert.equal(h.user.placeCollections.length, 0)
  assert.equal(h.user.savedPlaces.length, 0)
})
test('saved-place lists omit deleted places and normalize missing collection references', async () => {
  const h = harness()
  h.user.savedPlaces.push({ place:placeId, collectionId:otherPlace, savedAt:new Date() }, { place:otherPlace })
  const result = await h.invoke('getSavedPlaces')
  assert.equal(result.data.savedPlaces.length, 1)
  assert.equal(result.data.savedPlaces[0].collectionId, null)
  assert.equal(result.data.savedPlaces[0].place.creatorName, 'Traveler')
  assert.equal(result.data.savedPlaces[0].place.id, placeId)
})

test('saved-place updates pass real Mongoose casting and validation without a database', async () => {
  const h = harness(), collection = await h.collection('Weekend')
  await h.invoke('savePlace', { collectionId:collection.id })
  await h.invoke('savePlace', { collectionId:null })
  await h.invoke('renameCollection', { name:'Another day' }, { cid:collection.id })
  await h.invoke('deleteCollection', {}, { cid:collection.id })
  await h.invoke('removeSavedPlace')
  const User = require('../models/user')
  const original = User.collection.updateOne
  let count = 0
  User.collection.updateOne = async filter => { assert.ok(filter._id instanceof mongoose.Types.ObjectId); count++; return { matchedCount:1, modifiedCount:1 } }
  try {
    for (const call of h.updates) await User.updateOne(call.filter, call.update, call.options)
    assert.equal(count, h.updates.length)
    const legacy = new User({ name:'Traveler', image:'/photo.png', email:'test@example.invalid', password:'hashed-password' })
    await legacy.validate()
    assert.equal(legacy.savedPlaces.length, 0)
    assert.equal(legacy.placeCollections.length, 0)
  } finally { User.collection.updateOne = original }
})
