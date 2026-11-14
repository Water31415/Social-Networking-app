// Explicit integration check: all fixture writes use one transaction, which is
// always aborted. Existing accounts, places, and collections are never modified.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const mongoose = require('../node_modules/mongoose')
const User = require('../models/user')
const Place = require('../models/places')
const HttpError = require('../models/http-error')
const { loadEnvironment, applyDatabaseDns } = require('../config/environment')
loadEnvironment()
let session
const userId = new mongoose.Types.ObjectId()
const placeIds = Array.from({ length:3 }, () => new mongoose.Types.ObjectId())
const [placeId, unsortedPlaceId, otherPlaceId] = placeIds
;(async () => {
  try {
    applyDatabaseDns()
    await mongoose.connect(process.env.DATABASE_API_KEY, { serverSelectionTimeoutMS:8000, connectTimeoutMS:5000, autoCreate:false, autoIndex:false })
    session = await mongoose.startSession()
    session.startTransaction()
    await new User({ _id:userId, name:`snapit-test-${userId}`, email:`${userId}@example.invalid`, password:'unused-test-hash', image:'/uploads/images/test-placeholder.png' }).save({ session })
    for (const fixtureId of placeIds) {
      await new Place({ _id:fixtureId, title:'Rollback-only test place', description:'Isolated integration fixture', address:'Test address', location:{ lat:0, lng:0 }, creator:userId, images:[] }).save({ session })
    }
    const controller = {}
    const dependencies = {
      mongoose,
      '../models/http-error':HttpError,
      '../models/user':{
        findById:id => User.findById(id).session(session),
        updateOne:(filter, update, options) => User.updateOne(filter, update, { ...options, session })
      },
      '../models/places':{ exists:filter => Place.exists(filter).session(session) }
    }
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../controllers/saved-places-controller.js'),'utf8'), { exports:controller, Date, Set, require:name => dependencies[name] })
    const invoke = async (method, body = {}, params = {}) => {
      const result = { status:200 }
      await controller[method]({ body, params:{ pid:String(placeId), ...params }, userData:{ userId:String(userId) } }, {
        status(code) { result.status = code; return this }, json(data) { result.data = data }, end() {}
      }, error => { throw error })
      return result
    }
    const collection = (await invoke('createCollection',{name:'Weekend escapes'})).data.collection
    const firstSave = await invoke('savePlace',{collectionId:collection.id.toUpperCase()})
    assert.equal(firstSave.status,201)
    const repeated = await invoke('savePlace',{collectionId:collection.id})
    assert.equal(repeated.status,200)
    assert.equal(new Date(repeated.data.savedAt).getTime(), new Date(firstSave.data.savedAt).getTime())
    let library = (await invoke('getSavedPlaces')).data
    assert.equal(library.savedPlaces.length,1)
    assert.equal(library.savedPlaces[0].place.id,String(placeId))
    assert.equal(library.savedPlaces[0].collectionId,collection.id)
    console.log('PASS live saved-place create/save/repeat/read/population within transaction')
    await invoke('renameCollection',{name:'Coastal weekends'},{cid:collection.id.toUpperCase()})
    assert.equal((await invoke('getSavedPlaces')).data.collections[0].name,'Coastal weekends')
    await invoke('savePlace',{collectionId:null})
    assert.equal((await invoke('getSavedPlaces')).data.savedPlaces[0].collectionId,null)
    await invoke('savePlace',{collectionId:collection.id})
    const keptCollection = (await invoke('createCollection',{name:'Next trip'})).data.collection
    await invoke('savePlace',{collectionId:null},{pid:String(unsortedPlaceId)})
    await invoke('savePlace',{collectionId:keptCollection.id},{pid:String(otherPlaceId)})
    await invoke('deleteCollection',{}, {cid:collection.id.toUpperCase()})
    library = (await invoke('getSavedPlaces')).data
    assert.deepEqual(Array.from(library.collections, item => item.id),[keptCollection.id])
    assert.equal(library.savedPlaces.length,2)
    assert.equal(library.savedPlaces.find(saved => saved.place.id === String(placeId)),undefined)
    assert.equal(library.savedPlaces.find(saved => saved.place.id === String(unsortedPlaceId)).collectionId,null)
    assert.equal(library.savedPlaces.find(saved => saved.place.id === String(otherPlaceId)).collectionId,keptCollection.id)
    assert.ok(await Place.exists({_id:placeId}).session(session))
    console.log('PASS collection deletion unsaves its places and preserves Unsorted, other collections, and original posts')
    await invoke('removeSavedPlace')
    await invoke('removeSavedPlace',{}, {pid:String(unsortedPlaceId)})
    await invoke('removeSavedPlace',{}, {pid:String(otherPlaceId)})
    assert.equal((await invoke('getSavedPlaces')).data.savedPlaces.length,0)
    console.log('PASS live bookmark removal')
  } catch (error) {
    console.log('FAIL saved-place database check: '+(error.code || error.name))
    process.exitCode = 1
  } finally {
    if(session) {
      try {
        if(session.inTransaction()) await session.abortTransaction()
        await session.endSession()
        assert.equal(await User.exists({_id:userId}),null)
        assert.equal(await Place.exists({_id:{ $in:placeIds }}),null)
        console.log('PASS transaction aborted; no fixture accounts or places persisted')
      } catch (error) { console.log('FAIL rollback verification: '+(error.code || error.name)); process.exitCode = 1 }
    }
    await mongoose.disconnect()
  }
})()
