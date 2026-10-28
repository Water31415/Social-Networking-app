const mongoose = require('mongoose')
const Schema = mongoose.Schema

const itinerarySchema = new Schema({
  day: { type: Number, min: 1, required: true },
  plannedPlace: { type: String, trim: true, required: true },
  plannedTime: { type: String, default: '' },
  done: { type: Boolean, default: false }
}, { _id: true })

const tripSchema = new Schema({
  title: { type: String, trim: true, required: true },
  creator: { type: mongoose.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['draft', 'active', 'completed', 'published'], default: 'draft', index: true },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null },
  startAddress: { type: String, trim: true, default: '' },
  startLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  plannedBudget: { type: Number, min: 0, default: 0 },
  visibility: { type: String, enum: ['public', 'followers', 'private'], default: 'private' },
  coverImage: { type: String, default: '' },
  itinerary: { type: [itinerarySchema], default: [] },
  stops: [{ type: mongoose.Types.ObjectId, ref: 'TripStop' }],
  likes: [{ type: mongoose.Types.ObjectId, ref: 'User' }],
  comments: [{
    author: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now }
  }],
  shareCount: { type: Number, default: 0, min: 0 }
}, { timestamps: true })

// This also closes the race where two start requests arrive at the same time.
tripSchema.index({ creator: 1, status: 1 }, {
  unique: true,
  partialFilterExpression: { status: 'active' }
})

module.exports = mongoose.model('Trip', tripSchema)
