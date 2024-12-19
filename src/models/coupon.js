const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
    expirationDate: {
      type: Date,
      default: null, // Can be set to null for no expiration
    },
    balance: {
      type: Number,
      default: 0, // Tracks the total discounted amount
    },
    usageCount: {
      type: Number,
      default: 0, // Tracks the number of times the coupon has been used
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Automatically creates `createdAt` and `updatedAt`
  }
);

// Middleware to update the `updatedAt` field on every update
couponSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
