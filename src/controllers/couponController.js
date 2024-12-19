const axios = require('axios');
const Coupon = require('../models/coupon');
const logger = require('../utils/logger');

// External backend URL (replace with your actual backend API URL)
const COUPON_API_URL = 'https://steadfastpadibackend-1.onrender.com/api/v1/coupons';

// Fetch new coupons from the external API
async function fetchCouponsFromAPI() {
  try {
    const response = await axios.get(COUPON_API_URL);

    if (response.status === 200 && response.data && Array.isArray(response.data["coupon codes"])) {
      return response.data["coupon codes"];
    } else {
      throw new Error('Invalid response format from coupon API');
    }
  } catch (error) {
    logger.error(`Error fetching coupons from external API: ${error.message}`);
    return [];
  }
}

// Save new coupons to the database
async function saveNewCoupons(couponCodes) {
  try {
    for (const code of couponCodes) {
      // Check if coupon already exists in the database
      const existingCoupon = await Coupon.findOne({ code });

      if (!existingCoupon) {
        // Save new coupon if it doesn't exist
        const newCoupon = new Coupon({ code });
        await newCoupon.save();
        logger.info(`New coupon with code ${code} created.`);
      }
    }
  } catch (error) {
    logger.error(`Error saving new coupons: ${error.message}`);
  }
}

// Manually trigger the fetch and save process
exports.manualFetchCoupons = async (req, res) => {
  try {
    const couponCodes = await fetchCouponsFromAPI();
    if (couponCodes.length > 0) {
      await saveNewCoupons(couponCodes);
      return res.status(200).json({ message: 'New coupons fetched and saved successfully' });
    } else {
      return res.status(404).json({ message: 'No coupons fetched from the external API' });
    }
  } catch (error) {
    logger.error(`Error fetching and saving new coupons: ${error.message}`);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete a specific coupon by code
exports.deleteCoupon = async (req, res) => {
  const { couponCode } = req.params;
  try {
    const coupon = await Coupon.findOneAndDelete({ code: couponCode });

    if (coupon) {
      logger.info(`Coupon with code ${couponCode} deleted successfully.`);
      return res.status(200).json({ message: `Coupon with code ${couponCode} deleted successfully.` });
    } else {
      return res.status(404).json({ message: `Coupon with code ${couponCode} not found.` });
    }
  } catch (error) {
    logger.error(`Error deleting coupon with code ${couponCode}: ${error.message}`);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Fetch coupon codes and balances
exports.getCouponCodesAndBalance = async (req, res) => {
  try {
    const coupons = await Coupon.find({}, 'code balance');

    if (coupons.length > 0) {
      return res.status(200).json({ coupons });
    } else {
      return res.status(404).json({ message: 'No coupons found.' });
    }
  } catch (error) {
    logger.error(`Error fetching coupon codes and balances: ${error.message}`);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
