const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2'); // For pagination
const slugify = require('slugify'); // For clean slug generation

// Comment Schema
const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: [true, 'Comment text is required'] },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
});

// Blog Schema
const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Blog title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [1000, 'Title must not exceed 1000 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Blog content is required'],
      minlength: [50, 'Content must be at least 50 characters long'],
    },
    excerpt: {
      type: String,
      required: [true, 'Excerpt is required'],
      maxlength: [300, 'Excerpt must not exceed 300 characters'],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tags: [
      {
        type: String,
        index: true,
        trim: true,
        validate: {
          validator: function (v) {
            return /^[\w\s-]+$/.test(v);
          },
          message: (props) => `${props.value} is not a valid tag`,
        },
      },
    ],
    categories: [
      {
        type: String,
        index: true,
        trim: true,
      },
    ],
    images: [
      {
        url: { type: String, required: true },
        caption: { type: String },
        alt: { type: String, trim: true },
      },
    ],
    comments: [commentSchema],
    views: { type: Number, default: 0 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lastRead: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        date: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    publishedAt: { type: Date },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt
);

// Indexing
blogSchema.index({ title: 'text', content: 'text', tags: 1, categories: 1 });

// Pre-save middleware for slug generation
blogSchema.pre('save', function (next) {
  if (!this.isModified('title')) return next();
  this.slug = slugify(this.title, { lower: true, strict: true });
  next();
});

// Pagination plugin
blogSchema.plugin(mongoosePaginate);

// Utility function for sanitizing input fields
const sanitizeInput = (value) => value.replace(/<[^>]*>?/gm, '');

// Middleware for sanitizing text fields
blogSchema.pre('validate', function (next) {
  this.title = sanitizeInput(this.title);
  this.content = sanitizeInput(this.content);
  this.excerpt = sanitizeInput(this.excerpt);
  next();
});

// Middleware to update `updatedAt` on any modification
blogSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model('Blog', blogSchema);
