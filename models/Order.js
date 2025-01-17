const Joi = require('joi');
const mongoose = require('mongoose');

// Order schema definition
const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true, // Ensures order ID is unique
    },
    trackingNumber: {
      type: String,
      required: true,
      unique: true, // Ensures tracking number is unique
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // References the User model
      required: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product', // References the Product model
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        variation: {
          type: String, // E.g., Size, Color, etc.
          required: false,
        },
      },
    ],
    totalCartPrice: {
      type: Number,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Pending', 'Failed'],
      default: 'Pending',
    },
    status: {
      type: String,
      enum: ['Processing', 'ProcessedInv', 'In Transit', 'Arrived', 'Delivered', 'Cancelled', 'Refunded'],
      default: 'Processing',
    },
    statusColor: {
      type: String,
      required: true,
      enum: ['#B0B0B0', '#FFFF00', '#fff44f', '#32CD32', '#FF0000', '#808080'], // Added gray for refunded status
      default: '#B0B0B0', // Default to Ash for Processing
    },
    refundedAmount: {
      type: Number,
      default: 0, // Tracks the refunded amount
    },
    refundStatus: {
      type: String,
      enum: ['Not Requested', 'Requested', 'Completed', 'Failed'],
      default: 'Not Requested',
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
    timestamps: true, // Automatically tracks createdAt and updatedAt
  }
);

// Consolidating both 'pre' save middlewares for status color update
orderSchema.pre('save', function (next) {
  const statusColorMap = {
    'Processing': '#B0B0B0', // Ash
    'In Transit': '#FFFF00', // Yellow
    'Arrived': '#fff44f',    // Custom color for Arrived
    'Delivered': '#32CD32',  // Green
    'Cancelled': '#FF0000',  // Red
    'Refunded': '#808080',   // Gray for refunded
  };

  // Update status color based on order status
  this.statusColor = statusColorMap[this.status] || '#B0B0B0'; // Default to Ash for Processing

  next();
});

// Static method to create a new order
orderSchema.statics.createOrder = async function (orderDetails) {
  try {
    const order = new this(orderDetails);
    await order.save();
    return order;
  } catch (error) {
    throw new Error('Error creating order: ' + error.message);
  }
};

// Method to request a refund
orderSchema.methods.requestRefund = async function (refundAmount) {
  try {
    if (this.status === 'Delivered' || this.status === 'Processing') {
      this.refundStatus = 'Requested';
      this.refundedAmount = refundAmount;
      this.status = 'Refunded'; // Change order status to refunded
      await this.save();
      return { message: 'Refund requested successfully' };
    } else {
      throw new Error('Refund can only be requested for orders in Delivered or Processing status.');
    }
  } catch (error) {
    throw new Error('Error requesting refund: ' + error.message);
  }
};

// Method to mark refund as completed
orderSchema.methods.completeRefund = async function () {
  try {
    if (this.refundStatus === 'Requested') {
      this.refundStatus = 'Completed';
      await this.save();
      return { message: 'Refund completed successfully' };
    } else {
      throw new Error('Refund must first be requested.');
    }
  } catch (error) {
    throw new Error('Error completing refund: ' + error.message);
  }
};

// Middleware to update the status color based on the refund status
orderSchema.pre('save', function (next) {
  if (this.refundStatus === 'Completed') {
    this.statusColor = '#808080'; // Gray for refunded orders
  }
  next();
});

const OrderModel = mongoose.model('Order', orderSchema);

module.exports = OrderModel;
