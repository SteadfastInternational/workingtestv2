const express = require('express');
const router = express.Router();
const { initiatePayment, handleWebhook, processRefund } = require('../controllers/PaymentController');
const isAdmin = require('../middleware/adminMiddleware');
const logger = require('../utils/logger');

// Route to initiate payment
router.post('/paystack/initiate', async (req, res) => {
  const { cartId, totalPrice, email, userName } = req.body;

  try {
    // Call the initiatePayment function from the controller
    const paymentUrl = await initiatePayment(cartId, totalPrice, email, userName);

    // Return the generated payment URL to redirect the user
    res.json({ paymentUrl });
  } catch (error) {
    res.status(500).json({ message: 'Error initiating payment', error: error.message });
  }
});

router.post('/paystack/webhook', async (req, res) => {
  try {
    await handleWebhook(req.body, req.headers);
    res.sendStatus(200);
  } catch (error) {
    logger.error('Error processing Paystack webhook:', error.message);
    res.status(401).send(error.message || 'Unauthorized');
  }
});

// Route to process refund requests (Admin only)
router.post('/paystack/refund', isAdmin, async (req, res) => {
  const { paymentReference, amount } = req.body;

  if (!paymentReference || !amount) {
    return res.status(400).json({ message: 'Payment reference and amount are required' });
  }

  try {
    // Call the processRefund function from the controller to initiate the refund
    const refundResponse = await processRefund(paymentReference, amount);

    // Return the refund response
    res.status(200).json(refundResponse);
  } catch (error) {
    res.status(500).json({ message: 'Error processing refund', error: error.message });
  }
});

module.exports = router;
