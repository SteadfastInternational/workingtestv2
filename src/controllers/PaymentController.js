const axios = require('axios');
const crypto = require('crypto');
const CartModel = require('../models/cart');
const ProductModel = require('../models/products');
const OrderController = require('./OrderController');
const { sendSuccessEmail, sendFailureEmail } = require('../mailtrap/email');
const { logError, logInfo } = require('../utils/logger');
const generateInvoiceHtml = require('../templates/invoiceTemplate');
const { updateStockAfterPayment } = require('./cartController'); // Import the stock update function

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_WEBHOOK_SECRET = process.env.PAYSTACK_WEBHOOK_SECRET;

if (!PAYSTACK_SECRET_KEY || !PAYSTACK_WEBHOOK_SECRET) {
  throw new Error('Paystack API keys are not set in environment variables');
}

/**
 * Initiates payment with Paystack API.
 * Generates a payment URL for redirection.
 * @param {string} cartId - Cart ID for tracking.
 * @param {number} totalPrice - Total payment amount in Naira.
 * @param {string} email - Customer's email.
 * @param {string} userName - Customer's full name.
 * @param {string} formattedAddress - Formatted address from the cart.
 * @returns {string} Payment gateway redirection URL.
 */
const initiatePayment = async (cartId, totalPrice, email, userName, formattedAddress) => {
  try {
    logInfo(`Initiating payment for ${userName}. CartID: ${cartId}, Amount: ₦${totalPrice}, Email: ${email}`);

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: totalPrice * 100, // Convert Naira to Kobo
        metadata: { cartId, formattedAddress },
      },
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );

    if (!response?.data?.data?.authorization_url) {
      throw new Error('Failed to generate payment URL from Paystack');
    }

    const paymentUrl = response.data.data.authorization_url;
    logInfo(`Payment URL generated successfully for ${userName}: ${paymentUrl}`);
    return paymentUrl;
  } catch (error) {
    logError(`Payment initiation failed for CartID: ${cartId} - User: ${userName}`, error);
    throw new Error('Unable to initiate payment. Please try again.');
  }
};

/**
 * Handles Paystack webhook requests.
 * Verifies authenticity and processes events automatically.
 * @param {object} req - HTTP request object.
 * @param {object} res - HTTP response object.
 */
const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    if (!isValidSignature(req.body, signature)) {
      logError('Webhook signature mismatch');
      return res.status(401).send('Unauthorized');
    }

    const event = req.body;
    const userName = `${event?.data?.metadata?.firstName || 'Unknown'} ${event?.data?.metadata?.lastName || 'User'}`;
    const userEmail = event?.data?.metadata?.email || 'unknown@example.com';

    logInfo(`Received webhook event from ${userName}: ${event.event}`);

    if (event?.event === 'charge.success') {
      logInfo(`Processing successful payment for ${userName} with reference: ${event.data.reference}`);
      await processPaymentSuccess(event.data, userEmail);
    }

    res.sendStatus(200); // Respond to Paystack webhook
  } catch (error) {
    logError('Error processing webhook', error);
    res.status(500).send('Internal Server Error');
  }
};

/**
 * Verifies webhook signature from Paystack.
 * @param {object} body - Request payload.
 * @param {string} signature - Signature from headers.
 * @returns {boolean} Whether the signature is valid.
 */
const isValidSignature = (body, signature) => {
  const hash = crypto
    .createHmac('sha512', PAYSTACK_WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');
  return hash === signature;
};

/**
 * Processes successful payment event automatically.
 * Verifies payment and updates the order and cart.
 * @param {object} paymentData - Webhook payload data.
 * @param {string} userEmail - Customer's email address.
 */
const processPaymentSuccess = async (paymentData, userEmail) => {
  const { metadata, amount, reference } = paymentData;
  const userName = `${metadata?.firstName || 'Unknown'} ${metadata?.lastName || 'User'}`;

  try {
    logInfo(`Verifying payment for ${userName} with reference: ${reference}`);
    const verificationResponse = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );

    if (verificationResponse?.data?.data?.status !== 'success') {
      throw new Error('Payment verification failed');
    }

    logInfo(`Payment verification successful for ${userName} with reference: ${reference}`);
    await updateCartAndCreateOrder(metadata, amount, reference, userName);
    await updateStockAfterPayment('paid', metadata.cartId); // Call the updateStock function after payment is confirmed
    await sendSuccessEmail(metadata, amount, userName, userEmail); // Send success email with userEmail
    await sendInvoiceEmail(metadata, amount, userName, userEmail); // Send invoice email after success
    logInfo(`Payment success processing complete for ${userName}`);
  } catch (error) {
    logError(`Error during payment processing for ${userName} with reference: ${reference}`, error);
    await sendFailureEmail(metadata, amount, userName, userEmail); // Send failure email with userEmail
  }
};

