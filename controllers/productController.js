const mongoose = require('mongoose'); 
const Product = require('../models/products'); // Assuming the Product model is in models/Product.js
const cloudinary = require('cloudinary').v2;

require('dotenv').config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to upload images to Cloudinary
const uploadImageToCloudinary = async (image) => {
  try {
    const result = await cloudinary.uploader.upload(image, {
      folder: 'product_images', // Specify a folder for better organization
    });
    return result.secure_url; // Return the URL of the uploaded image
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error); // Log the error for debugging
    throw new Error('Error uploading image to Cloudinary: ' + error.message);
  }
};

// Create Product with Image URLs (from JSON file)
// Create Product with Image URLs (from JSON file)
exports.createProduct = async (req, res) => {
  try {
    const {
      id,
      name,
      slug,
      description,
      quantity,
      price,
      sale_price,
      watt, // Updated to match the schema field
      bodyColor,
      weight,
      tag,
      product_type,
      variation_options,
      image,
      gallery,
    } = req.body;

    // Validate gallery structure
    if (gallery && !Array.isArray(gallery)) {
      return res.status(400).json({
        success: false,
        message: 'Gallery should be an array of image URLs',
      });
    }

    // Validate each gallery URL is valid
    if (gallery && gallery.some(item => !/^https?:\/\/[^\s]+$/.test(item.original))) {
      return res.status(400).json({
        success: false,
        message: 'Each gallery item must have valid URLs for "original" and "thumbnail"',
      });
    }

    // Check if variation_options are provided and ensure it has at least one variation
    if (!variation_options || variation_options.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product must have at least one variation option',
      });
    }

    // Calculate min_price and max_price based on variation price and sale_price
    const variationPrices = variation_options.map(option => option.sale_price || option.price);
    const min_price = Math.min(...variationPrices);
    const max_price = Math.max(...variationPrices);

    if (isNaN(min_price) || isNaN(max_price)) {
      return res.status(400).json({
        success: false,
        message: 'Variation prices must be valid numbers',
      });
    }

    if (min_price > max_price) {
      return res.status(400).json({
        success: false,
        message: 'Min price cannot be greater than max price',
      });
    }

    // Upload images to Cloudinary unless already hosted there
    const uploadImage = async (url) => {
      if (url.includes('res.cloudinary.com')) {
        return url; // Skip upload if already hosted on Cloudinary
      }
      return await uploadImageToCloudinary(url);
    };

    const uploadedThumbnailUrl = await uploadImage(image.thumbnail);
    const uploadedOriginalUrl = await uploadImage(image.original);

    const uploadedGalleryUrls = gallery
      ? await Promise.all(
          gallery.map(async (item) => ({
            id: item.id,
            thumbnail: await uploadImage(item.thumbnail),
            original: await uploadImage(item.original),
          }))
        )
      : [];

    // Validate 'watt' field
    if (watt && !/^[0-9]+w[a-z]*$/i.test(watt)) {
      return res.status(400).json({
        success: false,
        message: 'Watt field must be an alphanumeric string like "12w" or "12watt"',
      });
    }

    // Create new product
    const newProduct = new Product({
      id,
      name,
      slug,
      description,
      quantity,
      price,
      sale_price,
      watt,
      bodyColor,
      weight,
      tag,
      product_type,
      variation_options,
      image: {
        id: 1, // Assigning a unique ID
        thumbnail: uploadedThumbnailUrl,
        original: uploadedOriginalUrl,
      },
      gallery: uploadedGalleryUrls,
      min_price,
      max_price,
    });

    await newProduct.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: newProduct,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating product',
    });
  }
};
// Update Product with Image URLs (from JSON file)
exports.updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const {
      name,
      slug,
      description,
      quantity,
      price,
      sale_price,
      watt,
      bodyColor,
      weight,
      tag,
      product_type,
      variation_options,
      image,
      gallery,
    } = req.body;

    // Validate required fields for image URLs
    if (!image || !image.thumbnail || !image.original) {
      return res.status(400).json({
        success: false,
        message: 'Main image URLs (thumbnail and original) are required',
      });
    }

    // Validate gallery URLs
    if (gallery && !Array.isArray(gallery)) {
      return res.status(400).json({
        success: false,
        message: 'Gallery should be an array of image URLs',
      });
    }

    // Validate each gallery URL is valid
    if (gallery && gallery.some(url => !/^https?:\/\/[^\s]+$/.test(url))) {
      return res.status(400).json({
        success: false,
        message: 'Each gallery item must be a valid URL',
      });
    }

    // Check if variation_options are provided and ensure it has at least one variation
    if (!variation_options || variation_options.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product must have at least one variation option',
      });
    }

    // Calculate min_price and max_price based on variation price and sale_price
    const variationPrices = variation_options.map(option => {
      // Use sale_price if available, otherwise fallback to price
      const priceToUse = option.sale_price || option.price;
      return priceToUse;
    });

    const min_price = Math.min(...variationPrices);
    const max_price = Math.max(...variationPrices);

    // Validate min_price and max_price if they are numbers
    if (isNaN(min_price) || isNaN(max_price)) {
      return res.status(400).json({
        success: false,
        message: 'Variation prices must be valid numbers',
      });
    }

    if (min_price && max_price && min_price > max_price) {
      return res.status(400).json({
        success: false,
        message: 'Min price cannot be greater than max price',
      });
    }

    // Upload images to Cloudinary
    const uploadedThumbnailUrl = await uploadImageToCloudinary(image.thumbnail);
    const uploadedOriginalUrl = await uploadImageToCloudinary(image.original);

    const uploadedGalleryUrls = gallery
      ? await Promise.all(gallery.map(url => uploadImageToCloudinary(url)))
      : [];

    // Validate 'watt' field - Optional but should follow the alphanumeric pattern (e.g., 12w or 12watt)
    if (watt && !/^[0-9]+w[a-z]*$/i.test(watt)) {
      return res.status(400).json({
        success: false,
        message: 'Watt field must be an alphanumeric string like "12w" or "12watt"',
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        name,
        slug,
        description,
        quantity,
        price,
        sale_price,
        watt,
        bodyColor,
        weight,
        tag,
        product_type,
        variation_options,
        image: {
          id: 1, // You can assign a unique ID here or dynamically generate if needed
          thumbnail: uploadedThumbnailUrl,
          original: uploadedOriginalUrl,
        },
        gallery: uploadedGalleryUrls.map((url, index) => ({
          id: index + 1, // Dynamically assigning an ID to each gallery image
          thumbnail: url,
          original: url,
        })),
        min_price, // Automatically calculated
        max_price, // Automatically calculated
      },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating product',
    });
  }
};

