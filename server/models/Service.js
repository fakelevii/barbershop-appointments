const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  bookingRevision: { type: Number, default: 0 },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  durationMinutes: {
    type: Number, required: true, min: 15, max: 300,
    validate: { validator: value => Number.isInteger(value) && value % 15 === 0, message: 'Duration must be a multiple of 15 minutes' }
  },
  active: { type: Boolean, default: true }
}, { timestamps: true });
schema.index({ name: 1 }, { unique: true });
module.exports = mongoose.model('Service', schema);
