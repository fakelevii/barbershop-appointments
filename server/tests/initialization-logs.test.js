const test = require('node:test');
const assert = require('node:assert/strict');
const { createHandler } = require('../lib/vercel-handler');

test('initialization diagnostics identify the failed stage without logging credentials', async t => {
  const keys = ['NODE_ENV', 'JWT_SECRET', 'CLIENT_ORIGIN', 'MONGODB_URI'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  t.after(() => {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });
  const logs = [];
  t.mock.method(console, 'error', (...args) => logs.push(args));
  process.env.NODE_ENV = 'production';
  process.env.JWT_SECRET = 'private-jwt-secret'.repeat(3);
  process.env.CLIENT_ORIGIN = 'https://shop.example';
  process.env.MONGODB_URI = 'mongodb://private-user:private-password@example.invalid/shop';
  let attempts = 0;
  const handler = createHandler({ connect: async () => {
    attempts++;
    const error = new Error(process.env.MONGODB_URI);
    error.name = 'MongoServerError';
    error.code = 18;
    throw error;
  } });
  const call = async () => {
    const response = { setHeader() {}, end(body) { this.body = body; } };
    await handler({ headers: {} }, response);
    assert.equal(response.statusCode, 503);
    assert.ok(!response.body.includes('private-'));
  };

  process.env.NODE_ENV = 'development';
  await call();
  assert.equal(logs.length, 1, 'A failed initialization must produce a diagnostic log');
  assert.equal(logs.at(-1)[1].stage, 'NODE_ENV');
  assert.equal(attempts, 0);
  process.env.NODE_ENV = 'production';
  const secret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'short';
  await call();
  assert.equal(logs.at(-1)[1].stage, 'JWT_SECRET');
  process.env.JWT_SECRET = secret;
  process.env.CLIENT_ORIGIN = 'https://shop.example/';
  await call();
  assert.equal(logs.at(-1)[1].stage, 'CLIENT_ORIGIN');
  process.env.CLIENT_ORIGIN = 'https://shop.example';
  await call();
  assert.equal(attempts, 1);
  assert.deepEqual(logs.at(-1), ['API initialization failed', {
    stage: 'database', errorName: 'MongoServerError', errorCode: 18, mongodbUriConfigured: true
  }]);
  const output = JSON.stringify(logs);
  assert.ok(!output.includes('private-'));
  assert.ok(!output.includes(process.env.MONGODB_URI));
});
