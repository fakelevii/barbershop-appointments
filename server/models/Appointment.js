const mongoose = require('mongoose');
const rescheduleSchema = new mongoose.Schema({
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'approved', 'declined', 'withdrawn', 'cancelled'], required: true },
  requestedAt: { type: Date, default: Date.now },
  resolvedAt: Date
});
const schema = new mongoose.Schema({
  rescheduleRequest: { type: rescheduleSchema, default: undefined },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  barber: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber', required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  serviceName: { type: String, required: true },
  durationMinutes: { type: Number, required: true, min: 15, validate: value => Number.isInteger(value) && value % 15 === 0 },
  startAt: { type: Date, required: true },
  endAt: {
    type: Date, required: true,
    validate: function(value) { return this.startAt && value.getTime() === this.startAt.getTime() + this.durationMinutes * 60000; }
  },
  status: { type: String, enum: ['confirmed', 'completed', 'cancelled', 'no-show'], default: 'confirmed' }
}, { timestamps: true });
schema.index({ barber: 1, startAt: 1, endAt: 1 });
schema.index({ customer: 1, startAt: -1 });
module.exports = mongoose.model('Appointment', schema);
