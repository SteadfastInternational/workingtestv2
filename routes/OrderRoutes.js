const express = require('express');
const OrderController = require('../controllers/OrderController');
const router = express.Router();

// Route to create a new order
router.post('/create-order', OrderController.createOrder);

// Route to update an order's status (e.g., On Transit, Delivered, Cancelled)
router.put('/update-order-status/:orderId', OrderController.updateOrderStatus);

// Route to fetch all orders
router.get('/get-all-orders', OrderController.getAllOrders);

module.exports = router;
