const express = require('express');
const { 
  createBlog, 
  updateBlog, 
  deleteBlog, 
  getBlogs, 
  getBlogById 
} = require('../controllers/blogController');
const multer = require('multer'); // Middleware for handling file uploads
const isAdmin = require('../middleware/adminMiddleware'); // Import your isAdmin middleware

const router = express.Router();

// Configure multer for file handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Route: Create a new blog - Admin only
router.post(
  '/create', 
  isAdmin, // Ensure only admins can access this route
  upload.fields([{ name: 'images', maxCount: 5 }]), // Handle multiple image uploads
  createBlog
);

// Route: Update a blog by ID - Admin only
router.put(
  '/update/:id', 
  isAdmin, // Ensure only admins can access this route
  upload.fields([{ name: 'images', maxCount: 5 }]), // Handle multiple image uploads
  updateBlog
);

// Route: Delete a blog by ID - Admin only
router.delete('/delete/:id', isAdmin, deleteBlog); // Ensure only admins can access this route

// Route: Get paginated list of blogs with optional search & category filtering - Admin only
router.get('/fetch', isAdmin, getBlogs); // Ensure only admins can access this route

// Route: Fetch a single blog by ID - Public access (no admin check needed)
router.get('/:id', getBlogById); // Public access to fetch blog by ID

module.exports = router;
