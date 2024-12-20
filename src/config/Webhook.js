const axios = require('axios');
const crypto = require('crypto');
// Import your CartModel to save cart details
const CartModel = require('../models/cart');

const handlePaystackWebhook = async (req, res) => {
  const secret = 'YOUR_PAYSTACK_WEBHOOK_SECRET';
  const signature = req.headers['x-paystack-signature'];

  // Verify Paystack's webhook signature
  const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
  if (hash !== signature) {
    return res.status(401).send('Unauthorized');
  }

  const event = req.body;

  if (event.event === 'charge.success') {
    const { metadata, amount, reference } = event.data;

    // Verify payment with Paystack API
    const verification = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer YOUR_PAYSTACK_SECRET_KEY`,
      },
    });

    const paymentData = verification.data.data;

    // Determine the payment status
    const paymentStatus = paymentData.status === 'success' ? 'Success' : 'Failed';

    // Save cart details in the database
    const cart = {
      userId: metadata.userId, // Add user identification if applicable
      items: metadata.items, // Expected to be an array of cart items
      totalPrice: amount,
      paymentReference: reference,
      paymentStatus, // Dynamically set based on payment status
      couponCode: metadata.couponCode || null, // Include coupon code if provided
    };

    // Save to your database (e.g., using an ORM like Sequelize or Mongoose)
    await CartModel.create(cart);
  }

  res.sendStatus(200); // Acknowledge the webhook
};

module.exports = handlePaystackWebhook;
