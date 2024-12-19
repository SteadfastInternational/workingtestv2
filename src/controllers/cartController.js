const Cart = require('../models/cart');
const Product = require('../models/products');
const Coupon = require('../models/coupon');
const Address = require('../models/address');
const logger = require('../utils/logger');
const { initiatePayment } = require('../controllers/PaymentController');

// Create Cart Controller
const createCart = async (req, res) => {
  try {
    // Ensure the user is logged in
    if (!req.user) {
      const errorMessage = 'User not authenticated. Cart creation failed.';
      logger.error(errorMessage);
      return res.status(401).json({ message: errorMessage });
    }

    const { cartId, items, couponCode } = req.body;

    if (!cartId || !items || items.length === 0) {
      const errorMessage = 'Cart ID and Items are required';
      logger.error(`Error creating cart: ${errorMessage}`);
      return res.status(400).json({ message: errorMessage });
    }

    // Calculate the total price of the cart before discount
    let totalCartPrice = 0;
    for (const item of items) {
      let product;
      if (item.productId) {
        product = await Product.findById(item.productId);
      } else if (item.productName) {
        // Fetch product by name (to handle the case of variable products like sweetcup-40g)
        product = await Product.findOne({ name: item.productName });
      }
      
      if (!product) {
        const errorMessage = `Product with ID or Name ${item.productId || item.productName} not found`;
        logger.error(`Error creating cart: ${errorMessage}`);
        return res.status(404).json({ message: errorMessage });
      }

      let price = product.price;

      // Handle variations
      if (item.variationOptionTitle) {
        const variation = product.variation_options.find(
          (option) => option.title === item.variationOptionTitle
        );
        if (variation) {
          price = variation.price;
        } else {
          const errorMessage = `Variation ${item.variationOptionTitle} not found for product ${product.name}`;
          logger.error(`Error creating cart: ${errorMessage}`);
          return res.status(400).json({ message: errorMessage });
        }
      }

      totalCartPrice += price * item.quantity;
      item.price = price;
      item.totalPrice = price * item.quantity;
    }

    let discountPercentage = 0;
    let discountAmount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode });
      if (!coupon) {
        const errorMessage = 'Coupon not found';
        logger.error(`Error creating cart: ${errorMessage}`);
        return res.status(404).json({ message: errorMessage });
      }

      if (coupon.expirationDate && new Date() > new Date(coupon.expirationDate)) {
        const errorMessage = 'Coupon has expired';
        logger.error(`Error creating cart: ${errorMessage}`);
        return res.status(400).json({ message: errorMessage });
      }

      // Apply a 1% discount when the coupon code is applied
      discountPercentage = 1;  // 1% discount
      discountAmount = (totalCartPrice * discountPercentage) / 100;
    }

    const finalPrice = totalCartPrice - discountAmount;

    const address = await Address.findOne({ userId: req.user._id });
    if (!address) {
      const errorMessage = 'Address not found for this user';
      logger.error(`Error creating cart: ${errorMessage}`);
      return res.status(404).json({ message: errorMessage });
    }

    const formattedAddress = address.formattedAddress;

    const newCart = new Cart({
      userId: req.user._id,
      cartId,
      userFirstName: req.user.firstName,
      userLastName: req.user.lastName,
      email: req.user.email,
      items,
      totalCartPrice: finalPrice,  // Updated total price after discount
      coupon: {
        code: couponCode || null,
        discountPercentage,
        appliedAt: couponCode ? new Date() : null,
      },
      address: formattedAddress,
    });

    await newCart.save();

    if (couponCode) {
      logger.info(`Coupon code "${couponCode}" applied to cart ID ${cartId}`);
    } else {
      logger.info(`Cart created for user ${req.user.firstName} ${req.user.lastName} with cart ID ${cartId}`);
    }

    const paymentUrl = await initiatePayment(cartId, finalPrice, req.user.email, `${req.user.firstName} ${req.user.lastName}`, formattedAddress);

    return res.status(201).json({
      message: 'Cart created successfully',
      cart: newCart,
      paymentUrl,
    });

  } catch (error) {
    logger.error(`Error creating cart: ${error.message}`, { stack: error.stack });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Payment Success Controller (update the product stock after payment success)


// Fetch all carts
const getAllCarts = async (req, res) => {
  try {
    const carts = await CartModel.find()
      .populate('userId', 'firstName lastName email')
      .populate('items.productId', 'name price description');

    const enrichedCarts = await Promise.all(
      carts.map(async (cart) => {
        const userAddress = await AddressModel.findOne({ userId: cart.userId._id }).sort({ createdAt: 1 });
        const formattedAddress = userAddress ? userAddress.formattedAddress : 'No address available';

        return {
          ...cart.toObject(),
          userName: `${cart.userId.firstName} ${cart.userId.lastName}`,
          deliveryAddress: formattedAddress,
          items: cart.items.map((item) => ({
            ...item.toObject(),
            productName: item.productId.name,
            productPrice: item.productId.price,
            productDescription: item.productId.description,
          })),
        };
      })
    );

    logger.info('Fetched all carts for all users.');
    res.status(200).json(enrichedCarts);
  } catch (error) {
    logger.error(`Error fetching all carts: ${error.message}`);
    res.status(500).json({ message: 'Failed to fetch all carts', error: error.message });
  }
};

// Fetch cart by ID
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

module.exports = { createCart, getAllCarts, getCartById };
