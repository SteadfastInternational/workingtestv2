const express = require('express');
const { 
  updateOrderStatus, 
  cancelOrder, 
  getAllOrders, 
  getOrderById 
} = require('../controllers/OrderController'); // Importing individual functions
const router = express.Router();

// Route to update an order's status (e.g., On Transit, Delivered, Cancelled)
router.put('/update-order-status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { newStatus } = req.body; // Assuming the new status is passed in the request body
    const updatedOrder = await updateOrderStatus(orderId, newStatus);
    res.status(200).json(updatedOrder);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Route to cancel an order
router.put('/cancel-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { order, cart } = await cancelOrder(orderId);
    res.status(200).json({ order, cart });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Route to fetch all orders
router.get('/get-all-orders', async (req, res) => {
  try {
    const orders = await getAllOrders();
    res.status(200).json(orders);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Route to get order details by ID
router.get('/get-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await getOrderById(orderId);
    res.status(200).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;

