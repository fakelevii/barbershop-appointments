const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

test('database startup is shared across concurrent requests and retries after failure', async t => {
  let connectDatabase;
  try { ({ connectDatabase } = require('../lib/database')); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
  assert.equal(typeof connectDatabase, 'function');
  const oldMONGODB_URI=process.env.MONGODB_URI;
  t.after(()=>{if(oldMONGODB_URI===undefined)delete process.env.MONGODB_URI;else process.env.MONGODB_URI=oldMONGODB_URI;});
  process.env.MONGODB_URI='mongodb://example.invalid/test';
  let release, attempts = 0;
  t.mock.method(mongoose, 'connect', () => {
    attempts++;
    return new Promise(resolve => { release = resolve; });
  });
  let failIndex = false;
  for (const name of ['User', 'Service', 'Barber', 'Schedule', 'Appointment']) {
    const model = require('../models/' + name);
    // Mongoose's init() caches rejected promises. Runtime setup must use retryable operations.
    t.mock.method(model, 'init', () => Promise.reject(new Error('cached init failure')));
    t.mock.method(model, 'createCollection', async () => {});
    t.mock.method(model, 'createIndexes', async () => { if (failIndex) throw new Error('index unavailable'); });
  }
  const first = connectDatabase(), second = connectDatabase();
  assert.equal(attempts, 1);
  release(mongoose);
  await Promise.all([first, second]);
  // A disconnected instance must reconnect; a failed connection must not poison the cache.
  mongoose.connect.mock.mockImplementation(async () => { throw new Error('unavailable'); });
  await assert.rejects(connectDatabase(), /unavailable/);
  mongoose.connect.mock.mockImplementation(async () => mongoose);
  failIndex = true;
  await assert.rejects(connectDatabase(), /index unavailable/);
  failIndex = false;
  await connectDatabase();
});
