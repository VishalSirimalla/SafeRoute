const mongoose = require('mongoose');

const safePlaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['police', 'hospital', 'public_place', 'shelter', 'other'],
      default: 'public_place',
    },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('SafePlace', safePlaceSchema);
