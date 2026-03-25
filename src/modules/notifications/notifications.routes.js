const express = require('express');
const router = express.Router();
const controller = require('./notifications.controller');

// TODO: define notifications endpoints
router.get('/_health', (_req, res) => res.json({ module: 'notifications', ok: true }));

module.exports = router;
