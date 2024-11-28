const User = require('../models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { promisify } = require('util');

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

// Helper: Send emails
const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: 'SendGrid',
    auth: {
      user: process.env.SENDGRID_USERNAME,
      pass: process.env.SENDGRID_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: 'noreply@example.com',
    to: options.email,
    subject: options.subject,
    text: options.message,
  });
};

// Signup
exports.signup = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Create user
    const newUser = await User.create({ firstName, lastName, email, password });

    // Send welcome email
    const welcomeMessage = `Welcome ${firstName} ${lastName}!\n\nThank you for joining our platform.`;
    await sendEmail({
      email: newUser.email,
      subject: 'Welcome to Our Platform!',
      message: welcomeMessage,
    });

    // Send JWT token to the user
    createSendToken(newUser, 201, res);
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

    // Generate a new password
    const newPassword = crypto.randomBytes(6).toString('hex');

    // Update user's password
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save({ validateBeforeSave: false });

    // Send new password via email
    const resetMessage = `Your new password is: ${newPassword}\n\nPlease log in and change your password as soon as possible.`;
    await sendEmail({
      email: user.email,
      subject: 'Your New Password',
      message: resetMessage,
    });

    res.status(200).json({
      status: 'success',
      message: 'A new password has been sent to your email',
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // Find user
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    // Check old password
    if (!(await user.correctPassword(oldPassword, user.password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'Your current password is incorrect',
      });
    }

    // Update password
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    // Notify user via email
    const passwordChangedMessage = `Your password has been successfully changed.\n\nIf you didn't request this change, please contact our support team immediately.`;
    await sendEmail({
      email: user.email,
      subject: 'Password Changed Successfully',
      message: passwordChangedMessage,
    });

    // Send JWT token to the user
    createSendToken(user, 200, res);
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};
