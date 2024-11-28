const mongoose = require('mongoose');
const Order = require('../models/Order');
const Cart = require('../models/cart');
const Paystack = require('paystack-node');
const Bull = require('bull');
const User = require('../models/user');
const sendEmail = require('../services/emailService'); // Import the email service

// Initialize Paystack with your secret key
const paystack = new Paystack('your-paystack-secret-key');

// Initialize a Bull queue to handle async jobs
const OrderQueue = new Bull('OrderQueue', 'redis://127.0.0.1:6379');

// Create a new Order and redirect to Paystack for payment
exports.createOrder = async (req, res) => {
  try {
    const { cartId } = req.body;
    const userId = req.user.id;  // Assuming user is authenticated

    // Fetch the cart details
    const cart = await Cart.findById(cartId).populate('items.product').populate('items.variation');
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Calculate total Order amount
    let totalAmount = 0;
    const items = cart.items.map(item => {
      const itemTotal = (item.variation?.price || item.product.price) * item.quantity;
      totalAmount += itemTotal;
      return {
        product: item.product._id,
        variation: item.variation?._id,
        quantity: item.quantity,
        price: itemTotal,
      };
    });

    // Create an Order
    const Order = new Order({
      cart: cartId,
      items,
      totalAmount,
      status: 'Pending',
      user: userId,
    });

    // Save the Order
    await Order.save();

    // Send email to user about the Order
    const emailText = `Thank you for your Order! Your Order ID is ${Order._id}. Please complete your payment to proceed.`;
    const emailHtml = `<p>Thank you for your Order! Your Order ID is <strong>${Order._id}</strong>. Please complete your payment to proceed.</p>`;
    await sendEmail(req.user.email, 'Order Created - Complete Your Payment', emailText, emailHtml);

    // Redirect user to Paystack payment page
    const paymentData = {
      amount: totalAmount * 100, // Paystack expects the amount in kobo (1 kobo = 0.01 Naira)
      email: req.user.email,
      callback_url: `${process.env.BASE_URL}/payment/callback`,
      metadata: { OrderId: Order._id },  // Include Order ID in metadata for reference
    };

    const response = await paystack.transaction.initialize(paymentData);
    if (response.status) {
      Order.paymentTransactionId = response.data.reference;
      await Order.save();

      return res.json({ paymentUrl: response.data.authorization_url });
    } else {
      return res.status(500).json({ message: 'Payment initiation failed', error: response.message });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error creating Order', error: error.message });
  }
};

// Payment Callback to process Order after Paystack payment success
exports.paymentCallback = async (req, res) => {
  try {
    const { reference } = req.query;
    if (!reference) {
      return res.status(400).json({ message: 'Missing payment reference' });
    }

    // Verify the transaction with Paystack
    const verifyResponse = await paystack.transaction.verify(reference);
    if (!verifyResponse.status) {
      console.error(`Payment verification failed for reference: ${reference}`);
      return res.status(400).json({ message: 'Payment verification failed', error: verifyResponse.message });
    }

    if (verifyResponse.data.status !== 'success') {
      console.error(`Payment unsuccessful for reference: ${reference}`);
      return res.status(400).json({ message: 'Payment unsuccessful', error: 'Payment was not successful.' });
    }

    // Find the Order using the transaction reference (stored in metadata)
    const Order = await Order.findOne({ paymentTransactionId: reference }).populate('cart');
    if (!Order) {
      return res.status(404).json({ message: 'Order not found', error: 'Order with this transaction reference does not exist.' });
    }

    // Mark the Order as paid
    Order.paymentStatus = 'Paid';
    Order.status = 'Processing'; // Change status to processing once paid
    await Order.save();

    // Send email to user confirming payment success
    const emailText = `Your payment for Order ${Order._id} has been successfully processed. Your Order is now being processed.`;
    const emailHtml = `<p>Your payment for Order <strong>${Order._id}</strong> has been successfully processed. Your Order is now being processed.</p>`;
    await sendEmail(req.user.email, 'Payment Successful - Order Processing', emailText, emailHtml);

    // Process stock updates in background job
    await OrderQueue.add({ OrderId: Order._id });

    return res.json({ message: 'Payment successful', Order });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error processing payment', error: error.message });
  }
};

// Async job to handle stock updates and further processing (like shipping)
OrderQueue.process(async (job, done) => {
  try {
    const Order = await Order.findById(job.data.OrderId).populate('items.product').populate('items.variation');
    if (!Order) {
      return done(new Error('Order not found'));
    }

    // Update stock for each product item
    for (const item of Order.items) {
      const product = await mongoose.model('Product').findById(item.product);
      if (!product) throw new Error('Product not found');

      const variation = product.variations.find(v => v._id.toString() === item.variation.toString());
      if (!variation) throw new Error('Variation not found');

      const newQuantity = variation.quantity - item.quantity;
      if (newQuantity < 0) throw new Error(`Not enough stock for product ${product.name}`);

      variation.quantity = newQuantity;
      await variation.save(); // Update stock
    }

    done();
  } catch (error) {
    console.error(error);
    done(error);
  }
});
