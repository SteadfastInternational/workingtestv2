const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const cors = require("cors");
const crypto = require("crypto"); // For HMAC signature validation

// Import Routes
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/OrderRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const addressRoutes = require("./routes/addressRoutes");
const paymentRoutes = require("./routes/PaymentRoutes");
const blogRoutes = require("./routes/blogRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const cartRoutes = require("./routes/cartRoutes");
const couponRoutes = require("./routes/couponRoutes");

// Middleware
const errorHandler = require("./middleware/errorMiddleware");
const productController = require("./controllers/productController");

dotenv.config();

// Database Connection
connectDB();

const app = express();

// Configure CORS
const corsOptions = {
  origin: process.env.CLIENT_URL || "https://www.steadfast.ng", // Use environment variable for flexibility
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

// Middleware for JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Specific raw body parser for Paystack webhook (must be placed before any body parsing middleware)
app.use(
  "/api/payment/paystack/webhook",
  express.raw({
    type: "application/json",
    verify: (req, res, buf) => {
      if (req.originalUrl.includes("/api/payment/paystack/webhook")) {
        req.rawBody = buf.toString("utf8"); // Save raw body for signature verification
      }
    },
  })
);

// Logging Middleware for Debugging (only in development mode)
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} request to ${req.url}`);
    next();
  });
}

// Routes
app.use("/api/products", productRoutes); // Product routes
app.use("/api/orders", orderRoutes); // Order routes (added `/api` for consistency)
app.use("/api/products/search/:term", productController.searchProducts); // Product search route
app.use("/api/categories", categoryRoutes); // Category routes
app.use("/api/payment", paymentRoutes); // Payment routes
app.use("/api/address", addressRoutes); // Address routes
app.use("/api/blogs", blogRoutes); // Blog routes
app.use("/api/auth", authRoutes); // Authentication routes
app.use("/api/admin", adminRoutes); // Admin routes
app.use("/api", cartRoutes); // Cart routes
app.use("/coupons", couponRoutes); // Coupon Fetching Routes

// 404 Error Middleware for Undefined Routes
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// Error Handler Middleware (must be last)
app.use(errorHandler);

// Export App
module.exports = app;
