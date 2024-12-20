// middlewares/adminMiddleware.js

const jwt = require('jsonwebtoken'); // Assuming you're using JWT for authentication

// Middleware to check if the user is authenticated and an admin
const isAdmin = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1]; // Get token from Authorization header

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Replace with your JWT secret key
    if (decoded.role !== 'admin') { // Check if the user's role is admin
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }
    req.user = decoded; // Attach user info to request object
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    return res.status(400).json({ message: 'Invalid token.' });
  }
};

module.exports = isAdmin;
