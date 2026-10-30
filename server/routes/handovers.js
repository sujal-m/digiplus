const express = require('express');
const router = express.Router();
const { z } = require('zod');
const Handover = require('../models/Handover');
const ActionItem = require('../models/ActionItem');
const Decision = require('../models/Decision');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { calculateHandoverContextScore } = require('../services/contextScoreService');
const { carryForwardTasks } = require('../services/taskService');
const { logActivity } = require('../services/activityService');
const { createNotification } = require('../services/notificationService');

const createHandoverSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional().default(''),
  outgoingOwner: z.string().optional(),
  incomingOwner: z.string().min(1),
  team: z.string().optional().default(''),
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).optional(),
  background: z.string().optional().default(''),
  handoverNotes: z.string().optional().default(''),
  relatedMeetings: z.array(z.string()).optional().default([]),
  actionItems: z.array(z.string()).optional().default([]),
  documents: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
});

// GET /api/handovers
router.get('/', auth, async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { background: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [handovers, total] = await Promise.all([
      Handover.find(filter)
        .populate('outgoingOwner', 'name email avatar team title')
        .populate('incomingOwner', 'name email avatar team title')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Handover.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        items: handovers,
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

// POST /api/handovers
router.post('/', auth, validate(createHandoverSchema), async (req, res, next) => {
  try {
    const handoverData = {
      ...req.body,
      outgoingOwner: req.body.outgoingOwner || req.user._id,
      status: 'draft',
    };

    const handover = await Handover.create(handoverData);

    // Initial context score
    handover.contextScore = calculateHandoverContextScore(handover, [], []);
    await handover.save();

    await logActivity({
      userId: req.user._id,
      action: 'create_handover',
      entityType: 'handover',
      entityId: handover._id,
      details: { title: handover.title },
      correlationId: req.correlationId,
    });

    res.status(201).json({
      success: true,
      data: { handover },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/handovers/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const handover = await Handover.findById(req.params.id)
      .populate('outgoingOwner', 'name email avatar team title')
      .populate('incomingOwner', 'name email avatar team title')
      .populate('acknowledgement.acknowledgedBy', 'name email')
      .populate('relatedMeetings', 'title dateTime status objective')
      .populate('documents', 'title fileName fileSize mimeType createdAt');

    if (!handover) {
      return res.status(404).json({
        success: false,
        error: { message: 'Handover not found', code: 'HANDOVER_NOT_FOUND' }
      });
    }

    // Retrieve associated action items and decisions
    const [actionItems, decisions] = await Promise.all([
      ActionItem.find({
        $or: [
          { _id: { $in: handover.actionItems || [] } },
          { 'contextLinks.sourceId': handover._id },
        ],
      })
        .populate('assignedTo', 'name email avatar')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 }),
      Decision.find({ 'source.sourceId': handover._id })
        .populate('madeBy', 'name email'),
    ]);

    const contextScore = calculateHandoverContextScore(handover, actionItems, decisions);
    handover.contextScore = contextScore;

    res.json({
      success: true,
      data: {
        handover,
        actionItems,
        decisions,
        contextScore,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/handovers/:id
router.patch('/:id', auth, async (req, res, next) => {
  try {
    const handover = await Handover.findById(req.params.id);
    if (!handover) {
      return res.status(404).json({
        success: false,
        error: { message: 'Handover not found', code: 'HANDOVER_NOT_FOUND' }
      });
    }

    const allowed = [
      'title', 'description', 'team', 'startDate', 'endDate',
      'background', 'handoverNotes', 'relatedMeetings', 'actionItems', 'documents', 'tags'
    ];

    allowed.forEach(field => {
      if (req.body[field] !== undefined) {
        handover[field] = req.body[field];
      }
    });

    await handover.save();

    await logActivity({
      userId: req.user._id,
      action: 'update_handover',
      entityType: 'handover',
      entityId: handover._id,
      correlationId: req.correlationId,
    });

    res.json({
      success: true,
      data: { handover },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/handovers/:id/submit (Draft -> Pending Acknowledgement)
router.post('/:id/submit', auth, async (req, res, next) => {
  try {
    const handover = await Handover.findById(req.params.id);
    if (!handover) {
      return res.status(404).json({
        success: false,
        error: { message: 'Handover not found', code: 'HANDOVER_NOT_FOUND' }
      });
    }

    handover.status = 'pending-acknowledgement';
    await handover.save();

    // Notify incoming owner
    await createNotification({
      userId: handover.incomingOwner,
      type: 'handover_pending',
      title: 'Handover Pending Your Review',
      message: `Work transfer "${handover.title}" has been submitted for your acknowledgement.`,
      sourceType: 'handover',
      sourceId: handover._id,
      priority: 'high',
    });

    await logActivity({
      userId: req.user._id,
      action: 'submit_handover',
      entityType: 'handover',
      entityId: handover._id,
      correlationId: req.correlationId,
    });

    res.json({
      success: true,
      data: { handover },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/handovers/:id/accept (Formal acknowledgement by incoming owner)
router.post('/:id/accept', auth, async (req, res, next) => {
  try {
    const handover = await Handover.findById(req.params.id);
    if (!handover) {
      return res.status(404).json({
        success: false,
        error: { message: 'Handover not found', code: 'HANDOVER_NOT_FOUND' }
      });
    }

    handover.status = 'accepted';
    handover.acknowledgement = {
      acknowledged: true,
      acknowledgedAt: new Date(),
      acknowledgedBy: req.user._id,
      notes: req.body.notes || '',
    };

    const actionItems = await ActionItem.find({ _id: { $in: handover.actionItems } });
    handover.contextScore = calculateHandoverContextScore(handover, actionItems, []);
    await handover.save();

    // Notify outgoing owner
    await createNotification({
      userId: handover.outgoingOwner,
      type: 'handover_accepted',
      title: 'Handover Accepted',
      message: `${req.user.name} accepted the work transfer "${handover.title}".`,
      sourceType: 'handover',
      sourceId: handover._id,
    });

    await logActivity({
      userId: req.user._id,
      action: 'accept_handover',
      entityType: 'handover',
      entityId: handover._id,
      details: { notes: req.body.notes },
      correlationId: req.correlationId,
    });

    res.json({
      success: true,
      data: { handover },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/handovers/:id/reject
router.post('/:id/reject', auth, async (req, res, next) => {
  try {
    const handover = await Handover.findById(req.params.id);
    if (!handover) {
      return res.status(404).json({
        success: false,
        error: { message: 'Handover not found', code: 'HANDOVER_NOT_FOUND' }
      });
    }

    handover.status = 'rejected';
    await handover.save();

    await createNotification({
      userId: handover.outgoingOwner,
      type: 'handover_rejected',
      title: 'Handover Rejected / Clarification Requested',
      message: `${req.user.name} requested changes on "${handover.title}": ${req.body.reason || 'No reason provided'}.`,
      sourceType: 'handover',
      sourceId: handover._id,
      priority: 'high',
    });

    res.json({
      success: true,
      data: { handover },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/handovers/:id/complete
router.post('/:id/complete', auth, async (req, res, next) => {
  try {
    const handover = await Handover.findByIdAndUpdate(
      req.params.id,
      { status: 'completed' },
      { new: true }
    );
    if (!handover) {
      return res.status(404).json({
        success: false,
        error: { message: 'Handover not found', code: 'HANDOVER_NOT_FOUND' }
      });
    }

    await logActivity({
      userId: req.user._id,
      action: 'complete_handover',
      entityType: 'handover',
      entityId: handover._id,
      correlationId: req.correlationId,
    });

    res.json({
      success: true,
      data: { handover },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/handovers/:id/carry-forward
router.post('/:id/carry-forward', auth, async (req, res, next) => {
  try {
    const { taskIds } = req.body;
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'taskIds must be a non-empty array', code: 'INVALID_INPUT' }
      });
    }

    const handover = await Handover.findById(req.params.id);
    if (!handover) {
      return res.status(404).json({
        success: false,
        error: { message: 'Handover not found', code: 'HANDOVER_NOT_FOUND' }
      });
    }

    const result = await carryForwardTasks({
      taskIds,
      targetType: 'handover',
      targetId: handover._id,
      userId: req.user._id,
      correlationId: req.correlationId,
    });

    // Add task IDs to handover if not already present
    for (const id of taskIds) {
      if (!handover.actionItems.some(item => item.toString() === id.toString())) {
        handover.actionItems.push(id);
      }
    }
    await handover.save();

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
