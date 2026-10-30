const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// GET /api/users
router.get('/', auth, async (req, res, next) => {
  try {
    const { team, search } = req.query;
    const filter = { isActive: true };

    if (team) {
      filter.team = team;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter).select('-password').sort({ name: 1 });
    res.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found', code: 'USER_NOT_FOUND' }
      });
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/users/:id
router.patch('/:id', auth, async (req, res, next) => {
  try {
    if (req.user._id.toString() !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Cannot edit other user profiles', code: 'FORBIDDEN' }
      });
    }

    const { name, team, title, avatar } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (team) updates.team = team;
    if (title) updates.title = title;
    if (avatar !== undefined) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
