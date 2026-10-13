const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

test('auto-detected Vercel app entry is callable and validates configuration before serving requests', async t => {
  const handler = require('../app');
  assert.equal(typeof handler, 'function', 'Vercel requires a function or server as the default export');
  assert.equal(typeof handler.createApp, 'function', 'Local startup retains access to the app factory');

  const oldNodeEnv = process.env.NODE_ENV;
  t.after(() => {
    if (oldNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = oldNodeEnv;
  });
  process.env.NODE_ENV = 'development';
  const server = http.createServer(handler).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/health`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    message: 'API unavailable. Check the deployment environment and database access.'
  });
});
