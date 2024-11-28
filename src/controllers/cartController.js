const Cart = require("../models/cart");
const Product = require("../models/product");

exports.addToCart = async (req, res) => {
  const { productId, quantity } = req.body;

  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: "Product not found" });

  if (quantity > product.stock) {
    return res.status(400).json({ message: "Insufficient stock" });
  }

  const cart = new Cart({
    products: [{ productId, quantity }],
    total: product.price * quantity,
  });

  await cart.save();
  res.status(201).json(cart);
};
