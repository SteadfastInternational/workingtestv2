const mongoose = require('mongoose');

// Order Item Schema
const OrderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variation: { type: String, required: true }, // Updated to match ProductSchema.variations.id
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
}, { _id: false }); // Prevents creating a separate _id for each item

// Order Schema
const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the User
  cart: { type: mongoose.Schema.Types.ObjectId, ref: "Cart", required: true },
  paymentStatus: { type: String, enum: ["Pending", "Paid", "Failed"], default: "Pending" },
  status: { 
    type: String, 
    enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Refunded"], 
    default: "Pending" 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  items: [OrderItemSchema], // Embedded Order Items
  paymentTransactionId: { type: String }, // To store payment processor transaction ID
  totalAmount: { type: Number, required: true }, // Total Order amount
});

// Pre-save hook to handle timestamps
OrderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Post-save hook to handle stock updates after payment confirmation
OrderSchema.post('save', async function(doc, next) {
  const Product = mongoose.model('Product');

  if (doc.paymentStatus === 'Paid') {
    try {
      for (const item of doc.items) {
        await Product.updateStock(item.product, item.variation, -item.quantity); // Use the ProductSchema static method
      }
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

// Post-remove hook to handle stock return on cancellation or refunds
OrderSchema.post('remove', async function(doc, next) {
  const Product = mongoose.model('Product');

  if (doc.status === 'Cancelled' || doc.status === 'Refunded') {
    try {
      for (const item of doc.items) {
        await Product.updateStock(item.product, item.variation, item.quantity); // Use the ProductSchema static method
      }
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

// Model Export
module.exports = mongoose.model('Order', OrderSchema);
