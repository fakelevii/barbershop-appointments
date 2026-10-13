const mongoose = require('mongoose');
const { parseDate, timeMinutes } = require('../domain/availability');
const validDate = value => { try { parseDate(value); return true; } catch { return false; } };
const validTime = value => { try { timeMinutes(value); return true; } catch { return false; } };
const blockSchema = new mongoose.Schema({
  start: { type: String, required: true, validate: validTime },
  end: {
    type: String, required: true,
    validate: function(value) { return validTime(value) && validTime(this.start) && timeMinutes(value) > timeMinutes(this.start); }
  },
  reason: { type: String, trim: true, maxlength: 200, default: '' }
}, { _id: false });
const schema = new mongoose.Schema({
  barber: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber', required: true },
  date: { type: String, required: true, validate: validDate },
  closed: { type: Boolean, default: false },
  workingHours: { type: blockSchema, default: () => ({ start: '09:00', end: '18:00' }), validate: value => value && validTime(value.start) && validTime(value.end) && timeMinutes(value.start) >= 540 && timeMinutes(value.end) <= 1080 },
  blocked: [blockSchema]
}, { timestamps: true });
schema.index({ barber: 1, date: 1 }, { unique: true });
module.exports = mongoose.model('Schedule', schema);
