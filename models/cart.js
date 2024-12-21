const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      set: (value) => String(value),  // Convert ObjectId to string before saving
    },
    cartId: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4(), // Generate unique cartId
    },
    userFirstName: { type: String, required: true },
    userLastName: { type: String, required: true },
    email: { type: String, required: true },
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
          required: false,
        },
        variationId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Variation',
          default: null,
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
          default: null,
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
        default: null,
      },
      discountPercentage: {
        type: Number,
        default: 0,
      },
      appliedAt: {
        type: Date,
        default: null,
      },
    },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Inventory Done', 'Processed'],
      default: 'Pending',
    },
    address: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Middleware to ensure unique cartId before saving
cartSchema.pre('save', async function (next) {
  if (this.isNew) {
    try {
      let isUnique = false;

      // Ensure unique cartId
      while (!isUnique) {
        const potentialCartId = uuidv4();
        const existingCart = await mongoose.model('Cart').findOne({ cartId: potentialCartId });

        if (!existingCart) {
          this.cartId = potentialCartId;
          isUnique = true;
        }
      }

      // Fetch the user's address
      const Address = mongoose.model('Address');
      const address = await Address.findOne({ userId: this.userId });

      this.address = address ? address.formattedAddress : 'Address not found';

      next();
    } catch (error) {
      console.error('Error in cart pre-save middleware:', error.message);
      next(new Error('Failed to save cart.'));
    }
  } else {
    next();
  }
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
