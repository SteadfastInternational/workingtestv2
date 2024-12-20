// middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/user');

exports.protect = async (req, res, next) => {
  try {
    // Check for token in Authorization header
    const token = req.headers.authorization?.split(' ')[1]; // Extract token
    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in. Please log in to get access.',
      });
    }

    // Verify the token using JWT secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Replace with your secret

    // Check if the user exists in the database
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token no longer exists.',
      });
    }

    // Add the current user to the request object for use in the controller
    req.user = currentUser;
    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    res.status(401).json({
      status: 'fail',
      message: 'Invalid token. Please log in again.',
    });
  }
};
