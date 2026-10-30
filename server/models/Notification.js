const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
      'task_assigned', 'task_reassigned', 'task_completed', 'task_overdue',
      'task_deadline_approaching', 'task_status_changed',
      'meeting_created', 'meeting_updated', 'meeting_completed',
      'handover_created', 'handover_pending', 'handover_accepted',
      'handover_completed', 'handover_rejected',
      'decision_made', 'document_shared',
      'general',
    ],
  },
  title: {
    type: String,
    required: true,
    maxlength: 200,
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  sourceType: {
    type: String,
    enum: ['meeting', 'handover', 'task', 'decision', 'document', 'system'],
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  read: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal',
  },
}, {
  timestamps: true,
});

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
