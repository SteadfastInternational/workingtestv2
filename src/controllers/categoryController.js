const Category = require('../models/Category');
const cloudinary = require('../config/cloudinary');
const path = require('path');
const logger = require('../config/logger'); // Import your logger

// Helper function to upload images
const uploadImageToCloudinary = async (imagePath) => {
  try {
    const result = await cloudinary.uploader.upload(imagePath, {
      folder: "categories", // Specify folder on Cloudinary
    });
    return {
      id: result.public_id,
      thumbnail: result.secure_url,
      original: result.secure_url,
    };
  } catch (error) {
    throw new Error(`Cloudinary Upload Failed: ${error.message}`);
  }
};

// Controller to create a category
const createCategory = async (req, res) => {
  try {
    const { name, slug, children } = req.body;
    let image = req.body.image;

    // Validate required fields
    if (!name || !slug) {
      return res.status(400).json({ message: "Name and Slug are required" });
    }

    // Check and upload image if not already on Cloudinary
    if (image && !image.original.includes("res.cloudinary.com")) {
      const imagePath = path.resolve(image.original); // Resolve path for local images
      image = await uploadImageToCloudinary(imagePath);
    }

    // Format children if provided
    const formattedChildren = (children || []).map((child, index) => ({
      id: index + 1,
      name: child.name,
      slug: child.slug,
    }));

    // Determine category type
    const type = formattedChildren.length > 0 ? "mega" : null;

    // Create the category object
    const category = new Category({
      id: await Category.countDocuments() + 1, // Auto-increment ID
      name,
      slug,
      type,
      image,
      children: formattedChildren,
    });

    // Save the category
    const savedCategory = await category.save();

    // Log category creation
    logger.info('Category created successfully:', savedCategory);

    res.status(201).json({
      message: "Category created successfully",
      data: savedCategory,
    });
  } catch (error) {
    // Log error during category creation
    logger.error(`Error creating category: ${error.message}`);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Helper function to delete an image from Cloudinary
const deleteImageFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    throw new Error(`Cloudinary Image Deletion Failed: ${error.message}`);
  }
};

// Controller to delete a category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the category by ID
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Delete image(s) associated with the category
    if (category.image && category.image.id) {
      await deleteImageFromCloudinary(category.image.id);
    }

    // Delete the category
    await category.remove();

    // Log category deletion
    logger.info(`Category deleted successfully: ${id}`);

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    // Log error during category deletion
    logger.error(`Error deleting category: ${error.message}`);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Controller to update a category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Find the category by ID
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Handle image updates
    if (updates.image) {
      const newImage = updates.image;
      // Check if the new image is hosted on Cloudinary
      if (!newImage.original.includes("res.cloudinary.com")) {
        // Delete the old image if it exists
        if (category.image && category.image.id) {
          await deleteImageFromCloudinary(category.image.id);
        }
        // Upload the new image to Cloudinary
        const uploadedImage = await uploadImageToCloudinary(newImage.original);
        updates.image = uploadedImage;
      }
    }

    // Handle children updates
    if (updates.children) {
      updates.children = updates.children.map((child, index) => ({
        id: index + 1,
        name: child.name,
        slug: child.slug,
      }));
    }

    // Update category type based on children
    if (updates.children && updates.children.length > 0) {
      updates.type = "mega";
    } else if (updates.children === undefined) {
      updates.type = category.children.length > 0 ? "mega" : null;
    }

    // Apply updates to the category
    Object.assign(category, updates);

    // Save the updated category
    const updatedCategory = await category.save();

    // Log category update
    logger.info(`Category updated successfully: ${id}`);

    res.status(200).json({
      message: "Category updated successfully",
      data: updatedCategory,
    });
  } catch (error) {
    // Log error during category update
    logger.error(`Error updating category: ${error.message}`);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Controller to fetch all categories
const getAllCategories = async (req, res) => {
  try {
    // Fetch all categories from the database
    const categories = await Category.find();

    // Return categories in JSON format
    res.status(200).json({
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  createCategory,
  deleteCategory,
  updateCategory,
  getAllCategories,
};
