const express = require('express');
const router = express.Router();
const controller = require('./certificates.controller');
const { authenticate } = require('../../middlewares/auth');

// Lấy danh sách certificate của user
router.get('/my', authenticate, controller.getMyCertificates);

// Lấy chi tiết certificate theo ID
router.get('/:id', authenticate, controller.getCertificateDetail);

module.exports = router;
