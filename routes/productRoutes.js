const express = require('express');
const productController = require('../controllers/productController'); // Adjust the path as necessary

const router = express.Router();

// Create a new product
router.post('/create', productController.createProduct);

// Update an existing product
router.put('/update/:productId', productController.updateProduct);

// Fetch all products (with pagination and sorting)
router.get('/all', productController.getAllProducts);

// Search products by name, slug, or tags
router.get('/search/:searchTerm', productController.searchProducts);

// Fetch a single product by its ID
router.get('/:productId', productController.getProductById);  // Added route to get a product by ID


// Define the route for fetching product by slug
router.get('/product/:slug', productController.getProductBySlug);


module.exports = router;
