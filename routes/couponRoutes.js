const express = require('express');
const router = express.Router();
const CouponController = require('../controllers/couponController');

// Route to manually fetch and save new coupons
router.get('/manual-fetch', CouponController.manualFetchCoupons);

// Route to delete a specific coupon by code
router.delete('/delete/:couponCode', CouponController.deleteCoupon);

// Route to fetch all coupon codes and their balances
router.get('/codes-and-balance', CouponController.getCouponCodesAndBalance);

module.exports = router;
