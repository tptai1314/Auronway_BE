const express = require('express');
const router = express.Router();
const controller = require('./xp.controller');

// TODO: define xp endpoints
router.get('/_health', (_req, res) => res.json({ module: 'xp', ok: true }));

module.exports = router;
