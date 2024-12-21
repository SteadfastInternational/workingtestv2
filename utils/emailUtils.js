const { mailtrapClient, sender } = require('../mailtrap/mailtrap.config');
const logger = require('./logger');

const sendEmail = async (recipientEmail, subject, htmlContent) => {
  try {
    const message = {
      from: {
        email: sender.email,  // The email address to send from
        name: sender.name || 'Your Company',  // Optionally add a name for the sender
      },
      to: recipientEmail,
      subject,
      html: htmlContent,
    };

    const sentMessage = await mailtrapClient.send(message);
    logger.info(`Email successfully sent to ${recipientEmail}`);
    return sentMessage;
  } catch (error) {
    logger.error('Failed to send email', error);
    throw new Error('Failed to send invoice email');
  }
};

module.exports = { sendEmail };
