const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const Handover = require('../models/Handover');
const ActionItem = require('../models/ActionItem');
const Decision = require('../models/Decision');
const ActivityLog = require('../models/ActivityLog');
const { auth } = require('../middleware/auth');

// GET /api/dashboard/stats
router.get('/stats', auth, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    const [
      totalMeetings,
      totalHandovers,
      openTasks,
      overdueTasks,
      myPendingTasks,
      recentlyCompletedTasks,
      upcomingMeetings,
      pendingHandovers,
      recentDecisions,
      recentActivity,
    ] = await Promise.all([
      Meeting.countDocuments({ status: { $ne: 'archived' } }),
      Handover.countDocuments(),
      ActionItem.countDocuments({ status: { $in: ['open', 'in-progress', 'blocked'] } }),
      ActionItem.countDocuments({
        status: { $in: ['open', 'in-progress', 'blocked'] },
        dueDate: { $lt: now },
      }),
      ActionItem.find({
        assignedTo: userId,
        status: { $in: ['open', 'in-progress', 'blocked'] },
      })
        .populate('createdBy', 'name')
        .sort({ dueDate: 1 })
        .limit(10),
      ActionItem.find({
        status: 'completed',
      })
        .populate('assignedTo', 'name')
        .sort({ 'outcome.completionDate': -1, updatedAt: -1 })
        .limit(5),
      Meeting.find({
        dateTime: { $gte: now },
        status: { $in: ['scheduled', 'in-progress'] },
      })
        .populate('organizer', 'name')
        .sort({ dateTime: 1 })
        .limit(5),
      Handover.find({
        $or: [
          { outgoingOwner: userId },
          { incomingOwner: userId },
          { status: 'pending-acknowledgement' },
        ],
      })
        .populate('outgoingOwner', 'name')
        .populate('incomingOwner', 'name')
        .sort({ updatedAt: -1 })
        .limit(5),
      Decision.find()
        .populate('madeBy', 'name')
        .sort({ madeAt: -1 })
        .limit(5),
      ActivityLog.find()
        .populate('userId', 'name')
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    // Task breakdown by status for chart visualization
    const taskStatusCounts = await ActionItem.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const taskDistribution = {
      open: 0,
      'in-progress': 0,
      blocked: 0,
      completed: 0,
      cancelled: 0,
    };
    taskStatusCounts.forEach(t => {
      taskDistribution[t._id] = t.count;
    });

    res.json({
      success: true,
      data: {
        totalMeetings,
        totalHandovers,
        openTasks,
        overdueTasks,
        metrics: {
          totalMeetings,
          totalHandovers,
          openTasks,
          overdueTasks,
        },
        pendingTasks: myPendingTasks,
        myPendingTasks,
        recentlyCompletedTasks,
        upcomingMeetings,
        pendingHandovers,
        pendingHandoversList: pendingHandovers,
        recentDecisions,
        recentActivity,
        taskDistribution,
        tasksByStatus: taskDistribution,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
