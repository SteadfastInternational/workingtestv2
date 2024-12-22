const axios = require('axios');
const crypto = require('crypto');
const CartModel = require('../models/cart');
const ProductModel = require('../models/products');
const OrderController = require('./OrderV2Controller');
const { sendPaymentSuccessEmail, sendPaymentFailureEmail } = require('../mailtrap/email');
const logger = require('../utils/logger');
const invoiceTemplate = require('../templates/invoiceTemplate');
const { updateStockAfterPayment } = require('./cartV2Controller'); // Import the stock update function
const { sendEmail } = require('../utils/emailUtils');
const {getProductById} = require('./productController')

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_WEBHOOK_SECRET = process.env.PAYSTACK_WEBHOOK_SECRET;

if (!PAYSTACK_SECRET_KEY || !PAYSTACK_WEBHOOK_SECRET) {
  throw new Error('Paystack API keys are not set in environment variables');
}

/**
 * Ensures the provided value is a string. Converts if necessary.
 * @param {any} value - The value to check and convert.
 * @returns {string} - The value as a string.
 */
const ensureString = (value) => {
  return typeof value === 'string' ? value : String(value);
};

/**
 * Initiates payment with Paystack API.
 * Generates a payment URL for redirection.
 * @param {string} cartId - Cart ID for tracking.
 * @param {number} totalPrice - Total payment amount in Naira.
 * @param {string} email - Customer's email.
 * @param {string} userName - Customer's full name.
 * @param {string} formattedAddress - Formatted address from the cart.
 * @param {string} userId - User's unique identifier.
 * @returns {string} Payment gateway redirection URL.
 */
