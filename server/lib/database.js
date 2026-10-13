const mongoose = require('mongoose');
const models = ['User', 'Service', 'Barber', 'Schedule', 'Appointment'].map(name => require('../models/' + name));
let pending;
let initialized = false;

async function connectDatabase() {
  if (pending) return pending;
  if (mongoose.connection.readyState === 1 && initialized) return mongoose;
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  pending = (async () => {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000, maxPoolSize: 10,
      autoCreate: false, autoIndex: false
    });
    // Unlike Model.init(), these idempotent operations do not cache a failed promise.
    await Promise.all(models.map(async model => {
      await model.createCollection();
      await model.createIndexes();
    }));
    initialized = true;
    return mongoose;
  })();
  try { return await pending; }
  finally { pending = undefined; }
}
module.exports = { connectDatabase };
