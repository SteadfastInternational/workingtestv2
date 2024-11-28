const mongoose = require('mongoose'); // Import Cloudinary SDK
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
        id: 1, // You can assign a unique ID here, or dynamically generate if needed
        thumbnail: uploadedThumbnailUrl,
        original: uploadedOriginalUrl,
      },
      gallery: uploadedGalleryUrls.map((url, index) => ({
        id: index + 1, // Adding IDs to gallery images dynamically
        thumbnail: url,
        original: url,
      })),
      min_price, // Automatically calculated
      max_price, // Automatically calculated
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

    const products = await Product.find()
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder });

    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);

    // Pagination check: if requested page exceeds available pages
    if (page > totalPages) {
      return res.status(400).json({
        success: false,
        message: 'Page number exceeds available pages',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Products fetched successfully',
      products,
      totalProducts,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching products',
    });
  }
};

// Fetch Products Based on Search Criteria (name, slug, tags)

exports.searchProducts = async (req, res) => {
  try {
    const searchTerm = req.params.term;
    console.log("Search term received:", searchTerm);

    // Construct the $search query using MongoDB Atlas Full-Text Search
    const searchQuery = {
      $search: {
        index: "default", // Replace with your custom index name, if applicable
        compound: {
          should: [
            {
              text: {
                query: searchTerm,
                path: "name",
                score: { boost: { value: 5 } }, // High priority boost
                fuzzy: { maxEdits: 2, prefixLength: 2 }, // Allow typos and autocomplete
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
                fuzzy: { maxEdits: 1, prefixLength: 2 }, // Apply fuzzy matching
              },
            },
          ],
        },
      },
    };

    // Execute the aggregation pipeline with the $search stage
    const products = await Product.aggregate([
      searchQuery,
      { $limit: 100 }, // Limit the results to the top 10 matches
      {
        $project: {
          name: 1,
          description: 1,
          watt: 1,
          bodyColor: 1,
          "variation_options.title": 1,
          slug: 1,
          score: { $meta: "searchScore" }, // Include search scores for debugging or ranking
        },
      },
    ]);

    // Return products or a message if none found
    if (products.length > 0) {
      return res.json({ success: true, message: "Products fetched successfully", products });
    } else {
      return res.json({ success: false, message: "No products found" });
    }
  } catch (err) {
    console.error("Error encountered:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
