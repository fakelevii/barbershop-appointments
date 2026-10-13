require('dotenv').config({quiet:true});
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { createApp } = require('../app');
const { issueToken } = require('../auth/security');
const User = require('../models/User');
const Barber = require('../models/Barber');
const Service = require('../models/Service');
const Schedule = require('../models/Schedule');
const Appointment = require('../models/Appointment');

test('barber approval rescheduling flow', async t => {
  const dbName = 'barbershop_test_' + Date.now() + process.pid;
  await mongoose.connect(process.env.MONGODB_URI, {dbName, serverSelectionTimeoutMS:5000});
  t.after(async () => {
    assert.equal(mongoose.connection.name, dbName);
    assert.match(dbName, /^barbershop_test_\d+$/);
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  await Promise.all([User, Barber, Service, Schedule, Appointment].map(m => m.init()));
  const secret = 'a'.repeat(48);
  const server = createApp({jwtSecret:secret}).listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  t.after(() => new Promise(r => server.close(r)));
  const customer = await User.create({name:'Customer',email:'customer@example.com',passwordHash:'test-only'});
  const other = await User.create({name:'Other',email:'other@example.com',passwordHash:'test-only'});
  const admin = await User.create({name:'Admin',email:'admin@example.com',passwordHash:'test-only',role:'admin'});
  const customerCookie = 'session=' + issueToken(customer, secret);
  const otherCookie = 'session=' + issueToken(other, secret);
  const adminCookie = 'session=' + issueToken(admin, secret);
  const date = '2030-01-07';
  let n = 0;
  const call = async (path, method='GET', body, cookie=customerCookie) => {
    const r = await fetch('http://127.0.0.1:'+server.address().port+'/api'+path, {
      method, headers:{Cookie:cookie,'Content-Type':'application/json'},
      ...(body ? {body:JSON.stringify(body)} : {})
    });
    return {status:r.status,data:await r.json()};
  };
  async function fixture() {
    const number = ++n;
    const service = await Service.create({name:'Haircut '+number,durationMinutes:30});
    const staff = await User.create({name:'Barber '+number,email:'barber'+number+'@example.com',passwordHash:'test-only',role:'barber'});
    const barber = await Barber.create({user:staff._id,services:[service._id]});
    const payload = {barber:String(barber._id),service:String(service._id),date,time:'09:00'};
    const booking = await call('/appointments','POST',payload);
    assert.equal(booking.status,201);
    const base = '/appointments/'+booking.data._id;
    return {barber,service,payload,base,booking:booking.data,staffCookie:'session='+issueToken(staff,secret)};
  }
  const request = f => call(f.base+'/reschedule','PATCH',{date,time:'10:00'});
  const decision = (f,r,action,cookie=f.staffCookie) => call(f.base+'/reschedule/'+r.data.rescheduleRequest._id,'PATCH',{action},cookie);

  await t.test('request keeps original time and leaves requested time bookable',async()=>{
    const f=await fixture(),r=await request(f);
    assert.equal(r.status,200);
    assert.equal(r.data.startAt,date+'T01:00:00.000Z');
    assert.equal(r.data.status,'confirmed');
    assert.equal(r.data.rescheduleRequest.status,'pending');
    const starts=await call('/barbers/'+f.barber._id+'/availability?service='+f.service._id+'&date='+date);
    assert.ok(!starts.data.times.includes('09:00'));
    assert.ok(starts.data.times.includes('10:00'));
    assert.equal((await request(f)).status,409);
  });
  await t.test('only assigned barber approves and original slot is released after approval',async()=>{
    const f=await fixture(),foreign=await fixture(),r=await request(f);
    assert.ok(r.data.rescheduleRequest);
    for(const cookie of [customerCookie,otherCookie,adminCookie,foreign.staffCookie]) {
      assert.equal((await decision(f,r,'approve',cookie)).status,403);
    }
    const approved=await decision(f,r,'approve');
    assert.equal(approved.status,200);
    assert.equal(approved.data.startAt,date+'T02:00:00.000Z');
    assert.equal(approved.data.rescheduleRequest.status,'approved');
    assert.equal((await decision(f,r,'approve')).status,409);
    assert.equal((await call('/appointments','POST',f.payload,otherCookie)).status,201);
  });
  await t.test('decline and withdrawal preserve original booking; stale request ID is rejected',async()=>{
    const f=await fixture(),r=await request(f);
    assert.ok(r.data.rescheduleRequest);
    const declined=await decision(f,r,'decline');
    assert.equal(declined.status,200);
    assert.equal(declined.data.startAt,date+'T01:00:00.000Z');
    assert.equal(declined.data.rescheduleRequest.status,'declined');
    const newer=await request(f);
    assert.equal((await decision(f,r,'approve')).status,409);
    assert.equal((await decision(f,newer,'withdraw',otherCookie)).status,403);
    const withdrawn=await decision(f,newer,'withdraw',customerCookie);
    assert.equal(withdrawn.status,200);
    assert.equal(withdrawn.data.rescheduleRequest.status,'withdrawn');
    assert.equal(withdrawn.data.startAt,date+'T01:00:00.000Z');
  });
  await t.test('occupied requested slot prevents approval without losing original',async()=>{
    const f=await fixture(),r=await request(f);
    assert.ok(r.data.rescheduleRequest);
    assert.equal((await call('/appointments','POST',{...f.payload,time:'10:00'},otherCookie)).status,201);
    assert.equal((await decision(f,r,'approve')).status,409);
    const current=await call(f.base);
    assert.equal(current.data.startAt,date+'T01:00:00.000Z');
    assert.equal(current.data.rescheduleRequest.status,'pending');
    assert.equal((await decision(f,r,'decline')).status,200);
  });
  await t.test('time off added after request prevents approval',async()=>{
    const f=await fixture(),r=await request(f);
    assert.ok(r.data.rescheduleRequest);
    const block=await call('/barbers/'+f.barber._id+'/schedule','PUT',{date,closed:false,workingHours:{start:'09:00',end:'18:00'},blocked:[{start:'10:00',end:'11:00'}]},f.staffCookie);
    assert.equal(block.status,200);
    assert.equal((await decision(f,r,'approve')).status,409);
  });
  await t.test('two pending requests may target the same time but only one approval succeeds',async()=>{
    const f=await fixture();
    const second=await call('/appointments','POST',{...f.payload,time:'11:00'},otherCookie);
    assert.equal(second.status,201);
    const r=await request(f);
    const secondBase='/appointments/'+second.data._id;
    const otherRequest=await call(secondBase+'/reschedule','PATCH',{date,time:'10:00'},otherCookie);
    assert.ok(r.data.rescheduleRequest);
    assert.equal(otherRequest.status,200);
    const results=await Promise.all([decision(f,r,'approve'),call(secondBase+'/reschedule/'+otherRequest.data.rescheduleRequest._id,'PATCH',{action:'approve'},f.staffCookie)]);
    assert.deepEqual(results.map(x=>x.status).sort(),[200,409]);
  });
  await t.test('cancellation invalidates pending request',async()=>{
    const f=await fixture(),r=await request(f);
    assert.ok(r.data.rescheduleRequest);
    const cancelled=await call(f.base+'/status','PATCH',{status:'cancelled'});
    assert.equal(cancelled.status,200);
    assert.equal(cancelled.data.rescheduleRequest.status,'cancelled');
    assert.equal((await decision(f,r,'approve')).status,409);
  });
  await t.test('same-time and foreign-customer requests are rejected',async()=>{
    const f=await fixture();
    assert.equal((await call(f.base+'/reschedule','PATCH',{date,time:'09:00'})).status,400);
    assert.equal((await call(f.base+'/reschedule','PATCH',{date,time:'10:00'},otherCookie)).status,404);
  });
});
