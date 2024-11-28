const Product = require('../models/products');

// Middleware to check if a product exists by ID
const findProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    req.product = product; // Attach product to request object
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { findProductById };
