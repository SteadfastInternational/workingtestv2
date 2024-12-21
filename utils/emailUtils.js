/**
 * Sends a general email to the customer.
 * @param {string} userEmail - Email recipient address.
 * @param {string} subject - Email subject.
 * @param {string} htmlContent - HTML content of the email.
 */
const sendEmail = async (userEmail, subject, htmlContent) => {
  try {
    // Validate recipient email
    if (!userEmail || typeof userEmail !== 'string') {
      throw new Error(`Invalid email address provided: ${userEmail}`);
    }

    // Ensure subject and HTML content are defined
    if (!subject || typeof subject !== 'string') {
      throw new Error('Email subject is required.');
    }
    if (!htmlContent || typeof htmlContent !== 'string') {
      throw new Error('Email content (HTML) is required.');
    }

    // Construct the email message
    const message = {
      from: sender, // Ensure `sender` is correctly defined
      to: [userEmail], // Email recipient as an array of strings
      subject, // Email subject
      html: htmlContent, // HTML email body
    };

    // Send the email via Mailtrap
    await mailtrapClient.send(message);
    logger.info(`Email sent to ${userEmail} with subject: ${subject}`);
  } catch (error) {
    logger.error(`Failed to send email to ${userEmail}: ${error.message}`);
    throw new Error(`Email sending failed: ${error.message}`);
  }
};
