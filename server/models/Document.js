const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Document title is required'],
    trim: true,
    maxlength: 300,
  },
  description: {
    type: String,
    default: '',
    maxlength: 2000,
  },
  fileName: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Extracted text content for search
  content: {
    type: String,
    default: '',
  },
  category: {
    type: String,
    enum: ['meeting-notes', 'policy', 'process', 'reference', 'template', 'other'],
    default: 'other',
  },
  tags: [{ type: String, trim: true }],
  // Access control
  accessLevel: {
    type: String,
    enum: ['public', 'team', 'private'],
    default: 'public',
  },
  team: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ category: 1 });
documentSchema.index({ tags: 1 });
documentSchema.index({ title: 'text', description: 'text', content: 'text' });

module.exports = mongoose.model('Document', documentSchema);
