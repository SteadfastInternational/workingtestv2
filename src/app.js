const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const productRoutes = require("./routes/productRoutes");
const errorHandler = require("./middleware/errorMiddleware");
const OrderRoutes = require('./routes/OrderRoutes');
const productController = require('./controllers/productController');
const cors = require('cors'); // Import the CORS package

dotenv.config();
connectDB();

const app = express();

// Configure CORS to allow requests from 'https://www.steadfast.ng'
const corsOptions = {
  origin: 'https://www.steadfast.ng',  // Specify the allowed origin
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Specify allowed headers
};

// Enable CORS with the configured options
app.use(cors(corsOptions));

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
