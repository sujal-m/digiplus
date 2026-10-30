const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logger } = require('../config/logger');

/**
 * Authentication middleware - verifies JWT token
 */
async function auth(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'AUTH_REQUIRED' }
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'User not found', code: 'USER_NOT_FOUND' }
      });
    }

    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { message: 'Token expired', code: 'TOKEN_EXPIRED' }
      });
    }
    logger.warn('Auth middleware error', { error: error.message, correlationId: req.correlationId });
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid token', code: 'INVALID_TOKEN' }
    });
  }
}

/**
 * Role-based authorization middleware
 * @param  {...string} roles - Allowed roles
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'AUTH_REQUIRED' }
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { message: 'Insufficient permissions', code: 'FORBIDDEN' }
      });
    }
    next();
  };
}

module.exports = { auth, authorize };
