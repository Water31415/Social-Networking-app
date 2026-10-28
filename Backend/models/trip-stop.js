const mongoose = require('mongoose')
const Schema = mongoose.Schema

const tripStopSchema = new Schema({
  trip: { type: mongoose.Types.ObjectId, ref: 'Trip', required: true, index: true },
  title: { type: String, required: true, trim: true },
  note: { type: String, default: '' },
  images: [{ type: String }],
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  address: { type: String, default: '' },
  visitedAt: { type: Date, default: Date.now },
  expenses: [{
    amount: { type: Number, min: 0, required: true },
    category: { type: String, default: 'Other', trim: true },
    note: { type: String, default: '' }
  }]
}, { timestamps: true })

module.exports = mongoose.model('TripStop', tripStopSchema)
