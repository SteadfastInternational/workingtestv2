const OrderModel = require('../models/Order');
const CartModel = require('../models/cart');
const { sendEmail } = require('../utils/emailUtils'); // Assuming utility exists
const mongoose = require('mongoose');
const logger = require('../utils/logger'); // Assuming a logger utility exists
const { v4: uuidv4 } = require('uuid');  // Importing uuid


class OrderController {
  /**
   * Create an order from a cart
   * @param {String} cartId - ID of the cart
   * @param {String} userId - ID of the user
   * @returns {Object} - Created order
   */
  static async createOrder(cartId, userId) {
    const session = await mongoose.startSession(); // Start a session for transactions
    session.startTransaction();

    try {
      // Convert userId from string to ObjectId using 'new'
      const userObjectId = new mongoose.Types.ObjectId(userId);

      // Step 1: Fetch the cart using cartId and validate
      const cart = await CartModel.findOne({ cartId: cartId, userId: userObjectId }).session(session);
      if (!cart) {
        logger.error(
          `User ${userId} failed to create order. Cart not found or does not belong to the user. Cart ID: ${cartId}`
        );
        throw new Error('Cart not found or does not belong to the user.');
      }

      if (cart.status === 'Completed') {
        logger.error(
          `User ${userId} attempted to create an order with an already completed cart. Cart ID: ${cartId}`
        );
        throw new Error('Order has already been created for this cart.');
      }

      // Step 2: Generate a unique order ID using uuid and timestamp
      const orderId = `ORDER-${uuidv4()}-${Date.now()}`;  // Unique order ID with UUID and timestamp

      // Step 3: Generate a unique tracking ID for the order
      const trackingNumber = `STEADFAST-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

      // Step 4: Use the formatted address from the cart
      const formattedAddress = cart.formattedAddress || cart.address; // Fallback to cart.address if formattedAddress is unavailable

      // Step 5: Get total price from cart items
      const totalPrice = cart.items.reduce((total, item) => total + item.totalPrice, 0); // Calculate total price from items

      // Step 6: Create the order
      const order = new OrderModel({
        orderId,              // Generated unique order ID
        cartId: cart.cartId,  // Using cartId as a string
        userId: cart.userId,
        trackingNumber,           // Unique tracking ID
        orderStatus: 'Processed', // Initial status
        totalCartPrice: cart.totalCartPrice,            // Calculated total price from cart items
        address: formattedAddress,
        items: cart.items,
        createdAt: new Date(),
      });

      await order.save({ session });

      // Step 7: Mark the cart as completed
      cart.status = 'Completed';
      await cart.save({ session });

      // Step 8: Notify user via email (with retry logic)
      let emailSent = false;
      let retries = 3;
      while (retries > 0 && !emailSent) {
        try {
          const emailResponse = await sendEmail({
            to: cart.userId.email,
            subject: 'Your Order Has Been Processed',
            body: `Dear ${cart.userFirstName} ${cart.userLastName},\n\nYour order has been successfully processed.\n\nTracking ID: ${trackingId}\n\nThank you for shopping with us.`,
          });

          if (emailResponse.success) {
            logger.info(
              `Order notification email sent to ${cart.userId.email} with Tracking ID ${trackingId}`
            );
            emailSent = true;
          } else {
            throw new Error(`Email service failed for user ${cart.userId.email}.`);
          }
        } catch (emailError) {
          retries--;
          logger.error(
            `Email sending failed on attempt ${4 - retries} for user ${cart.userId.email}: ${emailError.message}`
          );
          if (retries === 0) {
            // If all retries fail, log and proceed with order creation
            logger.error(
              `Failed to send order notification email to ${cart.userId.email} after 3 attempts.`
            );
          }
        }
      }

      await session.commitTransaction(); // Commit transaction
      logger.info(`Order created for user ${userId} with Tracking ID: ${trackingId}`);
      return order;
    } catch (error) {
      logger.error(`Error creating order for user ${userId}: ${error.message}`);
      await session.abortTransaction(); // Rollback on failure
      throw new Error('Failed to create order. Please try again.');
    } finally {
      session.endSession(); // End the session
    }
  }
}

module.exports = OrderController;
