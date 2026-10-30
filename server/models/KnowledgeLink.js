const mongoose = require('mongoose');

const knowledgeLinkSchema = new mongoose.Schema({
  sourceType: {
    type: String,
    required: true,
    enum: ['meeting', 'handover', 'task', 'decision', 'document'],
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  targetType: {
    type: String,
    required: true,
    enum: ['meeting', 'handover', 'task', 'decision', 'document'],
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  relevanceScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5,
  },
  explanation: {
    type: String,
    default: '',
    maxlength: 500,
  },
  aiSuggested: {
    type: Boolean,
    default: false,
  },
  confirmed: {
    type: Boolean,
    default: false,
  },
  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

knowledgeLinkSchema.index({ sourceType: 1, sourceId: 1 });
knowledgeLinkSchema.index({ targetType: 1, targetId: 1 });
knowledgeLinkSchema.index({ aiSuggested: 1, confirmed: 1 });

module.exports = mongoose.model('KnowledgeLink', knowledgeLinkSchema);
