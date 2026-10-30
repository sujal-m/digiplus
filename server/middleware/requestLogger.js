const { createRequestLogger } = require('../config/logger');

/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  const log = createRequestLogger(req.correlationId);

  // Log request
  log.info('Incoming request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.userId || 'anonymous',
  });

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    log[level]('Request completed', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.userId || 'anonymous',
    });
  });

  next();
}

module.exports = requestLogger;
