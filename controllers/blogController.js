const Blog = require('../models/blog'); // Import Blog Model
const cloudinary = require('../config/blogCloudinary');
const asyncHandler = require('express-async-handler');

// Create a Blog
exports.createBlog = asyncHandler(async (req, res) => {
  const { title, shortDesc, description, category, tag, thumbImg, coverImg, subImg } = req.body;

  // Validate required fields
  if (!title || !shortDesc || !description || !category || !tag || !thumbImg || !coverImg) {
    return res.status(400).json({ message: 'All required fields must be filled' });
  }

  // Upload images to Cloudinary if provided
  const images = [];
  if (req.files && req.files.subImages) {
    for (const file of req.files.subImages) {
      const uploadResult = await cloudinary.uploader.upload(file.path, { folder: 'blogs' });
      images.push(uploadResult.secure_url);
    }
  }

  // Create a new blog entry with the permanent 'Steadfast International' author
  const blog = new Blog({
    title,
    shortDesc,
    description,
    category,
    tag,
    author: 'Steadfast International', // Set the author as "Steadfast International"
    thumbImg,
    coverImg,
    subImg: images,
  });

  // Save the blog
  const savedBlog = await blog.save();
  res.status(201).json(savedBlog);
});

// Update a Blog
exports.updateBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, shortDesc, description, category, tag, thumbImg, coverImg, subImg } = req.body;

  // Find the blog by ID
  const blog = await Blog.findById(id);

  if (!blog) {
    return res.status(404).json({ message: 'Blog not found' });
  }

  // Update fields
  if (title) blog.title = title;
  if (shortDesc) blog.shortDesc = shortDesc;
  if (description) blog.description = description;
  if (category) blog.category = category;
  if (tag) blog.tag = tag;
  if (thumbImg) blog.thumbImg = thumbImg;
  if (coverImg) blog.coverImg = coverImg;
  if (subImg) blog.subImg = subImg;

  // Handle image updates
  if (req.files && req.files.subImages) {
    for (const file of req.files.subImages) {
      const uploadResult = await cloudinary.uploader.upload(file.path, { folder: 'blogs' });
      blog.subImg.push(uploadResult.secure_url);
    }
  }

  // Save the updated blog
  const updatedBlog = await blog.save();
  res.status(200).json(updatedBlog);
});

// Delete a Blog
exports.deleteBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find the blog by ID
  const blog = await Blog.findById(id);

  if (!blog) {
    return res.status(404).json({ message: 'Blog not found' });
  }

  // Remove associated images from Cloudinary
  for (const image of blog.subImg) {
    const publicId = image.split('/').pop().split('.')[0];
    await cloudinary.uploader.destroy(`blogs/${publicId}`);
  }

  // Remove the blog
  await blog.remove();
  res.status(200).json({ message: 'Blog deleted successfully' });
});

// Fetch Blogs with Pagination and Optional Search, including category filter
exports.getBlogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = '', category = '' } = req.query;

  const query = {};
  
  // Search by text content if search term is provided
  if (search) {
    query.$text = { $search: search };  // Text search
  }

  // Filter by category if provided
  if (category) {
    query.category = category;  // Filter by category
  }

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: { createdAt: -1 },  // Sort by creation date in descending order
  };

  try {
    const blogs = await Blog.paginate(query, options);  // Paginate blogs
    res.status(200).json(blogs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching blogs', error });
  }
});

// Fetch Single Blog and Increment Views
exports.getBlogById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find the blog by ID and populate author and images
  const blog = await Blog.findById(id).populate('author');

  if (!blog) {
    return res.status(404).json({ message: 'Blog not found' });
  }

  // Increment views
  blog.views = (blog.views || 0) + 1;
  await blog.save();

  res.status(200).json(blog);
});
