// Template for the password reset request email
const PASSWORD_RESET_REQUEST_TEMPLATE = `
  <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .email-container {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          background-color: #fff;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .email-header {
          text-align: center;
          margin-bottom: 20px;
        }
        .email-header h2 {
          margin: 0;
          color: #007bff;
        }
        .email-body {
          font-size: 16px;
        }
        .email-footer {
          text-align: center;
          font-size: 0.9em;
          color: #777;
          margin-top: 20px;
        }
        .email-footer p {
          margin: 0;
        }
        .button {
          display: inline-block;
          background-color: #007BFF;
          color: #fff;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin-top: 15px;
        }
        .button:hover {
          background-color: #0056b3;
        }
        .disclaimer {
          font-size: 0.9em;
          color: #777;
          margin-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h2>Password Reset Request</h2>
        </div>
        <div class="email-body">
          <p>Hello,</p>
          <p>We received a request to reset your password. Please click the button below to reset it:</p>
          <a href="{resetURL}" class="button">Reset Password</a>
          <p class="disclaimer">This link will expire in 1 hour. If you did not request a password reset, please ignore this email.</p>
        </div>
        <div class="email-footer">
          <p>Best regards,</p>
          <p><strong>Your Company Name</strong></p>
          <p>If you have any questions, feel free to contact our support team.</p>
        </div>
      </div>
    </body>
  </html>
`;
// Template for the password reset success email
const PASSWORD_RESET_SUCCESS_TEMPLATE = `
  <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .email-container {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          background-color: #fff;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .email-header {
          text-align: center;
          margin-bottom: 20px;
        }
        .email-header h2 {
          margin: 0;
          color: #28a745;
        }
        .email-body {
          font-size: 16px;
        }
        .email-footer {
          text-align: center;
          font-size: 0.9em;
          color: #777;
          margin-top: 20px;
        }
        .email-footer p {
          margin: 0;
        }
        .disclaimer {
          font-size: 0.9em;
          color: #777;
        }
        .icon {
          width: 30px;
          vertical-align: middle;
          margin-right: 8px;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h2><img src="https://example.com/success-icon.png" alt="Success Icon" class="icon" /> Password Reset Successful 🎉</h2>
        </div>
        <div class="email-body">
          <p>Hello,</p>
          <p>Your password has been successfully reset! 🔑 You can now use your new password to log in to your account.</p>
          <p>If you did not request a password reset, please contact our support team immediately. ⚠️</p>
        </div>
        <div class="email-footer">
          <p>Best regards,</p>
          <p><strong>Your Company Name</strong></p>
          <p>If you have any concerns, please don't hesitate to reach out to us. 💬</p>
        </div>
      </div>
    </body>
  </html>
`;

// Template for the welcome email
const WELCOME_EMAIL_TEMPLATE = `
  <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-image: url('https://example.com/background-image.jpg'); /* Replace with your lamp and bulbs background image URL */
          background-size: cover;
          margin: 0;
          padding: 0;
        }
        .email-container {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          background-color: rgba(255, 255, 255, 0.9);
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .email-header {
          text-align: center;
          margin-bottom: 20px;
        }
        .email-header h2 {
          margin: 0;
          color: #007bff;
        }
        .email-body {
          font-size: 16px;
        }
        .email-footer {
          text-align: center;
          font-size: 0.9em;
          color: #777;
          margin-top: 20px;
        }
        .email-footer p {
          margin: 0;
        }
        .app-icons {
          display: flex;
          justify-content: center;
          margin-top: 20px;
        }
        .app-icons img {
          width: 120px; /* Adjust size as needed */
          margin: 0 10px;
        }
        .support-icons {
          display: flex;
          justify-content: center;
          margin-top: 20px;
        }
        .support-icons div {
          margin: 0 10px;
          text-align: center;
        }
        .support-icons img {
          width: 30px; /* Adjust size as needed */
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h2>Welcome to Our Platform, {firstName}! 🎉</h2>
        </div>
        <div class="email-body">
          <p>Hello,</p>
          <p>We are thrilled to welcome you to our vibrant community of lighting enthusiasts! 💡 At [Your Company Name], we believe that the right lighting can transform any space, and we are excited to help you discover the perfect solutions for your home or business.</p>
          <p>As a valued member of our community, you can look forward to:</p>
          <ul>
            <li>🌟 <strong>Exclusive Offers</strong>: Enjoy special discounts and promotions available only to our subscribers.</li>
            <li>🛍️ <strong>Wide Selection</strong>: Browse our extensive range of high-quality electrical fittings and lighting products, from stylish fixtures to energy-efficient bulbs.</li>
            <li>📦 <strong>Fast Shipping</strong>: Get your orders delivered quickly and efficiently, so you can start enjoying your new lighting as soon as possible.</li>
            <li>💬 <strong>Expert Support</strong>: Our dedicated support team is here to assist you with any questions or concerns you may have.</li>
          </ul>
          <p>To get started, we invite you to explore our website and check out our latest collections. Whether you're looking to brighten up your living room, enhance your workspace, or find the perfect gift, we have something for everyone!</p>
          <p>If you have any questions or need assistance, our support team is just a click away. Don't hesitate to reach out!</p>
          <p>Thank you for joining us, and we can't wait to help you light up your life! 🌟</p>
        </div>
        <div class="app-icons">
          <a href="https://play.google.com/store/apps/details?id=com.yourapp">
            <img src="https://example.com/google-play-logo.png" alt="Google Play Store" />
          </a>
          <a href="https://apps.apple.com/app/idYOUR_APP_ID">
            <img src="https://example.com/apple-store-logo.png" alt="Apple App Store" />
          </a>
        </div>
        <div class="support-icons">
          <div>
            <img src="https://example.com/support-icon.png" alt="Support Icon" />
            <p>Support: +1 (800) 123-4567</p>
          </div>
          <div>
            <img src="https://example.com/email-icon.png" alt="Email Icon" />
            <p>Email: support@ example.com</p>
          </div>
        </div>
        <div class="email-footer">
          <p>&copy; 2023 [Your Company Name]. All rights reserved.</p>
        </div>
      </div>
    </body>
  </html>
`;

