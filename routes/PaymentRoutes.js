const express = require('express');
const router = express.Router();
const { initiatePayment, handleWebhook, processRefund } = require('../controllers/PaymentController');
const isAdmin = require('../middleware/adminMiddleware');
const logger = require('../utils/logger');

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

// Paystack Webhook route to handle payment events
router.post('/paystack/webhook', async (req, res) => {
  try {
    // Log the incoming request for debugging purposes
    logger.info(`Received Paystack webhook with event: ${req.body.event}`);

    // Process the webhook
    await handleWebhook(req.body, req.headers);

    // Respond with a 200 status to acknowledge receipt
    res.sendStatus(200);
  } catch (error) {
    // Log detailed error message
    logger.error(`Error processing Paystack webhook: ${error.message}`, {
      stack: error.stack, // Include stack trace for better debugging
    });

    // Send a 401 status with the error message
    res.status(401).send(error.message || 'Unauthorized');
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
