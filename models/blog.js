const mongoose = require('mongoose');

// Define the schema for the Blog model
const blogSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    tags: { type: [String], required: true },  // Array of tags
    title: { type: String, required: true },
    date: { type: Date, default: Date.now, required: true },  // Automatically set the date to the current time
    author: { type: String, default: 'Steadfast International', required: true },  // Permanent author value
    avatar: { type: String, required: false },  // Optional avatar field
    thumbImg: { type: String, required: true },  // Thumbnail image (required)
    coverImg: { type: String, required: true },  // Cover image (required)
    subImg: { type: [String], required: false },  // Optional array of images
    shortDesc: { type: String, required: true },
    description: { type: String, required: true },
  },
  {
    timestamps: true,  // Automatically add createdAt and updatedAt fields
  }
);

// Create and export the Blog model
const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog;
