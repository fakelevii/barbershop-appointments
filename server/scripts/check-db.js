require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const timeout = setTimeout(() => {
  console.error('MongoDB check timed out. Check your connection and Atlas network access.');
  process.exit(1);
}, 10000);
async function main() {
  try {
    if (!process.env.MONGODB_URI) throw new Error('Missing MONGODB_URI');
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 });
    await mongoose.connection.db.command({ ping: 1 });
    console.log('MongoDB connection verified.');
  } catch (error) {
    // Never print a URI, password, or raw driver error.
    console.error('MongoDB check failed (' + error.name + '). Check MONGODB_URI and database network access.');
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
    await mongoose.disconnect();
  }
}
main();
