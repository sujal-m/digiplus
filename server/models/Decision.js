const mongoose = require('mongoose');

const decisionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Decision title is required'],
    trim: true,
    maxlength: 300,
  },
  description: {
    type: String,
    default: '',
    maxlength: 5000,
  },
  madeBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  madeAt: {
    type: Date,
    default: Date.now,
  },
  source: {
    sourceType: {
      type: String,
      enum: ['meeting', 'handover', 'standalone'],
      default: 'standalone',
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  rationale: {
    type: String,
    default: '',
    maxlength: 5000,
  },
  status: {
    type: String,
    enum: ['proposed', 'approved', 'implemented', 'superseded', 'revoked'],
    default: 'approved',
  },
  // AI extraction metadata
  aiMetadata: {
    confidence: { type: Number, min: 0, max: 1 },
    sourceText: { type: String, default: '' },
    isConfirmed: { type: Boolean, default: false },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  tags: [{ type: String, trim: true }],
}, {
  timestamps: true,
});

decisionSchema.index({ 'source.sourceId': 1, 'source.sourceType': 1 });
decisionSchema.index({ madeBy: 1 });
decisionSchema.index({ status: 1 });
decisionSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Decision', decisionSchema);
