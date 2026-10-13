const { createApp } = require('../app');
const { connectDatabase } = require('./database');
const { isIP } = require('node:net');

function createHandler({ connect = connectDatabase } = {}) {
  let app;
  return async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    try {
      if (process.env.NODE_ENV !== 'production') throw new Error('NODE_ENV must be production');
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET is required');
      const origin = new URL(process.env.CLIENT_ORIGIN);
      if (origin.protocol !== 'https:' || origin.origin !== process.env.CLIENT_ORIGIN) throw new Error('CLIENT_ORIGIN must be an HTTPS origin');
      await connect();
      app ||= createApp({ production: true, clientIp: req => {
        // Only trust this header inside Vercel, whose edge replaces x-real-ip.
        // Local Express servers continue using the socket IP, never forwarded input.
        const value = req.headers['x-real-ip'];
        return process.env.VERCEL === '1' && typeof value === 'string' && isIP(value) ? value : req.ip;
      } });
    } catch {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: 'API unavailable. Check the deployment environment and database access.' }));
      return;
    }
    return app(req, res);
  };
}
module.exports = { createHandler };
