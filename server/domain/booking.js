const mongoose = require('mongoose');
const Barber = require('../models/Barber');
const Service = require('../models/Service');
const Schedule = require('../models/Schedule');
const Appointment = require('../models/Appointment');
const { availableStarts, bookingInstant, parseDate } = require('./availability');
const { fail } = require('../lib/http');
function localTime(value) { return new Date(value.getTime() + 8 * 3600000).toISOString().slice(11,16); }
function localDate(value) { return new Date(value.getTime() + 8 * 3600000).toISOString().slice(0,10); }
async function availability(barberId, serviceId, date, session = null, excludeId = null) {
  try { parseDate(date); } catch { fail(400,'Invalid date'); }
  const barber = await Barber.findOne({_id:barberId,active:true}).session(session);
  const previous = excludeId ? await Appointment.findOne({_id:excludeId,barber:barberId,service:serviceId,status:'confirmed',startAt:{$gt:new Date()}}).session(session) : null;
  if(excludeId && !previous) fail(409,'Only upcoming confirmed appointments can be rescheduled');
  const service = previous ? { _id:previous.service,name:previous.serviceName,durationMinutes:previous.durationMinutes } : await Service.findOne({_id:serviceId,active:true}).session(session);
  if (!barber || !service || (!previous && !barber.services.some(id => id.equals(service._id)))) fail(400,'This barber does not offer this service');
  const start = bookingInstant(date,'00:00');
  const end = new Date(start.getTime() + 86400000);
  const query = {barber:barberId,status:{$ne:'cancelled'},startAt:{$lt:end},endAt:{$gt:start}};
  if (excludeId) query._id = {$ne:excludeId};
  const [schedule,appointments] = await Promise.all([
    Schedule.findOne({barber:barberId,date}).session(session),
    Appointment.find(query).session(session)
  ]);
  const busy = appointments.map(a=>({
    start:a.startAt < start ? '00:00' : localTime(a.startAt),
    end:a.endAt >= end ? '23:59' : localTime(a.endAt)
  }));
  return {barber,service,times:availableStarts({
    date,durationMinutes:service.durationMinutes,busy,
    blocked:schedule?.blocked || [],closed:schedule?.closed || false,
    workingHours:schedule?.workingHours ? {start:schedule.workingHours.start,end:schedule.workingHours.end} : undefined
  })};
}
// Every appointment and schedule mutation writes this same barber document first.
// MongoDB retries transaction write conflicts before rechecking availability.
async function withBarberLock(barberId, action) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async()=>{
      const barber = await Barber.findOneAndUpdate({_id:barberId,active:true},{$inc:{bookingRevision:1}},{session,returnDocument:'after'});
      if (!barber) fail(404,'Barber not found');
      result = await action(session);
    });
    return result;
  } finally { await session.endSession(); }
}
async function book({customer,barber,service,date,time}) {
  return withBarberLock(barber,async(session)=>{
    const lockedService=await Service.findOneAndUpdate({_id:service,active:true},{$inc:{bookingRevision:1}},{session,returnDocument:'after'});
    if(!lockedService) fail(400,'Service is no longer available');
    const available = await availability(barber,service,date,session);
    if(!available.times.includes(time)) fail(409,'That time is no longer available. Choose another time.');
    const startAt = bookingInstant(date,time);
    const data = { customer,barber,service,serviceName:available.service.name,durationMinutes:available.service.durationMinutes,startAt,endAt:new Date(startAt.getTime()+available.service.durationMinutes*60000),status:'confirmed' };
    const [created] = await Appointment.create([data],{session});
    return created;
  });
}
module.exports = { availability, book, withBarberLock, localDate, localTime };
