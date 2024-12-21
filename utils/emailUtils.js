const { mailtrapClient, sender } = require('../mailtrap/mailtrap.config');
const logger = require('./logger');

const sendEmail = async (recipientEmail, subject, htmlContent) => {
  try {
    // Ensure recipientEmail is in the correct format (array of objects)
    const recipients = Array.isArray(recipientEmail)
      ? recipientEmail.map((email) => ({ email: String(email) }))
      : [{ email: String(recipientEmail) }];

    // Construct the message object
    const message = {
      from: {
        email: sender.email, // The email address to send from
        name: sender.name || 'Your Company', // Optionally add a name for the sender
      },
      to: recipients, // Ensure this is always an array of objects
      subject,
      html: htmlContent,
    };

    // Send the email using Mailtrap client
    const sentMessage = await mailtrapClient.send(message);
    logger.info(`Invoice successfully sent to ${recipients.map((r) => r.email).join(', ')}`);
    return sentMessage;
  } catch (error) {
    logger.error(`Failed to send invoice to ${recipientEmail}: ${error.message || error}`);
    throw new Error('Failed to send email');
  }
};

module.exports = { sendEmail };
