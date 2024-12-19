const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Admin Schema
const adminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
      minlength: [3, 'Username must be at least 3 characters long'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true, // Ensure email is stored in lowercase
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'], // Password length validation
    },
    role: {
      type: String,
      enum: ['superadmin', 'admin'],
      default: 'admin',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
  },
  { timestamps: true }
);

// Pre-save middleware to hash passwords before saving to DB
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next(); // Only hash password if it's modified
  this.password = await bcrypt.hash(this.password, 10); // Hash the password
  next();
});

// Method to validate entered password against stored hash
adminSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password); // Compare passwords
};

// Create Admin model based on the schema
module.exports = mongoose.model('Admin', adminSchema);
