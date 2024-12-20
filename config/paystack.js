const axios = require("axios");

const paystack = axios.create({
  baseURL: "https://api.paystack.co",
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  },
});

/**
 * Initialize a payment
 * @param {Object} data - {email, amount}
 */
const initializePayment = async (data) => {
  const response = await paystack.post("/transaction/initialize", data);
  return response.data;
};

/**
 * Verify a payment
 * @param {String} reference - Reference from Paystack
 */
const verifyPayment = async (reference) => {
  const response = await paystack.get(`/transaction/verify/${reference}`);
  return response.data;
};

module.exports = { initializePayment, verifyPayment };
