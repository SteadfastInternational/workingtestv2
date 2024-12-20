const { body, validationResult } = require('express-validator');

// Middleware to validate product data
const validateProduct = [
  body('name').notEmpty().withMessage('Name is required'),
  body('slug').notEmpty().withMessage('Slug is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('price').isNumeric().withMessage('Price must be a number'),
  body('quantity').isInt({ gt: 0 }).withMessage('Quantity must be a positive integer'),
  body('brand').notEmpty().withMessage('Brand is required'),
  body('weight').notEmpty().withMessage('Weight is required'),
  body('product_type').isIn(['simple', 'variation']).withMessage('Invalid product type'),
];

// Middleware to check validation results
const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = { validateProduct, checkValidation };
