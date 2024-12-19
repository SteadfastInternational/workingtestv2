const Admin = require('../models/admin');
const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger'); // Import the logger

// SECRET for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_here';

// Create a new admin
exports.createAdmin = asyncHandler(async (req, res) => {
  const { username, email, password, role } = req.body;

  const adminExists = await Admin.findOne({ email });

  if (adminExists) {
    logger.warn(`Admin creation failed: Admin with email ${email} already exists.`);
    return res.status(400).json({ message: 'Admin with this email already exists' });
  }

  const admin = await Admin.create({
    username,
    email,
    password,
    role,
  });

  if (admin) {
    logger.info(`Admin created successfully: ${admin.username} with email ${admin.email}`);
    res.status(201).json({
      id: admin._id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
    });
  } else {
    logger.error('Admin creation failed: Invalid data passed.');
    res.status(500).json({ message: 'Invalid data passed' });
  }
});

// Authenticate an admin
exports.loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const admin = await Admin.findOne({ email });

  if (admin && (await admin.matchPassword(password))) {
    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    logger.info(`Admin login successful: ${admin.username} with email ${admin.email}`);
    res.status(200).json({
      id: admin._id,
      token,
    });
  } else {
    logger.warn(`Admin login failed: Invalid email or password for ${email}`);
    res.status(401).json({ message: 'Invalid email or password' });
  }
});

// Fetch all admins with pagination
exports.getAllAdmins = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const admins = await Admin.find()
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  logger.info(`Fetched all admins - Page: ${page}, Limit: ${limit}`);
  
  res.status(200).json({
    admins,
    page: parseInt(page),
    limit: parseInt(limit),
  });
});

// Update an admin's details
exports.updateAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { username, email, role, status } = req.body;

  const admin = await Admin.findById(id);

  if (!admin) {
    logger.warn(`Admin update failed: Admin with ID ${id} not found.`);
    return res.status(404).json({ message: 'Admin not found' });
  }

  if (username) admin.username = username;
  if (email) admin.email = email;
  if (role) admin.role = role;
  if (status) admin.status = status;

  const updatedAdmin = await admin.save();

  logger.info(`Admin updated successfully: ${updatedAdmin.username} (ID: ${updatedAdmin._id})`);

  res.status(200).json(updatedAdmin);
});

// Delete an admin
exports.deleteAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const admin = await Admin.findById(id);

  if (!admin) {
    logger.warn(`Admin deletion failed: Admin with ID ${id} not found.`);
    return res.status(404).json({ message: 'Admin not found' });
  }

  await admin.remove();
  logger.info(`Admin deleted successfully: ${admin.username} (ID: ${admin._id})`);

  res.status(200).json({ message: 'Admin deleted successfully' });
});
