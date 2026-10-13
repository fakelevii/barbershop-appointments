require('dotenv').config({quiet:true});
const mongoose=require('mongoose');
const User=require('../models/User');
const Service=require('../models/Service');
const Barber=require('../models/Barber');
const {hashPassword}=require('../auth/security');
const {password,email}=require('../lib/http');
const catalog=require('../config/catalog');
async function seed() {
 try {
  const adminEmail=email(process.env.ADMIN_EMAIL);
  password(process.env.ADMIN_PASSWORD);password(process.env.BARBER_PASSWORD);
  await mongoose.connect(process.env.MONGODB_URI,{serverSelectionTimeoutMS:5000});
  await Promise.all([User.init(),Service.init(),Barber.init()]);
  const ids={};
  for(const data of catalog.services) {
   let service=await Service.findOne({name:data.name});
   if(!service) service=await Service.create(data);
   ids[data.name]=service._id;
  }
  const accounts=[{name:'Shop Administrator',email:adminEmail,role:'admin',password:process.env.ADMIN_PASSWORD},...catalog.barbers.map(b=>({...b,role:'barber',password:process.env.BARBER_PASSWORD}))];
  for(const account of accounts) {
   let user=await User.findOne({email:account.email});
   if(user && user.role!==account.role) throw new Error('Existing account role conflict');
   if(!user) user=await User.create({name:account.name,email:account.email,role:account.role,passwordHash:await hashPassword(account.password)});
   if(account.role==='barber' && !await Barber.exists({user:user._id})) await Barber.create({user:user._id,services:account.services.map(name=>ids[name])});
  }
  console.log('Seed complete: four barbers, four services, and an administrator. Existing accounts were preserved.');
 } catch(error) {
  console.error('Seed failed ('+error.name+'). Check connection and local ADMIN_EMAIL, ADMIN_PASSWORD, BARBER_PASSWORD settings.');
  process.exitCode=1;
 } finally {await mongoose.disconnect();}
}
seed();
