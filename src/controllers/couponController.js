const axios = require('axios');
const Coupon = require('../models/coupon');
const logger = require('../utils/logger');
const cron = require('node-cron');

// External backend URL (replace with your actual backend API URL)
const COUPON_API_URL = 'https://your-external-backend.com/api/coupons/list';

// Fetch new coupons from the external API
async function fetchCouponsFromAPI() {
  try {
    const response = await axios.get(COUPON_API_URL);

    if (response.status === 200 && response.data && Array.isArray(response.data)) {
      return response.data;
    } else {
      throw new Error('Invalid response from coupon API');
    }
  } catch (error) {
    logger.error(`Error fetching coupons from external API: ${error.message}`);
    return [];
  }
}

// Save new coupons to the database
async function saveNewCoupons(coupons) {
  try {
    for (const coupon of coupons) {
      // Check if coupon already exists in the database
      const existingCoupon = await Coupon.findOne({ code: coupon.code });

      if (!existingCoupon) {
        // Save new coupon if it doesn't exist
        const newCoupon = new Coupon({
          code: coupon.code,
          discountPercentage: coupon.discountPercentage,
          expirationDate: coupon.expirationDate,
          balance: coupon.balance,  // This is the initial balance (discounted value)
          usageCount: coupon.usageCount || 0, // Initialize usage count to 0 if not provided
        });

        await newCoupon.save();
        logger.info(`New coupon with code ${coupon.code} created.`);
      }
    }
  } catch (error) {
    logger.error(`Error saving new coupons: ${error.message}`);
  }
}

// Fetch and update new coupons every 1 minute using cron job
cron.schedule('*/1 * * * *', async () => {
  logger.info('Starting to fetch new coupons...');

  const coupons = await fetchCouponsFromAPI();
  if (coupons.length > 0) {
    await saveNewCoupons(coupons);
    logger.info('New coupons fetched and saved successfully.');
  } else {
    logger.warn('No coupons fetched from the external API.');
  }
});

// Optional: Manually trigger the fetch and save process
exports.manualFetchCoupons = async (req, res) => {
  try {
    const coupons = await fetchCouponsFromAPI();
    if (coupons.length > 0) {
      await saveNewCoupons(coupons);
      return res.status(200).json({ message: 'New coupons fetched and saved successfully' });
    } else {
      return res.status(404).json({ message: 'No coupons fetched from the external API' });
    }
  } catch (error) {
    logger.error(`Error fetching and saving new coupons: ${error.message}`);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
