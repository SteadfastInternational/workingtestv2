const invoiceTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f4f9ff;
      color: #333;
    }

    .invoice-container {
      max-width: 900px;
      margin: 40px auto;
      background: #fff;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
    }

    .company-info,
    .recipient-info {
      width: 48%;
    }

    .company-info p,
    .recipient-info p {
      margin: 5px 0;
      font-size: 14px;
    }

    .company-info p {
      color: #007BFF;
      font-weight: bold;
    }

    .header img {
      width: 120px;
    }

    .header h1 {
      font-size: 26px;
      color: #007BFF;
      margin: 10px 0 5px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    table th {
      background-color: #007BFF;
      color: #fff;
      padding: 10px;
      text-align: left;
      font-size: 14px;
      text-transform: uppercase;
    }

    table td {
      padding: 15px;
      border-bottom: 1px solid #ddd;
      font-size: 14px;
      vertical-align: middle;
    }

    .total-summary {
      text-align: right;
      font-size: 18px;
      color: #007BFF;
      font-weight: bold;
    }

    .footer {
      text-align: center;
      font-size: 12px;
      color: #999;
      margin-top: 40px;
    }

    .footer img {
      width: 120px;
      margin: 0 10px;
    }

    .footer p {
      margin-top: 10px;
    }

    @media (max-width: 768px) {
      table td {
        font-size: 12px;
      }

      table img {
        width: 50px;
        height: 50px;
      }

      .header {
        flex-direction: column;
      }

      .company-info,
      .recipient-info {
        width: 100%;
        margin-bottom: 10px;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="company-info">
        <p><strong>Your Company Name</strong></p>
        <p>123 Business Street</p>
        <p>City, State, ZIP Code</p>
        <p>+234 800 123 4567</p>
        <p>support@yourcompany.com</p>
      </div>
      <div class="recipient-info">
        <p><strong>Recipient:</strong></p>
        <p>{{name}}</p>
        <p>{{formattedAddress}}</p>
        <p>{{email}}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th>Quantity</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {{sanitizedCartItemsHtml}}
      </tbody>
    </table>

    <div class="total-summary">
      Total: ₦{{totalAmount}}
    </div>

    <div class="footer">
      <p>Download our app:</p>
      <a href="https://play.google.com/store" target="_blank">
        <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play Store" />
      </a>
      <a href="https://www.apple.com/app-store/" target="_blank">
        <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Apple App Store" />
      </a>
      <p>Need help? Contact us: support@yourcompany.com | +234 800 123 4567</p>
    </div>
  </div>
</body>
</html>
`;

module.exports = invoiceTemplate;
