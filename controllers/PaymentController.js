const axios = require('axios');
const crypto = require('crypto');
const CartModel = require('../models/cart');
const ProductModel = require('../models/products');
const OrderController = require('./OrderV2Controller');
const { sendPaymentSuccessEmail, sendPaymentFailureEmail } = require('../mailtrap/email');
const logger = require('../utils/logger');
const generateInvoiceHtml = require('../templates/invoiceTemplate');
const { updateStockAfterPayment } = require('./cartV2Controller'); // Import the stock update function

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
    logger.info(`Initiating payment for ${userName}. CartID: ${cartId}, Amount: ₦${totalPrice}, Email: ${email}`);

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: totalPrice * 100, // Amount in kobo (100 kobo = 1 Naira)
        metadata: { cartId, formattedAddress },
      },
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );

    const paymentUrl = response.data.data.authorization_url;
    logger.info(`Payment URL generated successfully for ${userName}: ${paymentUrl}`);
    return paymentUrl;
  } catch (error) {
    logger.error(`Payment initiation failed for CartID: ${cartId} - User: ${userName}`, error.message);
    throw new Error('Unable to initiate payment. Please try again.');
  }
};




/**
 * Processes the Paystack webhook logic.
 * @param {Buffer} rawBody - Raw request body as Buffer.
 * @param {object} headers - Request headers.
 */
