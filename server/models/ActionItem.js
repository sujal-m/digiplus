const mongoose = require('mongoose');

const taskHistorySchema = new mongoose.Schema({
  event: {
    type: String,
    required: true,
    enum: [
      'created', 'status_changed', 'assigned', 'reassigned',
      'priority_changed', 'deadline_changed', 'outcome_recorded',
      'comment_added', 'carry_forward', 'linked', 'updated',
    ],
  },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
  previousValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  details: { type: String, default: '' },
}, { _id: true });

const contextLinkSchema = new mongoose.Schema({
  sourceType: {
    type: String,
    required: true,
    enum: ['meeting', 'handover'],
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'contextLinks.sourceType',
  },
  linkedAt: { type: Date, default: Date.now },
  isOriginalSource: { type: Boolean, default: false },
  carryForwardFrom: { type: mongoose.Schema.Types.ObjectId }, // ID of previous context
}, { _id: true });

const commentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxlength: 2000 },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const actionItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: 300,
  },
  description: {
    type: String,
    default: '',
    maxlength: 5000,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  dueDate: {
    type: Date,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'blocked', 'completed', 'cancelled'],
    default: 'open',
  },
  // Outcome recording (Module 9)
  outcome: {
    summary: { type: String, default: '' },
    actualOutcome: { type: String, default: '' },
    completionDate: { type: Date },
    notes: { type: String, default: '' },
  },
  // Source tracking
  source: {
    sourceType: { type: String, enum: ['meeting', 'handover', 'manual', 'ai-extracted'] },
    sourceId: { type: mongoose.Schema.Types.ObjectId },
  },
  // AI extraction metadata
  aiMetadata: {
    confidence: { type: Number, min: 0, max: 1 },
    sourceText: { type: String, default: '' },
    isConfirmed: { type: Boolean, default: false },
    suggestedOwner: { type: String, default: '' },
    suggestedDeadline: { type: String, default: '' },
  },
  // Related decision
  relatedDecision: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Decision',
  },
  // Context links for carry-forward tracking
  contextLinks: [contextLinkSchema],
  // History log
  history: [taskHistorySchema],
  // Comments
  comments: [commentSchema],
  // Related documents
  documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
  tags: [{ type: String, trim: true }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

actionItemSchema.index({ assignedTo: 1, status: 1 });
actionItemSchema.index({ status: 1 });
actionItemSchema.index({ dueDate: 1 });
actionItemSchema.index({ priority: 1 });
actionItemSchema.index({ createdBy: 1 });
actionItemSchema.index({ 'contextLinks.sourceId': 1 });
actionItemSchema.index({ 'source.sourceId': 1, 'source.sourceType': 1 });
actionItemSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('ActionItem', actionItemSchema);
