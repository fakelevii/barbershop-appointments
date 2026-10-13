require('dotenv').config({quiet:true});
const assert=require('node:assert/strict');
const catalog=require('../config/catalog');
async function call(path,method='GET',body,cookie){
 const response=await fetch('http://localhost:5173/api'+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
 return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
async function main(){
 const barbers=await call('/barbers');assert.equal(barbers.status,200);assert.equal(barbers.data.length,4);
 for(const expected of catalog.barbers){
  const actual=barbers.data.find(b=>b.user.name===expected.name);assert.ok(actual);
  assert.deepEqual(actual.services.map(s=>s.name).sort(),[...expected.services].sort());
  const login=await call('/auth/login','POST',{email:expected.email,password:process.env.BARBER_PASSWORD});
  assert.equal(login.status,200);assert.equal(login.data.role,'barber');
  assert.equal((await call('/me','GET',null,login.cookie)).status,200);
  assert.equal((await call('/admin/services','GET',null,login.cookie)).status,403);
 }
 const admin=await call('/auth/login','POST',{email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD});
 assert.equal(admin.status,200);assert.equal(admin.data.role,'admin');
 assert.equal((await call('/admin/services','GET',null,admin.cookie)).status,200);
 console.log('Live frontend proxy, seeded offerings, four barber logins, admin login and role restrictions verified.');
}
main().catch(error=>{console.error('Live smoke check failed ('+error.name+').');process.exitCode=1;});
