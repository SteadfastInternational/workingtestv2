const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    cartId: {
      type: String,
      required: true,
      unique: true,
    },
    userFirstName: {
      type: String,
      required: true,
    },
    userLastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true, 
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
      default: 'Pending',
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        variationId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Variation',
          default: null, // Null if the product doesn't have variations
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
        },
        totalPrice: {
          type: Number,
          required: true,
        },
        productName: {
          type: String,
          required: true,
        },
        variationOptionTitle: {
          type: String,
          default: null, // Null if no variation
        },
      },
    ],
    totalCartPrice: {
      type: Number,
      required: true,
    },
    coupon: {
      code: {
        type: String,
        default: null, // Store coupon code if applied
      },
      discountPercentage: {
        type: Number,
        default: 0, // Discount applied from the coupon
      },
      appliedAt: {
        type: Date,
        default: null, // Date when the coupon was applied
      },
    },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Inventory Done', 'Processed'],
      default: 'Pending',
    },
    address: {
      type: String,
      default: null, // Address will be fetched from User Address model
    },
  },
  { timestamps: true } // Automatically includes createdAt and updatedAt
);

// Middleware to fetch user's formatted address before saving the cart
cartSchema.pre('save', async function (next) {
  if (this.isNew) {
    try {
      // Fetch the user's address using userId
      const Address = mongoose.model('Address');
      const address = await Address.findOne({ userId: this.userId });

      if (address) {
        this.address = address.formattedAddress;
      } else {
        this.address = 'Address not found'; // Handle the case where no address is found
      }

      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
