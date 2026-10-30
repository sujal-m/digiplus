const express = require('express');
const router = express.Router();
const { z } = require('zod');
const Meeting = require('../models/Meeting');
const ActionItem = require('../models/ActionItem');
const Decision = require('../models/Decision');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { calculateMeetingContextScore } = require('../services/contextScoreService');
const { carryForwardTasks } = require('../services/taskService');
const { logActivity } = require('../services/activityService');
const { createNotification } = require('../services/notificationService');

const createMeetingSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional().default(''),
  objective: z.string().optional().default(''),
  dateTime: z.string().or(z.date()),
  endTime: z.string().or(z.date()).optional(),
  location: z.string().optional().default(''),
  participants: z.array(z.object({
    user: z.string(),
    role: z.enum(['organizer', 'required', 'optional']).optional().default('required'),
  })).optional().default([]),
  agenda: z.array(z.object({
    title: z.string(),
    description: z.string().optional().default(''),
    duration: z.number().optional().default(15),
    order: z.number().optional().default(0),
  })).optional().default([]),
  status: z.enum(['draft', 'scheduled', 'in-progress', 'completed', 'archived']).optional().default('scheduled'),
  tags: z.array(z.string()).optional().default([]),
  relatedMeetings: z.array(z.string()).optional().default([]),
  documents: z.array(z.string()).optional().default([]),
});

