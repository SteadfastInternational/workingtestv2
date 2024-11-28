// src/routes/OrderRoutes.js
const express = require('express');
const router = express.Router();

// Import the Order controller methods
const { createOrder, paymentCallback } = require('../controllers/OrderController');

// Define your routes
router.post('/create-Order', createOrder);  // Ensure this handler is properly imported
router.get('/payment/callback', paymentCallback);  // Same for this one

module.exports = router;
