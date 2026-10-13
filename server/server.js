require('dotenv').config({quiet:true});
const mongoose=require('mongoose');
const {createApp}=require('./app');
const {connectDatabase}=require('./lib/database');
async function start() {
 if(!process.env.MONGODB_URI || !process.env.JWT_SECRET || process.env.JWT_SECRET.length<32) {
  console.error('Set MONGODB_URI and JWT_SECRET (at least 32 characters) in server/.env.');
  process.exitCode=1;return;
 }
 try {
  await connectDatabase();
  const server=createApp().listen(Number(process.env.PORT || 5000),()=>console.log('Barbershop API ready on port '+(process.env.PORT || 5000)));
  for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.close(async()=>{await mongoose.disconnect();process.exit(0);}));
 } catch(error) { console.error('Server startup failed ('+error.name+'). Check database access and configuration.');process.exitCode=1; }
}
start();
