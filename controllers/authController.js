const User = require('../models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { sendPasswordResetEmail, sendResetSuccessEmail, sendWelcomeEmail } = require('../mailtrap/email'); // Import email sending functions

// Helper: Generate JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Helper: Create and send token response
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    },
  });
};

// Signup
exports.signup = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Create user
    const newUser = await User.create({ firstName, lastName, email, password });

    // Send JWT token to the user
    createSendToken(newUser, 201, res);

    // Send welcome email after successful signup
    await sendWelcomeEmail(newUser.email, newUser.firstName);

  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for email and password
    if (!email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide email and password',
      });
    }

    // Find user and check password
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password',
      });
    }

    // Send JWT token to the user
    createSendToken(user, 200, res);
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'No user found with this email address',
      });
    }

    // Generate reset token
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_RESET_PASSWORD_SECRET, {
      expiresIn: process.env.JWT_RESET_PASSWORD_EXPIRES_IN, // 1 hour or custom
    });

    // Store the reset token and expiration time in the user's record
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send reset link via email
    const resetURL = `${process.env.CLIENT_URL}/auth/reset-password/${resetToken}`;
    await sendPasswordResetEmail(email, resetURL);

    res.status(200).json({
      status: 'success',
      message: 'Password reset link sent to email',
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { resetToken } = req.params; // Get token from URL
    const { password, confirmPassword } = req.body;

    // 1. Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({
        status: 'fail',
        message: 'Passwords do not match',
      });
    }

    // 2. Verify the reset token and decode it
    const decoded = jwt.verify(resetToken, process.env.JWT_RESET_PASSWORD_SECRET);
    const user = await User.findById(decoded.id);

    // 3. Check if the user exists and the reset token has expired
    if (!user || user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Reset token is invalid or has expired',
      });
    }

    // 4. Update user's password
    user.password = await bcrypt.hash(password, 12); // Hash the new password
    user.resetPasswordToken = undefined; // Remove reset token
    user.resetPasswordExpires = undefined; // Remove expiration time
    await user.save();

    // 5. Send the success email
    await sendResetSuccessEmail(user.email);

    res.status(200).json({
      status: 'success',
      message: 'Password has been reset successfully',
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};