// Fetch All Products (with pagination and optional sorting)
exports.getAllProducts = async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Sorting parameters
    const sortBy = req.query.sortBy || 'name'; // Default sort by name
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1; // Default sort ascending

    // Fetching products with pagination and sorting
    const products = await Product.find()
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder });

    // Return only the products
    res.status(200).json(products);
  } catch (error) {
    // Return an empty array in case of server error
    res.status(500).json([]);
  }
};

// Fetch Products Based on Search Criteria (name, slug, tags)

exports.searchProducts = async (req, res) => {
  try {
    // Extract the search term from request parameters
    const searchTerm = req.params.searchTerm; // Match the parameter name in the route
    console.log("Search term received:", searchTerm);

    // Check if the search term is provided
    if (!searchTerm || searchTerm.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search term is required and cannot be empty.",
      });
    }

    console.log("Search term received:", searchTerm);

    // Construct the $search query using MongoDB Atlas Full-Text Search
    const searchQuery = {
      $search: {
        index: "default", // Replace with your custom index name if applicable
        compound: {
          should: [
            {
              text: {
                query: searchTerm,
                path: "name",
                score: { boost: { value: 5 } },
                fuzzy: { maxEdits: 2, prefixLength: 2 },
              },
            },
            {
              text: {
                query: searchTerm,
                path: "description",
                score: { boost: { value: 3 } },
                fuzzy: { maxEdits: 2, prefixLength: 2 },
              },
            },
            {
              text: {
                query: searchTerm,
                path: "watt",
                score: { boost: { value: 2 } },
                fuzzy: { maxEdits: 1 },
              },
            },
            {
              text: {
                query: searchTerm,
                path: "bodyColor",
                score: { boost: { value: 2 } },
                fuzzy: { maxEdits: 1 },
              },
            },
            {
              text: {
                query: searchTerm,
                path: [
                  "slug",
                  "tag.name",
                  "tag.slug",
                  "variations.value",
                  "variation_options.title",
                ],
                fuzzy: { maxEdits: 1, prefixLength: 2 },
              },
            },
          ],
        },
      },
    };

    // Execute the aggregation pipeline with the $search stage
    const products = await Product.aggregate([
      searchQuery,
      { $limit: 100 }, // Limit the results to the top 100 matches
      {
        $project: {
          name: 1,
          description: 1,
          watt: 1,
          bodyColor: 1,
          "variation_options.title": 1,
          slug: 1,
          score: { $meta: "searchScore" },
        },
      },
    ]);

    // Respond with the fetched products or a message if none are found
    if (products.length > 0) {
      return res.status(200).json({
        success: true,
        message: "Products fetched successfully.",
        products,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "No products found.",
      });
    }
  } catch (err) {
    // Log and respond with the error details
    console.error("Error in searchProducts:", err.message);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching products. Please try again later.",
    });
  }
};




exports.getProductById = async (req, res) => {
  try {
    const { productId } = req.params;

    // Check if productId is provided
    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required in the URL params.' });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ success: false, message: `Product not found for productId: ${productId}` });
    }

    return res.json({ success: true, product });
  } catch (err) {
    console.error("Error fetching product data:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};






exports.getProductBySlug = async (req, res) => {
  try {
    // Fetching the slug from the request parameters
    const slug = req.params.slug;

    // Find the product with the matching slug
    const product = await Product.findOne({ slug });

    if (!product) {
      // If no product is found, return a 404 error
      return res.status(404).json({ message: 'Product not found' });
    }

    // Return the product as JSON if found
    res.status(200).json(product);
  } catch (error) {
    // Handle server errors and respond with an appropriate message
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
