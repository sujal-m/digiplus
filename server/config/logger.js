const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const fs = require('fs');
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '..', 'logs');

try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch (e) {
  // Ignore permission error in restricted environments
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
    const cid = correlationId ? ` [${correlationId}]` : '';
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}${cid}: ${message}${metaStr}`;
  })
);

// Application log transport (info and above)
const appTransport = new DailyRotateFile({
  filename: path.join(LOG_DIR, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  level: 'info',
});

// Error log transport
const errorTransport = new DailyRotateFile({
  filename: path.join(LOG_DIR, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
});

// AI operations log transport
const aiTransport = new DailyRotateFile({
  filename: path.join(LOG_DIR, 'ai-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  level: 'info',
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  format: logFormat,
  defaultMeta: { service: 'digiplus-api' },
  transports: [
    appTransport,
    errorTransport,
  ],
});

// Separate AI logger
const aiLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'digiplus-ai' },
  transports: [aiTransport],
});

// Console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({ format: consoleFormat }));
}

/**
 * Create a child logger with correlation ID
 * @param {string} correlationId - Request correlation ID
 * @returns {winston.Logger} Child logger instance
 */
function createRequestLogger(correlationId) {
  return logger.child({ correlationId });
}

/**
 * Log an AI operation
 * @param {Object} params - AI operation parameters
 */
function logAIOperation({ operationType, model, correlationId, duration, tokenUsage, status, error, requestedBy }) {
  const logEntry = {
    operationType,
    model,
    correlationId,
    duration,
    tokenUsage,
    status,
    requestedBy,
    timestamp: new Date().toISOString(),
  };

  if (error) {
    logEntry.error = typeof error === 'string' ? error : error.message;
    aiLogger.error('AI operation failed', logEntry);
    logger.error('AI operation failed', logEntry);
  } else {
    aiLogger.info('AI operation completed', logEntry);
    logger.info('AI operation completed', logEntry);
  }
}

module.exports = { logger, aiLogger, createRequestLogger, logAIOperation };
