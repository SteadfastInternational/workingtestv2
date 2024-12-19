const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware'); // Auth middleware to protect routes

// Routes for authentication and password management

// Signup route
router.post('/signup', authController.signup);

// Login route
router.post('/login', authController.login);

// Forgot Password route
router.post('/forgot-password', protect, authController.forgotPassword);

// Reset Password route
router.patch('/reset-password/:resetToken', authController.resetPassword);

module.exports = router;
