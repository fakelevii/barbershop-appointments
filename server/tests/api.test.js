const test=require('node:test');
const assert=require('node:assert/strict');
let createApp;
try { ({createApp}=require('../app')); } catch(e) { if(e.code!=='MODULE_NOT_FOUND') throw e; }
test('API rejects anonymous access and invalid registration before touching database',async(t)=>{
 assert.equal(typeof createApp,'function','Application factory must exist');
 const server=createApp({jwtSecret:'a'.repeat(48)}).listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base='http://127.0.0.1:'+server.address().port;
 const health=await fetch(base+'/api/health');
 assert.equal(health.status,200);
 for(const path of ['/api/me','/api/appointments','/api/admin/services']) {
   const result=await fetch(base+path);
   assert.equal(result.status,401);
 }
 const invalid=await fetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Test',email:'bad',password:'short',role:'admin'})});
 assert.equal(invalid.status,400);
 const missing=await fetch(base+'/api/missing');
 assert.equal(missing.status,404);
});

test('local development permits localhost and loopback on the configured port only',async(t)=>{
 const server=createApp({jwtSecret:'a'.repeat(48)}).listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base='http://127.0.0.1:'+server.address().port;
 for(const origin of ['http://localhost:5173','http://127.0.0.1:5173']){
  const result=await fetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({name:'Test',email:'invalid',password:'short'})});
  assert.equal(result.status,400,'Trusted frontend should reach form validation: '+origin);
  assert.equal(result.headers.get('access-control-allow-origin'),origin);
 }
 for(const origin of ['https://evil.example','http://localhost:5174','http://localhost.evil.example:5173']){
  const result=await fetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:'{}'});
  assert.equal(result.status,403);
 }
});
test('production accepts only the configured origin',async(t)=>{
 const server=createApp({jwtSecret:'a'.repeat(48),production:true}).listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const result=await fetch('http://127.0.0.1:'+server.address().port+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://127.0.0.1:5173'},body:'{}'});
 assert.equal(result.status,403);
});
