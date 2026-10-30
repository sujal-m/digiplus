const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const User = require('../models/User');
const validate = require('../middleware/validate');
const { auth } = require('../middleware/auth');
const { logActivity } = require('../services/activityService');
const { logger } = require('../config/logger');

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'manager', 'member']).optional().default('member'),
  team: z.string().optional().default('Engineering'),
  title: z.string().optional().default(''),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

function generateTokens(user) {
  const token = jwt.sign(
    { userId: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  const refreshToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { token, refreshToken };
}

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password, role, team, title } = req.body;
    
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { message: 'Email is already registered', code: 'EMAIL_EXISTS' }
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'member',
      team: team || 'General',
      title: title || '',
    });

    const { token, refreshToken } = generateTokens(user);

    await logActivity({
      userId: user._id,
      action: 'user_registered',
      entityType: 'user',
      entityId: user._id,
      correlationId: req.correlationId,
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          team: user.team,
          title: user.title,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, isActive: true }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      logger.warn('Failed login attempt', { email, correlationId: req.correlationId });
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' }
      });
    }

    const { token, refreshToken } = generateTokens(user);

    await logActivity({
      userId: user._id,
      action: 'user_logged_in',
      entityType: 'user',
      entityId: user._id,
      correlationId: req.correlationId,
    });

    res.json({
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          team: user.team,
          title: user.title,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/refresh
router.post('/refresh', validate(refreshSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: { message: 'User not found or inactive', code: 'USER_INACTIVE' }
      });
    }

    const tokens = generateTokens(user);
    res.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid or expired refresh token', code: 'INVALID_REFRESH_TOKEN' }
    });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        team: req.user.team,
        title: req.user.title,
        avatar: req.user.avatar,
      },
    },
  });
});

module.exports = router;
