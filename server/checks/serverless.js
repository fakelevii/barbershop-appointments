require('dotenv').config({ quiet: true });
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const mongoose = require('mongoose');

test('Vercel handler connects on cold start and preserves secure login across warm requests', async t => {
  const dbName = 'barbershop_test_' + Date.now() + process.pid;
  const uri = new URL(process.env.MONGODB_URI);
  uri.pathname = '/' + dbName;
  process.env.MONGODB_URI = uri.toString();
  process.env.JWT_SECRET = 'a'.repeat(48);
  process.env.NODE_ENV = 'production';
  process.env.CLIENT_ORIGIN = 'https://shop.example';
  t.after(async () => {
    if (mongoose.connection.readyState) {
      assert.equal(mongoose.connection.name, dbName);
      assert.match(dbName, /^barbershop_test_\d+$/);
      await mongoose.connection.dropDatabase();
    }
    await mongoose.disconnect();
  });
  const handler = require('../api/handler');
  const server = http.createServer(handler).listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  t.after(() => new Promise(r => server.close(r)));
  const base = 'http://127.0.0.1:' + server.address().port;
  const health = await Promise.all([fetch(base + '/api/health'), fetch(base + '/api/health')]);
  for (const response of health) assert.deepEqual(await response.json(), { status: 'ok', database: 'connected' });
  const registration = await fetch(base + '/api/auth/register', {
    method: 'POST', headers: { Origin: 'https://shop.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Deployment Test', email: 'deploy@example.com', password: 'ExamplePassword123!' })
  });
  assert.equal(registration.status, 201);
  const cookie = registration.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /Secure/); assert.match(cookie, /SameSite=Strict/);
  assert.match(registration.headers.get('cache-control'), /no-store/);
  const session = cookie.split(';')[0];
  const me = await fetch(base + '/api/me', { headers: { Cookie: session } });
  assert.equal(me.status, 200); assert.equal((await me.json()).email, 'deploy@example.com');
  const logout = await fetch(base + '/api/auth/logout', { method: 'POST', headers: { Origin: 'https://shop.example', Cookie: session } });
  assert.equal(logout.status, 200);
  assert.equal((await fetch(base + '/api/me', { headers: { Cookie: session } })).status, 401);
});
