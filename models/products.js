const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Product Schema
const productSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  image: {
    id: { type: Number, required: true },
    thumbnail: { type: String, required: true },
    original: { type: String, required: true },
  },
  gallery: [
    {
      id: { type: Number, required: true },
      thumbnail: { type: String, required: true },
      original: { type: String, required: true },
    },
  ],
  quantity: { type: Number, required: true },
  price: { 
    type: Number, 
    required: function() { return this.product_type === 'simple'; },
  },
  sale_price: { 
    type: Number, 
    required: function() { return this.product_type === 'simple'; },
  },
  min_price: { 
    type: Number, 
    required: function() { return this.product_type === 'variable'; },
  },
  max_price: { 
    type: Number, 
    required: function() { return this.product_type === 'variable'; },
  },
  bodyColor: { type: String, required: false },
  weight: { type: Number, required: false },
  watt: { type: String, required: false, match: /^[0-9]+w$/ },
  tag: [
    {
      id: { type: Number, required: true },
      name: { type: String, required: true },
      slug: { type: String, required: true },
    },
  ],
  product_type: {
    type: String,
    required: true,
    enum: ['simple', 'variable'],
  },
  variations: [
    {
      id: { type: String, required: true },
      attribute_id: { type: Number, required: true },
      value: { type: String, required: true },
      attribute: {
        id: { type: Number, required: true },
        slug: { type: String, required: true },
        name: { type: String, required: true },
        values: [
          { id: { type: Number }, value: { type: String } },
        ],
      },
    },
  ],
  variation_options: [
    {
      id: { type: Number, required: true },
      title: { type: String, required: true },
      price: { type: Number, required: true },
      sale_price: { type: Number },
      quantity: { type: Number, required: true },
      is_disable: { type: Boolean, required: true },
      sku: { type: String, required: true },
      options: [
        {
          name: { type: String, required: true },
          value: { type: String, required: true },
        },
      ],
    },
  ],
});

// Pre-save hook to set min_price and max_price
productSchema.pre('save', function(next) {
  if (this.product_type === 'variable' && this.variation_options.length > 0) {
    const prices = this.variation_options.map(option => option.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Set the min_price and max_price based on variations
    this.min_price = minPrice;
    this.max_price = maxPrice;
  }

  next();
});

// Static Method for Stock Updates
productSchema.statics.updateStock = async function (productId, variationId, quantityChange) {
  const product = await this.findById(productId);
  if (!product) throw new Error(`Product with ID ${productId} not found`);

  if (product.product_type === 'variable') {
    const variation = product.variation_options.find((v) => v.id === variationId);
    if (!variation) throw new Error(`Variation with ID ${variationId} not found`);

    const newQuantity = variation.quantity + quantityChange;
    if (newQuantity < 0) {
      throw new Error(`Insufficient stock for variation. Available: ${variation.quantity}`);
    }
    variation.quantity = newQuantity;
  } else {
    const newQuantity = product.quantity + quantityChange;
    if (newQuantity < 0) {
      throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.quantity}`);
    }
    product.quantity = newQuantity;
  }

  await product.save();
};

// Indexing for better query performance
productSchema.index({ slug: 1 });
productSchema.index({ name: 1 });
productSchema.index({ id: 1 });

// Export Product Model
module.exports = mongoose.model('Product', productSchema);
