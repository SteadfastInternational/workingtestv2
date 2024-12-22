const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware'); // Auth middleware to protect routes
const { getAllUsers } = require('../controllers/authController');  // Import the function to get all users

// Routes for authentication and password management

// Signup route
router.post('/signup', authController.signup);

// Login route
router.post('/login', authController.login);

// Forgot Password route
router.post('/forgot-password', protect, authController.forgotPassword);

// Reset Password route
router.patch('/reset-password/:resetToken', authController.resetPassword);

// Route to fetch all users, protected by authentication
router.get("/customers", async (req, res) => {
    try {
        // Call the exported function to get all users
        const usersData = await getAllUsers();

        // Return the users' data
        res.status(200).json(usersData);
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
