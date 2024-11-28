// services/emailService.js
const nodemailer = require('nodemailer');

// Configure Nodemailer transport
const transporter = nodemailer.createTransport({
  service: 'gmail', // You can use any email service you prefer
  auth: {
    user: process.env.EMAIL_USER, // Email service username
    pass: process.env.EMAIL_PASS, // Email service password
  },
});

// Function to send email
const sendEmail = (to, subject, text, html) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
    html,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
