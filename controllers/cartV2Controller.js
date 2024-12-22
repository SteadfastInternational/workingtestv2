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

const getCartById = async (req, res) => {
  const { id } = req.params;

  try {
    const cart = await CartModel.findById(id)
      .populate('userId', 'firstName lastName email')
      .populate('items.productId', 'name price description');

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const userAddress = await AddressModel.findOne({ userId: cart.userId._id }).sort({ createdAt: 1 });
    const formattedAddress = userAddress ? userAddress.formattedAddress : 'No address available';

    const enrichedCart = {
      ...cart.toObject(),
      userName: `${cart.userId.firstName} ${cart.userId.lastName}`,
      deliveryAddress: formattedAddress,
      items: cart.items.map((item) => ({
        ...item.toObject(),
        productName: item.productId.name,
        productPrice: item.productId.price,
      })),
    };

    logger.info(`Fetched cart by ID: ${id}`);
    res.status(200).json(enrichedCart);
  } catch (error) {
    logger.error(`Error fetching cart by ID: ${error.message}`);
    res.status(500).json({ message: 'Failed to fetch cart', error: error.message });
  }
};

module.exports = { updateStockAfterPayment };
