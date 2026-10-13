const { createApp } = require('../app-factory');
const { connectDatabase } = require('./database');
const { isIP } = require('node:net');

function createHandler({ connect = connectDatabase } = {}) {
  let app;
  return async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    let stage = 'NODE_ENV';
    try {
      if (process.env.NODE_ENV !== 'production') throw new Error('NODE_ENV must be production');
      stage = 'JWT_SECRET';
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET is required');
      stage = 'CLIENT_ORIGIN';
      const origin = new URL(process.env.CLIENT_ORIGIN);
      if (origin.protocol !== 'https:' || origin.origin !== process.env.CLIENT_ORIGIN) throw new Error('CLIENT_ORIGIN must be an HTTPS origin');
      stage = 'DATABASE';
      await connect();
      stage = 'APP_STARTUP';
      app ||= createApp({ production: true, clientIp: req => {
        // Only trust this header inside Vercel, whose edge replaces x-real-ip.
        // Local Express servers continue using the socket IP, never forwarded input.
        const value = req.headers['x-real-ip'];
        return process.env.VERCEL === '1' && typeof value === 'string' && isIP(value) ? value : req.ip;
      } });
    } catch (error) {
      // Never log messages, stacks, URIs, or environment values: driver errors can contain secrets.
      const category = error?.code === 18 ? 'AUTHENTICATION_FAILED'
        : error?.code === 13 ? 'DATABASE_PERMISSION_DENIED'
        : error?.code === 11000 ? 'DUPLICATE_INDEX_DATA'
        : error?.name === 'MongooseServerSelectionError' ? 'DATABASE_UNREACHABLE'
        : ['MongoParseError', 'MongoInvalidArgumentError'].includes(error?.name) ? 'INVALID_DATABASE_CONFIGURATION'
        : 'STARTUP_CHECK_FAILED';
      console.error('[startup]', JSON.stringify({ stage: error?.startupStage === 'DATABASE_CONNECT' || error?.startupStage === 'DATABASE_SETUP' ? error.startupStage : stage, category, mongodbUriConfigured: Boolean(process.env.MONGODB_URI) }));
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: 'API unavailable. Check the deployment environment and database access.' }));
      return;
    }
    return app(req, res);
  };
}
module.exports = { createHandler };
