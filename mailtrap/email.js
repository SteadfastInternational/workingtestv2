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
 * @param {string} userEmail - The recipient's email address.
 * @param {string} userName - The user's first name.
 * @param {number} amount - The amount paid.
 */
const sendPaymentSuccessEmail = async (userEmail, userName, amount) => {
  

  // Ensure userEmail is a string, not an object
  if (typeof userEmail !== 'string') {
    if (typeof userEmail === 'object') {
      console.log("userEmail is an object:", userEmail);
      userEmail = userEmail.email || '';  // Assuming 'email' is a key in the object
    }
    if (typeof userEmail !== 'string') {
      throw new Error(`Expected a string for userEmail but got: ${typeof userEmail}`);
    }
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userEmail)) {
    throw new Error(`Invalid email address provided: ${userEmail}`);
  }

  // Ensure recipient is an array of objects with a valid email string
  const recipient = [{ email: String(userEmail) }];

  // Ensure PAYMENT_SUCCESS_TEMPLATE is a function and is called with the proper arguments
  if (typeof PAYMENT_SUCCESS_TEMPLATE !== 'function') {
    throw new Error("Payment success email template is not defined correctly.");
  }

  try {
    // Generate the email body by calling the template function with the necessary arguments
    const emailBody = PAYMENT_SUCCESS_TEMPLATE(userName, amount);

    // Log email for debugging purposes
    console.log("Sending payment success email to:", recipient);

    // Send payment success email using Mailtrap client
    const response = await mailtrapClient.send({
      from: sender,
      to: recipient, // Pass recipient as an array of objects with valid email strings
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
 * @param {string} userEmail - The recipient's email address.
 * @param {string} userName - The user's name.
 * @param {number} amount - The amount attempted to pay.
 */
const sendPaymentFailureEmail = async (userEmail, userName, amount) => {
  // Log the userEmail for debugging purposes
 

  // Ensure userEmail is a string, not an object
  if (typeof userEmail !== 'string') {
    if (typeof userEmail === 'object') {
      console.log("userEmail is an object:", userEmail);
      userEmail = userEmail.email || '';  // Assuming 'email' is a key in the object
    }
    if (typeof userEmail !== 'string') {
      throw new Error(`Expected a string for userEmail but got: ${typeof userEmail}`);
    }
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userEmail)) {
    throw new Error(`Invalid email address provided: ${userEmail}`);
  }

  // Ensure recipient is an array of objects with a valid email string
  const recipient = [{ email: String(userEmail) }];

  // Ensure PAYMENT_FAILURE_TEMPLATE is a function and is called with proper arguments
  if (typeof PAYMENT_FAILURE_TEMPLATE !== 'function') {
    throw new Error("Payment failure email template is not defined correctly.");
  }

  try {
    // Generate the email body by calling the template function with necessary arguments
    const emailBody = PAYMENT_FAILURE_TEMPLATE(userName, amount);

    // Log email for debugging purposes
    console.log("Sending payment failure email to:", recipient);

    // Send payment failure email using Mailtrap client
    const response = await mailtrapClient.send({
      from: sender,
      to: recipient, // Pass recipient as an array of objects with valid email strings
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