// GET /api/meetings
router.get('/', auth, async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    } else {
      filter.status = { $ne: 'archived' };
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { objective: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [meetings, total] = await Promise.all([
      Meeting.find(filter)
        .populate('organizer', 'name email avatar')
        .populate('participants.user', 'name email avatar')
        .sort({ dateTime: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Meeting.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        items: meetings,
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

// POST /api/meetings
router.post('/', auth, validate(createMeetingSchema), async (req, res, next) => {
  try {
    const meetingData = {
      ...req.body,
      organizer: req.user._id,
    };

    // Ensure organizer is in participants list
    const hasOrganizer = meetingData.participants.some(p => p.user.toString() === req.user._id.toString());
    if (!hasOrganizer) {
      meetingData.participants.push({ user: req.user._id, role: 'organizer', attended: true });
    }

    const meeting = await Meeting.create(meetingData);

    // Initial context score
    meeting.contextScore = calculateMeetingContextScore(meeting, [], []);
    await meeting.save();

    await logActivity({
      userId: req.user._id,
      action: 'create_meeting',
      entityType: 'meeting',
      entityId: meeting._id,
      details: { title: meeting.title },
      correlationId: req.correlationId,
    });

    // Notify participants
    const otherParticipants = meeting.participants
      .filter(p => p.user.toString() !== req.user._id.toString())
      .map(p => p.user);

    for (const pId of otherParticipants) {
      await createNotification({
        userId: pId,
        type: 'meeting_created',
        title: 'Invited to Meeting',
        message: `You were invited to "${meeting.title}" on ${new Date(meeting.dateTime).toLocaleDateString()}.`,
        sourceType: 'meeting',
        sourceId: meeting._id,
      });
    }

    res.status(201).json({
      success: true,
      data: { meeting },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/meetings/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('organizer', 'name email team title avatar')
      .populate('participants.user', 'name email team title avatar')
      .populate('relatedMeetings', 'title dateTime status')
      .populate('documents', 'title fileName fileSize mimeType createdAt');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: { message: 'Meeting not found', code: 'MEETING_NOT_FOUND' }
      });
    }

    // Retrieve related decisions and action items
    const [decisions, actionItems] = await Promise.all([
      Decision.find({ 'source.sourceId': meeting._id, 'source.sourceType': 'meeting' })
        .populate('madeBy', 'name email')
        .sort({ createdAt: -1 }),
      ActionItem.find({ 'contextLinks.sourceId': meeting._id })
        .populate('assignedTo', 'name email avatar')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 }),
    ]);

    // Recalculate context score dynamically
    const contextScore = calculateMeetingContextScore(meeting, actionItems, decisions);
    meeting.contextScore = contextScore;

    res.json({
      success: true,
      data: {
        meeting,
        decisions,
        actionItems,
        contextScore,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/meetings/:id
router.patch('/:id', auth, async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: { message: 'Meeting not found', code: 'MEETING_NOT_FOUND' }
      });
    }

    const allowedFields = [
      'title', 'description', 'objective', 'dateTime', 'endTime',
      'location', 'status', 'notes', 'tags', 'relatedMeetings', 'documents'
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        meeting[field] = req.body[field];
      }
    });

    await meeting.save();

    await logActivity({
      userId: req.user._id,
      action: 'update_meeting',
      entityType: 'meeting',
      entityId: meeting._id,
      correlationId: req.correlationId,
    });

    res.json({
      success: true,
      data: { meeting },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/meetings/:id/complete
router.post('/:id/complete', auth, async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: { message: 'Meeting not found', code: 'MEETING_NOT_FOUND' }
      });
    }

    meeting.status = 'completed';

    const [decisions, actionItems] = await Promise.all([
      Decision.find({ 'source.sourceId': meeting._id }),
      ActionItem.find({ 'contextLinks.sourceId': meeting._id }),
    ]);

    meeting.contextScore = calculateMeetingContextScore(meeting, actionItems, decisions);
    await meeting.save();

    await logActivity({
      userId: req.user._id,
      action: 'complete_meeting',
      entityType: 'meeting',
      entityId: meeting._id,
      correlationId: req.correlationId,
    });

    res.json({
      success: true,
      data: { meeting, contextScore: meeting.contextScore },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/meetings/:id/notes
router.post('/:id/notes', auth, async (req, res, next) => {
  try {
    const { notes } = req.body;
    const meeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      { notes: notes || '' },
      { new: true }
    );

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: { message: 'Meeting not found', code: 'MEETING_NOT_FOUND' }
      });
    }

    res.json({
      success: true,
      data: { meeting },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/meetings/:id/carry-forward
router.post('/:id/carry-forward', auth, async (req, res, next) => {
  try {
    const { taskIds } = req.body;
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'taskIds must be a non-empty array', code: 'INVALID_INPUT' }
      });
    }

    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: { message: 'Meeting not found', code: 'MEETING_NOT_FOUND' }
      });
    }

    const result = await carryForwardTasks({
      taskIds,
      targetType: 'meeting',
      targetId: meeting._id,
      userId: req.user._id,
      correlationId: req.correlationId,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/meetings/:id/agenda
router.post('/:id/agenda', auth, async (req, res, next) => {
  try {
    const { title, description, duration, presenter, order } = req.body;
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: { message: 'Meeting not found', code: 'MEETING_NOT_FOUND' }
      });
    }

    meeting.agenda.push({
      title,
      description: description || '',
      duration: duration || 15,
      presenter: presenter || undefined,
      order: order !== undefined ? order : meeting.agenda.length,
    });

    await meeting.save();
    res.json({ success: true, data: { meeting } });
  } catch (error) {
    next(error);
  }
});

// POST /api/meetings/:id/participants
router.post('/:id/participants', auth, async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: { message: 'Meeting not found', code: 'MEETING_NOT_FOUND' }
      });
    }

    const exists = meeting.participants.some(p => p.user.toString() === userId.toString());
    if (!exists) {
      meeting.participants.push({
        user: userId,
        role: role || 'required',
        attended: false,
      });
      await meeting.save();
    }

    res.json({ success: true, data: { meeting } });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/meetings/:id (Soft-delete / Archive)
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const meeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      { status: 'archived' },
      { new: true }
    );
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: { message: 'Meeting not found', code: 'MEETING_NOT_FOUND' }
      });
    }

    res.json({
      success: true,
      data: { message: 'Meeting archived successfully', meeting },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