const handleWebhook = async (rawBody, headers) => {
  const signature = headers['x-paystack-signature'];

  // Log raw request body and headers for debugging
  logger.debug('Webhook raw body:', rawBody.toString());
  logger.debug('Webhook headers:', headers);

  // Verify webhook signature
  if (!isValidSignature(rawBody, signature)) {
    logger.error('Webhook signature mismatch');
    logger.debug('Generated hash:', crypto
      .createHmac('sha512', PAYSTACK_WEBHOOK_SECRET)
      .update(rawBody.toString())
      .digest('hex'));
    logger.debug('Provided signature:', signature);
    return res.status(400).send("Webhook failed: Signature mismatch");
  }

  logger.info('Webhook signature verified successfully');

  try {
    const event = JSON.parse(rawBody.toString());
    logger.debug('Parsed webhook event:', event);

    const { userName, userEmail } = extractUserMetadata(event);
    logger.info(`Received webhook event from ${userName}: ${event.event}`);

    switch (event?.event) {
      case 'charge.success':
        await handleChargeSuccess(event, userName, userEmail);
        break;

      case 'charge.failed':
        logger.warn(`Payment failed for ${userName} with reference: ${event.data.reference}`);
        break;

      case 'charge.pending':
        logger.info(`Payment pending for ${userName} with reference: ${event.data.reference}`);
        break;

      default:
        logger.error(`Unhandled webhook event: ${event.event}`);
        break;
    }
  } catch (error) {
    logger.error('Error processing webhook event:', {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Extracts user metadata from the Paystack event.
 * @param {object} event - The Paystack webhook event.
 * @returns {object} - An object containing the user's name and email.
 */
const extractUserMetadata = (event) => {
  try {
    return {
      userName: `${event?.data?.metadata?.userName || 'Unknown'}`,
      userEmail: event?.data?.metadata?.email || 'unknown@example.com',
    };
  } catch (error) {
    logger.error('Error extracting user metadata:', {
      event,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Handles the successful payment (charge.success) event.
 * @param {object} event - The Paystack event data.
 * @param {string} userName - The user's name.
 * @param {string} userEmail - The user's email.
 */
const handleChargeSuccess = async (event, userName, userEmail) => {
  const reference = event.data.reference;
  logger.info(`Received charge.success event for ${userName} with reference: ${reference}`);
  logger.debug('Event data:', event.data);

  try {
    const paymentStatus = await verifyPaymentStatus(reference);

    if (paymentStatus === 'success') {
      logger.info(`Processing successful payment for ${userName} with reference: ${reference}`);
      await processPaymentSuccess(event.data, userEmail);
    } else {
      logger.warn(`Payment for ${userName} with reference: ${reference} is not fully processed.`);
    }
  } catch (error) {
    logger.error('Error handling charge.success event:', {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Verifies the payment status from Paystack API.
 * @param {string} reference - The payment reference.
 * @returns {string} - The payment status.
 */
const verifyPaymentStatus = async (reference) => {
  logger.debug('Verifying payment status for reference:', reference);
  try {
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });

    const { status, message, data } = response.data;
    logger.debug('Paystack response:', response.data);

    if (status && data?.status === 'success') {
      logger.info(`Transaction ${reference} verified successfully`);

      // Check if customer email is available, but relax other fields.
      if (data.customer?.email) {
        logger.info(`Valid customer email: ${data.customer.email}`);
        return 'success';
      } else {
        logger.warn(`Customer email missing for transaction ${reference}`);
        return 'failed';
      }
    }

    logger.error(`Paystack transaction ${reference} verification failed: ${message || 'Unknown error'}`);
    return 'failed';
  } catch (error) {
    logger.error('Error verifying Paystack payment status:', {
      reference,
      message: error.message,
      stack: error.stack,
    });
    throw new Error('Error verifying payment status');
  }
};



/**
 * Validates the Paystack webhook signature.
 * @param {Buffer} rawBody - Raw request body.
 * @param {string} signature - The signature from the Paystack headers.
 * @returns {boolean} - Whether the signature is valid.
 */
const isValidSignature = (rawBody, signature) => {
  logger.debug('Validating webhook signature');
  const hash = crypto
    .createHmac('sha512', PAYSTACK_WEBHOOK_SECRET)
    .update(rawBody.toString())
    .digest('hex');

  logger.debug('Generated hash:', hash);
  logger.debug('Provided signature:', signature);

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
  const userName = `${metadata?.userName || 'Unknown'}`;

  try {
    // Log the start of the payment verification process
    logger.info(`Verifying payment for ${userName} with reference: ${reference}`);

    // Payment verification logic
    logger.debug('Verifying payment status for reference:', reference);
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
      }
    );

    const { status, message, data } = response.data;
    logger.debug('Paystack response:', response.data);

    if (status && data?.status === 'success') {
      logger.info(`Transaction ${reference} verified successfully`);

      // Check if customer email is available, but relax other fields.
      if (data.customer?.email) {
        logger.info(`Valid customer email: ${data.customer.email}`);
        userEmail = String(data.customer.email); // Ensure userEmail is a string
      } else {
        logger.warn(`Customer email missing for transaction ${reference}`);
        throw new Error('Customer email is missing');
      }
    } else {
      logger.error(`Paystack transaction ${reference} verification failed: ${message || 'Unknown error'}`);
      throw new Error('Payment verification failed');
    }

    // Log successful payment verification
    logger.info(`Payment verification successful for ${userEmail} with reference: ${reference}`);

    // Pass userEmail as a string to the email functions
    await sendPaymentSuccessEmail(userEmail, userName, amount); // Send success email
    await updateCartAndCreateOrder(metadata, amount, reference, userName);
    await updateStockAfterPayment('paid', metadata.cartId); // Update stock
    await sendInvoiceEmail(userEmail, amount, userName); // Send invoice email after success

    // Log the completion of payment processing
    logger.info(`Payment success processing complete for ${userName}`);
  } catch (error) {
    // Log error during payment processing
    logger.error(`Error during payment processing for ${userName} with reference: ${reference}`, {
      message: error.message,
      stack: error.stack,
    });

    // Send failure email if there is an error
    await sendPaymentFailureEmail(userEmail, userName, amount); // Send failure email
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
    logger.info(`Updating cart and creating order for ${userName}. CartID: ${metadata.cartId}`);

    // Update the cart payment status and reference
    await CartModel.updateOne(
      { cartId: metadata.cartId },
      {
        paymentStatus: 'Paid',
        paymentReference: reference,
      }
    );

    // Pass the correct arguments (cartId and userId) to createOrder
    await OrderController.createOrder(metadata.cartId, metadata.userId);

    logger.info(`Order created successfully for ${userName} with CartID: ${metadata.cartId}`);
  } catch (error) {
    logger.error(`Failed to update cart or create order for ${userName} - CartID: ${metadata.cartId}`, error);
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
    logger.info(`Preparing invoice email for ${userName}, CartID: ${metadata.cartId}`);

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
    logger.info(`Invoice email sent to ${userName} at: ${userEmail}`);
  } catch (error) {
    logger.error(`Error sending invoice email to ${userName} at: ${userEmail}`, error);
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
    logger.error('Failed to send email', error);
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
    logger.error('Error processing refund', error);
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

    logger.info(`Refund initiated successfully for reference: ${paymentReference}`);
    return response.data;
  } catch (error) {
    logger.error('Error initiating refund', error);
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
