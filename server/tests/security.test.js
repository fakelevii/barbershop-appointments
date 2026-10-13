const test=require('node:test');
const assert=require('node:assert/strict');
let security={};
try { security=require('../auth/security'); } catch(e) { if(e.code!=='MODULE_NOT_FOUND') throw e; }
test('password hash verifies only correct password',async()=>{
 assert.equal(typeof security.hashPassword,'function');
 const hash=await security.hashPassword('ExamplePassword123!');
 assert.notEqual(hash,'ExamplePassword123!');
 assert.equal(await security.verifyPassword('ExamplePassword123!',hash),true);
 assert.equal(await security.verifyPassword('wrong',hash),false);
});
test('signed JWT rejects tampering and expires',()=>{
 assert.equal(typeof security.issueToken,'function');
 const token=security.issueToken({_id:'507f1f77bcf86cd799439011',tokenVersion:2},'a'.repeat(48));
 assert.equal(security.readToken(token,'a'.repeat(48)).version,2);
 assert.throws(()=>security.readToken(token+'x','a'.repeat(48)));
 assert.throws(()=>security.readToken(token,'b'.repeat(48)));
});
test('JWT rejects short or unset secrets',()=>{
 assert.equal(typeof security.issueToken,'function');
 assert.throws(()=>security.issueToken({_id:'x'},'short'),/secret/i);
});

test('expired JWT is rejected',()=>{
 const jwt=require('jsonwebtoken');const token=jwt.sign({version:0},'a'.repeat(48),{subject:'507f1f77bcf86cd799439011',issuer:'barbershop',audience:'barbershop-web',expiresIn:-1});
 assert.throws(()=>security.readToken(token,'a'.repeat(48)),e=>e.name==='TokenExpiredError');
});