// Template for the payment success email
const PAYMENT_SUCCESS_TEMPLATE = (userName, amount) => `
  <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .email-container {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          background-color: #fff;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .email-header {
          text-align: center;
          margin-bottom: 20px;
        }
        .email-header h2 {
          margin: 0;
          color: #28a745;
        }
        .email-body {
          font-size: 16px;
        }
        .email-footer {
          text-align: center;
          font-size: 0.9em;
          color: #777;
          margin-top: 20px;
        }
        .email-footer p {
          margin: 0;
        }
        .icon {
          width: 30px;
          vertical-align: middle;
          margin-right: 8px;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h2><img src="https://example.com/payment-success-icon.png" alt="Success Icon" class="icon" /> Payment Received! 💳</h2>
        </div>
        <div class="email-body">
          <p>Hello ${userName},</p>
          <p>Thank you for your payment of <strong>₦${(amount / 100).toFixed(2)}</strong>! 🎉 Your order is being processed and will be fulfilled shortly.</p>
          <p>If you have any questions, feel free to reach out to our support team. 💬</p>
        </div>
        <div class="email-footer">
          <p>Best regards,</p>
          <p><strong>Your Company Name</strong></p>
        </div>
      </div>
    </body>
  </html>
`;

// Template for payment failure email
const PAYMENT_FAILURE_TEMPLATE = (userName, amount) => `
  <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .email-container {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          background-color: #fff;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .email-header {
          text-align: center;
          margin-bottom: 20px;
        }
        .email-header h2 {
          margin: 0;
          color: #dc3545;
        }
        .email-body {
          font-size: 16px;
        }
        .email-footer {
          text-align: center;
          font-size: 0.9em;
          color: #777;
          margin-top: 20px;
        }
        .email-footer p {
          margin: 0;
        }
        .icon {
          width: 30px;
          vertical-align: middle;
          margin-right: 8px;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h2><img src="https://example.com/payment-failure-icon.png" alt="Failure Icon" class="icon" /> Payment Failed ❌</h2>
        </div>
        <div class="email-body">
          <p>Hello ${userName},</p>
          <p>We regret to inform you that your payment of <strong>₦${(amount / 100).toFixed(2)}</strong> was unsuccessful. 😞 Please check your payment method and try again.</p>
          <p>If you need assistance, feel free to reach out to our support team. 💬</p>
        </div>
        <div class="email-footer">
          <p>Best regards,</p>
          <p><strong>Your Company Name</strong></p>
        </div>
      </div>
    </body>
  </html>
`;

module.exports = {
  PASSWORD_RESET_REQUEST_TEMPLATE,
  PASSWORD_RESET_SUCCESS_TEMPLATE,
  WELCOME_EMAIL_TEMPLATE,
  PAYMENT_SUCCESS_TEMPLATE,
  PAYMENT_FAILURE_TEMPLATE,
};
