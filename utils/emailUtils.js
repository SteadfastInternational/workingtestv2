const { mailtrapClient, sender } = require('../mailtrap/mailtrap.config');
const logger = require('../utils/logger');

/**
 * Sends a general email to the customer.
 * @param {string} userEmail - Email recipient address or an object containing the 'email' property.
 * @param {string} subject - Email subject. Defaults to 'Payment Received - Invoice' if not provided.
 * @param {string} htmlContent - HTML content of the email.
 */
const sendEmail = async (userEmail, subject = 'Payment Received - Invoice', htmlContent) => {
  try {
    // Log the user email being received
    logger.info(`Received userEmail: ${JSON.stringify(userEmail)}`);

    // If userEmail is an object, try to extract the 'email' property
    if (typeof userEmail === 'object' && userEmail.email) {
      userEmail = userEmail.email; // Extract the email property if it's an object
    }

    // Validate recipient email format
    if (!userEmail || typeof userEmail !== 'string') {
      throw new Error(`Invalid email address provided: ${userEmail}`);
    }

    // Log the email after validation
    logger.info(`Validated userEmail: ${userEmail}`);

    // Validate email format using regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      throw new Error(`Invalid email format: ${userEmail}`);
    }

    // Ensure subject and HTML content are defined and valid
    if (!subject || typeof subject !== 'string') {
      throw new Error('Email subject is required and should be a string.');
    }
    if (!htmlContent || typeof htmlContent !== 'string') {
      throw new Error('Email content (HTML) is required and should be a string.');
    }

    // Construct the email message
    const message = {
      from: sender, // Ensure `sender` is correctly defined in your mailtrap configuration
      to: [userEmail], // Email recipient as an array of strings
      subject, // Email subject
      html: htmlContent, // HTML email body
    };

    // Send the email via Mailtrap
    await mailtrapClient.send(message);

    // Log success
    logger.info(`Email successfully sent to ${userEmail} with subject: ${subject}`);
  } catch (error) {
    // Log failure
    logger.error(`Failed to send email to ${userEmail}: ${error.message}`);
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

module.exports = { sendEmail };
