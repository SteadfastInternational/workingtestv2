const app = require("./app");
const logger = require("./config/logger"); // Ensure the correct path
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`); // Use logger instead of console.log
});