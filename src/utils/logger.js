const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

// Define log format
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  })
);

// Create the logger
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info', // Default log level
  format: logFormat,
  transports: [
    // Write logs to the console
    new transports.Console({
      format: format.combine(format.colorize(), logFormat),
    }),

    // Write logs to a daily rotating file
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d', // Retain logs for 14 days
    }),

    // Separate error logs
    new DailyRotateFile({
      filename: 'logs/errors-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d', // Retain error logs for 30 days
    }),
  ],
  exceptionHandlers: [
    new transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new transports.File({ filename: 'logs/rejections.log' }),
  ],
});

// Stream for Morgan
logger.stream = {
  write: (message) => logger.info(message.trim()),
};

module.exports = logger;
