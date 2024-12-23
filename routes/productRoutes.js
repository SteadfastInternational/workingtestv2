const express = require('express');
const productController = require('../controllers/productController'); // Adjust the path as necessary

const router = express.Router();

// Route to create a new product
router.post('/create', productController.createProduct);

// Route to update an existing product
router.put('/update/:productId', productController.updateProduct);

// Route to fetch all products with optional pagination and sorting
router.get('/all', productController.getAllProducts);

// Route to search products by name, slug, or tags
router.get('/search/:searchTerm', productController.searchProducts);

// Route to fetch a single product by its ID
router.get('/id/:productId', productController.getProductById); // Adjusted path for clarity

// Route to fetch a single product by its slug
router.get('/slug/:slug', productController.getProductBySlug); // Adjusted path for clarity

module.exports = router;
