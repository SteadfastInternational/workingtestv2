const app = require("./app");
const logger = require("./config/logger"); // Ensure correct path
const PORT = process.env.PORT || 5000;

console.log("Starting server..."); // Debugging log to confirm the server start process
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`); // Temp log for initial confirmation
  logger.info(`Server running on port ${PORT}`); // Proper log using custom logger
});

// Global error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  logger.error('Uncaught Exception:', err);
  process.exit(1); // Exit the process if something goes wrong
});
