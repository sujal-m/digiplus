const express = require('express');
const router = express.Router();
const { z } = require('zod');
const ActionItem = require('../models/ActionItem');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { updateTaskStatus, reassignTask, recordTaskOutcome } = require('../services/taskService');
const { logActivity } = require('../services/activityService');
const { createNotification } = require('../services/notificationService');

const createTaskSchema = z.object({
  title: z.string().min(3).max(300),
  description: z.string().optional().default(''),
  assignedTo: z.string().optional(),
  dueDate: z.string().or(z.date()).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  status: z.enum(['open', 'in-progress', 'blocked', 'completed', 'cancelled']).optional().default('open'),
  source: z.object({
    sourceType: z.enum(['meeting', 'handover', 'manual', 'ai-extracted']).optional().default('manual'),
    sourceId: z.string().optional(),
  }).optional(),
  relatedDecision: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
});

const outcomeSchema = z.object({
  summary: z.string().min(5),
  actualOutcome: z.string().min(5),
  notes: z.string().optional().default(''),
});

// GET /api/tasks
router.get('/', auth, async (req, res, next) => {
  try {
    const { status, priority, assignedTo, search, page = 1, limit = 20, overdue } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      if (status.includes(',')) {
        filter.status = { $in: status.split(',') };
      } else {
        filter.status = status;
      }
    }

    if (priority && priority !== 'all') {
      filter.priority = priority;
    }

    if (assignedTo && assignedTo !== 'all') {
      filter.assignedTo = assignedTo;
    }

    if (overdue === 'true') {
      filter.dueDate = { $lt: new Date() };
      filter.status = { $in: ['open', 'in-progress', 'blocked'] };
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [tasks, total] = await Promise.all([
      ActionItem.find(filter)
        .populate('assignedTo', 'name email avatar team title')
        .populate('createdBy', 'name email')
        .populate('relatedDecision', 'title')
        .sort({ dueDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      ActionItem.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        items: tasks,
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

// GET /api/tasks/my
router.get('/my', auth, async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { assignedTo: req.user._id };

    if (status && status !== 'all') {
      filter.status = status;
    }

    const tasks = await ActionItem.find(filter)
      .populate('createdBy', 'name email')
      .populate('relatedDecision', 'title')
      .sort({ dueDate: 1, createdAt: -1 });

    res.json({
      success: true,
      data: { tasks },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks
router.post('/', auth, validate(createTaskSchema), async (req, res, next) => {
  try {
    const taskData = {
      ...req.body,
      createdBy: req.user._id,
      history: [
        {
          event: 'created',
          actor: req.user._id,
          timestamp: new Date(),
          details: 'Action item created manually',
        },
      ],
    };

    if (taskData.assignedTo) {
      taskData.history.push({
        event: 'assigned',
        actor: req.user._id,
        timestamp: new Date(),
        newValue: taskData.assignedTo,
        details: 'Initial owner assignment',
      });
    }

    if (taskData.source && taskData.source.sourceId && (taskData.source.sourceType === 'meeting' || taskData.source.sourceType === 'handover')) {
      taskData.contextLinks = [
        {
          sourceType: taskData.source.sourceType,
          sourceId: taskData.source.sourceId,
          linkedAt: new Date(),
          isOriginalSource: true,
        },
      ];
    }

    const task = await ActionItem.create(taskData);

    if (task.assignedTo && task.assignedTo.toString() !== req.user._id.toString()) {
      await createNotification({
        userId: task.assignedTo,
        type: 'task_assigned',
        title: 'New Action Item Assigned',
        message: `You were assigned to "${task.title}".`,
        sourceType: 'task',
        sourceId: task._id,
      });
    }

    await logActivity({
      userId: req.user._id,
      action: 'create_task',
      entityType: 'task',
      entityId: task._id,
      details: { title: task.title, priority: task.priority },
      correlationId: req.correlationId,
    });

    res.status(201).json({
      success: true,
      data: { task },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tasks/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const task = await ActionItem.findById(req.params.id)
      .populate('assignedTo', 'name email avatar team title')
      .populate('createdBy', 'name email')
      .populate('relatedDecision', 'title description status')
      .populate('history.actor', 'name email avatar')
      .populate('comments.author', 'name email avatar');

    if (!task) {
      return res.status(404).json({
        success: false,
        error: { message: 'Task not found', code: 'TASK_NOT_FOUND' }
      });
    }

    res.json({
      success: true,
      data: { task },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/tasks/:id
router.patch('/:id', auth, async (req, res, next) => {
  try {
    const task = await ActionItem.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: { message: 'Task not found', code: 'TASK_NOT_FOUND' }
      });
    }

    const allowed = ['title', 'description', 'dueDate', 'priority', 'relatedDecision', 'tags'];
    let changed = false;

    allowed.forEach(field => {
      if (req.body[field] !== undefined && task[field] !== req.body[field]) {
        if (field === 'priority') {
          task.history.push({
            event: 'priority_changed',
            actor: req.user._id,
            previousValue: task.priority,
            newValue: req.body.priority,
          });
        } else if (field === 'dueDate') {
          task.history.push({
            event: 'deadline_changed',
            actor: req.user._id,
            previousValue: task.dueDate,
            newValue: req.body.dueDate,
          });
        }
        task[field] = req.body[field];
        changed = true;
      }
    });

    if (changed) {
      await task.save();
    }

    res.json({
      success: true,
      data: { task },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/tasks/:id/status
router.patch('/:id/status', auth, async (req, res, next) => {
  try {
    const { status, details } = req.body;
    if (!['open', 'in-progress', 'blocked', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid status value', code: 'INVALID_STATUS' }
      });
    }

    const task = await updateTaskStatus({
      taskId: req.params.id,
      status,
      userId: req.user._id,
      details,
      correlationId: req.correlationId,
    });

    res.json({
      success: true,
      data: { task },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/tasks/:id/reassign
router.patch('/:id/reassign', auth, async (req, res, next) => {
  try {
    const { assignedTo, details } = req.body;
    const task = await reassignTask({
      taskId: req.params.id,
      newAssigneeId: assignedTo,
      userId: req.user._id,
      details,
      correlationId: req.correlationId,
    });

    res.json({
      success: true,
      data: { task },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks/:id/outcome (Mandatory Module 9)
router.post('/:id/outcome', auth, validate(outcomeSchema), async (req, res, next) => {
  try {
    const { summary, actualOutcome, notes } = req.body;
    const task = await recordTaskOutcome({
      taskId: req.params.id,
      summary,
      actualOutcome,
      notes,
      userId: req.user._id,
      correlationId: req.correlationId,
    });

    res.json({
      success: true,
      data: { task },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', auth, async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Comment content cannot be empty', code: 'INVALID_INPUT' }
      });
    }

    const task = await ActionItem.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: { message: 'Task not found', code: 'TASK_NOT_FOUND' }
      });
    }

    task.comments.push({
      author: req.user._id,
      content,
      createdAt: new Date(),
    });

    task.history.push({
      event: 'comment_added',
      actor: req.user._id,
      details: 'Added comment on task',
    });

    await task.save();

    res.json({
      success: true,
      data: { task },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tasks/:id/history
router.get('/:id/history', auth, async (req, res, next) => {
  try {
    const task = await ActionItem.findById(req.params.id)
      .populate('history.actor', 'name email avatar')
      .select('history title');

    if (!task) {
      return res.status(404).json({
        success: false,
        error: { message: 'Task not found', code: 'TASK_NOT_FOUND' }
      });
    }

    res.json({
      success: true,
      data: { history: task.history },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
