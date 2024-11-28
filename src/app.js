const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const productRoutes = require("./routes/productRoutes");
const errorHandler = require("./middleware/errorMiddleware");
const OrderRoutes = require('./routes/OrderRoutes');
const productController = require('./controllers/productController')
dotenv.config();
connectDB();

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Log request details for debugging
app.use((req, res, next) => {
  console.log(`${req.method} request to ${req.url}`);
  next();
});

// Routes
app.use("/api/products", productRoutes);
app.use('/Orders', OrderRoutes); // Ensure the correct path and method
app.use('/products/search/:term', productController.searchProducts);

// Error handler middleware
app.use(errorHandler);

module.exports = app; // Export the app instance