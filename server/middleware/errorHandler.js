const { logger } = require('../config/logger');

/**
 * Global error handling middleware
 */
function errorHandler(err, req, res, next) {
  const correlationId = req.correlationId || 'unknown';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    logger.warn('Validation error', { correlationId, errors: messages });
    return res.status(400).json({
      success: false,
      error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: messages }
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    logger.warn('Duplicate key error', { correlationId, field });
    return res.status(409).json({
      success: false,
      error: { message: `Duplicate value for ${field}`, code: 'DUPLICATE_KEY' }
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    logger.warn('Invalid ID format', { correlationId, value: err.value });
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid ID format', code: 'INVALID_ID' }
    });
  }

  // Zod validation error
  if (err.name === 'ZodError') {
    const details = err.errors.map(e => ({ path: e.path.join('.'), message: e.message }));
    logger.warn('Schema validation error', { correlationId, details });
    return res.status(400).json({
      success: false,
      error: { message: 'Request validation failed', code: 'SCHEMA_ERROR', details }
    });
  }

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: { message: 'File too large', code: 'FILE_TOO_LARGE' }
    });
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  logger.error('Unhandled error', {
    correlationId,
    error: err.message,
    stack: err.stack,
    statusCode,
  });

  res.status(statusCode).json({
    success: false,
    error: { message, code: err.code || 'INTERNAL_ERROR' }
  });
}

/**
 * 404 handler
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: { message: `Route ${req.method} ${req.originalUrl} not found`, code: 'NOT_FOUND' }
  });
}

module.exports = { errorHandler, notFoundHandler };
