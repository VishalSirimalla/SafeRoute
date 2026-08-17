const mongoose = require('mongoose');

const trustedContactSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true, trim: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    relationship: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('TrustedContact', trustedContactSchema);
