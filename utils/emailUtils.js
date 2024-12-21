const { mailtrapClient, sender } = require('../mailtrap/mailtrap.config');
const logger = require('./logger');  // Import the updated logger

const sendEmail = async (recipientEmail, subject, htmlContent) => {
  try {
    const message = {
      from: sender.email,
      to: recipientEmail,
      subject,
      html: htmlContent,
    };

    const sentMessage = await mailtrapClient.send(message);
    logger.info(`Email successfully sent to ${recipientEmail}`);  // Use the winston logger
    return sentMessage;
  } catch (error) {
    logger.error('Failed to send email', error);  // Use the winston logger
    throw new Error('Failed to send invoice email');
  }
};

module.exports = { sendEmail };
