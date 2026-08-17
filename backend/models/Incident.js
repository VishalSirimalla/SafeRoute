const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['active', 'open', 'under_review', 'acknowledged', 'resolved'],
      default: 'active',
    },
    incidentDate: { type: Date, required: true },
    source: { type: String, default: 'community' },
    userId: { type: String, required: true, index: true, trim: true },
    secureShareToken: { type: String, index: true, sparse: true },
    shareExpiresAt: { type: Date },
    evidenceUrl: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

module.exports = mongoose.model('Incident', incidentSchema);
