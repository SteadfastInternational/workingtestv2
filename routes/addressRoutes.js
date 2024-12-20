const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');
const { protect } = require('../middleware/authMiddleware');

// Protect all routes that require authentication
router.use(protect);

// Route to create a new address
router.post('/', addressController.createAddress);

// Route to get a specific address by ID
router.get('/:id', addressController.getAddress);

// Route to update a specific address by ID
router.put('/:id', addressController.updateAddress);

// Route to fetch all address
router.get('/', addressController.getAllAddresses);

// Route to delete a specific address by ID
router.delete('/:id', addressController.deleteAddress);

module.exports = router;
