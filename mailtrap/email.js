// Import email templates and Mailtrap configuration
const { 
  PASSWORD_RESET_REQUEST_TEMPLATE, 
  PASSWORD_RESET_SUCCESS_TEMPLATE, 
  WELCOME_EMAIL_TEMPLATE,
  PAYMENT_SUCCESS_TEMPLATE,
  PAYMENT_FAILURE_TEMPLATE
} = require("./emailTemplates.js");

const { mailtrapClient, sender } = require("./mailtrap.config");

/**
 * Function to send password reset email
 * @param {string} email - The recipient's email address.
 * @param {string} resetURL - The URL for resetting the password.
 */
const sendPasswordResetEmail = async (email, resetURL) => {
  const recipient = [{ email }];
  try {
    // Replace placeholder in the template with dynamic values
    const emailBody = PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL);

    // Send email using Mailtrap client
    const response = await mailtrapClient.send({
      from: sender,
      to: recipient,
      subject: "Reset your password",
      html: emailBody,
      category: "Password Reset",
    });

    console.log("Password reset email sent successfully:", response);
  } catch (error) {
    console.error("Error sending password reset email:", error.message || error);
    throw new Error(`Error sending password reset email: ${error.message || error}`);
  }
};

/**
 * Function to send password reset success email
 * @param {string} email - The recipient's email address.
 */
const sendResetSuccessEmail = async (email) => {
  const recipient = [{ email }];
  try {
    // Send success email using Mailtrap client
    const response = await mailtrapClient.send({
      from: sender,
      to: recipient,
      subject: "Password Reset Successful",
      html: PASSWORD_RESET_SUCCESS_TEMPLATE,
      category: "Password Reset",
    });

    console.log("Password reset success email sent successfully:", response);
  } catch (error) {
    console.error("Error sending password reset success email:", error.message || error);
    throw new Error(`Error sending password reset success email: ${error.message || error}`);
  }
};

/**
 * Function to send welcome email after successful signup
 * @param {string} email - The recipient's email address.
 * @param {string} firstName - The user's first name.
 */
const sendWelcomeEmail = async (email, firstName) => {
  const recipient = [{ email }];
  try {
    // Replace placeholder in the template with dynamic values
    const emailBody = WELCOME_EMAIL_TEMPLATE.replace("{firstName}", firstName);

    // Send email using Mailtrap client
    const response = await mailtrapClient.send({
      from: sender,
      to: recipient,
      subject: "Welcome to Our Platform",
      html: emailBody,
      category: "Welcome Email",
    });

    console.log("Welcome email sent successfully:", response);
  } catch (error) {
    console.error("Error sending welcome email:", error.message || error);
    throw new Error(`Error sending welcome email: ${error.message || error}`);
  }
};

/**
 * Function to send payment success email
 * @param {string} email - The recipient's email address.
 * @param {string} firstName - The user's first name.
 * @param {number} amount - The amount paid.
 */
const sendPaymentSuccessEmail = async (email, firstName, amount) => {
  const recipient = [{ email }];
  try {
    // Replace placeholder in the template with dynamic values
    const emailBody = PAYMENT_SUCCESS_TEMPLATE.replace("{firstName}", firstName)
                                              .replace("{amount}", amount.toFixed(2));

    // Send payment success email using Mailtrap client
    const response = await mailtrapClient.send({
      from: sender,
      to: recipient,
      subject: "Payment Successful",
      html: emailBody,
      category: "Payment",
    });

    console.log("Payment success email sent successfully:", response);
  } catch (error) {
    console.error("Error sending payment success email:", error.message || error);
    throw new Error(`Error sending payment success email: ${error.message || error}`);
  }
};

/**
 * Function to send payment failure email
 * @param {string} email - The recipient's email address.
 * @param {string} firstName - The user's first name.
 * @param {number} amount - The amount attempted to pay.
 */
const sendPaymentFailureEmail = async (email, firstName, amount) => {
  const recipient = [{ email }];
  try {
    // Replace placeholder in the template with dynamic values
    const emailBody = PAYMENT_FAILURE_TEMPLATE.replace("{firstName}", firstName)
                                              .replace("{amount}", amount.toFixed(2));

    // Send payment failure email using Mailtrap client
    const response = await mailtrapClient.send({
      from: sender,
      to: recipient,
      subject: "Payment Failed",
      html: emailBody,
      category: "Payment",
    });

    console.log("Payment failure email sent successfully:", response);
  } catch (error) {
    console.error("Error sending payment failure email:", error.message || error);
    throw new Error(`Error sending payment failure email: ${error.message || error}`);
  }
};

// Exporting the email functions
module.exports = { 
  sendPasswordResetEmail, 
  sendResetSuccessEmail, 
  sendWelcomeEmail,
  sendPaymentSuccessEmail,
  sendPaymentFailureEmail 
};
