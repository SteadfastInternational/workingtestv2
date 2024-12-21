const express = require('express');
const crypto = require('crypto'); // For HMAC signature validation
const bodyParser = require('body-parser'); // Ensure you have this imported
const router = express.Router();
const { initiatePayment, handleWebhook, processRefund } = require('../controllers/PaymentController');
const isAdmin = require('../middleware/adminMiddleware');
const logger = require('../utils/logger');

// Paystack Webhook Secret from environment variables
const PAYSTACK_WEBHOOK_SECRET = process.env.PAYSTACK_WEBHOOK_SECRET;

// Middleware to parse raw body for Paystack Webhook (before any other body parser)
router.use('/paystack/webhook', bodyParser.raw({ type: 'application/json' }));

// Route to initiate payment
router.post('/paystack/initiate', async (req, res) => {
  const { cartId, totalPrice, email, userName, formattedAddress } = req.body;

  try {
    // Validate the input fields
    if (!cartId || !totalPrice || !email || !userName) {
      return res.status(400).json({ message: 'Cart ID, total price, email, and user name are required' });
    }

    // Call the initiatePayment function from the controller
    const paymentUrl = await initiatePayment(cartId, totalPrice, email, userName, formattedAddress);

    // Return the generated payment URL to redirect the user
    res.json({ paymentUrl });
  } catch (error) {
    logger.error(`Error initiating payment for CartID: ${cartId} - User: ${userName}`, error.message);
    res.status(500).json({ message: 'Error initiating payment', error: error.message });
  }
});

// Route to process refund requests (Admin only)
router.post('/paystack/refund', isAdmin, async (req, res) => {
  const { paymentReference, amount } = req.body;

  // Validate input fields
  if (!paymentReference || !amount) {
    return res.status(400).json({ message: 'Payment reference and amount are required' });
  }

  try {
    // Call the processRefund function from the controller to initiate the refund
    const refundResponse = await processRefund(paymentReference, amount);

    // Return the refund response
    res.status(200).json(refundResponse);
  } catch (error) {
    logger.error('Error processing refund request:', error.message);
    res.status(500).json({ message: 'Error processing refund', error: error.message });
  }
});

module.exports = router;
