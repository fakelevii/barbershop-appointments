const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

test('serverless entry fails safely without configuration and recovers for later requests', async t => {
  let createHandler;
  try { ({ createHandler } = require('../lib/vercel-handler')); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
  assert.equal(typeof createHandler, 'function');
  const oldNODE_ENV=process.env.NODE_ENV;
  t.after(()=>{if(oldNODE_ENV===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=oldNODE_ENV;});
  process.env.NODE_ENV='production';
  const oldJWT_SECRET=process.env.JWT_SECRET;
  t.after(()=>{if(oldJWT_SECRET===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=oldJWT_SECRET;});
  process.env.JWT_SECRET='a'.repeat(48);
  const oldCLIENT_ORIGIN=process.env.CLIENT_ORIGIN;
  t.after(()=>{if(oldCLIENT_ORIGIN===undefined)delete process.env.CLIENT_ORIGIN;else process.env.CLIENT_ORIGIN=oldCLIENT_ORIGIN;});
  process.env.CLIENT_ORIGIN='https://shop.example';
  let unavailable = true;
  const handler = createHandler({ connect: async () => { if (unavailable) throw new Error('mongodb://secret'); } });
  const server = http.createServer(handler).listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  t.after(() => new Promise(r => server.close(r)));
  const base = 'http://127.0.0.1:' + server.address().port;
  process.env.NODE_ENV = 'development';
  unavailable = false;
  assert.equal((await fetch(base + '/api/health')).status, 503, 'Never deploy with insecure development cookies');
  process.env.NODE_ENV = 'production';
  unavailable = true;
  const failed = await fetch(base + '/api/health');
  assert.equal(failed.status, 503);
  assert.ok(!(await failed.text()).includes('secret'));
  unavailable = false;
  const healthy = await fetch(base + '/api/health');
  assert.equal(healthy.status, 200);
  assert.match(healthy.headers.get('cache-control'), /no-store/);
  const invalid = await fetch(base + '/api/auth/register', { method: 'POST', headers: { Origin: 'https://shop.example', 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(invalid.status, 400);
  const blocked = await fetch(base + '/api/auth/register', { method: 'POST', headers: { Origin: 'https://other.example', 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(blocked.status, 403);
  assert.equal((await fetch(base + '/api/appointments?page=2')).status, 401);
  const oldVercel = process.env.VERCEL;
  t.after(() => { if (oldVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = oldVercel; });
  process.env.VERCEL = '1';
  const attempt = ip => fetch(base + '/api/auth/login', {
    method: 'POST', headers: { Origin: 'https://shop.example', 'Content-Type': 'application/json', 'x-real-ip': ip }, body: '{}'
  });
  for (let i = 0; i < 20; i++) assert.equal((await attempt('192.0.2.1')).status, 400);
  assert.equal((await attempt('192.0.2.1')).status, 429);
  assert.equal((await attempt('192.0.2.2')).status, 400, 'A separate client must not share the proxy limiter bucket');
});
