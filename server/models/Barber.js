const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
  bookingRevision: { type: Number, default: 0 },
  bio: { type: String, trim: true, maxlength: 500, default: '' },
  active: { type: Boolean, default: true }
}, { timestamps: true });
schema.index({ user: 1 }, { unique: true });
module.exports = mongoose.model('Barber', schema);
