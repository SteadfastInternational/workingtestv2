const express = require('express');
const router = express.Router();
const CouponController = require('../controllers/couponController');

// Route to manually fetch and save new coupons
router.get('/manual-fetch', CouponController.manualFetchCoupons);

module.exports = router;