const initiatePayment = async (cartId, totalPrice, email, userName, formattedAddress, userId) => {
  try {
    logger.info(`Initiating payment for ${userName}. CartID: ${cartId}, Amount: ₦${totalPrice}, Email: ${email}`);

    // Ensure userId is a string using the utility function
    const userIdString = ensureString(userId);

    // Log metadata to ensure userId is correct
    logger.info(`Metadata: cartId: ${cartId}, formattedAddress: ${formattedAddress}, userName: ${userName}, userId: ${userIdString}`);

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: totalPrice * 100, // Amount in kobo (100 kobo = 1 Naira)
        metadata: { cartId, formattedAddress, userName, email, userId: userIdString,  cartItems: []}, // Ensure userId is a string
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


const processPaymentSuccess = async (paymentData, userEmail) => {
  const { metadata, amount, reference } = paymentData;
  const userName = `${metadata?.userName || 'Unknown'}`;

  // Log the entire paymentData object to verify structure
  logger.debug('Payment data received:', paymentData);

  // Log metadata to check if userId and cartId are available
  logger.debug('Metadata content:', metadata);

  // Check if metadata contains userId and cartId
  if (!metadata || !metadata.userId || !metadata.cartId) {
    logger.error('Metadata is missing userId or cartId:', metadata);
    throw new Error('Missing userId or cartId in metadata');
  }

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

      // Check if customer email is available
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
    await updateCartAndCreateOrder(metadata, amount, reference, userName, userEmail); // Pass entire metadata
    await updateStockAfterPayment('paid', metadata.cartId); // Update stock
    await sendInvoiceEmail(metadata, amount, userName, metadata.email); // Send invoice email after success

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
 * @param {string} userEmail - Customer's email address.
 */
const updateCartAndCreateOrder = async (metadata, amount, reference, userName, userEmail) => {
  // Destructure userId and cartId from metadata
  let { userId, cartId } = metadata;

  // Check if userId and cartId are available
  if (!userId || !cartId) {
    logger.error(`Missing userId or cartId for ${userName}. Metadata: ${JSON.stringify(metadata)}`);
    throw new Error('Missing userId or cartId in metadata.');
  }

  try {
    // Ensure userId, cartId, and userEmail are strings
    userId = String(userId);
    cartId = String(cartId);
    userEmail = String(userEmail);

    logger.info(`Updating cart and creating order for ${userName}. CartID: ${cartId}, Email: ${userEmail}`);

    // Update the cart payment status and reference
    const cartUpdateResult = await CartModel.updateOne(
      { cartId },
      {
        paymentStatus: 'Paid',
        paymentReference: reference,
      }
    );

    if (cartUpdateResult.nModified === 0) {
      logger.warn(`No cart updated for CartID: ${cartId}. It may not exist.`);
      throw new Error('Cart update failed or CartID does not exist.');
    }

    // Log the successful cart update
    logger.info(`Cart updated successfully for CartID: ${cartId}. Payment reference: ${reference}`);

    // Create an order using the updated cart details
    const orderCreationResult = await OrderController.createOrder(cartId, userId, userEmail);

    if (!orderCreationResult) {
      logger.warn(`Order creation failed for CartID: ${cartId}`);
      throw new Error('Order creation failed.');
    }

    // Log the successful order creation
    logger.info(`Order created successfully for ${userName} with CartID: ${cartId}, OrderID: ${orderCreationResult.orderId}`);

  } catch (error) {
    // Log detailed error information
    logger.error(`Failed to update cart or create order for ${userName} - CartID: ${cartId}`, error);
    throw new Error('Order processing failed.');
  }
};

/**
 * Sends an invoice email after successful payment.
 * @param {object} metadata - Metadata containing user and cart info.
 * @param {number} amount - Total payment amount.
 * @param {string} userName - Customer's full name.
 * @param {string} metadata.email - Customer's email address.
 */
const sendInvoiceEmail = async (metadata, amount, userName) => {
  try {
    // Log the metadata to ensure email is present
    console.log("Received metadata:", metadata);

    // Check if email exists in metadata
    let userEmail = metadata.email;
    if (!userEmail) {
      throw new Error('Email address is missing in metadata.');
    }

    // Log the userEmail to see its value before any checks or validation
    console.log("User email before validation:", userEmail);

    // Ensure userEmail is a string and validate the email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof userEmail !== 'string' || !emailRegex.test(userEmail)) {
      throw new Error(`Invalid email address provided: ${userEmail}`);
    }

    // Early return if email validation fails
    console.log(`Valid email: ${userEmail}`);

    // Log the invoice generation
    console.log(`Preparing invoice email for ${userName || 'Unknown User'}, CartID: ${metadata.cartId}`);

    // Ensure cartItems is an array before passing it to the function
    const cartItems = Array.isArray(metadata.cartItems) ? metadata.cartItems : [];

    // Generate the cart items HTML
    const cartItemsHtml = await generateCartItemsHtml(cartItems);

    // Generate the invoice HTML using the template and replace placeholders
    const invoiceHtml = invoiceTemplate
      .replace('{{name}}', userName || 'Unknown User')
      .replace('{{formattedAddress}}', metadata.formattedAddress || 'No address provided')
      .replace('{{email}}', userEmail)
      .replace('{{sanitizedCartItemsHtml}}', cartItemsHtml)
      .replace('{{totalAmount}}', amount && !isNaN(amount) ? amount.toFixed(2) : '0.00');

    // Send the email, passing userEmail as the recipient
    await sendEmail(userEmail, subject , invoiceHtml);

    console.log(`Invoice email sent to ${userEmail}`);
  } catch (error) {
    // Enhanced error logging
    console.error(`Error in sendInvoiceEmail for ${userEmail}:`, error);
    throw new Error(`Error sending invoice email: ${error.message || error}`);
  }
};




// Function to fetch cart items by cartId (simulating database fetch)
const generateCartItemsHtml = async (items) => {
  let cartItemsHtml = '';

  if (Array.isArray(items) && items.length > 0) {
    for (const item of items) {
      try {
        // Call the existing getProductById function to fetch product data
        const productData = await getProductById(item.productId);

        // Get the product image (use a default if not available)
        const productImage = productData?.image || 'https://via.placeholder.com/80';
        const productName = productData?.productName || item.productName;

        // Ensure price and quantity are numbers before using them
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity, 10) || 0;

        // Escape product name to prevent HTML injection
        const escapedProductName = productName.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;');

        // Generate HTML for each cart item
        cartItemsHtml += `
          <tr>
            <td><img src="${productImage}" alt="${escapedProductName}" width="80" /></td>
            <td>${escapedProductName}</td>
            <td>${quantity}</td>
            <td>₦${price.toFixed(2)}</td>
            <td>₦${(quantity * price).toFixed(2)}</td>
          </tr>
        `;
      } catch (error) {
        console.error(`Error fetching product details for productId: ${item.productId}`, error);
      }
    }
  } else {
    cartItemsHtml = '<tr><td colspan="5">No items in the cart.</td></tr>';
  }

  return cartItemsHtml;
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
