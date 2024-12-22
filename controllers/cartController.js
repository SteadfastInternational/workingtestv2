const Cart = require('../models/cart');
const Product = require('../models/products');
const Coupon = require('../models/coupon');
const Address = require('../models/address');
const logger = require('../utils/logger');
const { initiatePayment } = require('../controllers/PaymentController');


const { v4: uuidv4 } = require('uuid'); // For generating unique cart IDs

const createCart = async (req, res) => {
  try {
    // Ensure the user is logged in
    if (!req.user) {
      const errorMessage = 'User not authenticated. Cart creation failed.';
      logger.error(errorMessage);
      return res.status(401).json({ message: errorMessage });
    }

    const { items, couponCode } = req.body;

    if (!items || items.length === 0) {
      const errorMessage = 'Items are required to create a cart.';
      logger.error(`Error creating cart: ${errorMessage}`);
      return res.status(400).json({ message: errorMessage });
    }

    let totalCartPrice = 0;
    const parsedItems = [];

    for (const item of items) {
      const { productName, quantity } = item;

      if (!productName || !quantity) {
        const errorMessage = 'Product name and quantity are required for each item.';
        logger.error(`Error creating cart: ${errorMessage}`);
        return res.status(400).json({ message: errorMessage });
      }

      // Check for variation in the product name
      const [baseName, variationTitle] = productName.split('-');
      let product = await Product.findOne({ name: baseName });

      if (!product) {
        const errorMessage = `Product "${baseName}" not found.`;
        logger.error(`Error creating cart: ${errorMessage}`);
        return res.status(404).json({ message: errorMessage });
      }

      let price = product.price;
      let variationId = null;

      if (variationTitle) {
        const variation = product.variation_options.find(
          (option) => option.title.toLowerCase() === variationTitle.toLowerCase()
        );

        if (!variation) {
          const errorMessage = `Variation "${variationTitle}" not found for product "${baseName}".`;
          logger.error(`Error creating cart: ${errorMessage}`);
          return res.status(400).json({ message: errorMessage });
        }

        price = variation.price;
        variationId = variation._id;
      }

      const totalPrice = price * quantity;
      totalCartPrice += totalPrice;

      parsedItems.push({
        productId: product._id,
        variationId,
        productName: baseName,
        variationOptionTitle: variationTitle || null,
        quantity,
        price,
        totalPrice,
      });
    }

    // Handle coupon code
    let discountPercentage = 0;
    let discountAmount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode });
      if (!coupon) {
        const errorMessage = 'Coupon not found.';
        logger.error(`Error creating cart: ${errorMessage}`);
        return res.status(404).json({ message: errorMessage });
      }

      if (coupon.expirationDate && new Date() > new Date(coupon.expirationDate)) {
        const errorMessage = 'Coupon has expired.';
        logger.error(`Error creating cart: ${errorMessage}`);
        return res.status(400).json({ message: errorMessage });
      }

      // Apply a 1% discount
      discountPercentage = 1;
      discountAmount = (totalCartPrice * discountPercentage) / 100;
    }

    const finalPrice = totalCartPrice - discountAmount;

    const address = await Address.findOne({ userId: req.user._id });
    if (!address) {
      const errorMessage = 'Address not found for this user.';
      logger.error(`Error creating cart: ${errorMessage}`);
      return res.status(404).json({ message: errorMessage });
    }

    const formattedAddress = address.formattedAddress;

    // Create the new cart
const newCart = new Cart({
  userId: req.user._id, // Include userId here
  cartId: uuidv4(), // Generate a unique cart ID
  userFirstName: req.user.firstName,
  userLastName: req.user.lastName,
  email: req.user.email,
  items: parsedItems,
  totalCartPrice: finalPrice,
  coupon: {
    code: couponCode || null,
    discountPercentage,
    appliedAt: couponCode ? new Date() : null,
  },
  address: formattedAddress,
});

await newCart.save();

// Initiate payment with the userId included
const paymentUrl = await initiatePayment(
  newCart.cartId, 
  finalPrice, 
  req.user.email, 
  `${req.user.firstName} ${req.user.lastName}`, 
  formattedAddress, 
  req.user._id // Pass userId as part of the payment initiation
);


    return res.status(201).json({
      message: 'Cart created successfully.',
      cart: newCart,
      paymentUrl,
    });
  } catch (error) {
    logger.error(`Error creating cart: ${error.message}`, { stack: error.stack });
    return res.status(500).json({ message: 'Internal server error.' });
  }
};



// Payment Success Controller (update the product stock after payment success) (Moved to the cartV2 controller to avoid circular depency error)


// Fetch all carts
const getAllCarts = async (req, res) => {
  try {
    const carts = await Cart.find()
      .populate('userId', 'firstName lastName email')
      .populate('items.productId', 'name price');

    const enrichedCarts = await Promise.all(
      carts.map(async (cart) => {
        const userAddress = await Address.findOne({ userId: cart.userId._id }).sort({ createdAt: 1 });
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

const getCartById = async (req, res) => {
  const { id } = req.params; // Cart ID is passed as a string

  try {
    const cart = await Cart.findOne({ cartId: id })
      .populate('userId', 'firstName lastName email')
      .populate('items.productId', 'name price');

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const userAddress = await Address.findOne({ userId: cart.userId._id }).sort({ createdAt: 1 });
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
