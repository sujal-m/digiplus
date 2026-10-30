const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const Handover = require('../models/Handover');
const ActionItem = require('../models/ActionItem');
const Decision = require('../models/Decision');
const { auth } = require('../middleware/auth');
const {
  extractMeetingInfo,
  generateMeetingRecap,
  generateCatchUpBrief,
  generateHandoverSummary,
} = require('../services/aiService');
const {
  calculateMeetingContextScore,
  calculateHandoverContextScore,
} = require('../services/contextScoreService');
const { logActivity } = require('../services/activityService');

// POST /api/ai/extract
router.post('/extract', auth, async (req, res, next) => {
  try {
    const { text, meetingId } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Text or notes required for extraction', code: 'INVALID_INPUT' }
      });
    }

    const extraction = await extractMeetingInfo({
      text,
      correlationId: req.correlationId,
      userId: req.user._id,
      meetingId,
    });

    await logActivity({
      userId: req.user._id,
      action: 'ai_extract_info',
      entityType: 'meeting',
      entityId: meetingId,
      correlationId: req.correlationId,
    });

    res.json({
      success: true,
      data: extraction,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/ai/recap
router.post('/recap', auth, async (req, res, next) => {
  try {
    const { meetingId } = req.body;
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: { message: 'Meeting not found', code: 'MEETING_NOT_FOUND' }
      });
    }

    const recap = await generateMeetingRecap({
      meeting,
      correlationId: req.correlationId,
      userId: req.user._id,
    });

    meeting.aiRecap = {
      ...recap,
      generatedAt: new Date(),
      model: 'gemini-2.0-flash',
    };
    await meeting.save();

    await logActivity({
      userId: req.user._id,
      action: 'ai_generate_recap',
      entityType: 'meeting',
      entityId: meeting._id,
      correlationId: req.correlationId,
    });

    res.json({
      success: true,
      data: { recap: meeting.aiRecap },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/ai/brief (Module 6: Catch-Up Brief)
router.post('/brief', auth, async (req, res, next) => {
  try {
    const { handoverId, meetingId } = req.body;
    let targetType = 'Project';
    let targetName = 'General Brief';
    let outgoingOwner = '';
    let incomingOwner = req.user.name;
    const contextRecords = { tasks: [], decisions: [], meetings: [] };

    if (handoverId) {
      const handover = await Handover.findById(handoverId)
        .populate('outgoingOwner', 'name')
        .populate('incomingOwner', 'name')
        .populate('relatedMeetings');

      if (handover) {
        targetType = 'Handover';
        targetName = handover.title;
        outgoingOwner = handover.outgoingOwner ? handover.outgoingOwner.name : '';
        incomingOwner = handover.incomingOwner ? handover.incomingOwner.name : '';

        const [tasks, decisions] = await Promise.all([
          ActionItem.find({
            $or: [
              { _id: { $in: handover.actionItems || [] } },
              { 'contextLinks.sourceId': handover._id },
            ],
          }).populate('assignedTo', 'name'),
          Decision.find({ 'source.sourceId': handover._id }),
        ]);

        contextRecords.tasks = tasks;
        contextRecords.decisions = decisions;
        contextRecords.background = handover.background;
        contextRecords.notes = handover.handoverNotes;
      }
    } else if (meetingId) {
      const meeting = await Meeting.findById(meetingId).populate('organizer', 'name');
      if (meeting) {
        targetType = 'Meeting';
        targetName = meeting.title;
        outgoingOwner = meeting.organizer ? meeting.organizer.name : '';

        const [tasks, decisions] = await Promise.all([
          ActionItem.find({ 'contextLinks.sourceId': meeting._id }).populate('assignedTo', 'name'),
          Decision.find({ 'source.sourceId': meeting._id }),
        ]);

        contextRecords.tasks = tasks;
        contextRecords.decisions = decisions;
        contextRecords.notes = meeting.notes;
        contextRecords.objective = meeting.objective;
      }
    }

    const brief = await generateCatchUpBrief({
      targetType,
      targetName,
      outgoingOwner,
      incomingOwner,
      contextRecords,
      correlationId: req.correlationId,
      userId: req.user._id,
    });

    await logActivity({
      userId: req.user._id,
      action: 'ai_generate_brief',
      entityType: handoverId ? 'handover' : 'meeting',
      entityId: handoverId || meetingId,
      correlationId: req.correlationId,
    });

    res.json({
      success: true,
      data: { brief },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/ai/handover-summary
router.post('/handover-summary', auth, async (req, res, next) => {
  try {
    const { handoverId } = req.body;
    const handover = await Handover.findById(handoverId);
    if (!handover) {
      return res.status(404).json({
        success: false,
        error: { message: 'Handover not found', code: 'HANDOVER_NOT_FOUND' }
      });
    }

    const [tasks, decisions] = await Promise.all([
      ActionItem.find({ _id: { $in: handover.actionItems || [] } }),
      Decision.find({ 'source.sourceId': handover._id }),
    ]);

    const summary = await generateHandoverSummary({
      handover,
      tasks,
      decisions,
      correlationId: req.correlationId,
      userId: req.user._id,
    });

    handover.aiSummary = {
      ...summary,
      generatedAt: new Date(),
      model: 'gemini-2.0-flash',
    };
    await handover.save();

    await logActivity({
      userId: req.user._id,
      action: 'ai_handover_summary',
      entityType: 'handover',
      entityId: handover._id,
      correlationId: req.correlationId,
    });

    res.json({
      success: true,
      data: { summary: handover.aiSummary },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/ai/context-score
router.post('/context-score', auth, async (req, res, next) => {
  try {
    const { entityType, entityId } = req.body;

    if (entityType === 'meeting') {
      const meeting = await Meeting.findById(entityId);
      if (!meeting) return res.status(404).json({ success: false, error: { message: 'Meeting not found' } });
      const [actionItems, decisions] = await Promise.all([
        ActionItem.find({ 'contextLinks.sourceId': meeting._id }),
        Decision.find({ 'source.sourceId': meeting._id }),
      ]);
      const scoreData = calculateMeetingContextScore(meeting, actionItems, decisions);
      meeting.contextScore = scoreData;
      await meeting.save();
      return res.json({ success: true, data: scoreData });
    }

    if (entityType === 'handover') {
      const handover = await Handover.findById(entityId);
      if (!handover) return res.status(404).json({ success: false, error: { message: 'Handover not found' } });
      const [actionItems, decisions] = await Promise.all([
        ActionItem.find({ _id: { $in: handover.actionItems || [] } }),
        Decision.find({ 'source.sourceId': handover._id }),
      ]);
      const scoreData = calculateHandoverContextScore(handover, actionItems, decisions);
      handover.contextScore = scoreData;
      await handover.save();
      return res.json({ success: true, data: scoreData });
    }

    res.status(400).json({ success: false, error: { message: 'Invalid entityType' } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
