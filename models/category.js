const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  thumbnail: { type: String, required: true },
  original: { type: String, required: true },
});

const ChildSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  slug: { type: String, required: true },
});

const CategorySchema = new mongoose.Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  slug: { type: String, required: true },
  type: { type: String, default: null }, // Will be set to "mega" if children exist
  image: { type: ImageSchema, required: false },
  children: { type: [ChildSchema], default: [] },
});

// Pre-save middleware to set "type" to "mega" if children are present
CategorySchema.pre('save', function (next) {
  if (this.children && this.children.length > 0) {
    this.type = 'mega';
  }
  next();
});

const Category = mongoose.model('Category', CategorySchema);

module.exports = Category;
