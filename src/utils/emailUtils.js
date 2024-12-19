// utils/emailUtils.js
const { mailtrapClient, sender } = require('../mailtrap/mailtrap.config');
const { logError, logInfo } = require('./logger');

const sendEmail = async (recipientEmail, subject, htmlContent) => {
  try {
    const message = {
      from: sender.email,
      to: recipientEmail,
      subject,
      html: htmlContent,
    };

    const sentMessage = await mailtrapClient.send(message);
    logInfo(`Email successfully sent to ${recipientEmail}`);
    return sentMessage;
  } catch (error) {
    logError('Failed to send email', error);
    throw new Error('Failed to send invoice email');
  }
};

module.exports = { sendEmail };
