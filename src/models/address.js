const mongoose = require('mongoose');

// Address Schema
const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    phoneNumber: {
      type: String,
      required: [true, 'Please provide a phone number'],
      validate: {
        validator: function (phone) {
          return /^\d{10,15}$/.test(phone); // Validates phone numbers (10-15 digits)
        },
        message: 'Please provide a valid phone number',
      },
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      trim: true,
      validate: {
        validator: function (email) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: 'Please provide a valid email address',
      },
    },
    city: {
      type: String,
      required: [true, 'Please provide a city name'],
      trim: true,
    },
    deliveryAddress: {
      type: String,
      required: [true, 'Please provide a delivery address'],
      trim: true,
    },
    region: {
      type: String,
      required: [true, 'Please provide a region/state'],
      trim: true,
    },
    zipCode: {
      type: String,
      trim: true,
    },
    formattedAddress: {
      type: String,
      default: 'Please edit your default home address or add a new one',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware: Update formattedAddress dynamically
addressSchema.pre('save', function (next) {
  if (!this.deliveryAddress || !this.city || !this.region) {
    this.formattedAddress =
      'Please edit your default home address or add a new one';
  } else {
    this.formattedAddress = `${this.deliveryAddress}, ${this.city}, ${this.region}${
      this.zipCode ? `, ${this.zipCode}` : ''
    }`;
  }
  next();
});

// Middleware: Limit to 2 addresses per user
addressSchema.pre('save', async function (next) {
  const Address = mongoose.models.Address || mongoose.model('Address', addressSchema); // Use existing model if available
  const addressCount = await Address.countDocuments({ userId: this.userId });

  if (addressCount >= 2) {
    const error = new Error('You can only have up to 2 addresses.');
    error.statusCode = 400; // Bad Request
    return next(error);
  }
  next();
});

// Check if model is already defined
const Address = mongoose.models.Address || mongoose.model('Address', addressSchema);

module.exports = Address;
