const Joi = require('joi');
const Address = require('../models/Address');
const logger = require('../utils/logger');

// Joi schema for request validation
const addressSchema = Joi.object({
  phoneNumber: Joi.string().required(),
  email: Joi.string().email().required(),
  city: Joi.string().required(),
  deliveryAddress: Joi.string().required(),
  region: Joi.string().required(),
  zipCode: Joi.string().required(),
});

// Create an address
exports.createAddress = async (req, res) => {
  try {
    const userId = req.user.id;

    // Validate the request body
    const { error } = addressSchema.validate(req.body, { abortEarly: false }); // Include all validation errors
    if (error) {
      return res.status(400).json({
        status: 'fail',
        message: error.details.map(detail => detail.message).join(', '), // Return all error messages
      });
    }

    // Check for duplicate address
    const existingAddress = await Address.findOne({
      userId,
      city: req.body.city,
      deliveryAddress: req.body.deliveryAddress,
    });

    if (existingAddress) {
      logger.warn(`User ${userId} attempted to add a duplicate address.`);
      return res.status(400).json({
        status: 'fail',
        message: 'This address already exists. Please provide a unique address.',
      });
    }

    // Create a new address
    const newAddress = await Address.create({
      ...req.body,
      userId,
    });

    res.status(201).json({
      status: 'success',
      data: newAddress,
    });
  } catch (error) {
    logger.error(`Error creating address for user ${req.user.id}: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while creating the address.',
    });
  }
};

// Update an address
exports.updateAddress = async (req, res) => {
  try {
    const { id } = req.params; // Address ID to update
    const userId = req.user.id; // Assume `req.user` contains authenticated user's info

    // Find the existing address
    const address = await Address.findOne({ _id: id, userId });

    if (!address) {
      logger.warn(`User ${userId} tried to update an address with ID ${id}, but no such address exists or they lack permission.`);
      return res.status(404).json({
        status: 'fail',
        message: 'Address not found or you do not have permission to edit this address.',
      });
    }

    // Compare and update only the fields that have changed
    const updatedAddressData = {};

    // Check if each field has changed and update it if necessary
    if (req.body.zipCode && req.body.zipCode !== address.zipCode) {
      updatedAddressData.zipCode = req.body.zipCode;
    }

    if (req.body.deliveryAddress && req.body.deliveryAddress !== address.deliveryAddress) {
      updatedAddressData.deliveryAddress = req.body.deliveryAddress;
    }
    if (req.body.phoneNumber && req.body.phoneNumber !== address.phoneNumber) {
      updatedAddressData.phoneNumber = req.body.phoneNumber;
    }

    if (req.body.email && req.body.email !== address.email) {
      updatedAddressData.email = req.body.email;
    }

    if (req.body.city && req.body.city !== address.city) {
      updatedAddressData.city = req.body.city;
    }

    if (req.body.region && req.body.region !== address.region) {
      updatedAddressData.region = req.body.region;
    }

    // If no changes, respond with an informative message
    if (Object.keys(updatedAddressData).length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'No fields were updated as the provided data is the same as the existing one.',
      });
    }

    // Update the address with the new data
    const updatedAddress = await Address.findOneAndUpdate(
      { _id: id, userId },
      updatedAddressData, // Only update the fields that were changed
      { new: true, runValidators: true } // Return the updated document
    );

    logger.info(`User ${userId} updated address with ID ${id}.`);

    res.status(200).json({
      status: 'success',
      data: updatedAddress,
    });
  } catch (error) {
    logger.error(`Error updating address for user ${req.user.id} with ID ${req.params.id}: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating the address.',
    });
  }
};

// Delete an address
exports.deleteAddress = async (req, res) => {
  try {
    const { id } = req.params; // Address ID to delete
    const userId = req.user.id; // Assume `req.user` contains authenticated user's info

    // Find and delete the address
    const address = await Address.findOneAndDelete({ _id: id, userId });

    if (!address) {
      logger.warn(`User ${userId} tried to delete an address with ID ${id}, but no such address exists or they lack permission.`);
      return res.status(404).json({
        status: 'fail',
        message: 'Address not found or you do not have permission to delete this address.',
      });
    }

    logger.info(`User ${userId} deleted address with ID ${id}.`);
    res.status(204).json({
      status: 'success',
      message: 'Address deleted successfully.',
    });
  } catch (error) {
    logger.error(`Error deleting address for user ${req.user.id} with ID ${req.params.id}: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while deleting the address.',
    });
  }
};

// Get an address
exports.getAddress = async (req, res) => {
  try {
    const { id } = req.params; // Address ID to fetch
    const userId = req.user.id; // Get the authenticated user's ID from the request

    // Find the address by ID and ensure it belongs to the authenticated user
    const address = await Address.findOne({ _id: id, userId });

    if (!address) {
      // If address is not found, return a default address object
      const defaultAddress = {
        firstName: 'Default',
        lastName: 'User',
        phoneNumber: '0000000000',
        email: 'default@example.com',
        city: 'Default City',
        deliveryAddress: '123 Default Street',
        region: 'Default Region',
        zipCode: '00000',
        formattedAddress: 'Please edit your default home address or add a new one',
      };

      return res.status(200).json({
        status: 'success',
        message: 'No address found, returning default address.',
        data: defaultAddress,
      });
    }

    // If address exists, return the fetched address
    res.status(200).json({
      status: 'success',
      data: address,
    });
  } catch (error) {
    logger.error(`Error fetching address for user ${req.user.id} with ID ${req.params.id}: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching the address.',
    });
  }
};

// Fetch all addresses for a user
exports.getAllAddresses = async (req, res) => {
  try {
    const userId = req.user.id; // Get the authenticated user's ID from the request

    // Find all addresses belonging to the authenticated user
    const addresses = await Address.find({ userId });

    if (addresses.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'No addresses found for this user.',
        data: [], // Return an empty array if no addresses are found
      });
    }

    // Return the found addresses
    res.status(200).json({
      status: 'success',
      data: addresses,
    });
  } catch (error) {
    logger.error(`Error fetching all addresses for user ${req.user.id}: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching the addresses.',
    });
  }
};
