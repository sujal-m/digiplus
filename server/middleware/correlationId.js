const { v4: uuidv4 } = require('uuid');

/**
 * Middleware to generate and attach a unique correlation ID to each request
 */
function correlationId(req, res, next) {
  const id = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = id;
  res.setHeader('X-Correlation-ID', id);
  next();
}

module.exports = correlationId;