/**
 * Updates the cart and creates an order after successful payment.
 * @param {object} metadata - Metadata containing cart details.
 * @param {number} amount - Payment amount.
 * @param {string} reference - Paystack payment reference.
 * @param {string} userName - Customer's full name.
 */
const updateCartAndCreateOrder = async (metadata, amount, reference, userName) => {
  try {
    logInfo(`Updating cart and creating order for ${userName}. CartID: ${metadata.cartId}`);

    await CartModel.updateOne(
      { cartId: metadata.cartId },
      {
        paymentStatus: 'Paid',
        paymentReference: reference,
      }
    );

    const orderDetails = {
      userId: metadata.userId,
      items: metadata.items,
      address: metadata.formattedAddress,
      totalPrice: amount / 100, // Convert Kobo to Naira
      paymentReference: reference,
      paymentStatus: 'Paid',
      cartId: metadata.cartId,
    };

    await OrderController.createOrder(orderDetails);
    logInfo(`Order created successfully for ${userName} with CartID: ${metadata.cartId}`);
  } catch (error) {
    logError(`Failed to update cart or create order for ${userName} - CartID: ${metadata.cartId}`, error);
    throw new Error('Order processing failed.');
  }
};

/**
 * Sends an invoice email after successful payment.
 * @param {object} metadata - Metadata containing user and cart info.
 * @param {number} amount - Total payment amount.
 * @param {string} userName - Customer's full name.
 * @param {string} userEmail - Customer's email address.
 */
const sendInvoiceEmail = async (metadata, amount, userName, userEmail) => {
  try {
    logInfo(`Preparing invoice email for ${userName}, CartID: ${metadata.cartId}`);

    const cartItemsHtml = await generateCartItemsHtml(metadata.items);
    const emailHtml = generateInvoiceHtml(
      cartItemsHtml,
      amount,
      metadata.cartId,
      {
        name: `${metadata.firstName || 'Unknown'} ${metadata.lastName || 'User'}`,
        email: userEmail,
        address: metadata.formattedAddress,
      },
      new Date()
    );

    await sendEmail(userEmail, 'Payment Received - Invoice', emailHtml);
    logInfo(`Invoice email sent to ${userName} at: ${userEmail}`);
  } catch (error) {
    logError(`Error sending invoice email to ${userName} at: ${userEmail}`, error);
  }
};

/**
 * Generates HTML content for cart items in the invoice.
 * @param {Array} items - List of purchased items.
 * @returns {string} HTML string for the cart items.
 */
const generateCartItemsHtml = async (items) => {
  let cartItemsHtml = '';
  for (const item of items) {
    const product = await ProductModel.findById(item.productId);
    const productImage = product?.image || 'https://via.placeholder.com/80';
    cartItemsHtml += ` 
      <tr>
        <td><img src="${productImage}" alt="${item.productName}" width="80" /></td>
        <td>${item.productName}</td>
        <td>${item.quantity}</td>
        <td>₦${item.price.toFixed(2)}</td>
        <td>₦${(item.quantity * item.price).toFixed(2)}</td>
      </tr>
    `;
  }
  return cartItemsHtml;
};

/**
 * Sends a general email to the customer.
 * @param {string} recipient - Email recipient address.
 * @param {string} subject - Email subject.
 * @param {string} htmlContent - HTML content of the email.
 */
const sendEmail = async (recipient, subject, htmlContent) => {
  try {
    await sendSuccessEmail({
      recipient,
      subject,
      htmlContent,
    });
  } catch (error) {
    logError('Failed to send email', error);
  }
};

/**
 * Handle refund request from the user.
 * @param {object} req - HTTP request object.
 * @param {object} res - HTTP response object.
 */
const processRefund = async (req, res) => {
  try {
    const { paymentReference, amount } = req.body;

    if (!paymentReference || !amount) {
      return res.status(400).send('Payment reference and amount are required');
    }

    // Only admin can access refund route
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
      return res.status(403).send('Unauthorized: Admin access required');
    }

    const refundResponse = await initiateRefund(paymentReference, amount);
    res.status(200).send(refundResponse);
  } catch (error) {
    res.status(500).send('Error processing refund');
  }
};

/**
 * Initiates a refund process with Paystack.
 * @param {string} paymentReference - Payment reference.
 * @param {number} amount - Refund amount.
 * @returns {object} Refund response.
 */
const initiateRefund = async (paymentReference, amount) => {
  try {
    const response = await axios.post(
      'https://api.paystack.co/refund',
      { payment_reference: paymentReference, amount: amount * 100 },
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );

    if (response.data.status !== 'success') {
      throw new Error('Refund initiation failed');
    }

    logInfo(`Refund initiated successfully for reference: ${paymentReference}`);
    return response.data;
  } catch (error) {
    logError('Error initiating refund', error);
    throw new Error('Refund initiation failed');
  }
};

module.exports = {
  initiatePayment,
  handleWebhook,
  processPaymentSuccess,
  updateStockAfterPayment,
  processRefund,
  sendInvoiceEmail,
};
