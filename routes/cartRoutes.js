const express = require("express");
const router = express.Router();
const CartController = require("../controllers/cartController");
const { protect } = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/adminMiddleware");

// Route to create a new cart (only for authenticated users)
router.post("/cart", protect, CartController.createCart);

// Route to fetch all carts (admin-only)
router.get("/carts", isAdmin, CartController.getAllCarts);

// Route to fetch a specific cart by ID (admin-only)
router.get("/cart/:id",  CartController.getCartById);

module.exports = router;
