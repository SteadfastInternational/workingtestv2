const OrderModel = require('../models/Order');
const CartModel = require('../models/cart');
const { sendEmail } = require('../utils/emailUtils');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * OrderController Class
 * Handles order-related operations, such as creating orders from carts.
 */
class OrderController {
  /**
   * Create an order from a cart
   * @param {String} cartId - ID of the cart
   * @param {String} userId - ID of the user
   * @param {String} userEmail - Email of the user
   * @returns {Object} - Created order
   */
  static async createOrder(cartId, userId, userEmail) {
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
      const orderId = `ORDER-${uuidv4()}-${Date.now()}`;

      // Step 3: Generate a unique tracking ID for the order
      const trackingNumber = `STEADFAST-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

      // Step 4: Use the formatted address from the cart
      const formattedAddress = cart.formattedAddress || cart.address;

      // Step 5: Calculate total price from cart items
      const totalPrice = cart.items.reduce((total, item) => total + item.totalPrice, 0);

      // Step 6: Create the order
      const order = new OrderModel({
        orderId,
        cartId: cart.cartId,
        userId: cart.userId,
        trackingNumber,
        paymentStatus: cart.paymentStatus,
        orderStatus: 'Processed',
        totalCartPrice: cart.totalCartPrice,
        address: formattedAddress,
        items: cart.items,
        createdAt: new Date(),
      });

      await order.save({ session });

      // Step 7: Mark the cart as completed
      cart.status = 'Completed';
      await cart.save({ session });

      // Step 8: Send email to user
      let emailSent = false;
      let retries = 3;
      while (retries > 0 && !emailSent) {
        try {
          const emailBody = `
            <p>Dear ${cart.userFirstName} ${cart.userLastName},</p>
            <p>Your order has been successfully processed.</p>
            <p><strong>Tracking ID:</strong> ${trackingNumber}</p>
            <p>Thank you for shopping with us.</p>
          `;

          await sendEmail(userEmail, 'Your Order Has Been Processed', emailBody);

          logger.info(`Order confirmation email sent to ${userEmail}`);
          emailSent = true;
        } catch (emailError) {
          retries--;
          logger.error(
            `Email sending failed on attempt ${4 - retries} for ${userEmail}: ${emailError.message}`
          );

          if (retries === 0) {
            logger.error(
              `Failed to send order confirmation email to ${userEmail} after 3 attempts.`
            );
          }
        }
      }

      await session.commitTransaction(); // Commit transaction
      logger.info(`Order created for user ${userId} with Tracking ID: ${trackingNumber}`);
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
