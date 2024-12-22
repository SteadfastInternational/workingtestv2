const Coupon = require('../models/coupon');
const Cart = require('../models/cart');
const Product = require('../models/products');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

const updateStockAfterPayment = async (paymentStatus, cartId) => {
  const session = await mongoose.startSession();
  try {
    if (paymentStatus !== 'paid') {
      logger.error(`Payment status for cart ID ${cartId} is not successful. No stock update.`);
      return;
    }

    // Start the transaction
    session.startTransaction();

    // Find the cart using cartId (custom field) instead of _id
    const cart = await Cart.findOne({ cartId: cartId }).session(session);  // <-- Changed here
    if (!cart) {
      logger.error(`Cart with ID ${cartId} not found`);
      return;
    }

    // Update coupon if applied
    if (cart.coupon && cart.coupon.code) {
      const coupon = await Coupon.findOne({ code: cart.coupon.code }).session(session);
      if (!coupon) {
        logger.error(`Coupon with code ${cart.coupon.code} not found`);
      } else {
        const discountAmount = (cart.totalCartPrice * cart.coupon.discountPercentage) / 100;
        coupon.balance += discountAmount; // Add the discount amount to the coupon balance
        coupon.usageCount += 1; // Increment the usage count
        await coupon.save({ session });
        logger.info(`Coupon ${cart.coupon.code} updated successfully`);
      }
    }

    // Update stock for all products in the cart
    for (const item of cart.items) {
      let product;
      if (item.productId) {
        product = await Product.findById(item.productId).session(session);
      } else if (item.productName) {
        product = await Product.findOne({ name: item.productName }).session(session);
      }

      if (!product) {
        logger.error(`Product with ID or Name ${item.productId || item.productName} not found`);
        continue;
      }

      if (item.variationOptionTitle) {
        const variation = product.variation_options.find(
          (option) => option.title === item.variationOptionTitle
        );
        if (variation) {
          if (variation.quantity >= item.quantity) {
            variation.quantity -= item.quantity;
            await product.save({ session });
          } else {
            logger.error(`Insufficient stock for variation ${variation.title}`);
            continue;
          }
        } else {
          logger.error(`Variation ${item.variationOptionTitle} not found for product ${product.name}`);
          continue;
        }
      } else {
        if (product.quantity >= item.quantity) {
          product.quantity -= item.quantity;
          await product.save({ session });
        } else {
          logger.error(`Insufficient stock for product ${product.name}`);
          continue;
        }
      }
    }

    // Commit the transaction
    await session.commitTransaction();
    logger.info(`Stock and coupon successfully updated for cart ID ${cartId}`);
  } catch (error) {
    await session.abortTransaction();
    logger.error(`Error updating stock or coupon for cart ID ${cartId}: ${error.message}`, { stack: error.stack });
  } finally {
    session.endSession();
  }
};

module.exports = { updateStockAfterPayment };
