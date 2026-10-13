const test = require('node:test');
const assert = require('node:assert/strict');
const User=require('../models/User'),Service=require('../models/Service'),Barber=require('../models/Barber'),Appointment=require('../models/Appointment'),Schedule=require('../models/Schedule');
test('user normalizes email and forbids unsupported roles',async()=>{
 const user=new User({name:'John Doe',email:'JOHN@example.com',passwordHash:'stored-hash',role:'customer'});
 assert.equal(user.email,'john@example.com');await user.validate();
 user.role='superuser';await assert.rejects(user.validate(),e=>!!e.errors.role);
});
test('services reject unsupported appointment durations',async()=>{
 const service=new Service({name:'Haircut',durationMinutes:30});await service.validate();
 for(const duration of [0,16,-15]){service.durationMinutes=duration;await assert.rejects(service.validate(),e=>!!e.errors.durationMinutes);}
});
test('barber requires user reference',async()=>{await assert.rejects(new Barber({}).validate(),e=>!!e.errors.user);});
test('appointments reject inverted times and unrecognized status',async()=>{
 const id='507f1f77bcf86cd799439011';
 const booking=new Appointment({customer:id,barber:id,service:id,serviceName:'Haircut',durationMinutes:30,startAt:new Date('2030-01-07T01:00:00Z'),endAt:new Date('2030-01-07T01:30:00Z')});
 await booking.validate();booking.endAt=new Date('2030-01-07T00:00:00Z');
 await assert.rejects(booking.validate(),e=>!!e.errors.endAt);
 booking.status='pending';await assert.rejects(booking.validate(),e=>!!e.errors.status);
});
test('schedule rejects invalid dates and reversed blocks',async()=>{
 const schedule=new Schedule({barber:'507f1f77bcf86cd799439011',date:'2030-01-07',blocked:[{start:'14:00',end:'15:00'}]});
 await schedule.validate();schedule.date='2030-02-30';
 await assert.rejects(schedule.validate(),e=>!!e.errors.date);
 schedule.date='2030-01-07';schedule.blocked=[{start:'15:00',end:'14:00'}];
 await assert.rejects(schedule.validate());
});
