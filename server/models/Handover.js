const mongoose = require('mongoose');

const handoverSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Handover title is required'],
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    default: '',
    maxlength: 5000,
  },
  outgoingOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  incomingOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  team: {
    type: String,
    trim: true,
    default: '',
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  background: {
    type: String,
    default: '',
    maxlength: 10000,
  },
  status: {
    type: String,
    enum: ['draft', 'pending-acknowledgement', 'accepted', 'in-progress', 'completed', 'rejected'],
    default: 'draft',
  },
  handoverNotes: {
    type: String,
    default: '',
    maxlength: 10000,
  },
  // Acknowledgement
  acknowledgement: {
    acknowledged: { type: Boolean, default: false },
    acknowledgedAt: { type: Date },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, default: '' },
  },
  // AI-generated summary
  aiSummary: {
    summary: { type: String, default: '' },
    keyResponsibilities: [{ type: String }],
    criticalItems: [{ type: String }],
    recommendations: [{ type: String }],
    generatedAt: { type: Date },
    model: { type: String, default: '' },
  },
  // Context completeness score
  contextScore: {
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 100 },
    breakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
    missingItems: [{ type: String }],
    recommendations: [{ type: String }],
    calculatedAt: { type: Date },
  },
  // Related records
  relatedMeetings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' }],
  actionItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ActionItem' }],
  documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
  tags: [{ type: String, trim: true }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for decisions linked to this handover
handoverSchema.virtual('decisions', {
  ref: 'Decision',
  localField: '_id',
  foreignField: 'source.sourceId',
  match: { 'source.sourceType': 'handover' },
});

handoverSchema.index({ outgoingOwner: 1 });
handoverSchema.index({ incomingOwner: 1 });
handoverSchema.index({ status: 1 });
handoverSchema.index({ team: 1 });
handoverSchema.index({ title: 'text', description: 'text', background: 'text' });

module.exports = mongoose.model('Handover', handoverSchema);
