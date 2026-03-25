const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authenticate } = require('../../middlewares/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.googleAuth);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.get('/me', authenticate, authController.getMe);
router.put('/profile', authenticate, authController.updateProfile);
router.post('/change-password', authenticate, authController.changePassword);
router.post('/logout', authenticate, authController.logout);

module.exports = router;