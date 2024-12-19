const Blog = require('../models/blog'); // Import Blog Model
const cloudinary = require('../config/blogCloudinary');
const asyncHandler = require('express-async-handler');

// Create a Blog
exports.createBlog = asyncHandler(async (req, res) => {
  const { title, content, excerpt, author, tags, categories } = req.body;

  if (!title || !content || !excerpt || !author) {
    return res.status(400).json({ message: 'All required fields must be filled' });
  }

  // Upload images to Cloudinary if provided
  const images = [];
  if (req.files && req.files.images) {
    for (const file of req.files.images) {
      const uploadResult = await cloudinary.uploader.upload(file.path, {
        folder: 'blogs',
      });
      images.push({ url: uploadResult.secure_url, alt: file.originalname });
    }
  }

  const blog = new Blog({
    title,
    content,
    excerpt,
    author,
    tags,
    categories,
    images,
  });

  const savedBlog = await blog.save();
  res.status(201).json(savedBlog);
});

// Update a Blog
exports.updateBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, content, excerpt, tags, categories, status } = req.body;

  const blog = await Blog.findById(id);

  if (!blog) {
    return res.status(404).json({ message: 'Blog not found' });
  }

  // Update fields
  if (title) blog.title = title;
  if (content) blog.content = content;
  if (excerpt) blog.excerpt = excerpt;
  if (tags) blog.tags = tags;
  if (categories) blog.categories = categories;
  if (status) blog.status = status;

  // Handle image updates
  if (req.files && req.files.images) {
    for (const file of req.files.images) {
      const uploadResult = await cloudinary.uploader.upload(file.path, {
        folder: 'blogs',
      });
      blog.images.push({ url: uploadResult.secure_url, alt: file.originalname });
    }
  }

  const updatedBlog = await blog.save();
  res.status(200).json(updatedBlog);
});

// Delete a Blog
exports.deleteBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const blog = await Blog.findById(id);

  if (!blog) {
    return res.status(404).json({ message: 'Blog not found' });
  }

  // Remove associated images from Cloudinary
  for (const image of blog.images) {
    const publicId = image.url.split('/').pop().split('.')[0];
    await cloudinary.uploader.destroy(`blogs/${publicId}`);
  }

  await blog.remove();
  res.status(200).json({ message: 'Blog deleted successfully' });
});

// Fetch Blogs with Pagination and Optional Search
exports.getBlogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = '', category = '' } = req.query;

  const query = {};
  if (search) {
    query.$text = { $search: search };
  }
  if (category) {
    query.categories = category;
  }

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    populate: 'author',
    sort: { createdAt: -1 },
  };

  try {
    const blogs = await Blog.paginate(query, options);
    res.status(200).json(blogs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching blogs', error });
  }
});

// Fetch Single Blog and Increment Views
exports.getBlogById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const blog = await Blog.findById(id).populate('author comments.user');

  if (!blog) {
    return res.status(404).json({ message: 'Blog not found' });
  }

  // Increment views
  blog.views += 1;
  await blog.save();

  res.status(200).json(blog);
});
