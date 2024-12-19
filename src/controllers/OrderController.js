const OrderModel = require('../models/Order');
const CartModel = require('../models/cart');
const { sendEmail } = require('../utils/emailUtils'); // Assuming utility exists
const mongoose = require('mongoose');
const logger = require('../utils/logger'); // Assuming a logger utility exists
const paymentController = require('./PaymentController'); // Assuming your PaymentController is in this path

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
      // Step 1: Fetch the cart and validate
      const cart = await CartModel.findOne({ _id: cartId, userId }).session(session);
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

      // Step 2: Generate a unique tracking ID for the order
      const trackingId = `ORDER-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

      // Step 3: Use the formatted address from the cart
      const formattedAddress = cart.formattedAddress || cart.address; // Fallback to cart.address if formattedAddress is unavailable

      // Step 4: Create the order
      const order = new OrderModel({
        cartId: cart._id,
        userId: cart.userId,
        trackingId,
        orderStatus: 'Processed', // Initial status
        paymentReference: cart.paymentReference,
        totalPrice: cart.totalPrice,
        address: formattedAddress,
        items: cart.items,
        createdAt: new Date(),
      });

      await order.save({ session });

      // Step 5: Mark the cart as completed
      cart.status = 'Completed';
      await cart.save({ session });

      // Step 6: Notify user via email (with retry logic)
      let emailSent = false;
      let retries = 3;
      while (retries > 0 && !emailSent) {
        try {
          const emailResponse = await sendEmail({
            to: cart.userId.email,
            subject: 'Your Order Has Been Processed',
            body: `Dear ${cart.firstName} ${cart.lastName},\n\nYour order has been successfully processed.\n\nTracking ID: ${trackingId}\n\nThank you for shopping with us.`,
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

  /**
   * Update the status of an order (Admin function)
   * @param {String} orderId - ID of the order
   * @param {String} newStatus - New status for the order
   * @returns {Object} - Updated order
   */
  static async updateOrderStatus(orderId, newStatus) {
    const validStatuses = ['On Transit', 'Arrived', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(newStatus)) {
      logger.error(`Invalid status provided for order ${orderId}. Status provided: ${newStatus}`);
      throw new Error('Invalid order status provided.');
    }

    try {
      // Fetch and update the order
      const order = await OrderModel.findById(orderId);
      if (!order) {
        logger.error(`Order with ID ${orderId} not found.`);
        throw new Error('Order not found.');
      }

      order.orderStatus = newStatus;
      order.updatedAt = new Date(); // Update timestamp
      await order.save();

      // Optionally notify user of status change
      await sendEmail({
        to: order.userId.email,
        subject: `Your Order Status Has Been Updated`,
        body: `Dear ${order.firstName} ${order.lastName},\n\nYour order status has been updated to: ${newStatus}.\n\nTracking ID: ${order.trackingId}`,
      });

      logger.info(`Order status for order ${orderId} updated to ${newStatus}`);
      return order;
    } catch (error) {
      logger.error(`Error updating order status for order ${orderId}: ${error.message}`);
      throw new Error('Failed to update order status.');
    }
  }

  /**
   * Cancel an order and revert the cart status
   * @param {String} orderId - ID of the order
   * @returns {Object} - Updated order and cart
   */
  static async cancelOrder(orderId) {
    const session = await mongoose.startSession(); // Start a session for transactions
    session.startTransaction();

    try {
      // Step 1: Fetch the order and validate
      const order = await OrderModel.findById(orderId).session(session);
      if (!order) {
        logger.error(`Order with ID ${orderId} not found.`);
        throw new Error('Order not found.');
      }

      // Step 2: Check if the order is already canceled or completed
      if (order.orderStatus === 'Cancelled') {
        logger.error(`Order with ID ${orderId} is already canceled.`);
        throw new Error('Order is already canceled.');
      }

      // Step 3: Fetch the associated cart and revert its status
      const cart = await CartModel.findOne({ _id: order.cartId }).session(session);
      if (!cart) {
        logger.error(`Cart with ID ${order.cartId} not found.`);
        throw new Error('Cart not found.');
      }

      cart.status = 'Pending'; // Revert cart status
      await cart.save({ session });

      // Step 4: Update the order status to 'Cancelled'
      order.orderStatus = 'Cancelled';
      await order.save({ session });

      // Step 5: Process the refund using the existing payment controller (assumed to be implemented)
      await paymentController.refundPayment(order.paymentReference); // Refund via the existing payment controller

      await session.commitTransaction(); // Commit transaction
      logger.info(`Order with ID ${orderId} canceled successfully.`);
      return { order, cart };
    } catch (error) {
      logger.error(`Error canceling order ${orderId}: ${error.message}`);
      await session.abortTransaction(); // Rollback on failure
      throw new Error('Failed to cancel order. Please try again.');
    } finally {
      session.endSession(); // End the session
    }
  }

  /**
   * Fetch all orders
   * @returns {Array} - List of all orders
   */
  static async getAllOrders() {
    try {
      // Fetch orders with limited populated fields for optimization
      const orders = await OrderModel.find()
        .populate('userId', 'firstName lastName email') // Populating only essential user fields
        .populate('items.productId', 'name price'); // Populating only necessary product details

      logger.info('Fetched all orders successfully');
      return orders;
    } catch (error) {
      logger.error('Error fetching orders: ' + error.message);
      throw new Error('Failed to fetch orders.');
    }
  }

  /**
   * Get order details by ID
   * @param {String} orderId - ID of the order
   * @returns {Object} - Order details
   */
  static async getOrderById(orderId) {
    try {
      const order = await OrderModel.findById(orderId)
        .populate('userId', 'firstName lastName email') // Populating only essential user fields
        .populate('items.productId', 'name price'); // Populating only necessary product details

      if (!order) {
        logger.error(`Order with ID ${orderId} not found.`);
        throw new Error('Order not found.');
      }

      logger.info(`Fetched order details for order ID ${orderId}`);
      return order;
    } catch (error) {
      logger.error(`Error fetching order with ID ${orderId}: ${error.message}`);
      throw new Error('Failed to fetch order details.');
    }
  }
}

module.exports = OrderController;
