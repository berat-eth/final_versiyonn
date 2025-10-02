const express = require('express');

// Minimal admin server placeholder
// This keeps server startup clean even if real admin routes are not implemented yet.
const adminApp = express.Router ? express.Router() : express();

// Basic health endpoint for admin API
adminApp.get('/api/admin/health', (req, res) => {
  res.json({ success: true, status: 'ok' });
});

module.exports = adminApp;


