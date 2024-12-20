const express = require('express');
const router = express.Router();
const {
  createCategory,
  deleteCategory,
  updateCategory,
  getAllCategories,
} = require('../controllers/categoryController'); 

// Route to create a category
router.post('/categories', createCategory);

// Route to delete a category by ID
router.delete('/categories/:id', deleteCategory);

// Route to update a category by ID
router.put('/categories/:id', updateCategory);

// Route to fetch all categories
router.get('/categories', getAllCategories);

module.exports = router;
