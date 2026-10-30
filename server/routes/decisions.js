const express = require('express');
const router = express.Router();
const { z } = require('zod');
const Decision = require('../models/Decision');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { logActivity } = require('../services/activityService');

const createDecisionSchema = z.object({
  title: z.string().min(3).max(300),
  description: z.string().optional().default(''),
  madeBy: z.string().optional(),
  source: z.object({
    sourceType: z.enum(['meeting', 'handover', 'standalone']).optional().default('standalone'),
    sourceId: z.string().optional(),
  }).optional(),
  rationale: z.string().optional().default(''),
  status: z.enum(['proposed', 'approved', 'implemented', 'superseded', 'revoked']).optional().default('approved'),
  tags: z.array(z.string()).optional().default([]),
});

// GET /api/decisions
router.get('/', auth, async (req, res, next) => {
  try {
    const { sourceType, sourceId, status, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (sourceType) filter['source.sourceType'] = sourceType;
    if (sourceId) filter['source.sourceId'] = sourceId;
    if (status && status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { rationale: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [decisions, total] = await Promise.all([
      Decision.find(filter)
        .populate('madeBy', 'name email avatar')
        .populate('createdBy', 'name email')
        .sort({ madeAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Decision.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        items: decisions,
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

// POST /api/decisions
router.post('/', auth, validate(createDecisionSchema), async (req, res, next) => {
  try {
    const decisionData = {
      ...req.body,
      madeBy: req.body.madeBy || req.user._id,
      createdBy: req.user._id,
    };

    const decision = await Decision.create(decisionData);

    await logActivity({
      userId: req.user._id,
      action: 'create_decision',
      entityType: 'decision',
      entityId: decision._id,
      details: { title: decision.title },
      correlationId: req.correlationId,
    });

    res.status(201).json({
      success: true,
      data: { decision },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/decisions/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const decision = await Decision.findById(req.params.id)
      .populate('madeBy', 'name email avatar team title')
      .populate('createdBy', 'name email');

    if (!decision) {
      return res.status(404).json({
        success: false,
        error: { message: 'Decision not found', code: 'DECISION_NOT_FOUND' }
      });
    }

    res.json({
      success: true,
      data: { decision },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/decisions/:id
router.patch('/:id', auth, async (req, res, next) => {
  try {
    const decision = await Decision.findById(req.params.id);
    if (!decision) {
      return res.status(404).json({
        success: false,
        error: { message: 'Decision not found', code: 'DECISION_NOT_FOUND' }
      });
    }

    const allowed = ['title', 'description', 'rationale', 'status', 'tags'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) {
        decision[field] = req.body[field];
      }
    });

    await decision.save();

    res.json({
      success: true,
      data: { decision },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
