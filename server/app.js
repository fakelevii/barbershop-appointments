const express=require('express');
const cors=require('cors');
const mongoose=require('mongoose');
const {authTools}=require('./auth/routes');
const {appointmentRoutes}=require('./routes/appointments');
const {catalogRoutes}=require('./routes/catalog');
const {string}=require('./lib/http');
function createApp({jwtSecret=process.env.JWT_SECRET,clientOrigin=process.env.CLIENT_ORIGIN || 'http://localhost:5173',production=process.env.NODE_ENV==='production'}={}) {
 const app=express();
 app.disable('x-powered-by');
 const allowedOrigins=new Set([clientOrigin]);
 if(!production) {
  const configured=new URL(clientOrigin);
  if(configured.protocol==='http:' && ['localhost','127.0.0.1'].includes(configured.hostname)) {
   configured.hostname=configured.hostname==='localhost'?'127.0.0.1':'localhost';
   allowedOrigins.add(configured.origin);
  }
 }
 app.use(cors({origin:(origin,callback)=>callback(null,!origin || allowedOrigins.has(origin)),credentials:true}));
 app.use((req,res,next)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','same-origin');
  if(!['GET','HEAD','OPTIONS'].includes(req.method) && req.headers.origin && !allowedOrigins.has(req.headers.origin)) return res.status(403).json({message:'Origin not allowed'});
  next();
 });
 app.use(express.json({limit:'16kb'}));
 const attempts=new Map();
 app.use('/api/auth',(req,res,next)=>{
  const key=req.ip,now=Date.now();
  const entry=attempts.get(key);
  if(!entry || entry.until<=now) attempts.set(key,{count:1,until:now+60000});
  else if(++entry.count>20) return res.status(429).json({message:'Too many attempts. Try again in a minute.'});
  if(attempts.size>10000) for(const [ip,e] of attempts) if(e.until<now) attempts.delete(ip);
  next();
 });
 const auth=authTools(jwtSecret);
 app.get('/api/health',(req,res)=>res.json({status:'ok',database:mongoose.connection.readyState===1?'connected':'disconnected'}));
 app.use('/api/auth',auth.router);
 app.get('/api/me',auth.authenticate,(req,res)=>res.json(auth.publicUser(req.user)));
 app.patch('/api/me',auth.authenticate,async(req,res)=>{req.user.name=string(req.body.name,'name');await req.user.save();res.json(auth.publicUser(req.user));});
 app.use('/api/appointments',appointmentRoutes(auth));
 app.use('/api',catalogRoutes(auth));
 app.use((req,res)=>res.status(404).json({message:'Not found'}));
 app.use((error,req,res,next)=>{
  if(res.headersSent) return next(error);
  if(error.code===11000) return res.status(409).json({message:'This record already exists'});
  if(error.name==='ValidationError' || error.name==='CastError' || error.type==='entity.parse.failed') return res.status(400).json({message:'Please check the submitted values'});
  if(error.code===20) return res.status(503).json({message:'Booking requires MongoDB Atlas or a replica set'});
  res.status(error.status || 500).json({message:error.status?error.message:'Unable to complete request. Please try again.'});
 });
 return app;
}
module.exports={createApp};
