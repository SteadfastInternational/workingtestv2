const express = require('express');
const { 
  createAdmin, 
  loginAdmin, 
  getAllAdmins, 
  updateAdmin, 
  deleteAdmin 
} = require('../controllers/adminController');
const isAdmin = require('../middleware/adminMiddleware'); // Import the middleware

const router = express.Router();

// Route: Create an admin account
// No middleware here because this is for admin creation, not requiring an existing admin user
router.post('/create', createAdmin);

// Route: Admin login
// No middleware for login either
router.post('/login', loginAdmin);

// Route: Fetch all admins (with pagination support)
// Apply the isAdmin middleware to check if the user is an admin
router.get('/all', isAdmin, getAllAdmins);

// Route: Update an admin
router.put('/update/:id', isAdmin, updateAdmin);

// Route: Delete an admin
router.delete('/delete/:id', isAdmin, deleteAdmin);

module.exports = router;
