const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { auth } = require('../middleware/auth');

// GET /api/activity
router.get('/', auth, async (req, res, next) => {
  try {
    const { entityType, entityId, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = entityId;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [activities, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate('userId', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      ActivityLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        items: activities,
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
