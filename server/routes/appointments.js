const express=require('express');
const Appointment=require('../models/Appointment');
const Barber=require('../models/Barber');
const { book,withBarberLock }=require('../domain/booking');
const { requestReschedule,decideReschedule }=require('../domain/rescheduling');
const { fail,id,pagination,literalSearch }=require('../lib/http');
function appointmentRoutes(auth) {
 const router=express.Router();
 router.use(auth.authenticate);
 router.get('/',async(req,res)=>{
  const {page,limit,skip}=pagination(req.query);
  const query={};
  if(req.user.role==='customer') query.customer=req.user._id;
  if(req.user.role==='barber') { const barber=await Barber.findOne({user:req.user._id}); if(!barber) fail(404,'Barber not found'); query.barber=barber._id; }
  if(req.query.status) { if(!['confirmed','completed','cancelled','no-show'].includes(req.query.status)) fail(400,'Invalid status'); query.status=req.query.status; }
  if(req.query.search) query.serviceName={$regex:literalSearch(req.query.search),$options:'i'};
  const [items,total]=await Promise.all([Appointment.find(query).populate('customer','name email').populate({path:'barber',populate:{path:'user',select:'name'}}).sort({startAt:-1}).skip(skip).limit(limit),Appointment.countDocuments(query)]);
  const base={...query}; delete base.status; delete base.serviceName;
  const statuses=await Appointment.aggregate([{$match:base},{$group:{_id:'$status',count:{$sum:1}}}]);
  res.json({items,total,page,pages:Math.ceil(total/limit),counts:Object.fromEntries(statuses.map(s=>[s._id,s.count]))});
 });
 router.get('/:id',async(req,res)=>{
  const appointment=await Appointment.findById(id(req.params.id));
  if(!appointment) fail(404,'Appointment not found');
  const ownBarber=req.user.role==='barber'?await Barber.findOne({user:req.user._id}):null;
  if(req.user.role==='customer' && !appointment.customer.equals(req.user._id)) fail(403,'Access denied');
  if(req.user.role==='barber' && !appointment.barber.equals(ownBarber?._id)) fail(403,'Access denied');
  res.json(appointment);
 });
 router.post('/',auth.role('customer'),async(req,res)=>{
  const result=await book({customer:req.user._id,barber:id(req.body.barber),service:id(req.body.service),date:req.body.date,time:req.body.time});
  res.status(201).json(result);
 });
 router.patch('/:id/reschedule',auth.role('customer'),async(req,res)=>{
  const existing=await Appointment.findOne({_id:id(req.params.id),customer:req.user._id});
  if(!existing) fail(404,'Appointment not found');
  res.json(await requestReschedule(existing,req.body.date,req.body.time));
 });
 router.patch('/:id/reschedule/:requestId',async(req,res)=>{
  const existing=await Appointment.findById(id(req.params.id));
  if(!existing) fail(404,'Appointment not found');
  res.json(await decideReschedule(existing,req.user,id(req.params.requestId),req.body.action));
 });
 router.patch('/:id/status',async(req,res)=>{
  const existing=await Appointment.findById(id(req.params.id));
  if(!existing) fail(404,'Appointment not found');
  const ownBarber=req.user.role==='barber' ? await Barber.findOne({user:req.user._id}) : null;
  if(req.user.role==='customer' && !existing.customer.equals(req.user._id)) fail(403,'Access denied');
  if(req.user.role==='barber' && !existing.barber.equals(ownBarber?._id)) fail(403,'Access denied');
  const next=req.body.status;
  if(req.user.role==='customer' && next!=='cancelled') fail(403,'Customers can only cancel appointments');
  if(!['cancelled','completed','no-show'].includes(next)) fail(400,'Invalid status');
  const updated=await withBarberLock(existing.barber,async(session)=>{
    const appointment=await Appointment.findById(existing._id).session(session);
    if(appointment.status!=='confirmed') fail(409,'Appointment already finalized');
    if(next==='cancelled' && appointment.startAt<=new Date()) fail(409,'Only upcoming appointments can be cancelled');
    if(next==='completed' && appointment.endAt>new Date()) fail(409,'Appointment has not ended yet');
    if(next==='no-show' && appointment.startAt>new Date()) fail(409,'Appointment has not started yet');
    appointment.status=next;
    if(appointment.rescheduleRequest?.status==='pending') {
      appointment.rescheduleRequest.status='cancelled';
      appointment.rescheduleRequest.resolvedAt=new Date();
    }
    await appointment.save({session});
    return appointment;
  });
  res.json(updated);
 });
 return router;
}
module.exports={appointmentRoutes};
