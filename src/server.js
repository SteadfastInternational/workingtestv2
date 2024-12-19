const app = require("./app");
const logger = require("./config/logger"); // Ensure the correct path
const PORT = process.env.PORT || 5000;

console.log("Starting server..."); // Debugging log
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`); // Add temporary console log
  logger.info(`Server running on port ${PORT}`); // Ensure logger works
});
