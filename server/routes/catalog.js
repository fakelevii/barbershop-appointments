const express=require('express');
const mongoose=require('mongoose');
const Barber=require('../models/Barber');
const Service=require('../models/Service');
const Schedule=require('../models/Schedule');
const Appointment=require('../models/Appointment');
const {availability,withBarberLock}=require('../domain/booking');
const {bookingInstant,parseDate}=require('../domain/availability');
const {fail,id,string}=require('../lib/http');
function catalogRoutes(auth) {
 const router=express.Router();
 router.get('/barbers',async(req,res)=>res.json(await Barber.find({active:true}).populate('user','name').populate({path:'services',match:{active:true}})));
 router.get('/barbers/:id/availability',(req,res,next)=>req.query.appointment?auth.authenticate(req,res,next):next(),async(req,res)=>{
  const barberId=id(req.params.id),serviceId=id(req.query.service);
  let excludeId=null;
  if(req.query.appointment) {
    excludeId=id(req.query.appointment);
    const own=await Appointment.findById(excludeId);
    if(!own) fail(404,'Appointment not found');
    if(!own.customer.equals(req.user._id)) fail(403,'Access denied');
    if(!own.barber.equals(barberId) || !own.service.equals(serviceId)) fail(400,'Appointment does not match this barber and service');
  }
  const result=await availability(barberId,serviceId,req.query.date,null,excludeId);
  res.json({times:result.times,durationMinutes:result.service.durationMinutes});
 });
 router.get('/barbers/:id/schedule',auth.authenticate,async(req,res)=>{
  const barber=await Barber.findById(id(req.params.id));
  if(!barber) fail(404,'Barber not found');
  if(req.user.role!=='admin' && !barber.user.equals(req.user._id)) fail(403,'Access denied');
  try{parseDate(req.query.date);}catch{fail(400,'Invalid date');}
  res.json(await Schedule.findOne({barber:barber._id,date:req.query.date}) || {date:req.query.date,closed:false,workingHours:{start:'09:00',end:'18:00'},blocked:[]});
 });
 router.put('/barbers/:id/schedule',auth.authenticate,async(req,res)=>{
  const barber=await Barber.findById(id(req.params.id));
  if(!barber) fail(404,'Barber not found');
  if(req.user.role!=='admin' && !(req.user.role==='barber' && barber.user.equals(req.user._id))) fail(403,'Access denied');
  const data={barber:barber._id,date:req.body.date,closed:req.body.closed,workingHours:req.body.workingHours,blocked:req.body.blocked};
  if(typeof data.closed!=='boolean' || !Array.isArray(data.blocked) || data.blocked.length>30) fail(400,'Invalid schedule');
  const candidate=new Schedule(data);
  await candidate.validate();
  res.json(await withBarberLock(barber._id,async(session)=>{
   const start=bookingInstant(data.date,'00:00'),end=new Date(start.getTime()+86400000);
   const bookings=await Appointment.find({barber:barber._id,status:'confirmed',startAt:{$lt:end},endAt:{$gt:start}}).session(session);
   const open=bookingInstant(data.date,candidate.workingHours.start),close=bookingInstant(data.date,candidate.workingHours.end);
   const blocks=candidate.blocked.map(b=>({start:bookingInstant(data.date,b.start),end:bookingInstant(data.date,b.end)}));
   if(bookings.some(a=>data.closed || a.startAt<open || a.endAt>close || blocks.some(b=>a.startAt<b.end && a.endAt>b.start))) fail(409,'Schedule conflicts with a confirmed appointment. Keep that time available.');
   return Schedule.findOneAndUpdate({barber:barber._id,date:data.date},{$set:data},{session,upsert:true,returnDocument:'after',runValidators:true});
  }));
 });
 router.use('/admin',auth.authenticate,auth.role('admin'));
 router.get('/admin/services',async(req,res)=>res.json(await Service.find().sort({name:1})));
 router.post('/admin/services',async(req,res)=>{
  const service=new Service({name:string(req.body.name,'service name'),description:req.body.description,durationMinutes:req.body.durationMinutes});
  await service.save(); res.status(201).json(service);
 });
 router.put('/admin/services/:id',async(req,res)=>{
  const service=await Service.findById(id(req.params.id)); if(!service) fail(404,'Service not found');
  service.name=string(req.body.name,'service name');service.description=req.body.description || '';
  service.durationMinutes=req.body.durationMinutes;
  if(req.body.active!==undefined) {if(typeof req.body.active!=='boolean') fail(400,'Invalid active flag');service.active=req.body.active;}
  await service.save();res.json(service);
 });
 router.delete('/admin/services/:id',async(req,res)=>{
  const serviceId=id(req.params.id);
  const session=await mongoose.startSession();
  try {await session.withTransaction(async()=>{
    const service=await Service.findOneAndUpdate({_id:serviceId},{$inc:{bookingRevision:1}},{session});
    if(!service) fail(404,'Service not found');
    if(await Appointment.exists({service:serviceId,status:'confirmed',endAt:{$gt:new Date()}}).session(session)) fail(409,'Service has upcoming bookings. Deactivate it instead.');
    await Service.deleteOne({_id:serviceId},{session});
    await Barber.updateMany({services:serviceId},{$pull:{services:serviceId}},{session});
  });} finally {await session.endSession();}
  res.json({message:'Service deleted'});
 });
 router.put('/admin/barbers/:id/services',async(req,res)=>{
  if(!Array.isArray(req.body.services) || req.body.services.length>30) fail(400,'Invalid services');
  const ids=[...new Set(req.body.services.map(id))];
  if(await Service.countDocuments({_id:{$in:ids},active:true})!==ids.length) fail(400,'Unknown service');
  const barber=await Barber.findByIdAndUpdate(id(req.params.id),{services:ids},{returnDocument:'after'});
  if(!barber) fail(404,'Barber not found');res.json(barber);
 });
 return router;
}
module.exports={catalogRoutes};
