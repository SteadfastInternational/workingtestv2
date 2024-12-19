const twilio = require('twilio');
const { logError, logInfo } = require('./logger');

// Twilio Configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;

// Initialize Twilio client
const client = new twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

/**
 * Sends a WhatsApp message to the admin using Twilio.
 * @param {string} to - Phone number in the format 'whatsapp:+<number>'.
 * @param {string} message - The message to send.
 */
const sendWhatsAppMessage = async (to, message) => {
  try {
    logInfo(`Sending WhatsApp message to ${to}: ${message}`);
    await client.messages.create({
      from: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
      to,
      body: message,
    });
    logInfo('WhatsApp message sent successfully');
  } catch (error) {
    logError('Failed to send WhatsApp message', error);
  }
};

module.exports = {
  sendWhatsAppMessage,
};
