const mongoose = require('mongoose');

const aiProcessingLogSchema = new mongoose.Schema({
  operationType: {
    type: String,
    required: true,
    enum: [
      'meeting_extraction', 'meeting_recap', 'catchup_brief',
      'handover_summary', 'knowledge_suggestion', 'context_score',
    ],
  },
  model: {
    type: String,
    required: true,
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  correlationId: {
    type: String,
  },
  // Timing
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
  },
  duration: {
    type: Number, // milliseconds
  },
  // Token usage
  tokenUsage: {
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
  },
  // Status
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'timeout'],
    default: 'pending',
  },
  // Error info
  error: {
    message: { type: String, default: '' },
    category: { type: String, default: '' },
  },
  // Source reference
  sourceType: { type: String },
  sourceId: { type: mongoose.Schema.Types.ObjectId },
}, {
  timestamps: true,
});

aiProcessingLogSchema.index({ requestedBy: 1, createdAt: -1 });
aiProcessingLogSchema.index({ operationType: 1, status: 1 });
aiProcessingLogSchema.index({ correlationId: 1 });

module.exports = mongoose.model('AIProcessingLog', aiProcessingLogSchema);
