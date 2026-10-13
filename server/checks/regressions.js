require('dotenv').config({quiet:true});
const test=require('node:test'),assert=require('node:assert/strict'),mongoose=require('mongoose');
const {createApp}=require('../app');
const User=require('../models/User'),Barber=require('../models/Barber'),Service=require('../models/Service'),Schedule=require('../models/Schedule'),Appointment=require('../models/Appointment');
const {issueToken}=require('../auth/security');
test('review regression checks',async(t)=>{
 const dbName='barbershop_test_'+Date.now();
 await mongoose.connect(process.env.MONGODB_URI,{dbName,serverSelectionTimeoutMS:5000});
 t.after(async()=>{assert.equal(mongoose.connection.name,dbName);assert.match(dbName,/^barbershop_test_\d+$/);await mongoose.connection.dropDatabase();await mongoose.disconnect();});
 await Promise.all([User,Barber,Service,Schedule,Appointment].map(m=>m.init()));
 const secret='a'.repeat(48),server=createApp({jwtSecret:secret}).listen(0,'127.0.0.1');
 await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
 const user=await User.create({name:'Customer',email:'customer@example.com',passwordHash:'test-only'});
 const admin=await User.create({name:'Admin',email:'admin@example.com',passwordHash:'test-only',role:'admin'});
 const customerCookie='session='+issueToken(user,secret),adminCookie='session='+issueToken(admin,secret);
 const call=async(path,method='GET',body,cookie=customerCookie)=>{
  const r=await fetch('http://127.0.0.1:'+server.address().port+'/api'+path,{method,headers:{Cookie:cookie,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  return {status:r.status,data:await r.json()};
 };
 const date='2030-01-07';let n=0;
 async function fixture(){
  const index=++n;
  const service=await Service.create({name:'Haircut '+index,durationMinutes:30});
  const barberUser=await User.create({name:'Barber '+index,email:'barber'+index+'@example.com',passwordHash:'test-only',role:'barber'});
  const barber=await Barber.create({user:barberUser._id,services:[service._id]});
  return {service,barber,payload:{barber:String(barber._id),service:String(service._id),date,time:'09:00'}};
 }
 await t.test('reschedule availability excludes own reservation and checks ownership',async()=>{
  const f=await fixture(),booking=await call('/appointments','POST',f.payload);
  assert.equal(booking.status,201);
  const path='/barbers/'+f.barber._id+'/availability?date='+date+'&service='+f.service._id+'&appointment='+booking.data._id;
  const available=await call(path);
  assert.equal(available.status,200);assert.ok(available.data.times.includes('09:15'));
  const foreign=await call(path,'GET',null,adminCookie);assert.equal(foreign.status,403);
 });
 await t.test('reschedule preserves booked duration and name after catalog edit',async()=>{
  const f=await fixture(),booking=await call('/appointments','POST',f.payload);
  assert.equal(booking.status,201);
  await call('/admin/services/'+f.service._id,'PUT',{name:'Long haircut',durationMinutes:90},adminCookie);
  const result=await call('/appointments/'+booking.data._id+'/reschedule','PATCH',{date,time:'10:30'});
  assert.equal(result.status,200);assert.equal(result.data.durationMinutes,30);assert.equal(result.data.serviceName,f.service.name);
 });
 await t.test('existing appointment may reschedule after service deactivation and unassignment',async()=>{
  const f=await fixture(),booking=await call('/appointments','POST',f.payload);
  await call('/admin/services/'+f.service._id,'PUT',{name:f.service.name,durationMinutes:30,active:false},adminCookie);
  await call('/admin/barbers/'+f.barber._id+'/services','PUT',{services:[]},adminCookie);
  const result=await call('/appointments/'+booking.data._id+'/reschedule','PATCH',{date,time:'10:00'});
  assert.equal(result.status,200);
  const detail=await call('/appointments/'+booking.data._id);assert.equal(detail.status,200);assert.equal(detail.data.durationMinutes,30);
 });
 await t.test('barber cannot expand shop hours through API',async()=>{
  const f=await fixture();
  const result=await call('/barbers/'+f.barber._id+'/schedule','PUT',{date,closed:false,workingHours:{start:'06:00',end:'22:00'},blocked:[]},adminCookie);
  assert.equal(result.status,400);
 });
 await t.test('service deletion and booking cannot both succeed',async()=>{
  for(let i=0;i<8;i++){
   const f=await fixture();
   const [booking,deletion]=await Promise.all([call('/appointments','POST',f.payload),call('/admin/services/'+f.service._id,'DELETE',null,adminCookie)]);
   assert.ok(!(booking.status===201 && deletion.status===200),'Concurrent deletion must not orphan a new booking');
   const exists=await Service.exists({_id:f.service._id});
   if(booking.status===201)assert.ok(exists);
  }
 });
});
