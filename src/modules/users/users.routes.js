const express = require('express');
const { authenticate } = require('../../middlewares/auth');
const { uploadAvatar: uploadMiddleware, handleUploadError } = require('../../middlewares/upload');
const { getMeProfile, updateMeProfile, getAvailableAvatars, uploadAvatar } = require('./users.controller');

const router = express.Router();

router.get('/me/profile', authenticate, getMeProfile);
router.put('/me/profile', authenticate, updateMeProfile);
router.get('/me/avatars', authenticate, getAvailableAvatars);

// Upload avatar - sử dụng multer middleware
router.post('/me/avatar', authenticate, uploadMiddleware, handleUploadError, uploadAvatar);

module.exports = router;
