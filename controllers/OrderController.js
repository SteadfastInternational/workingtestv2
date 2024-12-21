const OrderModel = require('../models/Order');
const CartModel = require('../models/cart');
const { sendEmail } = require('../utils/emailUtils'); // Assuming utility exists
const mongoose = require('mongoose');
const logger = require('../utils/logger'); // Assuming a logger utility exists
const paymentController = require('./PaymentController'); // Assuming your PaymentController is in this path

// Function to update order status
async function updateOrderStatus(orderId, newStatus) {
  const validStatuses = ['On Transit', 'Arrived', 'Delivered', 'Cancelled'];
  if (!validStatuses.includes(newStatus)) {
    logger.error(`Invalid status provided for order ${orderId}. Status provided: ${newStatus}`);
    throw new Error('Invalid order status provided.');
  }

  try {
    const order = await OrderModel.findById(orderId);
    if (!order) {
      logger.error(`Order with ID ${orderId} not found.`);
      throw new Error('Order not found.');
    }

    order.orderStatus = newStatus;
    order.updatedAt = new Date();
    await order.save();

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

// Function to cancel an order
async function cancelOrder(orderId) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await OrderModel.findById(orderId).session(session);
    if (!order) {
      logger.error(`Order with ID ${orderId} not found.`);
      throw new Error('Order not found.');
    }

    if (order.orderStatus === 'Cancelled') {
      logger.error(`Order with ID ${orderId} is already canceled.`);
      throw new Error('Order is already canceled.');
    }

    const cart = await CartModel.findOne({ _id: order.cartId }).session(session);
    if (!cart) {
      logger.error(`Cart with ID ${order.cartId} not found.`);
      throw new Error('Cart not found.');
    }

    cart.status = 'Pending';
    await cart.save({ session });

    order.orderStatus = 'Cancelled';
    await order.save({ session });

    await paymentController.refundPayment(order.paymentReference);

    await session.commitTransaction();
    logger.info(`Order with ID ${orderId} canceled successfully.`);
    return { order, cart };
  } catch (error) {
    logger.error(`Error canceling order ${orderId}: ${error.message}`);
    await session.abortTransaction();
    throw new Error('Failed to cancel order. Please try again.');
  } finally {
    session.endSession();
  }
}

// Function to fetch all orders
async function getAllOrders() {
  try {
    const orders = await OrderModel.find()
      .populate('userId', 'firstName lastName email')
      .populate('items.productId', 'name price');

    logger.info('Fetched all orders successfully');
    return orders;
  } catch (error) {
    logger.error('Error fetching orders: ' + error.message);
    throw new Error('Failed to fetch orders.');
  }
}

// Function to get order details by ID
async function getOrderById(orderId) {
  try {
    const order = await OrderModel.findById(orderId)
      .populate('userId', 'firstName lastName email')
      .populate('items.productId', 'name price');

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


module.exports = {
  updateOrderStatus,
  cancelOrder,
  getAllOrders,
  getOrderById,
};
