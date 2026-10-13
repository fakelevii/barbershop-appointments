const Appointment = require('../models/Appointment');
const Barber = require('../models/Barber');
const { availability, withBarberLock, localDate, localTime } = require('./booking');
const { bookingInstant } = require('./availability');
const { fail } = require('../lib/http');

async function requestReschedule(existing, date, time) {
  return withBarberLock(existing.barber, async session => {
    const appointment = await Appointment.findById(existing._id).session(session);
    if (appointment.rescheduleRequest?.status === 'pending') fail(409, 'Withdraw the pending request before requesting another time');
    const available = await availability(appointment.barber, appointment.service, date, session, appointment._id);
    if (!available.times.includes(time)) fail(409, 'That time is no longer available. Choose another time.');
    const startAt = bookingInstant(date, time);
    if (+startAt === +appointment.startAt) fail(400, 'Choose a different appointment time');
    appointment.rescheduleRequest = { startAt, endAt: new Date(+startAt + appointment.durationMinutes * 60000), status: 'pending' };
    await appointment.save({ session });
    return appointment;
  });
}

async function decideReschedule(existing, user, requestId, action) {
  if (!['approve', 'decline', 'withdraw'].includes(action)) fail(400, 'Invalid reschedule action');
  if (action === 'withdraw') {
    if (user.role !== 'customer' || !existing.customer.equals(user._id)) fail(403, 'Only the customer can withdraw this request');
  } else {
    const barber = user.role === 'barber' && await Barber.findOne({ user: user._id });
    if (!barber || !existing.barber.equals(barber._id)) fail(403, 'Only the assigned barber can decide this request');
  }
  return withBarberLock(existing.barber, async session => {
    const appointment = await Appointment.findById(existing._id).session(session);
    const request = appointment.rescheduleRequest;
    if (appointment.status !== 'confirmed' || !request || !request._id.equals(requestId) || request.status !== 'pending') fail(409, 'This request is no longer pending. Refresh your appointments.');
    if (action === 'approve') {
      const available = await availability(appointment.barber, appointment.service, localDate(request.startAt), session, appointment._id);
      if (!available.times.includes(localTime(request.startAt))) fail(409, 'The requested time is no longer available. The original appointment is unchanged.');
      appointment.startAt = request.startAt;
      appointment.endAt = request.endAt;
    }
    request.status = { approve: 'approved', decline: 'declined', withdraw: 'withdrawn' }[action];
    request.resolvedAt = new Date();
    await appointment.save({ session });
    return appointment;
  });
}
module.exports = { requestReschedule, decideReschedule };
