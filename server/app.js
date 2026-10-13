const express = require('express');
const { createHandler } = require('./lib/vercel-handler');
const { createApp } = require('./app-factory');

// Vercel's Express entry point must export an app, not an app factory.
const app = express();
app.disable('x-powered-by');
app.use(createHandler());
module.exports = app;
// Preserve the factory interface used by local startup and existing tests.
module.exports.createApp = createApp;
